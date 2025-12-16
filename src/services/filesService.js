import { supabase } from '../lib/supabase';
import { uploadToCloudflare, deleteFromCloudflare } from './cloudflareStorage';
import { isCloudflareConfigured } from '../lib/cloudflare';
import { getDisplayUrl } from '../utils/fileUrlHelper';
import { notificationsService } from './notificationsService';

/**
 * Service pour gérer les fichiers
 * Utilise Cloudflare R2 pour le stockage des fichiers
 * Utilise Supabase pour les métadonnées
 */

// Récupérer tous les fichiers
export async function getAllFiles() {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les fichiers d'une matière
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getFilesBySubject(subjectId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching files:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les fichiers par section
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getFilesBySection(subjectId, section) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('section', section)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching files:', error);
    throw error;
  }

  return data || [];
}

// Upload un fichier
export async function uploadFile(file, fileData) {
  let uploaded = false;
  let publicUrl;
  let storagePath;

  try {
    // Essayer d'abord avec getSession qui peut rafraîchir le token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    let user = session?.user;

    if (!user) {
      // Si getSession échoue, essayer getUser
      const { data: { user: getUserResult }, error: userError } = await supabase.auth.getUser();

      if (userError || !getUserResult) {
        console.error('Authentication error:', userError || sessionError);
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }

      user = getUserResult;
    }

    // Vérifier que l'utilisateur est admin (via les métadonnées)
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      throw new Error('Seuls les administrateurs peuvent uploader des fichiers');
    }

    // Créer un nom unique pour le fichier
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileNameWithoutExt = file.name.replace(`.${fileExt}`, '');
    const fileName = `${timestamp}_${fileNameWithoutExt}.${fileExt}`;
    storagePath = `files/${user.id}/${fileData.subjectId}/${fileData.section}/${fileName}`;

    // Upload vers Cloudflare R2 si configuré, sinon utiliser Supabase Storage
    if (isCloudflareConfigured()) {
      publicUrl = await uploadToCloudflare(file, storagePath);
      uploaded = true;
    } else {
      // Fallback vers Supabase Storage
      const supabasePath = storagePath.replace('files/', '');
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(supabasePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(supabasePath);

      publicUrl = urlData.publicUrl;
      uploaded = true;
    }

    // Si pas d'URL publique, on stocke le storage_path
    // L'URL sera générée via getDisplayUrl() quand nécessaire
    const fileUrl = publicUrl || storagePath; // Stocker le path si pas d'URL publique

    // Créer l'entrée dans la table files (Supabase)
    const insertData = {
      user_id: user.id,
      subject_id: fileData.subjectId,
      section: fileData.section,
      name: file.name,
      type: file.type,
      size: file.size,
      url: fileUrl, // URL publique ou storage_path
      storage_path: storagePath,
    };

    // Ajouter title et description si fournis
    const title = fileData.title || file.name.replace(/\.[^/.]+$/, '');
    if (title) {
      insertData.title = title;
    }
    if (fileData.description) {
      insertData.description = fileData.description;
    }

    const { data, error } = await supabase
      .from('files')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      // Si l'erreur est due à des colonnes inexistantes, réessayer sans title/description
      if (error.message && error.message.includes('column') && (error.message.includes('title') || error.message.includes('description'))) {
        const fallbackData = {
          user_id: user.id,
          subject_id: fileData.subjectId,
          section: fileData.section,
          name: file.name,
          type: file.type,
          size: file.size,
          url: fileUrl || storagePath,
          storage_path: storagePath,
        };

        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('files')
          .insert([fallbackData])
          .select()
          .single();

        if (fallbackError) {
          // Nettoyer le fichier uploadé
          if (isCloudflareConfigured()) {
            await deleteFromCloudflare(storagePath);
          } else {
            await supabase.storage.from('files').remove([storagePath.replace('files/', '')]);
          }
          console.error('Error creating file record:', fallbackError);
          throw fallbackError;
        }

        return fallbackResult;
      }

      // Si l'insertion échoue, supprimer le fichier uploadé
      if (isCloudflareConfigured()) {
        await deleteFromCloudflare(storagePath);
      } else {
        await supabase.storage.from('files').remove([storagePath.replace('files/', '')]);
      }
      console.error('Error creating file record:', error);
      throw error;
    }

    // Notifier les spectateurs d'un nouveau fichier
    try {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', fileData.subjectId)
        .single();

      const subjectName = subjectData?.name || 'une matière';

      await notificationsService.notifySpectatorsNewContent(
        'new_file',
        'Nouveau fichier ajouté',
        `Un nouveau fichier "${file.name}" a été ajouté dans ${subjectName} - ${fileData.section}`,
        {
          file_id: data.id,
          subject_id: fileData.subjectId,
          section: fileData.section
        }
      );
    } catch (notifError) {
      // Ne pas faire échouer l'upload si la notification échoue
    }

    return data;
  } catch (error) {
    // Nettoyer en cas d'erreur
    if (uploaded) {
      try {
        if (isCloudflareConfigured()) {
          await deleteFromCloudflare(storagePath);
        } else {
          await supabase.storage.from('files').remove([storagePath.replace('files/', '')]);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    if (error.message?.includes('expiré') || error.message?.includes('session')) {
      // Déclencher un événement pour forcer la reconnexion
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }

    throw error;
  }
}

// Supprimer un fichier
export async function deleteFile(id) {
  // Récupérer les infos du fichier pour avoir le storage_path
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching file:', fetchError);
    throw fetchError;
  }

  // Supprimer le fichier du stockage (Cloudflare ou Supabase)
  try {
    if (isCloudflareConfigured()) {
      await deleteFromCloudflare(file.storage_path);
    } else {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path.replace('files/', '')]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // On continue quand même pour supprimer l'entrée
      }
    }
  } catch (storageError) {
    console.error('Error deleting file from storage:', storageError);
    // On continue quand même pour supprimer l'entrée
  }

  // Supprimer l'entrée de la table
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting file record:', error);
    throw error;
  }

  return true;
}

// Télécharger un fichier
export async function downloadFile(storagePath, fileName) {
  try {
    let fileBlob;

    if (isCloudflareConfigured()) {
      // Télécharger depuis Cloudflare R2 (générer l'URL à la demande)
      const fileUrl = await getDisplayUrl(null, storagePath);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement: ${response.status}`);
      }
      fileBlob = await response.blob();
    } else {
      // Télécharger depuis Supabase Storage
      const { data, error } = await supabase.storage
        .from('files')
        .download(storagePath.replace('files/', ''));

      if (error) {
        console.error('Error downloading file:', error);
        throw error;
      }
      fileBlob = data;
    }

    // Créer un lien de téléchargement
    const url = window.URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}
