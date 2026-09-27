import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';

const modeArg=process.argv.includes('--mode')?process.argv[process.argv.indexOf('--mode')+1]:'competitive';
if(!['competitive','pve'].includes(modeArg))throw new Error('Use --mode competitive|pve.');
const base=SUPABASE_URL.replace(/\/$/,'');
const key=SUPABASE_PUBLISHABLE_KEY;
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};

async function anonymousClient(){
  const response=await fetch(base+'/auth/v1/signup',{
    method:'POST',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({data:{}})
  });
  const data=await response.json();
  if(!response.ok)throw new Error('Anonymous auth failed: '+JSON.stringify(data));
  const token=data.access_token||data.session?.access_token;
  ensure(token&&data.user?.id,'Anonymous auth returned no session.');
  return {token,userId:data.user.id};
}
async function call(client,action,params={},endpoint='game-api'){
  const response=await fetch(base+'/functions/v1/'+endpoint,{
    method:'POST',
    headers:{apikey:key,Authorization:'Bearer '+client.token,'Content-Type':'application/json'},
    body:JSON.stringify({action,...params})
  });
  const data=await response.json();
  if(!response.ok||data?.error){
    const error=new Error(action+' failed: '+(data?.error||response.statusText));
    error.code=data?.code;throw error;
  }
  return data;
}
const account=(client)=>call(client,'get_account',{},'account-api');
async function safeLeave(client,roomId){try{await call(client,'leave_room',{room_id:roomId});}catch{}}

async function setup(mode){
  const host=await anonymousClient(),peer=await anonymousClient();
  let roomId=null;
  try{
    const beforeHost=await account(host);
    let bundle=await call(host,'create_room',{room_title:'PROD SMOKE '+Date.now(),gameMode:mode});
    roomId=bundle.room.id;
    ensure(bundle.room.gameMode===mode,'Created room mode mismatch.');
    const listing=await call(peer,'list_rooms');
    const row=listing.rooms.find(r=>r.id===roomId);
    ensure(row&&row.gameMode===mode,'Room list mode/badge source mismatch.');
    bundle=await call(peer,'join_room',{room_id:roomId});
    ensure(bundle.room.gameMode===mode,'Joined room mode mismatch.');
    const reconnect=await call(peer,'get_room_state',{room_id:roomId});
    ensure(reconnect.room?.gameMode===mode,'Reconnect lost room mode.');
    await call(host,'add_ai',{room_id:roomId,ai_type:'balanced'});
    bundle=await call(host,'add_ai',{room_id:roomId,ai_type:'balanced'});
    await call(host,'set_ready',{room_id:roomId,ready:true});
    await call(peer,'set_ready',{room_id:roomId,ready:true});
    const started=await call(host,'start_game',{room_id:roomId});
    if(mode==='COMPETITIVE'){
      ensure(started.session&&started.run==null,'Competitive start entered PVE path.');
      const afterHost=await account(host);
      console.log(JSON.stringify({smoke:'COMPETITIVE',roomId,gameMode:started.room.gameMode,sessionId:started.session.id,ratingBefore:beforeHost.stats?.rating_points,ratingAfter:afterHost.stats?.rating_points,pass:true}));
      return;
    }
    ensure(started.session==null&&started.run,'PVE start entered competitive path.');
    ensure(started.run.phase==='MAP_VOTE','PVE did not reach MAP_VOTE.');
    const state=await call(peer,'pve.getState',{run_id:started.run.id});
    ensure(state.run?.id===started.run.id&&state.run?.phase==='MAP_VOTE','PVE reconnect/getState mismatch.');
    const afterHost=await account(host);
    ensure(afterHost.stats?.rating_points===beforeHost.stats?.rating_points,'PVE changed competitive RP.');
    console.log(JSON.stringify({smoke:'COOP_PVE',roomId,runId:started.run.id,gameMode:started.room.gameMode,phase:started.run.phase,rpUnchanged:true,pass:true}));
  }finally{
    if(roomId){await safeLeave(peer,roomId);await safeLeave(host,roomId);}
  }
}
await setup(modeArg==='competitive'?'COMPETITIVE':'COOP_PVE');
