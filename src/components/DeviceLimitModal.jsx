import React from 'react';
import { X, Smartphone, Monitor, Tablet, AlertCircle } from 'lucide-react';
import './DeviceLimitModal.css';

const DeviceLimitModal = ({ isOpen, onClose }) => {

  if (!isOpen) return null;

  return (
    <div className="device-limit-overlay">
      <div className="device-limit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="device-limit-header">
          <div className="header-content">
            <AlertCircle size={32} className="alert-icon" />
            <div>
              <h2>Limite d'appareils atteinte</h2>
              <p>Vous êtes déjà connecté sur 2 appareils</p>
            </div>
          </div>
        </div>

        <div className="device-limit-body">
          <div className="message-content">
            <div className="icon-wrapper">
              <Monitor size={48} />
              <Smartphone size={48} />
            </div>
            <h3>Vous êtes déjà connecté sur plusieurs plateformes</h3>
            <p>
              Votre compte est limité à 2 appareils simultanément pour des raisons de sécurité.
            </p>
            <p>
              Si vous souhaitez vous connecter sur cet appareil, veuillez contacter un administrateur
              pour gérer vos appareils connectés.
            </p>
          </div>
        </div>

        <div className="device-limit-footer">
          <button className="close-btn-footer" onClick={onClose}>
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceLimitModal;
