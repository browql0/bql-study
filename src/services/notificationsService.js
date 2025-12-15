import { supabase } from '../lib/supabase';

export const notificationsService = {
  // Fonction de test pour créer plusieurs notifications
  async testNotifications(userId) {
    const results = [];
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_file',
      'Nouveau fichier ajouté',
      'Un nouveau fichier est disponible.',
      { fileId: 'test-file-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_photo',
      'Nouvelle photo ajoutée',
      'Une nouvelle photo est disponible.',
      { photoId: 'test-photo-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_note',
      'Nouvelle note ajoutée',
      'Une nouvelle note est disponible.',
      { noteId: 'test-note-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_quiz',
      'Nouveau quiz ajouté',
      'Un nouveau quiz est disponible.',
      { quizId: 'test-quiz-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'trial_expiry',
      'Fin de période d’essai',
      'Votre période d’essai se termine bientôt.',
      null
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'subscription_expiry',
      'Fin d’abonnement',
      'Votre abonnement arrive à expiration.',
      null
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'custom_admin',
      'Message de l’administrateur',
      'Notification personnalisée envoyée par l’admin.',
      { customData: 'test' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_user',
      'Nouvel utilisateur inscrit',
      'Un nouvel utilisateur vient de s’inscrire.',
      { newUserId: 'test-user-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'new_payment',
      'Paiement reçu',
      'Un paiement vient d’être reçu.',
      { paymentId: 'test-payment-1' }
    ));
    results.push(await notificationsService.createNotificationWithPreference(
      userId,
      'voucher_expired',
      'Code promo épuisé',
      'Un code promo vient d’être épuisé.',
      { voucherId: 'test-voucher-1' }
    ));
    return results;
  },
  // Vérifier la préférence de notification avant de créer
  async createNotificationWithPreference(userId, type, title, message, data = null) {
    // Charger les préférences de l'utilisateur
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();
    if (error || !profile) return { success: false, error: 'Impossible de charger les préférences' };
    const prefs = profile.notification_preferences || {};
    // Map type vers clé de préférence
    const typeToPref = {
      new_file: 'new_files',
      new_photo: 'new_photos',
      new_note: 'new_notes',
      new_quiz: 'new_quiz',
      trial_expiry: 'trial_expiry',
      subscription_expiry: 'subscription_expiry',
      custom_admin: 'custom_admin',
      new_user: 'new_users',
      new_payment: 'new_payments',
      voucher_expired: 'voucher_expired'
    };
    const prefKey = typeToPref[type];
    if (prefKey && prefs[prefKey] === false) {
      // Préférence désactivée, ne pas créer la notification
      return { success: false, error: 'Notification désactivée par préférence utilisateur' };
    }
    // Créer la notification locale
    const result = await notificationsService.createNotification(userId, type, title, message, data);
    // Envoi notification push système si préférence activée
    try {
      // Adapter le titre, le body et l'icône selon le type
      let pushTitle = title;
      let pushBody = message;
      let pushIcon = '/favicon.svg';
      switch (type) {
        case 'new_file':
          pushTitle = 'Nouveau fichier ajouté';
          pushBody = 'Un nouveau fichier est disponible.';
          break;
        case 'new_photo':
          pushTitle = 'Nouvelle photo ajoutée';
          pushBody = 'Une nouvelle photo est disponible.';
          break;
        case 'new_note':
          pushTitle = 'Nouvelle note ajoutée';
          pushBody = 'Une nouvelle note est disponible.';
          break;
        case 'new_quiz':
          pushTitle = 'Nouveau quiz ajouté';
          pushBody = 'Un nouveau quiz est disponible.';
          break;
        case 'trial_expiry':
          pushTitle = 'Fin de période d’essai';
          pushBody = 'Votre période d’essai se termine bientôt.';
          break;
        case 'subscription_expiry':
          pushTitle = 'Fin d’abonnement';
          pushBody = 'Votre abonnement arrive à expiration.';
          break;
        case 'custom_admin':
          pushTitle = 'Message de l’administrateur';
          pushBody = 'Notification personnalisée envoyée par l’admin.';
          break;
        case 'new_user':
          pushTitle = 'Nouvel utilisateur inscrit';
          pushBody = 'Un nouvel utilisateur vient de s’inscrire.';
          break;
        case 'new_payment':
          pushTitle = 'Paiement reçu';
          pushBody = 'Un paiement vient d’être reçu.';
          break;
        case 'voucher_expired':
          pushTitle = 'Code promo épuisé';
          pushBody = 'Un code promo vient d\'être épuisé.';
          break;
      }

      // Note: Les notifications push sont gérées côté client (AppContext)
      // car ce service s'exécute côté serveur Supabase sans session utilisateur

    } catch (err) {
      // Erreur generale, ne pas bloquer
      console.debug('Erreur lors de la creation de notification');
    }
    return result;
  },
  // Récupérer toutes les notifications non lues pour l'utilisateur actuel
  async getUnreadNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }
  },

  // Récupérer toutes les notifications (lues et non lues)
  async getAllNotifications(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      return { success: false, error: error.message };
    }
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  },

  // Supprimer une notification
  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Supprimer toutes les notifications lues
  async deleteAllRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('read', true);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      return { success: false, error: error.message };
    }
  },

  // Compter les notifications non lues
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      return { success: false, error: error.message, count: 0 };
    }
  },

  // Créer une notification (utilise la fonction SQL)
  async createNotification(userId, type, title, message, data = null) {
    try {
      const { data: result, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data
      });

      if (error) throw error;
      return { success: true, notificationId: result };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Notifier tous les spectateurs d'un nouveau fichier/photo
  async notifySpectatorsNewContent(type, title, message, data = null) {
    try {
      const { data: result, error } = await supabase.rpc('notify_spectators_new_content', {
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data
      });

      if (error) {
        throw error;
      }

      const count = result || 0;
      return { success: true, result, count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  ,

  // Notifier tous les administrateurs (In-App + Push)
  async notifyAllAdmins(type, title, message, data = null) {
    try {
      // 1. Récupérer les IDs des admins
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (error || !admins || admins.length === 0) {
        return { success: false, error: 'Aucun admin trouvé' };
      }

      const adminIds = admins.map(a => a.id);

      // 2. Créer une notification in-app pour chaque admin
      // On utilise Promise.all pour paralléliser
      const notificationPromises = adminIds.map(adminId =>
        notificationsService.createNotificationWithPreference(
          adminId,
          type,
          title,
          message,
          data
        )
      );

      await Promise.all(notificationPromises);

      return { success: true, count: adminIds.length };
    } catch (error) {
      console.error('Error notifying admins:', error);
      return { success: false, error: error.message };
    }
  }
};

