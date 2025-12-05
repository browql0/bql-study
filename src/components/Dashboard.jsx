import React, { useState } from 'react';
import DashboardNavigation from './DashboardNavigation';
import StatsTab from './dashboard/StatsTab';
import RevenueTab from './dashboard/RevenueTab';
import VouchersTab from './dashboard/VouchersTab';
import UsersTab from './dashboard/UsersTab';
import SettingsTab from './dashboard/SettingsTab';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');

  const getPageTitle = () => {
    switch(activeTab) {
      case 'stats': return 'Statistiques';
      case 'revenue': return 'Revenus';
      case 'vouchers': return 'Codes Promo';
      case 'manage-users': return 'Utilisateurs';
      case 'settings': return 'Paramètres';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar & Mobile Navigation */}
      <DashboardNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
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
