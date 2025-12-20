import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settingsService';
import {
  DollarSign, TrendingUp, Users, Calendar,
  CreditCard, Zap, PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import './RevenueTab.css';

const RevenueCard = ({ icon, label, value, trend, trendValue, color, suffix = 'DH' }) => (
  <div className="revenue-card-premium">
    <div className="rev-card-header">
      <div className="rev-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      {trend && (
        <div className={`revenue-trend-pill ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{trendValue}%</span>
        </div>
      )}
    </div>
    <div className="rev-card-body">
      <span className="rev-value">{value} <span style={{ fontSize: '0.6em', opacity: 0.7 }}>{suffix}</span></span>
      <span className="rev-label">{label}</span>
    </div>
    <div className="rev-glow" style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }}></div>
  </div>
);

const TransactionItem = ({ transaction }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'success': return 'completed';
      case 'approved': return 'completed';
      case 'pending': return 'pending';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  };

  const statusLabel = {
    completed: 'Succès',
    success: 'Succès',
    approved: 'Succès',
    pending: 'En cours',
    failed: 'Échoué'
  }[transaction.status] || transaction.status;

  return (
    <div className="transaction-item-modern">
      <div className="trans-icon">
        <CreditCard size={20} className="text-gray-500" />
      </div>
      <div className="trans-info">
        <div className="trans-title-row">
          <span className="trans-title">{transaction.user_name || transaction.user_email} </span>
          <span className="trans-amount mobile-only"> {transaction.amount} DH</span>
        </div>
        <div className="trans-footer-row">
          <span className="trans-subtitle">{transaction.plan_type} • {new Date(transaction.created_at).toLocaleDateString()}</span>
          <span className={`trans-status mobile-only ${getStatusClass(transaction.status)}`}>{statusLabel}</span>
        </div>
      </div>
      <div className="trans-amount desktop-only">{transaction.amount} DH</div>
      <span className={`trans-status desktop-only ${getStatusClass(transaction.status)}`}>
        {statusLabel}
      </span>
    </div>
  );
};

const RevenueTab = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenueStats = useCallback(async () => {
    try {
      setLoading(true);

      const settings = await settingsService.getSettings();
      const basicPrice = settings.pricing.basic || 5;
      const premiumPrice = settings.pricing.premium || 10;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('subscription_status');

      const premiumCount = profiles?.filter(p => p.subscription_status === 'premium').length || 0;
      const basicCount = profiles?.filter(p => p.subscription_status === 'trial').length || 0;
      const freeCount = profiles?.filter(p => p.subscription_status === 'expired').length || 0;

      const monthlyRevenue = (premiumCount * premiumPrice) + (basicCount * basicPrice);

      // Fetch BOTH online payments AND manual payments (pending_payments)
      const [onlinePaymentsResult, manualPaymentsResult] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('pending_payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (onlinePaymentsResult.error) throw onlinePaymentsResult.error;
      if (manualPaymentsResult.error) throw manualPaymentsResult.error;

      // Combine both payment types
      const onlinePayments = onlinePaymentsResult.data || [];
      const manualPayments = manualPaymentsResult.data || [];

      // Normalize manual payments to match online payment structure
      const normalizedManualPayments = manualPayments.map(p => ({
        ...p,
        payment_method: p.payment_method || 'manual',
        currency: 'DH',
        subscription_duration: p.plan_type === 'monthly' ? 1 : p.plan_type === 'quarterly' ? 3 : 6
      }));

      // Combine and sort by date
      const allPayments = [...onlinePayments, ...normalizedManualPayments]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log('🔍 Combined payments debug:', allPayments.slice(0, 3).map(p => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        method: p.payment_method,
        user_name: p.user_name || p.account_holder_name
      })));

      const now = new Date();
      // Clone dates to avoid mutation issues
      const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
      const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));

      const successfulPayments = allPayments.filter(p =>
        p.status === 'completed' ||
        p.status === 'success' ||
        p.status === 'approved'
      );

      const actualTotalRevenue = successfulPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const actualMonthlyRevenue = successfulPayments
        .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const actualWeeklyRevenue = successfulPayments
        .filter(p => new Date(p.created_at) >= sevenDaysAgo)
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const avgBasket = successfulPayments.length > 0
        ? actualTotalRevenue / successfulPayments.length
        : 0;

      //For recent transactions, fetch user profiles if user_name is missing
      const recentPayments = allPayments.slice(0, 10);
      const userIds = [...new Set(recentPayments
        .filter(p => !p.user_name && p.user_id)
        .map(p => p.user_id))];

      let userProfiles = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      const recentTransactions = recentPayments.map(payment => ({
        id: payment.id,
        user_name: payment.user_name || payment.account_holder_name || userProfiles[payment.user_id]?.name || 'Utilisateur',
        user_email: payment.user_email || userProfiles[payment.user_id]?.email || 'N/A',
        plan_type: payment.plan_type,
        duration: payment.duration || payment.subscription_duration,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at
      }));

      setStats({
        totalRevenue: actualTotalRevenue,
        monthlyRevenue: actualMonthlyRevenue,
        weeklyRevenue: actualWeeklyRevenue,
        avgTransaction: avgBasket,
        premiumCount,
        basicCount,
        freeCount,
        recentTransactions,
        successfulCount: successfulPayments.length
      });
    } catch (error) {
      console.error('Erreur chargement revenus:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenueStats();
    const interval = setInterval(fetchRevenueStats, 30000);
    return () => clearInterval(interval);
  }, [fetchRevenueStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Analyse des revenus...</p>
      </div>
    );
  }

  if (!stats) return <div className="dashboard-error"><p>Erreur de données.</p></div>;

  const { totalRevenue, monthlyRevenue, weeklyRevenue, avgTransaction, premiumCount, basicCount, freeCount, recentTransactions } = stats;

  return (
    <div className="dashboard-revenue-enhanced fade-in">
      {/* Header */}
      <div className="revenue-header-premium">
        <div>
          <h2 className="revenue-title-gradient">Revenus</h2>
          <p className="revenue-subtitle">Performance financière et transactions</p>
        </div>
        <div className="time-range-selector">
          <button className={`time-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Semaine</button>
          <button className={`time-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Mois</button>
          <button className={`time-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>Année</button>
        </div>
      </div>

      {/* Hero Cards */}
      <div className="revenue-overview">
        <RevenueCard
          icon={<DollarSign />}
          label="Revenu Total"
          value={totalRevenue.toFixed(0)}
          color="#10b981"
          trend="up"
          trendValue="12"
        />
        <RevenueCard
          icon={<TrendingUp />}
          label="Revenu Mensuel"
          value={monthlyRevenue.toFixed(0)}
          color="#3b82f6"
          trend="up"
          trendValue="8"
        />
        <RevenueCard
          icon={<Calendar />}
          label="Revenu Hebdo"
          value={weeklyRevenue.toFixed(0)}
          color="#f59e0b"
        />
        <RevenueCard
          icon={<PieChart />}
          label="Ticket Moyen"
          value={avgTransaction.toFixed(0)}
          color="#8b5cf6"
        />
      </div>

      {/* Main Grid */}
      <div className="revenue-main-grid">
        {/* Left: Transactions List */}
        <div className="glass-panel transactions-panel">
          <div className="panel-header">
            <h3><CreditCard size={18} /> Transactions Récentes</h3>
            <button className="panel-action">Voir tout</button>
          </div>
          <div className="transactions-list-modern">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t, i) => <TransactionItem key={i} transaction={t} />)
            ) : (
              <div className="empty-state">
                <p>Aucune transaction récente</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Stats */}
        <div className="sidebar-stats">
          <div className="glass-panel" style={{ height: '100%' }}>
            <div className="panel-header">
              <h3><Zap size={18} /> Abonnements</h3>
            </div>
            <div className="quick-stats-list">
              <div className="quick-stat-item">
                <div className="quick-icon" style={{ background: '#10b981' }}>
                  <Users />
                </div>
                <div className="quick-info">
                  <span className="quick-value">{premiumCount}</span>
                  <span className="quick-label">Abonnements Actifs</span>
                </div>
              </div>
              <div className="quick-stat-item">
                <div className="quick-icon" style={{ background: '#3b82f6' }}>
                  <Users />
                </div>
                <div className="quick-info">
                  <span className="quick-value">{basicCount}</span>
                  <span className="quick-label">Free Trial</span>
                </div>
              </div>
              <div className="quick-stat-item">
                <div className="quick-icon" style={{ background: '#f59e0b' }}>
                  <Users />
                </div>
                <div className="quick-info">
                  <span className="quick-value">{freeCount}</span>
                  <span className="quick-label">Sans Abonnement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueTab;

