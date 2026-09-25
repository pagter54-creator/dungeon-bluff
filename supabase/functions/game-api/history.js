// Keep the log readable, but retain large replay snapshots only for recent turns.
export function compactHistory(state) {
  const log = state.eventLog || [];
  state.eventLog = log.map((result, index) => {
    if (index >= log.length - 2) return result;
    const { beforePlayers, afterPlayers, ...entry } = result;
    return entry;
  });
}
