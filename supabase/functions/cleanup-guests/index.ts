import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
// This endpoint accepts a server-side scheduler secret only, never a player JWT.
Deno.serve(async req=>{
 const secret=Deno.env.get('CLEANUP_SECRET');
 if(req.method!=='POST'||!secret||req.headers.get('Authorization')!==`Bearer ${secret}`)return new Response('Unauthorized',{status:401});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.rpc('account_cleanup_guests');
 return new Response(JSON.stringify(error?{error:'게스트 정리 실패'}:{deleted:data}),{status:error?500:200,headers:{'Content-Type':'application/json'}});
});
