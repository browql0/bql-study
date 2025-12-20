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
  CreditCard,
  FileText,
  MessageSquare,
  Users,
  Bell,
  Globe,
  Eye,
  Download,
  TrendingUp
} from 'lucide-react';
import './SettingsTab.css';

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    pricing: { monthly: 25, quarterly: 60, yearly: 100 },
    features: {
      dark_mode: false,
      notifications: true,
      file_upload: true,
      public_profiles: false,
      comments: true,
      chat: false
    },
    emails: {
      support: '',
      admin: '',
      noreply: ''
    },
    permissions: {
      manage_users: true,
      manage_content: true,
      manage_payments: false,
      view_analytics: true
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

  const handleUpdateSettings = async (newSettings) => {
    try {
      setSaving(true);
      await settingsService.saveSettings(newSettings);
      setSettings(newSettings);
      showNotification('✓ Paramètres sauvegardés avec succès !', 'success');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showNotification('✗ Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await settingsService.resetToDefaults();
      await loadSettings();
      showNotification('✓ Paramètres réinitialisés avec succès', 'success');
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      showNotification('✗ Erreur lors de la réinitialisation', 'error');
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Chargement des paramètres...</p>
      </div>
    );
  }

  const handlePriceChange = (plan, value) => {
    const newSettings = {
      ...settings,
      pricing: { ...settings.pricing, [plan]: parseFloat(value) || 0 }
    };
    setSettings(newSettings);
  };

  const handleFeatureToggle = (feature) => {
    const newSettings = {
      ...settings,
      features: { ...settings.features, [feature]: !settings.features[feature] }
    };
    setSettings(newSettings);
  };

  const handleEmailChange = (emailKey, value) => {
    const newSettings = {
      ...settings,
      emails: { ...settings.emails, [emailKey]: value }
    };
    setSettings(newSettings);
  };

  const handlePermissionToggle = (permission) => {
    const newSettings = {
      ...settings,
      permissions: { ...settings.permissions, [permission]: !settings.permissions[permission] }
    };
    setSettings(newSettings);
  };

  const handleSave = () => {
    handleUpdateSettings(settings);
  };

  const handleResetClick = () => {
    setShowConfirmModal(true);
  };

  const featuresList = [
    { key: 'dark_mode', icon: <Eye size={20} />, label: 'Mode Sombre', description: 'Interface en mode nuit' },
    { key: 'notifications', icon: <Bell size={20} />, label: 'Notifications', description: 'Alertes en temps réel' },
    { key: 'file_upload', icon: <Download size={20} />, label: 'Upload Fichiers', description: 'Import de documents' },
    { key: 'public_profiles', icon: <Globe size={20} />, label: 'Profils Publics', description: 'Visibilité des profils' },
    { key: 'comments', icon: <MessageSquare size={20} />, label: 'Commentaires', description: 'Système de discussion' },
    { key: 'chat', icon: <MessageSquare size={20} />, label: 'Chat Direct', description: 'Messagerie instantanée' }
  ];

  const emailsList = [
    { key: 'support', icon: <Mail size={20} />, label: 'Support', placeholder: 'support@example.com' },
    { key: 'admin', icon: <Shield size={20} />, label: 'Admin', placeholder: 'admin@example.com' },
    { key: 'noreply', icon: <Mail size={20} />, label: 'No-Reply', placeholder: 'noreply@example.com' }
  ];

  const permissionsList = [
    { key: 'manage_users', icon: <Users size={20} />, label: 'Gérer Utilisateurs', description: 'CRUD utilisateurs' },
    { key: 'manage_content', icon: <FileText size={20} />, label: 'Gérer Contenu', description: 'Édition du contenu' },
    { key: 'manage_payments', icon: <CreditCard size={20} />, label: 'Gérer Paiements', description: 'Accès financier' },
    { key: 'view_analytics', icon: <TrendingUp size={20} />, label: 'Analytics', description: 'Statistiques avancées' }
  ];

  return (
    <div className="settings-tab">
      {/* Premium Header */}
      <div className="stats-header-premium">
        <div>
          <h2 className="stats-title-gradient">Paramètres</h2>
          <p className="stats-subtitle">Configurez votre application selon vos besoins.</p>
        </div>
        <div className="settings-header-actions">
          <button
            className="settings-btn settings-btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="settings-spinner-small"></div>
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Sauvegarder</span>
              </>
            )}
          </button>
          <button
            className="settings-btn settings-btn-reset"
            onClick={handleResetClick}
            disabled={saving}
          >
            <RotateCcw size={20} />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`settings-toast settings-toast-${notification.type}`}>
          {notification.type === 'success' ? <Check size={22} /> : <X size={22} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="settings-cards-grid">
        {/* Pricing Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <DollarSign size={24} />
            </div>
            <div className="settings-card-title-block">
              <h3>Tarification</h3>
              <p>Configurez vos prix d'abonnement</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="pricing-input-group">
              <label>
                <CreditCard size={18} />
                <span>Mensuel (DH)</span>
              </label>
              <input
                type="number"
                value={settings.pricing?.monthly || 25}
                onChange={(e) => handlePriceChange('monthly', e.target.value)}
                min="0"
                step="1"
                placeholder="25"
              />
            </div>
            <div className="pricing-input-group">
              <label>
                <TrendingUp size={18} />
                <span>Trimestriel (DH)</span>
              </label>
              <input
                type="number"
                value={settings.pricing?.quarterly || 65}
                onChange={(e) => handlePriceChange('quarterly', e.target.value)}
                min="0"
                step="1"
                placeholder="60"
              />
            </div>
            <div className="pricing-input-group">
              <label>
                <CreditCard size={18} />
                <span>Annuel (DH)</span>
              </label>
              <input
                type="number"
                value={settings.pricing?.yearly || 100}
                onChange={(e) => handlePriceChange('yearly', e.target.value)}
                min="0"
                step="1"
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Features Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Zap size={24} />
            </div>
            <div className="settings-card-title-block">
              <h3>Fonctionnalités</h3>
              <p>Activez ou désactivez les modules</p>
            </div>
          </div>
          <div className="settings-card-body">
            {featuresList.map(feature => (
              <div key={feature.key} className="feature-toggle-item">
                <div className="feature-toggle-info">
                  <div className="feature-toggle-icon">{feature.icon}</div>
                  <div className="feature-toggle-text">
                    <span className="feature-toggle-label">{feature.label}</span>
                    <span className="feature-toggle-desc">{feature.description}</span>
                  </div>
                </div>
                <label className="toggle-switch-modern">
                  <input
                    type="checkbox"
                    checked={settings.features?.[feature.key] || false}
                    onChange={() => handleFeatureToggle(feature.key)}
                  />
                  <span className="toggle-slider-modern"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Emails Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
              <Mail size={24} />
            </div>
            <div className="settings-card-title-block">
              <h3>Configuration Email</h3>
              <p>Adresses email système</p>
            </div>
          </div>
          <div className="settings-card-body">
            {emailsList.map(email => (
              <div key={email.key} className="email-input-group">
                <label>
                  {email.icon}
                  <span>{email.label}</span>
                </label>
                <input
                  type="email"
                  placeholder={email.placeholder}
                  value={settings.emails?.[email.key] || ''}
                  onChange={(e) => handleEmailChange(email.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Shield size={24} />
            </div>
            <div className="settings-card-title-block">
              <h3>Permissions Admin</h3>
              <p>Contrôle d'accès avancé</p>
            </div>
          </div>
          <div className="settings-card-body">
            {permissionsList.map(permission => (
              <div key={permission.key} className="permission-item-modern">
                <label className="permission-item-label">
                  <input
                    type="checkbox"
                    className="permission-checkbox-modern"
                    checked={settings.permissions?.[permission.key] || false}
                    onChange={() => handlePermissionToggle(permission.key)}
                  />
                  <div className="permission-item-icon">{permission.icon}</div>
                  <div className="permission-item-text">
                    <span className="permission-item-title">{permission.label}</span>
                    <span className="permission-item-desc">{permission.description}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="settings-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-modal-icon">
                <AlertTriangle size={36} />
              </div>
              <h3>Confirmer la Réinitialisation</h3>
            </div>
            <div className="settings-modal-body">
              <p>Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?</p>
              <p className="settings-modal-warning">
                <AlertTriangle size={16} />
                Cette action est irréversible !
              </p>
            </div>
            <div className="settings-modal-actions">
              <button
                className="settings-modal-btn settings-modal-btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                <X size={20} />
                Annuler
              </button>
              <button
                className="settings-modal-btn settings-modal-btn-confirm"
                onClick={handleReset}
              >
                <RotateCcw size={20} />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
