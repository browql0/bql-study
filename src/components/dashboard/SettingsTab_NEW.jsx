import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService';
import { 
  Settings, 
  DollarSign, 
  Zap, 
  Mail, 
  Shield, 
  Save, 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  CreditCard,
  FileText,
  MessageSquare,
  Lock,
  Users,
  Image,
  Bell,
  Globe,
  TrendingUp
} from 'lucide-react';

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    pricing: { monthly: 20, quarterly: 50, yearly: 100 },
    features: {
      notes: true,
      flashcards: true,
      quiz: true,
      photos: true,
      files: true,
      advancedSearch: true
    },
    emails: {
      welcomeEmail: true,
      subscriptionReminder: true,
      expirationNotice: true,
      promotionalEmails: false
    },
    permissions: {
      allowUserRegistration: true,
      requireEmailVerification: false,
      allowGuestAccess: false,
      maxFilesPerUser: 50,
      maxNotesPerUser: 100
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      showNotification('Erreur lors du chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateSettings = async () => {
    try {
      setSaving(true);
      await settingsService.saveSettings(settings);
      showNotification('Paramètres sauvegardés avec succès !', 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showNotification('Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setShowConfirmModal(true);
  };

  const confirmReset = async () => {
    try {
      setSaving(true);
      await settingsService.resetToDefaults();
      await loadSettings();
      showNotification('Paramètres réinitialisés aux valeurs par défaut', 'success');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      showNotification('Erreur lors de la réinitialisation', 'error');
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
    }
  };

  const handlePriceChange = (plan, value) => {
    const numValue = parseFloat(value);
    if (numValue >= 0 && numValue <= 10000) {
      setSettings({
        ...settings,
        pricing: { ...settings.pricing, [plan]: numValue || 0 }
      });
    }
  };

  const handleFeatureToggle = (feature) => {
    setSettings({
      ...settings,
      features: { ...settings.features, [feature]: !settings.features[feature] }
    });
  };

  const handleEmailToggle = (email) => {
    setSettings({
      ...settings,
      emails: { ...settings.emails, [email]: !settings.emails[email] }
    });
  };

  const handlePermissionToggle = (permission) => {
    setSettings({
      ...settings,
      permissions: { ...settings.permissions, [permission]: !settings.permissions[permission] }
    });
  };

  const handlePermissionNumberChange = (permission, value) => {
    const numValue = parseInt(value);
    if (numValue >= 0 && numValue <= 10000) {
      setSettings({
        ...settings,
        permissions: { ...settings.permissions, [permission]: numValue || 0 }
      });
    }
  };

  if (loading) {
    return (
      <div className="settings-loading-v2">
        <div className="settings-spinner-v2"></div>
        <p className="settings-loading-text-v2">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="settings-container-v2">
      {/* Header */}
      <div className="settings-header-v2">
        <h1 className="settings-title-v2">Paramètres de l'Application</h1>
        <p className="settings-subtitle-v2">Configurez tous les aspects de votre plateforme d'apprentissage</p>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions-v2">
        <button 
          className="settings-action-btn-v2 save-btn-v2" 
          onClick={handleUpdateSettings}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="settings-spinner-v2" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
              <span>Sauvegarde...</span>
            </>
          ) : (
            <>
              <Save />
              <span>Sauvegarder les modifications</span>
            </>
          )}
        </button>
        <button 
          className="settings-action-btn-v2 reset-btn-v2" 
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          <RotateCcw />
          <span>Réinitialiser par défaut</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="settings-grid-v2">
        {/* Pricing Card */}
        <div className="setting-card-v2" style={{ '--card-index': 0 }}>
          <div className="setting-card-header-v2">
            <DollarSign className="setting-card-icon-v2" />
            <h2 className="setting-card-title-v2">Tarification</h2>
          </div>
          <div className="setting-card-body-v2">
            <div className="setting-form-group-v2">
              <label className="setting-label-v2">
                <CreditCard className="setting-label-icon-v2" />
                Abonnement Mensuel
              </label>
              <div className="price-input-wrapper-v2">
                <input
                  type="number"
                  className="setting-input-v2"
                  value={settings.pricing.monthly}
                  onChange={(e) => handlePriceChange('monthly', e.target.value)}
                  placeholder="20.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="setting-help-text-v2">
                <Info className="setting-help-icon-v2" />
                Prix mensuel pour l'accès premium
              </div>
            </div>

            <div className="setting-form-group-v2">
              <label className="setting-label-v2">
                <TrendingUp className="setting-label-icon-v2" />
                Abonnement Trimestriel
              </label>
              <div className="price-input-wrapper-v2">
                <input
                  type="number"
                  className="setting-input-v2"
                  value={settings.pricing.quarterly}
                  onChange={(e) => handlePriceChange('quarterly', e.target.value)}
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="setting-help-text-v2">
                <Info className="setting-help-icon-v2" />
                Prix pour 3 mois d'accès premium
              </div>
            </div>

            <div className="setting-form-group-v2">
              <label className="setting-label-v2">
                <Globe className="setting-label-icon-v2" />
                Abonnement Annuel
              </label>
              <div className="price-input-wrapper-v2">
                <input
                  type="number"
                  className="setting-input-v2"
                  value={settings.pricing.yearly}
                  onChange={(e) => handlePriceChange('yearly', e.target.value)}
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="setting-help-text-v2">
                <Info className="setting-help-icon-v2" />
                Prix pour 12 mois d'accès premium (meilleure offre)
              </div>
            </div>
          </div>
        </div>

        {/* Features Card */}
        <div className="setting-card-v2" style={{ '--card-index': 1 }}>
          <div className="setting-card-header-v2">
            <Zap className="setting-card-icon-v2" />
            <h2 className="setting-card-title-v2">Fonctionnalités</h2>
          </div>
          <div className="setting-card-body-v2">
            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <FileText className="setting-toggle-label-icon-v2" />
                Notes & Documents
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.notes}
                  onChange={() => handleFeatureToggle('notes')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <CreditCard className="setting-toggle-label-icon-v2" />
                Flashcards
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.flashcards}
                  onChange={() => handleFeatureToggle('flashcards')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <MessageSquare className="setting-toggle-label-icon-v2" />
                Quiz & Évaluations
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.quiz}
                  onChange={() => handleFeatureToggle('quiz')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Image className="setting-toggle-label-icon-v2" />
                Photos & Images
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.photos}
                  onChange={() => handleFeatureToggle('photos')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <FileText className="setting-toggle-label-icon-v2" />
                Fichiers & Pièces jointes
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.files}
                  onChange={() => handleFeatureToggle('files')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Zap className="setting-toggle-label-icon-v2" />
                Recherche Avancée
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.features.advancedSearch}
                  onChange={() => handleFeatureToggle('advancedSearch')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Notifications Card */}
        <div className="setting-card-v2" style={{ '--card-index': 2 }}>
          <div className="setting-card-header-v2">
            <Mail className="setting-card-icon-v2" />
            <h2 className="setting-card-title-v2">Notifications Email</h2>
          </div>
          <div className="setting-card-body-v2">
            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Bell className="setting-toggle-label-icon-v2" />
                Email de Bienvenue
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.emails.welcomeEmail}
                  onChange={() => handleEmailToggle('welcomeEmail')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Bell className="setting-toggle-label-icon-v2" />
                Rappel d'Abonnement
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.emails.subscriptionReminder}
                  onChange={() => handleEmailToggle('subscriptionReminder')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Bell className="setting-toggle-label-icon-v2" />
                Notification d'Expiration
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.emails.expirationNotice}
                  onChange={() => handleEmailToggle('expirationNotice')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Bell className="setting-toggle-label-icon-v2" />
                Emails Promotionnels
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.emails.promotionalEmails}
                  onChange={() => handleEmailToggle('promotionalEmails')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="setting-card-v2" style={{ '--card-index': 3 }}>
          <div className="setting-card-header-v2">
            <Shield className="setting-card-icon-v2" />
            <h2 className="setting-card-title-v2">Permissions & Sécurité</h2>
          </div>
          <div className="setting-card-body-v2">
            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Users className="setting-toggle-label-icon-v2" />
                Inscription Utilisateur
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.permissions.allowUserRegistration}
                  onChange={() => handlePermissionToggle('allowUserRegistration')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Lock className="setting-toggle-label-icon-v2" />
                Vérification Email Requise
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.permissions.requireEmailVerification}
                  onChange={() => handlePermissionToggle('requireEmailVerification')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-toggle-wrapper-v2">
              <label className="setting-toggle-label-v2">
                <Globe className="setting-toggle-label-icon-v2" />
                Accès Invité
              </label>
              <div className="toggle-switch-v2">
                <input
                  type="checkbox"
                  checked={settings.permissions.allowGuestAccess}
                  onChange={() => handlePermissionToggle('allowGuestAccess')}
                />
                <span className="toggle-slider-v2"></span>
              </div>
            </div>

            <div className="setting-form-group-v2">
              <label className="setting-label-v2">
                <FileText className="setting-label-icon-v2" />
                Limite de Fichiers par Utilisateur
              </label>
              <input
                type="number"
                className="setting-input-v2"
                value={settings.permissions.maxFilesPerUser}
                onChange={(e) => handlePermissionNumberChange('maxFilesPerUser', e.target.value)}
                placeholder="50"
                min="0"
              />
              <div className="setting-help-text-v2">
                <Info className="setting-help-icon-v2" />
                Nombre maximum de fichiers qu'un utilisateur peut télécharger
              </div>
            </div>

            <div className="setting-form-group-v2">
              <label className="setting-label-v2">
                <FileText className="setting-label-icon-v2" />
                Limite de Notes par Utilisateur
              </label>
              <input
                type="number"
                className="setting-input-v2"
                value={settings.permissions.maxNotesPerUser}
                onChange={(e) => handlePermissionNumberChange('maxNotesPerUser', e.target.value)}
                placeholder="100"
                min="0"
              />
              <div className="setting-help-text-v2">
                <Info className="setting-help-icon-v2" />
                Nombre maximum de notes qu'un utilisateur peut créer
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`settings-notification-v2 ${notification.type}`}>
          {notification.type === 'success' ? (
            <Check className="settings-notification-icon-v2" />
          ) : (
            <X className="settings-notification-icon-v2" />
          )}
          <span className="settings-notification-text-v2">{notification.message}</span>
          <button 
            className="settings-notification-close-v2" 
            onClick={() => setNotification(null)}
          >
            <X />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="settings-confirm-modal-overlay-v2" onClick={() => setShowConfirmModal(false)}>
          <div className="settings-confirm-modal-v2" onClick={(e) => e.stopPropagation()}>
            <div className="settings-confirm-header-v2">
              <div className="settings-confirm-icon-v2">
                <AlertTriangle />
              </div>
              <h3 className="settings-confirm-title-v2">Réinitialiser les paramètres</h3>
            </div>
            <p className="settings-confirm-message-v2">
              Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ? 
              Cette action est irréversible et toutes vos modifications seront perdues.
            </p>
            <div className="settings-confirm-actions-v2">
              <button 
                className="settings-confirm-btn-v2 settings-confirm-btn-cancel-v2" 
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
              >
                <X />
                Annuler
              </button>
              <button 
                className="settings-confirm-btn-v2 settings-confirm-btn-confirm-v2" 
                onClick={confirmReset}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="settings-spinner-v2" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <Check />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
