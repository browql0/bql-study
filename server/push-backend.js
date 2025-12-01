// Backend Node.js pour envoyer des notifications push
import webpush from 'web-push';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config'; // pour charger .env si nécessaire

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Clés VAPID (à générer avec web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:admin@tonsite.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Stockage en mémoire des subscriptions (à remplacer par une DB en prod)
const subscriptions = [];

// Route pour enregistrer une subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription enregistrée !' });
});

// Route pour envoyer une notification à tous les abonnés
app.post('/notify', (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });
  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, payload).catch(err => console.error(err));
  });
  res.json({ message: 'Notifications envoyées !' });
});

app.listen(4000, () => {
  console.log('Push backend running on port 4000');
});
