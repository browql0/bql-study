import { supabase } from '../lib/supabase';

/**
 * Vérifie si un email est déjà utilisé
 * Utilise une fonction RPC pour contourner les restrictions RLS
 */
export const isEmailAlreadyUsed = async (email) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Essayer d'utiliser la fonction RPC si elle existe
    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        p_email: normalizedEmail
      });
      
      if (!error && data !== null) {
        return data === true;
      }
      
      if (error) {
        console.warn('Fonction RPC check_email_exists non disponible, utilisation de la méthode directe:', error);
        // Fallback: Vérifier directement dans profiles
        return await checkEmailDirectly(normalizedEmail);
      }
    } catch (rpcError) {
      // La fonction RPC n'existe peut-être pas, continuer avec la vérification dans profiles
      console.warn('Erreur lors de l\'appel RPC, utilisation de la méthode directe:', rpcError);
      return await checkEmailDirectly(normalizedEmail);
    }
    
    return false;
  } catch (error) {
    console.warn('Erreur lors de la vérification de l\'email:', error);
    return false; // En cas d'erreur, on laisse Supabase Auth gérer l'erreur lors de l'inscription
  }
};

/**
 * Vérifie directement dans la table profiles (fallback)
 */
const checkEmailDirectly = async (email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .limit(1);

    if (error) {
      // Si on ne peut pas accéder à la table, on retourne false
      // et on laissera Supabase Auth gérer l'erreur lors de l'inscription
      console.warn('Impossible de vérifier l\'email dans profiles:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.warn('Erreur lors de la vérification directe de l\'email:', error);
    return false;
  }
};

// Inscription
export const signUp = async (email, password, name) => {
  try {
    // Normaliser l'email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérifier si l'email est déjà utilisé
    const emailExists = await isEmailAlreadyUsed(normalizedEmail);
    if (emailExists) {
      return { 
        data: null, 
        error: 'Cet email est déjà utilisé par un autre compte' 
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: name,
          role: 'spectator'
        }
      }
    });

    if (error) {
      // Améliorer les messages d'erreur
      let errorMessage = error.message;
      
      // Messages d'erreur plus clairs
      if (error.message?.includes('already registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('User already registered')) {
        errorMessage = 'Cet email est déjà utilisé par un autre compte';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Format d\'email invalide';
      } else if (error.message?.includes('Password')) {
        errorMessage = 'Le mot de passe ne respecte pas les critères requis';
      }
      
      return { data: null, error: errorMessage };
    }
    
    return { data, error: null };
  } catch (error) {
    // Gérer les erreurs inattendues
    let errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';
    
    if (error.message?.includes('already registered') || 
        error.message?.includes('already exists')) {
      errorMessage = 'Cet email est déjà utilisé par un autre compte';
    }
    
    return { data: null, error: errorMessage };
  }
};

// Connexion
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Déconnexion
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Obtenir l'utilisateur actuel
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Écouter les changements d'authentification
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Réinitialiser le mot de passe
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Mettre à jour le mot de passe
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Mettre à jour le profil
export const updateProfile = async (updates) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
