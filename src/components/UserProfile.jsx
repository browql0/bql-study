import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContextSupabase';
import {
  User, Mail, Shield, Calendar, Edit2, Save, X, Key, LogOut, Gift,
  Crown, CreditCard, Clock, Sparkles, Lock, UserCircle, Hash, Users, Bell, FileText, Image, AlertCircle, RotateCcw, Users as UsersIcon, Home
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
    if (amount === 20) return 'Mensuel';
    if (amount === 50) return 'Trimestriel';
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

          {/* SUBSCRIPTION SECTION */}
          {(subscription?.subscription_status === 'premium' || subscription?.subscription_status === 'trial') && !isSubscriptionExpired() ? (
            <>
              <h3 className="subscription-section-title">
                <Crown size={20} className="text-primary" />
                Abonnement Actif
              </h3>

              <div className={`subscription-card-premium ${subscription.subscription_status === 'trial' ? 'trial' : ''}`}>
                <div className="sub-card-pattern" />

                <div className="sub-card-content">
                  <div className="sub-info">
                    <h3>Votre Plan</h3>
                    <div className="sub-plan-name">
                      {subscription.subscription_status === 'trial' ? 'Essai Gratuit' : (getPlanName() || 'Premium')}
                    </div>
                    <div className="sub-status-badge">
                      <Sparkles size={14} />
                      {subscription.subscription_status === 'trial' ? 'Période d\'essai' : 'Compte Actif'}
                    </div>
                  </div>

                  <div className="sub-icon-wrapper">
                    <Crown size={32} color="white" />
                  </div>
                </div>

                <div className="sub-card-footer">
                  <div>
                    <span className="sub-date-label">Expire le</span>
                    <span className="sub-date-value">
                      {subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Illimité'}
                    </span>
                  </div>

                  {onOpenPayment && (
                    <button
                      className="renew-btn"
                      onClick={() => {
                        onClose();
                        onOpenPayment();
                      }}
                    >
                      Gérer <CreditCard size={14} />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="subscription-expired-card" style={{ margin: '0 24px 32px' }}>
              <div className="expired-icon-wrapper">
                <Lock size={40} />
              </div>
              <h3 className="expired-title">
                Passez au Premium
              </h3>
              <p className="expired-description">
                Débloquez toutes les fonctionnalités et profitez d'une expérience d'apprentissage sans limites.
              </p>
              {onOpenPayment && (
                <button
                  className="subscribe-button"
                  onClick={() => {
                    onClose();
                    onOpenPayment();
                  }}
                >
                  <Crown size={18} />
                  Voir les offres
                </button>
              )}
            </div>
          )}

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