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
 * Vérifie l'authentification Supabase user.user_metadata.role
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      
      const url = new URL(request.url);
      const pathname = url.pathname;
      const path = url.searchParams.get('path');
      
      // Route: GET /view - Voir un fichier (pour admins seulement)
      if (request.method === 'GET' && pathname === '/view') {
        const filePath = url.searchParams.get('path');
        
        if (!filePath) {
          return new Response(JSON.stringify({ error: 'Path parameter required' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
        
        // Vérifier que c'est un admin
        const userRole = user.user_metadata?.role;
        if (userRole !== 'admin') {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
        
        try {
          const decodedPath = decodeURIComponent(filePath);
          const aws = new AwsClient({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            service: 's3',
            region: 'auto',
          });
          
          const encodedPath = encodeR2Path(decodedPath);
          const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodedPath}`;
          
          const signedRequest = await aws.sign(r2Url, {
            method: 'GET',
          });
          
          const fileResponse = await fetch(signedRequest);
          
          if (!fileResponse.ok) {
            return new Response(JSON.stringify({ error: 'File not found' }), {
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
          
          // Retourner le fichier directement
          return new Response(fileResponse.body, {
            headers: {
              'Content-Type': fileResponse.headers.get('Content-Type') || 'application/octet-stream',
              'Cache-Control': 'no-cache',
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error('Error viewing file:', error);
          return new Response(JSON.stringify({ error: 'Failed to load file' }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }
      
      // Route: POST /upload - Upload avec FormData (pour BankTransferForm)
      if (request.method === 'POST' && pathname === '/upload') {
        try {
          const formData = await request.formData();
          const file = formData.get('file');
          const filePath = formData.get('path');
          
          if (!file || !filePath) {
            return new Response(JSON.stringify({ error: 'File and path are required' }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }
          
          const fileData = await file.arrayBuffer();
          const contentType = file.type || 'application/octet-stream';
          const decodedPath = decodeURIComponent(filePath);
          
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
          
          // Retourner l'URL publique du fichier
          const publicUrl = `https://pub-7b40cd8a60564c57996c99bb2ef7024a.r2.dev/${encodedPath}`;
          
          return new Response(JSON.stringify({ 
            success: true, 
            path: decodedPath,
            url: publicUrl 
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error('Error uploading file via POST:', error);
          return new Response(JSON.stringify({ error: 'Failed to upload file', details: error.message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }
      
      // Vérifier l'abonnement (sauf pour les admins et les uploads de preuve de virement)
      const userRole = user.user_metadata?.role;
      const isTransferProof = path && path.startsWith('transfer-proofs/');
      
      if (userRole !== 'admin' && !isTransferProof) {
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
