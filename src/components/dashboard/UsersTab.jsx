import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Shield, Ban, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './UsersTab.css';

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

      // Récupérer aussi les paiements manuels approuvés (virement/cash)
      const { data: manualPayments, error: manualError } = await supabase
        .from('pending_payments')
        .select('user_id, amount, created_at')
        .eq('status', 'approved');

      if (manualError) console.warn('Erreur paiements manuels:', manualError);

      // Enrichir les données utilisateurs avec les infos de paiement
      const enrichedUsers = usersData.map(user => {
        const userPayments = paymentsData?.filter(p => p.user_id === user.id) || [];
        const userManualPayments = manualPayments?.filter(p => p.user_id === user.id) || [];
        const allPayments = [...userPayments, ...userManualPayments];
        
        const lastPayment = allPayments.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];

        return {
          ...user,
          total_payments: allPayments.length,
          total_spent: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          last_payment_date: lastPayment?.created_at,
          last_payment_amount: lastPayment?.amount,
          subscription_active: user.subscription_status === 'premium' || user.subscription_status === 'trial' || user.subscription_status === 'active'
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
      filtered = filtered.filter(user => {
        switch (subscriptionFilter) {
          case 'premium':
            return user.subscription_status === 'premium';
          case 'none':
            return !user.subscription_status || user.subscription_status === 'free';
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

  const handleGrantTrial = async (userId) => {
    try {
      // Donner un essai gratuit de 7 jours
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'trial',
          subscription_end_date: trialEndDate.toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showNotification('Essai gratuit de 7 jours accordé !', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'attribution de l\'essai', 'error');
    }
  };

  const handleGrantPremium = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'premium',
          subscription_end_date: null  // Premium illimité
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchAllUsers();
      showNotification('Accès premium mensuel accordé !', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de l\'attribution du premium', 'error');
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
            .update({ 
              subscription_status: 'expired',
              subscription_end_date: null
            })
            .eq('id', userId);

          if (error) throw error;
          await fetchAllUsers();
          showNotification('Accès révoqué avec succès !', 'success');
        } catch (error) {
          console.error('Erreur:', error);
          showNotification('Erreur lors de la révocation', 'error');
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
          const { error } = await supabase
            .from('profiles')
            .update({ 
              role: isAdmin ? 'spectator' : 'admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) throw error;
          
          // Forcer le rafraîchissement des données
          await fetchAllUsers();
          
          showNotification(
            isAdmin ? 'Utilisateur rétrogradé en spectateur !' : 'Utilisateur promu administrateur !', 
            'success'
          );
        } catch (error) {
          console.error('Erreur:', error);
          showNotification('Erreur lors du changement de rôle', 'error');
        }
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      }
    });
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

  // Tri des utilisateurs avec gestion améliorée
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Gestion des dates
    if (sortBy === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    // Gestion des valeurs numériques (dépenses, paiements)
    if (sortBy === 'total_spent' || sortBy === 'total_payments') {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }
    
    // Gestion des chaînes de caractères (nom, email)
    if (sortBy === 'name' || sortBy === 'email') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
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
            <span className="stat-value">{userStats.free}</span>
            <span className="stat-label">Gratuits</span>
            <span className="stat-trend">Sans abonnement</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters & Controls V2 */}
      <div className="users-controls-v2">
        <div className="search-container-v2">
          <div className="search-icon-wrapper">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            className="search-input-v2"
            placeholder="Rechercher un utilisateur par nom ou email..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <div className="filters-row-v2">
          <div className="filter-group-v2">
            <Shield size={18} className="filter-icon-v2" />
            <select className="filter-select-v2" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">Tous les rôles</option>
              <option value="admin">👑 Administrateur</option>
              <option value="spectator">👁️ Spectateur</option>
            </select>
          </div>

          <div className="filter-group-v2">
            <CheckCircle size={18} className="filter-icon-v2" />
            <select className="filter-select-v2" value={subscriptionFilter} onChange={e => setSubscriptionFilter(e.target.value)}>
              <option value="all">Tous les abonnements</option>
              <option value="premium">⭐ Premium</option>
              <option value="none">🆓 Sans abonnement</option>
            </select>
          </div>

          <div className="sort-controls-v2">
            <select className="sort-select-v2" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_at">📅 Date d'inscription</option>
              <option value="name">🔤 Nom</option>
              <option value="email">📧 Email</option>
              <option value="total_spent">💰 Dépenses</option>
            </select>
            <button 
              className={`sort-order-btn-v2 ${sortOrder}`} 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="results-summary-v2">
          <span className="results-count">
            <strong>{filteredUsers.length}</strong> utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
          </span>
          {(searchTerm || roleFilter !== 'all' || subscriptionFilter !== 'all') && (
            <button className="clear-filters-btn" onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
              setSubscriptionFilter('all');
            }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Modern Users Grid V2 */}
      <div className="users-grid-v2">
        {sortedUsers.length === 0 ? (
          <div className="no-results-v2">
            <div className="no-results-icon">🔍</div>
            <h3>Aucun utilisateur trouvé</h3>
            <p>Essayez d'ajuster vos filtres de recherche</p>
          </div>
        ) : (
          sortedUsers.map((user, index) => {
            const isPremium = user.subscription_status === 'premium';
            const isAdmin = user.role === 'admin';
            const userInitial = user.name?.charAt(0).toUpperCase() || 'U';
            
            return (
              <div 
                key={user.id} 
                className="user-card-v2"
                style={{ '--card-index': index }}
              >
                {/* Card Header with Avatar */}
                <div className="user-card-header-v2">
                  <div className="user-avatar-v2">
                    <div className="avatar-letter-v2">{userInitial}</div>
                    <div className={`avatar-status-indicator ${user.subscription_active ? 'active' : 'inactive'}`}></div>
                  </div>
                  
                  <div className="user-main-info-v2">
                    <h4 className="user-card-name">{user.name || 'Utilisateur'}</h4>
                    <p className="user-card-email">{user.email}</p>
                    
                    <div className="user-badges-v2">
                      <span className={`badge-v2-mini badge-role-${user.role}`}>
                        {isAdmin ? <Shield size={12} /> : <Eye size={12} />}
                        <span>{isAdmin ? 'Admin' : 'Spectateur'}</span>
                      </span>
                      
                      {isPremium && (
                        <span className="badge-v2-mini badge-premium">
                          ⭐ <span>Premium</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Stats */}
                <div className="user-card-stats-v2">
                  <div className="stat-item-v2">
                    <div className="stat-icon-v2">💰</div>
                    <div className="stat-content-v2">
                      <span className="stat-value-card">{user.total_spent || 0}€</span>
                      <span className="stat-label-card">Dépensé</span>
                    </div>
                  </div>
                  
                  <div className="stat-divider-v2"></div>
                  
                  <div className="stat-item-v2">
                    <div className="stat-icon-v2">🧾</div>
                    <div className="stat-content-v2">
                      <span className="stat-value-card">{user.total_payments || 0}</span>
                      <span className="stat-label-card">Paiements</span>
                    </div>
                  </div>
                  
                  <div className="stat-divider-v2"></div>
                  
                  <div className="stat-item-v2">
                    <div className="stat-icon-v2">📅</div>
                    <div className="stat-content-v2">
                      <span className="stat-value-card">{new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span className="stat-label-card">Inscrit</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="user-card-actions-v2">
                  <button 
                    className="card-action-btn view-details-btn"
                    onClick={() => handleViewDetails(user)}
                    title="Voir les détails complets"
                  >
                    <Eye size={18} />
                    <span>Détails</span>
                  </button>
                  
                  <div className="quick-actions-v2">
                    <button 
                      className="quick-action-btn trial-action"
                      onClick={() => handleGrantTrial(user.id)}
                      title="Donner essai gratuit (7 jours)"
                    >
                      🎁
                    </button>
                    
                    <button 
                      className="quick-action-btn premium-action"
                      onClick={() => handleGrantPremium(user.id)}
                      title="Accorder Premium mensuel"
                    >
                      <CheckCircle size={16} />
                    </button>
                    
                    <button 
                      className="quick-action-btn revoke-action"
                      onClick={() => handleRevokeAccess(user.id)}
                      title="Révoquer l'accès"
                    >
                      <Ban size={16} />
                    </button>
                    
                    <button 
                      className={`quick-action-btn ${isAdmin ? 'demote-action' : 'admin-action'}`}
                      onClick={() => handleToggleAdmin(user.id, user.role)}
                      title={isAdmin ? 'Rétrograder en spectateur' : 'Promouvoir administrateur'}
                    >
                      <Shield size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Details Modal - Ultra Modern Design */}
      {showUserModal && selectedUser && (
        <div className="user-modal-overlay-v2" onClick={() => setShowUserModal(false)}>
          <div className="user-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            
            {/* Floating Particles Background */}
            <div className="modal-particles">
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
              <div className="particle"></div>
            </div>

            {/* Premium Header Section */}
            <div className="modal-header-v2">
              <div className="header-background-glow"></div>
              <button className="btn-close-v2" onClick={() => setShowUserModal(false)}>
                <span className="close-icon">×</span>
              </button>
              
              <div className="header-content-v2">
                {/* Avatar avec effet 3D */}
                <div className="avatar-container-v2">
                  <div className="avatar-ring"></div>
                  <div className="avatar-circle-v2">
                    <span className="avatar-letter">{selectedUser.name?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                  <div className="avatar-status-v2"></div>
                </div>

                {/* User Info */}
                <div className="user-info-header-v2">
                  <h2 className="user-name-v2">{selectedUser.name || 'Utilisateur'}</h2>
                  <p className="user-email-v2">{selectedUser.email}</p>
                  
                  {/* Badges Premium */}
                  <div className="badges-container-v2">
                    <div className={`badge-v2 badge-role ${selectedUser.role}`}>
                      {selectedUser.role === 'admin' ? <Shield size={16} /> : <Eye size={16} />}
                      <span>{selectedUser.role === 'admin' ? 'Administrateur' : 'Spectateur'}</span>
                    </div>
                    <div className={`badge-v2 badge-status ${selectedUser.subscription_active ? 'active' : 'inactive'}`}>
                      <div className="status-dot"></div>
                      <span>{selectedUser.subscription_active ? 'Abonnement Actif' : 'Inactif'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Body - Redesigned */}
            <div className="modal-body-v2">
              
              {/* Stats Overview Cards */}
              <div className="stats-overview-v2">
                <div className="stat-card-v2 stat-payments">
                  <div className="stat-icon-v2">
                    <CheckCircle size={24} />
                  </div>
                  <div className="stat-data-v2">
                    <span className="stat-value-v2">{selectedUser.total_payments || 0}</span>
                    <span className="stat-label-v2">Transactions</span>
                  </div>
                  <div className="stat-trend-v2">
                    <span className="trend-indicator up">↑</span>
                  </div>
                </div>

                <div className="stat-card-v2 stat-revenue">
                  <div className="stat-icon-v2">
                    <span className="currency-symbol">DH</span>
                  </div>
                  <div className="stat-data-v2">
                    <span className="stat-value-v2">{selectedUser.total_spent || 0}</span>
                    <span className="stat-label-v2">Revenus Générés</span>
                  </div>
                  <div className="stat-trend-v2">
                    <span className="trend-indicator up">+{Math.round((selectedUser.total_spent || 0) * 0.1)}</span>
                  </div>
                </div>

                  <div className="stat-card-v2 stat-plan">
                  <div className="stat-icon-v2">
                    <Shield size={24} />
                  </div>
                  <div className="stat-data-v2">
                    <span className="stat-value-v2">{selectedUser.subscription_status === 'premium' ? 'Premium' : 'Gratuit'}</span>
                    <span className="stat-label-v2">Type de Plan</span>
                  </div>
                  <div className={`stat-badge-v2 ${selectedUser.subscription_status === 'premium' ? 'premium' : 'free'}`}>
                    {selectedUser.subscription_status === 'premium' ? '⭐' : '🆓'}
                  </div>
                </div>
              </div>

              {/* Information Sections */}
              <div className="info-sections-v2">
                
                {/* General Information */}
                <div className="info-section-v2">
                  <div className="section-header-v2">
                    <span className="section-icon-v2">📋</span>
                    <h3 className="section-title-v2">Informations Générales</h3>
                    <div className="section-line-v2"></div>
                  </div>
                  <div className="section-content-v2">
                    <div className="info-grid-v2">
                      <div className="info-item-v2">
                        <div className="info-item-icon"><Shield size={18} /></div>
                        <div className="info-item-content">
                          <span className="info-label-v2">ID Utilisateur</span>
                          <span className="info-value-v2 mono">{selectedUser.id}</span>
                        </div>
                      </div>
                      <div className="info-item-v2">
                        <div className="info-item-icon">📅</div>
                        <div className="info-item-content">
                          <span className="info-label-v2">Date d'inscription</span>
                          <span className="info-value-v2">{new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}</span>
                        </div>
                      </div>
                      {selectedUser.last_sign_in_at && (
                        <div className="info-item-v2">
                          <div className="info-item-icon">🕐</div>
                          <div className="info-item-content">
                            <span className="info-label-v2">Dernière connexion</span>
                            <span className="info-value-v2">{new Date(selectedUser.last_sign_in_at).toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscription Information */}
                <div className="info-section-v2 section-premium">
                  <div className="section-header-v2">
                    <span className="section-icon-v2">⭐</span>
                    <h3 className="section-title-v2">Abonnement & Accès</h3>
                    <div className="section-line-v2"></div>
                  </div>
                  <div className="section-content-v2">
                    <div className="subscription-details-v2">
                      <div className="subscription-card-v2 primary">
                        <div className="subscription-icon-v2">🎯</div>
                        <div className="subscription-info-v2">
                          <span className="subscription-label-v2">Type d'abonnement</span>
                          <span className={`subscription-value-v2 ${selectedUser.subscription_status === 'premium' ? 'premium' : 'free'}`}>
                            {selectedUser.subscription_status === 'premium' ? '⭐ Premium' : '🆓 Gratuit'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {(selectedUser.total_payments > 0 || selectedUser.last_payment_date) && (
                  <div className="info-section-v2 section-payments">
                    <div className="section-header-v2">
                      <span className="section-icon-v2">💰</span>
                      <h3 className="section-title-v2">Historique de Paiements</h3>
                      <div className="section-line-v2"></div>
                    </div>
                    <div className="section-content-v2">
                      <div className="payment-history-grid-v2">
                        <div className="payment-card-v2">
                          <div className="payment-card-icon">📊</div>
                          <div className="payment-card-data">
                            <span className="payment-card-value">{selectedUser.total_payments || 0}</span>
                            <span className="payment-card-label">Transactions</span>
                          </div>
                        </div>
                        <div className="payment-card-v2 highlight">
                          <div className="payment-card-icon">💵</div>
                          <div className="payment-card-data">
                            <span className="payment-card-value">{selectedUser.total_spent || 0} DH</span>
                            <span className="payment-card-label">Montant Total</span>
                          </div>
                        </div>
                        {selectedUser.last_payment_date && (
                          <>
                            <div className="payment-card-v2">
                              <div className="payment-card-icon">📅</div>
                              <div className="payment-card-data">
                                <span className="payment-card-value">{new Date(selectedUser.last_payment_date).toLocaleDateString('fr-FR')}</span>
                                <span className="payment-card-label">Dernier Paiement</span>
                              </div>
                            </div>
                            <div className="payment-card-v2">
                              <div className="payment-card-icon">💳</div>
                              <div className="payment-card-data">
                                <span className="payment-card-value">{selectedUser.last_payment_amount || 0} DH</span>
                                <span className="payment-card-label">Montant</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="actions-section-v2">
                <div className="section-header-v2">
                  <span className="section-icon-v2">⚡</span>
                  <h3 className="section-title-v2">Actions Rapides</h3>
                  <div className="section-line-v2"></div>
                </div>
                <div className="actions-grid-v2">
                  <button className="action-btn-v2 action-trial" onClick={() => {
                    handleGrantTrial(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="action-icon-v2">
                      🎁
                    </div>
                    <div className="action-content-v2">
                      <span className="action-title-v2">Essai Gratuit</span>
                      <span className="action-desc-v2">Donner 7 jours d'essai</span>
                    </div>
                    <div className="action-arrow-v2">→</div>
                  </button>

                  <button className="action-btn-v2 action-premium" onClick={() => {
                    handleGrantPremium(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="action-icon-v2">
                      <CheckCircle size={24} />
                    </div>
                    <div className="action-content-v2">
                      <span className="action-title-v2">Premium Mensuel</span>
                      <span className="action-desc-v2">Activer abonnement mensuel</span>
                    </div>
                    <div className="action-arrow-v2">→</div>
                  </button>

                  <button className="action-btn-v2 action-revoke" onClick={() => {
                    handleRevokeAccess(selectedUser.id);
                    setShowUserModal(false);
                  }}>
                    <div className="action-icon-v2">
                      <Ban size={24} />
                    </div>
                    <div className="action-content-v2">
                      <span className="action-title-v2">Révoquer Accès</span>
                      <span className="action-desc-v2">Supprimer tous les accès</span>
                    </div>
                    <div className="action-arrow-v2">→</div>
                  </button>

                  <button className="action-btn-v2 action-admin" onClick={() => {
                    handleToggleAdmin(selectedUser.id, selectedUser.role);
                    setShowUserModal(false);
                  }}>
                    <div className="action-icon-v2">
                      <Shield size={24} />
                    </div>
                    <div className="action-content-v2">
                      <span className="action-title-v2">{selectedUser.role === 'admin' ? 'Rétrograder' : 'Promouvoir Admin'}</span>
                      <span className="action-desc-v2">{selectedUser.role === 'admin' ? 'Retirer droits admin' : 'Accorder droits admin'}</span>
                    </div>
                    <div className="action-arrow-v2">→</div>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="user-modal-overlay-v2" onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">{confirmModal.title}</h3>
            </div>
            <div className="confirm-modal-body">
              <p className="confirm-modal-message">{confirmModal.message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn cancel-btn" 
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
              >
                ✕ Annuler
              </button>
              <button 
                className="confirm-btn confirm-btn-primary" 
                onClick={confirmModal.onConfirm}
              >
                ✓ Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
