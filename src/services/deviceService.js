import { supabase } from '../lib/supabase';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Service pour gérer les appareils autorisés (max 2 par utilisateur)
 */

let fpPromise = null;

// Initialiser FingerprintJS
const initFingerprint = async () => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
};

// Générer l'empreinte unique de l'appareil
export const getDeviceFingerprint = async () => {
  try {
    const fp = await initFingerprint();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    // Fallback: utiliser des informations basiques du navigateur
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
      .single();

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
        .single();
      if (updateError) throw updateError;
      return { success: true, device: updated };
    }
    
    // Compter les appareils actifs
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
      .single();
    
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
    
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true)
      .single();
    
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
