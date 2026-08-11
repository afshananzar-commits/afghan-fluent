import { requireAdmin } from './_supabaseAdmin.js';
export default async function handler(req,res){
 try{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const{admin}=await requireAdmin(req);const{userId}=req.body||{};if(!userId)return res.status(400).json({error:'userId ontbreekt'});
  await Promise.all([
   admin.from('word_progress').delete().eq('user_id',userId),
   admin.from('sentence_progress').delete().eq('user_id',userId),
   admin.from('challenge_results').delete().eq('user_id',userId)
  ]);
  await admin.from('user_progress').upsert({user_id:userId,xp:0,level:1,streak:0,known_words:0,mastered_sentences:0,challenges_completed:0,last_active_date:null,updated_at:new Date().toISOString()});
  return res.status(200).json({ok:true});
 }catch(e){return res.status(403).json({error:e.message||'Niet toegestaan.'})}
}
