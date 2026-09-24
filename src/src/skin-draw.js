// Keep the same request across timeouts/reloads so retries cannot charge twice.
export function createSkinDrawClient({request,storage,uuid=()=>crypto.randomUUID()}){
 const pending=new Map();
 const key=user=>`dungeon-bluff.skin-draw.${user}`;
 function pendingId(user){
  if(pending.has(user))return pending.get(user);
  try{const id=storage?.getItem(key(user));if(/^[0-9a-f-]{36}$/i.test(id||'')){pending.set(user,id);return id;}}catch{/* Storage is optional. */}
  return null;
 }
 return {
  hasPending:user=>Boolean(pendingId(user)),
  async draw(user){
   const id=pendingId(user)||uuid();pending.set(user,id);
   try{storage?.setItem(key(user),id);}catch{/* The in-memory key still protects retries. */}
   const result=await request('draw_skin',{request_id:id});
   pending.delete(user);try{storage?.removeItem(key(user));}catch{/* A stale key only replays the receipt. */}
   return result;
  },
 };
}
