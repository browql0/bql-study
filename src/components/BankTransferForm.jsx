import React, { useState } from 'react';
import { X, Building2, Upload, AlertCircle, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';
import './BankTransferForm.css';

const BankTransferForm = ({ selectedPlan, amount, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    transferDate: '',
    transferReference: '',
    proofFile: null
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Nom du titulaire requis';
    }
    
    if (!formData.transferDate) {
      newErrors.transferDate = 'Date du virement requise';
    }
    
    if (!formData.proofFile) {
      newErrors.proofFile = 'Preuve de virement requise (screenshot ou photo)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 50 * 1024 * 1024) {
        setErrors({ ...errors, proofFile: 'Le fichier ne doit pas dépasser 50MB' });
        return;
      }
      
      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, proofFile: 'Le fichier doit être une image' });
        return;
      }
      
      setFormData({ ...formData, proofFile: file });
      setErrors({ ...errors, proofFile: null });
    }
  };

  const uploadProof = async (file) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    // Upload vers Cloudflare R2 via le worker
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('path', `transfer-proofs/${fileName}`);
    
    const response = await fetch(import.meta.env.VITE_CLOUDFLARE_WORKER_URL + '/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formDataUpload
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'upload du fichier');
    }
    
    const result = await response.json();
    return result.url;
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
      
      // Upload de la preuve
      setUploadProgress(50);
      const proofUrl = await uploadProof(formData.proofFile);
      setUploadProgress(75);
      
      // Créer le paiement en attente
      const { error } = await supabase
        .from('pending_payments')
        .insert({
          user_id: user.id,
          plan_type: selectedPlan,
          amount: amount,
          payment_method: 'bank_transfer',
          transfer_proof_url: proofUrl,
          bank_name: 'Tijari Bank',
          transfer_date: formData.transferDate,
          transfer_reference: formData.transferReference || null,
          account_holder_name: formData.accountHolderName
        });
      
      if (error) throw error;
      
      setUploadProgress(100);
      
      // Notifier les admins
      try {
        console.log('🔔 Envoi notification virement aux admins');
        const pushNotificationService = (await import('../services/pushNotificationService')).default;
        const result = await pushNotificationService.notifyAdmins(
          'pending_payment',
          '💰 Nouveau virement en attente',
          `${formData.accountHolderName} - ${amount} DH`
        );
        console.log('✅ Résultat notification admins:', result);
      } catch (notifError) {
        console.error('❌ Erreur notification admins:', notifError);
      }
      
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        onSuccess();
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting transfer:', error);
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bank-transfer-overlay" onClick={onClose}>
      <div className="bank-transfer-container" onClick={(e) => e.stopPropagation()}>
        <div className="bank-transfer-header">
          <div className="header-content">
            <Building2 size={24} className="header-icon" />
            <h2>Virement bancaire</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="bank-transfer-content">
          {/* Instructions */}
          <div className="info-box">
            <Info size={20} />
            <div>
              <h4>Instructions de virement</h4>
              <p><strong>Bénéficiaire :</strong>Ali Hajjaj</p>
              <p><strong>Banque :</strong> Tijari Bank</p>
              <p><strong>RIB :</strong> 007 640 0006865300406412 27</p>
              <p><strong>Montant :</strong> {amount} DH</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="transfer-form">
            <div className="form-group">
              <label>Nom du titulaire du compte *</label>
              <input
                type="text"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                placeholder="Votre nom complet"
                className={errors.accountHolderName ? 'error' : ''}
              />
              {errors.accountHolderName && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  {errors.accountHolderName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Date du virement *</label>
              <input
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className={errors.transferDate ? 'error' : ''}
              />
              {errors.transferDate && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  {errors.transferDate}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Référence du virement (optionnel)</label>
              <input
                type="text"
                value={formData.transferReference}
                onChange={(e) => setFormData({ ...formData, transferReference: e.target.value })}
                placeholder="Numéro de référence"
              />
            </div>

            <div className="form-group">
              <label>Preuve de virement *</label>
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  id="proof-upload"
                  hidden
                />
                <label htmlFor="proof-upload" className="file-upload-label">
                  {formData.proofFile ? (
                    <>
                      <Check size={24} />
                      <span>{formData.proofFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span>Cliquez pour uploader</span>
                      <span className="file-hint">Screenshot ou photo du reçu</span>
                    </>
                  )}
                </label>
              </div>
              {errors.proofFile && (
                <span className="error-message">
                  <AlertCircle size={14} />
                  {errors.proofFile}
                </span>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}

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
                  <Building2 size={18} />
                  <span>Envoyer la demande</span>
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
        title="Demande envoyée !"
        message="Votre preuve de virement a été envoyée avec succès. Un administrateur validera votre paiement sous peu."
        type="success"
      />
    </div>
  );
};

export default BankTransferForm;
