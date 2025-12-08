import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContextSupabase';
import { Bell, Check, X, Calendar } from 'lucide-react';
import './UserNotifications.css';

const UserNotifications = () => {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      loadNotifications();
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="user-notifications-container">
        <div className="loading-spinner">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="user-notifications-container">
      {/* Header */}
      <div className="list-header">
        <div className="section-title-wrapper">
          <div className="section-title-icon">
            <Bell size={28} strokeWidth={2.5} />
          </div>
          <div className="section-title-text">
            <h2 className="section-title">
              <span className="main-title">Notifications</span>
              <span className="subtitle">{notifications.length} notification{notifications.length > 1 ? 's' : ''} • {unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
            </h2>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="list-actions">
            <button className="mark-all-btn" onClick={markAllAsRead}>
              <Check size={18} />
              Tout marquer comme lu
            </button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="no-notifications">
          <div className="empty-icon">
            <Bell size={64} />
          </div>
          <h3>Aucune notification</h3>
          <p>Vous n'avez pas encore reçu de notifications</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-card ${!notification.read ? 'unread' : ''}`}
            >
              <div className="notification-avatar">
                <Bell size={20} />
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <h3>{notification.title}</h3>
                  {!notification.read && <span className="unread-dot"></span>}
                </div>
                <p>{notification.message}</p>
                <div className="notification-footer">
                  <div className="notification-date">
                    <Calendar size={14} />
                    {formatDate(notification.created_at)}
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="action-btn mark-read"
                        onClick={() => markAsRead(notification.id)}
                        title="Marquer comme lu"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button 
                      className="action-btn delete"
                      onClick={() => deleteNotification(notification.id)}
                      title="Supprimer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserNotifications;
