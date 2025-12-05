import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { voucherService } from '../../services/voucherService';
import './VouchersTab.css';

const VouchersTab = () => {
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [voucherStats, setVoucherStats] = useState({ total: 0, active: 0, used: 0 });
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    duration_months: 1,
    max_uses: 1,
    amount: 20,
    plan_type: 'monthly',
    expires_at: '',
    notes: ''
  });

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await voucherService.getAllVouchers();
      setVouchers(data);

      // Calculer les statistiques
      const now = new Date();
      const stats = {
        total: data.length,
        active: data.filter(v => 
          !v.expires_at || new Date(v.expires_at) > now
        ).length,
        used: data.filter(v => v.times_used > 0).length
      };
      setVoucherStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des vouchers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleAddVoucher = async (voucherData) => {
    try {
      const result = await voucherService.createVoucher(voucherData);
      if (result.success) {
        await fetchVouchers(); // Rafraîchir la liste
        showNotification('Voucher créé avec succès !', 'success');
      } else {
        throw new Error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du voucher:', error);
      showNotification('Erreur lors de l\'ajout du voucher: ' + error.message, 'error');
    }
  };

  const handleEditVoucher = async (id, voucherData) => {
    try {
      const result = await voucherService.updateVoucher(id, voucherData);
      if (result.success) {
        await fetchVouchers(); // Rafraîchir la liste
        showNotification('Voucher modifié avec succès !', 'success');
      } else {
        throw new Error(result.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du voucher:', error);
      showNotification('Erreur lors de la modification du voucher: ' + error.message, 'error');
    }
  };

  const handleDeleteVoucher = async (id) => {
    setVoucherToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const result = await voucherService.deleteVoucher(voucherToDelete);
      if (result.success) {
        await fetchVouchers(); // Rafraîchir la liste
        showNotification('Voucher supprimé avec succès !', 'success');
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du voucher:', error);
      showNotification('Erreur lors de la suppression du voucher: ' + error.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setVoucherToDelete(null);
    }
  };

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

  const handleAddNew = () => {
    setEditingVoucher(null);
    setVoucherForm({
      code: '',
      duration_months: 1,
      max_uses: 1,
      amount: 20,
      plan_type: 'monthly',
      expires_at: '',
      notes: ''
    });
    setShowVoucherForm(true);
  };

  const handleEdit = (voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      ...voucher,
      expires_at: voucher.expires_at ? new Date(voucher.expires_at).toISOString().slice(0, 16) : ''
    });
    setShowVoucherForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVoucher) {
      handleEditVoucher(editingVoucher.id, voucherForm);
    } else {
      handleAddVoucher(voucherForm);
    }
    setShowVoucherForm(false);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des vouchers...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-vouchers">
      {/* Voucher Stats Cards */}
      <div className="vouchers-stats-header">
        <div className="voucher-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
            <Gift size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.total}</span>
            <span className="stat-label">Total Vouchers</span>
          </div>
        </div>
        <div className="voucher-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
            <Gift size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.active}</span>
            <span className="stat-label">Actifs</span>
          </div>
        </div>
        <div className="voucher-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.used}</span>
            <span className="stat-label">Utilisés</span>
          </div>
        </div>
      </div>

      <div className="vouchers-header-actions">
        <button className="btn-create-voucher" onClick={handleAddNew}>
          <Plus size={20} /> Créer un nouveau voucher
        </button>
      </div>

      {showVoucherForm && (
        <div className="voucher-form-modal" onClick={(e) => {
          if (e.target.className === 'voucher-form-modal') {
            setShowVoucherForm(false);
          }
        }}>
          <div className="modal-content">
            <h3>{editingVoucher ? 'Modifier le voucher' : 'Créer un nouveau voucher'}</h3>
            <form onSubmit={handleSubmit} className="voucher-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code du voucher *</label>
                  <input 
                    type="text" 
                    value={voucherForm.code} 
                    onChange={e => setVoucherForm({...voucherForm, code: e.target.value.toUpperCase()})} 
                    placeholder="EX: PROMO2024" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Montant (DH) *</label>
                  <input 
                    type="number" 
                    value={voucherForm.amount} 
                    onChange={e => setVoucherForm({...voucherForm, amount: parseFloat(e.target.value)})} 
                    placeholder="20" 
                    min="0"
                    step="0.01"
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Durée (mois) *</label>
                  <input 
                    type="number" 
                    value={voucherForm.duration_months} 
                    onChange={e => setVoucherForm({...voucherForm, duration_months: parseInt(e.target.value)})} 
                    placeholder="1" 
                    min="1"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Utilisations max *</label>
                  <input 
                    type="number" 
                    value={voucherForm.max_uses} 
                    onChange={e => setVoucherForm({...voucherForm, max_uses: parseInt(e.target.value)})} 
                    placeholder="1" 
                    min="1"
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type de plan *</label>
                  <select 
                    value={voucherForm.plan_type} 
                    onChange={e => setVoucherForm({...voucherForm, plan_type: e.target.value})}
                  >
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date d'expiration</label>
                  <input 
                    type="datetime-local" 
                    value={voucherForm.expires_at} 
                    onChange={e => setVoucherForm({...voucherForm, expires_at: e.target.value})} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea 
                  value={voucherForm.notes} 
                  onChange={e => setVoucherForm({...voucherForm, notes: e.target.value})} 
                  placeholder="Notes internes sur ce voucher..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingVoucher ? 'Mettre à jour' : 'Créer le voucher'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowVoucherForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="voucher-form-modal" onClick={(e) => {
          if (e.target.className === 'voucher-form-modal') {
            setShowDeleteModal(false);
            setVoucherToDelete(null);
          }
        }}>
          <div className="modal-content delete-modal">
            <div className="delete-modal-icon">
              <Trash2 size={48} />
            </div>
            <h3>Confirmer la suppression</h3>
            <p>Êtes-vous sûr de vouloir supprimer ce voucher ? Cette action est irréversible.</p>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-danger" 
                onClick={confirmDelete}
              >
                Oui, supprimer
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setVoucherToDelete(null);
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="vouchers-list">
        <div className="vouchers-list-header">
          <h3>Liste des Vouchers</h3>
          <span className="vouchers-count">{vouchers.length} voucher(s)</span>
        </div>
        
        {vouchers.length === 0 ? (
          <div className="empty-state">
            <Gift size={48} />
            <p>Aucun voucher créé</p>
            <button onClick={handleAddNew}>Créer le premier voucher</button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="vouchers-table-container desktop-only">
              <table className="vouchers-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Utilisations</th>
                  <th>Montant</th>
                  <th>Durée</th>
                  <th>Expire le</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(voucher => {
                  const isExpired = voucher.expires_at && new Date(voucher.expires_at) < new Date();
                  const isMaxed = voucher.times_used >= voucher.max_uses;
                  const status = isExpired ? 'expired' : isMaxed ? 'maxed' : 'active';
                  
                  return (
                    <tr key={voucher.id} className={status}>
                      <td>
                        <span className="voucher-code">{voucher.code}</span>
                      </td>
                      <td>
                        <span className="voucher-type">{voucher.plan_type}</span>
                      </td>
                      <td>
                        <span className="usage-count">
                          {voucher.times_used || 0} / {voucher.max_uses}
                        </span>
                      </td>
                      <td>
                        <span className="voucher-amount">{voucher.amount} DH</span>
                      </td>
                      <td>
                        <span className="voucher-duration">{voucher.duration_months} mois</span>
                      </td>
                      <td>
                        {voucher.expires_at ? (
                          <span className={isExpired ? 'date-expired' : 'date-valid'}>
                            {new Date(voucher.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="no-expiry">Jamais</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${status}`}>
                          {status === 'active' ? '✓ Actif' : status === 'expired' ? '⏰ Expiré' : '✕ Épuisé'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn-icon btn-edit" 
                          onClick={() => handleEdit(voucher)}
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-delete" 
                          onClick={() => handleDeleteVoucher(voucher.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="vouchers-mobile-view mobile-only">
            {vouchers.map(voucher => {
              const isExpired = voucher.expires_at && new Date(voucher.expires_at) < new Date();
              const isMaxed = voucher.times_used >= voucher.max_uses;
              const status = isExpired ? 'expired' : isMaxed ? 'maxed' : 'active';
              
              return (
                <div key={voucher.id} className={`voucher-mobile-card status-${status}`}>
                  <div className="voucher-mobile-header">
                    <span className="voucher-code">{voucher.code}</span>
                    <span className={`status-badge status-${status}`}>
                      {status === 'active' ? '✓ Actif' : status === 'expired' ? '⏰ Expiré' : '✕ Épuisé'}
                    </span>
                  </div>
                  
                  <div className="voucher-mobile-info">
                    <div className="info-row">
                      <span className="info-label">Type</span>
                      <span className="info-value voucher-type">{voucher.plan_type}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Montant</span>
                      <span className="info-value voucher-amount">{voucher.amount} DH</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Durée</span>
                      <span className="info-value">{voucher.duration_months} mois</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Utilisations</span>
                      <span className="info-value usage-count">
                        {voucher.times_used || 0} / {voucher.max_uses}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Expire le</span>
                      <span className="info-value">
                        {voucher.expires_at ? (
                          <span className={isExpired ? 'date-expired' : 'date-valid'}>
                            {new Date(voucher.expires_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="no-expiry">Jamais</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="voucher-mobile-actions">
                    <button 
                      className="btn-mobile btn-edit" 
                      onClick={() => handleEdit(voucher)}
                    >
                      <Edit2 size={18} />
                      <span>Modifier</span>
                    </button>
                    <button 
                      className="btn-mobile btn-delete" 
                      onClick={() => handleDeleteVoucher(voucher.id)}
                    >
                      <Trash2 size={18} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VouchersTab;
