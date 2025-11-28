import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { 
  User, Mail, Shield, Calendar, Edit2, Save, X, Key, LogOut, 
  Crown, CreditCard, Clock, Sparkles, Lock, UserCircle, Hash, Users, Bell, FileText, Image, AlertCircle, RotateCcw
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { getStudentInfo } from '../services/studentNameService';
import { supabase } from '../lib/supabase';
import './Profile.css';

const Profile = ({ onClose, onOpenPayment, onRefreshSubscription }) => {
  const { currentUser, logout, updateProfile, changePassword } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [formData, setFormData] = useState({
    username: currentUser?.email?.split('@')[0] || '',
    name: currentUser?.name || ''
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [studentInfo, setStudentInfo] = useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    new_files: true,
    new_photos: true,
    new_users: false,
    new_payments: false,
    voucher_expired: false
  });
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  const loadSubscriptionInfo = useCallback(async () => {
    if (currentUser?.id) {
      const details = await subscriptionService.getSubscriptionDetails(currentUser.id);
      setSubscription(details);
    }
  }, [currentUser?.id]);

  const handleSaveNotificationPreferences = useCallback(async (preferences) => {
    if (!currentUser?.id) return;
    
    setLoadingPreferences(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', currentUser.id);

      if (error) throw error;
    } catch (error) {
      alert('Erreur lors de la sauvegarde des préférences');
    } finally {
      setLoadingPreferences(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadSubscriptionInfo();
    
    if (currentUser?.name) {
      const info = getStudentInfo(currentUser.name);
      setStudentInfo(info);
    }

    // Charger les préférences de notification
    const loadNotificationPreferences = async () => {
      if (currentUser?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('id', currentUser.id)
            .single();

          if (!error && data?.notification_preferences) {
            // Fusionner avec les valeurs par défaut pour s'assurer que toutes les clés existent
            setNotificationPreferences({
              new_files: data.notification_preferences.new_files ?? true,
              new_photos: data.notification_preferences.new_photos ?? true,
              new_users: data.notification_preferences.new_users ?? false,
              new_payments: data.notification_preferences.new_payments ?? false,
              voucher_expired: data.notification_preferences.voucher_expired ?? false
            });
          } else if (!error && !data?.notification_preferences) {
            // Si pas de préférences, initialiser avec les valeurs par défaut
            const defaultPrefs = {
              new_files: true,
              new_photos: true,
              new_users: false,
              new_payments: false,
              voucher_expired: false
            };
            setNotificationPreferences(defaultPrefs);
            // Sauvegarder les préférences par défaut
            await handleSaveNotificationPreferences(defaultPrefs);
          }
        } catch (error) {
          // Erreur silencieuse lors du chargement des préférences
        }
      }
    };

    loadNotificationPreferences();
  }, [currentUser?.id, currentUser?.name, loadSubscriptionInfo, handleSaveNotificationPreferences]);

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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }
    
    try {
      await updateProfile({ name: formData.name });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const result = await changePassword(passwordData.newPassword);
      if (result.success) {
        alert('Mot de passe changé avec succès');
        setShowChangePassword(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        alert(result.error || 'Erreur lors du changement de mot de passe');
      }
    } catch {
      alert('Erreur lors du changement de mot de passe');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      onClose();
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-modal-header-content">
            <div className="profile-modal-title-section">
              <UserCircle className="profile-modal-icon" size={32} />
              <h2>Mon Profil</h2>
            </div>
            <button className="profile-modal-close" onClick={onClose} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          {/* Avatar Section */}
          <section className="profile-section">
            <div className="profile-avatar-container">
              <div className="profile-avatar-circle">
                <User size={56} strokeWidth={2} />
              </div>
              <div className="profile-avatar-info">
                <div className="profile-avatar-name">{currentUser?.name || 'Utilisateur'}</div>
                <div className="profile-avatar-badges">
                  <div className="profile-badge profile-badge-role">
                    <Shield size={14} />
                    <span>{currentUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span>
                  </div>
                  {subscription?.subscription_status === 'premium' && (
                    <div className="profile-badge profile-badge-premium">
                      <Crown size={14} />
                      <span>Premium</span>
                    </div>
                  )}
                  {subscription?.subscription_status === 'trial' && (
                    <div className="profile-badge profile-badge-trial">
                      <Sparkles size={14} />
                      <span>Essai gratuit</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Subscription Info */}
          {(subscription?.subscription_status === 'premium' || subscription?.subscription_status === 'trial') && (
            <section className="profile-section">
              <div className="profile-section-label">
                <span className="profile-section-number">01</span>
                <h3>
                  {subscription.subscription_status === 'trial' ? 'Période d\'essai' : 'Abonnement Premium'}
                </h3>
              </div>
              {subscription.subscription_status === 'trial' && (
                <div className="profile-trial-warning">
                  <AlertCircle size={20} />
                  <div>
                    <strong>Période d'essai gratuite</strong>
                    <p>Votre période d'essai de 7 jours se termine bientôt. Abonnez-vous pour continuer à profiter de toutes les fonctionnalités.</p>
                  </div>
                </div>
              )}
              <div className="profile-subscription-card">
                <div className="subscription-card-header">
                  <CreditCard size={24} />
                  <div>
                    <div className="subscription-plan-name">
                      {subscription.subscription_status === 'trial' ? 'Essai gratuit' : (getPlanName() || 'Premium')}
                    </div>
                    <div className={`subscription-plan-status ${subscription.subscription_status === 'trial' ? 'trial-status' : ''}`}>
                      {subscription.subscription_status === 'trial' ? 'En cours' : 'Actif'}
                    </div>
                  </div>
                </div>
                <div className="subscription-card-details">
                  {subscription.subscription_status === 'trial' && subscription.subscription_end_date && (
                    <div className="subscription-detail-item">
                      <span className="subscription-detail-label">
                        <Clock size={16} />
                        Essai expire le
                      </span>
                      <span className="subscription-detail-value">
                        {new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {getDaysRemaining() && (
                          <span className={`subscription-days-badge ${getDaysRemaining() <= 3 ? 'trial-expiring' : ''}`}>
                            {getDaysRemaining()} jour{getDaysRemaining() > 1 ? 's' : ''} restant{getDaysRemaining() > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {subscription.subscription_status === 'premium' && subscription.last_payment_date && (
                    <div className="subscription-detail-item">
                      <span className="subscription-detail-label">Premium depuis</span>
                      <span className="subscription-detail-value">
                        {new Date(subscription.last_payment_date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {subscription.subscription_status === 'premium' && subscription.subscription_end_date && (
                    <>
                      <div className="subscription-detail-item">
                        <span className="subscription-detail-label">
                          <Clock size={16} />
                          Expire le
                        </span>
                        <span className="subscription-detail-value">
                          {new Date(subscription.subscription_end_date).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {getDaysRemaining() !== null && (
                            <span className={`subscription-days-badge ${getDaysRemaining() <= 1 ? 'premium-expiring' : ''}`}>
                              {getDaysRemaining() > 0
                                ? `${getDaysRemaining()} jour${getDaysRemaining() > 1 ? 's' : ''} restant${getDaysRemaining() > 1 ? 's' : ''}`
                                : 'Expiré'}
                            </span>
                          )}
                        </span>
                      </div>
                      {getDaysRemaining() !== null && getDaysRemaining() <= 1 && getDaysRemaining() > 0 && (
                        <div className="subscription-expiry-warning">
                          <AlertCircle size={20} />
                          <div>
                            <strong>Votre abonnement expire bientôt !</strong>
                            <p>Renouvelez votre abonnement pour continuer à profiter de toutes les fonctionnalités.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {(subscription?.subscription_status === 'trial' || (subscription?.subscription_status === 'premium' && getDaysRemaining() !== null && getDaysRemaining() <= 1 && getDaysRemaining() > 0)) && (
                  <div className="subscription-card-actions">
                    <button 
                      className="btn-subscribe-now"
                      onClick={() => {
                        onClose();
                        if (onOpenPayment) {
                          onOpenPayment();
                        }
                      }}
                    >
                      <Crown size={18} />
                      {subscription?.subscription_status === 'trial' ? 'S\'abonner maintenant' : 'Renouveler l\'abonnement'}
                    </button>
                    {onRefreshSubscription && (
                      <button 
                        className="btn-refresh-subscription"
                        onClick={async () => {
                          await onRefreshSubscription(true);
                          await loadSubscriptionInfo();
                        }}
                        title="Rafraîchir le statut d'abonnement"
                      >
                        <RotateCcw size={16} />
                        Vérifier l'expiration
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Profile Info */}
          <section className="profile-section">
            <div className="profile-section-label">
              <span className="profile-section-number">02</span>
              <h3>Informations personnelles</h3>
            </div>
            <div className="profile-info-grid">
              <div className="profile-info-field">
                <label>
                  <User size={18} />
                  Nom d'utilisateur
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Votre nom d'utilisateur"
                  />
                ) : (
                  <div className="profile-info-value">{formData.username}</div>
                )}
              </div>

              <div className="profile-info-field">
                <label>
                  <UserCircle size={18} />
                  Nom complet
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <div className="profile-info-value">{currentUser?.name || 'Non défini'}</div>
                )}
              </div>

              <div className="profile-info-field">
                <label>
                  <Mail size={18} />
                  Email
                </label>
                <div className="profile-info-value">{currentUser?.email}</div>
              </div>

              {studentInfo && (
                <>
                  <div className="profile-info-field">
                    <label>
                      <Hash size={18} />
                      Matricule
                    </label>
                    <div className="profile-info-value">{studentInfo.matricule || 'Non disponible'}</div>
                  </div>

                  <div className="profile-info-field">
                    <label>
                      <Users size={18} />
                      Groupe
                    </label>
                    <div className="profile-info-value">{studentInfo.groupe || 'Non disponible'}</div>
                  </div>

                  <div className="profile-info-field">
                    <label>
                      <Users size={18} />
                      Sous-groupe
                    </label>
                    <div className="profile-info-value">{studentInfo.sousGroupe || 'Non disponible'}</div>
                  </div>
                </>
              )}

              <div className="profile-info-field">
                <label>
                  <Calendar size={18} />
                  Membre depuis
                </label>
                <div className="profile-info-value">
                  {new Date().toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Change Password Section */}
          {showChangePassword && (
            <section className="profile-section">
              <div className="profile-section-label">
                <span className="profile-section-number">03</span>
                <h3>Changer le mot de passe</h3>
              </div>
              <div className="profile-password-card">
                <div className="profile-password-fields">
                  <div className="profile-info-field">
                    <label>
                      <Lock size={18} />
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Minimum 6 caractères"
                    />
                  </div>
                  <div className="profile-info-field">
                    <label>
                      <Lock size={18} />
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Retapez le nouveau mot de passe"
                    />
                  </div>
                </div>
                <div className="profile-password-actions">
                  <button 
                    className="profile-btn profile-btn-secondary" 
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                  >
                    <X size={18} />
                    Annuler
                  </button>
                  <button 
                    className="profile-btn profile-btn-primary" 
                    onClick={handleChangePassword}
                  >
                    <Save size={18} />
                    Confirmer
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Notification Preferences Section */}
          <section className="profile-section">
            <div className="profile-section-label">
              <span className="profile-section-number">03</span>
              <h3>Préférences de notification</h3>
            </div>
            <div className="profile-notification-preferences">
              <div className="notification-preference-item">
                <div className="notification-preference-info">
                  <Bell size={20} />
                  <div>
                    <div className="notification-preference-label">Nouveaux fichiers</div>
                    <div className="notification-preference-description">
                      Recevoir une notification lorsqu'un nouveau fichier est ajouté
                    </div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.new_files ?? true}
                    onChange={(e) => {
                      const newPrefs = { ...notificationPreferences, new_files: e.target.checked };
                      setNotificationPreferences(newPrefs);
                      handleSaveNotificationPreferences(newPrefs);
                    }}
                    disabled={loadingPreferences}
                  />
                  <span className="notification-toggle-slider"></span>
                </label>
              </div>

              <div className="notification-preference-item">
                <div className="notification-preference-info">
                  <Image size={20} />
                  <div>
                    <div className="notification-preference-label">Nouvelles photos</div>
                    <div className="notification-preference-description">
                      Recevoir une notification lorsqu'une nouvelle photo est ajoutée
                    </div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.new_photos ?? true}
                    onChange={(e) => {
                      const newPrefs = { ...notificationPreferences, new_photos: e.target.checked };
                      setNotificationPreferences(newPrefs);
                      handleSaveNotificationPreferences(newPrefs);
                    }}
                    disabled={loadingPreferences}
                  />
                  <span className="notification-toggle-slider"></span>
                </label>
              </div>

              {currentUser?.role === 'admin' && (
                <>
                  <div className="notification-preference-item">
                    <div className="notification-preference-info">
                      <Users size={20} />
                      <div>
                        <div className="notification-preference-label">Nouveaux utilisateurs</div>
                        <div className="notification-preference-description">
                          Recevoir une notification lorsqu'un nouvel utilisateur s'inscrit
                        </div>
                      </div>
                    </div>
                    <label className="notification-toggle">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.new_users ?? false}
                        onChange={(e) => {
                          const newPrefs = { ...notificationPreferences, new_users: e.target.checked };
                          setNotificationPreferences(newPrefs);
                          handleSaveNotificationPreferences(newPrefs);
                        }}
                        disabled={loadingPreferences}
                      />
                      <span className="notification-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-preference-item">
                    <div className="notification-preference-info">
                      <CreditCard size={20} />
                      <div>
                        <div className="notification-preference-label">Nouveaux paiements</div>
                        <div className="notification-preference-description">
                          Recevoir une notification lorsqu'un nouveau paiement est effectué
                        </div>
                      </div>
                    </div>
                    <label className="notification-toggle">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.new_payments ?? false}
                        onChange={(e) => {
                          const newPrefs = { ...notificationPreferences, new_payments: e.target.checked };
                          setNotificationPreferences(newPrefs);
                          handleSaveNotificationPreferences(newPrefs);
                        }}
                        disabled={loadingPreferences}
                      />
                      <span className="notification-toggle-slider"></span>
                    </label>
                  </div>

                  <div className="notification-preference-item">
                    <div className="notification-preference-info">
                      <AlertCircle size={20} />
                      <div>
                        <div className="notification-preference-label">Code promo épuisé</div>
                        <div className="notification-preference-description">
                          Recevoir une notification lorsqu'un code promo est épuisé
                        </div>
                      </div>
                    </div>
                    <label className="notification-toggle">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.voucher_expired ?? false}
                        onChange={(e) => {
                          const newPrefs = { ...notificationPreferences, voucher_expired: e.target.checked };
                          setNotificationPreferences(newPrefs);
                          handleSaveNotificationPreferences(newPrefs);
                        }}
                        disabled={loadingPreferences}
                      />
                      <span className="notification-toggle-slider"></span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Actions */}
          {!showChangePassword && (
            <section className="profile-section">
              <div className="profile-actions">
                {isEditing ? (
                  <>
                    <button 
                      className="profile-btn profile-btn-secondary" 
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          username: currentUser?.email?.split('@')[0] || '',
                          name: currentUser?.name || ''
                        });
                      }}
                    >
                      <X size={18} />
                      Annuler
                    </button>
                    <button 
                      className="profile-btn profile-btn-primary" 
                      onClick={handleSave}
                    >
                      <Save size={18} />
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="profile-btn profile-btn-secondary" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 size={18} />
                      Modifier le profil
                    </button>
                    <button 
                      className="profile-btn profile-btn-secondary" 
                      onClick={() => setShowChangePassword(true)}
                    >
                      <Key size={18} />
                      Changer le mot de passe
                    </button>
                    <button 
                      className="profile-btn profile-btn-danger" 
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      Déconnexion
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
