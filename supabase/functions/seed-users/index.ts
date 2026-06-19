import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const initialMockUsers = [
  { name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active" },
  { name: "Manager Smith", email: "manager@example.com", role: "Manager", status: "Active" },
  { name: "Staff Johnson", email: "staff@example.com", role: "Staff", status: "Active" },
  { name: "Viewer Brown", email: "viewer@example.com", role: "Viewer", status: "Active" },
  { name: "Inactive User", email: "inactive@example.com", role: "Staff", status: "Inactive" },
];

function generateStrongPassword() {
  // 24-char strong random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?';
  let pwd = '';
  const arr = new Uint32Array(24);
  crypto.getRandomValues(arr);
  for (let i = 0; i < arr.length; i++) {
    pwd += chars[arr[i] % chars.length];
  }
  return pwd;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("ALLOWED_ORIGIN") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (allowedOrigins.length > 0 && (!origin || !allowedOrigins.includes(origin))) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  try {
    // Require explicit enable flag for safety (default off)
    const allowSeed = (Deno.env.get('ALLOW_SEED') ?? 'false').toLowerCase() === 'true';
    if (!allowSeed) {
      return new Response(JSON.stringify({ error: 'Seeding disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Authorization required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify requesting user and role
    const { data: { user: requester }, error: getUserErr } = await supabaseAdmin.auth.getUser(token);
    if (getUserErr || !requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: requesterProfile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileErr || requesterProfile?.role !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Check if users already exist
    const { count: usersCount, error: countError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking existing users:', countError);
      return new Response(JSON.stringify({ error: 'Failed to check existing users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if ((usersCount ?? 0) > 0) {
      return new Response(JSON.stringify({ message: 'Users already seeded. Skipping.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const seededUsers: any[] = [];
    for (const mockUser of initialMockUsers) {
      const password = generateStrongPassword();

      // 1. Create user in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: mockUser.email,
        password,
        email_confirm: true,
        user_metadata: { name: mockUser.name, role: mockUser.role, status: mockUser.status },
      });

      let authId = authData?.user?.id;
      if (authError) {
        console.error(`Error signing up user ${mockUser.email}:`, authError);
        if (authError.message.includes('already exists')) {
          const { data: existingAuthUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(mockUser.email);
          if (!fetchError && existingAuthUser?.user?.id) {
            authId = existingAuthUser.user.id;
          } else {
            continue;
          }
        } else {
          continue;
        }
      }
      if (!authId) continue;

      // 2. Insert profile into public.users
      const { data: profileData, error: profileInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authId,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          status: mockUser.status,
        })
        .select()
        .single();

      if (profileInsertError) {
        console.error(`Error inserting profile for ${mockUser.email}:`, profileInsertError);
        continue;
      }
      seededUsers.push({ id: profileData.id, email: profileData.email, role: profileData.role });
    }

    return new Response(JSON.stringify({ message: 'Users seeded successfully', count: seededUsers.length, users: seededUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});