import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService';

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    pricing: { monthly: 5, quarterly: 13, yearly: 45, basic: 5, premium: 10 },
    features: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdateSettings = async (newSettings) => {
    try {
      setSaving(true);
      await settingsService.updateSettings(newSettings);
      setSettings(newSettings);
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
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

  const handleSave = () => {
    handleUpdateSettings(settings);
  };

  return (
    <div className="dashboard-settings">
      <h3>Tarifs</h3>
      <div className="settings-group">
        <label>Mensuel:</label>
        <input type="number" value={settings.pricing.monthly} onChange={e => handlePriceChange('monthly', e.target.value)} />
        <label>Trimestriel:</label>
        <input type="number" value={settings.pricing.quarterly} onChange={e => handlePriceChange('quarterly', e.target.value)} />
        <label>Annuel:</label>
        <input type="number" value={settings.pricing.yearly} onChange={e => handlePriceChange('yearly', e.target.value)} />
      </div>

      <h3>Fonctionnalités</h3>
      <div className="settings-group">
        {Object.keys(settings.features).map(feature => (
          <div key={feature}>
            <input
              type="checkbox"
              id={feature}
              checked={settings.features[feature]}
              onChange={() => handleFeatureToggle(feature)}
            />
            <label htmlFor={feature}>{feature}</label>
          </div>
        ))}
      </div>
      
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
      </button>
    </div>
  );
};

export default SettingsTab;
