import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContextSupabase';
import { CreditCard, LogOut, Moon, Sun, Bell, FileText, Image, Sparkles, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { notificationManager } from '../utils/notificationManager';
import './UserSettings.css';

const UserSettings = ({ onOpenPayment }) => {
  const { currentUser, theme, toggleTheme } = useApp();
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
  const [pushNotificationStatus, setPushNotificationStatus] = useState('default');
  const [notifError, setNotifError] = useState('');
  const [notifConfirmation, setNotifConfirmation] = useState('');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // Charger les préférences de notifications
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

  // Vérifier le statut des notifications push
  const checkPushNotificationStatus = () => {
    const status = notificationManager.getPermissionStatus();
    setPushNotificationStatus(status);
  };

  // Sauvegarder les préférences de notifications
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

  // Demander l'autorisation des notifications push
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
      <div className="settings-header-bar">
        <div className="header-left">
          <Settings size={24} className="header-icon" />
          <div className="header-text">
            <h1>Paramètres</h1>
            <p>Gérez vos préférences et votre compte</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        {/* Abonnement */}
        <div className="settings-section">
          <div className="section-header">
            <CreditCard size={20} />
            <h2>Abonnement</h2>
          </div>
          
          <div className="settings-card">
            <div className="subscription-info">
              <div className="subscription-status">
                <div className="status-badge">
                  {currentUser?.subscription_status === 'active' ? (
                    <>
                      <CheckCircle size={18} />
                      <span>Plan Actif</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      <span>Plan Inactif</span>
                    </>
                  )}
                </div>
                <p className="subscription-email">{currentUser?.email}</p>
              </div>
            </div>

            <button className="setting-btn primary" onClick={onOpenPayment}>
              <CreditCard size={18} />
              Gérer mon abonnement
            </button>
          </div>
        </div>

        {/* Apparence */}
        <div className="settings-section">
          <div className="section-header">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            <h2>Apparence</h2>
          </div>
          
          <div className="settings-card">
            <div className="setting-item">
              <div className="setting-label">
                <span>Thème de l'application</span>
                <span className="setting-description">
                  Choisissez votre thème préféré
                </span>
              </div>
              <button 
                className={`theme-toggle ${theme}`}
                onClick={toggleTheme}
              >
                {theme === 'light' ? (
                  <>
                    <Sun size={18} />
                    <span>Mode Clair</span>
                  </>
                ) : (
                  <>
                    <Moon size={18} />
                    <span>Mode Sombre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>
          
          <div className="settings-card">
            {/* Autorisation notifications push */}
            <div className="setting-item push-permission-item">
              <div className="setting-label">
                <span>Notifications Push</span>
                <span className="setting-description">
                  Recevoir des notifications même lorsque l'application est fermée
                </span>
              </div>
              <div className="push-notification-control">
                {pushNotificationStatus === 'granted' ? (
                  <div className="push-status granted">
                    <CheckCircle size={18} />
                    <span>Activées</span>
                  </div>
                ) : pushNotificationStatus === 'denied' ? (
                  <div className="push-status denied">
                    <AlertTriangle size={18} />
                    <span>Bloquées</span>
                  </div>
                ) : (
                  <button 
                    className="setting-btn primary small"
                    onClick={handleRequestPushPermission}
                  >
                    <Bell size={18} />
                    Activer
                  </button>
                )}
              </div>
            </div>

            {notifError && (
              <div className="notification-error">
                <AlertTriangle size={16} />
                {notifError}
              </div>
            )}

            {notifConfirmation && (
              <div className="notification-success">
                <CheckCircle size={16} />
                {notifConfirmation}
              </div>
            )}

            <div className="notification-preferences-divider"></div>

            {/* Préférences de notifications */}
            <div className="notification-preferences-list">
              <div className="notification-preference-item">
                <div className="notification-preference-info">
                  <FileText size={20} />
                  <div>
                    <div className="notification-preference-label">Nouveaux fichiers</div>
                    <div className="notification-preference-description">Notifications lors de l'ajout de fichiers</div>
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
                    <div className="notification-preference-description">Notifications lors de l'ajout de photos</div>
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

              <div className="notification-preference-item">
                <div className="notification-preference-info">
                  <FileText size={20} />
                  <div>
                    <div className="notification-preference-label">Nouvelles notes</div>
                    <div className="notification-preference-description">Notifications lors de l'ajout de notes</div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input 
                    type="checkbox" 
                    checked={notificationPreferences.new_notes ?? true} 
                    onChange={(e) => { 
                      const newPrefs = { ...notificationPreferences, new_notes: e.target.checked }; 
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
                  <Sparkles size={20} />
                  <div>
                    <div className="notification-preference-label">Nouveaux quiz</div>
                    <div className="notification-preference-description">Notifications lors de l'ajout de quiz</div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input 
                    type="checkbox" 
                    checked={notificationPreferences.new_quiz ?? true} 
                    onChange={(e) => { 
                      const newPrefs = { ...notificationPreferences, new_quiz: e.target.checked }; 
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
                  <AlertTriangle size={20} />
                  <div>
                    <div className="notification-preference-label">Expiration d'abonnement</div>
                    <div className="notification-preference-description">Alertes avant l'expiration</div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input 
                    type="checkbox" 
                    checked={notificationPreferences.subscription_expiry ?? true} 
                    onChange={(e) => { 
                      const newPrefs = { ...notificationPreferences, subscription_expiry: e.target.checked }; 
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
                  <Bell size={20} />
                  <div>
                    <div className="notification-preference-label">Messages administrateur</div>
                    <div className="notification-preference-description">Notifications importantes de l'administration</div>
                  </div>
                </div>
                <label className="notification-toggle">
                  <input 
                    type="checkbox" 
                    checked={notificationPreferences.custom_admin ?? true} 
                    onChange={(e) => { 
                      const newPrefs = { ...notificationPreferences, custom_admin: e.target.checked }; 
                      setNotificationPreferences(newPrefs); 
                      handleSaveNotificationPreferences(newPrefs); 
                    }} 
                    disabled={loadingPreferences} 
                  />
                  <span className="notification-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Déconnexion */}
        <div className="settings-section danger-zone">
          <div className="section-header">
            <LogOut size={20} />
            <h2>Déconnexion</h2>
          </div>
          
          <div className="settings-card">
            <p className="danger-text">
              Vous serez déconnecté de votre compte. Vous devrez vous reconnecter pour accéder à vos données.
            </p>
            <button className="setting-btn danger" onClick={handleLogout}>
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;