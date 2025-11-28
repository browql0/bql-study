/**
 * Configuration Cloudflare R2
 * 
 * Pour utiliser Cloudflare R2, vous devez :
 * 1. Créer un bucket R2 dans votre compte Cloudflare
 * 2. Créer une API Token avec les permissions nécessaires
 * 3. Configurer les variables d'environnement suivantes :
 *    - VITE_CLOUDFLARE_ACCOUNT_ID
 *    - VITE_CLOUDFLARE_ACCESS_KEY_ID
 *    - VITE_CLOUDFLARE_SECRET_ACCESS_KEY
 *    - VITE_CLOUDFLARE_BUCKET_NAME
 *    - VITE_CLOUDFLARE_PUBLIC_URL (URL publique de votre bucket, ex: https://pub-xxxxx.r2.dev)
 */

// Configuration Cloudflare R2
export const cloudflareConfig = {
  accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: import.meta.env.VITE_CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: import.meta.env.VITE_CLOUDFLARE_SECRET_ACCESS_KEY,
  bucketName: import.meta.env.VITE_CLOUDFLARE_BUCKET_NAME,
  publicUrl: import.meta.env.VITE_CLOUDFLARE_PUBLIC_URL,
  endpoint: `https://${import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
};

// Vérifier que la configuration est complète
// Note: publicUrl est optionnel si on utilise des signed URLs
export function isCloudflareConfigured() {
  return !!(
    cloudflareConfig.accountId &&
    cloudflareConfig.accessKeyId &&
    cloudflareConfig.secretAccessKey &&
    cloudflareConfig.bucketName
  );
}

// Vérifier si on utilise des URLs publiques ou des signed URLs
export function hasPublicUrl() {
  return !!cloudflareConfig.publicUrl;
}

