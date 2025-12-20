import { supabase } from '../lib/supabase';
import { settingsService } from './settingsService';

/**
 * Service de paiement pour CMI et Tijari Payment
 */
export const paymentService = {
  /**
   * Créer une session de paiement et rediriger vers la passerelle
   */
  async createPaymentSession(userId, plan) {
    try {
      // Récupérer les prix depuis la base de données
      const pricing = await settingsService.getPricing();

      const plans = {
        monthly: { amount: pricing.monthly, duration: 1 },
        quarterly: { amount: pricing.quarterly, duration: 3 },
        yearly: { amount: pricing.yearly, duration: 6 }
      };

      const selectedPlan = plans[plan];
      if (!selectedPlan) throw new Error('Plan invalide');

      // Récupérer les informations de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Déterminer la passerelle de paiement
      const paymentGateway = import.meta.env.VITE_PAYMENT_GATEWAY || 'simulation';

      // Créer un enregistrement de paiement en attente
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          user_name: userData.name,
          user_email: userData.email,
          amount: selectedPlan.amount,
          currency: 'MAD',
          status: paymentGateway === 'simulation' ? 'completed' : 'pending',
          payment_method: paymentGateway,
          subscription_duration: selectedPlan.duration,
          plan_type: plan,
          transaction_id: paymentGateway === 'simulation' ? `SIM-${Date.now()}` : null
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Si mode simulation, traiter le paiement immédiatement
      if (paymentGateway === 'simulation') {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + selectedPlan.duration);

        // Fetch current stats to increment
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('total_spent, total_payments')
          .eq('id', userId)
          .single();

        const currentSpent = userProfile?.total_spent || 0;
        const currentPayments = userProfile?.total_payments || 0;
        const newSpent = currentSpent + selectedPlan.amount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'premium',
            subscription_end_date: endDate.toISOString(),
            last_payment_date: new Date().toISOString(),
            payment_amount: selectedPlan.amount,
            plan_type: plan,
            total_spent: newSpent,
            total_payments: currentPayments + 1
          })
          .eq('id', userId);

        if (updateError) throw updateError;

        return {
          success: true,
          paymentId: payment.id,
          paymentUrl: null, // Pas de redirection en mode simulation
          payment,
          isSimulation: true
        };
      }

      // Générer l'URL de paiement selon la passerelle configurée
      const paymentUrl = await this.generatePaymentUrl({
        paymentId: payment.id,
        userId,
        amount: selectedPlan.amount,
        currency: 'MAD',
        email: userData.email,
        name: userData.name || userData.email,
        plan: plan,
        gateway: paymentGateway
      });

      return {
        success: true,
        paymentId: payment.id,
        paymentUrl,
        payment
      };
    } catch (error) {
      console.error('Error creating payment session:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Générer l'URL de paiement selon la passerelle
   */
  async generatePaymentUrl({ paymentId, userId, amount, currency, email, name, plan, gateway }) {
    const baseUrl = window.location.origin;
    const returnUrl = `${baseUrl}/payment/success?payment_id=${paymentId}`;
    const cancelUrl = `${baseUrl}/payment/cancel?payment_id=${paymentId}`;
    const notifyUrl = `${baseUrl}/api/payment/webhook`;

    if (gateway === 'cmi') {
      return await this.generateCMIUrl({
        paymentId,
        amount,
        currency,
        email,
        name,
        returnUrl,
        cancelUrl,
        notifyUrl
      });
    } else if (gateway === 'tijari') {
      return await this.generateTijariUrl({
        paymentId,
        amount,
        currency,
        email,
        name,
        returnUrl,
        cancelUrl,
        notifyUrl
      });
    } else {
      throw new Error('Passerelle de paiement non supportée');
    }
  },

  /**
   * Générer l'URL de paiement CMI
   */
  async generateCMIUrl({ paymentId, amount, currency, email, name, returnUrl, cancelUrl, notifyUrl }) {
    const storeKey = import.meta.env.VITE_CMI_STORE_KEY;
    const storeId = import.meta.env.VITE_CMI_STORE_ID;
    const cmiUrl = import.meta.env.VITE_CMI_PAYMENT_URL || 'https://payment.cmi.co.ma/fim/est3Dgate';

    if (!storeKey || !storeId) {
      throw new Error('Configuration CMI manquante. Vérifiez les variables d\'environnement.');
    }

    // Paramètres CMI
    const params = {
      oid: paymentId, // Order ID
      amount: amount.toFixed(2),
      currency: currency,
      email: email,
      BillToName: name,
      BillToStreet1: '',
      BillToCity: '',
      BillToStateProv: '',
      BillToPostalCode: '',
      BillToCountry: 'MA',
      okUrl: returnUrl,
      failUrl: cancelUrl,
      shopurl: window.location.origin,
      callbackurl: notifyUrl,
      rnd: Date.now().toString(),
      storetype: '3d',
      hashAlgorithm: 'ver3',
      lang: 'fr'
    };

    // Générer le hash CMI
    const hashString = `${storeId}${params.oid}${params.amount}${params.okUrl}${params.failUrl}${params.callbackurl}${storeKey}`;
    const hash = await this.generateHash(hashString);
    params.hash = hash;

    // Construire l'URL avec les paramètres
    const queryString = new URLSearchParams(params).toString();
    return `${cmiUrl}?${queryString}`;
  },

  /**
   * Générer l'URL de paiement Tijari Payment
   */
  async generateTijariUrl({ paymentId, amount, currency, email, name, returnUrl, cancelUrl, notifyUrl }) {
    const merchantId = import.meta.env.VITE_TIJARI_MERCHANT_ID;
    const apiKey = import.meta.env.VITE_TIJARI_API_KEY;
    const tijariUrl = import.meta.env.VITE_TIJARI_PAYMENT_URL || 'https://payment.tijaripayment.ma/api/payment';

    if (!merchantId || !apiKey) {
      throw new Error('Configuration Tijari Payment manquante. Vérifiez les variables d\'environnement.');
    }

    // Paramètres Tijari Payment
    const params = {
      merchant_id: merchantId,
      order_id: paymentId,
      amount: amount.toFixed(2),
      currency: currency,
      customer_email: email,
      customer_name: name,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      language: 'fr'
    };

    // Générer la signature Tijari
    const signature = this.generateTijariSignature(params, apiKey);
    params.signature = signature;

    // Construire l'URL avec les paramètres
    const queryString = new URLSearchParams(params).toString();
    return `${tijariUrl}?${queryString}`;
  },

  /**
   * Générer le hash CMI (SHA256)
   * NOTE: En production, cette fonction devrait appeler un endpoint backend
   * pour générer le hash de manière sécurisée
   */
  async generateHash(data) {
    try {
      // Utiliser Web Crypto API pour générer le hash SHA256
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating hash:', error);
      // Fallback simple (non sécurisé, à utiliser uniquement en développement)
      return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
    }
  },

  /**
   * Générer la signature Tijari Payment
   */
  async generateTijariSignature(params, apiKey) {
    // Trier les paramètres et créer la chaîne de signature
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const signatureString = `${sortedParams}&key=${apiKey}`;
    return await this.generateHash(signatureString);
  },

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return { success: true, payment: data };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Confirmer un paiement (appelé par le webhook)
   */
  async confirmPayment(paymentId, transactionId, status) {
    try {
      // Mettre à jour le paiement
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .update({
          status: status,
          transaction_id: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Si le paiement est réussi, mettre à jour le profil
      if (status === 'completed' && payment) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + payment.subscription_duration);

        // Fetch current stats
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('total_spent, total_payments')
          .eq('id', payment.user_id)
          .single();

        const currentSpent = userProfile?.total_spent || 0;
        const currentPayments = userProfile?.total_payments || 0;
        const newSpent = currentSpent + payment.amount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'premium',
            subscription_end_date: endDate.toISOString(),
            last_payment_date: new Date().toISOString(),
            payment_amount: payment.amount,
            plan_type: payment.plan_type,
            total_spent: newSpent,
            total_payments: currentPayments + 1
          })
          .eq('id', payment.user_id);

        if (updateError) throw updateError;
      }

      return { success: true, payment };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Vérifier la signature du webhook CMI
   * NOTE: Cette fonction est utilisée côté serveur uniquement
   */
  async verifyCMIWebhook(data, hash) {
    const storeKey = import.meta.env.VITE_CMI_STORE_KEY;
    const storeId = import.meta.env.VITE_CMI_STORE_ID;

    const hashString = `${storeId}${data.oid}${data.amount}${data.currency}${data.status}${storeKey}`;
    const expectedHash = await this.generateHash(hashString);

    return hash === expectedHash;
  },

  /**
   * Vérifier la signature du webhook Tijari
   * NOTE: Cette fonction est utilisée côté serveur uniquement
   */
  async verifyTijariWebhook(data, signature) {
    const apiKey = import.meta.env.VITE_TIJARI_API_KEY;

    const sortedParams = Object.keys(data)
      .filter(key => key !== 'signature')
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');

    const signatureString = `${sortedParams}&key=${apiKey}`;
    const expectedSignature = await this.generateHash(signatureString);

    return signature === expectedSignature;
  }
};

