import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import './PaymentCheckout.css';

const PaymentCheckout = () => {
  const [searchParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params;
  });
  const [status, setStatus] = useState('loading'); // loading, success, error, processing
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const statusParam = searchParams.get('status');
    const transactionId = searchParams.get('transaction_id');

    if (!paymentId) {
      setStatus('error');
      setMessage('ID de paiement manquant');
      return;
    }

    handlePaymentReturn(paymentId, statusParam, transactionId);
  }, [searchParams]);

  const handlePaymentReturn = async (paymentId, statusParam, transactionId) => {
    try {
      setStatus('processing');

      // Vérifier le statut du paiement
      const result = await paymentService.checkPaymentStatus(paymentId);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la vérification du paiement');
      }

      const paymentData = result.payment;

      // Si le paiement est déjà confirmé
      if (paymentData.status === 'completed') {
        setStatus('success');
        setPayment(paymentData);
        setMessage('Paiement confirmé avec succès !');
        
        // Rediriger vers l'accueil après 3 secondes
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      // Si le paiement est en attente, attendre la confirmation du webhook
      if (paymentData.status === 'pending') {
        setStatus('processing');
        setMessage('Vérification du paiement en cours...');
        
        // Polling pour vérifier le statut (en attendant le webhook)
        const checkInterval = setInterval(async () => {
          const checkResult = await paymentService.checkPaymentStatus(paymentId);
          if (checkResult.success && checkResult.payment.status !== 'pending') {
            clearInterval(checkInterval);
            if (checkResult.payment.status === 'completed') {
              setStatus('success');
              setPayment(checkResult.payment);
              setMessage('Paiement confirmé avec succès !');
              setTimeout(() => navigate('/'), 3000);
            } else if (checkResult.payment.status === 'failed') {
              clearInterval(checkInterval);
              setStatus('error');
              setMessage('Le paiement a échoué ou a été annulé.');
            }
          }
        }, 2000);

        // Arrêter le polling après 30 secondes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (status === 'processing') {
            setStatus('error');
            setMessage('Délai d\'attente dépassé. Si votre paiement a été effectué, il sera traité sous peu.');
          }
        }, 30000);
      } else if (paymentData.status === 'failed') {
        setStatus('error');
        setMessage('Le paiement a échoué. Veuillez réessayer.');
      } else {
        setStatus('error');
        setMessage('Statut de paiement inattendu.');
      }
    } catch (error) {
      console.error('Error handling payment return:', error);
      setStatus('error');
      setMessage(error.message || 'Une erreur est survenue lors du traitement du paiement.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
      case 'processing':
        return (
          <div className="payment-checkout-content">
            <Loader className="payment-checkout-icon spinner" size={48} />
            <h2>{status === 'loading' ? 'Chargement...' : 'Vérification du paiement'}</h2>
            <p>{message || 'Veuillez patienter...'}</p>
          </div>
        );

      case 'success':
        return (
          <div className="payment-checkout-content">
            <CheckCircle className="payment-checkout-icon success" size={64} />
            <h2>Paiement réussi !</h2>
            <p>{message}</p>
            {payment && (
              <div className="payment-details">
                <p><strong>Montant:</strong> {payment.amount} {payment.currency}</p>
                <p><strong>Transaction ID:</strong> {payment.transaction_id || 'En attente'}</p>
              </div>
            )}
            <p className="payment-redirect-message">Redirection en cours...</p>
          </div>
        );

      case 'error':
        return (
          <div className="payment-checkout-content">
            <XCircle className="payment-checkout-icon error" size={64} />
            <h2>Erreur de paiement</h2>
            <p>{message}</p>
            <div className="payment-actions">
              <button onClick={() => window.location.href = '/'} className="payment-btn-primary">
                Retour à l'accueil
              </button>
              <button onClick={() => window.location.reload()} className="payment-btn-secondary">
                Réessayer
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="payment-checkout-container">
      <div className="payment-checkout-card">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentCheckout;

