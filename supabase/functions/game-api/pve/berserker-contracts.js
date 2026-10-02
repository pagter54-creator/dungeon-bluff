const R='COMBAT';
const c=(id,name,archetype,stage,condition,value,onceScope=null,cap=null)=>Object.freeze({
  id,name,characterId:'berserker',archetype,stage,handler:'BERSERKER_V02',
  rooms:[R],condition,value,onceScope,resetScope:'COMBAT',cap,executable:true,source:'005B-E'
});
export const BERSERKER_CONTRACTS=Object.freeze({
'aug-121':c('aug-121','피의 광전','피의 광전',1,'유효 공격으로 실제 HP 비용 1 발생','+2 damage'),
'aug-122':c('aug-122','끓어오르는 피','피의 광전',2,'실제 HP 비용 1 발생','+1 damage','ONCE_PER_TURN'),
'aug-123':c('aug-123','핏빛 가속','피의 광전',2,'HP 비용 공격 성공 후 다음 유효 공격','next valid +1'),
'aug-124':c('aug-124','전투의 식사','피의 광전',2,'실제 회복 후 다음 HP 비용 공격','next cost attack +2','ONCE_PER_COMBAT'),
'aug-125':c('aug-125','상처 벌리기','피의 광전',3,'HP 비용 유효 공격 2연속 이상','+2 damage'),
'aug-126':c('aug-126','붉은 추격','피의 광전',3,'HP 비용 공격 바로 다음 턴 더 높은 FINAL_NUMBER 유효','+2 damage'),
'aug-127':c('aug-127','피의 환류','피의 광전',3,'HP 비용 유효 공격 2회 성공','heal 1','ONCE_PER_COMBAT'),
'aug-128':c('aug-128','피의 폭풍','피의 광전',4,'HP 비용 유효 공격 연속','stack max4; +1/stack; first stack4 extra 2',null,4),
'aug-129':c('aug-129','붉은 기관','피의 광전',4,'실제 회복으로 혈기 저장 후 HP 비용 공격','vigor max3; +2/stack',null,3),
'aug-130':c('aug-130','끝없는 광전','피의 광전',4,'실제 HP 비용 유효 공격 성공','heal refund 1','ONCE_PER_TURN'),
'aug-131':c('aug-131','불사 투사','불사 투사',1,'collision heal cap=maxHP; monster DIRECT actualDamage>0 gains Revenge','revenge max1; next valid +2',null,1),
'aug-132':c('aug-132','질긴 목숨','불사 투사',2,'collision heal','collision heal +1 with same cap'),
'aug-133':c('aug-133','되갚아주마','불사 투사',2,'Revenge consumed on valid attack','+1 damage','ONCE_PER_TURN'),
'aug-134':c('aug-134','살아남는 법','불사 투사',2,'first monster direct damage','reduce 1','ONCE_PER_COMBAT'),
'aug-135':c('aug-135','넘치는 생명력','불사 투사',3,'collision heal attempted at max HP','next direct damage -1'),
'aug-136':c('aug-136','상처의 기억','불사 투사',3,'monster DIRECT actualDamage>0','memory max3; next revenge +1/stack','ONCE_PER_TURN',3),
'aug-137':c('aug-137','피로 갚는다','불사 투사',3,'Revenge consumed valid attack','heal 1','ONCE_PER_COMBAT'),
'aug-138':c('aug-138','불사신','불사 투사',4,'lethal incoming monster damage','survive at HP1','ONCE_PER_COMBAT'),
'aug-139':c('aug-139','난전의 왕','불사 투사',4,'actual heal and monster direct damage alternate','brawl max4; +1/stack; at2+ next direct -1 consume1',null,4),
'aug-140':c('aug-140','광기의 반격','불사 투사',4,'monster direct damage then Revenge attack','revenge +4; next direct -1'),
'aug-141':c('aug-141','최후의 격노','최후의 격노',1,'maxHP=2 and authoritative HP=1','valid attacks +2'),
'aug-142':c('aug-142','죽음의 문턱','최후의 격노',2,'authoritative HP=1 valid attack','+1 damage','ONCE_PER_TURN'),
'aug-143':c('aug-143','살육 본능','최후의 격노',2,'HP1 valid streak','rage max3; +1/stack',null,3),
'aug-144':c('aug-144','이를 악물고','최후의 격노',2,'HP1 first monster direct damage','reduce 1','ONCE_PER_COMBAT'),
'aug-145':c('aug-145','폭주','최후의 격노',3,'HP1 valid streak reaches 2','next two valid attacks +2','ONCE_PER_COMBAT'),
'aug-146':c('aug-146','피 묻은 미소','최후의 격노',3,'HP1 collision heal first time','convert heal to next monster direct -1','ONCE_PER_COMBAT'),
'aug-147':c('aug-147','죽음과 춤을','최후의 격노',3,'HP1 FINAL_NUMBER 4 or 5 valid','next monster direct -1','ONCE_PER_TURN'),
'aug-148':c('aug-148','살아있는 재앙','최후의 격노',4,'HP1 valid streak reaches 3','+4 and extra component 2','ONCE_PER_COMBAT'),
'aug-149':c('aug-149','마지막 불꽃','최후의 격노',4,'first actual transition to HP1','next 2 turns first valid +3; one direct -1','ONCE_PER_COMBAT'),
'aug-150':c('aug-150','피의 왕좌','최후의 격노',4,'maxHP=1','all valid +3; combat-start Blood Armor blocks one direct','ONCE_PER_COMBAT')
});
