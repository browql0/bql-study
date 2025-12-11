import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, RefreshCw, Search, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './DevicesTab.css';

const DevicesTab = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [removing, setRemoving] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ 
    show: false, 
    deviceId: null, 
    userName: '', 
    deviceName: '' 
  });
  const [successModal, setSuccessModal] = useState({ 
    show: false, 
    message: '' 
  });
  const [errorModal, setErrorModal] = useState({ 
    show: false, 
    message: '' 
  });

  useEffect(() => {
    loadCurrentUserRole();
    loadDevices();
  }, []);

  const loadCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setCurrentUserRole(profileData.role);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rôle:', error);
    }
  };

  const loadDevices = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Récupérer tous les appareils
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('is_active', true)
        .order('last_login_at', { ascending: false });

      if (devicesError) throw devicesError;

      // Si aucun appareil, mettre à jour l'état directement
      if (!devicesData || devicesData.length === 0) {
        setDevices([]);
        if (showLoading) {
          setLoading(false);
        }
        return;
      }

      // Récupérer les infos utilisateurs pour chaque appareil
      const userIds = [...new Set(devicesData.map(d => d.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combiner les données
      const devicesWithProfiles = devicesData.map(device => ({
        ...device,
        profiles: profilesData.find(p => p.id === device.user_id)
      }));

      setDevices(devicesWithProfiles || []);
    } catch (error) {
      console.error('Erreur chargement appareils:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleRemoveDevice = (deviceId, userName, deviceName) => {
    setConfirmModal({
      show: true,
      deviceId,
      userName,
      deviceName
    });
  };

  const confirmDeleteDevice = async () => {
    if (!confirmModal.deviceId) return;

    // Sauvegarder les valeurs avant de fermer le modal
    const deviceIdToDelete = confirmModal.deviceId;
    const userNameToDelete = confirmModal.userName;
    
    setRemoving(deviceIdToDelete);
    setConfirmModal({ show: false, deviceId: null, userName: '', deviceName: '' });
    
    try {
      // Vérifier que l'utilisateur est admin
      if (currentUserRole !== 'admin') {
        throw new Error('Seuls les administrateurs peuvent supprimer des appareils.');
      }

      // Récupérer l'appareil pour vérifier son état et obtenir l'userId
      const { data: deviceData, error: deviceError } = await supabase
        .from('user_devices')
        .select('id, is_active, user_id')
        .eq('id', deviceIdToDelete)
        .maybeSingle();

      if (deviceError && deviceError.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération de l\'appareil:', deviceError);
      }

      // Vérifier si l'appareil existe et est actif
      if (deviceData && !deviceData.is_active) {
        throw new Error('Cet appareil est déjà désactivé.');
      }

      if (!deviceData) {
        throw new Error('Appareil introuvable');
      }

      const userIdToDisconnect = deviceData.user_id;

      // Essayer d'abord avec une fonction RPC qui bypass les RLS (si elle existe)
      let updateData = null;
      let updateError = null;
      
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_deactivate_device', {
          device_id: deviceIdToDelete
        });
        
        if (!rpcError && rpcData) {
          // La fonction RPC a fonctionné
          updateData = [{ id: deviceIdToDelete }];
        } else if (rpcError && rpcError.code !== '42883') {
          // Erreur autre que "function does not exist"
          console.warn('Erreur RPC:', rpcError);
        }
      } catch (rpcErr) {
        // La fonction RPC n'existe pas, continuer avec la méthode directe
        console.log('Fonction RPC non disponible, utilisation de la méthode directe');
      }

      // Si la fonction RPC n'a pas fonctionné, utiliser la méthode directe
      if (!updateData) {
        const result = await supabase
          .from('user_devices')
          .update({ is_active: false })
          .eq('id', deviceIdToDelete)
          .eq('is_active', true)
          .select('id');
        
        updateData = result.data;
        updateError = result.error;
      }

      if (updateError) {
        console.error('Erreur Supabase lors de la mise à jour:', updateError);
        console.error('Détails de l\'erreur:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Si l'erreur est liée aux permissions RLS
        if (updateError.code === '42501' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
          throw new Error('Permissions insuffisantes. Les politiques RLS empêchent cette action. Veuillez créer la fonction RPC admin_deactivate_device dans Supabase (voir le fichier SQL fourni).');
        }
        
        throw updateError;
      }

      // Vérifier que la mise à jour a bien été effectuée
      if (!updateData || updateData.length === 0) {
        // Si l'appareil existe et est actif mais n'a pas été mis à jour, c'est un problème de RLS
        if (deviceData && deviceData.is_active) {
          throw new Error('Impossible de supprimer cet appareil. Les politiques RLS empêchent cette action. Veuillez créer la fonction RPC admin_deactivate_device dans Supabase pour permettre aux admins de supprimer les appareils.');
        }
      }

      // Envoyer une notification push à l'utilisateur pour le déconnecter
      try {
        const { notifyUser } = await import('../../services/pushNotificationService');
        await notifyUser(
          userIdToDisconnect,
          '🔒 Appareil déconnecté',
          'Votre appareil a été déconnecté par un administrateur. Vous devrez vous reconnecter.'
        );
      } catch (notifError) {
        console.warn('Erreur lors de l\'envoi de la notification push:', notifError);
        // Ne pas faire échouer la suppression si la notification échoue
      }

      // Mise à jour optimiste : retirer l'appareil de la liste immédiatement
      setDevices(prevDevices => {
        const filtered = prevDevices.filter(device => device.id !== deviceIdToDelete);
        return filtered;
      });
      
      // Afficher le message de succès immédiatement
      setSuccessModal({ 
        show: true, 
        message: `L'appareil de ${userNameToDelete} a été supprimé avec succès. L'utilisateur sera déconnecté lors de sa prochaine action.` 
      });

      // Recharger les données en arrière-plan après un court délai pour s'assurer de la cohérence
      // Utiliser un délai plus long pour laisser le temps à Supabase de propager la mise à jour
      setTimeout(async () => {
        try {
          // Forcer un rechargement complet
          await loadDevices(false);
          
          // Vérifier que l'appareil a bien été supprimé
          const { data: verifyData } = await supabase
            .from('user_devices')
            .select('id')
            .eq('id', deviceIdToDelete)
            .eq('is_active', true)
            .single();
          
          if (verifyData) {
            console.warn('L\'appareil est toujours actif après la suppression. Nouvelle tentative...');
            // Réessayer la suppression
            await supabase
              .from('user_devices')
              .update({ is_active: false })
              .eq('id', deviceIdToDelete);
            
            // Recharger à nouveau
            await loadDevices(false);
          }
        } catch (error) {
          console.error('Erreur lors du rechargement en arrière-plan:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Erreur suppression:', error);
      // En cas d'erreur, recharger pour restaurer l'état correct (sans afficher le loader)
      await loadDevices(false);
      setErrorModal({ 
        show: true, 
        message: 'Erreur lors de la suppression de l\'appareil. Veuillez réessayer.' 
      });
    } finally {
      setRemoving(null);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone size={24} />;
      case 'tablet':
        return <Tablet size={24} />;
      default:
        return <Monitor size={24} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Grouper par utilisateur
  const groupedDevices = devices.reduce((acc, device) => {
    const userId = device.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: device.profiles,
        devices: []
      };
    }
    acc[userId].devices.push(device);
    return acc;
  }, {});

  // Filtrer par recherche
  const filteredGroups = Object.entries(groupedDevices).filter(([_, group]) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      group.user?.name?.toLowerCase().includes(search) ||
      group.user?.email?.toLowerCase().includes(search)
    );
  });

  // Statistiques
  const stats = {
    totalUsers: Object.keys(groupedDevices).length,
    totalDevices: devices.length,
    usersWithTwoDevices: Object.values(groupedDevices).filter(g => g.devices.length === 2).length,
    mobileDevices: devices.filter(d => d.device_type === 'mobile').length,
    desktopDevices: devices.filter(d => d.device_type === 'desktop').length
  };

  if (loading) {
    return (
      <div className="devices-loading">
        <div className="spinner"></div>
        <p>Chargement des appareils...</p>
      </div>
    );
  }

  return (
    <div className="devices-tab">
      {/* Stats Cards */}
      <div className="devices-stats">
        <div className="device-stat-card">
          <div className="device-stat-icon users">
            <Monitor size={24} />
          </div>
          <div className="device-stat-content">
            <p className="device-stat-label">Utilisateurs</p>
            <h3 className="device-stat-value">{stats.totalUsers}</h3>
          </div>
        </div>

        <div className="device-stat-card">
          <div className="device-stat-icon devices">
            <Smartphone size={24} />
          </div>
          <div className="device-stat-content">
            <p className="device-stat-label">Appareils actifs</p>
            <h3 className="device-stat-value">{stats.totalDevices}</h3>
          </div>
        </div>

        <div className="device-stat-card">
          <div className="device-stat-icon warning">
            <AlertCircle size={24} />
          </div>
          <div className="device-stat-content">
            <p className="device-stat-label">À la limite (2/2)</p>
            <h3 className="device-stat-value">{stats.usersWithTwoDevices}</h3>
          </div>
        </div>

        <div className="device-stat-card">
          <div className="device-stat-icon info">
            <Monitor size={20} />
          </div>
          <div className="device-stat-content">
            <p className="device-stat-label">Desktop / Mobile</p>
            <h3 className="device-stat-value">{stats.desktopDevices}/{stats.mobileDevices}</h3>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="devices-search">
        <div className="search-input-wrapper">
          <Search size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Liste des appareils groupés par utilisateur */}
      <div className="devices-list">
        {filteredGroups.length === 0 ? (
          <div className="devices-empty">
            <div className="empty-icon">
              <AlertCircle size={40} />
            </div>
            <h3>Aucun appareil trouvé</h3>
            <p>Aucun utilisateur ne correspond à votre recherche</p>
          </div>
        ) : (
          filteredGroups.map(([userId, group]) => (
            <div key={userId} className="device-user-group">
              <div className="device-user-header">
                <div className="device-user-info">
                  <div className="device-user-avatar">
                    {group.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="device-user-details">
                    <h3>{group.user?.name || 'Utilisateur inconnu'}</h3>
                    <p>{group.user?.email}</p>
                  </div>
                </div>
                <div className={`device-count-badge ${group.devices.length === 2 ? 'at-limit' : 'normal'}`}>
                  <Smartphone size={16} />
                  {group.devices.length}/2
                </div>
              </div>

              <div className="user-devices-grid">
                {group.devices.map((device) => (
                  <div key={device.id} className="device-card">
                    <button
                      className="device-remove-btn"
                      onClick={() => handleRemoveDevice(device.id, group.user?.name, device.device_name)}
                      disabled={removing === device.id}
                    >
                      {removing === device.id ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Supprimer
                        </>
                      )}
                    </button>
                    <div className="device-card-header">
                      <div className="device-type-icon">
                        {getDeviceIcon(device.device_type)}
                      </div>
                    </div>
                    <div className="device-card-body">
                      <h4>{device.device_name}</h4>
                      <div className="device-info-row">
                        <Monitor size={14} />
                        <span><strong>OS:</strong> {device.os}</span>
                      </div>
                      <div className="device-info-row">
                        <Smartphone size={14} />
                        <span><strong>Navigateur:</strong> {device.browser}</span>
                      </div>
                      <div className="device-info-row">
                        <AlertCircle size={14} />
                        <span><strong>Première connexion:</strong> {formatDate(device.first_login_at)}</span>
                      </div>
                      <div className="device-info-row">
                        <RefreshCw size={14} />
                        <span><strong>Dernière activité:</strong> {formatDate(device.last_login_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmModal.show && (
        <div className="device-modal-overlay" onClick={() => setConfirmModal({ show: false, deviceId: null, userName: '', deviceName: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Confirmer la suppression</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <AlertTriangle size={48} className="confirm-warning-icon" />
              </div>
              <p className="confirm-modal-message">
                Voulez-vous vraiment supprimer l'appareil <strong>"{confirmModal.deviceName}"</strong> de <strong>{confirmModal.userName}</strong> ?
              </p>
              <p className="confirm-modal-warning">Cette action est irréversible.</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn cancel-btn" 
                onClick={() => setConfirmModal({ show: false, deviceId: null, userName: '', deviceName: '' })}
              >
                Annuler
              </button>
              <button 
                className="confirm-btn confirm-btn-danger" 
                onClick={confirmDeleteDevice}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de succès */}
      {successModal.show && (
        <div className="device-modal-overlay" onClick={() => setSuccessModal({ show: false, message: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Succès</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <CheckCircle size={48} className="confirm-success-icon" />
              </div>
              <p className="confirm-modal-message">{successModal.message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn confirm-btn-primary" 
                onClick={() => setSuccessModal({ show: false, message: '' })}
              >
                D'accord
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'erreur */}
      {errorModal.show && (
        <div className="device-modal-overlay" onClick={() => setErrorModal({ show: false, message: '' })}>
          <div className="confirm-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Erreur</h3>
            </div>
            <div className="confirm-modal-body">
              <div className="confirm-icon-wrapper">
                <AlertCircle size={48} className="confirm-error-icon" />
              </div>
              <p className="confirm-modal-message">{errorModal.message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn confirm-btn-primary" 
                onClick={() => setErrorModal({ show: false, message: '' })}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesTab;
