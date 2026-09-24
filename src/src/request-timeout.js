// Bound the entire request, including auth refresh and reading the response body.
export async function withRequestTimeout(work, milliseconds = 15000) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('서버 응답이 지연되어 상태를 다시 확인합니다. 잠시 후 다시 시도해 주세요.'));
      controller.abort();
    }, milliseconds);
  });
  try { return await Promise.race([Promise.resolve().then(() => work(controller.signal)), timeout]); }
  finally { clearTimeout(timer); }
}
