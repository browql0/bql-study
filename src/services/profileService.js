import { supabase } from '../lib/supabase';

/**
 * Service pour gérer les profils utilisateur
 */

// Récupérer le profil d'un utilisateur
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // Si le profil n'existe pas, le créer
    if (error.code === 'PGRST116') {
      return await createProfile(userId);
    }
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

// Créer un profil
export async function createProfile(userId, profileData = {}) {
  try {
    // Récupérer les informations de l'utilisateur depuis auth
    let userEmail = '';
    let userName = '';
    let userRole = 'spectator';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email || '';
        userName = user.user_metadata?.name || '';
        userRole = user.user_metadata?.role || 'spectator';
      }
    } catch (authError) {
      console.warn('Could not fetch user from auth:', authError);
    }

    // Créer le profil avec toutes les colonnes nécessaires
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: profileData.email || userEmail || '',
          name: profileData.name || userName || '',
          role: profileData.role || userRole || 'spectator',
          subscription_status: profileData.subscription_status || 'free',
          notification_preferences: profileData.notification_preferences || {
            new_files: true,
            new_photos: true,
            new_users: false,
            new_payments: false,
            voucher_expired: false
          },
          avatar_url: profileData.avatar_url || null,
          bio: profileData.bio || null,
          preferences: profileData.preferences || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createProfile:', error);
    // En cas d'erreur, essayer une insertion minimale
    try {
      const { data, error: minimalError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: profileData.email || '',
            name: profileData.name || '',
            role: 'spectator',
            subscription_status: 'free',
            notification_preferences: {
              new_files: true,
              new_photos: true,
              new_users: false,
              new_payments: false,
              voucher_expired: false
            }
          }
        ])
        .select()
        .single();

      if (minimalError) throw minimalError;
      return data;
    } catch (minimalError) {
      console.error('Error creating minimal profile:', minimalError);
      throw minimalError;
    }
  }
}

// Mettre à jour le profil
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

// Upload avatar
export async function uploadAvatar(userId, file) {
  // Créer un nom unique pour le fichier
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload le fichier dans Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }

  // Récupérer l'URL publique
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Mettre à jour le profil avec la nouvelle URL
  await updateProfile(userId, { avatar_url: urlData.publicUrl });

  return urlData.publicUrl;
}

// Supprimer l'avatar
export async function deleteAvatar(userId, avatarPath) {
  // Extraire le chemin depuis l'URL si nécessaire
  const path = avatarPath.split('/avatars/')[1];
  
  if (path) {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`avatars/${path}`]);

    if (error) {
      console.error('Error deleting avatar:', error);
    }
  }

  // Mettre à jour le profil pour retirer l'avatar
  await updateProfile(userId, { avatar_url: null });
}
