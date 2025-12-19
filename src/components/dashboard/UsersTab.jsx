import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Shield, Ban, CheckCircle, Eye, Trash2, TrendingUp, Users, Award, Calendar, X, AlertTriangle, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { settingsService } from '../../services/settingsService';
import './UsersTab.css';

// Helper to sync logged in user role
const syncLoggedInUserRole = async (targetUserId, nextRole) => {
  try {
    if (!targetUserId || !nextRole) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== targetUserId) return;
    const metadata = user.user_metadata || {};
    if (metadata.role === nextRole) return;
    await supabase.auth.updateUser({
      data: {
        ...metadata,
        role: nextRole
      }
    });
  } catch (error) {
    console.warn('Impossible de synchroniser le rôle auth:', error);
  }
};

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
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [durationModal, setDurationModal] = useState({ show: false, userId: null });
  const [pricing, setPricing] = useState({ monthly: 120, quarterly: 320, yearly: 600 });

  // UI States
  const [viewMode, setViewMode] = useState('grid');
  const [toasts, setToasts] = useState([]);

  // Fetch Pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await settingsService.getSettings();
        if (data && data.pricing) {
          setPricing(data.pricing);
        }
      } catch (err) {
        console.error("Error loading pricing", err);
      }
    };
    loadPricing();
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // 2. Fetch Completed Payments to calculate accurate totals
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('user_id, amount, status')
        .eq('status', 'completed');

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
        // Continue without payments data if error, fallback to profile data
      }

      // 3. Aggregate payments by user
      const paymentsMap = {};
      if (paymentsData) {
        paymentsData.forEach(p => {
          if (!paymentsMap[p.user_id]) paymentsMap[p.user_id] = 0;
          paymentsMap[p.user_id] += (p.amount || 0);
        });
      }

      const enhancedUsers = usersData.map(user => {
        const isPremium = user.subscription_status === 'premium' || user.subscription_status === 'trial';
        const isActive = isPremium && new Date(user.subscription_end_date) > new Date();

        // LOG: Affiche le statut d'abonnement et la date de fin pour chaque utilisateur
        console.log(`[DEBUG] Utilisateur: ${user.email} | Statut: ${user.subscription_status} | Fin: ${user.subscription_end_date}`);

        // Use calculated total if available, otherwise fallback to profile data
        // This fixes the issue where profile.total_spent might be 0 but payments exist
        const calculatedTotal = paymentsMap[user.id] !== undefined ? paymentsMap[user.id] : (user.total_spent || user.payment_amount || 0);

        return {
          ...user,
          subscription_active: isActive,
          real_total_spent: calculatedTotal // Store specific calculated field
        };
      });

      setUsers(enhancedUsers);
      setFilteredUsers(enhancedUsers);
      // LOG: Affiche la liste complète des utilisateurs après update
      console.log('[DEBUG] Utilisateurs chargés:', enhancedUsers);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      showToast('Erreur', 'Impossible de charger les utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Filtering Logic
  useEffect(() => {
    if (!users) return;
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.email?.toLowerCase().includes(term)) ||
        (user.name?.toLowerCase().includes(term)) ||
        (user.id?.toLowerCase().includes(term))
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (subscriptionFilter === 'premium') return user.subscription_status === 'premium';
        if (subscriptionFilter === 'none') return !user.subscription_status || user.subscription_status === 'free';
        return true;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, subscriptionFilter]);

  // Toast System
  const showToast = (title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const now = new Date();

  // Actions
  const handleGrantTrial = async (userId) => {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial',
          plan_type: 'monthly',
          payment_amount: 0,
          subscription_end_date: trialEndDate.toISOString(),
          last_payment_date: now.toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showToast('Essai Validé', 'L\'essai gratuit de 7 jours a été activé.', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Erreur', 'Impossible d\'activer l\'essai gratuit.', 'error');
    }
  };

  const handleGrantPremium = (userId) => {
    setDurationModal({ show: true, userId: userId });
  };

  const handleGrantPremiumWithDuration = async (userId, months) => {
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      let planType, paymentAmount;
      if (months === 1) { planType = 'monthly'; paymentAmount = pricing.monthly || 120; }
      else if (months === 3) { planType = 'quarterly'; paymentAmount = pricing.quarterly || 320; }
      else if (months === 6) { planType = 'yearly'; paymentAmount = pricing.yearly || 600; }

      // First fetch current stats to increment correctly
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('total_spent, total_payments')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentSpent = currentUser.total_spent || 0;
      const currentPayments = currentUser.total_payments || 0;

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'premium',
          plan_type: planType,
          payment_amount: paymentAmount, // Store last payment amount
          total_spent: currentSpent + paymentAmount,
          total_payments: currentPayments + 1,
          subscription_end_date: endDate.toISOString(),
          last_payment_date: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showToast('Premium Activé', `L'accès premium de ${months} mois a été accordé !`, 'success');
      setDurationModal({ show: false, userId: null });
    } catch (error) {
      console.error('Erreur:', error);
      showToast('Échec de l\'opération', 'Une erreur est survenue lors de l\'attribution.', 'error');
    }
  };

  const handleRevokeAccess = async (userId) => {
    setConfirmModal({
      show: true,
      title: '⚠️ Révoquer l\'accès',
      message: 'Êtes-vous sûr de vouloir révoquer l\'accès de cet utilisateur ? Cette action supprimera son abonnement premium.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_status: 'expired', subscription_end_date: null })
            .eq('id', userId);

          // LOG: Vérifie la réponse de la requête
          console.log(`[DEBUG] Révocation accès pour userId=${userId} | Erreur:`, error);

          if (error) throw error;
          await fetchAllUsers();
          showToast('Accès Révoqué', 'L\'abonnement a été annulé avec succès.', 'success');
        } catch (error) {
          console.error('Erreur:', error);
          showToast('Erreur', 'Impossible de révoquer l\'accès.', 'error');
        }
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleToggleAdmin = async (userId, currentRole) => {
    const isAdmin = currentRole === 'admin';
    const action = isAdmin ? 'rétrograder en spectateur' : 'promouvoir administrateur';

    setConfirmModal({
      show: true,
      title: isAdmin ? '⬇️ Rétrograder l\'utilisateur' : '⬆️ Promouvoir administrateur',
      message: `Êtes-vous sûr de vouloir ${action} cet utilisateur ?`,
      onConfirm: async () => {
        try {
          const newRole = isAdmin ? 'spectator' : 'admin';
          const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('id', userId);

          if (error) throw error;

          await syncLoggedInUserRole(userId, newRole);
          await fetchAllUsers();

          showToast(
            isAdmin ? 'Rétrogradation réussie' : 'Promotion réussie',
            isAdmin ? 'L\'utilisateur est maintenant spectateur.' : 'L\'utilisateur est maintenant administrateur.',
            'success'
          );
        } catch (error) {
          console.error('Erreur:', error);
          showToast('Erreur', 'Le changement de rôle a échoué.', 'error');
        }
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Sort & Statistics
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'created_at') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
    if (sortBy === 'total_spent' || sortBy === 'total_payments') { aVal = aVal || 0; bVal = bVal || 0; }
    if (sortBy === 'name' || sortBy === 'email') { aVal = (aVal || '').toLowerCase(); bVal = (bVal || '').toLowerCase(); }

    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    premium: users.filter(u => u.subscription_status === 'premium').length,
    free: users.filter(u => !u.subscription_status || u.subscription_status === 'free').length,
    spectators: users.filter(u => u.role === 'spectator').length,
    newThisWeek: users.filter(u => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(u.created_at) > weekAgo;
    }).length,
    premiumRate: users.length > 0 ? ((users.filter(u => u.subscription_status === 'premium').length / users.length) * 100).toFixed(1) : 0
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-users">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-notification ${toast.type}`}>
            <div className="toast-icon-wrapper">
              {toast.type === 'success' ? <CheckCircle size={20} strokeWidth={3} /> : <AlertTriangle size={20} strokeWidth={3} />}
            </div>
            <div className="toast-content">
              <h4>{toast.title}</h4>
              <p>{toast.message}</p>
            </div>
            <div
              style={{ marginLeft: 'auto', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              <X size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Premium Header */}
      <div className="stats-header-premium">
        <div>
          <h2 className="stats-title-gradient">Gestion Utilisateurs</h2>
          <p className="stats-subtitle">Gérez votre communauté avec style et efficacité.</p>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="hero-stats-grid">
        <div className="hero-stat-card total">
          <div className="hero-stat-icon">
            <Users size={28} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Total Membres</span>
            <span className="hero-stat-value">{userStats.total}</span>
          </div>
        </div>

        <div className="hero-stat-card premium">
          <div className="hero-stat-icon">
            <Award size={28} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Premium</span>
            <span className="hero-stat-value">{userStats.premium}</span>
          </div>
        </div>

        <div className="hero-stat-card admins">
          <div className="hero-stat-icon">
            <Shield size={28} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Admins</span>
            <span className="hero-stat-value">{userStats.admins}</span>
          </div>
        </div>

        <div className="hero-stat-card free">
          <div className="hero-stat-icon">
            <Eye size={28} />
          </div>
          <div className="hero-stat-content">
            <span className="hero-stat-label">Gratuits</span>
            <span className="hero-stat-value">{userStats.free}</span>
          </div>
        </div>
      </div>

      {/* Glass Controls Bar */}
      <div className="users-controls-premium">
        <div className="controls-left">
          <div className="view-toggle-wrapper">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue Grille"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '14px' }}>
                <div style={{ width: '5px', height: '5px', background: 'currentColor', borderRadius: '1px' }}></div>
                <div style={{ width: '5px', height: '5px', background: 'currentColor', borderRadius: '1px' }}></div>
                <div style={{ width: '5px', height: '5px', background: 'currentColor', borderRadius: '1px' }}></div>
                <div style={{ width: '5px', height: '5px', background: 'currentColor', borderRadius: '1px' }}></div>
              </div>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue Liste"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '14px' }}>
                <div style={{ width: '14px', height: '2px', background: 'currentColor', borderRadius: '1px' }}></div>
                <div style={{ width: '14px', height: '2px', background: 'currentColor', borderRadius: '1px' }}></div>
                <div style={{ width: '14px', height: '2px', background: 'currentColor', borderRadius: '1px' }}></div>
              </div>
            </button>
          </div>

          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} style={{ left: '16px', color: '#64748b' }} />
            <input
              type="text"
              className="search-input-premium"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="results-count">
            {filteredUsers.length} membres
          </div>
        </div>

        <div className="controls-right">
          <select
            className="filter-select-premium"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admins</option>
            <option value="spectator">Spectateurs</option>
          </select>

          <select
            className="filter-select-premium"
            value={subscriptionFilter}
            onChange={e => setSubscriptionFilter(e.target.value)}
          >
            <option value="all">Tous les plans</option>
            <option value="premium">Premium</option>
            <option value="none">Gratuit</option>
          </select>
        </div>
      </div>

      {/* Content Area (Grid or List) */}
      {viewMode === 'grid' ? (
        <div className="users-grid-premium">
          {sortedUsers.map(user => {
            const isPremium = user.subscription_status === 'premium';
            return (
              <div key={user.id} className="user-card-premium">
                <div className="user-card-header">
                  <div className={`user-avatar-premium ${isPremium ? 'premium' : ''}`}>
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                    <div className={`user-status-dot ${user.subscription_active ? 'active' : ''}`}></div>
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-stat-pill">
                    <span className="user-stat-val">{user.real_total_spent || 0} DH</span>
                    <span className="user-stat-lbl">PAYÉ</span>
                  </div>
                  <div className="user-stat-pill">
                    <span className="user-stat-val">{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="user-stat-lbl">Inscrit</span>
                  </div>
                </div>

                <div className="user-card-footer">
                  <div className="user-actions">
                    <button className="action-btn-icon view" onClick={() => handleViewDetails(user)}>
                      <Eye size={20} />
                    </button>
                    <button className="action-btn-icon" onClick={() => handleGrantPremium(user.id)}>
                      <Award size={20} />
                    </button>
                    <button className="action-btn-icon delete" onClick={() => handleRevokeAccess(user.id)}>
                      <Ban size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* New Premium List View */
        <div className="users-table-container">
          <table className="users-table-premium">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Total Payé</th>
                <th>Inscription</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => {
                const isPremium = user.subscription_status === 'premium';
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="table-user-cell">
                        <div className={`table-avatar ${isPremium ? 'premium' : ''}`}>
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{user.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`user-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      {isPremium ?
                        <span className="user-badge premium">Premium</span> :
                        <span className="user-badge spectator">Gratuit</span>
                      }
                    </td>
                    <td style={{ fontWeight: 600 }}>{user.real_total_spent || 0} DH</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="user-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="action-btn-icon view" style={{ width: '36px', height: '36px' }} onClick={() => handleViewDetails(user)}>
                          <Eye size={16} />
                        </button>
                        <button className="action-btn-icon" style={{ width: '36px', height: '36px' }} onClick={() => handleGrantPremium(user.id)}>
                          <Award size={16} />
                        </button>
                        <button className="action-btn-icon delete" style={{ width: '36px', height: '36px' }} onClick={() => handleRevokeAccess(user.id)}>
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="user-modal-overlay-v2" style={{ zIndex: 9000 }} onClick={() => setShowUserModal(false)}>
          <div className="user-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hero-header-bg">
              <button className="modal-close-btn" onClick={() => setShowUserModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-content-premium" style={{ marginTop: '-40px', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                <div className="modal-avatar-xl">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <h3 className="modal-hero-name" style={{ marginTop: '16px' }}>{selectedUser.name}</h3>
                <p className="modal-hero-email">{selectedUser.email}</p>
              </div>

              <div className="stats-grid-modal">
                <div className="modal-stat-card">
                  <span className="modal-stat-label">ID Utilisateur</span>
                  <span className="modal-stat-value mono" style={{ fontSize: '13px' }}>{selectedUser.id}</span>
                </div>
                <div className="modal-stat-card">
                  <span className="modal-stat-label">Total Payé</span>
                  <span className="modal-stat-value green">{selectedUser.real_total_spent || 0} DH</span>
                </div>
                <div className="modal-stat-card">
                  <span className="modal-stat-label">Abonnement</span>
                  <span className="modal-stat-value">{selectedUser.subscription_status === 'premium' ? 'Premium' : 'Gratuit'}</span>
                </div>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '24px 0 16px 0', color: '#1e293b' }}>Actions Rapides</h4>
              <div className="modal-actions-grid">
                <button className="btn-create-ticket success" onClick={() => handleGrantTrial(selectedUser.id)}>
                  <Award size={20} /> Trial 7J
                </button>
                <button className="btn-create-ticket primary" onClick={() => handleGrantPremium(selectedUser.id)}>
                  <CheckCircle size={20} /> Abonner
                </button>
                <button className="btn-create-ticket danger" onClick={() => handleRevokeAccess(selectedUser.id)}>
                  <Ban size={20} /> Révoquer
                </button>
                <button className="btn-create-ticket purple" onClick={() => handleToggleAdmin(selectedUser.id, selectedUser.role)}>
                  <Shield size={20} /> Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="user-modal-overlay-v2" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
          <div className="user-modal-wrapper" style={{ maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{confirmModal.title}</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-create-ticket" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Annuler</button>
              <button className="btn-create-ticket danger" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmModal.onConfirm}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Duration Modal */}
      {durationModal.show && (
        <div className="user-modal-overlay-v2" onClick={() => setDurationModal({ show: false, userId: null })}>
          <div className="user-modal-wrapper" style={{ maxWidth: '850px', padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3 className="stats-title-gradient">Choisir une offre</h3>
              <p className="stats-subtitle" style={{ margin: '0 auto' }}>Sélectionnez la durée de l'abonnement pour cet utilisateur</p>
            </div>
            <div className="plans-grid">
              {[
                { m: 1, p: pricing.monthly, t: 'Mensuel', icon: <Calendar size={28} /> },
                { m: 3, p: pricing.quarterly, t: 'Trimestriel', featured: true, icon: <TrendingUp size={28} /> },
                { m: 6, p: pricing.yearly, t: 'Semestriel', icon: <Crown size={28} /> }
              ].map(plan => (
                <div key={plan.m} className={`plan-card ${plan.featured ? 'featured' : ''}`} onClick={() => handleGrantPremiumWithDuration(durationModal.userId, plan.m)}>
                  {plan.featured && <div className="plan-badge">populaire</div>}
                  <div className="plan-price">{plan.p} DHS</div>
                  <div className="plan-period">/ {plan.m} mois</div>
                  <div style={{ margin: '16px 0', fontSize: '18px', fontWeight: 700, color: '#334155' }}>
                    {plan.t}
                  </div>
                  <button className={`btn-create-ticket ${plan.featured ? 'primary' : ''}`} style={{ width: '100%', justifyContent: 'center' }}>
                    Sélectionner
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersTab;