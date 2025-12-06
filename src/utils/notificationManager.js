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
      
      // Si un abonnement existe déjà, le désabonner d'abord
      if (subscription) {
        console.log('Abonnement existant trouvé, mise à jour...');
        await subscription.unsubscribe();
      }
      
      // Créer un nouvel abonnement
      // Note: La clé VAPID doit correspondre à celle du backend
      const vapidPublicKey = 'BKXXLDF_R14O5Sd45V3ke_L84tLLSwLqtXBq5i9e82VkGzCFyGJjKBj9gxmGURoj5Lak7MYcSHs8PMiuIAKhcFo';
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });
      
      console.log('✅ Nouvel abonnement créé:', subscription.endpoint);
      
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
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
        console.error('Erreur lors de l\'enregistrement:', errorData);
        throw new Error(errorData.message || 'Erreur d\'enregistrement');
      }
      
      const result = await response.json();
      console.log('✅ Abonnement push enregistré avec succès:', result);
      return subscription;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement push:', error);
      
      // Messages d'erreur plus explicites
      if (error.name === 'AbortError') {
        console.error('❌ La clé VAPID est invalide ou le service push n\'est pas disponible');
        console.error('💡 Solution: Vérifiez que la clé VAPID publique correspond à celle du backend');
      } else if (error.name === 'NotAllowedError') {
        console.error('❌ Permission refusée par l\'utilisateur');
      } else if (error.message.includes('network')) {
        console.error('❌ Erreur réseau: Impossible de joindre le serveur');
      }
      
      throw error;
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
