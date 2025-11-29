import { AwsClient } from 'aws4fetch';

/**
 * Vérifie l'authentification Supabase
 */
async function verifySupabaseAuth(token, supabaseUrl, supabaseAnonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey
      }
    });

    if (!response.ok) return null;
    const user = await response.json();
    return user;
  } catch (err) {
    console.error('Error verifying auth:', err);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a un abonnement actif
 */
async function hasActiveSubscription(userId, supabaseUrl, supabaseAnonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/has_active_subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ user_id: userId })
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result === true;
  } catch (err) {
    console.error('Error checking subscription:', err);
    return false;
  }
}

/**
 * Encode le path pour R2 (gère les espaces et caractères spéciaux)
 */
function encodeR2Path(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

/**
 * Handler principal pour Vercel
 */
export default async function handler(req, res) {
  // Récupérer les secrets depuis Vercel
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // Vérification des secrets
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Worker not configured' });
  }

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const user = await verifySupabaseAuth(token, supabaseUrl, supabaseAnonKey);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    // Vérifier l'abonnement (sauf admin)
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      const hasSubscription = await hasActiveSubscription(user.id, supabaseUrl, supabaseAnonKey);
      if (!hasSubscription) return res.status(403).json({ error: 'Subscription required' });
    }

    // Récupérer le path
    const path = req.query.path;
    if (!path) return res.status(400).json({ error: 'Path parameter required' });

    const decodedPath = decodeURIComponent(path);

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    const encodedPath = encodeR2Path(decodedPath);
    const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodedPath}`;

    // PUT - Upload
    if (req.method === 'PUT') {
      // Lire le body - Vercel expose req.body comme un Buffer ou un stream
      let fileData;
      if (req.body) {
        // Si req.body est déjà un Buffer
        if (Buffer.isBuffer(req.body)) {
          fileData = req.body;
        } else if (typeof req.body === 'string') {
          fileData = Buffer.from(req.body, 'utf-8');
        } else {
          // Si c'est un stream, le lire
          const chunks = [];
          for await (const chunk of req.body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          fileData = Buffer.concat(chunks);
        }
      } else {
        // Fallback: lire depuis req directement
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        fileData = Buffer.concat(chunks);
      }
      const contentType = req.headers['content-type'] || 'application/octet-stream';

      const signedRequest = await aws.sign(r2Url, {
        method: 'PUT',
        body: fileData,
        headers: { 'Content-Type': contentType },
      });

      const uploadResponse = await fetch(signedRequest);
      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        return res.status(uploadResponse.status).json({ error: `Upload failed: ${uploadResponse.status} ${errText}` });
      }

      return res.status(200).json({ success: true, path: decodedPath });
    }

    // DELETE - Supprimer
    if (req.method === 'DELETE') {
      const signedRequest = await aws.sign(r2Url, { method: 'DELETE' });
      const deleteResponse = await fetch(signedRequest);

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errText = await deleteResponse.text();
        return res.status(deleteResponse.status).json({ error: `Delete failed: ${deleteResponse.status} ${errText}` });
      }

      return res.status(200).json({ success: true });
    }

    // Méthode non supportée
    return res.status(405).json({ error: 'Method not allowed. Only PUT and DELETE are supported.' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
