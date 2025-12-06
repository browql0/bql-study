import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Building2, Banknote, Eye, AlertCircle, User, Calendar, Phone, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageModal from './ImageModal';
import ConfirmationModal from './ConfirmationModal';
import './PendingPaymentsPanel.css';

const PendingPaymentsPanel = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState({ title: '', message: '', type: 'success' });

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      // Charger les paiements en attente
      const { data: payments, error: paymentsError } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Charger les profils associés
      if (payments && payments.length > 0) {
        const userIds = payments.map(p => p.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combiner les données
        const paymentsWithProfiles = payments.map(payment => ({
          ...payment,
          profiles: profiles.find(p => p.id === payment.user_id)
        }));

        setPendingPayments(paymentsWithProfiles);
      } else {
        setPendingPayments([]);
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProof = async (proofUrl) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expirée');
        return;
      }
      
      // Extraire le path de l'URL
      const urlParts = proofUrl.split('.r2.dev/');
      const filePath = urlParts.length > 1 ? urlParts[1] : proofUrl;
      
      // Charger via le worker avec auth
      const viewUrl = `${import.meta.env.VITE_CLOUDFLARE_WORKER_URL}/view?path=${encodeURIComponent(filePath)}`;
      
      const response = await fetch(viewUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Impossible de charger l\'image');
      }
      
      // Créer un blob et l'afficher dans le modal
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setCurrentImageUrl(blobUrl);
      setShowImageModal(true);
    } catch (error) {
      console.error('Error viewing proof:', error);
      alert('Erreur lors du chargement de la preuve');
    }
  };

  const handleApprove = async (paymentId) => {
    if (!confirm('Confirmer la validation de ce paiement ?')) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_pending_payment', {
        payment_id: paymentId
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la validation');
      }

      setConfirmationMessage({
        title: 'Paiement validé !',
        message: 'L\'abonnement de l\'utilisateur a été activé avec succès.',
        type: 'success'
      });
      setShowConfirmation(true);
      
      await loadPendingPayments();
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error approving payment:', error);
      setConfirmationMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la validation du paiement',
        type: 'error'
      });
      setShowConfirmation(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (paymentId) => {
    const reason = prompt('Raison du refus (optionnel) :');
    if (reason === null) return; // Annulé

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_pending_payment', {
        payment_id: paymentId,
        rejection_reason: reason || null
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du rejet');
      }

      alert('Paiement rejeté.');
      await loadPendingPayments();
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Erreur : ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatPlanName = (planType) => {
    const plans = {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Semestre'
    };
    return plans[planType] || planType;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="pending-payments-loading">
        <div className="spinner"></div>
        <p>Chargement des paiements...</p>
      </div>
    );
  }

  return (
    <div className="pending-payments-panel">
      <div className="panel-header">
        <div className="header-title">
          <Clock size={24} />
          <h2>Paiements en attente</h2>
        </div>
        <div className="pending-count-badge">
          {pendingPayments.length}
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} />
          <h3>Aucun paiement en attente</h3>
          <p>Tous les paiements ont été traités</p>
        </div>
      ) : (
        <div className="payments-grid">
          {pendingPayments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-card-header">
                <div className="payment-method-badge">
                  {payment.payment_method === 'bank_transfer' ? (
                    <>
                      <Building2 size={16} />
                      <span>Virement</span>
                    </>
                  ) : (
                    <>
                      <Banknote size={16} />
                      <span>Cash</span>
                    </>
                  )}
                </div>
                <span className="payment-date">
                  {formatDate(payment.created_at)}
                </span>
              </div>

              <div className="payment-card-body">
                <div className="payment-user-info">
                  <User size={18} />
                  <div>
                    <span className="user-name">{payment.profiles?.name || 'Utilisateur'}</span>
                    <span className="user-email">{payment.profiles?.email}</span>
                  </div>
                </div>

                <div className="payment-details">
                  <div className="detail-row">
                    <span className="detail-label">Plan</span>
                    <span className="detail-value">{formatPlanName(payment.plan_type)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Montant</span>
                    <span className="detail-value-amount">{payment.amount} DH</span>
                  </div>
                </div>

                {payment.payment_method === 'bank_transfer' && (
                  <div className="transfer-info">
                    <p><strong>Titulaire :</strong> {payment.account_holder_name}</p>
                    <p><strong>Date :</strong> {formatDate(payment.transfer_date)}</p>
                    {payment.transfer_reference && (
                      <p><strong>Référence :</strong> {payment.transfer_reference}</p>
                    )}
                  </div>
                )}

                {payment.payment_method === 'cash' && (
                  <div className="cash-info">
                    <p><Phone size={14} /> {payment.contact_phone}</p>
                    <p><Calendar size={14} /> RDV souhaité : {formatDate(payment.preferred_date)}</p>
                    {payment.notes && (
                      <p className="cash-notes"><FileText size={14} /> {payment.notes}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="payment-card-actions">
                {payment.payment_method === 'bank_transfer' && payment.transfer_proof_url && (
                  <button
                    className="btn-view-proof"
                    onClick={() => handleViewProof(payment.transfer_proof_url)}
                  >
                    <Eye size={16} />
                    Voir la preuve
                  </button>
                )}
                
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(payment.id)}
                  disabled={processing}
                >
                  <CheckCircle size={16} />
                  Valider
                </button>
                
                <button
                  className="btn-reject"
                  onClick={() => handleReject(payment.id)}
                  disabled={processing}
                >
                  <XCircle size={16} />
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={currentImageUrl}
        title="Preuve de virement"
      />
      
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title={confirmationMessage.title}
        message={confirmationMessage.message}
        type={confirmationMessage.type}
      />
    </div>
  );
};

export default PendingPaymentsPanel;
