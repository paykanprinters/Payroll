import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, password, role } = await req.json();

    if (!fullName || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Full name, email, password, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirm email automatically
      user_metadata: { name: fullName, role: role },
    });

    if (authError) {
      console.error(`Error signing up user ${email}:`, authError);
      if (authError.message.includes('already exists')) {
        return new Response(JSON.stringify({ error: `User with email ${email} already exists in Supabase Auth.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (authData.user) {
      // 2. Insert profile into public.users table
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          name: fullName,
          email: email,
          role: role,
          status: "Active", // Default to Active for new users
        })
        .select();

      if (profileError) {
        console.error(`Error inserting profile for ${email}:`, profileError);
        // Attempt to delete auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ message: 'User created successfully', user: profileData[0] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to create user without specific error message.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});