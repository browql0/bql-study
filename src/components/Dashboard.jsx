import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, DollarSign, Gift, Users, Settings, Home, Menu, X } from 'lucide-react';
import StatsTab from './dashboard/StatsTab';
import RevenueTab from './dashboard/RevenueTab';
import VouchersTab from './dashboard/VouchersTab';
import UsersTab from './dashboard/UsersTab';
import SettingsTab from './dashboard/SettingsTab';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handle responsive sidebar on initial load and resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when changing tabs
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [activeTab]);

  const getPageTitle = () => {
    switch(activeTab) {
      case 'stats': return 'Statistiques';
      case 'revenue': return 'Statistiques de Revenus';
      case 'vouchers': return 'Gestion Codes Promo';
      case 'manage-users': return 'Gestion Utilisateurs';
      case 'settings': return 'Paramètres et Configuration';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity size={28} />
            {sidebarOpen && <span>Admin Dashboard</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span>Statistiques</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            <DollarSign size={20} />
            {sidebarOpen && <span>Revenus</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            <Gift size={20} />
            {sidebarOpen && <span>Codes Promo</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'manage-users' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage-users')}
          >
            <Users size={20} />
            {sidebarOpen && <span>Utilisateurs</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            {sidebarOpen && <span>Paramètres</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="sidebar-item"
            onClick={() => window.location.reload()}
          >
            <Home size={20} />
            {sidebarOpen && <span>Retour Accueil</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <button 
            className="sidebar-toggle-mobile"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <h1>{getPageTitle()}</h1>
        </div>

        <div className="dashboard-content">
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'revenue' && <RevenueTab />}
          {activeTab === 'vouchers' && <VouchersTab />}
          {activeTab === 'manage-users' && <UsersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
