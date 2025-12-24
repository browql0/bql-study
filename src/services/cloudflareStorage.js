/**
 * Service pour gérer le stockage sur Cloudflare R2
 * 
 * Ce service utilise un Cloudflare Worker pour gérer les uploads et suppressions.
 * Pour l'affichage, les URLs publiques R2 sont utilisées directement.
 */

import { cloudflareConfig, isCloudflareConfigured, hasPublicUrl } from '../lib/cloudflare';
import { supabase } from '../lib/supabase';

/**
 * Upload un fichier vers Cloudflare R2 via le Worker (recommandé) ou directement
 * 
 * @param {File} file - Le fichier à uploader
 * @param {string} path - Le chemin de destination (ex: "photos/user-id/subject-id/section/filename.jpg")
 * @returns {Promise<string|null>} L'URL publique du fichier ou null si pas d'URL publique
 */
export async function uploadToCloudflare(file, path) {
  if (!isCloudflareConfigured()) {
    throw new Error('Cloudflare R2 n\'est pas configuré. Vérifiez vos variables d\'environnement.');
  }

  // Vérifier si le Worker est configuré (O  cBLIGATOIRE pour éviter les erreurs CORS)
  const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
  if (!workerUrl) {
    const errorMessage = '❌ VITE_CLOUDFLARE_WORKER_URL n\'est pas configuré. Le Worker est OBLIGATOIRE pour les uploads.\n\n' +
      'Pour résoudre ce problème :\n' +
      '1. Déployez le Cloudflare Worker (voir cloudflare-worker/QUICK_START.md)\n' +
      '2. Ajoutez VITE_CLOUDFLARE_WORKER_URL=https://votre-worker.workers.dev dans votre fichier .env\n' +
      '3. Redémarrez votre serveur de développement';
    console.error(errorMessage);
    throw new Error('Worker URL non configuré. Configurez VITE_CLOUDFLARE_WORKER_URL dans votre fichier .env');
  }
  
  // Utiliser le Worker pour l'upload (évite les problèmes CORS)
  try {
    // Obtenir le token Supabase de l'utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }
    
    // Upload via le Worker
    const response = await fetch(`${workerUrl}?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || 'Failed to upload file');
    }

    // Si on a une URL publique, la retourner, sinon retourner null
    if (hasPublicUrl()) {
      return `${cloudflareConfig.publicUrl}/${path}`;
    }

    return null;
  } catch (error) {
    console.error('Error uploading via Worker:', error);
    throw error;
  }
  
}

/**
 * Supprimer un fichier de Cloudflare R2 via le Worker (recommandé) ou directement
 * @param {string} path - Le chemin du fichier à supprimer
 */
export async function deleteFromCloudflare(path) {
  if (!isCloudflareConfigured()) {
    throw new Error('Cloudflare R2 n\'est pas configuré. Vérifiez vos variables d\'environnement.');
  }

  // Vérifier si le Worker est configuré (OBLIGATOIRE)
  const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
  if (!workerUrl) {
    throw new Error('Worker URL non configuré. Configurez VITE_CLOUDFLARE_WORKER_URL dans votre fichier .env');
  }
  
  // Utiliser le Worker pour la suppression
  try {
    // Obtenir le token Supabase de l'utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }
    
    // Supprimer via le Worker
    const response = await fetch(`${workerUrl}?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    // 404 est acceptable (fichier déjà supprimé)
    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || 'Failed to delete file');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting via Worker:', error);
    throw error;
  }
  
}

/**
 * Obtenir l'URL publique d'un fichier
 * @param {string} path - Le chemin du fichier
 * @returns {string} L'URL publique
 */
export function getPublicUrl(path) {
  if (hasPublicUrl()) {
    return `${cloudflareConfig.publicUrl}/${path}`;
  }
  throw new Error('URL publique non configurée. Configurez VITE_CLOUDFLARE_PUBLIC_URL dans votre fichier .env');
}

