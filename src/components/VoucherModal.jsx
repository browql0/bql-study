import React, { useState } from 'react';
import { X, Gift, Check, AlertCircle, Loader, Ticket, Sparkles } from 'lucide-react';
import { voucherService } from '../services/voucherService';
import './VoucherModal.css';

const VoucherModal = ({ onClose, userId, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState('');

  const handleValidate = async () => {
    if (!code.trim()) return;

    setValidating(true);
    setError('');
    const result = await voucherService.validateVoucher(code);
    setValidation(result);
    setValidating(false);
  };

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Veuillez entrer un code');
      return;
    }

    setLoading(true);
    setError('');

    const result = await voucherService.redeemVoucher(code, userId);

    if (result.success) {
      await onSuccess(result);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Code invalide');
    }

    setLoading(false);
  };

  const getPlanLabel = (planType) => {
    const labels = {
      monthly: '1 Mois Premium',
      quarterly: '3 Mois Premium',
      yearly: '6 Mois Premium'
    };
    return labels[planType] || planType;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal voucher-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon-badge">
            <Ticket size={24} />
          </div>
          <h2>Activer un Code</h2>
          <button className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="voucher-content">
          {/* Hero Section */}
          <div className="voucher-hero">
            <div className="gift-icon-container">
              <div className="gift-orbit"></div>
              <Gift size={42} className="hero-icon" />
              <Sparkles size={16} className="sparkle s1" />
              <Sparkles size={12} className="sparkle s2" />
            </div>
            <div className="hero-text">
              <h3>Boostez votre apprentissage</h3>
              <p>Entrez votre code ci-dessous pour débloquer instantanément vos avantages Premium.</p>
            </div>
          </div>

          {/* Input Section */}
          <div className="voucher-input-section">
            <label className="input-label">Code Promo</label>
            <div className={`code-input-wrapper ${validation?.valid ? 'success' : ''} ${validation?.valid === false || error ? 'error' : ''}`}>
              <Ticket size={20} className="input-icon" />
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setValidation(null);
                  setError('');
                }}
                onBlur={handleValidate}
                placeholder="Ex: PREMIUM-2024"
                className="code-input"
                disabled={loading}
                maxLength={20}
              />
              {validating && (
                <div className="input-status">
                  <Loader size={18} className="spin" />
                </div>
              )}
              {!validating && validation?.valid && (
                <div className="input-status success">
                  <Check size={18} />
                </div>
              )}
            </div>

            {/* Validation Feedback */}
            {validation && validation.valid && (
              <div className="validation-card success">
                <div className="validation-icon">
                  <Gift size={20} />
                </div>
                <div className="validation-info">
                  <strong>Code Valide !</strong>
                  <p>Vous allez recevoir : <span>{getPlanLabel(validation.details.plan_type)}</span></p>
                </div>
              </div>
            )}

            {(error || (validation && !validation.valid)) && (
              <div className="validation-card error">
                <div className="validation-icon">
                  <AlertCircle size={20} />
                </div>
                <div className="validation-info">
                  <strong>Oups !</strong>
                  <p>{error || validation?.message || "Ce code n'est pas valide"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="voucher-actions">
            <button
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              className={`btn-redeem ${loading ? 'loading' : ''}`}
              onClick={handleRedeem}
              disabled={loading || !code.trim() || (validation && !validation.valid)}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spin" />
                  <span>Activation...</span>
                </>
              ) : (
                <>
                  <Ticket size={18} />
                  <span>Activer maintenant</span>
                  <div className="btn-shine"></div>
                </>
              )}
            </button>
          </div>

          {/* Footer Info */}
          <div className="voucher-footer">
            <p>Pas encore de code ? <a href="#">Voir nos offres</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;
