export const notificationManager = {
  async requestPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },
  async subscribeToPush() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BGSYDQhokiAm4GWSmfVbAkU46vbj-Nnoakm7KuIqhxSb_Hr3M3UBmi-woEbTNEQ_kmA8WFyPDWQfDACfX7xC4zM'
      });
      // Envoyer la subscription au backend
      await fetch('outstanding-upliftment-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      return subscription;
    }
    return null;
  },
  async sendLocalNotification(title, body) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
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
