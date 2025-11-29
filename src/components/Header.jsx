import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { 
  Search, Moon, Sun, Plus, Menu, X, LogOut, User, BookOpen, 
  PlusCircle, SearchCode, BarChart3, Sparkles, Grid3x3, Settings,
  FileText, Image, Folder, Bell, AlertTriangle
} from 'lucide-react';
import { notificationsService } from '../services/notificationsService';
import { supabase } from '../lib/supabase';
import NotificationsPanel from './NotificationsPanel';
import './Header.css';

const Header = ({ onAddSubject, onOpenProfile, onOpenSearch, onOpenDashboard }) => {
  const { searchQuery, setSearchQuery, theme, toggleTheme, subjects, currentUser, logout, isAdmin } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const totalNotes = subjects.reduce((acc, subject) => {
    return acc + 
      (subject.cours?.notes?.length || 0) + 
      (subject.exercices?.notes?.length || 0) + 
      (subject.corrections?.notes?.length || 0);
  }, 0);
  
  const totalPhotos = subjects.reduce((acc, subject) => {
    return acc + 
      (subject.cours?.photos?.length || 0) + 
      (subject.exercices?.photos?.length || 0) + 
      (subject.corrections?.photos?.length || 0);
  }, 0);

  const totalFiles = subjects.reduce((acc, subject) => {
    return acc + 
      (subject.cours?.files?.length || 0) + 
      (subject.exercices?.files?.length || 0) + 
      (subject.corrections?.files?.length || 0);
  }, 0);

  // Charger le nombre de notifications non lues
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadUnreadCount = async () => {
      const result = await notificationsService.getUnreadCount(currentUser.id);
      if (result.success) {
        setUnreadCount(result.count);
      }
    };

    loadUnreadCount();

    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Gérer le modal de confirmation de déconnexion
  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showLogoutConfirm]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setMenuOpen(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="modern-header header-desktop">
        <div className="header-wrapper">
          {/* Top Bar - Search and Actions */}
          <div className="header-top-bar">
            <div className="header-brand">
              <div className="brand-icon-wrapper">
                <span className="brand-letter">B</span>
                <div className="brand-glow"></div>
              </div>
              <div className="brand-text">
                <h1 className="brand-title">Bql Study</h1>
                <span className="brand-subtitle">Votre espace d'apprentissage</span>
              </div>
            </div>

            {/* Center Search */}
            <div className="header-search-wrapper">
              <div className={`modern-search ${searchFocused ? 'focused' : ''}`}>
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Rechercher dans vos matières, notes, photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <button 
                  className="search-advanced-btn"
                  onClick={onOpenSearch}
                  title="Recherche avancée"
                >
                  <SearchCode size={18} />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="header-right-actions">
              {isAdmin() && (
                <button 
                  className="header-action-icon"
                  onClick={onAddSubject}
                  title="Nouvelle Matière"
                >
                  <PlusCircle size={22} />
                  <span className="action-tooltip">Nouvelle Matière</span>
                </button>
              )}

              <button 
                className="header-action-icon"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
              >
                {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                <span className="action-tooltip">{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
              </button>

              {isAdmin() && (
                <button 
                  className="header-action-icon"
                  onClick={onOpenDashboard}
                  title="Dashboard"
                >
                  <BarChart3 size={22} />
                  <span className="action-tooltip">Dashboard</span>
                </button>
              )}

              <button 
                className="header-action-icon notification-btn"
                onClick={() => setShowNotifications(true)}
                title="Notifications"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="notification-badge-header">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
                <span className="action-tooltip">Notifications</span>
              </button>

              <div className="header-user-menu">
                <button 
                  className="user-menu-trigger"
                  onClick={onOpenProfile}
                  title="Mon profil"
                >
                  <div className="user-avatar">
                    <User size={18} />
                  </div>
                  <span className="user-name">{currentUser?.email || currentUser?.name}</span>
                </button>
                <button 
                  className="logout-btn"
                  onClick={handleLogoutClick}
                  title="Déconnexion"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Stats */}
          <div className="header-bottom-bar">
            <div className="header-quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-label">Matières</span>
                <span className="quick-stat-number">{subjects.length}</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Notes</span>
                <span className="quick-stat-number">{totalNotes}</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Photos</span>
                <span className="quick-stat-number">{totalPhotos}</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Fichiers</span>
                <span className="quick-stat-number">{totalFiles}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - Completely New Design */}
      <header className="modern-header header-mobile">
        <div className="mobile-header-container">
          {/* Top Row: Brand + Menu Button */}
          <div className="mobile-header-top">
            <div className="mobile-brand">
              <div className="mobile-brand-icon">
                <BookOpen size={24} strokeWidth={2.5} />
                <div className="mobile-brand-glow"></div>
              </div>
              <div className="mobile-brand-text">
                <h1 className="mobile-brand-title">Bql Study</h1>
              </div>
            </div>
            <button 
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Search Bar Row */}
          <div className="mobile-header-search">
            <button 
              className="mobile-search-trigger"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search size={20} />
              <span className="mobile-search-placeholder">
                {searchQuery || "Rechercher..."}
              </span>
            </button>
          </div>

          {/* Stats Row */}
          <div className="mobile-header-stats">
            <div className="mobile-stat-item">
              <span className="mobile-stat-label">Matières</span>
              <span className="mobile-stat-value">{subjects.length}</span>
            </div>
            <div className="mobile-stat-item">
              <span className="mobile-stat-label">Notes</span>
              <span className="mobile-stat-value">{totalNotes}</span>
            </div>
            <div className="mobile-stat-item">
              <span className="mobile-stat-label">Photos</span>
              <span className="mobile-stat-value">{totalPhotos}</span>
            </div>
            <div className="mobile-stat-item">
              <span className="mobile-stat-label">Fichiers</span>
              <span className="mobile-stat-value">{totalFiles}</span>
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {mobileSearchOpen && (
          <div className="mobile-search-overlay">
            <div className="mobile-search-container">
              <div className="mobile-search-input-wrapper">
                <Search className="mobile-search-icon" size={20} />
                <input
                  type="text"
                  className="mobile-search-input"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button 
                  className="mobile-search-close-btn"
                  onClick={() => setMobileSearchOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <button 
                className="mobile-search-advanced"
                onClick={() => {
                  onOpenSearch();
                  setMobileSearchOpen(false);
                }}
              >
                <SearchCode size={18} />
                <span>Recherche avancée</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Menu Sidebar */}
        <div className={`mobile-menu-sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-header">
            <div className="mobile-menu-user">
              <div className="mobile-menu-avatar">
                <User size={24} />
              </div>
              <div className="mobile-menu-user-info">
                <div className="mobile-menu-user-name">
                  {currentUser?.email || currentUser?.name || 'Utilisateur'}
                </div>
                <div className="mobile-menu-user-role">
                  {isAdmin() ? 'Administrateur' : 'Étudiant'}
                </div>
              </div>
            </div>
            <button 
              className="mobile-menu-close"
              onClick={() => setMenuOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          <div className="mobile-menu-stats">
            <div className="mobile-menu-stat">
              <div className="mobile-menu-stat-icon">
                <BookOpen size={24} />
              </div>
              <div className="mobile-menu-stat-content">
                <div className="mobile-menu-stat-value">{subjects.length}</div>
                <div className="mobile-menu-stat-label">Matières</div>
              </div>
            </div>
            <div className="mobile-menu-stat">
              <div className="mobile-menu-stat-icon">
                <FileText size={24} />
              </div>
              <div className="mobile-menu-stat-content">
                <div className="mobile-menu-stat-value">{totalNotes}</div>
                <div className="mobile-menu-stat-label">Notes</div>
              </div>
            </div>
            <div className="mobile-menu-stat">
              <div className="mobile-menu-stat-icon">
                <Image size={24} />
              </div>
              <div className="mobile-menu-stat-content">
                <div className="mobile-menu-stat-value">{totalPhotos}</div>
                <div className="mobile-menu-stat-label">Photos</div>
              </div>
            </div>
            <div className="mobile-menu-stat">
              <div className="mobile-menu-stat-icon">
                <Folder size={24} />
              </div>
              <div className="mobile-menu-stat-content">
                <div className="mobile-menu-stat-value">{totalFiles}</div>
                <div className="mobile-menu-stat-label">Fichiers</div>
              </div>
            </div>
          </div>

          <div className="mobile-menu-actions">
            <button 
              className="mobile-menu-action primary"
              onClick={() => {
                onOpenProfile();
                setMenuOpen(false);
              }}
            >
              <User size={22} />
              <span>Mon Profil</span>
            </button>
            
            <button 
              className="mobile-menu-action"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
              <span>{theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}</span>
            </button>
            
            {isAdmin() && (
              <>
                <button 
                  className="mobile-menu-action"
                  onClick={() => {
                    onAddSubject();
                    setMenuOpen(false);
                  }}
                >
                  <PlusCircle size={22} />
                  <span>Nouvelle Matière</span>
                </button>
                <button 
                  className="mobile-menu-action"
                  onClick={() => {
                    onOpenDashboard();
                    setMenuOpen(false);
                  }}
                >
                  <BarChart3 size={22} />
                  <span>Dashboard</span>
                </button>
              </>
            )}
            
            <button 
              className="mobile-menu-action notification-menu-item"
              onClick={() => {
                setShowNotifications(true);
                setMenuOpen(false);
              }}
            >
              <Bell size={22} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-badge-mobile">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            
            <button 
              className="mobile-menu-action"
              onClick={() => {
                onOpenSearch();
                setMenuOpen(false);
              }}
            >
              <SearchCode size={22} />
              <span>Recherche Avancée</span>
            </button>
            
            <button 
              className="mobile-menu-action danger"
              onClick={handleLogoutClick}
            >
              <LogOut size={22} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Backdrop */}
        {menuOpen && (
          <div 
            className="mobile-menu-backdrop"
            onClick={() => setMenuOpen(false)}
          ></div>
        )}
      </header>

      {/* Notifications Panel */}
      {showNotifications && currentUser?.id && (
        <NotificationsPanel
          userId={currentUser.id}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="modal-overlay mobile-modal-overlay" onClick={cancelLogout}>
          <div className="modal mobile-modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header mobile-modal-header">
              <h2>Confirmer la déconnexion</h2>
              <button className="btn-icon mobile-close-btn" onClick={cancelLogout} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body mobile-modal-body">
              <div className="confirm-content">
                <div className="alert-icon">
                  <AlertTriangle size={56} strokeWidth={2.5} />
                </div>
                <div className="confirm-text">
                  <p className="confirm-question">Voulez-vous vraiment vous déconnecter ?</p>
                  <p className="warning-text">Vous devrez vous reconnecter pour accéder à votre compte.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer mobile-modal-footer">
              <button type="button" className="btn btn-secondary mobile-btn" onClick={cancelLogout}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger mobile-btn" onClick={confirmLogout}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
