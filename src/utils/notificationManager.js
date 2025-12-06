import { supabase } from '../lib/supabase';

export const notificationManager = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Les notifications ne sont pas supportées par ce navigateur');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  },
  
  async subscribeToPush() {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      console.warn('Push notifications non supportées');
      return null;
    }
    
    try {
      // Récupérer le token d'authentification Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Utilisateur non authentifié');
        return null;
      }
      
      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier s'il existe déjà un abonnement
      let subscription = await registration.pushManager.getSubscription();
      
      // Si pas d'abonnement, en créer un nouveau
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BGSYDQhokiAm4GWSmfVbAkU46vbj-Nnoakm7KuIqhxSb_Hr3M3UBmi-woEbTNEQ_kmA8WFyPDWQfDACfX7xC4zM'
        });
      }
      
      // Envoyer la subscription au backend avec le token d'authentification
      const response = await fetch('https://outstanding-upliftment-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur lors de l\'enregistrement:', errorData);
        return null;
      }
      
      console.log('✅ Abonnement push enregistré avec succès');
      return subscription;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement push:', error);
      return null;
    }
  },
  
  async sendLocalNotification(title, body) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { 
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
      }
    }
  },
  
  async unsubscribeFromPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
          console.log('✅ Désabonnement réussi');
        }
      } catch (error) {
        console.error('Erreur lors du désabonnement:', error);
      }
    }
  },
  
  disable() {
    this.unsubscribeFromPush();
  },
  
  saveSettings(settings) {
    localStorage.setItem('notifSettings', JSON.stringify(settings));
  },
  
  getSettings() {
    return JSON.parse(localStorage.getItem('notifSettings') || '{}');
  },
  
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
};
