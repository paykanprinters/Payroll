import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock user data from UserControlPanel.tsx
const initialMockUsers = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active", password: "password" },
  { id: "2", name: "Manager Smith", email: "manager@example.com", role: "Manager", status: "Active", password: "password" },
  { id: "3", name: "Staff Johnson", email: "staff@example.com", role: "Staff", status: "Active", password: "password" },
  { id: "4", name: "Viewer Brown", email: "viewer@example.com", role: "Viewer", status: "Active", password: "password" },
  { id: "5", name: "Inactive User", email: "inactive@example.com", role: "Staff", status: "Inactive", password: "password" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingUsersCount, error: countError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('Error checking existing users:', countError);
      return new Response(JSON.stringify({ error: 'Failed to check existing users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (existingUsersCount.count > 0) {
      return new Response(JSON.stringify({ message: 'Users already seeded. Skipping.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const seededUsers = [];
    for (const mockUser of initialMockUsers) {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: mockUser.email,
        password: mockUser.password,
        email_confirm: true, // Confirm email automatically for seeding
        user_metadata: { name: mockUser.name, role: mockUser.role, status: mockUser.status },
      });

      if (authError) {
        console.error(`Error signing up user ${mockUser.email}:`, authError);
        // If user already exists in auth.users, try to fetch their ID and proceed to profile creation
        if (authError.message.includes('already exists')) {
          const { data: existingAuthUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(mockUser.email);
          if (fetchError || !existingAuthUser) {
            console.error(`Failed to fetch existing auth user ${mockUser.email}:`, fetchError);
            continue; // Skip this user if we can't get their ID
          }
          authData.user = existingAuthUser.user;
        } else {
          continue; // Skip to next user if other auth error
        }
      }

      if (authData.user) {
        // 2. Insert profile into public.users table
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
            status: mockUser.status,
          })
          .select();

        if (profileError) {
          console.error(`Error inserting profile for ${mockUser.email}:`, profileError);
          continue;
        }
        seededUsers.push(profileData[0]);
      }
    }

    return new Response(JSON.stringify({ message: 'Users seeded successfully', seededUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});