import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Plus, Edit2, Trash2, Copy, CheckCircle, Tag, Wallet, Crown, Calendar, Users } from 'lucide-react';
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

  // ... (Handlers remain mostly the same, just UI changes)
  const handleAddVoucher = async (voucherData) => {
    try {
      const result = await voucherService.createVoucher(voucherData);
      if (result.success) {
        await fetchVouchers();
        showNotification('Code promo créé avec succès !', 'success');
      } else {
        throw new Error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showNotification(error.message, 'error');
    }
  };

  const handleEditVoucher = async (id, voucherData) => {
    try {
      const result = await voucherService.updateVoucher(id, voucherData);
      if (result.success) {
        await fetchVouchers();
        showNotification('Code promo mis à jour !', 'success');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showNotification(error.message, 'error');
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
        await fetchVouchers();
        showNotification('Code supprimé avec succès !', 'success');
      }
    } catch (error) {
      showNotification(error.message, 'error');
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

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    showNotification('Code copié !', 'info');
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

  const getPlanIcon = (planType) => {
    if (planType === 'premium' || planType === 'yearly') return <Crown size={24} />;
    return <Gift size={24} />;
  };

  const getPlanClass = (planType) => {
    if (planType === 'premium' || planType === 'yearly') return 'premium';
    if (planType === 'monthly') return 'monthly';
    return 'basic';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement des codes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-vouchers">
      {/* Premium Stats Header */}
      <div className="vouchers-stats-header">
        <div className="voucher-stat-card">
          <div className="stat-icon">
            <Gift size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.total}</span>
            <span className="stat-label">Total Codes</span>
          </div>
        </div>
        <div className="voucher-stat-card">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.active}</span>
            <span className="stat-label">Actifs</span>
          </div>
        </div>
        <div className="voucher-stat-card">
          <div className="stat-icon">
            <Tag size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{voucherStats.used}</span>
            <span className="stat-label">Utilisés</span>
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="wallet-header-actions">
        <div className="wallet-title">
          <h3>
            <Tag size={28} className="text-slate-700" />
            Gestion des Codes
            <span className="wallet-count">{vouchers.length}</span>
          </h3>
        </div>
        <button className="btn-create-ticket" onClick={handleAddNew}>
          <Plus size={20} /> Créer un Code
        </button>
      </div>

      {/* Premium Cards Grid */}
      <div className="vouchers-wallet-grid">
        {vouchers.length === 0 ? (
          <div className="empty-wallet-state">
            <Gift size={48} />
            <h4>Aucun code disponible</h4>
            <p>Créez votre premier code promotionnel pour commencer.</p>
          </div>
        ) : (
          vouchers.map(voucher => {
            const isExpired = voucher.expires_at && new Date(voucher.expires_at) < new Date();
            const planClass = getPlanClass(voucher.plan_type);

            return (
              <div key={voucher.id} className="voucher-card-premium">
                {/* Card Header */}
                <div className="voucher-card-header">
                  <div className={`voucher-icon-wrapper ${planClass}`}>
                    {getPlanIcon(voucher.plan_type)}
                  </div>
                  <span className={`voucher-plan-badge ${planClass}`}>
                    {voucher.plan_type}
                  </span>
                </div>

                {/* Card Body */}
                <div className="voucher-card-body">
                  <div className="voucher-amount-display">
                    {voucher.amount}<span>DH</span>
                  </div>

                  <div
                    className="voucher-code-display"
                    onClick={() => handleCopyCode(voucher.code)}
                    title="Cliquer pour copier"
                  >
                    {voucher.code}
                  </div>

                  <div className="voucher-stats-row">
                    <div className="mini-stat">
                      <Users size={14} />
                      {voucher.times_used} / {voucher.max_uses}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="voucher-card-footer">
                  <div className="voucher-expiry">
                    <Calendar size={14} />
                    {voucher.expires_at
                      ? new Date(voucher.expires_at).toLocaleDateString()
                      : 'Illimité'}
                  </div>

                  <div className="voucher-actions">
                    <button
                      className="action-btn-small"
                      onClick={() => handleCopyCode(voucher.code)}
                      title="Copier"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="action-btn-small"
                      onClick={() => handleEdit(voucher)}
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn-small delete"
                      onClick={() => handleDeleteVoucher(voucher.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reused Modals */}
      {showVoucherForm && (
        <div className="voucher-form-modal" onClick={(e) => {
          if (e.target.className === 'voucher-form-modal') setShowVoucherForm(false);
        }}>
          <div className="modal-content">
            <h3>{editingVoucher ? 'Modifier le Code' : 'Nouveau Code'}</h3>
            <form onSubmit={handleSubmit} className="voucher-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Code (ex: PROMO2025) *</label>
                  <input
                    type="text"
                    value={voucherForm.code}
                    onChange={e => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Montant (DH) *</label>
                  <input
                    type="number"
                    value={voucherForm.amount}
                    onChange={e => setVoucherForm({ ...voucherForm, amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Durée (mois)</label>
                  <input
                    type="number"
                    value={voucherForm.duration_months}
                    onChange={e => setVoucherForm({ ...voucherForm, duration_months: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Limite d'utilisation</label>
                  <input
                    type="number"
                    value={voucherForm.max_uses}
                    onChange={e => setVoucherForm({ ...voucherForm, max_uses: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type de Plan</label>
                  <select
                    value={voucherForm.plan_type}
                    onChange={e => setVoucherForm({ ...voucherForm, plan_type: e.target.value })}
                  >
                    <option value="basic">Basic</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="yearly">Annuel</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Expiration</label>
                  <input
                    type="datetime-local"
                    value={voucherForm.expires_at}
                    onChange={e => setVoucherForm({ ...voucherForm, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingVoucher ? 'Enregistrer' : 'Créer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowVoucherForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="voucher-form-modal" onClick={(e) => {
          if (e.target.className === 'voucher-form-modal') setShowDeleteModal(false);
        }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{
              width: '60px', height: '60px', background: '#fee2e2', color: '#ef4444',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Trash2 size={32} />
            </div>
            <h3>Supprimer ce code ?</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Cette action est irréversible.
            </p>
            <div className="form-actions">
              <button type="button" className="btn-danger" onClick={confirmDelete}>
                Confirmer
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VouchersTab;
