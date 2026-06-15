// Supabase Edge Function: create-user
// Creates a new auth user + app_users row.
// Only admins (verified via their JWT) can call this.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !caller) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // 2. Verify the caller is an admin
    const { data: callerProfile } = await callerClient
      .from('app_users')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden — admin only' }, 403);
    }

    // 3. Parse the payload
    const body = await req.json();
    const { email, password, name, role, assigned_station } = body;
    if (!email || !password || !role) {
      return json({ error: 'Missing email/password/role' }, 400);
    }
    if (!['admin', 'volunteer', 'viewer'].includes(role)) {
      return json({ error: 'Invalid role' }, 400);
    }

    // 4. Create the user with the service-role client
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // 5. Insert the matching app_users row
    const { error: insertErr } = await admin.from('app_users').insert({
      id: created.user.id,
      email,
      name: name || null,
      role,
      assigned_station: role === 'volunteer' && assigned_station ? Number(assigned_station) : null,
    });
    if (insertErr) {
      // Clean up auth user if profile failed
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertErr.message }, 400);
    }

    return json({ id: created.user.id, email });
  } catch (err: any) {
    return json({ error: err?.message || 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
