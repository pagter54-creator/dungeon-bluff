// Existing velocities are expressed per 60 Hz reference frame, not display frame.
export function advanceParticle(p,elapsedMs){
 const dt=Math.max(0,elapsedMs)/(1000/60);
 p.x+=p.vx*dt;
 p.y+=p.vy*dt+p.gravity*dt*dt/2;
 p.vy+=p.gravity*dt;
 p.life-=dt;
}
