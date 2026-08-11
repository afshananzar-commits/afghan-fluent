import { clients } from './_supabaseAdmin.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { user, admin } = clients(req);
    const { data: authData, error: authError } = await user.auth.getUser();
    const authUser = authData?.user;
    if (authError || !authUser) return res.status(401).json({ error: 'Niet ingelogd.' });

    let { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profileError) throw profileError;

    // Keep the authoritative admin role from Auth metadata in sync with profiles.
    const metadataRole = authUser.app_metadata?.role;
    if (!profile) {
      const displayName = authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Leerling';
      const role = metadataRole === 'admin' ? 'admin' : 'user';
      const { data: created, error: createError } = await admin
        .from('profiles')
        .upsert({ id: authUser.id, display_name: displayName, role, mode: 'adult', is_active: true }, { onConflict: 'id' })
        .select('*')
        .single();
      if (createError) throw createError;
      profile = created;
    } else if (metadataRole === 'admin' && profile.role !== 'admin') {
      const { data: updated, error: updateError } = await admin
        .from('profiles')
        .update({ role: 'admin', is_active: true })
        .eq('id', authUser.id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      profile = updated;
    }

    const [{ data: progress, error: progressError }, { data: wordRows, error: wordsError }] = await Promise.all([
      admin.from('user_progress').select('*').eq('user_id', authUser.id).maybeSingle(),
      admin.from('word_progress').select('word_id,status').eq('user_id', authUser.id)
    ]);
    if (progressError) throw progressError;
    if (wordsError) throw wordsError;

    const known = (wordRows || []).filter(x => x.status === 'mastered').map(x => String(x.word_id));
    return res.status(200).json({
      profile,
      progress: {
        known,
        streak: progress?.streak || 0,
        lastOpen: progress?.last_active_date || null
      },
      game: { xp: progress?.xp || 0 }
    });
  } catch (error) {
    console.error('PROFILE_API_ERROR', error);
    return res.status(500).json({ error: error?.message || 'Profiel kon niet worden geladen.' });
  }
}
