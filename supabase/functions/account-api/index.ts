import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'인증이 필요합니다.'},401);
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)return json({error:'인증이 만료되었습니다. 다시 로그인해 주세요.'},401);
  const raw=await req.text();if(raw.length>4096)throw new Error('요청이 너무 큽니다.');
  const body=JSON.parse(raw);let rpc;const args:any={p_user_id:user.id};
  switch(body.action){
   case 'get_account':case 'get_inventory':case 'get_loadout':rpc='account_data';break;
   case 'register_account':rpc='account_register';args.p_nickname=body.nickname;break;
   case 'change_nickname':rpc='game_profile';args.p_display_name=body.nickname;break;
   case 'get_leaderboard':rpc='account_leaderboard';break;
   case 'get_shop':rpc='account_shop';break;
   case 'purchase_item':rpc='account_purchase';args.p_item_id=body.item_id;break;
   case 'equip_item':rpc='account_equip';args.p_item_id=body.item_id;break;
   case 'draw_skin':rpc='account_draw_skin';args.p_request_id=body.request_id;break;
   default:throw new Error('지원하지 않는 action입니다.');
  }
  if(['register_account','change_nickname'].includes(body.action)&&typeof body.nickname!=='string')throw new Error('닉네임을 입력해 주세요.');
  if(['purchase_item','equip_item'].includes(body.action)&&(typeof body.item_id!=='string'||body.item_id.length>80))throw new Error('아이템을 선택해 주세요.');
  if(body.action==='draw_skin'&&(typeof body.request_id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)))throw new Error('올바른 뽑기 요청 번호가 필요합니다.');
  const result=await admin.rpc(rpc,args);
  if(result.error)throw new Error(result.error.code==='23505'?'이미 사용 중인 닉네임 또는 보유한 아이템입니다.':result.error.message);
  return json(body.action==='change_nickname'?{profile:result.data}:result.data);
 }catch(e){return json({error:e instanceof SyntaxError?'올바른 JSON이 필요합니다.':e instanceof Error?e.message:'요청을 처리하지 못했습니다.'},400);}
});
