import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';

export const subscriptionService = {
  // Vérifier si l'utilisateur a un abonnement actif
  async hasActiveSubscription(userId, forceRefresh = false) {
    try {
      // Forcer le rafraîchissement en utilisant un select avec un timestamp pour bypasser le cache
      let query = supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, role')
        .eq('id', userId);
      
      // Si forceRefresh, ajouter un paramètre pour forcer une nouvelle requête
      if (forceRefresh) {
        // Utiliser un select avec une colonne calculée pour forcer le rafraîchissement
        query = query.select('subscription_status, subscription_end_date, role, updated_at');
      }
      
      const { data: profile, error } = await query.maybeSingle();

      // Si le profil n'existe pas, essayer de le créer
      if (error && error.code === 'PGRST116' || !profile) {
        try {
          // Importer le service de profil
          const { createProfile } = await import('./profileService');
          await createProfile(userId, {});
          return false;
        } catch (createError) {
          return false;
        }
      }

      if (error) {
        return false;
      }

      // Admin a toujours accès
      if (profile.role === 'admin') return true;

      // Vérifier si premium et pas expiré
      if (profile.subscription_status === 'premium') {
        if (!profile.subscription_end_date) return true; // Abonnement illimité
        return new Date(profile.subscription_end_date) > new Date();
      }

      // Vérifier si période d'essai (trial) et pas expirée
      if (profile.subscription_status === 'trial') {
        if (!profile.subscription_end_date) {
          return false; // Pas de date = pas d'essai valide
        }
        const endDate = new Date(profile.subscription_end_date);
        const now = new Date();
        const isExpired = endDate <= now;
        return !isExpired;
      }

      return false;
    } catch (error) {
      return false;
    }
  },

  // Obtenir les détails de l'abonnement
  async getSubscriptionDetails(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, last_payment_date, payment_amount, role')
        .eq('id', userId)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

      // Si le profil n'existe pas, essayer de le créer
      if (error && error.code === 'PGRST116' || !data) {
        try {
          // Importer le service de profil
          const { createProfile } = await import('./profileService');
          await createProfile(userId, {});
          return {
            subscription_status: 'free',
            subscription_end_date: null,
            last_payment_date: null,
            payment_amount: null,
            role: 'spectator'
          };
        } catch (createError) {
          return null;
        }
      }

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      return null;
    }
  },

  // Créer un paiement (simulation pour l'instant)
  async createPayment(userId, plan) {
    try {
      // Récupérer les prix depuis la base de données
      const pricing = await settingsService.getPricing();
      
      const plans = {
        monthly: { amount: pricing.monthly, duration: 1 },
        quarterly: { amount: pricing.quarterly, duration: 3 },
        yearly: { amount: pricing.yearly, duration: 6 }
      };

      const selectedPlan = plans[plan];
      if (!selectedPlan) throw new Error('Invalid plan');

      // Créer l'enregistrement de paiement
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          amount: selectedPlan.amount,
          currency: 'MAD',
          status: 'completed', // Simulation - normalement ce serait 'pending'
          payment_method: 'simulation',
          transaction_id: `SIM-${Date.now()}`,
          subscription_duration: selectedPlan.duration
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Calculer la date de fin d'abonnement
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + selectedPlan.duration);

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'premium',
          subscription_end_date: endDate.toISOString(),
          last_payment_date: new Date().toISOString(),
          payment_amount: selectedPlan.amount
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obtenir l'historique des paiements
  async getPaymentHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  },

  // Calculer les jours restants
  getDaysRemaining(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
};
