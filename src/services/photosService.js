import { supabase } from '../lib/supabase';
import { uploadToCloudflare, deleteFromCloudflare } from './cloudflareStorage';
import { isCloudflareConfigured } from '../lib/cloudflare';
import { notificationsService } from './notificationsService';

/**
 * Service pour gérer les photos
 * Utilise Cloudflare R2 pour le stockage des fichiers
 * Utilise Supabase pour les métadonnées
 */

// Récupérer toutes les photos
export async function getAllPhotos() {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les photos d'une matière
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getPhotosBySubject(subjectId) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching photos:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les photos par section
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getPhotosBySection(subjectId, section) {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('section', section)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching photos:', error);
    throw error;
  }

  return data || [];
}

// Upload une photo
export async function uploadPhoto(file, photoData) {
  try {
    // Essayer d'abord avec getSession qui peut rafraîchir le token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    let user = session?.user;
    
    if (!user) {
      // Si getSession échoue, essayer getUser
      const { data: { user: getUserResult }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !getUserResult) {
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      
      user = getUserResult;
    }

    // Vérifier que l'utilisateur est admin (via les métadonnées)
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      throw new Error('Seuls les administrateurs peuvent uploader des photos');
    }

    // Créer un nom unique pour le fichier
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `photos/${user.id}/${photoData.subjectId}/${photoData.section}/${fileName}`;

    let publicUrl;
    let uploaded = false;

    // Upload vers Cloudflare R2 si configuré, sinon utiliser Supabase Storage
    if (isCloudflareConfigured()) {
      publicUrl = await uploadToCloudflare(file, storagePath);
      uploaded = true;
    } else {
      // Fallback vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath.replace('photos/', ''), file);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(storagePath.replace('photos/', ''));
      
      publicUrl = urlData.publicUrl;
      uploaded = true;
    }

    // Si pas d'URL publique, on stocke null et on générera l'URL à la demande
    // L'URL sera générée via getDisplayUrl() quand nécessaire
    const photoUrl = publicUrl || storagePath; // Stocker le path si pas d'URL publique
    
    // Créer l'entrée dans la table photos (Supabase)
    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          user_id: user.id,
          subject_id: photoData.subjectId,
          section: photoData.section,
          title: photoData.title,
          url: photoUrl, // URL publique ou storage_path
          storage_path: storagePath,
        },
      ])
      .select()
      .single();

    if (error) {
      // Si l'insertion échoue, supprimer le fichier uploadé
      if (isCloudflareConfigured()) {
        await deleteFromCloudflare(storagePath);
      } else {
        await supabase.storage.from('photos').remove([storagePath.replace('photos/', '')]);
      }
      console.error('Error creating photo record:', error);
      throw error;
    }

    // Notifier les spectateurs d'une nouvelle photo
    try {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', photoData.subjectId)
        .single();

      const subjectName = subjectData?.name || 'une matière';
      
      await notificationsService.notifySpectatorsNewContent(
        'new_photo',
        'Nouvelle photo ajoutée',
        `Une nouvelle photo "${photoData.title}" a été ajoutée dans ${subjectName} - ${photoData.section}`,
        {
          photo_id: data.id,
          subject_id: photoData.subjectId,
          section: photoData.section
        }
      );
    } catch (notifError) {
      // Ne pas faire échouer l'upload si la notification échoue
    }

    // Envoi notification push système
    try {
      await fetch('https://outstanding-upliftment-production.up.railway.app/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nouvelle photo ajoutée',
          body: `Une nouvelle photo "${photoData.title}" a été ajoutée.`
        })
      });
    } catch (err) {
      console.warn('Erreur envoi notification push:', err);
    }

    return data;
  } catch (error) {
    // Nettoyer en cas d'erreur
    if (uploaded) {
      try {
        if (isCloudflareConfigured()) {
          await deleteFromCloudflare(storagePath);
        } else {
          await supabase.storage.from('photos').remove([storagePath.replace('photos/', '')]);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    if (error.message?.includes('expiré') || error.message?.includes('session')) {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    
    throw error;
  }
}

// Supprimer une photo
export async function deletePhoto(id) {
  // Récupérer les infos de la photo pour avoir le storage_path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching photo:', fetchError);
    throw fetchError;
  }

  // Supprimer le fichier du stockage (Cloudflare ou Supabase)
  try {
    if (isCloudflareConfigured()) {
      await deleteFromCloudflare(photo.storage_path);
    } else {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([photo.storage_path.replace('photos/', '')]);

      if (storageError) {
        console.error('Error deleting photo from storage:', storageError);
        // On continue quand même pour supprimer l'entrée
      }
    }
  } catch (storageError) {
    console.error('Error deleting photo from storage:', storageError);
    // On continue quand même pour supprimer l'entrée
  }

  // Supprimer l'entrée de la table
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting photo record:', error);
    throw error;
  }

  return true;
}

// Mettre à jour le titre d'une photo
export async function updatePhotoTitle(id, title) {
  const { data, error } = await supabase
    .from('photos')
    .update({ title })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating photo:', error);
    throw error;
  }

  return data;
}
