import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import webpush from 'web-push';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
// Priorité à SERVICE_KEY pour bypasser RLS, sinon ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("🛑 Erreur: Les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_KEY sont requises.");
  process.exit(1);
}
console.log('🔑 Supabase configuré avec:', process.env.SUPABASE_SERVICE_KEY ? 'SERVICE_KEY (bypass RLS)' : 'ANON_KEY');
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

// FIX: Zidna adminOnlyMiddleware bach ntejanbou notifications bla idn
app.post('/notify', authMiddleware, adminOnlyMiddleware, async (req, res) => {
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

// Fonctions utilitaires pour le hash
const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Endpoint pour signer les paiements (CMI et Tijari)
// Had l-endpoint kay-signer les paiements bach nkhbbiw les secrets
app.post('/sign-payment', authMiddleware, async (req, res) => {
  try {
    const { gateway, params } = req.body;
    
    if (!gateway || !params) {
      return res.status(400).json({ error: 'Gateway and params required' });
    }
    
    if (gateway === 'cmi') {
      const storeKey = process.env.VITE_CMI_STORE_KEY;
      const storeId = process.env.VITE_CMI_STORE_ID;
      
      if (!storeKey || !storeId) {
        return res.status(500).json({ error: 'CMI configuration missing on server' });
      }
      
      // Reconstruct hash string exactly as client did
      // storeId + oid + amount + okUrl + failUrl + callbackUrl + storeKey
      // NOTE: amount should be formatted by client or here. Client sends fixed string usually?
      // In paymentService.js: amount: amount.toFixed(2)
      // We assume params.amount is already formatted correctly by client
      const hashString = `${storeId}${params.oid}${params.amount}${params.okUrl}${params.failUrl}${params.callbackurl}${storeKey}`;
      const hash = generateHash(hashString);
      
      return res.json({ hash });
      
    } else if (gateway === 'tijari') {
      const apiKey = process.env.VITE_TIJARI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'Tijari configuration missing on server' });
      }
      
      // Sort params and sign
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signatureString = `${sortedParams}&key=${apiKey}`;
      const signature = generateHash(signatureString);
      
      return res.json({ signature });
      
    } else {
      return res.status(400).json({ error: 'Invalid gateway' });
    }
  } catch (error) {
    console.error('Error signing payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Railway fournit le port via process.env.PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Push backend sécurisé démarré sur le port ${PORT}`));
