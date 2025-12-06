import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';

export const subscriptionService = {
  // Vérifier si l'utilisateur a un abonnement actif
  async hasActiveSubscription(userId, forceRefresh = false) {
    try {
      // Toujours forcer le rafraîchissement pour éviter le cache et détecter les expirations
      // Utiliser maybeSingle() pour éviter les erreurs si le profil n'existe pas
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, role, updated_at')
        .eq('id', userId)
        .maybeSingle();

      // Si le profil n'existe pas, NE PAS le créer automatiquement
      // Car cela pourrait réinitialiser le statut à 'free' et donner l'impression d'un accès
      if ((error && error.code === 'PGRST116') || !profileData) {
        // Si le profil n'existe pas, retourner false (pas d'accès)
        // Ne pas créer le profil automatiquement car cela pourrait causer des problèmes
        console.warn('Profil non trouvé pour l\'utilisateur:', userId);
        return false;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification de l\'abonnement:', error);
        return false;
      }
      
      // Vérifier explicitement que profileData existe avant de continuer
      if (!profileData) {
        return false;
      }

      // Admin a toujours accès
      if (profileData?.role === 'admin') return true;

      // Vérifier si active, trial ou premium et pas expiré
      if (profileData?.subscription_status === 'active' || 
          profileData?.subscription_status === 'trial' ||
          profileData?.subscription_status === 'premium') {
        if (!profileData.subscription_end_date) return true; // Abonnement illimité
        const endDate = new Date(profileData.subscription_end_date);
        const now = new Date();
        const isExpired = endDate <= now;
        
        // Si l'abonnement est expiré, mettre à jour le statut SYNCHRONEMENT
        if (isExpired) {
          // Mettre à jour le statut de manière SYNCHRONE pour garantir que c'est fait avant de retourner
          try {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                subscription_status: 'expired',
                subscription_end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
            
            if (updateError) {
              console.error('Erreur lors de la mise à jour du statut expiré:', updateError);
            } else {
              console.log('Abonnement expiré, statut mis à jour vers expired');
            }
          } catch (err) {
            console.error('Erreur lors de la mise à jour du statut expiré:', err);
          }
          
          return false; // Accès refusé car expiré
        }
        
        return true; // Accès autorisé
      }

      // Statut 'expired', 'cancelled', NULL, ou autre = pas d'accès
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

      // Si le profil n'existe pas, retourner null au lieu de créer un nouveau profil
      // Car créer un profil pourrait réinitialiser le statut
      if (error && error.code === 'PGRST116' || !data) {
        // Ne pas créer le profil automatiquement
        return null;
      }

      if (error) {
        return null;
      }

      // Vérifier si l'abonnement ou la période d'essai est expiré
      if (data.subscription_status === 'trial' || data.subscription_status === 'premium') {
        if (data.subscription_end_date) {
          const endDate = new Date(data.subscription_end_date);
          const now = new Date();
          const isExpired = endDate <= now;
          
          if (isExpired) {
            // Mettre à jour le statut de manière synchrone pour que le profil se rafraîchisse
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                subscription_status: 'free',
                subscription_end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
            
            if (!updateError) {
              // Retourner les données mises à jour
              return {
                ...data,
                subscription_status: 'free',
                subscription_end_date: null
              };
            }
          }
        }
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
