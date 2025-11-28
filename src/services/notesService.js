import { supabase } from '../lib/supabase';

/**
 * Service pour gérer les notes dans Supabase
 */

// Récupérer toutes les notes
export async function getAllNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les notes d'une matière
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getNotesBySubject(subjectId) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

// Récupérer les notes par section
// Note: Les RLS policies de Supabase filtrent automatiquement selon le statut d'abonnement
export async function getNotesBySection(subjectId, section) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('section', section)
    .order('created_at', { ascending: false });

  if (error) {
    // Si l'erreur est due à une policy RLS (accès refusé), retourner un tableau vide
    if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
      return [];
    }
    console.error('Error fetching notes:', error);
    throw error;
  }

  return data || [];
}

// Récupérer une note par ID
export async function getNoteById(id) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching note:', error);
    throw error;
  }

  return data;
}

// Créer une nouvelle note
export async function createNote(noteData) {
  try {
    // Essayer d'abord avec getSession qui peut rafraîchir le token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      // Si getSession échoue, essayer getUser
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
      }
      
      // Utiliser l'utilisateur de getUser
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            user_id: user.id,
            subject_id: noteData.subjectId,
            section: noteData.section,
            title: noteData.title,
            content: noteData.content,
            tags: noteData.tags || [],
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        throw error;
      }

      return data;
    }
    
    // Utiliser l'utilisateur de la session
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          user_id: session.user.id,
          subject_id: noteData.subjectId,
          section: noteData.section,
          title: noteData.title,
          content: noteData.content,
          tags: noteData.tags || [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createNote:', error);
    if (error.message?.includes('expiré') || error.message?.includes('session')) {
      // Déclencher un événement pour forcer la reconnexion
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    throw error;
  }
}

// Mettre à jour une note
export async function updateNote(id, updates) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating note:', error);
    throw error;
  }

  return data;
}

// Supprimer une note
export async function deleteNote(id) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting note:', error);
    throw error;
  }

  return true;
}

// Rechercher des notes
export async function searchNotes(query) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching notes:', error);
    throw error;
  }

  return data || [];
}
