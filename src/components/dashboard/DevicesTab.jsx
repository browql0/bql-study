import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Trash2, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './DevicesTab.css';

const DevicesTab = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les appareils
      const { data: devicesData, error: devicesError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('is_active', true)
        .order('last_login_at', { ascending: false });

      if (devicesError) throw devicesError;

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
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId, userName) => {
    if (!confirm(`Voulez-vous vraiment supprimer cet appareil de ${userName} ?`)) return;

    setRemoving(deviceId);
    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('id', deviceId);

      if (error) throw error;

      await loadDevices();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
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
                      onClick={() => handleRemoveDevice(device.id, group.user?.name)}
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
    </div>
  );
};

export default DevicesTab;
