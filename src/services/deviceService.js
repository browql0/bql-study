import { supabase } from '../lib/supabase';

/**
 * Service pour gérer les appareils autorisés (max 2 par utilisateur)
 */

// Générer un identifiant unique basé sur le matériel (Cross-browser compatible)
// Utilise uniquement des caractéristiques matérielles stables pour qu'un même appareil
// soit reconnu comme un seul appareil, peu importe le navigateur ou la session
export const getDeviceFingerprint = async () => {
  try {
    // 1. Informations de l'écran (Résolution + Profondeur de couleur)
    // Ces valeurs sont stables pour un même appareil physique
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;

    // 2. Pixel Ratio (souvent unique par type d'écran/scaling)
    const pixelRatio = window.devicePixelRatio || 1;

    // 3. Plateforme (OS) - stable pour un même appareil
    const platform = navigator.platform || 'unknown';

    // 4. WebGL Renderer (Carte graphique - très discriminant et stable)
    // C'est la caractéristique la plus fiable pour identifier un appareil physique
    let webglRenderer = 'no-webgl';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      console.warn('WebGL detection failed', e);
    }

    // 5. Nombre de processeurs logiques (caractéristique matérielle stable)
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;

    // 6. Mémoire maximale (si disponible)
    const maxMemory = navigator.deviceMemory || 0;

    // Combinaison des signaux matériels uniquement
    // On exclut le UserAgent, Canvas fingerprinting et autres caractéristiques
    // qui peuvent varier entre navigateurs pour garantir qu'un même appareil
    // physique soit toujours identifié comme un seul appareil
    const fingerprintString = [
      screenInfo,
      pixelRatio,
      platform,
      webglRenderer,
      hardwareConcurrency,
      maxMemory
    ].join('||');

    // Hachage SHA-256
    const msgBuffer = new TextEncoder().encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Retourne les 16 premiers caractères pour un ID court mais unique
    return hashHex.substring(0, 16);

  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback simple basé sur des caractéristiques matérielles
    return `fallback-${window.screen.width}x${window.screen.height}-${navigator.platform}-${navigator.hardwareConcurrency || 0}`;
  }
};

// Obtenir les informations de l'appareil
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  // Détecter le type d'appareil
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Détecter le navigateur
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  // Détecter l'OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Nom de l'appareil
  const deviceName = `${os} - ${browser}`;

  return { deviceType, browser, os, deviceName };
};

