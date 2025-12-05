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
          monthly: parseFloat(data.monthly_price) || 5,
          quarterly: parseFloat(data.quarterly_price) || 13,
          yearly: parseFloat(data.yearly_price) || 45
        },
        features: {
          dark_mode: data.feature_dark_mode ?? false,
          notifications: data.feature_notifications ?? true,
          file_upload: data.feature_file_upload ?? true,
          public_profiles: data.feature_public_profiles ?? false,
          comments: data.feature_comments ?? true,
          chat: data.feature_chat ?? false
        },
        emails: {
          support: data.email_support || '',
          admin: data.email_admin || '',
          noreply: data.email_noreply || ''
        },
        permissions: {
          manage_users: data.permission_manage_users ?? true,
          manage_content: data.permission_manage_content ?? true,
          manage_payments: data.permission_manage_payments ?? false,
          view_analytics: data.permission_view_analytics ?? true
        }
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Retourner les valeurs par défaut en cas d'erreur
      return this.getDefaultSettings();
    }
  },

  // Obtenir les paramètres par défaut sans les créer
  getDefaultSettings() {
    return {
      pricing: {
        monthly: 5,
        quarterly: 13,
        yearly: 45
      },
      features: {
        dark_mode: false,
        notifications: true,
        file_upload: true,
        public_profiles: false,
        comments: true,
        chat: false
      },
      emails: {
        support: '',
        admin: '',
        noreply: ''
      },
      permissions: {
        manage_users: true,
        manage_content: true,
        manage_payments: false,
        view_analytics: true
      }
    };
  },

  // Créer les paramètres par défaut
  async createDefaultSettings() {
    try {
      const defaults = this.getDefaultSettings();
      
      const { data, error } = await supabase
        .from('app_settings')
        .insert([{
          monthly_price: defaults.pricing.monthly,
          quarterly_price: defaults.pricing.quarterly,
          yearly_price: defaults.pricing.yearly,
          feature_dark_mode: defaults.features.dark_mode,
          feature_notifications: defaults.features.notifications,
          feature_file_upload: defaults.features.file_upload,
          feature_public_profiles: defaults.features.public_profiles,
          feature_comments: defaults.features.comments,
          feature_chat: defaults.features.chat,
          email_support: defaults.emails.support,
          email_admin: defaults.emails.admin,
          email_noreply: defaults.emails.noreply,
          permission_manage_users: defaults.permissions.manage_users,
          permission_manage_content: defaults.permissions.manage_content,
          permission_manage_payments: defaults.permissions.manage_payments,
          permission_view_analytics: defaults.permissions.view_analytics
        }])
        .select()
        .single();

      if (error) throw error;

      return defaults;
    } catch (error) {
      console.error('Error creating default settings:', error);
      return this.getDefaultSettings();
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
        feature_dark_mode: settings.features.dark_mode,
        feature_notifications: settings.features.notifications,
        feature_file_upload: settings.features.file_upload,
        feature_public_profiles: settings.features.public_profiles,
        feature_comments: settings.features.comments,
        feature_chat: settings.features.chat,
        email_support: settings.emails.support,
        email_admin: settings.emails.admin,
        email_noreply: settings.emails.noreply,
        permission_manage_users: settings.permissions.manage_users,
        permission_manage_content: settings.permissions.manage_content,
        permission_manage_payments: settings.permissions.manage_payments,
        permission_view_analytics: settings.permissions.view_analytics
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
      const defaults = this.getDefaultSettings();
      
      const defaultSettings = {
        monthly_price: defaults.pricing.monthly,
        quarterly_price: defaults.pricing.quarterly,
        yearly_price: defaults.pricing.yearly,
        feature_dark_mode: defaults.features.dark_mode,
        feature_notifications: defaults.features.notifications,
        feature_file_upload: defaults.features.file_upload,
        feature_public_profiles: defaults.features.public_profiles,
        feature_comments: defaults.features.comments,
        feature_chat: defaults.features.chat,
        email_support: defaults.emails.support,
        email_admin: defaults.emails.admin,
        email_noreply: defaults.emails.noreply,
        permission_manage_users: defaults.permissions.manage_users,
        permission_manage_content: defaults.permissions.manage_content,
        permission_manage_payments: defaults.permissions.manage_payments,
        permission_view_analytics: defaults.permissions.view_analytics
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
      } else {
        // Si aucun paramètre n'existe, les créer
        const { data, error } = await supabase
          .from('app_settings')
          .insert([defaultSettings])
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
        monthly: parseFloat(data.monthly_price) || 5,
        quarterly: parseFloat(data.quarterly_price) || 13,
        yearly: parseFloat(data.yearly_price) || 45
      };
    } catch (error) {
      console.error('Error fetching pricing:', error);
      // Retourner les prix par défaut en cas d'erreur
      return {
        monthly: 5,
        quarterly: 13,
        yearly: 45
      };
    }
  }
};
