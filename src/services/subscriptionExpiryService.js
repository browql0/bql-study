import { supabase } from '../lib/supabase';
import pushNotificationService from './pushNotificationService';

/**
 * Service pour gérer les notifications d'expiration d'abonnement
 */
export const subscriptionExpiryService = {
  /**
   * Vérifie l'état de l'abonnement d'un utilisateur et envoie des alertes si nécessaire
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} { daysRemaining, needsWarning, expired }
   */
  async checkUserSubscription(userId) {
    try {
      // Récupérer les données de profil avec dates d'abonnement
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return { daysRemaining: null, needsWarning: false, expired: false };
      }

      // Vérifier si l'utilisateur a un abonnement actif
      if (!profile.subscription_end_date || profile.subscription_status !== 'active') {
        return { daysRemaining: null, needsWarning: false, expired: false };
      }

      // Calculer les jours restants
      const endDate = new Date(profile.subscription_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      // Déjà expiré
      if (daysRemaining <= 0) {
        return { 
          daysRemaining: 0, 
          needsWarning: false, 
          expired: true,
          profile 
        };
      }

      // Alertes à 3 jours et 1 jour
      const needsWarning = daysRemaining === 3 || daysRemaining === 1;

      return {
        daysRemaining,
        needsWarning,
        expired: false,
        profile
      };
    } catch (error) {
      console.error('Error checking subscription:', error);
      return { daysRemaining: null, needsWarning: false, expired: false };
    }
  },

  /**
   * Envoie une notification d'avertissement à l'utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} daysRemaining - Jours restants
   */
  async sendExpiryWarning(userId, daysRemaining) {
    try {
      const title = '⏰ Abonnement bientôt expiré';
      const body = daysRemaining === 1
        ? 'Votre abonnement expire demain ! Renouvelez-le pour continuer à accéder au contenu.'
        : `Votre abonnement expire dans ${daysRemaining} jours. Pensez à le renouveler.`;

      await pushNotificationService.notifyUser(userId, title, body);
      
      // Créer aussi une notification dans la base de données
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: body,
        p_type: 'subscription_warning'
      });

      console.log(`Expiry warning sent to user ${userId}: ${daysRemaining} days remaining`);
      return true;
    } catch (error) {
      console.error('Error sending expiry warning:', error);
      return false;
    }
  },

  /**
   * Notifie les admins qu'un abonnement a expiré
   * @param {Object} profile - Profil de l'utilisateur
   */
  async notifyAdminsOfExpiration(profile) {
    try {
      await pushNotificationService.notifyAdmins(
        'subscription_expired',
        '📉 Abonnement expiré',
        `${profile.name || profile.email} - Abonnement terminé`
      );
      console.log(`Admin notified of expired subscription for ${profile.email}`);
      return true;
    } catch (error) {
      console.error('Error notifying admins of expiration:', error);
      return false;
    }
  },

  /**
   * Vérifie l'abonnement au login et affiche les alertes
   * @param {string} userId - ID de l'utilisateur
   * @returns {Object} État de l'abonnement avec message si nécessaire
   */
  async checkOnLogin(userId) {
    const status = await this.checkUserSubscription(userId);

    if (!status.daysRemaining) {
      return { showWarning: false };
    }

    // Si expiré, notifier les admins
    if (status.expired) {
      await this.notifyAdminsOfExpiration(status.profile);
      return {
        showWarning: true,
        message: '🔒 Votre abonnement a expiré. Renouvelez-le pour continuer à accéder au contenu.',
        severity: 'error'
      };
    }

    // Si proche de l'expiration (3 jours ou moins)
    if (status.daysRemaining <= 3) {
      // Envoyer notification push si c'est exactement 3 ou 1 jour
      if (status.needsWarning) {
        await this.sendExpiryWarning(userId, status.daysRemaining);
      }

      return {
        showWarning: true,
        message: status.daysRemaining === 1
          ? '⚠️ Votre abonnement expire demain ! Renouvelez-le dès maintenant.'
          : `⚠️ Votre abonnement expire dans ${status.daysRemaining} jours.`,
        severity: 'warning',
        daysRemaining: status.daysRemaining
      };
    }

    return { showWarning: false };
  },

  /**
   * Fonction à appeler périodiquement (cron ou au login) pour vérifier tous les utilisateurs
   * Cette fonction n'est utile que si vous avez un système de cron côté serveur
   */
  async checkAllSubscriptions() {
    try {
      // Récupérer tous les utilisateurs avec abonnement actif
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, subscription_end_date')
        .eq('subscription_status', 'active')
        .not('subscription_end_date', 'is', null);

      if (error) {
        console.error('Error fetching active subscriptions:', error);
        return;
      }

      const now = new Date();

      for (const profile of profiles) {
        const endDate = new Date(profile.subscription_end_date);
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Envoyer alertes à 3 jours et 1 jour
        if (daysRemaining === 3 || daysRemaining === 1) {
          await this.sendExpiryWarning(profile.id, daysRemaining);
        }

        // Notifier admins si expiré
        if (daysRemaining <= 0) {
          await this.notifyAdminsOfExpiration(profile);
        }
      }

      console.log(`Checked ${profiles.length} active subscriptions`);
    } catch (error) {
      console.error('Error in checkAllSubscriptions:', error);
    }
  }
};
