import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, Trash2, FileText, Image, User, CreditCard, Gift, AlertCircle } from 'lucide-react';
import { notificationsService } from '../services/notificationsService';
import { supabase } from '../lib/supabase';
import './NotificationsPanel.css';

const NotificationsPanel = ({ userId, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      console.log('[NotificationsPanel] Loading notifications for user:', userId);
      const result = await notificationsService.getAllNotifications(userId);
      console.log('[NotificationsPanel] Notifications result:', result);
      if (result.success) {
        console.log('[NotificationsPanel] Loaded notifications:', result.data?.length || 0);
        setNotifications(result.data || []);
      } else {
        console.error('[NotificationsPanel] Error loading notifications:', result.error);
      }

      const countResult = await notificationsService.getUnreadCount(userId);
      console.log('[NotificationsPanel] Unread count result:', countResult);
      if (countResult.success) {
        setUnreadCount(countResult.count || 0);
      }
    } catch (error) {
      console.error('[NotificationsPanel] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload.new);
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Notification updated:', payload.new);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === payload.new.id ? payload.new : notif
            )
          );
          if (payload.new.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('Notifications channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    const result = await notificationsService.markAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await notificationsService.markAllAsRead(userId);
    if (result.success) {
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (notificationId) => {
    const result = await notificationsService.deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      const notif = notifications.find((n) => n.id === notificationId);
      if (notif && !notif.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_file':
        return <FileText size={20} />;
      case 'new_photo':
        return <Image size={20} />;
      case 'new_note':
        return <FileText size={20} />;
      case 'new_quiz':
        return <Gift size={20} />;
      case 'trial_expiry':
        return <AlertCircle size={20} />;
      case 'subscription_expiry':
        return <AlertCircle size={20} />;
      case 'custom_admin':
        return <Gift size={20} />;
      case 'new_user':
        return <User size={20} />;
      case 'new_payment':
        return <CreditCard size={20} />;
      case 'voucher_expired':
        return <Gift size={20} />;
      default:
        return <Bell size={20} />;
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
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="notifications-panel-overlay" onClick={onClose}>
      <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <div className="notifications-header-title">
            <Bell size={24} />
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="notifications-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-header-actions">
            {unreadCount > 0 && (
              <button
                className="notifications-action-btn"
                onClick={handleMarkAllAsRead}
                title="Tout marquer comme lu"
              >
                <Check size={18} />
              </button>
            )}
            <button
              className="notifications-action-btn"
              onClick={onClose}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="notifications-body">
          {loading ? (
            <div className="notifications-loading">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <Bell size={48} />
              <p>Aucune notification</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Les notifications apparaîtront ici lorsqu'un nouveau fichier ou photo est ajouté.
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                Vérifiez que vous êtes connecté en tant que spectateur et que les notifications sont activées dans votre profil.
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification, index) => {
                if (!notification) return null;
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''} type-${notification.type}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header-item">
                        <h3 className="notification-title">{notification.title}</h3>
                      </div>
                      <p className="notification-message">{notification.message}</p>
                      <span className="notification-time">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <div className="notification-actions">
                      {!notification.read && (
                        <button
                          className="notification-action-btn"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Marquer comme lu"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="notification-action-btn"
                        onClick={() => handleDelete(notification.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;

