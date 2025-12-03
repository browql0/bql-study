import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Shield, Ban, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer les utilisateurs avec toutes les infos
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Récupérer les paiements pour chaque utilisateur
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('status', ['success', 'completed']);

      if (paymentsError) console.warn('Erreur paiements:', paymentsError);

      // Enrichir les données utilisateurs avec les infos de paiement
      const enrichedUsers = usersData.map(user => {
        const userPayments = paymentsData?.filter(p => p.user_id === user.id) || [];
        const lastPayment = userPayments.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];

        return {
          ...user,
          total_payments: userPayments.length,
          total_spent: userPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          last_payment_date: lastPayment?.created_at,
          last_payment_amount: lastPayment?.amount,
          subscription_active: user.plan_type === 'premium' || 
            (user.trial_ends_at && new Date(user.trial_ends_at) > new Date())
        };
      });

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Filtrage des utilisateurs
  useEffect(() => {
    let filtered = [...users];

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtrer par abonnement
    if (subscriptionFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(user => {
        switch (subscriptionFilter) {
          case 'premium':
            return user.plan_type === 'premium';
          case 'trial':
            return user.trial_ends_at && new Date(user.trial_ends_at) > now;
          case 'expired':
            return user.trial_ends_at && new Date(user.trial_ends_at) <= now;
          case 'none':
            return !user.plan_type && !user.trial_ends_at;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, subscriptionFilter]);

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const handleGrantPremium = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan_type: 'premium' })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showNotification('Accès premium accordé avec succès !', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'attribution du premium', 'error');
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir révoquer l\'accès de cet utilisateur ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan_type: null,
          trial_ends_at: null 
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showNotification('Accès révoqué avec succès !', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la révocation', 'error');
    }
  };

  const handleMakeAdmin = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir rendre cet utilisateur administrateur ?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showNotification('Utilisateur promu administrateur !', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la promotion', 'error');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }
  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    premium: users.filter(u => u.plan_type === 'premium').length,
    trial: users.filter(u => {
      const now = new Date();
      return u.trial_ends_at && new Date(u.trial_ends_at) > now;
    }).length,
    spectators: users.filter(u => u.role === 'spectator').length,
    newThisWeek: users.filter(u => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(u.created_at) > weekAgo;
    }).length,
    premiumRate: users.length > 0 ? ((users.filter(u => u.plan_type === 'premium').length / users.length) * 100).toFixed(1) : 0
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Tri des utilisateurs
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return (
    <div className="dashboard-users">
      {/* Stats Cards */}
      <div className="users-stats-header">
        <div className="user-stat-card stat-gradient-blue">
          <div className="stat-icon">
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.total}</span>
            <span className="stat-label">Total Utilisateurs</span>
            <span className="stat-trend">+{userStats.newThisWeek} cette semaine</span>
          </div>
        </div>
        <div className="user-stat-card stat-gradient-green">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.premium}</span>
            <span className="stat-label">Premium</span>
            <span className="stat-trend">{userStats.premiumRate}% conversion</span>
          </div>
        </div>
        <div className="user-stat-card stat-gradient-orange">
          <div className="stat-icon">
            <Shield size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.admins}</span>
            <span className="stat-label">Administrateurs</span>
            <span className="stat-trend">{userStats.spectators} spectateurs</span>
          </div>
        </div>
        <div className="user-stat-card stat-gradient-purple">
          <div className="stat-icon">
            <Eye size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{userStats.trial}</span>
            <span className="stat-label">En Essai</span>
            <span className="stat-trend">Période d'essai active</span>
          </div>
        </div>
      </div>

      <div className="filters">
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="filter-select-wrapper">
          <Shield size={16} className="filter-icon" />
          <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">Tous les rôles</option>
            <option value="admin">👑 Admin</option>
            <option value="spectator">👁️ Spectateur</option>
          </select>
        </div>
        <div className="filter-select-wrapper">
          <CheckCircle size={16} className="filter-icon" />
          <select className="filter-select" value={subscriptionFilter} onChange={e => setSubscriptionFilter(e.target.value)}>
            <option value="all">Tous les abonnements</option>
            <option value="premium">⭐ Premium</option>
            <option value="trial">🔄 Essai</option>
            <option value="expired">⏰ Expiré</option>
            <option value="none">- Aucun</option>
          </select>
        </div>
      </div>

      <div className="users-list">
        <div className="users-list-header">
          <div className="header-left">
            <h3>Liste des Utilisateurs</h3>
            <span className="users-count">{filteredUsers.length} utilisateur(s)</span>
          </div>
          <div className="header-actions">
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_at">Trier par date</option>
              <option value="name">Trier par nom</option>
              <option value="email">Trier par email</option>
            </select>
            <button className="btn-sort-order" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="users-table-container desktop-only">
          <table className="users-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  <span>Nom</span>
                  {sortBy === 'name' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th onClick={() => handleSort('email')} className="sortable">
                  <span>Email</span>
                  {sortBy === 'email' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th>Rôle</th>
                <th>Abonnement</th>
                <th onClick={() => handleSort('created_at')} className="sortable">
                  <span>Date d'inscription</span>
                  {sortBy === 'created_at' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => {
                const isPremium = user.plan_type === 'premium';
                const isAdmin = user.role === 'admin';
                const trialActive = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
                
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-name-cell">
                        <span className="user-name">{user.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td><span className="user-email">{user.email}</span></td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {isAdmin && <Shield size={14} />}
                        {user.role === 'admin' ? 'Admin' : 'Spectateur'}
                      </span>
                    </td>
                    <td>
                      <span className={`subscription-badge ${isPremium ? 'premium' : trialActive ? 'trial' : 'none'}`}>
                        {isPremium ? '⭐ Premium' : trialActive ? '🔄 Essai' : '－ Aucun'}
                      </span>
                    </td>
                    <td><span className="user-date">{new Date(user.created_at).toLocaleDateString('fr-FR')}</span></td>
                    <td className="user-actions">
                      <button className="btn-icon btn-view" onClick={() => handleViewDetails(user)} title="Voir détails">
                        <Eye size={16} />
                      </button>
                      <button className="btn-icon btn-premium" onClick={() => handleGrantPremium(user.id)} title="Accorder premium">
                        <CheckCircle size={16} />
                      </button>
                      <button className="btn-icon btn-revoke" onClick={() => handleRevokeAccess(user.id)} title="Révoquer accès">
                        <Ban size={16} />
                      </button>
                      <button className="btn-icon btn-admin" onClick={() => handleMakeAdmin(user.id)} title="Rendre admin">
                        <Shield size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="users-mobile-view mobile-only">
          {sortedUsers.map(user => {
            const isPremium = user.plan_type === 'premium';
            const isAdmin = user.role === 'admin';
            const trialActive = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
            
            return (
              <div key={user.id} className="user-mobile-card">
                <div className="user-mobile-header">
                  <div className="user-info">
                    <span className="user-name">{user.name || 'N/A'}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <span className={`subscription-badge ${isPremium ? 'premium' : trialActive ? 'trial' : 'none'}`}>
                    {isPremium ? '⭐ Premium' : trialActive ? '🔄 Essai' : '－ Aucun'}
                  </span>
                </div>
                
                <div className="user-mobile-info">
                  <div className="info-row">
                    <span className="info-label">Rôle</span>
                    <span className={`role-badge role-${user.role}`}>
                      {isAdmin && <Shield size={14} />}
                      {user.role === 'admin' ? 'Admin' : 'Spectateur'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Inscription</span>
                    <span className="info-value">{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                
                <div className="user-mobile-actions">
                  <button className="btn-mobile btn-view" onClick={() => handleViewDetails(user)}>
                    <Eye size={18} />
                    <span>Détails</span>
                  </button>
                  <button className="btn-mobile btn-premium" onClick={() => handleGrantPremium(user.id)}>
                    <CheckCircle size={18} />
                    <span>Premium</span>
                  </button>
                  <button className="btn-mobile btn-revoke" onClick={() => handleRevokeAccess(user.id)}>
                    <Ban size={18} />
                    <span>Révoquer</span>
                  </button>
                  <button className="btn-mobile btn-admin" onClick={() => handleMakeAdmin(user.id)}>
                    <Shield size={18} />
                    <span>Admin</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="user-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="user-modal-content enhanced-modal" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Header with Gradient */}
            <div className="modal-header enhanced-header">
              <div className="modal-header-content">
                <div className="user-avatar">
                  <span className="avatar-text">{selectedUser.name?.charAt(0).toUpperCase() || 'U'}</span>
                  <div className="avatar-status-indicator"></div>
                </div>
                <div className="user-title-section">
                  <h2>{selectedUser.name || 'Utilisateur'}</h2>
                  <p className="user-email-subtitle">{selectedUser.email}</p>
                  <div className="user-badges-row">
                    <span className={`role-badge role-${selectedUser.role}`}>
                      {selectedUser.role === 'admin' ? <Shield size={14} /> : <Eye size={14} />}
                      {selectedUser.role === 'admin' ? 'Admin' : 'Spectateur'}
                    </span>
                    <span className={`subscription-badge ${selectedUser.subscription_active ? 'premium' : 'none'}`}>
                      {selectedUser.subscription_active ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </div>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            
            <div className="modal-body enhanced-body">
              {/* Quick Stats Cards */}
              <div className="modal-quick-stats">
                <div className="quick-stat-card stat-blue">
                  <div className="stat-icon-circle">
                    <CheckCircle size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">{selectedUser.total_payments || 0}</span>
                    <span className="stat-text">Paiements</span>
                  </div>
                </div>
                <div className="quick-stat-card stat-green">
                  <div className="stat-icon-circle">
                    <span className="currency-icon">DH</span>
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">{selectedUser.total_spent || 0}</span>
                    <span className="stat-text">Total Dépensé</span>
                  </div>
                </div>
                <div className="quick-stat-card stat-purple">
                  <div className="stat-icon-circle">
                    <Shield size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">{selectedUser.plan_type === 'premium' ? 'Premium' : 'Gratuit'}</span>
                    <span className="stat-text">Plan</span>
                  </div>
                </div>
              </div>

              {/* Detailed Information Sections */}
              <div className="user-detail-section">
                <div className="section-title">
                  <div className="title-icon">📋</div>
                  <h3>Informations Générales</h3>
                </div>
                <div className="detail-grid-enhanced">
                  <div className="detail-item-enhanced">
                    <div className="detail-icon"><Shield size={16} /></div>
                    <div className="detail-content">
                      <span className="detail-label">ID Utilisateur</span>
                      <span className="detail-value detail-id">{selectedUser.id}</span>
                    </div>
                  </div>
                  <div className="detail-item-enhanced">
                    <div className="detail-icon">📅</div>
                    <div className="detail-content">
                      <span className="detail-label">Date d'inscription</span>
                      <span className="detail-value">{new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  {selectedUser.last_sign_in_at && (
                    <div className="detail-item-enhanced">
                      <div className="detail-icon">🕐</div>
                      <div className="detail-content">
                        <span className="detail-label">Dernière connexion</span>
                        <span className="detail-value">{new Date(selectedUser.last_sign_in_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="user-detail-section">
                <div className="section-title">
                  <div className="title-icon">⭐</div>
                  <h3>Abonnement & Essai</h3>
                </div>
                <div className="detail-grid-enhanced">
                  <div className="detail-item-enhanced highlight-premium">
                    <div className="detail-icon">🎯</div>
                    <div className="detail-content">
                      <span className="detail-label">Type d'abonnement</span>
                      <span className="detail-value premium-text">
                        {selectedUser.plan_type === 'premium' ? '⭐ Premium' : '🆓 Gratuit'}
                      </span>
                    </div>
                  </div>
                  {selectedUser.trial_ends_at && (
                    <div className="detail-item-enhanced">
                      <div className="detail-icon">⏰</div>
                      <div className="detail-content">
                        <span className="detail-label">Période d'essai</span>
                        <span className={`detail-value ${new Date(selectedUser.trial_ends_at) > new Date() ? 'active-trial' : 'expired-trial'}`}>
                          {new Date(selectedUser.trial_ends_at) > new Date() 
                            ? `✓ Expire le ${new Date(selectedUser.trial_ends_at).toLocaleDateString('fr-FR')}`
                            : `✗ Expiré le ${new Date(selectedUser.trial_ends_at).toLocaleDateString('fr-FR')}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(selectedUser.total_payments > 0 || selectedUser.last_payment_date) && (
                <div className="user-detail-section">
                  <div className="section-title">
                    <div className="title-icon">💰</div>
                    <h3>Historique de Paiements</h3>
                  </div>
                  <div className="payment-stats-grid">
                    <div className="payment-stat-card">
                      <div className="payment-stat-icon">📊</div>
                      <div className="payment-stat-content">
                        <span className="payment-stat-label">Total des transactions</span>
                        <span className="payment-stat-value">{selectedUser.total_payments || 0}</span>
                      </div>
                    </div>
                    <div className="payment-stat-card highlight-green">
                      <div className="payment-stat-icon">💵</div>
                      <div className="payment-stat-content">
                        <span className="payment-stat-label">Montant total</span>
                        <span className="payment-stat-value">{selectedUser.total_spent || 0} DH</span>
                      </div>
                    </div>
                    {selectedUser.last_payment_date && (
                      <>
                        <div className="payment-stat-card">
                          <div className="payment-stat-icon">📅</div>
                          <div className="payment-stat-content">
                            <span className="payment-stat-label">Dernier paiement</span>
                            <span className="payment-stat-value">{new Date(selectedUser.last_payment_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <div className="payment-stat-card">
                          <div className="payment-stat-icon">💳</div>
                          <div className="payment-stat-content">
                            <span className="payment-stat-label">Montant</span>
                            <span className="payment-stat-value">{selectedUser.last_payment_amount || 0} DH</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="user-detail-section">
                <div className="section-title">
                  <div className="title-icon">⚡</div>
                  <h3>Actions Rapides</h3>
                </div>
                <div className="modal-actions-enhanced">
                  <button className="btn-modal-enhanced btn-premium" onClick={() => {
                    handleGrantPremium(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="btn-icon-wrapper">
                      <CheckCircle size={20} />
                    </div>
                    <div className="btn-text">
                      <span className="btn-title">Accorder Premium</span>
                      <span className="btn-subtitle">Donner un accès premium</span>
                    </div>
                  </button>
                  <button className="btn-modal-enhanced btn-revoke" onClick={() => {
                    handleRevokeAccess(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="btn-icon-wrapper">
                      <Ban size={20} />
                    </div>
                    <div className="btn-text">
                      <span className="btn-title">Révoquer Accès</span>
                      <span className="btn-subtitle">Retirer tous les accès</span>
                    </div>
                  </button>
                  <button className="btn-modal-enhanced btn-admin" onClick={() => {
                    handleMakeAdmin(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="btn-icon-wrapper">
                      <Shield size={20} />
                    </div>
                    <div className="btn-text">
                      <span className="btn-title">Rendre Admin</span>
                      <span className="btn-subtitle">Promouvoir en admin</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
