import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContextSupabase';
import {
  User, Mail, Shield, Calendar, Edit2, Save, X, Key, LogOut, Gift,
  Crown, CreditCard, Clock, Sparkles, Lock, UserCircle, Hash, Users, Bell, FileText, Image, AlertCircle, RotateCcw
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { getStudentInfo } from '../services/studentNameService';
import { supabase } from '../lib/supabase';
import { notificationManager } from '../utils/notificationManager';
import './Profile.css';

const Profile = ({ onClose, onOpenPayment, onRefreshSubscription }) => {
  const { currentUser, logout, updateProfile, changePassword } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [formData, setFormData] = useState({
    name: currentUser?.name || ''
  });

  // Mettre à jour formData quand currentUser change
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || ''
      });
    }
  }, [currentUser]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [studentInfo, setStudentInfo] = useState(null);
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
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Ajout de la fonction d'activation des notifications système
  const [notifActive, setNotifActive] = useState(false);
  const [notifConfirmation, setNotifConfirmation] = useState('');
  const [notifError, setNotifError] = useState('');

  const loadSubscriptionInfo = useCallback(async (forceRefresh = false) => {
    if (currentUser?.id) {
      // Charger les détails (cette fonction vérifie et met à jour automatiquement si expiré)
      const details = await subscriptionService.getSubscriptionDetails(currentUser.id);

      // Vérifier manuellement si l'abonnement est expiré (double vérification)
      if (details && (details.subscription_status === 'trial' || details.subscription_status === 'premium')) {
        if (details.subscription_end_date) {
          const endDate = new Date(details.subscription_end_date);
          const now = new Date();
          const isExpired = endDate <= now;

          if (isExpired) {
            // Forcer la mise à jour du statut
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                subscription_status: 'free',
                subscription_end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentUser.id);

            if (!updateError) {
              // Recharger les détails après mise à jour
              const updatedDetails = await subscriptionService.getSubscriptionDetails(currentUser.id);
              setSubscription(updatedDetails);
              return;
            }
          }
        }
      }

      setSubscription(details);

      // IMPORTANT: Ne PAS réinitialiser le statut 'free' vers 'trial'
      // Si le statut est 'free', c'est qu'il a expiré et doit rester 'free'
      // On ne donne le trial QUE si c'est un compte vraiment nouveau qui n'a jamais eu de trial

      // Si pas de subscription, vérifier si c'est un compte vraiment nouveau
      if (!details || (details.subscription_status !== 'trial' && details.subscription_status !== 'premium' && details.subscription_status !== 'free')) {
        // Vérifier si le profil existe
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, subscription_status, subscription_end_date, created_at')
          .eq('id', currentUser.id)
          .single();

        // Si le profil existe mais n'a pas de statut valide, vérifier si c'est un nouveau compte
        if (profile && !profile.subscription_status) {
          // Vérifier si c'est un nouveau compte (créé il y a moins de 24h)
          const createdAt = new Date(profile.created_at || new Date());
          const now = new Date();
          const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

          // Donner le trial SEULEMENT si :
          // 1. Le compte a moins de 24h
          // 2. ET qu'il n'a jamais eu de subscription_end_date (pas de trial avant)
          if (hoursSinceCreation < 24 && !profile.subscription_end_date) {
            // C'est un nouveau compte qui n'a jamais eu de trial, donner le trial
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                subscription_status: 'trial',
                subscription_end_date: trialEndDate.toISOString()
              })
              .eq('id', currentUser.id);

            if (!updateError) {
              // Recharger les détails
              const updatedDetails = await subscriptionService.getSubscriptionDetails(currentUser.id);
              setSubscription(updatedDetails);
            }
          }
        }
      }

      // Si le statut est 'free', NE PAS le changer - c'est normal après expiration
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

    // Vérifier AVANT d'entrer dans la fonction async si c'est un email
    // Si c'est un email, ne pas chercher du tout (admin ou compte non-étudiant)
    if (!currentUser?.name) {
      setStudentInfo(null);
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(currentUser.name);

      if (isEmail) {
        // C'est un email, ne pas chercher du tout
        setStudentInfo(null);
      } else {
        // Charger les informations étudiantes depuis le JSON ou la base de données
        const loadStudentInfo = async () => {
          let info = null;

          // Essayer d'abord depuis le JSON
          try {
            info = getStudentInfo(currentUser.name);
            if (info && (info.matricule || info.groupe || info.sousGroupe)) {
              setStudentInfo(info);
              return;
            }
          } catch (error) {
            // Erreur silencieuse
          }

          // Si pas trouvé dans le JSON, essayer depuis la base de données
          // DOUBLE VÉRIFICATION : s'assurer que ce n'est toujours pas un email
          if (currentUser?.id && currentUser?.name) {
            // Vérifier à nouveau que ce n'est pas un email (sécurité supplémentaire)
            const doubleCheckIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(currentUser.name);

            // NE JAMAIS faire la requête si c'est un email
            if (!doubleCheckIsEmail) {
              try {
                const { data: profileData, error: dbError } = await supabase
                  .from('profiles')
                  .select('matricule, groupe, sous_groupe')
                  .eq('id', currentUser.id)
                  .single();

                // Si erreur 42703, les colonnes n'existent pas, on ignore silencieusement
                if (dbError) {
                  // Ignorer les erreurs de colonnes inexistantes (42703) ou pas de résultat (PGRST116)
                  // Ne rien faire, juste ignorer
                } else if (profileData) {
                  if (profileData.matricule || profileData.groupe || profileData.sous_groupe) {
                    info = {
                      matricule: profileData.matricule || null,
                      groupe: profileData.groupe || null,
                      sousGroupe: profileData.sous_groupe || null
                    };
                    setStudentInfo(info);
                    return;
                  }
                }
              } catch (error) {
                // Erreur silencieuse - les colonnes n'existent probablement pas
              }
            }
          }

          // Si toujours rien, essayer une recherche plus flexible dans le JSON
          if (!info && currentUser?.name) {
            try {
              // Essayer avec différentes variations du nom
              const nameVariations = [
                currentUser.name.trim().toUpperCase(),
                currentUser.name.trim().toLowerCase(),
                currentUser.name.trim().replace(/\s+/g, ' '), // Normaliser les espaces
              ];

              for (const nameVar of nameVariations) {
                if (nameVar === currentUser.name.trim()) continue; // Déjà essayé
                const found = getStudentInfo(nameVar);
                if (found && (found.matricule || found.groupe || found.sousGroupe)) {
                  info = found;
                  break;
                }
              }
            } catch (error) {
              // Erreur silencieuse
            }
          }

          setStudentInfo(info);
        };

        loadStudentInfo();
      }
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
              new_notes: data.notification_preferences.new_notes ?? true,
              new_quiz: data.notification_preferences.new_quiz ?? true,
              trial_expiry: data.notification_preferences.trial_expiry ?? true,
              subscription_expiry: data.notification_preferences.subscription_expiry ?? true,
              custom_admin: data.notification_preferences.custom_admin ?? true,
              new_users: data.notification_preferences.new_users ?? false,
              new_payments: data.notification_preferences.new_payments ?? false,
              voucher_expired: data.notification_preferences.voucher_expired ?? false
            });
          } else if (!error && !data?.notification_preferences) {
            // Si pas de préférences, initialiser avec les valeurs par défaut
            const defaultPrefs = {
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

    // Rafraîchir les informations d'abonnement périodiquement (toutes les 30 secondes)
    // pour détecter les expirations en temps réel
    const subscriptionInterval = setInterval(() => {
      if (currentUser?.id) {
        loadSubscriptionInfo();
      }
    }, 30000); // 30 secondes

    return () => {
      clearInterval(subscriptionInterval);
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.created_at, loadSubscriptionInfo, handleSaveNotificationPreferences]);

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

  // Vérifier si l'abonnement est expiré
  const isSubscriptionExpired = () => {
    if (!subscription) return false;

    // Si le statut est 'free', c'est expiré
    if (subscription.subscription_status === 'free') return true;

    // Si le statut est 'trial' ou 'premium' et que la date est expirée
    if ((subscription.subscription_status === 'trial' || subscription.subscription_status === 'premium') &&
      subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      return endDate <= now;
    }

    return false;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    // Vérifier si le nom a changé
    if (formData.name.trim() === currentUser?.name) {
      setIsEditing(false);
      return;
    }

    try {
      // Mettre à jour directement dans la table profiles (plus fiable)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (profileError) {
        console.error('Erreur lors de la mise à jour du profil:', profileError);
        alert('Erreur lors de la mise à jour du profil: ' + (profileError.message || 'Erreur inconnue'));
        return;
      }

      // Mettre à jour aussi les métadonnées de l'utilisateur dans auth (optionnel)
      try {
        await updateProfile({ name: formData.name.trim() });
      } catch (authError) {
        console.warn('Erreur lors de la mise à jour des métadonnées auth (non bloquant):', authError);
        // Ne pas bloquer si la mise à jour auth échoue, car profiles est déjà mis à jour
      }

      setIsEditing(false);

      // Afficher un message de succès
      alert('Profil mis à jour avec succès !');

      // Recharger la page pour voir les changements
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil: ' + (error.message || 'Erreur inconnue'));
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

  // Fonction pour activer les notifications système
  const handleActiverNotifications = async () => {
    setNotifError('');
    setNotifConfirmation('');

    try {
      // Vérifier le statut actuel
      const currentStatus = notificationManager.getPermissionStatus();

      if (currentStatus === 'unsupported') {
        setNotifError('Les notifications ne sont pas supportées par votre navigateur');
        return;
      }

      if (currentStatus === 'denied') {
        setNotifError('Les notifications ont été bloquées. Veuillez les autoriser dans les paramètres de votre navigateur');
        return;
      }

      // Demander la permission
      const success = await notificationManager.requestPermission();

      if (!success) {
        setNotifError('Permission refusée. Veuillez autoriser les notifications');
        return;
      }

      // Essayer de s'abonner aux notifications push
      try {
        const subscription = await notificationManager.subscribeToPush();

        if (subscription) {
          setNotifActive(true);
          setNotifConfirmation('✅ Notifications push activées avec succès !');
          setTimeout(() => setNotifConfirmation(''), 5000);

          // Envoyer une notification de test
          await notificationManager.sendLocalNotification(
            '🔔 Notifications activées',
            'Vous recevrez désormais les notifications de l\'application'
          );
        }
      } catch (pushError) {
        console.warn('Les notifications push ne sont pas disponibles:', pushError);

        // Même si les push notifications échouent, activer les notifications locales
        setNotifActive(true);
        setNotifConfirmation('✅ Notifications locales activées (les notifications push ne sont pas disponibles sur ce serveur)');
        setTimeout(() => setNotifConfirmation(''), 7000);

        // Envoyer une notification de test locale
        await notificationManager.sendLocalNotification(
          '🔔 Notifications locales activées',
          'Vous recevrez les notifications dans l\'application'
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      setNotifError('Une erreur est survenue. Veuillez réessayer');
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header - Modern Style */}
        <div className="section-header-v2" style={{ margin: '24px 24px 0 24px' }}>
          <div className="section-icon-v2">
            <UserCircle size={24} />
          </div>
          <h2 className="section-title-v2">Mon Profil</h2>
          <div className="section-line-v2" />
          <button className="profile-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>


        {/* Body */}
        <div className="profile-modal-body">
          {/* Avatar Section */}
          <div className="settings-section">
            <div className="section-header">
              <User size={20} />
              <h2>Profil</h2>
            </div>

            <div className="settings-card">
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
                    {subscription?.subscription_status === 'trial' &&
                      subscription?.subscription_end_date &&
                      new Date(subscription.subscription_end_date) > new Date() && (
                        <div className="profile-badge profile-badge-trial">
                          <Sparkles size={14} />
                          <span>Essai gratuit</span>
                        </div>
                      )}
                    {(!subscription ||
                      subscription.subscription_status === 'free' ||
                      (subscription.subscription_status === 'trial' && subscription.subscription_end_date && new Date(subscription.subscription_end_date) <= new Date())) && (
                        <div className="profile-badge profile-badge-free">
                          <Lock size={14} />
                          <span>Gratuit</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Info - Actif */}
          {/* Afficher seulement si le statut est premium ou trial ET que la date n'est pas expirée */}
          {subscription && (subscription.subscription_status === 'premium' || subscription.subscription_status === 'trial') &&
            subscription.subscription_end_date &&
            new Date(subscription.subscription_end_date) > new Date() && (
              <div className="settings-section">
                <div className="section-header">
                  <CreditCard size={20} />
                  <h2>
                    {subscription.subscription_status === 'trial' ? 'Période d\'essai' : 'Abonnement Premium'}
                  </h2>
                </div>

                <div className="settings-card">
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



                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Subscription Expired Info */}
          {/* Afficher quand l'abonnement ou la période d'essai est expirée */}
          {isSubscriptionExpired() && (
            <div className="settings-section">
              <div className="section-header">
                <CreditCard size={20} />
                <h2>Abonnement</h2>
              </div>

              <div className="settings-card">
                <div className="profile-subscription-expired">
                  <div className="subscription-expired-icon">
                    <Lock size={48} />
                  </div>
                  <h3>Période d'essai expirée</h3>
                  <p>
                    Votre période d'essai gratuite de 7 jours est terminée.
                    Abonnez-vous maintenant pour continuer à profiter de toutes les fonctionnalités premium.
                  </p>
                  <div className="subscription-expired-features">
                    <p>✨ Accès illimité à tout le contenu</p>
                    <p>📚 Notes, Quiz, Photos et Fichiers</p>
                    <p>🎓 Support prioritaire</p>
                  </div>
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
                    S'abonner maintenant
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Info */}
          <div className="settings-section">
            <div className="section-header">
              <UserCircle size={20} />
              <h2>Informations personnelles</h2>
            </div>

            <div className="settings-card">
              <div className="profile-info-grid">
                <div className="profile-info-field">
                  <label>
                    <UserCircle size={18} />
                    Nom complet
                  </label>
                  <div className="profile-info-value">{currentUser?.name || 'Non défini'}</div>

                </div>



                <div className="profile-info-field">
                  <label>
                    <Mail size={18} />
                    Email
                  </label>
                  <div className="profile-info-value">{currentUser?.email}</div>
                </div>

                <div className="profile-info-field">
                  <label>
                    <Hash size={18} />
                    Matricule
                  </label>
                  <div className="profile-info-value">
                    {studentInfo?.matricule || (studentInfo ? 'Non disponible' : 'Chargement...')}
                  </div>
                </div>

                <div className="profile-info-field">
                  <label>
                    <Users size={18} />
                    Groupe
                  </label>
                  <div className="profile-info-value">
                    {studentInfo?.groupe || (studentInfo ? 'Non disponible' : 'Chargement...')}
                  </div>
                </div>

                <div className="profile-info-field">
                  <label>
                    <Users size={18} />
                    Sous-groupe
                  </label>
                  <div className="profile-info-value">
                    {studentInfo?.sousGroupe || (studentInfo ? 'Non disponible' : 'Chargement...')}
                  </div>
                </div>

                <div className="profile-info-field">
                  <label>
                    <Calendar size={18} />
                    Membre depuis
                  </label>
                  <div className="profile-info-value">
                    {currentUser?.created_at
                      ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : 'Non disponible'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          {showChangePassword && (
            <div className="settings-section">
              <div className="section-header">
                <Key size={20} />
                <h2>Changer le mot de passe</h2>
              </div>

              <div className="settings-card">
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
              </div>
            </div>
          )}

          {/* Notification Preferences Section */}
          <div className="settings-section">
            <div className="section-header">
              <Bell size={20} />
              <h2>Préférences de notification</h2>
            </div>

            <div className="settings-card">
              <div className="profile-notification-preferences">
                {/* Utilisateur */}
                {/* Bouton d'activation des notifications système */}
                <div style={{ marginTop: 16, marginBottom: 24, textAlign: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleActiverNotifications}
                    style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}
                    disabled={notifActive}
                  >
                    <Bell size={18} style={{ marginRight: 8 }} />
                    {notifActive ? 'Notifications activées' : 'Activer les notifications système'}
                  </button>
                  {notifConfirmation && (
                    <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '500', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', marginTop: '8px' }}>
                      {notifConfirmation}
                    </div>
                  )}
                  {notifError && (
                    <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500', padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginTop: '8px' }}>
                      ⚠️ {notifError}
                    </div>
                  )}
                </div>
                <div className="notification-preference-item">

                  <div className="notification-preference-info">
                    <Bell size={20} />
                    <div>
                      <div className="notification-preference-label">Nouveaux fichiers</div>
                      <div className="notification-preference-description">Recevoir une notification lorsqu'un nouveau fichier est ajouté</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.new_files ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_files: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <Image size={20} />
                    <div>
                      <div className="notification-preference-label">Nouvelles photos</div>
                      <div className="notification-preference-description">Recevoir une notification lorsqu'une nouvelle photo est ajoutée</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.new_photos ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_photos: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <FileText size={20} />
                    <div>
                      <div className="notification-preference-label">Nouvelles notes</div>
                      <div className="notification-preference-description">Recevoir une notification lorsqu'une nouvelle note est ajoutée</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.new_notes ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_notes: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <Sparkles size={20} />
                    <div>
                      <div className="notification-preference-label">Nouveaux quiz</div>
                      <div className="notification-preference-description">Recevoir une notification lorsqu'un nouveau quiz est ajouté</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.new_quiz ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_quiz: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <Clock size={20} />
                    <div>
                      <div className="notification-preference-label">Fin de période d'essai</div>
                      <div className="notification-preference-description">Recevoir une notification à l'approche de la fin de la période d'essai</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.trial_expiry ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, trial_expiry: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <Clock size={20} />
                    <div>
                      <div className="notification-preference-label">Fin d'abonnement</div>
                      <div className="notification-preference-description">Recevoir une notification à l'approche de la fin de l'abonnement</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.subscription_expiry ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, subscription_expiry: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                <div className="notification-preference-item">
                  <div className="notification-preference-info">
                    <Gift size={20} />
                    <div>
                      <div className="notification-preference-label">Notification personnalisée (admin)</div>
                      <div className="notification-preference-description">Recevoir les notifications personnalisées envoyées par l'administrateur</div>
                    </div>
                  </div>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={notificationPreferences.custom_admin ?? true} onChange={(e) => { const newPrefs = { ...notificationPreferences, custom_admin: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                    <span className="notification-toggle-slider"></span>
                  </label>
                </div>
                {/* Admin uniquement */}
                {currentUser?.role === 'admin' && (
                  <>
                    <div className="notification-preference-item">
                      <div className="notification-preference-info">
                        <Users size={20} />
                        <div>
                          <div className="notification-preference-label">Nouveaux utilisateurs</div>
                          <div className="notification-preference-description">Recevoir une notification lorsqu'un nouvel utilisateur s'inscrit</div>
                        </div>
                      </div>
                      <label className="notification-toggle">
                        <input type="checkbox" checked={notificationPreferences.new_users ?? false} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_users: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                        <span className="notification-toggle-slider"></span>
                      </label>
                    </div>
                    <div className="notification-preference-item">
                      <div className="notification-preference-info">
                        <CreditCard size={20} />
                        <div>
                          <div className="notification-preference-label">Nouveaux paiements</div>
                          <div className="notification-preference-description">Recevoir une notification lorsqu'un nouveau paiement est effectué</div>
                        </div>
                      </div>
                      <label className="notification-toggle">
                        <input type="checkbox" checked={notificationPreferences.new_payments ?? false} onChange={(e) => { const newPrefs = { ...notificationPreferences, new_payments: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                        <span className="notification-toggle-slider"></span>
                      </label>
                    </div>
                    <div className="notification-preference-item">
                      <div className="notification-preference-info">
                        <AlertCircle size={20} />
                        <div>
                          <div className="notification-preference-label">Code promo épuisé</div>
                          <div className="notification-preference-description">Recevoir une notification lorsqu'un code promo est épuisé</div>
                        </div>
                      </div>
                      <label className="notification-toggle">
                        <input type="checkbox" checked={notificationPreferences.voucher_expired ?? false} onChange={(e) => { const newPrefs = { ...notificationPreferences, voucher_expired: e.target.checked }; setNotificationPreferences(newPrefs); handleSaveNotificationPreferences(newPrefs); }} disabled={loadingPreferences} />
                        <span className="notification-toggle-slider"></span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {!showChangePassword && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="profile-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="profile-btn profile-btn-secondary"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;