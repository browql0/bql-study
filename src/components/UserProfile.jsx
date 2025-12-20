import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContextSupabase';
import {
  User, Mail, Shield, Calendar, Edit2, Save, X, Key, LogOut, Gift,
  Crown, CreditCard, Clock, Sparkles, Lock, UserCircle, Hash, Users, Bell, FileText, Image, AlertCircle, RotateCcw, Users as UsersIcon, Home, CheckCircle
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { getStudentInfo } from '../services/studentNameService';
import { supabase } from '../lib/supabase';
import { notificationManager } from '../utils/notificationManager';
import './UserProfile.css';

const UserProfile = ({ onClose, onOpenPayment }) => {
  const { currentUser } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(currentUser.name);

      if (!isEmail) {
        const info = getStudentInfo(currentUser.name);
        setStudentInfo(info);
      } else {
        setStudentInfo(null);
      }
    }
  }, [loadSubscriptionInfo, currentUser?.name]);

  const getPlanName = () => {
    if (!subscription?.last_payment_date) return null;
    const amount = subscription.payment_amount;
    if (amount === 20 || amount === 25) return 'Mensuel';
    if (amount === 50 || amount === 60 || amount === 65) return 'Trimestriel';
    if (amount === 100) return 'Semestre';
    return 'Premium';
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

  return (
    <div className="user-profile-page-container">
      <div className="user-profile-modal">

        {/* 1. Header Bar (Style Bibliothèque/Ressources - CENTRÉ) */}
        <div className="list-header">
          <div className="section-title-wrapper">
            <div className="section-title-icon">
              <User size={28} strokeWidth={2.5} />
            </div>
            <div className="section-title-text">
              <h2 className="section-title">
                <span className="main-title">Mon Profil</span>
                <span className="subtitle">Informations de votre compte</span>
              </h2>
            </div>
          </div>

          {/* NOTE : Le bouton de fermeture/retour est délibérément absent pour maintenir le centrage */}
        </div>

        <div className="profile-modal-body">
          {/* PREMIUM HERO SECTION */}
          <div className="profile-hero-section">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Avatar" />
                ) : (
                  <span className="avatar-initials-large">{getInitials(currentUser?.name)}</span>
                )}
              </div>
            </div>

            <div className="profile-details">
              <h2 className="profile-name">{currentUser?.name || 'Utilisateur'}</h2>
              <div className="profile-email">
                <Mail size={14} />
                {currentUser?.email}
              </div>

              <div className="profile-badges">
                <span className="role-badge">
                  <User size={13} />
                  Étudiant
                </span>
                {subscription?.subscription_status === 'premium' && (
                  <span className="role-badge" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}>
                    <Crown size={13} />
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION SECTION - ULTRA PREMIUM */}
          <div className="subscription-wrapper">
            {(subscription?.subscription_status === 'premium' || subscription?.subscription_status === 'trial') && !isSubscriptionExpired() ? (
              <>
                {/* ACTIVE SUBSCRIPTION - Premium States */}
                {subscription.subscription_status === 'trial' ? (
                  /* TRIAL CARD */
                  <div className="subscription-premium-card trial-card">
                    <div className="card-glow trial-glow"></div>
                    <div className="card-pattern"></div>

                    <div className="card-header">
                      <div className="card-icon trial-icon">
                        <Gift size={28} />
                      </div>
                      <div className="card-title-block">
                        <h3>Essai Gratuit</h3>
                        <p>Découvrez toutes les fonctionnalités</p>
                      </div>
                      <div className="card-badge trial-badge">
                        <Sparkles size={14} />
                        Période d'essai
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="subscription-details">
                        <div className="detail-item">
                          <Calendar size={18} />
                          <span>Expire le <strong>{subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : 'Bientôt'}</strong></span>
                        </div>
                        <div className="detail-item">
                          <Sparkles size={18} />
                          <span>Accès <strong>illimité</strong> pendant l'essai</span>
                        </div>
                      </div>

                      {onOpenPayment && (
                        <button
                          className="card-action-btn trial-btn"
                          onClick={() => {
                            onClose();
                            onOpenPayment();
                          }}
                        >
                          <Crown size={18} />
                          Passer au Premium
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* PREMIUM CARDS - Based on Plan */
                  <div className={`subscription-premium-card ${getPlanName() === 'Mensuel' ? 'monthly-card' :
                    getPlanName() === 'Trimestriel' ? 'quarterly-card' :
                      getPlanName() === 'Semestre' ? 'yearly-card' : 'premium-card'
                    }`}>
                    <div className={`card-glow ${getPlanName() === 'Mensuel' ? 'monthly-glow' :
                      getPlanName() === 'Trimestriel' ? 'quarterly-glow' :
                        getPlanName() === 'Semestre' ? 'yearly-glow' : 'premium-glow'
                      }`}></div>
                    <div className="card-pattern"></div>

                    <div className="card-header">
                      <div className={`card-icon ${getPlanName() === 'Mensuel' ? 'monthly-icon' :
                        getPlanName() === 'Trimestriel' ? 'quarterly-icon' :
                          getPlanName() === 'Semestre' ? 'yearly-icon' : 'premium-icon'
                        }`}>
                        <Crown size={28} />
                      </div>
                      <div className="card-title-block">
                        <h3>{getPlanName() || 'Premium'}</h3>
                        <p>Accès complet à toutes les fonctionnalités</p>
                      </div>
                      <div className={`card-badge ${getPlanName() === 'Mensuel' ? 'monthly-badge' :
                        getPlanName() === 'Trimestriel' ? 'quarterly-badge' :
                          getPlanName() === 'Semestre' ? 'yearly-badge' : 'premium-badge'
                        }`}>
                        <Sparkles size={14} />
                        Actif
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="subscription-details">
                        <div className="detail-item">
                          <Calendar size={18} />
                          <span>Expire le <strong>{subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : 'Illimité'}</strong></span>
                        </div>
                        <div className="detail-item">
                          <CreditCard size={18} />
                          <span>Montant payé: <strong>{subscription.payment_amount || 0} DH</strong></span>
                        </div>
                        {subscription.last_payment_date && (
                          <div className="detail-item">
                            <Clock size={18} />
                            <span>Dernier paiement: <strong>{new Date(subscription.last_payment_date).toLocaleDateString('fr-FR')}</strong></span>
                          </div>
                        )}
                      </div>

                      {onOpenPayment && (
                        <button
                          className={`card-action-btn ${getPlanName() === 'Mensuel' ? 'monthly-btn' :
                            getPlanName() === 'Trimestriel' ? 'quarterly-btn' :
                              getPlanName() === 'Semestre' ? 'yearly-btn' : 'premium-btn'
                            }`}
                          onClick={() => {
                            onClose();
                            onOpenPayment();
                          }}
                        >
                          <RotateCcw size={18} />
                          Renouveler
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* FREE / NO SUBSCRIPTION CARD */
              <div className="subscription-premium-card free-card">
                <div className="card-glow free-glow"></div>
                <div className="card-pattern"></div>

                <div className="card-header">
                  <div className="card-icon free-icon">
                    <Lock size={32} />
                  </div>
                  <div className="card-title-block centered">
                    <h3>Passez au Premium</h3>
                    <p>Débloquez toutes les fonctionnalités et profitez d'une expérience d'apprentissage sans limites</p>
                  </div>
                </div>

                <div className="card-body">
                  <div className="features-list">
                    <div className="feature-item">
                      <CheckCircle size={18} className="check-icon" />
                      <span>Accès à tous les cours</span>
                    </div>
                    <div className="feature-item">
                      <CheckCircle size={18} className="check-icon" />
                      <span>Quiz et exercices illimités</span>
                    </div>
                    <div className="feature-item">
                      <CheckCircle size={18} className="check-icon" />
                      <span>Support prioritaire</span>
                    </div>
                  </div>

                  {onOpenPayment && (
                    <button
                      className="card-action-btn free-btn"
                      onClick={() => {
                        onClose();
                        onOpenPayment();
                      }}
                    >
                      <Crown size={20} />
                      Voir les offres
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>


          {/* INFO GRID SECTION */}
          <div className="profile-info-section">
            <h3 className="info-section-title">
              <User size={20} className="text-primary" />
              Informations détaillées
            </h3>

            <div className="modern-info-grid">
              <div className="modern-info-card">
                <div className="card-icon-wrapper">
                  <Hash size={24} />
                </div>
                <div className="card-content">
                  <span className="card-value">{studentInfo?.matricule || 'Non renseigné'}</span>
                  <span className="card-label">Matricule</span>
                </div>
              </div>

              <div className="modern-info-card">
                <div className="card-icon-wrapper">
                  <UsersIcon size={24} />
                </div>
                <div className="card-content">
                  <span className="card-value">{studentInfo?.groupe || 'Non renseigné'}</span>
                  <span className="card-label">Groupe</span>
                </div>
              </div>

              <div className="modern-info-card">
                <div className="card-icon-wrapper">
                  <UsersIcon size={24} />
                </div>
                <div className="card-content">
                  <span className="card-value">{studentInfo?.sousGroupe || 'Non renseigné'}</span>
                  <span className="card-label">Sous-groupe</span>
                </div>
              </div>


              <div className="modern-info-card">
                <div className="card-icon-wrapper">
                  <Clock size={24} />
                </div>
                <div className="card-content">
                  <span className="card-value">
                    {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', {
                      month: 'short',
                      year: 'numeric'
                    }) : 'Récemment'}
                  </span>
                  <span className="card-label">Membre depuis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;