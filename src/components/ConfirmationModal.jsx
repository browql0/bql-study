import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, title, message, type = 'success' }) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="confirmation-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className={`confirmation-icon ${type}`}>
          <CheckCircle size={60} />
        </div>
        
        <h2 className="confirmation-title">{title}</h2>
        <p className="confirmation-message">{message}</p>
        
        <button className="confirmation-button" onClick={onClose}>
          D'accord
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;
