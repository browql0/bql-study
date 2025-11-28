import { supabase } from '../lib/supabase';

export const notificationsService = {
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
};

