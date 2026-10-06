import {cardComponent} from '../src/card-component.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../supabase/functions/game-api/pve/prophet-vampire-rework.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {fixture,cases,command,failed,valid,damage,post,end,fragment} from './helpers/prophet-vampire-fixture.mjs';
for(const n of [...Array.from({length:30},(_,i)=>151+i),...Array.from({length:30},(_,i)=>301+i)]){
 for(const phase of ['SHOP','REST','EVENT','REWARD_ROOM'])test(`replacement aug-${n}: secondary effects excluded from ${phase}`,()=>{
  const f=fixture(n);f.run.phase=phase;f.p.publicResources.revelation=6;f.p.publicResources.blood=6;f.ally.hp=1;command(f);failed(f);
  const before={resources:structuredClone(f.p.publicResources),hp:f.run.players.map(p=>p.hp),amount:f.damage.amount};
  valid(f);damage(f);post(f);end(f);R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:1,damageType:'DIRECT'});
  const after={resources:{...f.p.publicResources},hp:f.run.players.map(p=>p.hp),amount:f.damage.amount};
  delete before.resources.thrallPlayerId;delete after.resources.thrallPlayerId;assert.deepEqual(after,before);
 });
}
test('164 and 170 independent receipts add once to the next actual Revelation gain',()=>{
 const f=fixture(164);f.p.augments=['aug-164','aug-170'];fragment(f);valid(f);R.consumeFragment(f.run,f.p,f.rc);
 assert.equal(f.s.nextGainBonus,3);const restored=structuredClone(f);R.prophetGain(restored.run,restored.p,1,'receipt');assert.equal(restored.p.publicResources.revelation,4);
 R.prophetGain(restored.run,restored.p,1,'receipt');assert.equal(restored.p.publicResources.revelation,4);R.prophetGain(restored.run,restored.p,1,'next');assert.equal(restored.p.publicResources.revelation,5);
});
test('327 emergency has priority over all owners normal transfusions and retries after reconnect',()=>{
 const f=fixture(327);f.p.augments=['aug-327','aug-321'];f.p.publicResources.blood=8;
 const other=structuredClone(f.p);other.playerId='other-vampire';other.seat=4;other.augments=['aug-321'];other.publicResources.blood=6;f.run.players.push(other);
 f.ally.hp=0;const packet={damageEventId:'lethal',actualDamage:2,damageType:'DIRECT'};R.afterIncomingCoreDamage(f.run,f.ally,packet,f.events);
 assert.equal(f.ally.hp,1);assert.equal(f.p.publicResources.blood,4);assert.equal(other.publicResources.blood,6);assert.equal(f.events.filter(e=>e.type==='TRANSFUSION_USED').length,1);
 const restored=structuredClone(f.run),before=structuredClone(restored);R.afterIncomingCoreDamage(restored,restored.players[1],packet,[]);assert.deepEqual(restored,before);
});
test('normal transfusion cannot resurrect a DOWNED target or spend without actual damage',()=>{
 const f=fixture(321);f.p.publicResources.blood=6;f.ally.hp=0;f.ally.status='DOWNED';assert.equal(R.transfusion(f.run,f.p,f.ally),false);
 f.ally.status='ACTIVE';f.ally.hp=1;R.afterIncomingCoreDamage(f.run,f.ally,{actualDamage:0,damageType:'DIRECT'});assert.equal(f.p.publicResources.blood,6);assert.equal(f.ally.hp,1);
});
for(const [key,c] of Object.entries(cases)){
 const n=Number(key);
 test(`replacement aug-${n}: positive, registry and deterministic reconnect`,()=>{
  const f=fixture(n);c.setup?.(f);const restored=structuredClone(f);c.act(f);c.act(restored);assert.deepEqual(f,restored);assert.deepEqual(c.read(f),c.want);
  const d=AUGMENT_BY_ID['aug-'+n];assert.equal(d.executable,true);assert.ok(augmentCandidates(d.characterId,d.tier,d.build).some(x=>x.id===d.id));
 });
 test(`replacement aug-${n}: ownership/absent augment negative`,()=>{
  const f=fixture(n);f.p.augments=[];c.setup?.(f);c.act(f);assert.deepEqual(c.read(f),c.without);
 });
 if(!c.noRetry&&!c.derived)test(`replacement aug-${n}: same authoritative turn retry`,()=>{
  const f=fixture(n);c.setup?.(f);c.act(f);const snapshot=structuredClone(f);c.act(f);assert.deepEqual(f,snapshot);
 });
}

test('Fragment card tooltip explains normal collision without leaking hidden values',()=>{
 const card={id:'zero',value:7,fragment:true};const visible=cardComponent(card,{own:true});assert.match(visible,/title="제출 시 일반 카드처럼 판정되며, 중복되면 무효될 수 있습니다."/);
 const hidden=cardComponent(card,{faceDown:true});assert.doesNotMatch(hidden,/편린 7|title=/);assert.match(hidden,/비공개 카드/);
});
