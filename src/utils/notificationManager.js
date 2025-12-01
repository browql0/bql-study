export const notificationManager = {
  async requestPermission() {
    if (!('Notification' in window)) {
      alert('Notifications non supportées sur cet appareil.');
      return false;
    }
    const permission = await Notification.requestPermission();
    alert('Permission notification: ' + permission);
    return permission === 'granted';
  },
  async subscribeToPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        alert('Service Worker prêt.');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BGSYDQhokiAm4GWSmfVbAkU46vbj-Nnoakm7KuIqhxSb_Hr3M3UBmi-woEbTNEQ_kmA8WFyPDWQfDACfX7xC4zM'
        });
        alert('Abonnement push réussi.');
        // Envoyer la subscription au backend
        const response = await fetch('https://outstanding-upliftment-production.up.railway.app/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        alert('Envoi au backend: ' + response.status);
        return subscription;
      } catch (err) {
        alert('Erreur abonnement push: ' + err);
        return null;
      }
    } else {
      alert('Push non supporté sur cet appareil.');
    }
    return null;
  },
  async sendLocalNotification(title, body) {
    if (Notification.permission === 'granted') {
      alert('Envoi notification locale: ' + title);
      new Notification(title, { body });
    } else {
      alert('Permission notification non accordée.');
    }
  },
  disable() {
    // Pas de désabonnement local, à gérer côté serveur si push
  },
  saveSettings(settings) {
    localStorage.setItem('notifSettings', JSON.stringify(settings));
  },
  getSettings() {
    return JSON.parse(localStorage.getItem('notifSettings') || '{}');
  }
};
