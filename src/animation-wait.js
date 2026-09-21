// A suspended/cancelled browser animation must never hold the turn queue forever.
export async function finishAnimation(animation, timeoutMs = 1500) {
  let timer;
  try {
    await Promise.race([
      animation.finished.catch(() => {}),
      new Promise(resolve => { timer = setTimeout(() => { animation.cancel(); resolve(); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
