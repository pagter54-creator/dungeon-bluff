import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config.js';
export const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
let client;
let channel;
export let user;
export async function connect(onStatus) {
  if (!configured) return false;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  let session = data.session;
  if (!session) {
    const response = await client.auth.signInAnonymously();
    if (response.error) throw new Error('익명 로그인에 실패했습니다. Supabase Anonymous Auth 설정을 확인해 주세요.');
    session = response.data.session;
  }
  user = session.user;
  await client.realtime.setAuth(session.access_token);
  client.auth.onAuthStateChange((_event, session) => {
    if (session) { user = session.user; void client.realtime.setAuth(session.access_token); }
    else onStatus('인증 재연결 필요', false);
  });
  return true;
}
export async function request(action, params = {}) {
  if (!client) throw new Error('config.js에 Supabase 연결 정보를 입력해 주세요.');
  const { data, error } = await client.functions.invoke('game-api', { body: { action, ...params } });
  if (error) {
    let message = '서버에 연결하지 못했습니다. 연결 상태를 확인해 주세요.';
    try { const body = await error.context.json(); message = body.error || message; } catch { /* network error */ }
    throw new Error(message);
  }
  if (data.error) throw new Error(data.error);
  return data;
}
export async function subscribe(roomId, onUpdate, onStatus) {
  if (channel) await client.removeChannel(channel);
  channel = client.channel(`room:${roomId}`, { config: { private: true } })
    .on('broadcast', { event: '*' }, () => onUpdate())
    .subscribe(status => {
      onStatus(status === 'SUBSCRIBED' ? '실시간 연결됨' : '재연결 중', status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') onUpdate();
    });
}
export async function unsubscribe() { if (channel) { await client.removeChannel(channel); channel = null; } }
