/**
 * Cloudflare Worker pour upload et delete de fichiers R2
 * 
 * Ce worker :
 * 1. Vérifie l'authentification via Supabase JWT
 * 2. Vérifie que l'utilisateur a un abonnement actif (sauf admins)
 * 3. Gère les uploads (PUT) et suppressions (DELETE) de fichiers R2
 */

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
    
    if (!response.ok) {
      return null;
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error verifying auth:', error);
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
    
    if (!response.ok) {
      return false;
    }
    
    const result = await response.json();
    return result === true;
  } catch (error) {
    console.error('Error checking subscription:', error);
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
 * Handler principal du Worker
 */
export default {
  async fetch(request, env) {
    // Récupérer les secrets depuis l'environnement
    const accountId = env.R2_ACCOUNT_ID;
    const accessKeyId = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const bucketName = env.R2_BUCKET_NAME;
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;
    
    // Vérifier que tous les secrets sont configurés
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Worker not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Headers CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Gérer les CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Vérifier l'authentification
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      
      const token = authHeader.substring(7);
      const user = await verifySupabaseAuth(token, supabaseUrl, supabaseAnonKey);
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      
      // Vérifier l'abonnement (sauf pour les admins)
      const userRole = user.user_metadata?.role;
      if (userRole !== 'admin') {
        const hasSubscription = await hasActiveSubscription(user.id, supabaseUrl, supabaseAnonKey);
        if (!hasSubscription) {
          return new Response(JSON.stringify({ error: 'Subscription required' }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }
      
      const url = new URL(request.url);
      const path = url.searchParams.get('path');
      const decodedPath = path ? decodeURIComponent(path) : null;
      
      if (!decodedPath) {
        return new Response(JSON.stringify({ error: 'Path parameter required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
      
      // Route: PUT - Upload un fichier
      if (request.method === 'PUT') {
        try {
          const fileData = await request.arrayBuffer();
          const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
          
          const aws = new AwsClient({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            service: 's3',
            region: 'auto',
          });
          
          const encodedPath = encodeR2Path(decodedPath);
          const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodedPath}`;
          
          const signedRequest = await aws.sign(r2Url, {
            method: 'PUT',
            body: fileData,
            headers: {
              'Content-Type': contentType,
            },
          });
          
          const uploadResponse = await fetch(signedRequest);
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            return new Response(JSON.stringify({ error: `Upload failed: ${uploadResponse.status} ${errorText}` }), {
              status: uploadResponse.status,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
          
          return new Response(JSON.stringify({ success: true, path: decodedPath }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          return new Response(JSON.stringify({ error: 'Failed to upload file', details: error.message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }
      
      // Route: DELETE - Supprimer un fichier
      if (request.method === 'DELETE') {
        try {
          const aws = new AwsClient({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            service: 's3',
            region: 'auto',
          });
          
          const encodedPath = encodeR2Path(decodedPath);
          const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodedPath}`;
          
          const signedRequest = await aws.sign(r2Url, {
            method: 'DELETE',
          });
          
          const deleteResponse = await fetch(signedRequest);
          
          // 404 est acceptable (fichier déjà supprimé)
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            const errorText = await deleteResponse.text();
            return new Response(JSON.stringify({ error: `Delete failed: ${deleteResponse.status} ${errorText}` }), {
              status: deleteResponse.status,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
          
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error('Error deleting file:', error);
          return new Response(JSON.stringify({ error: 'Failed to delete file', details: error.message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }
      
      // Méthode non supportée
      return new Response(JSON.stringify({ error: 'Method not allowed. Only PUT and DELETE are supported.' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
