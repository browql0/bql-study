import React from 'react';
import { X } from 'lucide-react';
import './ImageModal.css';

const ImageModal = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="image-modal-header">
          <h3>{title || 'Preuve de virement'}</h3>
          <button className="image-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="image-modal-body">
          <img src={imageUrl} alt="Preuve de paiement" />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
