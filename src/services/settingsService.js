import { supabase } from '../lib/supabase';

export const settingsService = {
  // Récupérer les paramètres
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (!data) {
        // Si aucun paramètre n'existe, créer les valeurs par défaut
        return await this.createDefaultSettings();
      }

      // Transformer les données de la BDD en format utilisé par l'app
      return {
        pricing: {
          monthly: parseFloat(data.monthly_price),
          quarterly: parseFloat(data.quarterly_price),
          yearly: parseFloat(data.yearly_price)
        },
        features: {
          notes: data.feature_notes,
          flashcards: data.feature_flashcards,
          quiz: data.feature_quiz,
          photos: data.feature_photos,
          files: data.feature_files,
          advancedSearch: data.feature_advanced_search
        },
        emails: {
          welcomeEmail: data.email_welcome,
          subscriptionReminder: data.email_subscription_reminder,
          expirationNotice: data.email_expiration_notice,
          promotionalEmails: data.email_promotional
        },
        permissions: {
          allowUserRegistration: data.allow_user_registration,
          requireEmailVerification: data.require_email_verification,
          allowGuestAccess: data.allow_guest_access,
          maxFilesPerUser: data.max_files_per_user,
          maxNotesPerUser: data.max_notes_per_user
        }
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  // Créer les paramètres par défaut
  async createDefaultSettings() {
    try {
      const { error } = await supabase
        .from('app_settings')
        .insert([{
          monthly_price: 20.00,
          quarterly_price: 50.00,
          yearly_price: 100.00
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        pricing: {
          monthly: 20,
          quarterly: 50,
          yearly: 100
        },
        features: {
          notes: true,
          flashcards: true,
          quiz: true,
          photos: true,
          files: true,
          advancedSearch: true
        },
        emails: {
          welcomeEmail: true,
          subscriptionReminder: true,
          expirationNotice: true,
          promotionalEmails: false
        },
        permissions: {
          allowUserRegistration: true,
          requireEmailVerification: false,
          allowGuestAccess: false,
          maxFilesPerUser: 50,
          maxNotesPerUser: 100
        }
      };
    } catch (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  },

  // Sauvegarder les paramètres
  async saveSettings(settings) {
    try {
      // Transformer le format de l'app vers le format BDD
      const dbSettings = {
        monthly_price: settings.pricing.monthly,
        quarterly_price: settings.pricing.quarterly,
        yearly_price: settings.pricing.yearly,
        feature_notes: settings.features.notes,
        feature_flashcards: settings.features.flashcards,
        feature_quiz: settings.features.quiz,
        feature_photos: settings.features.photos,
        feature_files: settings.features.files,
        feature_advanced_search: settings.features.advancedSearch,
        email_welcome: settings.emails.welcomeEmail,
        email_subscription_reminder: settings.emails.subscriptionReminder,
        email_expiration_notice: settings.emails.expirationNotice,
        email_promotional: settings.emails.promotionalEmails,
        allow_user_registration: settings.permissions.allowUserRegistration,
        require_email_verification: settings.permissions.requireEmailVerification,
        allow_guest_access: settings.permissions.allowGuestAccess,
        max_files_per_user: settings.permissions.maxFilesPerUser,
        max_notes_per_user: settings.permissions.maxNotesPerUser
      };

      // Vérifier si des paramètres existent déjà
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      let result;
      if (existing) {
        // Mettre à jour les paramètres existants
        result = await supabase
          .from('app_settings')
          .update(dbSettings)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Créer de nouveaux paramètres
        result = await supabase
          .from('app_settings')
          .insert([dbSettings])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      return result.data;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  // Réinitialiser aux valeurs par défaut
  async resetToDefaults() {
    try {
      const defaultSettings = {
        monthly_price: 20.00,
        quarterly_price: 50.00,
        yearly_price: 100.00,
        feature_notes: true,
        feature_flashcards: true,
        feature_quiz: true,
        feature_photos: true,
        feature_files: true,
        feature_advanced_search: true,
        email_welcome: true,
        email_subscription_reminder: true,
        email_expiration_notice: true,
        email_promotional: false,
        allow_user_registration: true,
        require_email_verification: false,
        allow_guest_access: false,
        max_files_per_user: 50,
        max_notes_per_user: 100
      };

      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('app_settings')
          .update(defaultSettings)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  },

  // Obtenir les prix actuels (pour l'utiliser ailleurs dans l'app)
  async getPricing() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('monthly_price, quarterly_price, yearly_price')
        .single();

      if (error) throw error;

      return {
        monthly: parseFloat(data.monthly_price),
        quarterly: parseFloat(data.quarterly_price),
        yearly: parseFloat(data.yearly_price)
      };
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Retourner les prix par défaut en cas d'erreur
      return {
        monthly: 20,
        quarterly: 50,
        yearly: 100
      };
    }
  }
};
