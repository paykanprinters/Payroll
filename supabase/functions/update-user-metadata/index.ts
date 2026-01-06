import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins; optionally restrict later
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, metadata } = await req.json();
    if (!userId || !metadata) {
      console.error("[update-user-metadata] Missing userId or metadata");
      return new Response(JSON.stringify({ error: 'User ID and metadata are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[update-user-metadata] Missing Authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requestingUser) {
      console.error("[update-user-metadata] Token invalid or user not found", { error: userError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .maybeSingle();
    if (profileError || requestingUserProfile?.role !== 'Admin') {
      console.error("[update-user-metadata] Forbidden: caller is not Admin", { profileError, role: requestingUserProfile?.role });
      return new Response(JSON.stringify({ error: 'Forbidden: Only Admins can update user metadata.' }), {
        status: 403, headers: corsHeaders
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: metadata });
    if (error) {
      console.error("[update-user-metadata] Admin updateUserById failed", { error });
      return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log("[update-user-metadata] User metadata updated", { userId: data.user?.id });
    return new Response(JSON.stringify({ message: 'User metadata updated successfully.', user: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[update-user-metadata] Uncaught error", { error });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});