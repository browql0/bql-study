import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settingsService';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, Calendar, 
  CreditCard, Award, Clock, ArrowUpRight, ArrowDownRight,
  Receipt, Target, Zap, PieChart
} from 'lucide-react';

const RevenueCard = ({ icon, label, value, trend, trendValue, color, suffix = 'DH' }) => (
  <div className="revenue-card-enhanced">
    <div className="revenue-card-top">
      <div className="revenue-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        {React.cloneElement(icon, { size: window.innerWidth < 768 ? 22 : 26 })}
      </div>
      {trend && (
        <div className={`revenue-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{trendValue}%</span>
        </div>
      )}
    </div>
    <div className="revenue-card-body">
      <span className="revenue-value">{value} {suffix}</span>
      <span className="revenue-label">{label}</span>
    </div>
  </div>
);

const TransactionItem = ({ transaction }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'completed': return 'Complété';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      default: return 'Inconnu';
    }
  };

  const statusColor = getStatusColor(transaction.status);

  return (
    <div className="transaction-item">
      <div className="transaction-icon-box" style={{ backgroundColor: `${statusColor}15` }}>
        <Receipt size={20} style={{ color: statusColor }} />
      </div>
      <div className="transaction-details">
        <span className="transaction-user">{transaction.user_name || transaction.user_email}</span>
        <span className="transaction-plan">{transaction.plan_type} - {transaction.duration} mois</span>
      </div>
      <div className="transaction-info">
        <span className="transaction-amount">{transaction.amount} DH</span>
        <span 
          className="transaction-status"
          style={{ 
            color: statusColor,
            backgroundColor: `${statusColor}20`,
            borderColor: `${statusColor}40`
          }}
        >
          {getStatusLabel(transaction.status)}
        </span>
      </div>
      <div className="transaction-date">
        <Clock size={14} />
        {new Date(transaction.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );
};

const MobileTransactionCard = ({ transaction }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'completed': return 'Complété';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      default: return 'Inconnu';
    }
  };

  const statusColor = getStatusColor(transaction.status);

  return (
    <div className="mobile-transaction-card">
      <div className="mobile-transaction-header">
        <div className="mobile-transaction-icon" style={{ backgroundColor: `${statusColor}15` }}>
          <Receipt size={24} style={{ color: statusColor }} />
        </div>
        <div className="mobile-transaction-info">
          <span className="mobile-transaction-user">{transaction.user_name || transaction.user_email}</span>
          <span className="mobile-transaction-plan">{transaction.plan_type} - {transaction.duration} mois</span>
        </div>
      </div>
      <div className="mobile-transaction-details">
        <div className="mobile-transaction-amount">
          <span className="amount-label">Montant</span>
          <span className="amount-value">{transaction.amount} DH</span>
        </div>
        <div className="mobile-transaction-status">
          <span 
            className="status-badge-mobile"
            style={{ 
              color: statusColor,
              backgroundColor: `${statusColor}20`,
              borderColor: `${statusColor}40`
            }}
          >
            {getStatusLabel(transaction.status)}
          </span>
        </div>
      </div>
      <div className="mobile-transaction-footer">
        <Clock size={14} />
        <span>{new Date(transaction.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
    </div>
  );
};

const RevenueTab = () => {
  const [timeRange, setTimeRange] = useState('month'); // month, week, year
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenueStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer les paramètres
      const settings = await settingsService.getSettings();
      const basicPrice = settings.pricing.basic || 5;
      const premiumPrice = settings.pricing.premium || 10;

      // Compter les utilisateurs premium et basic
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('plan_type');

      if (profilesError) throw profilesError;

      const premiumCount = profiles?.filter(p => p.plan_type === 'premium').length || 0;
      const basicCount = profiles?.filter(p => p.plan_type === 'basic').length || 0;

      // Calculer le revenu mensuel estimé
      const monthlyRevenue = (premiumCount * premiumPrice) + (basicCount * basicPrice);

      // Récupérer le revenu total et les transactions
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentsError) throw paymentsError;

      // Calculer le revenu total
      const totalRevenue = payments?.reduce((sum, payment) => 
        payment.status === 'completed' || payment.status === 'success' 
          ? sum + (payment.amount || 0) 
          : sum, 
        0
      ) || 0;

      // Formater les transactions récentes
      const recentTransactions = payments?.slice(0, 10).map(payment => ({
        id: payment.id,
        user_name: payment.user_name,
        user_email: payment.user_email,
        plan_type: payment.plan_type,
        duration: payment.duration,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at
      })) || [];

      setStats({
        totalRevenue,
        monthlyRevenue,
        premiumCount,
        basicCount,
        recentTransactions
      });
    } catch (error) {
      console.error('Erreur lors du chargement des revenus:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenueStats();
    const interval = setInterval(fetchRevenueStats, 30000); // Actualiser toutes les 30 secondes
    return () => clearInterval(interval);
  }, [fetchRevenueStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des revenus...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-error">
        <p>Erreur lors du chargement des revenus.</p>
      </div>
    );
  }

  // Real data from stats (connecté à Supabase)
  const totalRevenue = stats.totalRevenue || 0;
  const monthlyRevenue = stats.monthlyRevenue || 0;
  const weeklyRevenue = (monthlyRevenue / 4).toFixed(0);
  const premiumUsers = stats.premiumCount || 0;
  const basicUsers = stats.basicCount || 0;
  const totalActiveUsers = premiumUsers + basicUsers;
  const conversionRate = totalActiveUsers > 0 ? ((premiumUsers / totalActiveUsers) * 100).toFixed(1) : 0;
  
  // Transactions réelles depuis Supabase
  const recentTransactions = stats.recentTransactions || [];
  const avgTransaction = recentTransactions.length > 0 
    ? (totalRevenue / recentTransactions.length).toFixed(0)
    : 0;

  return (
    <div className="dashboard-revenue-enhanced fade-in">
      {/* Time Range Filter */}
      <div className="revenue-filters">
        <div className="time-range-selector">
          <button 
            className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Semaine
          </button>
          <button 
            className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Mois
          </button>
          <button 
            className={`time-btn ${timeRange === 'year' ? 'active' : ''}`}
            onClick={() => setTimeRange('year')}
          >
            Année
          </button>
        </div>
      </div>

      {/* Revenue Overview Cards - Données réelles Supabase */}
      <div className="revenue-overview">
        <RevenueCard 
          icon={<DollarSign />}
          label="Revenu Total"
          value={totalRevenue.toFixed(0)}
          color="#10b981"
        />
        <RevenueCard 
          icon={<TrendingUp />}
          label="Revenu Mensuel Estimé"
          value={monthlyRevenue.toFixed(0)}
          color="#3b82f6"
        />
        <RevenueCard 
          icon={<Calendar />}
          label="Revenu Hebdo Estimé"
          value={weeklyRevenue}
          color="#f59e0b"
        />
        <RevenueCard 
          icon={<Receipt />}
          label="Moy. Transaction"
          value={avgTransaction}
          color="#8b5cf6"
        />
      </div>

      {/* Stats Grid - Données réelles Supabase */}
      <div className="revenue-stats-grid">
        <div className="revenue-stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className="stat-box-content">
            <span className="stat-box-value">{premiumUsers}</span>
            <span className="stat-box-label">Abonnés Premium</span>
          </div>
        </div>
        <div className="revenue-stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <Users size={24} />
          </div>
          <div className="stat-box-content">
            <span className="stat-box-value">{basicUsers}</span>
            <span className="stat-box-label">Abonnés Basic</span>
          </div>
        </div>
        <div className="revenue-stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-box-content">
            <span className="stat-box-value">{recentTransactions.length}</span>
            <span className="stat-box-label">Transactions Récentes</span>
          </div>
        </div>
        <div className="revenue-stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
            <Zap size={24} />
          </div>
          <div className="stat-box-content">
            <span className="stat-box-value">{totalRevenue > 0 ? (totalRevenue / 30).toFixed(0) : 0} DH</span>
            <span className="stat-box-label">Revenu/Jour Moy.</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="revenue-transactions-card">
        <div className="card-header">
          <PieChart size={20} />
          <h3>Transactions Récentes</h3>
          <span className="card-badge">{recentTransactions.length} transactions</span>
        </div>
        
        {/* Desktop List */}
        <div className="transactions-list-desktop">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => (
              <TransactionItem key={transaction.id || index} transaction={transaction} />
            ))
          ) : (
            <div className="empty-state">
              <Receipt size={48} />
              <p>Aucune transaction récente</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="transactions-list-mobile">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => (
              <MobileTransactionCard key={transaction.id || index} transaction={transaction} />
            ))
          ) : (
            <div className="empty-state">
              <Receipt size={48} />
              <p>Aucune transaction récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenueTab;

