import { supabase } from '../lib/supabase';

/**
 * Service pour gérer les matières (subjects) dans Supabase
 */

// Récupérer toutes les matières
export async function getAllSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }

  return data || [];
}

// Récupérer une matière par ID
export async function getSubjectById(id) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching subject:', error);
    throw error;
  }

  return data;
}

// Créer une nouvelle matière
export async function createSubject(subjectData) {
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

    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          user_id: user.id,
          name: subjectData.name,
          color: subjectData.color,
          icon: subjectData.icon,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating subject:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createSubject:', error);
    if (error.message?.includes('expiré') || error.message?.includes('session')) {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    throw error;
  }
}

// Mettre à jour une matière
export async function updateSubject(id, updates) {
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating subject:', error);
    throw error;
  }

  return data;
}

// Supprimer une matière
export async function deleteSubject(id) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }

  return true;
}
