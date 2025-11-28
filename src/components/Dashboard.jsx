import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, UserX, Activity, TrendingUp, Calendar, Clock, Gift, Plus, Edit2, Trash2, BarChart3, DollarSign, Search, Filter, Shield, Ban, CheckCircle, Eye, Home, Settings, LogOut, Menu, X } from 'lucide-react';
import { voucherService } from '../services/voucherService';
import { settingsService } from '../services/settingsService';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'vouchers', 'manage-users', 'revenue', 'settings'
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default false for mobile-first
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    spectatorUsers: 0,
    recentSignups: []
  });
  const [loading, setLoading] = useState(true);
  
  // Voucher states
  const [vouchers, setVouchers] = useState([]);
  const [voucherStats, setVoucherStats] = useState({
    totalVouchers: 0,
    activeVouchers: 0,
    totalRevenue: 0,
    totalRedemptions: 0
  });
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    duration_months: 1,
    max_uses: 1,
    amount: 20,
    plan_type: 'monthly',
    expires_at: '',
    notes: ''
  });

  // User management states
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSubscription, setFilterSubscription] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  
  // Modal states for premium grant
  const [showGrantPremiumModal, setShowGrantPremiumModal] = useState(false);
  const [grantPremiumUserId, setGrantPremiumUserId] = useState(null);
  const [grantPremiumDuration, setGrantPremiumDuration] = useState(1);
  const [grantPremiumLoading, setGrantPremiumLoading] = useState(false);
  
  // Modal states for messages
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ type: 'success', title: '', message: '' });
  
  // Modal states for confirmations
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '', onConfirm: null });

  // Revenue stats
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    predictedRenewals: 0,
    retentionRate: 0,
    activeSubscriptions: 0,
    monthlySubscriptions: 0,
    quarterlySubscriptions: 0,
    yearlySubscriptions: 0,
    churnRate: 0,
    avgRevenuePerUser: 0,
    revenueByMonth: []
  });

  // Settings states
  const [settings, setSettings] = useState({
    pricing: {
      monthly: 20,
      quarterly: 50,
      yearly: 100
    },
    features: {
      notes: true,
      flashcards: true,
      quiz: true,
      photos: true,
      files: true,
      advancedSearch: true
    },
    emails: {
      welcomeEmail: true,
      subscriptionReminder: true,
      expirationNotice: true,
      promotionalEmails: false
    },
    permissions: {
      allowUserRegistration: true,
      requireEmailVerification: false,
      allowGuestAccess: false,
      maxFilesPerUser: 50,
      maxNotesPerUser: 100
    }
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const applyFilters = useCallback(() => {
    let filtered = [...allUsers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user =>
        filterRole === 'admin' ? user.role === 'admin' : (user.role === 'spectator' || !user.role)
      );
    }

    // Subscription filter
    if (filterSubscription !== 'all') {
      filtered = filtered.filter(user => {
        if (filterSubscription === 'premium') {
          return user.subscription_status === 'premium' &&
                  user.subscription_end_date &&
                  new Date(user.subscription_end_date) > new Date();
        } else if (filterSubscription === 'free') {
          return !user.subscription_status ||
                  user.subscription_status === 'free' ||
                  (user.subscription_end_date && new Date(user.subscription_end_date) < new Date());
        }
        return true;
      });
    }

    setFilteredUsers(filtered);
  }, [allUsers, searchQuery, filterRole, filterSubscription]);

  // Handle responsive sidebar on initial load and resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer les profils utilisateurs
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found. Make sure the profiles table exists.');
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

      // Calculer les statistiques
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes pour "En ligne"
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      // Utilisateurs en ligne (connectés dans les 5 dernières minutes)
      const onlineUsers = profiles.filter(user => {
        if (!user.last_sign_in_at) return false;
        const lastSignIn = new Date(user.last_sign_in_at).getTime();
        return lastSignIn > fiveMinutesAgo;
      });

      // Utilisateurs actifs (connectés dans les 24 dernières heures)
      const activeUsers = profiles.filter(user => {
        if (!user.last_sign_in_at) return false;
        const lastSignIn = new Date(user.last_sign_in_at).getTime();
        return lastSignIn > oneDayAgo;
      });

      const adminUsers = profiles.filter(user => user.role === 'admin');
      const spectatorUsers = profiles.filter(user => user.role === 'spectator' || !user.role);

      setStats({
        totalUsers: profiles.length,
        onlineUsers: onlineUsers.length,
        activeUsers: activeUsers.length,
        inactiveUsers: profiles.length - activeUsers.length,
        adminUsers: adminUsers.length,
        spectatorUsers: spectatorUsers.length,
        recentSignups: profiles.slice(0, 10)
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const allVouchers = await voucherService.getAllVouchers();
      setVouchers(allVouchers);

      // Calculate stats
      const activeVouchers = allVouchers.filter(v => v.status === 'active');
      const totalRevenue = allVouchers.reduce((sum, v) => sum + (v.amount * v.current_uses || 0), 0);
      const totalRedemptions = allVouchers.reduce((sum, v) => sum + (v.current_uses || 0), 0);

      setVoucherStats({
        totalVouchers: allVouchers.length,
        activeVouchers: activeVouchers.length,
        totalRevenue,
        totalRedemptions
      });
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      alert('Erreur lors du chargement des codes promo');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(profiles || []);
      setFilteredUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRevenueStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer les prix depuis la base de données
      const pricing = await settingsService.getPricing();
      
      // Récupérer tous les utilisateurs avec abonnement
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Prix des abonnements (depuis la base de données)
      const PRICES = {
        monthly: pricing.monthly,
        quarterly: pricing.quarterly,
        yearly: pricing.yearly
      };

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let activeSubscriptions = 0;
      let monthlySubscriptions = 0;
      let quarterlySubscriptions = 0;
      let yearlySubscriptions = 0;
      let predictedRenewals = 0;
      let totalSubscribersEver = 0;
      let currentActiveSubscribers = 0;

      profiles.forEach(user => {
        if (user.subscription_status === 'premium' && user.subscription_end_date) {
          const endDate = new Date(user.subscription_end_date);
          const paymentDate = user.last_payment_date ? new Date(user.last_payment_date) : null;
          
          if (endDate > now) {
            // Abonnement actif
            activeSubscriptions++;
            currentActiveSubscribers++;
            
            const planType = user.plan_type || 'monthly';
            const price = PRICES[planType] || pricing.monthly;
            totalRevenue += price;

            if (planType === 'monthly') {
              monthlySubscriptions++;
            } else if (planType === 'quarterly') {
              quarterlySubscriptions++;
            } else {
              yearlySubscriptions++;
            }

            // Revenus du mois en cours
            if (paymentDate && paymentDate >= firstDayOfMonth) {
              monthlyRevenue += price;
            }

            // Prédiction renouvellements (abonnements qui expirent dans les 30 prochains jours)
            const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
              predictedRenewals += price;
            }
          } else {
            // Abonnement expiré mais a été payant
            totalSubscribersEver++;
            const planType = user.plan_type || 'monthly';
            totalRevenue += PRICES[planType] || pricing.monthly;
          }
        }
      });

      totalSubscribersEver += currentActiveSubscribers;

      // Calcul du taux de rétention
      const retentionRate = totalSubscribersEver > 0 
        ? ((currentActiveSubscribers / totalSubscribersEver) * 100).toFixed(1)
        : 0;

      // Calcul du taux de désabonnement (churn rate)
      const churnRate = (100 - retentionRate).toFixed(1);

      // Revenu moyen par utilisateur
      const avgRevenuePerUser = activeSubscriptions > 0 
        ? (totalRevenue / activeSubscriptions).toFixed(2)
        : 0;

      setRevenueStats({
        totalRevenue,
        monthlyRevenue,
        predictedRenewals,
        retentionRate: parseFloat(retentionRate),
        activeSubscriptions,
        monthlySubscriptions,
        quarterlySubscriptions,
        yearlySubscriptions,
        churnRate: parseFloat(churnRate),
        avgRevenuePerUser: parseFloat(avgRevenuePerUser),
        revenueByMonth: []
      });

    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      alert('Erreur lors du chargement des statistiques de revenus');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const loadedSettings = await settingsService.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Erreur lors du chargement des paramètres');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchUserStats();

      // Rafraîchir les données toutes les 30 secondes pour voir les connexions en temps réel
      const interval = setInterval(() => {
        fetchUserStats();
      }, 30000);

      return () => clearInterval(interval);
    } else if (activeTab === 'vouchers') {
      fetchVouchers();
    } else if (activeTab === 'manage-users') {
      fetchAllUsers();
    } else if (activeTab === 'revenue') {
      fetchRevenueStats();
    } else if (activeTab === 'settings') {
      loadSettings();
    }

    // Close sidebar on mobile when changing tabs
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [activeTab, fetchUserStats, fetchVouchers, fetchAllUsers, fetchRevenueStats, loadSettings]);

  // Filter users when search or filters change
  useEffect(() => {
    if (activeTab === 'manage-users') {
      applyFilters();
    }
  }, [searchQuery, filterRole, filterSubscription, allUsers]);


  const getActivityStatus = (lastSignIn) => {
    if (!lastSignIn) return { status: 'Jamais connecté', color: '#6b7280' };
    
    const now = Date.now();
    const lastSignInTime = new Date(lastSignIn).getTime();
    const diff = now - lastSignInTime;

    const fiveMinutes = 5 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    if (diff < fiveMinutes) return { status: 'En ligne', color: '#10b981' };
    if (diff < oneHour) return { status: 'Actif récemment', color: '#06b6d4' };
    if (diff < oneDay) return { status: 'Aujourd\'hui', color: '#3b82f6' };
    if (diff < oneWeek) return { status: 'Cette semaine', color: '#f59e0b' };
    return { status: 'Inactif', color: '#ef4444' };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Voucher management functions

  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    try {
      const voucherData = {
        ...voucherForm,
        code: voucherForm.code.toUpperCase(),
        expires_at: voucherForm.expires_at || null
      };

      if (editingVoucher) {
        await voucherService.updateVoucher(editingVoucher.id, voucherData);
        alert('Code promo mis à jour!');
      } else {
        await voucherService.createVoucher(voucherData);
        alert('Code promo créé avec succès!');
      }

      setShowVoucherForm(false);
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
      fetchVouchers();
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleEditVoucher = (voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      code: voucher.code,
      duration_months: voucher.duration_months,
      max_uses: voucher.max_uses,
      amount: voucher.amount,
      plan_type: voucher.plan_type,
      expires_at: voucher.expires_at ? new Date(voucher.expires_at).toISOString().slice(0, 16) : '',
      notes: voucher.notes || ''
    });
    setShowVoucherForm(true);
  };

  const handleDeleteVoucher = async (voucherId, code) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code "${code}"?`)) {
      return;
    }
    try {
      await voucherService.deleteVoucher(voucherId);
      alert('Code promo supprimé');
      fetchVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleVoucherStatus = async (voucher) => {
    try {
      const newStatus = voucher.status === 'active' ? 'inactive' : 'active';
      await voucherService.updateVoucher(voucher.id, { status: newStatus });
      fetchVouchers();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const generateRandomCode = () => {
    const prefix = 'PREMIUM';
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    setVoucherForm({ ...voucherForm, code: `${prefix}-${part1}-${part2}` });
  };

  const getPlanName = (planType) => {
    const plans = {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Semestre'
    };
    return plans[planType] || planType;
  };

  const getStatusBadge = (voucher) => {
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return { label: 'Expiré', color: '#ef4444' };
    }
    if (voucher.current_uses >= voucher.max_uses) {
      return { label: 'Épuisé', color: '#f59e0b' };
    }
    if (voucher.status === 'inactive') {
      return { label: 'Inactif', color: '#6b7280' };
    }
    return { label: 'Actif', color: '#10b981' };
  };

  // User management functions

  // Revenue statistics function

  // Settings functions

  const saveSettings = async () => {
    try {
      await settingsService.saveSettings(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const handlePricingChange = (plan, value) => {
    setSettings({
      ...settings,
      pricing: {
        ...settings.pricing,
        [plan]: parseFloat(value) || 0
      }
    });
  };

  const handleFeatureToggle = (feature) => {
    setSettings({
      ...settings,
      features: {
        ...settings.features,
        [feature]: !settings.features[feature]
      }
    });
  };

  const handleEmailToggle = (emailType) => {
    setSettings({
      ...settings,
      emails: {
        ...settings.emails,
        [emailType]: !settings.emails[emailType]
      }
    });
  };

  const handlePermissionToggle = (permission) => {
    setSettings({
      ...settings,
      permissions: {
        ...settings.permissions,
        [permission]: !settings.permissions[permission]
      }
    });
  };

  const handlePermissionValueChange = (permission, value) => {
    setSettings({
      ...settings,
      permissions: {
        ...settings.permissions,
        [permission]: parseInt(value) || 0
      }
    });
  };

  const resetSettings = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      const defaultSettings = {
        pricing: {
          monthly: 20,
          quarterly: 50,
          yearly: 100
        },
        features: {
          notes: true,
          flashcards: true,
          quiz: true,
          photos: true,
          files: true,
          advancedSearch: true
        },
        emails: {
          welcomeEmail: true,
          subscriptionReminder: true,
          expirationNotice: true,
          promotionalEmails: false
        },
        permissions: {
          allowUserRegistration: true,
          requireEmailVerification: false,
          allowGuestAccess: false,
          maxFilesPerUser: 50,
          maxNotesPerUser: 100
        }
      };
      setSettings(defaultSettings);
      localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
      alert('Paramètres réinitialisés !');
    }
  };


  const handlePromoteToAdmin = (userId) => {
    setConfirmModalContent({
      title: 'Promouvoir en admin',
      message: 'Êtes-vous sûr de vouloir promouvoir cet utilisateur en admin ?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);

          if (error) throw error;
          
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'success',
            title: 'Succès',
            message: 'Utilisateur promu en admin avec succès!'
          });
          setShowMessageModal(true);
          fetchAllUsers();
        } catch (error) {
          console.error('Error promoting user:', error);
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'error',
            title: 'Erreur',
            message: 'Erreur lors de la promotion'
          });
          setShowMessageModal(true);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDemoteToSpectator = (userId) => {
    setConfirmModalContent({
      title: 'Rétrograder en spectateur',
      message: 'Êtes-vous sûr de vouloir rétrograder cet admin en spectateur ?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'spectator' })
            .eq('id', userId);

          if (error) throw error;
          
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'success',
            title: 'Succès',
            message: 'Admin rétrogradé en spectateur avec succès!'
          });
          setShowMessageModal(true);
          fetchAllUsers();
        } catch (error) {
          console.error('Error demoting user:', error);
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'error',
            title: 'Erreur',
            message: 'Erreur lors de la rétrogradation'
          });
          setShowMessageModal(true);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleGrantPremium = (userId) => {
    setGrantPremiumUserId(userId);
    setGrantPremiumDuration(1);
    setShowGrantPremiumModal(true);
  };

  const confirmGrantPremium = async () => {
    if (!grantPremiumUserId) return;
    
    const duration = grantPremiumDuration;
    if (![1, 3, 6].includes(duration)) {
      setMessageModalContent({
        type: 'error',
        title: 'Durée invalide',
        message: 'Veuillez sélectionner 1, 3 ou 6 mois.'
      });
      setShowMessageModal(true);
      return;
    }

    setGrantPremiumLoading(true);
    try {
      // Récupérer les prix depuis la base de données
      const pricing = await settingsService.getPricing();
      
      // Déterminer le plan_type et le montant selon la durée
      let planType = 'monthly';
      let amount = pricing.monthly;
      
      if (duration === 3) {
        planType = 'quarterly';
        amount = pricing.quarterly;
      } else if (duration === 6) {
        planType = 'yearly';
        amount = pricing.yearly;
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + duration);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'premium',
          subscription_end_date: endDate.toISOString(),
          last_payment_date: new Date().toISOString(),
          payment_amount: amount,
          plan_type: planType
        })
        .eq('id', grantPremiumUserId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setShowGrantPremiumModal(false);
      setMessageModalContent({
        type: 'success',
        title: 'Succès',
        message: `Abonnement premium de ${duration} mois accordé avec succès!`
      });
      setShowMessageModal(true);
      fetchAllUsers();
    } catch (error) {
      console.error('Error granting premium:', error);
      setMessageModalContent({
        type: 'error',
        title: 'Erreur',
        message: `Erreur lors de l'octroi du premium: ${error.message || 'Erreur inconnue'}`
      });
      setShowMessageModal(true);
    } finally {
      setGrantPremiumLoading(false);
    }
  };

  const handleRevokePremium = (userId) => {
    setConfirmModalContent({
      title: 'Révoquer l\'abonnement premium',
      message: 'Êtes-vous sûr de vouloir révoquer l\'abonnement premium de cet utilisateur ?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              subscription_status: 'free',
              subscription_end_date: null
            })
            .eq('id', userId);

          if (error) throw error;
          
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'success',
            title: 'Succès',
            message: 'Abonnement premium révoqué avec succès!'
          });
          setShowMessageModal(true);
          fetchAllUsers();
        } catch (error) {
          console.error('Error revoking premium:', error);
          setShowConfirmModal(false);
          setMessageModalContent({
            type: 'error',
            title: 'Erreur',
            message: 'Erreur lors de la révocation'
          });
          setShowMessageModal(true);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleViewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const getSubscriptionStatus = (user) => {
    if (user.subscription_status === 'premium' && user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      if (endDate > new Date()) {
        return { label: 'Premium', color: '#10b981', active: true };
      }
    }
    return { label: 'Gratuit', color: '#6b7280', active: false };
  };

  return (
    <div className="dashboard-page">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity size={28} />
            {sidebarOpen && <span>Admin Dashboard</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span>Statistiques</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            <DollarSign size={20} />
            {sidebarOpen && <span>Revenus</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => setActiveTab('vouchers')}
          >
            <Gift size={20} />
            {sidebarOpen && <span>Codes Promo</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'manage-users' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage-users')}
          >
            <Users size={20} />
            {sidebarOpen && <span>Utilisateurs</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            {sidebarOpen && <span>Paramètres</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="sidebar-item"
            onClick={() => window.location.reload()}
          >
            <Home size={20} />
            {sidebarOpen && <span>Retour Accueil</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <button 
            className="sidebar-toggle-mobile"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <h1>
            {activeTab === 'stats' ? 'Statistiques' : 
             activeTab === 'revenue' ? 'Statistiques de Revenus' :
             activeTab === 'vouchers' ? 'Gestion Codes Promo' : 
             activeTab === 'settings' ? 'Paramètres et Configuration' :
             'Gestion Utilisateurs'}
          </h1>
        </div>

        <div className="dashboard-content">
          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Chargement des statistiques...</p>
            </div>
          ) : (
            <>
              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <>
                  {/* Statistiques principales */}
                  <div className="stats-grid">
                    <div className="stat-card total">
                      <div className="stat-icon">
                        <Users size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Total Utilisateurs</span>
                        <span className="stat-value">{stats.totalUsers}</span>
                      </div>
                    </div>

                    <div className="stat-card online">
                      <div className="stat-icon">
                        <Activity size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">En ligne maintenant</span>
                        <span className="stat-value">{stats.onlineUsers}</span>
                      </div>
                    </div>

                    <div className="stat-card active">
                      <div className="stat-icon">
                        <UserCheck size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Actifs (24h)</span>
                        <span className="stat-value">{stats.activeUsers}</span>
                      </div>
                    </div>

                    <div className="stat-card roles">
                      <div className="stat-icon">
                        <TrendingUp size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Admin / Spectateurs</span>
                        <span className="stat-value">{stats.adminUsers} / {stats.spectatorUsers}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liste des utilisateurs récents */}
                  <div className="recent-users">
                    <h3>
                      <Calendar size={20} />
                      Utilisateurs Récents
                    </h3>
                    <div className="users-list">
                      {stats.recentSignups.map((user) => {
                        const activity = getActivityStatus(user.last_sign_in_at);
                        return (
                          <div key={user.id} className="user-item">
                            <div className="user-avatar">
                              <Users size={20} />
                            </div>
                            <div className="user-details">
                              <div className="user-main">
                                <span className="user-name">
                                  {user.name || user.email}
                                </span>
                                <span 
                                  className="user-status"
                                  style={{ 
                                    color: activity.color,
                                    backgroundColor: `${activity.color}15`,
                                    border: `1px solid ${activity.color}40`
                                  }}
                                >
                                  {activity.status}
                                </span>
                                <span 
                                  className={`user-role ${user.role || 'spectator'}`}
                                >
                                  {user.role === 'admin' ? 'Admin' : 'Spectateur'}
                                </span>
                              </div>
                              <div className="user-meta">
                                <span className="user-email">{user.email}</span>
                                <span className="user-date">
                                  <Clock size={14} />
                                  Inscrit le {formatDate(user.created_at)}
                                </span>
                                {user.last_sign_in_at && (
                                  <span className="user-last-login">
                                    Dernière connexion: {formatDate(user.last_sign_in_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Revenue Tab */}
              {activeTab === 'revenue' && (
                <>
                  {/* Revenue Statistics Cards */}
                  <div className="stats-grid">
                    <div className="stat-card total">
                      <div className="stat-icon">
                        <DollarSign size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Revenus Totaux</span>
                        <span className="stat-value">{revenueStats.totalRevenue} DH</span>
                      </div>
                    </div>

                    <div className="stat-card online">
                      <div className="stat-icon">
                        <TrendingUp size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Revenus Ce Mois</span>
                        <span className="stat-value">{revenueStats.monthlyRevenue} DH</span>
                      </div>
                    </div>

                    <div className="stat-card active">
                      <div className="stat-icon">
                        <Calendar size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Renouvellements Prévus</span>
                        <span className="stat-value">{revenueStats.predictedRenewals} DH</span>
                      </div>
                    </div>

                    <div className="stat-card roles">
                      <div className="stat-icon">
                        <Users size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Taux de Rétention</span>
                        <span className="stat-value">{revenueStats.retentionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Revenue Stats */}
                  <div className="revenue-details">
                    <h3>
                      <BarChart3 size={20} />
                      Détails des Revenus
                    </h3>

                    <div className="revenue-cards-grid">
                      {/* Active Subscriptions Card */}
                      <div className="revenue-card">
                        <div className="revenue-card-header">
                          <div className="revenue-card-icon blue">
                            <UserCheck size={24} />
                          </div>
                          <div className="revenue-card-info">
                            <span className="revenue-card-label">Abonnements Actifs</span>
                            <span className="revenue-card-value">{revenueStats.activeSubscriptions}</span>
                          </div>
                        </div>
                        <div className="revenue-card-details">
                          <div className="detail-item">
                            <span>Mensuels</span>
                            <strong>{revenueStats.monthlySubscriptions}</strong>
                          </div>
                          <div className="detail-item">
                            <span>Trimestriels</span>
                            <strong>{revenueStats.quarterlySubscriptions || 0}</strong>
                          </div>
                          <div className="detail-item">
                            <span>Annuels</span>
                            <strong>{revenueStats.yearlySubscriptions}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Average Revenue Card */}
                      <div className="revenue-card">
                        <div className="revenue-card-header">
                          <div className="revenue-card-icon green">
                            <DollarSign size={24} />
                          </div>
                          <div className="revenue-card-info">
                            <span className="revenue-card-label">Revenu Moyen / Utilisateur</span>
                            <span className="revenue-card-value">{revenueStats.avgRevenuePerUser} DH</span>
                          </div>
                        </div>
                        <div className="revenue-card-footer">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill green"
                              style={{ width: `${Math.min((revenueStats.avgRevenuePerUser / 100) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Churn Rate Card */}
                      <div className="revenue-card">
                        <div className="revenue-card-header">
                          <div className="revenue-card-icon red">
                            <UserX size={24} />
                          </div>
                          <div className="revenue-card-info">
                            <span className="revenue-card-label">Taux de Désabonnement</span>
                            <span className="revenue-card-value">{revenueStats.churnRate}%</span>
                          </div>
                        </div>
                        <div className="revenue-card-footer">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill red"
                              style={{ width: `${revenueStats.churnRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Retention Rate Card */}
                      <div className="revenue-card">
                        <div className="revenue-card-header">
                          <div className="revenue-card-icon purple">
                            <TrendingUp size={24} />
                          </div>
                          <div className="revenue-card-info">
                            <span className="revenue-card-label">Rétention des Abonnés</span>
                            <span className="revenue-card-value">{revenueStats.retentionRate}%</span>
                          </div>
                        </div>
                        <div className="revenue-card-footer">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill purple"
                              style={{ width: `${revenueStats.retentionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Summary */}
                    <div className="revenue-summary">
                      <div className="summary-card">
                        <h4>💰 Résumé Financier</h4>
                        <div className="summary-items">
                          <div className="summary-item">
                            <span>Revenus totaux générés</span>
                            <strong className="amount-large">{revenueStats.totalRevenue} DH</strong>
                          </div>
                          <div className="summary-item">
                            <span>Revenus ce mois-ci</span>
                            <strong className="amount-medium">{revenueStats.monthlyRevenue} DH</strong>
                          </div>
                          <div className="summary-item">
                            <span>Prévisions de renouvellement (30j)</span>
                            <strong className="amount-medium text-green">{revenueStats.predictedRenewals} DH</strong>
                          </div>
                          <div className="summary-divider"></div>
                          <div className="summary-item highlight">
                            <span>Projection mensuelle estimée</span>
                            <strong className="amount-large text-blue">
                              {(() => {
                                // Calcul basé sur les abonnements actifs avec les prix de la BDD
                                const monthlyFromMonthly = revenueStats.monthlySubscriptions * revenueStats.avgRevenuePerUser;
                                const monthlyFromYearly = Math.round((revenueStats.yearlySubscriptions * revenueStats.avgRevenuePerUser) / 6);
                                return Math.round(monthlyFromMonthly + monthlyFromYearly);
                              })()} DH
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <>
                  <div className="settings-container">
                    {/* Pricing Settings */}
                    <div className="settings-section">
                      <div className="settings-header">
                        <DollarSign size={24} />
                        <h3>Prix des Abonnements</h3>
                      </div>
                      <div className="settings-content">
                        <div className="pricing-grid">
                          <div className="pricing-card">
                            <label>Abonnement Mensuel</label>
                            <div className="price-input-group">
                              <input
                                type="number"
                                value={settings.pricing.monthly}
                                onChange={(e) => handlePricingChange('monthly', e.target.value)}
                                min="0"
                              />
                              <span className="currency">DH</span>
                            </div>
                            <small>Prix par mois</small>
                          </div>
                          <div className="pricing-card">
                            <label>Abonnement Trimestriel</label>
                            <div className="price-input-group">
                              <input
                                type="number"
                                value={settings.pricing.quarterly}
                                onChange={(e) => handlePricingChange('quarterly', e.target.value)}
                                min="0"
                              />
                              <span className="currency">DH</span>
                            </div>
                            <small>Prix pour 3 mois</small>
                          </div>
                          <div className="pricing-card">
                            <label>Abonnement Annuel</label>
                            <div className="price-input-group">
                              <input
                                type="number"
                                value={settings.pricing.yearly}
                                onChange={(e) => handlePricingChange('yearly', e.target.value)}
                                min="0"
                              />
                              <span className="currency">DH</span>
                            </div>
                            <small>Prix pour 12 mois</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features Settings */}
                    <div className="settings-section">
                      <div className="settings-header">
                        <CheckCircle size={24} />
                        <h3>Fonctionnalités Disponibles</h3>
                      </div>
                      <div className="settings-content">
                        <div className="features-grid">
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>📝 Notes</strong>
                              <small>Créer et gérer des notes</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.notes}
                                onChange={() => handleFeatureToggle('notes')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>🎴 Flashcards</strong>
                              <small>Système de flashcards</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.flashcards}
                                onChange={() => handleFeatureToggle('flashcards')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>❓ Quiz</strong>
                              <small>Créer et jouer aux quiz</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.quiz}
                                onChange={() => handleFeatureToggle('quiz')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>📸 Photos</strong>
                              <small>Galerie de photos</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.photos}
                                onChange={() => handleFeatureToggle('photos')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>📁 Fichiers</strong>
                              <small>Télécharger des fichiers</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.files}
                                onChange={() => handleFeatureToggle('files')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>🔍 Recherche Avancée</strong>
                              <small>Recherche dans tout le contenu</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.features.advancedSearch}
                                onChange={() => handleFeatureToggle('advancedSearch')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Settings */}
                    <div className="settings-section">
                      <div className="settings-header">
                        <Activity size={24} />
                        <h3>Configuration des Emails Automatiques</h3>
                      </div>
                      <div className="settings-content">
                        <div className="features-grid">
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>👋 Email de Bienvenue</strong>
                              <small>Envoyé à l'inscription</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.emails.welcomeEmail}
                                onChange={() => handleEmailToggle('welcomeEmail')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>⏰ Rappel d'Abonnement</strong>
                              <small>7 jours avant expiration</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.emails.subscriptionReminder}
                                onChange={() => handleEmailToggle('subscriptionReminder')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>⚠️ Notification d'Expiration</strong>
                              <small>Quand l'abonnement expire</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.emails.expirationNotice}
                                onChange={() => handleEmailToggle('expirationNotice')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>📧 Emails Promotionnels</strong>
                              <small>Offres et nouveautés</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.emails.promotionalEmails}
                                onChange={() => handleEmailToggle('promotionalEmails')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Permissions Settings */}
                    <div className="settings-section">
                      <div className="settings-header">
                        <Shield size={24} />
                        <h3>Rôles et Permissions</h3>
                      </div>
                      <div className="settings-content">
                        <div className="permissions-grid">
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>👥 Autoriser l'Inscription</strong>
                              <small>Permettre aux nouveaux utilisateurs de s'inscrire</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.permissions.allowUserRegistration}
                                onChange={() => handlePermissionToggle('allowUserRegistration')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>✉️ Vérification Email</strong>
                              <small>Requérir la vérification de l'email</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.permissions.requireEmailVerification}
                                onChange={() => handlePermissionToggle('requireEmailVerification')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="feature-toggle">
                            <div className="feature-info">
                              <strong>👤 Accès Invité</strong>
                              <small>Permettre l'accès sans compte</small>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={settings.permissions.allowGuestAccess}
                                onChange={() => handlePermissionToggle('allowGuestAccess')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                          <div className="permission-input">
                            <label>📁 Max Fichiers par Utilisateur</label>
                            <input
                              type="number"
                              value={settings.permissions.maxFilesPerUser}
                              onChange={(e) => handlePermissionValueChange('maxFilesPerUser', e.target.value)}
                              min="1"
                              max="1000"
                            />
                          </div>
                          <div className="permission-input">
                            <label>📝 Max Notes par Utilisateur</label>
                            <input
                              type="number"
                              value={settings.permissions.maxNotesPerUser}
                              onChange={(e) => handlePermissionValueChange('maxNotesPerUser', e.target.value)}
                              min="1"
                              max="1000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save/Reset Buttons */}
                    <div className="settings-actions">
                      <button className="btn-save" onClick={saveSettings}>
                        <CheckCircle size={20} />
                        Sauvegarder les Paramètres
                      </button>
                      <button className="btn-reset" onClick={resetSettings}>
                        <X size={20} />
                        Réinitialiser
                      </button>
                      {settingsSaved && (
                        <div className="save-notification">
                          ✅ Paramètres sauvegardés !
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Vouchers Tab */}
              {activeTab === 'vouchers' && (
                <>
                  {/* Voucher Statistics */}
                  <div className="stats-grid">
                    <div className="stat-card total">
                      <div className="stat-icon">
                        <Gift size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Total Codes</span>
                        <span className="stat-value">{voucherStats.totalVouchers}</span>
                      </div>
                    </div>

                    <div className="stat-card online">
                      <div className="stat-icon">
                        <Activity size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Codes Actifs</span>
                        <span className="stat-value">{voucherStats.activeVouchers}</span>
                      </div>
                    </div>

                    <div className="stat-card active">
                      <div className="stat-icon">
                        <BarChart3 size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Total Utilisations</span>
                        <span className="stat-value">{voucherStats.totalRedemptions}</span>
                      </div>
                    </div>

                    <div className="stat-card roles">
                      <div className="stat-icon">
                        <DollarSign size={32} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Revenus Total</span>
                        <span className="stat-value">{voucherStats.totalRevenue} DH</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Voucher Button */}
                  <div className="voucher-actions">
                    <button 
                      className="btn-primary btn-add-voucher"
                      onClick={() => {
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
                      }}
                    >
                      <Plus size={20} />
                      Créer un Code Promo
                    </button>
                  </div>

                  {/* Voucher Form */}
                  {showVoucherForm && (
                    <div className="voucher-form-container">
                      <form onSubmit={handleVoucherSubmit} className="voucher-form">
                        <h3>{editingVoucher ? 'Modifier le Code' : 'Nouveau Code Promo'}</h3>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Code *</label>
                            <div className="code-input-group">
                              <input
                                type="text"
                                value={voucherForm.code}
                                onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                                placeholder="PREMIUM-1234-5678"
                                required
                              />
                              <button 
                                type="button" 
                                className="btn-generate"
                                onClick={generateRandomCode}
                                title="Générer un code aléatoire"
                              >
                                🎲
                              </button>
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Plan *</label>
                            <select
                              value={voucherForm.plan_type}
                              onChange={(e) => {
                                const plan = e.target.value;
                                const amounts = { 
                                  monthly: settings.pricing.monthly, 
                                  quarterly: settings.pricing.quarterly, 
                                  yearly: settings.pricing.yearly 
                                };
                                const durations = { monthly: 1, quarterly: 3, yearly: 6 };
                                setVoucherForm({ 
                                  ...voucherForm, 
                                  plan_type: plan,
                                  amount: amounts[plan],
                                  duration_months: durations[plan]
                                });
                              }}
                              required
                            >
                              <option value="monthly">Mensuel ({settings.pricing.monthly} DH - 1 mois)</option>
                              <option value="quarterly">Trimestriel ({settings.pricing.quarterly} DH - 3 mois)</option>
                              <option value="yearly">Semestre ({settings.pricing.yearly} DH - 6 mois)</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Montant (DH) *</label>
                            <input
                              type="number"
                              value={voucherForm.amount}
                              onChange={(e) => setVoucherForm({ ...voucherForm, amount: parseFloat(e.target.value) })}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label>Durée (mois) *</label>
                            <input
                              type="number"
                              value={voucherForm.duration_months}
                              onChange={(e) => setVoucherForm({ ...voucherForm, duration_months: parseInt(e.target.value) })}
                              min="1"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Utilisations Max *</label>
                            <input
                              type="number"
                              value={voucherForm.max_uses}
                              onChange={(e) => setVoucherForm({ ...voucherForm, max_uses: parseInt(e.target.value) })}
                              min="1"
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label>Date d'expiration</label>
                            <input
                              type="datetime-local"
                              value={voucherForm.expires_at}
                              onChange={(e) => setVoucherForm({ ...voucherForm, expires_at: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Notes</label>
                          <textarea
                            value={voucherForm.notes}
                            onChange={(e) => setVoucherForm({ ...voucherForm, notes: e.target.value })}
                            placeholder="Notes internes..."
                            rows="2"
                          />
                        </div>

                        <div className="form-actions">
                          <button type="submit" className="btn-primary">
                            {editingVoucher ? 'Mettre à jour' : 'Créer le Code'}
                          </button>
                          <button 
                            type="button" 
                            className="btn-secondary"
                            onClick={() => {
                              setShowVoucherForm(false);
                              setEditingVoucher(null);
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Vouchers List */}
                  <div className="vouchers-section">
                    <h3>
                      <Gift size={20} />
                      Tous les Codes Promo
                    </h3>
                    {vouchers.length === 0 ? (
                      <div className="empty-state">
                        <Gift size={48} />
                        <p>Aucun code promo créé</p>
                        <p className="empty-hint">Créez votre premier code pour commencer à vendre des abonnements</p>
                      </div>
                    ) : (
                      <div className="vouchers-list">
                        {vouchers.map((voucher) => {
                          const statusBadge = getStatusBadge(voucher);
                          const usagePercent = (voucher.current_uses / voucher.max_uses) * 100;
                          
                          return (
                            <div key={voucher.id} className="voucher-item">
                              <div className="voucher-header">
                                <div className="voucher-code-section">
                                  <span className="voucher-code">{voucher.code}</span>
                                  <span 
                                    className="voucher-status"
                                    style={{
                                      backgroundColor: `${statusBadge.color}15`,
                                      color: statusBadge.color,
                                      border: `1px solid ${statusBadge.color}`
                                    }}
                                  >
                                    {statusBadge.label}
                                  </span>
                                </div>
                                <div className="voucher-actions-btns">
                                  <button
                                    className="btn-icon-small"
                                    onClick={() => handleEditVoucher(voucher)}
                                    title="Modifier"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    className="btn-icon-small"
                                    onClick={() => handleToggleVoucherStatus(voucher)}
                                    title={voucher.status === 'active' ? 'Désactiver' : 'Activer'}
                                  >
                                    <Activity size={16} />
                                  </button>
                                  <button
                                    className="btn-icon-small btn-delete"
                                    onClick={() => handleDeleteVoucher(voucher.id, voucher.code)}
                                    title="Supprimer"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="voucher-details">
                                <div className="voucher-info-grid">
                                  <div className="info-item">
                                    <span className="info-label">Plan</span>
                                    <span className="info-value">{getPlanName(voucher.plan_type)}</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">Montant</span>
                                    <span className="info-value">{voucher.amount} DH</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">Durée</span>
                                    <span className="info-value">{voucher.duration_months} mois</span>
                                  </div>
                                  <div className="info-item">
                                    <span className="info-label">Utilisations</span>
                                    <span className="info-value">
                                      {voucher.current_uses} / {voucher.max_uses}
                                    </span>
                                  </div>
                                </div>

                                <div className="usage-bar">
                                  <div 
                                    className="usage-progress"
                                    style={{ 
                                      width: `${usagePercent}%`,
                                      backgroundColor: usagePercent === 100 ? '#f59e0b' : '#10b981'
                                    }}
                                  />
                                </div>

                                {voucher.expires_at && (
                                  <div className="voucher-expiry">
                                    <Clock size={14} />
                                    Expire le {formatDate(voucher.expires_at)}
                                  </div>
                                )}

                                {voucher.notes && (
                                  <div className="voucher-notes">
                                    📝 {voucher.notes}
                                  </div>
                                )}

                                <div className="voucher-meta">
                                  Créé le {formatDate(voucher.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Manage Users Tab */}
              {activeTab === 'manage-users' && (
                <>
                  {/* Search and Filters */}
                  <div className="user-management-header">
                    <div className="search-bar">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="filters-row">
                      <div className="filter-group">
                        <Filter size={16} />
                        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                          <option value="all">Tous les rôles</option>
                          <option value="admin">Admins</option>
                          <option value="spectator">Spectateurs</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <Shield size={16} />
                        <select value={filterSubscription} onChange={(e) => setFilterSubscription(e.target.value)}>
                          <option value="all">Tous les abonnements</option>
                          <option value="premium">Premium</option>
                          <option value="free">Gratuit</option>
                        </select>
                      </div>
                      <div className="user-count">
                        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="users-management-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Utilisateur</th>
                          <th>Email</th>
                          <th>Rôle</th>
                          <th>Abonnement</th>
                          <th>Inscription</th>
                          <th>Dernière connexion</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => {
                          const subStatus = getSubscriptionStatus(user);
                          const activity = getActivityStatus(user.last_sign_in_at);
                          
                          return (
                            <tr key={user.id}>
                              <td data-label="Utilisateur">
                                <div className="user-cell">
                                  <div className="user-avatar-small">
                                    <Users size={16} />
                                  </div>
                                  <div className="user-info">
                                    <span className="user-name-cell">{user.name || 'Sans nom'}</span>
                                    <span 
                                      className="activity-dot"
                                      style={{ backgroundColor: activity.color }}
                                      title={activity.status}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td data-label="Email" className="email-cell">{user.email}</td>
                              <td data-label="Rôle">
                                <span className={`role-badge ${user.role || 'spectator'}`}>
                                  {user.role === 'admin' ? 'Admin' : 'Spectateur'}
                                </span>
                              </td>
                              <td data-label="Abonnement">
                                <span 
                                  className="subscription-badge"
                                  style={{
                                    backgroundColor: `${subStatus.color}15`,
                                    color: subStatus.color,
                                    border: `1px solid ${subStatus.color}40`
                                  }}
                                >
                                  {subStatus.label}
                                </span>
                              </td>
                              <td data-label="Inscription" className="date-cell">
                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                              </td>
                              <td data-label="Dernière Connexion" className="date-cell">
                                {user.last_sign_in_at 
                                  ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                                  : 'Jamais'
                                }
                              </td>
                              <td data-label="Actions">
                                <div className="action-buttons">
                                  <button
                                    className="btn-action"
                                    onClick={() => handleViewUserDetails(user)}
                                    title="Voir détails"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {user.role !== 'admin' && (
                                    <button
                                      className="btn-action btn-promote"
                                      onClick={() => handlePromoteToAdmin(user.id)}
                                      title="Promouvoir en admin"
                                    >
                                      <Shield size={16} />
                                    </button>
                                  )}
                                  {user.role === 'admin' && (
                                    <button
                                      className="btn-action btn-demote"
                                      onClick={() => handleDemoteToSpectator(user.id)}
                                      title="Rétrograder en spectateur"
                                    >
                                      <UserX size={16} />
                                    </button>
                                  )}
                                  {subStatus.active ? (
                                    <button
                                      className="btn-action btn-revoke"
                                      onClick={() => handleRevokePremium(user.id)}
                                      title="Révoquer premium"
                                    >
                                      <Ban size={16} />
                                    </button>
                                  ) : (
                                    <button
                                      className="btn-action btn-grant"
                                      onClick={() => handleGrantPremium(user.id)}
                                      title="Accorder premium"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* User Details Modal */}
                  {showUserDetails && selectedUser && (
                    <div className="user-details-overlay" onClick={() => setShowUserDetails(false)}>
                      <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="user-details-header">
                          <h3>Détails de l'utilisateur</h3>
                          <button className="btn-icon" onClick={() => setShowUserDetails(false)}>
                            <X size={20} />
                          </button>
                        </div>
                        <div className="user-details-content">
                          {/* User Profile Card */}
                          <div className="user-profile-card">
                            <div className="user-profile-avatar">
                              <Users size={32} />
                            </div>
                            <div className="user-profile-info">
                              <h4 className="user-profile-name">{selectedUser.name || 'Sans nom'}</h4>
                              <p className="user-profile-email">{selectedUser.email}</p>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="user-info-grid">
                            <div className="info-row">
                              <span className="info-row-label">RÔLE</span>
                              <span className={`role-badge-large ${selectedUser.role || 'spectator'}`}>
                                {selectedUser.role === 'admin' ? '👑 Admin' : '👤 Spectateur'}
                              </span>
                            </div>

                            <div className="info-row">
                              <span className="info-row-label">ABONNEMENT</span>
                              <span 
                                className="subscription-badge-large"
                                style={{
                                  backgroundColor: `${getSubscriptionStatus(selectedUser).color}15`,
                                  color: getSubscriptionStatus(selectedUser).color,
                                  border: `2px solid ${getSubscriptionStatus(selectedUser).color}40`
                                }}
                              >
                                {getSubscriptionStatus(selectedUser).label}
                              </span>
                            </div>

                            <div className="info-row">
                              <span className="info-row-label">INSCRIPTION</span>
                              <span className="info-row-value">
                                {formatDate(selectedUser.created_at)}
                              </span>
                            </div>

                            <div className="info-row">
                              <span className="info-row-label">DERNIÈRE CONNEXION</span>
                              <span className="info-row-value">
                                {selectedUser.last_sign_in_at 
                                  ? formatDate(selectedUser.last_sign_in_at)
                                  : 'Jamais connecté'
                                }
                              </span>
                            </div>
                          </div>

                          {/* Actions Section */}
                          <div className="user-actions-section">
                            <h4 className="actions-title">ACTIONS</h4>
                            <div className="actions-grid">
                              {selectedUser.role !== 'admin' ? (
                                <button
                                  className="action-btn promote"
                                  onClick={() => {
                                    handlePromoteToAdmin(selectedUser.id);
                                    setShowUserDetails(false);
                                  }}
                                >
                                  <Shield size={18} />
                                  <span>Promouvoir Admin</span>
                                </button>
                              ) : (
                                <button
                                  className="action-btn demote"
                                  onClick={() => {
                                    handleDemoteToSpectator(selectedUser.id);
                                    setShowUserDetails(false);
                                  }}
                                >
                                  <UserX size={18} />
                                  <span>Rétrograder</span>
                                </button>
                              )}
                              
                              {getSubscriptionStatus(selectedUser).active ? (
                                <button
                                  className="action-btn revoke"
                                  onClick={() => {
                                    handleRevokePremium(selectedUser.id);
                                    setShowUserDetails(false);
                                  }}
                                >
                                  <Ban size={18} />
                                  <span>Révoquer Premium</span>
                                </button>
                              ) : (
                                <button
                                  className="action-btn grant"
                                  onClick={() => {
                                    handleGrantPremium(selectedUser.id);
                                    setShowUserDetails(false);
                                  }}
                                >
                                  <CheckCircle size={18} />
                                  <span>Accorder Premium</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal pour accorder premium */}
      {showGrantPremiumModal && (
        <div className="modal-overlay" onClick={() => !grantPremiumLoading && setShowGrantPremiumModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Accorder Premium</h2>
              <button 
                className="btn-icon" 
                onClick={() => !grantPremiumLoading && setShowGrantPremiumModal(false)}
                disabled={grantPremiumLoading}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Combien de mois d'abonnement premium souhaitez-vous accorder ?</p>
              <div className="duration-selector">
                <button
                  className={`duration-btn ${grantPremiumDuration === 1 ? 'active' : ''}`}
                  onClick={() => setGrantPremiumDuration(1)}
                  disabled={grantPremiumLoading}
                >
                  1 mois
                </button>
                <button
                  className={`duration-btn ${grantPremiumDuration === 3 ? 'active' : ''}`}
                  onClick={() => setGrantPremiumDuration(3)}
                  disabled={grantPremiumLoading}
                >
                  3 mois
                </button>
                <button
                  className={`duration-btn ${grantPremiumDuration === 6 ? 'active' : ''}`}
                  onClick={() => setGrantPremiumDuration(6)}
                  disabled={grantPremiumLoading}
                >
                  6 mois
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowGrantPremiumModal(false)}
                disabled={grantPremiumLoading}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmGrantPremium}
                disabled={grantPremiumLoading}
              >
                {grantPremiumLoading ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les messages */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className={messageModalContent.type === 'error' ? 'text-danger' : 'text-success'}>
                {messageModalContent.title}
              </h2>
              <button className="btn-icon" onClick={() => setShowMessageModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>{messageModalContent.message}</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setShowMessageModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les confirmations */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmation</h2>
              <button className="btn-icon" onClick={() => setShowConfirmModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>{confirmModalContent.message}</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirmModalContent.onConfirm) {
                    confirmModalContent.onConfirm();
                  }
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
