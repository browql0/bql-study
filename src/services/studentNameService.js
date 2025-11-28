import { supabase } from '../lib/supabase';
import etudiantsData from '../../etudiants.json';

/**
 * Récupère tous les noms disponibles depuis le fichier JSON
 */
export const getAvailableNames = () => {
  return etudiantsData.map(etudiant => etudiant.nom);
};

/**
 * Normalise un nom pour la comparaison (insensible à la casse et à l'ordre)
 */
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .sort()
    .join(' ');
};

/**
 * Vérifie si un nom existe dans le fichier JSON (insensible à la casse et à l'ordre)
 */
export const isValidName = (name) => {
  if (!name || !name.trim()) return false;
  
  const normalizedInput = normalizeName(name);
  
  return etudiantsData.some(etudiant => {
    const normalizedStudentName = normalizeName(etudiant.nom);
    return normalizedStudentName === normalizedInput;
  });
};

/**
 * Trouve le nom exact correspondant dans le JSON (pour l'enregistrement)
 */
export const findExactName = (name) => {
  if (!name || !name.trim()) return null;
  
  const normalizedInput = normalizeName(name);
  
  const found = etudiantsData.find(etudiant => {
    const normalizedStudentName = normalizeName(etudiant.nom);
    return normalizedStudentName === normalizedInput;
  });
  
  return found ? found.nom : null;
};

/**
 * Récupère toutes les informations d'un étudiant depuis le JSON (matricule, groupe, sous-groupe)
 */
export const getStudentInfo = (name) => {
  if (!name || !name.trim()) return null;
  
  const normalizedInput = normalizeName(name);
  
  const found = etudiantsData.find(etudiant => {
    const normalizedStudentName = normalizeName(etudiant.nom);
    return normalizedStudentName === normalizedInput;
  });
  
  if (!found) return null;
  
  return {
    nom: found.nom,
    matricule: found.matricule,
    groupe: found.gp,
    sousGroupe: found.sgp
  };
};

/**
 * Vérifie si un nom est déjà utilisé par un autre compte
 * Utilise une fonction RPC pour contourner les restrictions RLS
 */
export const isNameAlreadyUsed = async (name) => {
  try {
    if (!name || !name.trim()) return false;
    
    const normalizedName = name.trim();
    
    // Essayer d'utiliser la fonction RPC si elle existe
    try {
      const { data, error } = await supabase.rpc('check_name_exists', {
        p_name: normalizedName
      });
      
      if (error) {
        console.warn('Fonction RPC check_name_exists non disponible, utilisation de la méthode directe:', error);
        // Fallback: Vérifier directement dans profiles
        return await checkNameDirectly(normalizedName);
      }
      
      return data === true;
    } catch (rpcError) {
      console.warn('Erreur lors de l\'appel RPC, utilisation de la méthode directe:', rpcError);
      // Fallback: Vérifier directement dans profiles
      return await checkNameDirectly(normalizedName);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du nom:', error);
    return false; // En cas d'erreur, on laisse passer pour ne pas bloquer
  }
};

/**
 * Vérifie directement dans la table profiles (fallback)
 */
const checkNameDirectly = async (name) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('name', name)
      .limit(1);

    if (error) {
      console.error('Erreur lors de la vérification directe du nom:', error);
      return false; // En cas d'erreur, on laisse passer pour ne pas bloquer
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Erreur lors de la vérification directe du nom:', error);
    return false;
  }
};

/**
 * Vérifie si un nom est valide et disponible
 */
export const validateAndCheckName = async (name) => {
  if (!isValidName(name)) {
    return {
      valid: false,
      available: false,
      error: 'Ce nom n\'est pas dans la liste des étudiants autorisés',
      exactName: null
    };
  }

  // Trouver le nom exact dans le JSON
  const exactName = findExactName(name);
  
  if (!exactName) {
    return {
      valid: false,
      available: false,
      error: 'Ce nom n\'est pas dans la liste des étudiants autorisés',
      exactName: null
    };
  }

  // Vérifier si le nom exact est déjà utilisé
  const isUsed = await isNameAlreadyUsed(exactName);
  
  if (isUsed) {
    return {
      valid: true,
      available: false,
      error: 'Ce nom est déjà utilisé par un autre compte',
      exactName: exactName
    };
  }

  return {
    valid: true,
    available: true,
    error: null,
    exactName: exactName
  };
};

