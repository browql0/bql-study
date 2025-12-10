import React, { useState, useCallback, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContextSupabase';
import Header from './components/Header';
import SubjectList from './components/SubjectList';
import SubjectDetail from './components/SubjectDetail';
import AddSubjectModal from './components/AddSubjectModal';
import Profile from './components/Profile';
import AdvancedSearch from './components/AdvancedSearch';
import Dashboard from './components/Dashboard';
import PaymentModal from './components/PaymentModal';
import PaymentCheckout from './components/PaymentCheckout';
import VoucherModal from './components/VoucherModal';
import DeviceLimitModal from './components/DeviceLimitModal';
import Login from './components/Login';
import UserNavigation from './components/UserNavigation';
import UserResources from './components/UserResources';
import UserNotifications from './components/UserNotifications';
import UserPaymentHistory from './components/UserPaymentHistory';
import UserSettings from './components/UserSettings';
import UserProfile from './components/UserProfile';
import { subscriptionService } from './services/subscriptionService';
import { deviceService } from './services/deviceService';
import { GraduationCap } from 'lucide-react';
import './App.css';

function AppContent() {
  // usePullToRefresh(); // Désactivé pour comportement natif iOS
  const { currentUser, subjects, loading, theme, subscriptionWarning, setSubscriptionWarning } = useApp();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [showDeviceLimitModal, setShowDeviceLimitModal] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [activeSection, setActiveSection] = useState('cours');
  const [activeTab, setActiveTab] = useState('notes');
  const [deviceCheckDone, setDeviceCheckDone] = useState(false);
  const [userView, setUserView] = useState('home'); // home, resources, notifications, payments, settings
  
  // Vérifier si on est sur une page de paiement
  const isPaymentPage = window.location.pathname.includes('/payment/');

  const checkSubscription = useCallback(async (forceRefresh = false) => {
    if (currentUser?.id) {
      const hasAccess = await subscriptionService.hasActiveSubscription(currentUser.id, forceRefresh);
      setHasSubscription(hasAccess);
      return hasAccess;
    } else {
      setHasSubscription(false);
      return false;
    }
  }, [currentUser]);

  // Vérifier l'abonnement au chargement et périodiquement
  React.useEffect(() => {
    if (currentUser?.id) {
      // Forcer le rafraîchissement au chargement pour s'assurer que l'expiration est détectée
      checkSubscription(true);
      
      // Vérifier aussi toutes les 10 secondes pour détecter l'expiration plus rapidement
      const interval = setInterval(() => {
        checkSubscription(true); // Toujours forcer le rafraîchissement
      }, 10000); // 10 secondes au lieu de 30 pour une détection plus rapide
      
      return () => clearInterval(interval);
    } else {
      // Si pas d'utilisateur, s'assurer que hasSubscription est false
      setHasSubscription(false);
    }
  }, [currentUser, checkSubscription]);

  // Vérifier et enregistrer l'appareil au chargement
  useEffect(() => {
    const checkDevice = async () => {
      if (currentUser?.id && !deviceCheckDone) {
        try {
          const result = await deviceService.registerDevice(currentUser.id);
          
          if (!result.success) {
            // Limite d'appareils atteinte
            setShowDeviceLimitModal(true);
            
            // Déconnecter après 5 secondes
            setTimeout(async () => {
              const { supabase } = await import('./lib/supabase');
              await supabase.auth.signOut();
              window.location.reload();
            }, 5000);
          }
          
          setDeviceCheckDone(true);
        } catch (error) {
          console.error('Erreur vérification appareil:', error);
          setDeviceCheckDone(true);
        }
      }
    };

    checkDevice();
  }, [currentUser, deviceCheckDone]);

  const handlePaymentSuccess = async (plan) => {
    if (currentUser?.id) {
      const result = await subscriptionService.createPayment(currentUser.id, plan);
      if (result.success) {
        await checkSubscription();
        alert('🎉 Paiement réussi ! Vous avez maintenant accès à tout le contenu.');
        
        // Notifier les admins du nouveau paiement
        try {
          const { notifyAdmins } = await import('./services/pushNotificationService');
          const planNames = {
            monthly: 'Mensuel (150 DH)',
            quarterly: 'Trimestriel (350 DH)',
            yearly: 'Semestre (600 DH)'
          };
          await notifyAdmins(
            'new_payment',
            '💰 Nouveau paiement',
            `${currentUser.name} - ${planNames[plan] || plan}`
          );
        } catch (notifError) {
          console.debug('Push notification failed:', notifError);
        }
      } else {
        alert('Erreur lors du paiement. Veuillez réessayer.');
      }
    }
  };

  const handleVoucherSuccess = async (result) => {
    await checkSubscription();
    const planNames = {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Semestre'
    };
    const planName = planNames[result.plan_type] || 'Premium';
    alert(`🎉 Code activé avec succès !\nPlan: ${planName}\nDurée: ${result.duration_months} mois`);
  };

  // Vérifier si la matière sélectionnée existe toujours
  React.useEffect(() => {
    if (selectedSubject) {
      const stillExists = subjects.find(s => s.id === selectedSubject.id);
      if (!stillExists) {
        setSelectedSubject(null);
      }
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    // Changer la couleur de la barre de statut iOS selon le thème
    const metaBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaBar) {
      if (theme === 'dark') {
        metaBar.setAttribute('content', 'black-translucent');
      } else {
        metaBar.setAttribute('content', 'white');
      }
    }
    // Changer la couleur du theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      if (theme === 'dark') {
        metaTheme.setAttribute('content', '#1a1d29'); // couleur du header dark
      } else {
        metaTheme.setAttribute('content', '#fff');
      }
    }
  }, [theme]);

  // --- NOUVELLE STRUCTURE DE CHARGEMENT ULTRA STYLISÉE ---
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-logo-wrapper">
            {/* Les cercles animés */}
            <div className="loading-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
              <div className="ring-glow"></div>
            </div>
            
            {/* L'icône centrale */}
            <div className="loading-icon-center">
              <GraduationCap size={44} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="loading-text-wrapper">
            <h2 className="loading-title">Study Space</h2>
            <div className="loading-status">
              <span>Préparation de votre espace</span>
              <div className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher la page de checkout de paiement si nécessaire
  if (isPaymentPage) {
    return <PaymentCheckout />;
  }

  if (!currentUser) {
    return <Login />;
  }

  const handleSearchResult = (result) => {
    // Find and select the subject
    const subject = subjects.find(s => s.id === result.subjectId);
    if (subject) {
      setSelectedSubject(subject);
      // Navigate to the correct section and tab
      setActiveSection(result.section);
      // Map result type to tab name
      const tabMap = {
        'note': 'notes',
        'photo': 'photos',
        'file': 'files'
      };
      setActiveTab(tabMap[result.type] || 'notes');
    }
  };

  return (
    <>
      <div id="pull-loader"></div>
      <div className="app">
        {/* Alerte d'expiration d'abonnement */}
        {subscriptionWarning?.showWarning && (
          <div className={`subscription-warning ${subscriptionWarning.severity || 'warning'}`}>
            <span>{subscriptionWarning.message}</span>
            <div className="warning-actions">
              {subscriptionWarning.severity !== 'error' && (
                <button 
                  className="btn-warning-action"
                  onClick={() => setShowPayment(true)}
                >
                  Renouveler
                </button>
              )}
              <button 
                className="btn-warning-close"
                onClick={() => setSubscriptionWarning(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {showDashboard ? (
          <Dashboard />
        ) : (
          <>
            {/* Affichage basé sur userView pour mobile */}
            {userView === 'resources' ? (
              <UserResources />
            ) : userView === 'profile' ? (
              <UserProfile 
                onClose={() => setUserView('home')} 
                onOpenPayment={() => {
                  setUserView('home');
                  setShowPayment(true);
                }}
              />
            ) : userView === 'notifications' ? (
              <UserNotifications />
            ) : userView === 'payments' ? (
              <UserPaymentHistory />
            ) : userView === 'settings' ? (
              <UserSettings onOpenPayment={() => setShowPayment(true)} />
            ) : (
              <>
                {/* Vue principale (home) */}
                <Header 
                  onAddSubject={() => setShowAddModal(true)}
                  onOpenProfile={() => setShowProfile(true)}
                  onOpenSearch={() => setShowAdvancedSearch(true)}
                  onOpenDashboard={() => setShowDashboard(true)}
                />
                
                <div className="main-content container">
                  {selectedSubject ? (
                    <SubjectDetail 
                      subject={selectedSubject} 
                      onBack={() => setSelectedSubject(null)}
                      initialSection={activeSection}
                      initialTab={activeTab}
                      hasSubscription={hasSubscription}
                      onUpgrade={() => setShowPayment(true)}
                    />
                  ) : (
                    <SubjectList 
                      onSelectSubject={setSelectedSubject}
                      hasSubscription={hasSubscription}
                      onUpgrade={() => setShowPayment(true)}
                    />
                  )}
                </div>
              </>
            )}

            {/* Navigation mobile utilisateur */}
            <UserNavigation activeView={userView} setActiveView={setUserView} />

            {showAddModal && (
              <AddSubjectModal onClose={() => setShowAddModal(false)} />
            )}

            {showProfile && (
              <Profile 
                onClose={() => setShowProfile(false)} 
                onOpenPayment={() => setShowPayment(true)}
                onRefreshSubscription={checkSubscription}
              />
            )}

            {showAdvancedSearch && (
              <AdvancedSearch 
                onClose={() => setShowAdvancedSearch(false)}
                onSelectResult={handleSearchResult}
              />
            )}

            {showPayment && (
              <PaymentModal 
                onClose={() => setShowPayment(false)}
                onPaymentSuccess={handlePaymentSuccess}
                onOpenVoucher={() => {
                  setShowPayment(false);
                  setShowVoucher(true);
                }}
              />
            )}

            {showVoucher && (
              <VoucherModal 
                onClose={() => setShowVoucher(false)}
                userId={currentUser?.id}
                onSuccess={handleVoucherSuccess}
              />
            )}

            {showDeviceLimitModal && (
              <DeviceLimitModal onClose={() => setShowDeviceLimitModal(false)} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;