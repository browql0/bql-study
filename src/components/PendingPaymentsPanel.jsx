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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPaymentId, setRejectPaymentId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

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
        setConfirmationMessage({
          title: 'Session expirée',
          message: 'Veuillez vous reconnecter',
          type: 'error'
        });
        setShowConfirmation(true);
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
      setConfirmationMessage({
        title: 'Erreur',
        message: 'Erreur lors du chargement de la preuve',
        type: 'error'
      });
      setShowConfirmation(true);
    }
  };

  const handleApprove = async (paymentId) => {
    setProcessing(true);
    try {
      // Récupérer les infos du paiement avant validation
      const payment = pendingPayments.find(p => p.id === paymentId);

      // 1. Appeler le RPC pour valider dans la table pending_payments
      const { data, error } = await supabase.rpc('approve_pending_payment', {
        payment_id: paymentId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur lors de la validation');

      // 2. Mettre à jour manuellement le profil pour garantir que total_spent est correct
      // (Au cas où le RPC ne le ferait pas ou mal)
      if (payment?.user_id) {
        try {
          // Fetch current stats
          const { data: userProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('total_spent, total_payments')
            .eq('id', payment.user_id)
            .single();

          if (!fetchError && userProfile) {
            const currentSpent = userProfile.total_spent || 0;
            const currentPayments = userProfile.total_payments || 0;
            const newSpent = currentSpent + (payment.amount || 0);

            // Calculate subscription duration
            const durationMap = {
              monthly: 1,
              quarterly: 3,
              yearly: 6
            };
            const months = durationMap[payment.plan_type] || 1;

            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + months);

            await supabase.from('profiles').update({
              total_spent: newSpent,
              total_payments: currentPayments + 1,
              payment_amount: payment.amount, // Update last payment amount
              last_payment_date: new Date().toISOString(),
              // Grant Premium Access
              subscription_status: 'premium',
              plan_type: payment.plan_type,
              subscription_end_date: endDate.toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', payment.user_id);
          }
        } catch (updateErr) {
          console.error('Erreur mise à jour profil (total_spent):', updateErr);
          // Non-blocking, we continue
        }
      }

      // Notifier l'utilisateur
      if (payment?.user_id) {
        try {
          console.log('🔔 Envoi notification d\'approbation à:', payment.user_id);
          const pushNotificationService = (await import('../services/pushNotificationService')).default;
          const result = await pushNotificationService.notifyUser(
            payment.user_id,
            '✅ Paiement validé',
            `Votre paiement de ${payment.amount} DH a été approuvé. Votre abonnement est maintenant actif !`
          );
          console.log('✅ Résultat notification approbation:', result);
        } catch (notifError) {
          console.error('❌ Erreur notification approbation:', notifError);
        }
      } else {
        console.warn('⚠️ Impossible de notifier: payment.user_id manquant', payment);
      }

      setConfirmationMessage({
        title: 'Paiement validé !',
        message: 'L\'abonnement de l\'utilisateur a été activé et le montant ajouté au total.',
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
    setRejectPaymentId(paymentId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectPaymentId) return;

    setProcessing(true);
    setShowRejectModal(false);

    try {
      // Récupérer les infos du paiement avant rejet
      const payment = pendingPayments.find(p => p.id === rejectPaymentId);

      const { data, error } = await supabase.rpc('reject_pending_payment', {
        payment_id: rejectPaymentId,
        rejection_reason: rejectReason || null
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du rejet');
      }

      // Notifier l'utilisateur
      if (payment?.user_id) {
        try {
          console.log('🔔 Envoi notification de rejet à:', payment.user_id);
          const pushNotificationService = (await import('../services/pushNotificationService')).default;
          const reasonMsg = rejectReason ? `\nRaison: ${rejectReason}` : '';
          const result = await pushNotificationService.notifyUser(
            payment.user_id,
            '❌ Paiement rejeté',
            `Votre demande de paiement de ${payment.amount} DH a été refusée.${reasonMsg}`
          );
          console.log('✅ Résultat notification rejet:', result);
        } catch (notifError) {
          console.error('❌ Erreur notification rejet:', notifError);
        }
      } else {
        console.warn('⚠️ Impossible de notifier: payment.user_id manquant', payment);
      }

      setConfirmationMessage({
        title: 'Paiement rejeté',
        message: 'Le paiement a été rejeté avec succès.',
        type: 'success'
      });
      setShowConfirmation(true);

      await loadPendingPayments();
      setSelectedPayment(null);
      setRejectPaymentId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      setConfirmationMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors du rejet du paiement',
        type: 'error'
      });
      setShowConfirmation(true);
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
      <div className="loading-wrapper fade-in">
        <div className="spinner"></div>
        <p style={{ marginTop: 20 }}>Chargement des paiements...</p>
      </div>
    );
  }

  return (
    <div className="pending-payments-panel fade-in">
      <div className="panel-header">
        <div className="header-title">
          <div className="header-title-icon">
            <Clock size={28} />
          </div>
          <h2>Paiements en attente</h2>
        </div>
        <div className="pending-count-badge">
          {pendingPayments.length}
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="empty-wrapper fade-in">
          <div className="empty-icon-wrapper">
            <CheckCircle size={40} />
          </div>
          <h3 className="empty-title">Tout est à jour !</h3>
          <p className="empty-desc">Aucun paiement en attente de validation pour le moment.</p>
        </div>
      ) : (
        <div className="payments-grid">
          {pendingPayments.map((payment) => {
            const userName = payment.profiles?.name || 'Utilisateur';
            const userInitial = userName.charAt(0).toUpperCase();

            return (
              <div key={payment.id} className="payment-card-premium">
                <div className="payment-card-header">
                  <div className={`payment-method-badge ${payment.payment_method === 'bank_transfer' ? 'transfer' : 'cash'}`}>
                    {payment.payment_method === 'bank_transfer' ? (
                      <>
                        <Building2 size={14} /> Virement
                      </>
                    ) : (
                      <>
                        <Banknote size={14} /> Cash
                      </>
                    )}
                  </div>
                  <span className="payment-date">
                    {formatDate(payment.created_at)}
                  </span>
                </div>

                <div className="payment-card-body">
                  <div className="payment-user-section">
                    <div className="user-avatar-placeholder">
                      {userInitial}
                    </div>
                    <div className="user-info-text">
                      <span className="user-name">{userName}</span>
                      <span className="user-email">{payment.profiles?.email}</span>
                    </div>
                  </div>

                  <div className="payment-info-grid">
                    <div className="info-item">
                      <span className="info-label">Plan Choisi</span>
                      <span className="info-value">{formatPlanName(payment.plan_type)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Montant</span>
                      <span className="info-value amount-value">{payment.amount} DH</span>
                    </div>
                  </div>

                  {payment.payment_method === 'bank_transfer' && (
                    <div className="additional-info-box">
                      <div className="info-row">
                        <User size={14} />
                        <span>Titulaire: <strong>{payment.account_holder_name}</strong></span>
                      </div>
                      <div className="info-row">
                        <FileText size={14} />
                        <span>Réf: <strong>{payment.transfer_reference || 'N/A'}</strong></span>
                      </div>
                    </div>
                  )}

                  {payment.payment_method === 'cash' && (
                    <div className="additional-info-box">
                      <div className="info-row">
                        <Phone size={14} />
                        <span>{payment.contact_phone}</span>
                      </div>
                      <div className="info-row">
                        <Calendar size={14} />
                        <span>RDV: {formatDate(payment.preferred_date)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="payment-card-footer">
                  {payment.payment_method === 'bank_transfer' && payment.transfer_proof_url && (
                    <button
                      className="action-btn btn-proof tooltip"
                      data-tooltip="Voir la preuve"
                      onClick={() => handleViewProof(payment.transfer_proof_url)}
                    >
                      <Eye size={18} />
                    </button>
                  )}

                  <button
                    className="action-btn btn-approve"
                    onClick={() => handleApprove(payment.id)}
                    disabled={processing}
                  >
                    <CheckCircle size={18} />
                    Valider
                  </button>

                  <button
                    className="action-btn btn-reject"
                    onClick={() => handleReject(payment.id)}
                    disabled={processing}
                  >
                    <XCircle size={18} />
                    Rejeter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={currentImageUrl}
        title="Preuve de virement"
      />

      {showRejectModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowRejectModal(false)}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reject-modal-header">
              <XCircle size={24} />
              <h3>Rejeter le paiement</h3>
            </div>
            <div className="reject-modal-body">
              <label htmlFor="reject-reason">Raison du refus (optionnel) :</label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi ce paiement est rejeté..."
                rows={4}
                autoFocus
              />
            </div>
            <div className="reject-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectPaymentId(null);
                  setRejectReason('');
                }}
                disabled={processing}
              >
                Annuler
              </button>
              <button
                className="btn-confirm-reject"
                onClick={confirmReject}
                disabled={processing}
              >
                {processing ? 'Rejet en cours...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

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
