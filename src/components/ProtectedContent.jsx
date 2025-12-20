import React from 'react';
import { Lock, Sparkles, CheckCircle, Crown } from 'lucide-react';
import './ProtectedContent.css';

const ProtectedContent = ({
  children,
  hasAccess,
  onUpgrade,
  message = "Accès réservé aux membres Premium :)"
}) => {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="protected-content-wrapper">
      {/* Background Blur Overlay */}
      <div className="protected-content-blur">
        {children}
      </div>

      {/* Premium Lock Overlay */}
      <div className="protected-overlay-container">

        <div className="premium-lock-card">
          {/* BACKGROUND LAYER (Handles shine & overflow) */}
          <div className="card-background-layer">
            <div className="card-shine-effect"></div>
          </div>

          {/* CONTENT LAYER (Visible overflow for animations) */}
          <div className="card-content-layer">
            <div className="lock-icon-container">
              <div className="lock-ring"></div>
              <Lock size={42} className="lock-icon" />
              <div className="lock-glow"></div>
            </div>

            <div className="lock-content">
              <h3>{message}</h3>
              <p className="lock-description">
                Débloquez l'accès complet à cette ressource et profitez d'une expérience d'apprentissage sans limites.
              </p>

              <div className="premium-benefits-list">
                <div className="benefit-item">
                  <CheckCircle size={16} className="benefit-icon" />
                  <span>Accès illimité aux fichiers & photos</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={16} className="benefit-icon" />
                  <span>Quiz et flashcards exclusifs</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={16} className="benefit-icon" />
                  <span>Support prioritaire 24/7</span>
                </div>
              </div>

              <button
                className="premium-upgrade-btn"
                onClick={onUpgrade}
              >
                <Crown size={20} />
                <span>Passer au Premium</span>
                <div className="btn-shine"></div>
              </button>

              <p className="trial-hint">
                <Sparkles size={12} /> 7 jours d'essai gratuit disponibles pour les nouveaux membres
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedContent;
