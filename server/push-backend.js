// index.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import webpush from 'web-push';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Clés VAPID depuis .env
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("⚠️ VAPID keys non définies !");
} else {
webpush.setVapidDetails(
  'mailto:alihajjaj930@gmail.com', // <-- ajoute le "mailto:"
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);
}

webpush.setVapidDetails(
  'mailto:alihajjaj930@gmail.com', // <-- ajoute le "mailto:"
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);


const subscriptions = [];

// Enregistrer une subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription enregistrée !' });
});

// Envoyer une notification à tous les abonnés
app.post('/notify', (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });
  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, payload).catch(err => console.error(err));
  });
  res.json({ message: 'Notifications envoyées !' });
});

// Railway fournit le port via process.env.PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Push backend running on port ${PORT}`));
    