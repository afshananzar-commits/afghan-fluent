import { createClient } from '@supabase/supabase-js';

export function clients(req){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const pub=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!url||!pub)throw new Error('Supabase URL/publishable key ontbreken.');
 if(!secret)throw new Error('Adminbeheer is nog niet geactiveerd: SUPABASE_SERVICE_ROLE_KEY ontbreekt in Vercel.');
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 return{
  user:createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}}),
  admin:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
 };
}

export async function requireAdmin(req){
 const {user,admin}=clients(req);
 const{data:{user:authUser}}=await user.auth.getUser();
 if(!authUser)throw new Error('Niet ingelogd.');
 const{data:profile}=await admin.from('profiles').select('role,is_active').eq('id',authUser.id).single();
 if(profile?.role!=='admin'||!profile?.is_active)throw new Error('Geen adminrechten.');
 return{admin,authUser};
}
