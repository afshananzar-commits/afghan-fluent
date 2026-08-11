import { requireAdmin } from './_supabaseAdmin.js';
export default async function handler(req,res){
 try{
  const{admin}=await requireAdmin(req);
  if(req.method==='GET'){
   const{data,error}=await admin.from('profiles').select('id,display_name,role,mode,is_active,created_at').order('created_at');
   if(error)throw error;return res.status(200).json({users:data});
  }
  if(req.method==='POST'){
   const{displayName,password,mode='adult'}=req.body||{};
   if(!displayName||!password||password.length<6)return res.status(400).json({error:'Naam en wachtwoord van minimaal 6 tekens zijn verplicht.'});
   const slug=displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');
   if(!slug)return res.status(400).json({error:'Ongeldige gebruikersnaam.'});
   const email=`${slug}@users.afghan-fluent.local`;
   const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:displayName}});
   if(error)throw error;
   const id=data.user.id;
   const{error:pErr}=await admin.from('profiles').insert({id,display_name:displayName,role:'user',mode:mode==='kids'?'kids':'adult',is_active:true});
   if(pErr)throw pErr;
   await admin.from('user_progress').insert({user_id:id});
   return res.status(200).json({ok:true,id,login:displayName,email});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){return res.status(403).json({error:e.message||'Niet toegestaan.'})}
}
