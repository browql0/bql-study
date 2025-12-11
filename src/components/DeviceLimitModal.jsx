import React from 'react';
import { Smartphone, Monitor, AlertCircle } from 'lucide-react';
import './DeviceLimitModal.css';

const DeviceLimitModal = ({ isOpen, onLogout }) => {
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
            <h3>Vous êtes déjà connecté sur 2 appareils</h3>
            <p>
              Votre compte est limité à 2 appareils simultanément pour des raisons de sécurité.
            </p>
            <p>
              Pour vous connecter sur cet appareil, veuillez contacter un administrateur pour gérer vos appareils connectés.
            </p>
            <p style={{ marginTop: '16px', fontWeight: 500, color: '#374151' }}>
              Vous pouvez également vous déconnecter de cet appareil et vous reconnecter sur un autre appareil.
            </p>
          </div>
        </div>

        <div className="device-limit-footer">
          <button className="close-btn-footer" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceLimitModal;
