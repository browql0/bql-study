import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, UserCheck, UserX, Activity, TrendingUp, Calendar, Clock, Shield, Eye, Mail, Award, Zap } from 'lucide-react';
import './StatsTab.css';

const StatCard = ({ icon, label, value, type, color, trend }) => (
  <div className={`stat-card-enhanced ${type}`}>
    <div className="stat-card-header">
      <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        {React.cloneElement(icon, { size: window.innerWidth < 768 ? 20 : 28 })}
      </div>
      {trend && (
        <div className={`stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
          <TrendingUp size={window.innerWidth < 768 ? 12 : 16} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <div className="stat-card-body">
      <span className="stat-value-large">{value}</span>
      <span className="stat-label-small">{label}</span>
    </div>
  </div>
);

const getActivityStatus = (lastSignIn) => {
  if (!lastSignIn) return { status: 'Jamais connecté', color: '#6b7280', icon: '⚪' };
  
  const now = Date.now();
  const lastSignInTime = new Date(lastSignIn).getTime();
  const diff = now - lastSignInTime;

  const fiveMinutes = 5 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  if (diff < fiveMinutes) return { status: 'En ligne', color: '#10b981', icon: '🟢' };
  if (diff < oneHour) return { status: 'Actif', color: '#06b6d4', icon: '🔵' };
  if (diff < oneDay) return { status: 'Aujourd\'hui', color: '#3b82f6', icon: '🟦' };
  if (diff < oneWeek) return { status: 'Cette semaine', color: '#f59e0b', icon: '🟡' };
  return { status: 'Inactif', color: '#ef4444', icon: '🔴' };
};

const getSubscriptionBadge = (user) => {
  if (user.subscription_status === 'premium' && user.subscription_end_date) {
    const endDate = new Date(user.subscription_end_date);
    if (endDate > new Date()) {
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      return { 
        label: 'Premium', 
        color: '#10b981', 
        icon: '👑',
        daysLeft: daysLeft 
      };
    }
  }
  if (user.subscription_status === 'trial') {
    return { label: 'Essai', color: '#3b82f6', icon: '⏳' };
  }
  return { label: 'Gratuit', color: '#6b7280', icon: '🆓' };
};

const StatsTab = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    spectatorUsers: 0,
    recentSignups: []
  });
  const [loading, setLoading] = useState(true);

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          onlineUsers: 0,
          inactiveUsers: 0,
          adminUsers: 0,
          spectatorUsers: 0,
          recentSignups: []
        });
        setLoading(false);
        return;
      }

      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      const onlineUsers = profiles.filter(user => {
        if (!user.last_sign_in_at) return false;
        const lastSignIn = new Date(user.last_sign_in_at).getTime();
        return lastSignIn > fiveMinutesAgo;
      });

      const activeUsers = profiles.filter(user => {
        if (!user.last_sign_in_at) return false;
        const lastSignIn = new Date(user.last_sign_in_at).getTime();
        return lastSignIn > oneDayAgo;
      });

      const adminUsers = profiles.filter(user => user.role === 'admin');
      const spectatorUsers = profiles.filter(user => user.role === 'spectator' || !user.role);

      setStats({
        totalUsers: profiles.length,
        onlineUsers: onlineUsers.length,
        activeUsers: activeUsers.length,
        inactiveUsers: profiles.length - activeUsers.length,
        adminUsers: adminUsers.length,
        spectatorUsers: spectatorUsers.length,
        recentSignups: profiles.slice(0, 10)
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStats();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchUserStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUserStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    );
  }

  // Calculate trends (mock data - you can replace with real calculations)
  const trends = {
    total: +5.2,
    online: +12.4,
    active: +8.1,
    inactive: -3.2,
    admin: 0,
    spectator: +7.5
  };

  return (
    <div className="dashboard-stats-enhanced fade-in">
      {/* Overview Cards */}
      <div className="stats-overview">
        <StatCard 
          icon={<Users size={28} />} 
          label="Total Utilisateurs" 
          value={stats.totalUsers} 
          type="total"
          color="#3b82f6"
          trend={trends.total}
        />
        <StatCard 
          icon={<Activity size={28} />} 
          label="En ligne" 
          value={stats.onlineUsers} 
          type="online"
          color="#10b981"
          trend={trends.online}
        />
        <StatCard 
          icon={<UserCheck size={28} />} 
          label="Actifs (24h)" 
          value={stats.activeUsers} 
          type="active"
          color="#06b6d4"
          trend={trends.active}
        />
        <StatCard 
          icon={<UserX size={28} />} 
          label="Inactifs" 
          value={stats.inactiveUsers} 
          type="inactive"
          color="#ef4444"
          trend={trends.inactive}
        />
      </div>

      {/* Role Distribution */}
      <div className="stats-row">
        <div className="stats-card role-distribution">
          <div className="card-header">
            <Shield size={20} />
            <h3>Rôles</h3>
          </div>
          <div className="role-stats">
            <div className="role-item">
              <div className="role-icon admin-role">
                <Shield size={window.innerWidth < 768 ? 20 : 24} />
              </div>
              <div className="role-info">
                <span className="role-count">{stats.adminUsers}</span>
                <span className="role-label">Administrateurs</span>
              </div>
              <div className="role-percentage">
                {stats.totalUsers > 0 ? ((stats.adminUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="role-item">
              <div className="role-icon spectator-role">
                <Eye size={window.innerWidth < 768 ? 20 : 24} />
              </div>
              <div className="role-info">
                <span className="role-count">{stats.spectatorUsers}</span>
                <span className="role-label">Spectateurs</span>
              </div>
              <div className="role-percentage">
                {stats.totalUsers > 0 ? ((stats.spectatorUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
          <div className="role-bar">
            <div 
              className="role-bar-segment admin" 
              style={{ width: stats.totalUsers > 0 ? `${(stats.adminUsers / stats.totalUsers) * 100}%` : '0%' }}
            />
            <div 
              className="role-bar-segment spectator" 
              style={{ width: stats.totalUsers > 0 ? `${(stats.spectatorUsers / stats.totalUsers) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-card quick-stats">
          <div className="card-header">
            <Zap size={20} />
            <h3>Stats Rapides</h3>
          </div>
          <div className="quick-stats-grid">
            <div className="quick-stat-item">
              <Mail size={window.innerWidth < 768 ? 18 : 20} />
              <div>
                <span className="quick-stat-value">{stats.totalUsers}</span>
                <span className="quick-stat-label">Emails</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <Award size={window.innerWidth < 768 ? 18 : 20} />
              <div>
                <span className="quick-stat-value">
                  {stats.recentSignups?.filter(u => u.subscription_status === 'premium').length || 0}
                </span>
                <span className="quick-stat-label">Premium</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <TrendingUp size={window.innerWidth < 768 ? 18 : 20} />
              <div>
                <span className="quick-stat-value">
                  {stats.recentSignups?.length || 0}
                </span>
                <span className="quick-stat-label">Nouveaux</span>
              </div>
            </div>
            <div className="quick-stat-item">
              <Activity size={window.innerWidth < 768 ? 18 : 20} />
              <div>
                <span className="quick-stat-value">
                  {((stats.activeUsers / (stats.totalUsers || 1)) * 100).toFixed(0)}%
                </span>
                <span className="quick-stat-label">Activité</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users Table */}
      <div className="stats-card recent-users-table">
        <div className="card-header">
          <Calendar size={20} />
          <h3>Utilisateurs Récents</h3>
          <span className="card-badge">{stats.recentSignups?.length || 0} utilisateurs</span>
        </div>
        
        {/* Desktop Table */}
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Statut</th>
                <th>Rôle</th>
                <th>Abonnement</th>
                <th>Inscription</th>
                <th>Dernière Activité</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSignups && stats.recentSignups.length > 0 ? (
                stats.recentSignups.map((user) => {
                  const activity = getActivityStatus(user.last_sign_in_at);
                  const subscription = getSubscriptionBadge(user);
                  return (
                    <tr key={user.id} className="user-row">
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-mini">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info-mini">
                            <span className="user-name-mini">{user.name || 'Sans nom'}</span>
                            <span className="user-email-mini">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ 
                            color: activity.color,
                            backgroundColor: `${activity.color}20`,
                            borderColor: `${activity.color}50`
                          }}
                        >
                          <span className="status-icon">{activity.icon}</span>
                          {activity.status}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role || 'spectator'}`}>
                          {user.role === 'admin' ? (
                            <>
                              <Shield size={14} />
                              Admin
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              Spectateur
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="subscription-badge"
                          style={{ 
                            color: subscription.color,
                            backgroundColor: `${subscription.color}20`,
                            borderColor: `${subscription.color}50`
                          }}
                        >
                          <span>{subscription.icon}</span>
                          {subscription.label}
                          {subscription.daysLeft && (
                            <span className="days-left"> ({subscription.daysLeft}j)</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Clock size={14} />
                          <span>{new Date(user.created_at).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          {user.last_sign_in_at ? (
                            <>
                              <Activity size={14} />
                              <span>{new Date(user.last_sign_in_at).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short'
                              })}</span>
                            </>
                          ) : (
                            <span className="no-activity">Jamais</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table">
                    <div className="empty-state">
                      <Users size={48} />
                      <p>Aucune inscription récente</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-users-list">
          {stats.recentSignups && stats.recentSignups.length > 0 ? (
            stats.recentSignups.map((user) => {
              const activity = getActivityStatus(user.last_sign_in_at);
              const subscription = getSubscriptionBadge(user);
              return (
                <div key={user.id} className="mobile-user-card">
                  <div className="mobile-user-header">
                    <div className="mobile-user-avatar">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="mobile-user-info">
                      <span className="mobile-user-name">{user.name || 'Sans nom'}</span>
                      <span className="mobile-user-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="mobile-user-badges">
                    <span 
                      className="status-badge"
                      style={{ 
                        color: activity.color,
                        backgroundColor: `${activity.color}20`,
                        borderColor: `${activity.color}50`
                      }}
                    >
                      <span className="status-icon">{activity.icon}</span>
                      {activity.status}
                    </span>
                    <span className={`role-badge ${user.role || 'spectator'}`}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield size={14} />
                          Admin
                        </>
                      ) : (
                        <>
                          <Eye size={14} />
                          Spectateur
                        </>
                      )}
                    </span>
                    <span 
                      className="subscription-badge"
                      style={{ 
                        color: subscription.color,
                        backgroundColor: `${subscription.color}20`,
                        borderColor: `${subscription.color}50`
                      }}
                    >
                      <span>{subscription.icon}</span>
                      {subscription.label}
                      {subscription.daysLeft && (
                        <span className="days-left"> ({subscription.daysLeft}j)</span>
                      )}
                    </span>
                  </div>
                  <div className="mobile-user-meta">
                    <div className="mobile-meta-item">
                      <span className="mobile-meta-label">Inscription</span>
                      <span className="mobile-meta-value">
                        <Clock size={12} />
                        {new Date(user.created_at).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short',
                          year: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="mobile-meta-item">
                      <span className="mobile-meta-label">Activité</span>
                      <span className="mobile-meta-value">
                        {user.last_sign_in_at ? (
                          <>
                            <Activity size={12} />
                            {new Date(user.last_sign_in_at).toLocaleDateString('fr-FR', { 
                              day: '2-digit', 
                              month: 'short',
                              year: '2-digit'
                            })}
                          </>
                        ) : (
                          <span>Jamais</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <p>Aucune inscription récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
