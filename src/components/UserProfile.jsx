import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { User, Mail, Hash, Users as UsersIcon, Calendar, X, Crown, CreditCard, Clock, Sparkles, Lock, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { getStudentInfo } from '../services/studentNameService';
import { supabase } from '../lib/supabase';
import './UserProfile.css';

const UserProfile = ({ onClose, onOpenPayment }) => {
  const { currentUser } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);

  const loadSubscriptionInfo = useCallback(async () => {
    if (currentUser?.id) {
      const details = await subscriptionService.getSubscriptionDetails(currentUser.id);
      
      if (details && (details.subscription_status === 'trial' || details.subscription_status === 'premium')) {
        if (details.subscription_end_date) {
          const endDate = new Date(details.subscription_end_date);
          const now = new Date();
          const isExpired = endDate <= now;
          
          if (isExpired) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                subscription_status: 'free',
                subscription_end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentUser.id);
            
            if (!updateError) {
              const updatedDetails = await subscriptionService.getSubscriptionDetails(currentUser.id);
              setSubscription(updatedDetails);
              return;
            }
          }
        }
      }
      
      setSubscription(details);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadSubscriptionInfo();
    
    if (currentUser?.name) {
      const info = getStudentInfo(currentUser.name);
      setStudentInfo(info);
    }
  }, [loadSubscriptionInfo, currentUser?.name]);

  const getPlanName = () => {
    if (!subscription?.last_payment_date) return null;
    const amount = subscription.payment_amount;
    if (amount === 20) return 'Mensuel';
    if (amount === 50) return 'Trimestriel';
    if (amount === 100) return 'Semestre';
    return 'Premium';
  };

  const getDaysRemaining = () => {
    if (!subscription?.subscription_end_date) return null;
    return subscriptionService.getDaysRemaining(subscription.subscription_end_date);
  };

  const isSubscriptionExpired = () => {
    if (!subscription) return false;
    if (subscription.subscription_status === 'free') return true;
    if ((subscription.subscription_status === 'trial' || subscription.subscription_status === 'premium') && 
        subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      return endDate <= now;
    }
    return false;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Non renseigné';
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <div className="profile-header-content">
            <User size={24} className="profile-header-icon" />
            <h1>Mon Profil</h1>
          </div>
   
        </div>

        <div className="profile-modal-body">
          {/* Profile Avatar Section */}
          <div className="profile-hero-section">
            <div className="profile-avatar-large">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Avatar" />
              ) : (
                <span className="avatar-initials-large">{getInitials(currentUser?.name)}</span>
              )}
            </div>
            <h2 className="profile-name">{currentUser?.name || 'Utilisateur'}</h2>
            <span className="profile-role-badge">
              <User size={14} />
              Utilisateur
            </span>
          </div>

          {/* Section Abonnement - Toujours affichée */}
          <div className="profile-info-section" style={{ marginTop: '32px' }}>
            <h3 className="section-title">
              <span className="section-number">01</span>
              Statut d'abonnement
            </h3>

            {/* Si abonnement actif (trial ou premium non expiré) */}
            {subscription && (subscription.subscription_status === 'premium' || subscription.subscription_status === 'trial') && 
             subscription.subscription_end_date && 
             new Date(subscription.subscription_end_date) > new Date() ? (
              <>
                {subscription.subscription_status === 'trial' && (
                  <div style={{ 
                    marginBottom: '16px', 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, rgba(79, 143, 240, 0.1) 0%, rgba(90, 159, 255, 0.15) 100%)',
                    borderRadius: '12px', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'start',
                    border: '1px solid rgba(79, 143, 240, 0.2)'
                  }}>
                    <AlertCircle size={20} style={{ color: '#4f8ff0', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: '6px', color: '#1e293b', fontSize: '15px' }}>Période d'essai gratuite</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                        Votre période d'essai de 7 jours se termine bientôt. Abonnez-vous pour continuer à profiter de toutes les fonctionnalités.
                      </p>
                    </div>
                  </div>
                )}

                <div className="profile-info-grid">
                  <div className="profile-info-card">
                    <div className="info-card-header">
                      <CreditCard size={18} className="info-icon" />
                      <span className="info-label">
                        {subscription.subscription_status === 'trial' ? 'ESSAI GRATUIT' : 'PLAN ACTUEL'}
                      </span>
                    </div>
                    <p className="info-value">
                      {subscription.subscription_status === 'trial' ? 'Essai gratuit' : (getPlanName() || 'Premium')}
                    </p>
                  </div>

                  {subscription.subscription_end_date && (
                    <div className="profile-info-card">
                      <div className="info-card-header">
                        <Clock size={18} className="info-icon" />
                        <span className="info-label">
                          {subscription.subscription_status === 'trial' ? 'EXPIRE LE' : 'EXPIRE LE'}
                        </span>
                      </div>
                      <p className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>
                          {new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        {getDaysRemaining() !== null && (
                          <span style={{ 
                            padding: '4px 12px', 
                            background: getDaysRemaining() <= 3 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'linear-gradient(135deg, #4f8ff0 0%, #5a9fff 100%)',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            boxShadow: getDaysRemaining() <= 3 ? '0 2px 8px rgba(251, 191, 36, 0.3)' : '0 2px 8px rgba(79, 143, 240, 0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            {getDaysRemaining()} jour{getDaysRemaining() > 1 ? 's' : ''} restant{getDaysRemaining() > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {(subscription?.subscription_status === 'trial' || (subscription?.subscription_status === 'premium' && getDaysRemaining() !== null && getDaysRemaining() <= 1 && getDaysRemaining() > 0)) && onOpenPayment && (
                  <button 
                    style={{
                      width: '100%',
                      marginTop: '-12px', // Negative margin to pull button closer to cards
                      padding: '16px',
                      background: 'linear-gradient(135deg, #4f8ff0 0%, #5a9fff 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(79, 143, 240, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                      onClose();
                      onOpenPayment();
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 143, 240, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(79, 143, 240, 0.4)';
                    }}
                  >
                    <Crown size={20} />
                    {subscription?.subscription_status === 'trial' ? "S'abonner maintenant" : "Renouveler l'abonnement"}
                  </button>
                )}
              </>
            ) : (
              /* Si pas d'abonnement ou expiré */
              <div style={{
                padding: '32px',
                textAlign: 'center',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '16px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 20px',
                  background: '#fee2e2',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={40} style={{ color: '#dc2626' }} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>
                  Aucun abonnement actif
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
                  Abonnez-vous maintenant pour profiter de toutes les fonctionnalités premium de l'application.
                </p>
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <p style={{ margin: '8px 0', fontSize: '14px', color: '#1e293b' }}>✨ Accès illimité à tout le contenu</p>
                  <p style={{ margin: '8px 0', fontSize: '14px', color: '#1e293b' }}>📚 Notes, Quiz, Photos et Fichiers</p>
                  <p style={{ margin: '8px 0', fontSize: '14px', color: '#1e293b' }}>🎓 Support prioritaire</p>
                </div>
                {onOpenPayment && (
                  <button 
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #4f8ff0 0%, #5a9fff 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      onClose();
                      onOpenPayment();
                    }}
                  >
                    <Crown size={18} />
                    S'abonner maintenant
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Information Cards */}
          <div className="profile-info-section">
            <h3 className="section-title">
              <span className="section-number">02</span>
              Informations personnelles
            </h3>

            <div className="profile-info-grid">
              <div className="profile-info-card">
                <div className="info-card-header">
                  <User size={18} className="info-icon" />
                  <span className="info-label">NOM COMPLET</span>
                </div>
                <p className="info-value">{currentUser?.name || 'Non renseigné'}</p>
              </div>

              <div className="profile-info-card">
                <div className="info-card-header">
                  <Mail size={18} className="info-icon" />
                  <span className="info-label">EMAIL</span>
                </div>
                <p className="info-value">{currentUser?.email}</p>
              </div>

              <div className="profile-info-card">
                <div className="info-card-header">
                  <Hash size={18} className="info-icon" />
                  <span className="info-label">MATRICULE</span>
                </div>
                <p className="info-value">{studentInfo?.matricule || 'Non disponible'}</p>
              </div>

              <div className="profile-info-card">
                <div className="info-card-header">
                  <UsersIcon size={18} className="info-icon" />
                  <span className="info-label">GROUPE</span>
                </div>
                <p className="info-value">{studentInfo?.groupe || 'Non disponible'}</p>
              </div>

              <div className="profile-info-card">
                <div className="info-card-header">
                  <UsersIcon size={18} className="info-icon" />
                  <span className="info-label">SOUS-GROUPE</span>
                </div>
                <p className="info-value">{studentInfo?.sousGroupe || 'Non disponible'}</p>
              </div>

              <div className="profile-info-card">
                <div className="info-card-header">
                  <Calendar size={18} className="info-icon" />
                  <span className="info-label">MEMBRE DEPUIS</span>
                </div>
                <p className="info-value">
                  {new Date().toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
