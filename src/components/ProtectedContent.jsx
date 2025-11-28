import React from 'react';
import { Lock, CreditCard } from 'lucide-react';
import './ProtectedContent.css';

const ProtectedContent = ({ 
  children, 
  hasAccess, 
  onUpgrade,
  message = "Accès réservé aux membres Premium"
}) => {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="protected-content">
      <div className="protected-overlay">
        <div className="protected-card">
          <div className="protected-icon">
            <Lock size={48} />
          </div>
          <h3>Contenu Premium</h3>
          <p>{message}</p>
          <button 
            className="btn-primary btn-upgrade"
            onClick={onUpgrade}
          >
            <CreditCard size={20} />
            Passer à Premium
          </button>
          <div className="protected-features">
            <p>✨ Accès illimité à tout le contenu</p>
            <p>📚 Notes, Quiz, Photos et Fichiers</p>
            <p>🎓 Support prioritaire</p>
          </div>
        </div>
      </div>
      <div className="protected-blur">
        {children}
      </div>
    </div>
  );
};

export default ProtectedContent;
