import { createClient } from '@supabase/supabase-js';

export function clients(req) {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const pub =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !pub) {
    throw new Error('Supabase URL/publishable key ontbreken.');
  }

  if (!secret) {
    throw new Error(
      'Adminbeheer is nog niet geactiveerd: SUPABASE_SECRET_KEY ontbreekt in Vercel.'
    );
  }

  const token = (req.headers.authorization || '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  const user = createClient(url, pub, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const admin = createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return { user, admin, token };
}

export async function requireAdmin(req) {
  const { user, admin, token } = clients(req);

  if (!token) {
    throw new Error('Niet ingelogd.');
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await user.auth.getUser(token);

  if (authError || !authUser) {
    throw new Error('Ongeldige of verlopen sessie.');
  }

  const isAdmin =
    authUser.app_metadata?.role === 'admin';

  if (!isAdmin) {
    throw new Error('Geen adminrechten.');
  }

  return { admin, authUser };
}
