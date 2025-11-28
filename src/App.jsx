import React, { useState, useCallback } from 'react';
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
import Login from './components/Login';
import { subscriptionService } from './services/subscriptionService';
import { GraduationCap } from 'lucide-react';
import './App.css';

function AppContent() {
  const { currentUser, subjects, loading } = useApp();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [activeSection, setActiveSection] = useState('cours');
  const [activeTab, setActiveTab] = useState('notes');
  
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
      checkSubscription();
      
      // Vérifier aussi toutes les 30 secondes pour détecter l'expiration
      const interval = setInterval(() => {
        checkSubscription();
      }, 30000); // 30 secondes
      
      return () => clearInterval(interval);
    }
  }, [currentUser, checkSubscription]);

  const handlePaymentSuccess = async (plan) => {
    if (currentUser?.id) {
      const result = await subscriptionService.createPayment(currentUser.id, plan);
      if (result.success) {
        await checkSubscription();
        alert('🎉 Paiement réussi ! Vous avez maintenant accès à tout le contenu.');
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

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-brand">
            <div className="loading-icon">
              <GraduationCap size={48} />
            </div>
            <h2 className="loading-title">Study Space</h2>
          </div>
          <div className="loading-spinner-wrapper">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
          </div>
          <p className="loading-text">Chargement de votre espace...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
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
    <div className="app">
      {showDashboard ? (
        <Dashboard />
      ) : (
        <>
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
        </>
      )}
    </div>
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
