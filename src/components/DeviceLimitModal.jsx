import React, { useState, useEffect } from 'react';
import { X, Smartphone, Monitor, Tablet, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import './DeviceLimitModal.css';

const DeviceLimitModal = ({ isOpen, onLogout, devices: initialDevices }) => {
  const [devices, setDevices] = useState(initialDevices || []);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const userDevices = await deviceService.getUserDevices();
      setDevices(userDevices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    try {
      setRemoving(deviceId);
      const result = await deviceService.removeDevice(deviceId);
      
      if (result.success) {
        // Recharger la liste des appareils
        await loadDevices();
        
        // Si moins de 2 appareils maintenant, essayer de réenregistrer l'appareil actuel
        const updatedDevices = await deviceService.getUserDevices();
        if (updatedDevices.length < 2) {
          const registerResult = await deviceService.registerDevice();
          if (registerResult.success) {
            // Fermer le modal et recharger la page
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.error('Error removing device:', error);
      alert('Erreur lors de la suppression de l\'appareil');
    } finally {
      setRemoving(null);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone size={20} />;
      case 'tablet':
        return <Tablet size={20} />;
      default:
        return <Monitor size={20} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="device-limit-overlay">
      <div className="device-limit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="device-limit-header">
          <div className="header-content">
            <AlertCircle size={32} className="alert-icon" />
            <div>
              <h2>Limite d'appareils atteinte</h2>
              <p>Vous ne pouvez pas vous connecter sur plus de 2 appareils</p>
            </div>
          </div>
        </div>

        <div className="device-limit-body">
          <div className="message-content">
            <div className="icon-wrapper">
              <Monitor size={48} />
              <Smartphone size={48} />
            </div>
            <h3>Vous êtes déjà connecté sur {devices.length} appareil{devices.length > 1 ? 's' : ''}</h3>
            <p>
              Votre compte est limité à 2 appareils simultanément pour des raisons de sécurité.
            </p>
            <p>
              Pour vous connecter sur cet appareil, veuillez vous déconnecter d'un appareil existant ci-dessous.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : devices.length > 0 ? (
            <div className="devices-list-modal">
              {devices.map((device) => (
                <div key={device.id} className="device-item-modal">
                  <div className="device-item-info">
                    <div className="device-icon-modal">
                      {getDeviceIcon(device.device_type)}
                    </div>
                    <div className="device-details-modal">
                      <h4>{device.device_name}</h4>
                      <p>{device.os} - {device.browser}</p>
                      <p className="device-date">Dernière connexion: {formatDate(device.last_login_at)}</p>
                    </div>
                  </div>
                  <button
                    className="remove-device-btn-modal"
                    onClick={() => handleRemoveDevice(device.id)}
                    disabled={removing === device.id}
                  >
                    {removing === device.id ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Déconnecter
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="device-limit-footer">
          <button className="close-btn-footer" onClick={onLogout}>
            Se déconnecter de cet appareil
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceLimitModal;
