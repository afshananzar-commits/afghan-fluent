import { clients } from './_supabaseAdmin.js';
import { readGameState, writeGameState } from './_gameState.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const { user, admin } = clients(req);
    const { data: authData, error: authError } = await user.auth.getUser();
    const authUser = authData?.user;
    if (authError || !authUser) return res.status(401).json({ error: 'Niet ingelogd.' });

    if (req.method === 'GET') {
      const state = await readGameState(admin, authUser.id);
      return res.status(200).json({ state });
    }

    if (req.method === 'PUT') {
      const progress = req.body?.progress && typeof req.body.progress === 'object' ? req.body.progress : {};
      const game = req.body?.game && typeof req.body.game === 'object' ? req.body.game : {};
      await writeGameState(admin, authUser.id, { progress, game });

      // Houd bestaande rapportagekolommen ook actueel, maar laat de volledige
      // spelstatus altijd uit state.json komen.
      const completedLevels = Array.isArray(game.completedLevels) ? game.completedLevels : [];
      const level = Math.min(50, Math.max(1, completedLevels.length + 1));
      const { error: progressError } = await admin.from('user_progress').upsert({
        user_id: authUser.id,
        xp: Number(game.xp || 0),
        level,
        streak: Number(progress.streak || 0),
        last_active_date: progress.lastOpen || null,
        updated_at: new Date().toISOString()
      });
      if (progressError) throw progressError;

      const known = [...new Set((progress.known || []).map(Number).filter(Number.isFinite))];
      if (known.length) {
        const { error: wordsError } = await admin.from('word_progress').upsert(
          known.map(wordId => ({ user_id: authUser.id, word_id: wordId, status: 'mastered', updated_at: new Date().toISOString() })),
          { onConflict: 'user_id,word_id' }
        );
        if (wordsError) throw wordsError;
      }

      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('GAME_STATE_API_ERROR', error);
    return res.status(500).json({ error: error?.message || 'Voortgang kon niet worden opgeslagen.' });
  }
}
