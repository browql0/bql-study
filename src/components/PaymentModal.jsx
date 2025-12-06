import React, { useState, useEffect } from 'react';
import { X, Check, Zap, Star, Crown, Gift, CreditCard, Shield, RotateCcw, Lock, Building2, Banknote } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { supabase } from '../lib/supabase';
import BankTransferForm from './BankTransferForm';
import CashPaymentForm from './CashPaymentForm';
import './PaymentModal.css';

const PaymentModal = ({ onClose, onPaymentSuccess, onOpenVoucher }) => {
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [paymentMethod, setPaymentMethod] = useState('cmi'); // 'cmi', 'bank_transfer', 'cash'
  const [loading, setLoading] = useState(false);
  const [showBankTransferForm, setShowBankTransferForm] = useState(false);
  const [showCashPaymentForm, setShowCashPaymentForm] = useState(false);
  const [pricing, setPricing] = useState({
    monthly: 20,
    quarterly: 50,
    yearly: 100
  });

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const prices = await settingsService.getPricing();
        setPricing(prices);
      } catch (error) {
        console.error('Error loading pricing:', error);
      }
    };
    loadPricing();
  }, []);

  const pricePerMonthQuarterly = pricing.quarterly / 3;
  const pricePerMonthYearly = pricing.yearly / 6;
  const savingsQuarterly = (pricing.monthly * 3) - pricing.quarterly;
  const savingsYearly = (pricing.monthly * 6) - pricing.yearly;

  const plans = [
    {
      id: 'monthly',
      name: 'Mensuel',
      price: pricing.monthly,
      duration: '1 mois',
      icon: Zap,
      color: '#3b82f6',
      pricePerMonth: pricing.monthly,
      features: [
        'Accès illimité à toutes les matières',
        'Création de notes et quiz',
        'Stockage de photos et fichiers',
        'Support prioritaire'
      ]
    },
    {
      id: 'quarterly',
      name: 'Trimestriel',
      price: pricing.quarterly,
      duration: '3 mois',
      popular: true,
      icon: Star,
      color: '#f59e0b',
      pricePerMonth: pricePerMonthQuarterly,
      savings: savingsQuarterly > 0 ? `Économisez ${savingsQuarterly} DH` : null,
      features: [
        'Tout du plan Mensuel',
        `${pricePerMonthQuarterly.toFixed(2)} DH/mois seulement`,
        savingsQuarterly > 0 ? `Économisez ${savingsQuarterly} DH sur 3 mois` : 'Meilleur rapport qualité/prix',
        'Annulation à tout moment'
      ]
    },
    {
      id: 'yearly',
      name: 'Semestre',
      price: pricing.yearly,
      duration: '6 mois',
      icon: Crown,
      color: '#8b5cf6',
      pricePerMonth: pricePerMonthYearly,
      savings: savingsYearly > 0 ? `Économisez ${savingsYearly} DH` : null,
      features: [
        'Tout du plan Mensuel',
        `Meilleure offre : ${pricePerMonthYearly.toFixed(2)} DH/mois`,
        savingsYearly > 0 ? `Économisez ${savingsYearly} DH sur 6 mois` : 'Meilleur rapport qualité/prix',
        'Badge exclusif Premium'
      ]
    }
  ];

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handlePayment = async () => {
    // Si virement bancaire, ouvrir le formulaire
    if (paymentMethod === 'bank_transfer') {
      setShowBankTransferForm(true);
      return;
    }

    // Si cash, ouvrir le formulaire
    if (paymentMethod === 'cash') {
      setShowCashPaymentForm(true);
      return;
    }

    // Paiement CMI (à implémenter quand le compte sera ouvert)
    alert('CMI Payment Gateway sera intégré dès que votre compte CMI sera activé');
  };

  return (
    <>
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Mobile */}
        <div className="payment-header">
          <div className="payment-header-content">
            <div className="payment-title-section">
              <Crown className="payment-title-icon" size={24} />
              <h2>Premium</h2>
            </div>
            <button className="payment-close-btn" onClick={onClose} aria-label="Fermer">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="payment-content-wrapper">
          {/* Hero Section */}
          <div className="payment-hero-mobile">
            <h3>Débloquez tout le contenu</h3>
            <p>Choisissez votre plan et commencez dès maintenant</p>
          </div>

          {/* Plans - Mobile Scroll */}
          <div className="payment-plans-container">
            <div className="payment-plans-scroll">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                
                return (
                  <div
                    key={plan.id}
                    className={`payment-plan-card ${isSelected ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <div className="plan-popular-badge">⭐ Plus populaire</div>
                    )}
                    
                    <div className="plan-card-header">
                      <div 
                        className="plan-icon-wrapper"
                        style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)` }}
                      >
                        <Icon size={20} />
                      </div>
                      <h4>{plan.name}</h4>
                    </div>

                    <div className="plan-price-section">
                      <div className="plan-price-main">
                        <span className="plan-price-amount">{plan.price}</span>
                        <span className="plan-price-currency">DH</span>
                      </div>
                      <span className="plan-price-duration">pour {plan.duration}</span>
                      {plan.pricePerMonth && plan.pricePerMonth !== plan.price && (
                        <div className="plan-price-savings">
                          <span className="savings-text">Seulement</span>
                          <span className="savings-amount">{plan.pricePerMonth.toFixed(2)} DH/mois</span>
                        </div>
                      )}
                    </div>

                    <ul className="plan-features-list">
                      {plan.features.map((feature, index) => (
                        <li key={index}>
                          <Check size={14} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isSelected && (
                      <div className="plan-selected-badge">
                        <Check size={16} />
                        <span>Sélectionné</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="payment-summary-mobile">
            <div className="summary-row">
              <span className="summary-label">Plan :</span>
              <span className="summary-value">{selectedPlanData?.name}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total :</span>
              <span className="summary-price">{selectedPlanData?.price} DH</span>
            </div>
            {selectedPlanData?.savings && (
              <div className="summary-savings-row">
                <span className="summary-label">Économie :</span>
                <span className="summary-savings-value">{selectedPlanData.savings}</span>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="payment-trust-badges">
            <div className="trust-badge">
              <Shield size={18} />
              <span>Sécurisé</span>
            </div>
            <div className="trust-badge">
              <RotateCcw size={18} />
              <span>Annulable</span>
            </div>
            <div className="trust-badge">
              <Lock size={18} />
              <span>100% Privé</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="payment-methods-section">
            <h4 className="payment-methods-title">Mode de paiement</h4>
            <div className="payment-methods-grid">
              <button
                className={`payment-method-card ${paymentMethod === 'cmi' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('cmi')}
                type="button"
              >
                <CreditCard size={20} />
                <div className="payment-method-info">
                  <span className="payment-method-name">Carte bancaire</span>
                  <span className="payment-method-desc">CMI (Bientôt disponible)</span>
                </div>
                {paymentMethod === 'cmi' && <Check size={18} className="check-icon" />}
              </button>

              <button
                className={`payment-method-card ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('bank_transfer')}
                type="button"
              >
                <Building2 size={20} />
                <div className="payment-method-info">
                  <span className="payment-method-name">Virement bancaire</span>
                  <span className="payment-method-desc">Tijari Bank uniquement</span>
                </div>
                {paymentMethod === 'bank_transfer' && <Check size={18} className="check-icon" />}
              </button>

              <button
                className={`payment-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('cash')}
                type="button"
              >
                <Banknote size={20} />
                <div className="payment-method-info">
                  <span className="payment-method-name">Paiement en espèces</span>
                  <span className="payment-method-desc">Rendez-vous requis</span>
                </div>
                {paymentMethod === 'cash' && <Check size={18} className="check-icon" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="payment-actions">
            <button
              className="payment-btn-voucher"
              onClick={onOpenVoucher}
              type="button"
            >
              <Gift size={18} />
              <span>Code promo</span>
            </button>

            <button
              className="payment-btn-primary"
              onClick={handlePayment}
              disabled={loading || paymentMethod === 'cmi'}
            >
              {loading ? (
                <>
                  <div className="payment-spinner"></div>
                  <span>Traitement...</span>
                </>
              ) : paymentMethod === 'cmi' ? (
                <>
                  <CreditCard size={18} />
                  <span>Bientôt disponible</span>
                </>
              ) : paymentMethod === 'bank_transfer' ? (
                <>
                  <Building2 size={18} />
                  <span>Effectuer un virement</span>
                </>
              ) : (
                <>
                  <Banknote size={18} />
                  <span>Demander RDV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Transfer Form */}
      {showBankTransferForm && (
        <BankTransferForm
          selectedPlan={selectedPlan}
          amount={selectedPlanData?.price}
          onClose={() => setShowBankTransferForm(false)}
          onSuccess={() => {
            setShowBankTransferForm(false);
            onClose();
          }}
        />
      )}

      {/* Cash Payment Form */}
      {showCashPaymentForm && (
        <CashPaymentForm
          selectedPlan={selectedPlan}
          amount={selectedPlanData?.price}
          onClose={() => setShowCashPaymentForm(false)}
          onSuccess={() => {
            setShowCashPaymentForm(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default PaymentModal;