// Enregistrer l'appareil actuel
export const registerDevice = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const fingerprint = await getDeviceFingerprint();
    const deviceInfo = getDeviceInfo();

    // Vérifier si l'appareil existe déjà (actif ou inactif)
    // IMPORTANT: Le fingerprint est basé sur l'appareil physique, pas le navigateur
    // Donc un même appareil peut utiliser plusieurs navigateurs (Chrome, Firefox, etc.)
    // et ils seront tous reconnus comme le même appareil
    // Cela permet de réactiver un appareil après déconnexion/reconnexion
    const { data: existing, error: checkError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      // Appareil existant trouvé (même appareil physique, peut-être avec un navigateur différent)
      // Réactiver l'appareil et mettre à jour les infos du navigateur
      // Cela permet de suivre les différents navigateurs utilisés sur le même appareil
      // et de se reconnecter/déconnecter sans problème
      const { data: updated, error: updateError } = await supabase
        .from('user_devices')
        .update({
          last_login_at: new Date().toISOString(),
          is_active: true,
          device_name: deviceInfo.deviceName, // Mettre à jour avec le navigateur actuel
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.deviceType
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (updateError) throw updateError;
      // Retourner succès sans vérifier la limite car c'est une réactivation, pas un nouvel appareil
      return { success: true, device: updated };
    }

    // Compter les appareils actifs uniquement si l'utilisateur n'est pas admin
    let role = user.user_metadata?.role;

    // Si pas de rôle dans les métadonnées, vérifier dans la table profiles
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) role = profile.role;
    }

    const isAdmin = role === 'admin';
    console.log('Device Check - User:', user.id, 'Role:', role, 'IsAdmin:', isAdmin);

    if (!isAdmin) {
      // NOUVEL APPAREIL DÉTECTÉ - Vérifier la limite de 2 appareils
      // Compter uniquement les appareils actifs avec des fingerprints uniques
      // IMPORTANT: On compte les appareils physiques (fingerprints), pas les navigateurs
      // Un même appareil peut utiliser Chrome, Firefox, Edge, etc. et comptera comme 1 seul appareil
      const { data: devices, error: countError } = await supabase
        .from('user_devices')
        .select('device_fingerprint')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (countError) throw countError;

      // Compter les fingerprints uniques (appareils physiques distincts)
      // Si l'utilisateur a déjà 2 appareils actifs, on bloque l'accès
      const uniqueFingerprints = new Set(devices?.map(d => d.device_fingerprint) || []);
      
      if (uniqueFingerprints.size >= 2) {
        // LIMITE ATTEINTE: L'utilisateur a déjà 2 appareils actifs
        // Récupérer les appareils complets pour l'affichage (optionnel, pour info)
        const { data: allDevices } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('last_login_at', { ascending: false });

        // Retourner une erreur qui déclenchera l'affichage du modal de limite
        return {
          success: false,
          error: 'device_limit',
          message: 'Vous avez atteint la limite de 2 appareils. Veuillez vous déconnecter d\'un appareil existant.',
          devices: allDevices || []
        };
      }
    }

    // Enregistrer le nouvel appareil
    const { data: newDevice, error: insertError } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        device_fingerprint: fingerprint,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    return { success: true, device: newDevice };

  } catch (error) {
    console.error('Error registering device:', error);
    return { success: false, error: error.message };
  }
};

// Obtenir tous les appareils de l'utilisateur
export const getUserDevices = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_login_at', { ascending: false });

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

// Supprimer un appareil (se déconnecter)
export const removeDevice = async (deviceId) => {
  try {
    // Désactiver uniquement l'appareil courant
    const { error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('id', deviceId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing device:', error);
    return { success: false, error: error.message };
  }
};

// Désactiver l'appareil actuel lors de la déconnexion
// Cette fonction est appelée quand l'utilisateur se déconnecte
// pour libérer une place dans la limite de 2 appareils
export const deactivateCurrentDevice = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const fingerprint = await getDeviceFingerprint();
    
    // Désactiver l'appareil actuel s'il existe et est actif
    // Si l'appareil n'existe pas (cas du 3ème appareil bloqué), c'est normal
    const { error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true);
    
    // Si aucune ligne n'a été mise à jour (appareil non trouvé), ce n'est pas une erreur
    // Cela peut arriver si l'appareil n'a jamais été enregistré (cas du 3ème appareil)
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deactivating current device:', error);
    // Ne pas faire échouer la déconnexion si la désactivation de l'appareil échoue
    return { success: false, error: error.message };
  }
};

// Vérifier si l'appareil actuel est autorisé
export const checkDeviceAuthorization = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { authorized: false, reason: 'not_authenticated' };

    const fingerprint = await getDeviceFingerprint();

    // Bypass pour les admins
    let isAdmin = user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      // Double check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile && profile.role === 'admin') isAdmin = true;
    }

    if (isAdmin) {
      return { authorized: true, device: { id: 'admin-bypass', device_fingerprint: fingerprint } };
    }

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      // Appareil autorisé - mettre à jour last_login_at
      await supabase
        .from('user_devices')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id);

      return { authorized: true, device: data };
    }

    return { authorized: false, reason: 'device_not_registered' };

  } catch (error) {
    console.error('Error checking device authorization:', error);
    return { authorized: false, reason: 'error', error: error.message };
  }
};

export const deviceService = {
  registerDevice,
  getUserDevices,
  removeDevice,
  deactivateCurrentDevice,
  checkDeviceAuthorization,
  getDeviceFingerprint,
  getDeviceInfo
};

export default deviceService;
