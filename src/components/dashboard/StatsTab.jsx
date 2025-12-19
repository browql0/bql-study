import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContextSupabase';
import { Users, UserCheck, Activity, TrendingUp, Calendar, Clock, Shield, Eye, Mail, Award, Zap, AlertTriangle } from 'lucide-react';
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

const getActivityStatus = (lastSignIn, createdAt) => {
  if (!lastSignIn) {
    // If created less than 24h ago, count as "New" instead of "Never connected"
    const created = new Date(createdAt).getTime();
    if (Date.now() - created < 24 * 60 * 60 * 1000) return { status: 'Nouveau', color: '#3b82f6', icon: '✨' };
    return { status: 'Jamais connecté', color: '#6b7280', icon: '⚪' };
  }

  const now = Date.now();
  const lastSignInTime = new Date(lastSignIn).getTime();
  const diff = now - lastSignInTime;

  const fiveMinutes = 15 * 60 * 1000; // Expanded to 15m
  const oneHour = 2 * 60 * 60 * 1000; // Expanded to 2h
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  if (diff < fiveMinutes) return { status: 'En ligne', color: '#10b981', icon: '🟢' };
  if (diff < oneHour) return { status: 'Récemment', color: '#06b6d4', icon: '🔵' }; // Renamed from "Actif"
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
  const { currentUser } = useApp();
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    spectatorUsers: 0,
    premiumUsersCount: 0,
    trialUsersCount: 0,
    recentSignups: []
  });
  const [trends, setTrends] = useState({ total: 0, active: 0, premium: 0 });
  const [loading, setLoading] = useState(true);

  // Calculate real trends helper
  // Calculate real trends helper
  const calculateTrends = (profiles) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    // 1. Total Users Trend (Weekly Growth)
    const usersLastWeek = profiles.filter(p => (now - new Date(p.created_at).getTime()) > sevenDays).length;
    const totalTrend = usersLastWeek > 0
      ? (((profiles.length - usersLastWeek) / usersLastWeek) * 100)
      : 100;

    // 2. Active Users Trend (Momentum: <24h vs 24-48h)
    const activeLast24h = profiles.filter(p => p.last_sign_in_at && (now - new Date(p.last_sign_in_at).getTime()) < oneDay).length;
    const activePrev24h = profiles.filter(p => p.last_sign_in_at && (now - new Date(p.last_sign_in_at).getTime()) >= oneDay && (now - new Date(p.last_sign_in_at).getTime()) < 2 * oneDay).length;

    // Avoid division by zero, assuming 1 if 0 to show growth from 0
    const activeTrend = activePrev24h > 0
      ? ((activeLast24h - activePrev24h) / activePrev24h) * 100
      : (activeLast24h > 0 ? 100 : 0);

    // 3. Premium Trend (New Premium users in last 7 days vs Total Premium base)
    const currentPremium = profiles.filter(p => p.subscription_status === 'premium').length;
    const newPremium = profiles.filter(p => p.subscription_status === 'premium' && (now - new Date(p.created_at).getTime()) < sevenDays).length;
    const oldPremium = currentPremium - newPremium;

    const premiumTrend = oldPremium > 0
      ? ((newPremium / oldPremium) * 100)
      : (currentPremium > 0 ? 100 : 0);

    return {
      total: totalTrend.toFixed(1),
      active: activeTrend.toFixed(1),
      premium: premiumTrend.toFixed(1)
    };
  };

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

      const premiumUsersCount = profiles.filter(user => user.subscription_status === 'premium').length;
      const trialUsersCount = profiles.filter(user => user.subscription_status === 'trial').length;

      setStats({
        totalUsers: profiles.length,
        onlineUsers: onlineUsers.length,
        activeUsers: activeUsers.length,
        inactiveUsers: profiles.length - activeUsers.length,
        adminUsers: adminUsers.length,
        spectatorUsers: spectatorUsers.length,
        premiumUsersCount,
        trialUsersCount,
        recentSignups: profiles.slice(0, 10)
      });

      setTrends(calculateTrends(profiles));

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return (
    <div className="stats-dashboard-container fade-in">
      {/* Premium Header */}
      <div className="stats-header-premium">
        <div>
          <h2 className="stats-title-gradient">Statistiques</h2>
          <p className="stats-subtitle">Vue d'ensemble de l'activité et de la croissance</p>
        </div>
        <div className="stats-header-actions">
          {/* Place for future actions like date filter */}
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="hero-stats-grid">
        <div className="hero-stat-card total">
          <div className="hero-stat-icon">
            <Users size={32} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Total Utilisateurs</span>
            <span className="hero-stat-value">{stats.totalUsers}</span>
            <div className="hero-stat-trend positive">
              <TrendingUp size={16} style={{ transform: trends.total < 0 ? 'rotate(180deg)' : 'none' }} />
              <span>{trends.total > 0 ? '+' : ''}{trends.total}% vs 7j</span>
            </div>
          </div>
          <div className="hero-stat-glow"></div>
        </div>

        <div className="hero-stat-card active">
          <div className="hero-stat-icon">
            <Activity size={32} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Actifs (24h)</span>
            <span className="hero-stat-value">{stats.activeUsers}</span>
            <div className={`hero-stat-trend ${trends.active >= 0 ? 'positive' : 'neutral'}`}>
              <TrendingUp size={16} style={{ transform: trends.active < 0 ? 'rotate(180deg)' : 'none' }} />
              <span>{trends.active > 0 ? '+' : ''}{trends.active}% activity</span>
            </div>
          </div>
          <div className="hero-stat-glow"></div>
        </div>

        <div className="hero-stat-card premium">
          <div className="hero-stat-icon">
            <Award size={32} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Abonnés Premium</span>
            <span className="hero-stat-value">
              {stats.recentSignups?.filter(u => u.subscription_status === 'premium').length || 0}
            </span>
            <div className={`hero-stat-trend ${trends.premium > 0 ? 'positive' : 'neutral'}`}>
              <TrendingUp size={16} style={{ transform: trends.premium < 0 ? 'rotate(180deg)' : 'none' }} />
              <span>{trends.premium > 0 ? '+' : ''}{trends.premium}% croissance</span>
            </div>
          </div>
          <div className="hero-stat-glow"></div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="stats-main-grid">
        {/* Left Column: Engagement */}
        <div className="stats-column-left">
          {/* Engagement Visual */}
          <div className="glass-card engagement-card">
            <div className="card-header-modern">
              <h3> <Zap size={20} /> Engagement</h3>
            </div>
            <div className="engagement-meter-container">
              <div className="engagement-circle">
                <svg viewBox="0 0 36 36" className="circular-chart blue">
                  <path className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className="circle"
                    strokeDasharray={`${stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100) : 0}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="17" className="percentage">
                    {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(0) : 0}%
                  </text>
                  <text x="18" y="24" className="circular-label">
                    Taux d'activité
                  </text>
                </svg>
              </div>
              <div className="engagement-details">
                <div className="detail-item">
                  <span className="dot online"></span>
                  <span className="label">En ligne</span>
                  <span className="value">{stats.onlineUsers}</span>
                </div>
                <div className="detail-item">
                  <span className="dot offline"></span>
                  <span className="label">Hors ligne</span>
                  <span className="value">{stats.totalUsers - stats.onlineUsers}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Roles */}
        <div className="stats-column-right">
          {/* Role Distribution (Mini) */}
          <div className="glass-card roles-card">
            <div className="card-header-modern">
              <h3> <Shield size={20} /> Répartition</h3>
            </div>
            <div className="roles-mini-list">
              {/* Admins */}
              <div className="role-mini-item">
                <div className="role-mini-icon admin"><Shield size={16} /></div>
                <div className="role-mini-info">
                  <span>Administrateurs</span>
                  <div className="role-bar-bg">
                    <div className="role-bar-fill admin" style={{ width: `${(stats.adminUsers / (stats.totalUsers || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <span className="role-mini-count">{stats.adminUsers}</span>
              </div>

              {/* Members (Spectators) */}
              <div className="role-mini-item">
                <div className="role-mini-icon spectator"><Users size={16} /></div>
                <div className="role-mini-info">
                  <span>Membres Total</span>
                  <div className="role-bar-bg">
                    <div className="role-bar-fill spectator" style={{ width: `${(stats.spectatorUsers / (stats.totalUsers || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <span className="role-mini-count">{stats.spectatorUsers}</span>
              </div>

              <div className="card-divider-micro"></div>

              {/* Premium */}
              <div className="role-mini-item">
                <div className="role-mini-icon premium"><Award size={16} /></div>
                <div className="role-mini-info">
                  <span>Premium (Payant)</span>
                  <div className="role-bar-bg">
                    <div className="role-bar-fill premium" style={{ width: `${(stats.premiumUsersCount / (stats.totalUsers || 1)) * 100}%`, backgroundColor: '#10b981' }}></div>
                  </div>
                </div>
                <span className="role-mini-count">{stats.premiumUsersCount}</span>
              </div>

              {/* Trial */}
              <div className="role-mini-item">
                <div className="role-mini-icon trial"><Clock size={16} /></div>
                <div className="role-mini-info">
                  <span>Essai Gratuit</span>
                  <div className="role-bar-bg">
                    <div className="role-bar-fill trial" style={{ width: `${(stats.trialUsersCount / (stats.totalUsers || 1)) * 100}%`, backgroundColor: '#3b82f6' }}></div>
                  </div>
                </div>
                <span className="role-mini-count">{stats.trialUsersCount}</span>
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Users List (Full Width) */}
      <div className="stats-bottom-row" style={{ marginTop: '24px' }}>
        <div className="glass-card recent-users-card">
          <div className="card-header-modern">
            <h3> <Calendar size={20} /> Inscriptions Récentes</h3>
            <button className="header-action-btn">Voir tout</button>
          </div>

          <div className="recent-users-list-modern">
            {stats.recentSignups && stats.recentSignups.map((user) => {
              const activity = getActivityStatus(user.last_sign_in_at, user.created_at);
              return (
                <div key={user.id} className="user-item-modern">
                  <div className="user-avatar-modern">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info-modern">
                    <span className="user-name">{user.name || 'Utilisateur'}</span>
                    <span className="user-role-text">{user.role === 'admin' ? 'Admin' : 'Spectateur'}</span>
                  </div>
                  <div className="user-status-indicator">
                    <span className={`status-dot ${activity.status === 'En ligne' ? 'online' : 'offline'}`}></span>
                    <span className="status-text">{activity.status}</span>
                  </div>
                </div>
              );
            })}
            {(!stats.recentSignups || stats.recentSignups.length === 0) && (
              <div className="empty-state-modern">
                <p>Aucun utilisateur récent</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
