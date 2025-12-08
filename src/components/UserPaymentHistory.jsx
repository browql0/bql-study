import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContextSupabase';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import './UserPaymentHistory.css';

const UserPaymentHistory = () => {
  const { currentUser } = useApp();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      loadPayments();
    }
  }, [currentUser]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      // Récupérer TOUS les paiements en ligne (CMI) - tous les statuts
      const { data: onlinePayments, error: onlineError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (onlineError) {
        console.error('Erreur chargement paiements en ligne:', onlineError);
      }

      // Récupérer TOUS les paiements manuels (virement/cash) - tous les statuts
      const { data: manualPayments, error: manualError } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (manualError) {
        console.error('Erreur chargement paiements manuels:', manualError);
      }

      // Normaliser et combiner les paiements
      const normalizedOnline = (onlinePayments || []).map(p => ({
        ...p,
        source: 'online',
        payment_method: 'cmi',
        payment_method_detail: 'Paiement en ligne',
        // Normaliser le statut
        status: p.status === 'success' ? 'completed' : p.status
      }));

      const normalizedManual = (manualPayments || []).map(p => {
        // Mapper les statuts des paiements manuels
        let mappedStatus = p.status;
        if (p.status === 'approved') {
          mappedStatus = 'completed';
        } else if (p.status === 'rejected' || p.status === 'refused') {
          mappedStatus = 'failed';
        }
        // 'pending' reste 'pending'

        return {
          id: p.id,
          user_id: p.user_id,
          amount: p.amount,
          currency: 'MAD',
          plan_type: p.plan_type,
          status: mappedStatus,
          payment_method: p.payment_method || 'manual',
          created_at: p.created_at || p.approved_at || p.rejected_at,
          reference_number: p.transfer_reference || p.id.toString(),
          source: 'manual',
          // Informations supplémentaires pour les paiements manuels
          payment_method_detail: p.payment_method === 'bank_transfer' ? 'Virement bancaire' : 
                                p.payment_method === 'cash' ? 'Espèces' : 'Manuel',
          original_status: p.status // Garder le statut original pour référence
        };
      });

      // Combiner et trier par date
      const allPayments = [...normalizedOnline, ...normalizedManual].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setPayments(allPayments);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="status-icon success" />;
      case 'pending':
        return <Clock size={20} className="status-icon pending" />;
      case 'cancelled':
      case 'failed':
      case 'rejected':
      case 'refused':
        return <XCircle size={20} className="status-icon error" />;
      default:
        return <Clock size={20} className="status-icon" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Confirmé';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      case 'failed': return 'Refusé';
      case 'rejected': return 'Refusé';
      case 'refused': return 'Refusé';
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-success';
      case 'pending': return 'status-pending';
      case 'cancelled':
      case 'failed':
      case 'rejected':
      case 'refused': return 'status-error';
      default: return '';
    }
  };

  const getPlanName = (planType) => {
    switch (planType) {
      case 'monthly': return 'Mensuel';
      case 'annual': return 'Annuel';
      default: return planType || 'N/A';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => ['failed', 'cancelled', 'rejected', 'refused'].includes(p.status)).length,
    totalAmount: payments
      .filter(p => p.status === 'completed') // Seulement les paiements acceptés/confirmés
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  };

  if (loading) {
    return (
      <div className="user-payment-history-container">
        <div className="loading-spinner">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="user-payment-history-container">
      {/* Header Bar */}
      <div className="list-header">
        <div className="section-title-wrapper">
          <div className="section-title-icon">
            <CreditCard size={28} strokeWidth={2.5} />
          </div>
          <div className="section-title-text">
            <h2 className="section-title">
              <span className="main-title">Historique des Paiements</span>
              <span className="subtitle">{payments.length} transaction{payments.length > 1 ? 's' : ''} enregistrée{payments.length > 1 ? 's' : ''}</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="payment-stats">
        <div className="stat-card-payment">
          <div className="stat-icon-payment total">
            <CreditCard size={20} />
          </div>
          <div className="stat-content-payment">
            <span className="stat-value-payment">{stats.total}</span>
            <span className="stat-label-payment">Total</span>
          </div>
        </div>
        <div className="stat-card-payment">
          <div className="stat-icon-payment success">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content-payment">
            <span className="stat-value-payment">{stats.completed}</span>
            <span className="stat-label-payment">Confirmés</span>
          </div>
        </div>
        <div className="stat-card-payment">
          <div className="stat-icon-payment pending">
            <Clock size={20} />
          </div>
          <div className="stat-content-payment">
            <span className="stat-value-payment">{stats.pending}</span>
            <span className="stat-label-payment">En attente</span>
          </div>
        </div>
        <div className="stat-card-payment">
          <div className="stat-icon-payment error">
            <XCircle size={20} />
          </div>
          <div className="stat-content-payment">
            <span className="stat-value-payment">{stats.failed}</span>
            <span className="stat-label-payment">Refusés</span>
          </div>
        </div>
        <div className="stat-card-payment highlight">
          <div className="stat-icon-payment amount">
            <CreditCard size={20} />
          </div>
          <div className="stat-content-payment">
            <span className="stat-value-payment">{stats.totalAmount.toFixed(2)} MAD</span>
            <span className="stat-label-payment">Total Dépense</span>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="no-payments">
          <div className="empty-icon-payment">
            <CreditCard size={64} />
          </div>
          <h3>Aucun paiement</h3>
          <p>Vos transactions apparaîtront ici</p>
        </div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id} className={`payment-row ${getStatusClass(payment.status)}`}>
                  <td data-label="Date">
                    <div className="table-cell-date">
                      <Calendar size={16} />
                      {formatDate(payment.created_at)}
                    </div>
                  </td>
                  <td data-label="Plan">
                    <span className="plan-badge">{getPlanName(payment.plan_type)}</span>
                  </td>
                  <td data-label="Montant">
                    <span className="amount-text">
                      {payment.amount} {payment.currency?.toUpperCase() || 'MAD'}
                      {payment.source === 'manual' && payment.payment_method_detail && (
                        <span className="payment-method-hint"> ({payment.payment_method_detail})</span>
                      )}
                    </span>
                  </td>
                  <td data-label="Statut">
                    <div className="status-badge-container">
                      {getStatusIcon(payment.status)}
                      <span className={`status-badge ${getStatusClass(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                  </td>
                  <td data-label="Référence">
                    <span className="ref-text">{payment.reference_number || payment.transaction_id || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserPaymentHistory;
