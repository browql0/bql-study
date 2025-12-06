import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import webpush from 'web-push';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Configuration CORS pour autoriser Vercel et localhost
app.use(cors({
  origin: [
    'https://bql-study.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
    /\.vercel\.app$/  // Tous les domaines Vercel
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// --- Configuration Supabase ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =  process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("🛑 Erreur: Les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_KEY (ou SUPABASE_ANON_KEY) sont requises.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Configuration VAPID pour Web Push ---
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("⚠️ VAPID keys non définies. Les notifications push ne fonctionneront pas.");
} else {
  webpush.setVapidDetails(
    'mailto:alihajjaj930@icloud.com', // Remplacez par votre email
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// --- Middleware pour l'authentification et l'autorisation ---
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès non autorisé: Token manquant.' });
  }
  
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: 'Accès non autorisé: Token invalide.' });
  }

  req.user = user;
  next();
};

const adminOnlyMiddleware = async (req, res, next) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (error || !data || data.role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé: Cette action requiert les droits administrateur.' });
    }
    next();
};


// --- Endpoints ---

// Enregistrer un abonnement push
app.post('/subscribe', authMiddleware, async (req, res) => {
  const subscription = req.body;
  const userId = req.user.id;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'L\'objet subscription est invalide.' });
  }

  // Insérer l'abonnement dans la base de données
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      subscription: subscription
    });

  if (error) {
    console.error("Erreur lors de l'enregistrement de l'abonnement:", error);
    // Gérer le cas où l'abonnement existe déjà (conflit unique)
    if (error.code === '23505') { // unique_violation
        return res.status(200).json({ message: 'Abonnement déjà enregistré.' });
    }
    return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  }

  res.status(201).json({ message: 'Abonnement enregistré avec succès !' });
});

// Envoyer une notification à tous les utilisateurs (Admin seulement)
app.post('/notify-all', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { title, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ message: 'Le titre et le corps de la notification sont requis.' });
  }

  const payload = JSON.stringify({ title, body });

  // Récupérer tous les abonnements de la base de données
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (error) {
    console.error("Erreur lors de la récupération des abonnements:", error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des abonnements.' });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return res.status(404).json({ message: 'Aucun abonnement trouvé.' });
  }

  // Envoyer les notifications
  const sendPromises = subscriptions.map(sub => 
    webpush.sendNotification(sub.subscription, payload)
      .catch(err => {
        // Si un abonnement est expiré ou invalide, le supprimer de la base de données
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Abonnement expiré trouvé. Suppression...`);
          return supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
        } else {
          console.error('Erreur lors de l\'envoi de la notification:', err);
        }
      })
  );

  await Promise.all(sendPromises);

  res.status(200).json({ message: 'Notifications envoyées avec succès !' });
});

// Envoyer une notification à des utilisateurs spécifiques
app.post('/notify', authMiddleware, async (req, res) => {
  const { userIds, title, body } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'La liste userIds est requise et doit contenir au moins un utilisateur.' });
  }
  
  if (!title || !body) {
    return res.status(400).json({ message: 'Le titre et le corps de la notification sont requis.' });
  }

  const payload = JSON.stringify({ title, body });

  // Récupérer les abonnements des utilisateurs spécifiés
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .in('user_id', userIds);

  if (error) {
    console.error("Erreur lors de la récupération des abonnements:", error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des abonnements.' });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return res.status(200).json({ message: 'Aucun abonnement trouvé pour ces utilisateurs.', sent: 0 });
  }

  // Envoyer les notifications
  let successCount = 0;
  const sendPromises = subscriptions.map(sub => 
    webpush.sendNotification(sub.subscription, payload)
      .then(() => {
        successCount++;
      })
      .catch(err => {
        // Si un abonnement est expiré ou invalide, le supprimer de la base de données
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Abonnement expiré trouvé. Suppression...`);
          return supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
        } else {
          console.error('Erreur lors de l\'envoi de la notification:', err);
        }
      })
  );

  await Promise.all(sendPromises);

  res.status(200).json({ 
    message: 'Notifications envoyées', 
    sent: successCount,
    total: subscriptions.length 
  });
});

// Railway fournit le port via process.env.PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Push backend sécurisé démarré sur le port ${PORT}`));
    