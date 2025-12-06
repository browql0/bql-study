import React, { useState } from 'react';
import { X, Banknote, AlertCircle, Calendar, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';
import './CashPaymentForm.css';

const CashPaymentForm = ({ selectedPlan, amount, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    contactPhone: '',
    preferredDate: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = 'Numéro de téléphone requis';
    } else if (!/^0[67]\d{8}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
      newErrors.contactPhone = 'Numéro invalide (ex: 0612345678)';
    }
    
    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Date souhaitée requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Créer le paiement en attente
      const { error } = await supabase
        .from('pending_payments')
        .insert({
          user_id: user.id,
          plan_type: selectedPlan,
          amount: amount,
          payment_method: 'cash',
          contact_phone: formData.contactPhone,
          preferred_date: formData.preferredDate,
          notes: formData.notes || null
        });
      
      if (error) throw error;
      
      // Notifier les admins
      try {
        console.log('🔔 Envoi notification paiement cash aux admins');
        const pushNotificationService = (await import('../services/pushNotificationService')).default;
        const result = await pushNotificationService.notifyAdmins(
          'pending_payment_cash',
          '💵 Demande de paiement cash',
          `RDV demandé le ${new Date(formData.preferredDate).toLocaleDateString('fr-FR')}`
        );
        console.log('✅ Résultat notification admins:', result);
      } catch (notifError) {
        console.error('❌ Erreur notification admins:', notifError);
      }
      
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting cash payment request:', error);
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cash-payment-overlay" onClick={onClose}>
      <div className="cash-payment-container" onClick={(e) => e.stopPropagation()}>
        <div className="cash-payment-header">
          <div className="header-content">
            <Banknote size={24} className="header-icon" />
            <h2>Paiement en espèces</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="cash-payment-content">
          <div className="info-message">
            <Banknote size={20} />
            <p>
              Remplissez ce formulaire pour demander un rendez-vous. 
              Un administrateur vous contactera pour convenir d'un lieu et horaire.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="cash-form">
            <div className="amount-display">
              <span className="amount-label">Montant à payer</span>
              <span className="amount-value">{amount} DH</span>
            </div>

            <div className="form-group">
              <label>
                <Phone size={16} />
                Numéro de téléphone *
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="0612345678"
                className={errors.contactPhone ? 'error' : ''}
              />
              {errors.contactPhone && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  {errors.contactPhone}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                <Calendar size={16} />
                Date souhaitée *
              </label>
              <input
                type="date"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={errors.preferredDate ? 'error' : ''}
              />
              {errors.preferredDate && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  {errors.preferredDate}
                </span>
              )}
              <span className="field-hint">Proposez une date, nous vous contacterons pour confirmer</span>
            </div>

            <div className="form-group">
              <label>
                <MessageSquare size={16} />
                Remarques (optionnel)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Précisions sur votre disponibilité, lieu préféré, etc."
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Banknote size={18} />
                  <span>Demander un rendez-vous</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          onClose();
        }}
        title="Demande de rendez-vous envoyée !"
        message="Un administrateur vous contactera bientôt pour confirmer le lieu et l'horaire du rendez-vous."
        type="success"
      />
    </div>
  );
};

export default CashPaymentForm;
