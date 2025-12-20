import React from 'react';
import { Activity, BarChart3, DollarSign, Clock, Gift, Users, Settings, Home, Smartphone, BookOpen } from 'lucide-react';
import './DashboardNavigation.css';

const DashboardNavigation = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="dashboard-sidebar open">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="brand-icon-wrapper">
            <span className="brand-letter">B</span>
            <div className="brand-glow"></div>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Bql Study</h1>
            <span className="brand-subtitle">Admin Panel</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={20} />
          <span>Statistiques</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          <DollarSign size={20} />
          <span>Revenus</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'pending-payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending-payments')}
        >
          <Clock size={20} />
          <span>Paiements</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'vouchers' ? 'active' : ''}`}
          onClick={() => setActiveTab('vouchers')}
        >
          <Gift size={20} />
          <span>Codes Promo</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'manage-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-users')}
        >
          <Users size={20} />
          <span>Utilisateurs</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <Smartphone size={20} />
          <span>Appareils</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <BookOpen size={20} />
          <span>Bibliothèque</span>
        </button>
        <button
          className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span>Paramètres</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-item"
          onClick={() => window.location.reload()}
        >
          <Home size={20} />
          <span>Retour Accueil</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardNavigation;
