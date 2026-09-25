// Submission order is not a state change: SQL aggregates may return any order.
export function sameLockedMembers(previous,next){
 if(!Array.isArray(previous)||previous.length!==next.length)return false;
 const before=new Set(previous);
 return before.size===next.length&&next.every(id=>before.has(id));
}
export function conflictDelay(attempt,rng=Math.random){return Math.min(200,20*2**attempt)+Math.floor(rng()*20);}
export const waitForConflictRetry=attempt=>new Promise(resolve=>setTimeout(resolve,conflictDelay(attempt)));
