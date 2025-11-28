import { supabase } from '../lib/supabase';

export const voucherService = {
  // Utiliser un code promo
  async redeemVoucher(code, userId) {
    try {
      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_code: code.toUpperCase().trim(),
        p_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de l\'utilisation du code' 
      };
    }
  },

  // Créer un nouveau voucher (Admin uniquement)
  async createVoucher(voucherData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          code: voucherData.code || await this.generateCode(),
          duration_months: voucherData.duration_months,
          max_uses: voucherData.max_uses || 1,
          amount: voucherData.amount,
          plan_type: voucherData.plan_type,
          expires_at: voucherData.expires_at || null,
          notes: voucherData.notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, voucher: data };
    } catch (error) {
      console.error('Error creating voucher:', error);
      return { success: false, error: error.message };
    }
  },

  // Générer un code aléatoire
  async generateCode() {
    try {
      const { data } = await supabase.rpc('generate_voucher_code');
      return data;
    } catch {
      // Fallback si la fonction n'existe pas
      return `PREMIUM-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  },

  // Obtenir tous les vouchers (Admin)
  async getAllVouchers() {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      return [];
    }
  },

  // Obtenir les statistiques d'un voucher
  async getVoucherStats(voucherId) {
    try {
      const { data, error } = await supabase
        .from('voucher_usages')
        .select(`
          *,
          profiles:user_id (
            email,
            name
          )
        `)
        .eq('voucher_id', voucherId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching voucher stats:', error);
      return [];
    }
  },

  // Désactiver un voucher
  async deactivateVoucher(voucherId) {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({ status: 'inactive' })
        .eq('id', voucherId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deactivating voucher:', error);
      return { success: false, error: error.message };
    }
  },

  // Mettre à jour un voucher
  async updateVoucher(voucherId, updates) {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .update(updates)
        .eq('id', voucherId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, voucher: data };
    } catch (error) {
      console.error('Error updating voucher:', error);
      return { success: false, error: error.message };
    }
  },

  // Supprimer un voucher
  async deleteVoucher(voucherId) {
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting voucher:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtenir l'historique d'utilisation de l'utilisateur
  async getUserVoucherHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('voucher_usages')
        .select(`
          *,
          vouchers:voucher_id (
            code,
            plan_type,
            amount
          )
        `)
        .eq('user_id', userId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user voucher history:', error);
      return [];
    }
  },

  // Vérifier si un code existe et est valide (sans l'utiliser)
  async validateVoucher(code) {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('code, duration_months, plan_type, amount, current_uses, max_uses, expires_at, status')
        .eq('code', code.toUpperCase().trim())
        .single();

      if (error || !data) {
        return { valid: false, message: 'Code invalide' };
      }

      if (data.status !== 'active') {
        return { valid: false, message: 'Code désactivé' };
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, message: 'Code expiré' };
      }

      if (data.current_uses >= data.max_uses) {
        return { valid: false, message: 'Code déjà utilisé' };
      }

      return { 
        valid: true, 
        message: 'Code valide',
        details: {
          duration_months: data.duration_months,
          plan_type: data.plan_type,
          amount: data.amount
        }
      };
    } catch (error) {
      console.error('Error validating voucher:', error);
      return { valid: false, message: 'Erreur de validation' };
    }
  }
};
