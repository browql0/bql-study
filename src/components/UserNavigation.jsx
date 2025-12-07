import React from 'react';
import { Home, BookOpen, Bell, CreditCard, Settings, UserCircle } from 'lucide-react';
import './UserNavigation.css';

const UserNavigation = ({ activeView, setActiveView }) => {
  return (
    <nav className="user-nav">
      <button 
        className={`user-nav-item ${activeView === 'home' ? 'active' : ''}`}
        onClick={() => setActiveView('home')}
        aria-label="Accueil"
      >
        <Home size={24} />
      </button>
      
      <button 
        className={`user-nav-item ${activeView === 'resources' ? 'active' : ''}`}
        onClick={() => setActiveView('resources')}
        aria-label="Bibliothèque"
      >
        <BookOpen size={24} />
      </button>
      
      <button 
        className={`user-nav-item ${activeView === 'profile' ? 'active' : ''}`}
        onClick={() => setActiveView('profile')}
        aria-label="Profil"
      >
        <UserCircle size={24} />
      </button>
      
      <button 
        className={`user-nav-item ${activeView === 'notifications' ? 'active' : ''}`}
        onClick={() => setActiveView('notifications')}
        aria-label="Notifications"
      >
        <Bell size={24} />
      </button>
      
      <button 
        className={`user-nav-item ${activeView === 'payments' ? 'active' : ''}`}
        onClick={() => setActiveView('payments')}
        aria-label="Historique Paiements"
      >
        <CreditCard size={24} />
      </button>
      
      <button 
        className={`user-nav-item ${activeView === 'settings' ? 'active' : ''}`}
        onClick={() => setActiveView('settings')}
        aria-label="Paramètres"
      >
        <Settings size={24} />
      </button>
    </nav>
  );
};

export default UserNavigation;
