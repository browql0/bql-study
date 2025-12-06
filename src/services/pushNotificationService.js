import { supabase } from '../lib/supabase';

/**
 * Service pour envoyer des notifications push via Railway backend
 * Ce service doit être appelé côté client (pas depuis Supabase RPC)
 */

const RAILWAY_BACKEND = 'https://outstanding-upliftment-production.up.railway.app';

/**
 * Envoyer une notification push à des utilisateurs spécifiques
 */
export async function sendPushNotification(userIds, title, body) {
  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('Pas de session pour envoyer notification push');
      return false;
    }
    
    const response = await fetch(`${RAILWAY_BACKEND}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        userIds: Array.isArray(userIds) ? userIds : [userIds],
        title,
        body
      })
    });
    
    if (!response.ok) {
      console.warn(`Push notification failed: ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ Push notifications sent: ${result.sent}/${result.total}`);
    return true;
    
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Notifier les spectateurs d'un nouveau contenu
 */
export async function notifySpectators(subjectId, contentType, contentTitle) {
  try {
    // Récupérer les spectateurs
    const { data: spectators, error } = await supabase
      .from('spectators')
      .select('user_id')
      .eq('subject_id', subjectId);
    
    if (error || !spectators || spectators.length === 0) {
      return false;
    }
    
    const userIds = spectators.map(s => s.user_id);
    
    // Construire le message selon le type
    let title = '';
    let body = '';
    
    switch (contentType) {
      case 'note':
        title = '📝 Nouvelle note';
        body = `Une nouvelle note "${contentTitle}" a été ajoutée`;
        break;
      case 'photo':
        title = '📷 Nouvelle photo';
        body = `Une nouvelle photo "${contentTitle}" a été ajoutée`;
        break;
      case 'file':
        title = '📎 Nouveau fichier';
        body = `Un nouveau fichier "${contentTitle}" a été ajouté`;
        break;
      case 'quiz':
        title = '🎯 Nouveau quiz';
        body = `Un nouveau quiz "${contentTitle}" est disponible`;
        break;
      default:
        title = '🔔 Nouveau contenu';
        body = `Nouveau contenu "${contentTitle}" disponible`;
    }
    
    return await sendPushNotification(userIds, title, body);
    
  } catch (error) {
    console.error('Error notifying spectators:', error);
    return false;
  }
}

export const pushNotificationService = {
  send: sendPushNotification,
  notifySpectators
};

/**
 * Notifier les admins d'événements importants
 */
export async function notifyAdmins(eventType, title, body) {
  try {
    // Récupérer les IDs des admins
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    
    if (error || !admins || admins.length === 0) {
      return false;
    }
    
    const adminIds = admins.map(a => a.id);
    return await sendPushNotification(adminIds, title, body);
    
  } catch (error) {
    console.error('Error notifying admins:', error);
    return false;
  }
}

/**
 * Notifier un utilisateur spécifique
 */
export async function notifyUser(userId, title, body) {
  return await sendPushNotification(userId, title, body);
}

// Exporter toutes les fonctions
export default {
  send: sendPushNotification,
  notifySpectators,
  notifyAdmins,
  notifyUser
};
