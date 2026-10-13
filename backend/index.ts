import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.105.4';
import {validateApplication} from './contractor-schema.js';
const origins=new Set(['https://brinesalters.com','https://www.brinesalters.com','https://plowwow.com','https://www.plowwow.com']);
const bucket='contractor-equipment';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://brinesalters.com','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const json=(s:number,d:unknown)=>new Response(JSON.stringify(d),{status:s,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json(405,{error:'Use the application form.'});
 if(!origins.has(origin))return json(403,{error:'Submit through the PlowWow contractor application page.'});
 try{
  const text=await req.text();if(text.length>60000)return json(413,{error:'Application is too large.'});
  const raw=JSON.parse(text);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db=createClient(url,key,{auth:{persistSession:false}});
  if(raw.action==='start'){
   if(raw.hp||!Number.isFinite(raw.startedAt)||Date.now()-raw.startedAt<3000)return json(400,{error:'Please review the form before submitting.'});
   const data=validateApplication(raw.application);
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
   const hour=Math.floor(Date.now()/3600000),day=Math.floor(Date.now()/86400000);
   for(const [value,maximum,period,end] of [[ip,8,hour,(hour+1)*3600000],[data.email.toLowerCase(),3,day,(day+1)*86400000]] as const){
    const {data:ok,error}=await db.rpc('contractor_take_limit',{key:await hash(key+value+period),until_at:new Date(end).toISOString(),maximum});
    if(error)throw Error('Application service is temporarily unavailable.');if(!ok)return json(429,{error:'Application limit reached. Please try later.'});
   }
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
   const {error}=await db.from('contractor_applications').insert({id,business:data.business,contact_name:data.name,email:data.email,phone:data.phone,base_city:data.base,province:data.province,interest:data.interest,application:data,token_hash:await hash(token)});if(error)throw Error('Unable to save the application.');
   const uploads=[];
   for(let i=0;i<data.equipment.length;i++){
    const e=data.equipment[i],paths=[];
    for(let p=0;p<e.photoCount;p++){
     const path=`${id}/${i+1}/${p+1}.webp`;paths.push(path);
     const {data:signed,error}=await db.storage.from(bucket).createSignedUploadUrl(path,{upsert:false});if(error||!signed)throw Error('Unable to prepare photo uploads.');
     uploads.push({entry:i,photo:p,url:signed.signedUrl,path});
    }
    const {error}=await db.from('contractor_equipment').insert({application_id:id,entry_number:i+1,equipment_type:e.type,make:e.make||null,model:e.model||null,model_year:e.year,quantity:e.quantity,details:e.details,photo_paths:paths});if(error)throw Error('Unable to save equipment details.');
   }
   return json(200,{id,token,uploads});
  }
  if(raw.action==='finish'){
   if(!/^[a-f0-9-]{36}$/.test(raw.id)||typeof raw.token!=='string'||raw.token.length>100)return json(400,{error:'Invalid submission reference.'});
   const {data:a,error}=await db.from('contractor_applications').select('id,status,token_hash,expires_at,application').eq('id',raw.id).single();
   if(error||!a||a.token_hash!==await hash(raw.token)||Date.parse(a.expires_at)<Date.now())return json(403,{error:'The submission session expired. Please start again.'});
   if(a.status==='submitted')return json(200,{success:true,id:a.id});
   for(let i=0;i<a.application.equipment.length;i++){
    if(a.application.equipment[i].photoCount===0)continue;
    const {data:objects,error}=await db.storage.from(bucket).list(`${a.id}/${i+1}`,{limit:4});
    if(error||!objects||objects.length!==a.application.equipment[i].photoCount)return json(400,{error:'Photos are missing. Keep the form open and retry the upload.'});
    for(let p=0;p<objects.length;p++){
     const {data:file,error}=await db.storage.from(bucket).download(`${a.id}/${i+1}/${p+1}.webp`);
     if(error||!file||file.size>1048576)throw Error('A photo could not be verified.');
     const b=new Uint8Array(await file.slice(0,12).arrayBuffer());if(new TextDecoder().decode(b.slice(0,4))!=='RIFF'||new TextDecoder().decode(b.slice(8,12))!=='WEBP')return json(400,{error:'Upload valid equipment images through the form.'});
    }
   }
   const {error:updateError}=await db.from('contractor_applications').update({status:'submitted',submitted_at:new Date().toISOString()}).eq('id',a.id).eq('status','uploading');if(updateError)throw Error('Unable to confirm submission.');
   return json(200,{success:true,id:a.id});
  }
  return json(400,{error:'Invalid application action.'});
 }catch(e){return json(400,{error:e instanceof Error?e.message:'Unable to process the application.'});}
});
