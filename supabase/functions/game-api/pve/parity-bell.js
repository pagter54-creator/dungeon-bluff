// The bell floor applies only after every other ordinary damage reduction.
// Later class/augment rules may still reduce this attack to zero.
export function applyParityBellPenalty(damageBeforeBell,card){
 const before=Math.max(0,Number(damageBeforeBell)||0);
 const penalty=Math.max(0,Number(card.parityBellPenalty)||0);
 const reduced=Math.max(0,before-penalty);
 const amount=penalty>0&&before>=1?Math.max(1,reduced):reduced;
 card.parityBellDamageBefore=before;
 card.parityBellFloorApplied=amount>reduced;
 return amount;
}
