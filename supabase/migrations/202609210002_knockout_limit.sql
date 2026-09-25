alter table public.game_sessions drop constraint game_sessions_party_knockouts_check;
alter table public.game_sessions add constraint game_sessions_party_knockouts_check
  check (party_knockouts between 0 and 8);
