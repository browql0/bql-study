/**
 * Helper pour obtenir l'URL d'un fichier (utilise les URLs publiques R2 ou Supabase Storage)
 */

import { getPublicUrl } from '../services/cloudflareStorage';
import { isCloudflareConfigured, hasPublicUrl } from '../lib/cloudflare';
import { supabase } from '../lib/supabase';

/**
 * Obtenir l'URL d'un fichier pour l'affichage
 * @param {string|null} url - L'URL stockée en base (peut être une URL publique, null, ou un storage_path)
 * @param {string|null} storagePath - Le storage_path du fichier (prioritaire si fourni)
 * @returns {Promise<string>} L'URL à utiliser pour afficher le fichier
 */
export async function getDisplayUrl(url, storagePath = null) {
  // Si l'URL commence par http/https, c'est une URL publique, on l'utilise directement
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  
  // Utiliser storagePath en priorité, sinon url (qui peut contenir le path)
  const path = storagePath || url;
  
  if (!path) {
    throw new Error('No URL or storage path provided');
  }
  
  // Si Cloudflare est configuré
  if (isCloudflareConfigured()) {
    // Si on a une URL publique R2, l'utiliser
    if (hasPublicUrl()) {
      return getPublicUrl(path);
    }
    
    // Si R2 est configuré mais pas d'URL publique, le fichier est dans R2
    // mais on ne peut pas y accéder sans URL publique ou Worker (qu'on a supprimé)
    throw new Error(
      'URL publique R2 non configurée. ' +
      'Configurez VITE_CLOUDFLARE_PUBLIC_URL dans votre fichier .env ' +
      'ou utilisez Supabase Storage à la place.'
    );
  }
  
  // Fallback vers Supabase Storage (si pas de Cloudflare)
  // Déterminer le bucket selon le path
  let bucket = 'photos'; // par défaut
  let supabasePath = path;
  
  if (path.startsWith('files/')) {
    bucket = 'files';
    supabasePath = path.replace('files/', '');
  } else if (path.startsWith('photos/')) {
    bucket = 'photos';
    supabasePath = path.replace('photos/', '');
  }
  
  // Obtenir l'URL publique depuis Supabase Storage
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(supabasePath);
  
  return data.publicUrl;
}

/**
 * Obtenir l'URL d'un fichier de manière synchrone (pour les URLs publiques)
 * @param {string} url - L'URL stockée en base
 * @returns {string|null} L'URL ou null si besoin de générer une signed URL
 */
export function getDisplayUrlSync(url) {
  // Si l'URL commence par http/https, c'est une URL publique
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  
  // Sinon, il faut générer une signed URL (asynchrone)
  return null;
}

