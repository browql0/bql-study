// Supabase Edge Function pour gérer les webhooks de paiement CMI et Tijari
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les données du webhook
    const formData = await req.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
    }

    // Déterminer la passerelle (CMI ou Tijari)
    const gateway = data.gateway || (data.oid ? 'cmi' : 'tijari');
    
    let paymentId: string;
    let transactionId: string;
    let status: string;
    let amount: string;
    let isValid = false;

    if (gateway === 'cmi') {
      // Vérifier la signature CMI
      const storeKey = Deno.env.get('CMI_STORE_KEY');
      const storeId = Deno.env.get('CMI_STORE_ID');
      
      if (!storeKey || !storeId) {
        throw new Error('Configuration CMI manquante');
      }

      const hashString = `${storeId}${data.oid}${data.amount}${data.currency}${data.status}${storeKey}`;
      const expectedHash = await generateHash(hashString);
      
      isValid = data.hash === expectedHash;
      paymentId = data.oid;
      transactionId = data.transId || data.oid;
      status = data.status === 'success' ? 'completed' : 'failed';
      amount = data.amount;
    } else if (gateway === 'tijari') {
      // Vérifier la signature Tijari
      const apiKey = Deno.env.get('TIJARI_API_KEY');
      
      if (!apiKey) {
        throw new Error('Configuration Tijari manquante');
      }

      const signatureData = { ...data };
      delete signatureData.signature;
      
      const sortedParams = Object.keys(signatureData)
        .sort()
        .map(key => `${key}=${signatureData[key]}`)
        .join('&');
      
      const signatureString = `${sortedParams}&key=${apiKey}`;
      const expectedSignature = await generateHash(signatureString);
      
      isValid = data.signature === expectedSignature;
      paymentId = data.order_id;
      transactionId = data.transaction_id || data.order_id;
      status = data.status === 'success' ? 'completed' : 'failed';
      amount = data.amount;
    } else {
      throw new Error('Passerelle non supportée');
    }

    if (!isValid) {
      console.error('Signature invalide:', { gateway, paymentId, data });
      return new Response(
        JSON.stringify({ error: 'Signature invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Paiement non trouvé');
    }

    // Vérifier que le montant correspond
    if (parseFloat(amount) !== parseFloat(payment.amount.toString())) {
      throw new Error('Montant incorrect');
    }

    // Mettre à jour le paiement
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: status,
        transaction_id: transactionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Si le paiement est réussi, mettre à jour le profil
    if (status === 'completed') {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + payment.subscription_duration);

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          subscription_status: 'premium',
          subscription_end_date: endDate.toISOString(),
          last_payment_date: new Date().toISOString(),
          payment_amount: payment.amount,
          plan_type: payment.plan_type
        })
        .eq('id', payment.user_id);

      if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, paymentId, status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

