import { supabase } from '../lib/supabase';

/**
 * Service pour gérer les appareils autorisés (max 2 par utilisateur)
 */

// Générer un ID unique pour l'appareil et le stocker dans le localStorage
export const getDeviceFingerprint = async () => {
  try {
    const STORAGE_KEY = 'study_notes_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
      // Générer un nouvel ID si aucun n'existe
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        // Fallback pour les anciens navigateurs
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    // Fallback en cas d'erreur (ex: localStorage désactivé)
    return `${navigator.userAgent}-${screen.width}x${screen.height}`;
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

    // Vérifier si l'appareil existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      // Mettre à jour la dernière connexion et réactiver si besoin
      const { data: updated, error: updateError } = await supabase
        .from('user_devices')
        .update({
          last_login_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (updateError) throw updateError;
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
      const { data: devices, error: countError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (countError) throw countError;

      if (devices && devices.length >= 2) {
        // Limite atteinte - retourner les appareils existants
        return {
          success: false,
          error: 'device_limit',
          message: 'Vous avez atteint la limite de 2 appareils. Veuillez vous déconnecter d\'un appareil existant.',
          devices: devices
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
  checkDeviceAuthorization,
  getDeviceFingerprint,
  getDeviceInfo
};

export default deviceService;
