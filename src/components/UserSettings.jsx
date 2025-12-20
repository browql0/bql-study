import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContextSupabase';
import {
  CreditCard, LogOut, Moon, Sun, Bell, FileText, Image, Sparkles,
  AlertTriangle, CheckCircle, Settings, Crown, Calendar,
  Clock, RotateCcw, Lock, Gift
} from 'lucide-react';
import { notificationManager } from '../utils/notificationManager';
import { subscriptionService } from '../services/subscriptionService';
import './UserSettings.css';

const UserSettings = ({ onOpenPayment }) => {
  const { currentUser, theme, toggleTheme } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [pushNotificationStatus, setPushNotificationStatus] = useState('default');
  const [notifError, setNotifError] = useState('');
  const [notifConfirmation, setNotifConfirmation] = useState('');

  const [notificationPreferences, setNotificationPreferences] = useState({
    new_files: true,
    new_photos: true,
    new_notes: true,
    new_quiz: true,
    trial_expiry: true,
    subscription_expiry: true,
    custom_admin: true,
    new_users: false,
    new_payments: false,
    voucher_expired: false
  });

  // --- SUBSCRIPTION LOGIC ---
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
  }, [loadSubscriptionInfo]);

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

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    try {
      try {
        const { deviceService } = await import('../services/deviceService');
        await deviceService.deactivateCurrentDevice();
      } catch (deviceError) {
        console.warn('Erreur lors de la désactivation de l\'appareil:', deviceError);
      }

      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // --- PREFERENCES LOGIC ---
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (!currentUser?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', currentUser.id)
          .single();

        if (!error && data?.notification_preferences) {
          setNotificationPreferences({
            new_files: data.notification_preferences.new_files ?? true,
            new_photos: data.notification_preferences.new_photos ?? true,
            new_notes: data.notification_preferences.new_notes ?? true,
            new_quiz: data.notification_preferences.new_quiz ?? true,
            trial_expiry: data.notification_preferences.trial_expiry ?? true,
            subscription_expiry: data.notification_preferences.subscription_expiry ?? true,
            custom_admin: data.notification_preferences.custom_admin ?? true,
            new_users: data.notification_preferences.new_users ?? false,
            new_payments: data.notification_preferences.new_payments ?? false,
            voucher_expired: data.notification_preferences.voucher_expired ?? false
          });
        }
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
      }
    };

    loadNotificationPreferences();
    checkPushNotificationStatus();
  }, [currentUser?.id]);

  const checkPushNotificationStatus = () => {
    const status = notificationManager.getPermissionStatus();
    setPushNotificationStatus(status);
  };

  const handleSaveNotificationPreferences = async (prefs) => {
    if (!currentUser?.id) return;

    setLoadingPreferences(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: prefs })
        .eq('id', currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleRequestPushPermission = async () => {
    setNotifError('');
    setNotifConfirmation('');

    try {
      const currentStatus = notificationManager.getPermissionStatus();
      if (currentStatus === 'unsupported') {
        setNotifError('Les notifications ne sont pas supportées par votre navigateur');
        return;
      }
      if (currentStatus === 'denied') {
        setNotifError('Les notifications ont été bloquées. Veuillez les autoriser dans les paramètres de votre navigateur');
        return;
      }
      if (currentStatus === 'granted') {
        try {
          const subscription = await notificationManager.subscribeToPush();
          if (subscription) {
            setNotifConfirmation('✅ Notifications push activées avec succès !');
            setTimeout(() => setNotifConfirmation(''), 5000);
            checkPushNotificationStatus();
          }
        } catch (pushError) {
          setNotifError('Erreur lors de l\'abonnement aux notifications push');
        }
        return;
      }

      const success = await notificationManager.requestPermission();
      if (!success) {
        setNotifError('Permission refusée. Veuillez autoriser les notifications');
        checkPushNotificationStatus();
        return;
      }

      try {
        const subscription = await notificationManager.subscribeToPush();
        if (subscription) {
          setNotifConfirmation('✅ Notifications push activées avec succès !');
          setTimeout(() => setNotifConfirmation(''), 5000);
          checkPushNotificationStatus();

          await notificationManager.sendLocalNotification(
            '🔔 Notifications activées',
            'Vous recevrez désormais les notifications de l\'application'
          );
        }
      } catch (pushError) {
        console.error('Erreur abonnement push:', pushError);
        setNotifError('Erreur lors de l\'abonnement aux notifications push. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur demande permission:', error);
      setNotifError('Erreur lors de la demande de permission');
    }
  };

  return (
    <div className="user-settings-container">
      {/* Header Bar */}
      <div className="list-header">
        <div className="section-title-wrapper">
          <div className="section-title-icon">
            <Settings size={28} strokeWidth={2.5} />
          </div>
          <div className="section-title-text">
            <h2 className="section-title">
              <span className="main-title">Paramètres</span>
              <span className="subtitle">Gérez vos préférences et votre compte</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="settings-content">
        {/* === ABONNEMENT SECTION (PREMIUM UI) === */}
        <div className="settings-section">
          {/* We remove the section header here because the cards themselves are self-contained and impactful */}
          <div className="subscription-wrapper full-width">
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
                          onClick={onOpenPayment}
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
                          onClick={onOpenPayment}
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
                      onClick={onOpenPayment}
                    >
                      <Crown size={20} />
                      Voir les offres
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === APPARENCE SECTION (Visual Cards) === */}
        <div className="settings-section">
          <div className="section-header">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            <h2>Apparence</h2>
          </div>

          <div className="settings-card premium-settings-card">
            <div className="setting-item">
              <div className="setting-label full-width">
                <span>Thème de l'application</span>
                <span className="setting-description">
                  Personnalisez l'apparence de l'interface selon vos préférences
                </span>

                <div className="theme-selection-grid">
                  {/* Light Mode Card */}
                  <button
                    className={`theme-card light ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    <div className="theme-preview light-preview">
                      <div className="preview-header"></div>
                      <div className="preview-body">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                      <div className="active-badge">
                        <CheckCircle size={16} fill="currentColor" />
                      </div>
                    </div>
                    <div className="theme-info">
                      <Sun size={20} />
                      <span>Mode Clair</span>
                    </div>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    className={`theme-card dark ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    <div className="theme-preview dark-preview">
                      <div className="preview-header"></div>
                      <div className="preview-body">
                        <div className="preview-line"></div>
                        <div className="preview-line short"></div>
                      </div>
                      <div className="active-badge">
                        <CheckCircle size={16} fill="currentColor" />
                      </div>
                    </div>
                    <div className="theme-info">
                      <Moon size={20} />
                      <span>Mode Sombre</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === NOTIFICATIONS SECTION === */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>

          <div className="settings-card premium-settings-card">
            {/* Push Permission Banner - Sleek Design */}
            <div className="push-permission-banner">
              <div className="banner-icon">
                <Bell size={20} />
                <span className="pulse-dot"></span>
              </div>
              <div className="banner-content">
                <h4>Notifications Push</h4>
                <p>Restez informé même quand l'application est fermée</p>
              </div>
              <div className="banner-action">
                {pushNotificationStatus === 'granted' ? (
                  <span className="status-badge granted">
                    <CheckCircle size={14} /> Activées
                  </span>
                ) : pushNotificationStatus === 'denied' ? (
                  <span className="status-badge denied">
                    <AlertTriangle size={14} /> Bloquées
                  </span>
                ) : (
                  <button className="banner-btn" onClick={handleRequestPushPermission}>
                    Activer
                  </button>
                )}
              </div>
            </div>

            {notifError && (
              <div className="notification-message error">
                <AlertTriangle size={16} />
                {notifError}
              </div>
            )}

            {notifConfirmation && (
              <div className="notification-message success">
                <CheckCircle size={16} />
                {notifConfirmation}
              </div>
            )}

            {/* Notification Groups */}
            <div className="notification-groups">
              {/* Group: Activité */}
              <div className="notification-group">
                <h4 className="group-title">Activité et Contenu</h4>
                <div className="group-items">
                  {[
                    { id: 'new_files', icon: FileText, label: 'Nouveaux fichiers', desc: 'Quand un fichier est ajouté', color: 'blue' },
                    { id: 'new_photos', icon: Image, label: 'Nouvelles photos', desc: 'Quand une photo est publiée', color: 'purple' },
                    { id: 'new_notes', icon: FileText, label: 'Nouvelles notes', desc: 'Quand une note est créée', color: 'indigo' },
                    { id: 'new_quiz', icon: Sparkles, label: 'Nouveaux quiz', desc: 'Quand un quiz est disponible', color: 'amber' }
                  ].map((pref) => (
                    <div key={pref.id} className="notification-item">
                      <div className={`item-icon ${pref.color}`}>
                        <pref.icon size={18} />
                      </div>
                      <div className="item-info">
                        <span className="item-label">{pref.label}</span>
                        <span className="item-desc">{pref.desc}</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.id] ?? true}
                          onChange={(e) => {
                            const newPrefs = { ...notificationPreferences, [pref.id]: e.target.checked };
                            setNotificationPreferences(newPrefs);
                            handleSaveNotificationPreferences(newPrefs);
                          }}
                          disabled={loadingPreferences}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group-divider"></div>

              {/* Group: Système */}
              <div className="notification-group">
                <h4 className="group-title">Système et Compte</h4>
                <div className="group-items">
                  {[
                    { id: 'subscription_expiry', icon: Clock, label: 'Expiration abonnement', desc: 'Rappels avant expiration', color: 'red' },
                    { id: 'trial_expiry', icon: Gift, label: 'Fin d\'essai', desc: 'Alertes fin de période d\'essai', color: 'orange' },
                    { id: 'custom_admin', icon: Lock, label: 'Messages Admin', desc: 'Annonces importantes', color: 'slate' }
                  ].map((pref) => (
                    <div key={pref.id} className="notification-item">
                      <div className={`item-icon ${pref.color}`}>
                        <pref.icon size={18} />
                      </div>
                      <div className="item-info">
                        <span className="item-label">{pref.label}</span>
                        <span className="item-desc">{pref.desc}</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.id] ?? true}
                          onChange={(e) => {
                            const newPrefs = { ...notificationPreferences, [pref.id]: e.target.checked };
                            setNotificationPreferences(newPrefs);
                            handleSaveNotificationPreferences(newPrefs);
                          }}
                          disabled={loadingPreferences}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === SESSION / DANGER ZONE === */}
        <div className="settings-section">
          <div className="session-card">
            <div className="session-info">
              <div className="session-icon">
                <LogOut size={24} />
              </div>
              <div className="session-text">
                <h3>Déconnexion</h3>
                <p>Vous êtes actuellement connecté. Souhaitez-vous fermer votre session ?</p>
              </div>
            </div>
            <button className="session-logout-btn" onClick={handleLogout}>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

};

export default UserSettings;