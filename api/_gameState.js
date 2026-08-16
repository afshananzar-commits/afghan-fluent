export const GAME_STATE_BUCKET = 'user-game-state';

export async function ensureGameStateBucket(admin) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw listError;
  if ((buckets || []).some(b => b.name === GAME_STATE_BUCKET)) return;
  const { error: createError } = await admin.storage.createBucket(GAME_STATE_BUCKET, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['application/json']
  });
  if (createError && !/already exists|duplicate/i.test(createError.message || '')) throw createError;
}

export async function readGameState(admin, userId) {
  await ensureGameStateBucket(admin);
  const path = `${userId}/state.json`;
  const { data, error } = await admin.storage.from(GAME_STATE_BUCKET).download(path);
  if (error) {
    if (/not found|does not exist|404/i.test(error.message || '')) return null;
    throw error;
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeGameState(admin, userId, state) {
  await ensureGameStateBucket(admin);
  const path = `${userId}/state.json`;
  const payload = JSON.stringify({
    version: 1,
    progress: state?.progress && typeof state.progress === 'object' ? state.progress : {},
    game: state?.game && typeof state.game === 'object' ? state.game : {},
    savedAt: new Date().toISOString()
  });
  const { error } = await admin.storage.from(GAME_STATE_BUCKET).upload(path, Buffer.from(payload), {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0'
  });
  if (error) throw error;
}

export async function deleteGameState(admin, userId) {
  await ensureGameStateBucket(admin);
  const { error } = await admin.storage.from(GAME_STATE_BUCKET).remove([`${userId}/state.json`]);
  if (error) throw error;
}
