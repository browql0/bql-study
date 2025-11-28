import React, { useState } from 'react';
import { X, Gift, Check, AlertCircle, Loader } from 'lucide-react';
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
      // Succès !
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
      monthly: 'Mensuel (1 mois)',
      quarterly: 'Trimestriel (3 mois)',
      yearly: 'Semestre (6 mois)'
    };
    return labels[planType] || planType;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal voucher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Gift size={24} />
            Code Promo / Voucher
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="voucher-content">
          <div className="voucher-hero">
            <div className="gift-icon">
              <Gift size={48} />
            </div>
            <h3>Vous avez un code promo ?</h3>
            <p>Entrez votre code pour activer votre abonnement Premium</p>
          </div>

          <div className="voucher-input-section">
            <div className="code-input-wrapper">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setValidation(null);
                  setError('');
                }}
                onBlur={handleValidate}
                placeholder="PREMIUM-XXXX-XXXX"
                className={`code-input ${validation ? (validation.valid ? 'valid' : 'invalid') : ''}`}
                disabled={loading}
              />
              {validating && (
                <div className="input-loader">
                  <Loader size={20} className="spin" />
                </div>
              )}
            </div>

            {validation && validation.valid && (
              <div className="validation-success">
                <Check size={18} />
                <div className="validation-details">
                  <strong>Code valide !</strong>
                  <p>Plan: {getPlanLabel(validation.details.plan_type)}</p>
                  {validation.details.amount && (
                    <p>Valeur: {validation.details.amount} DH</p>
                  )}
                </div>
              </div>
            )}

            {validation && !validation.valid && (
              <div className="validation-error">
                <AlertCircle size={18} />
                <span>{validation.message}</span>
              </div>
            )}

            {error && (
              <div className="voucher-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="voucher-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary btn-redeem"
              onClick={handleRedeem}
              disabled={loading || !code.trim() || (validation && !validation.valid)}
            >
              {loading ? (
                <>
                  <Loader size={20} className="spin" />
                  Activation...
                </>
              ) : (
                <>
                  <Gift size={20} />
                  Activer le code
                </>
              )}
            </button>
          </div>

          <div className="voucher-info">
            <h4>Comment obtenir un code ?</h4>
            <ul>
              <li>📧 Codes envoyés par email lors de promotions</li>
              <li>🎁 Codes partagés sur les réseaux sociaux</li>
              <li>🤝 Codes offerts par des partenaires</li>
              <li>🏆 Récompenses pour les utilisateurs fidèles</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherModal;
