import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const protectedSources=[
  {
    "path": "docs/PVE_CONTENT_005Q_DECISIONS.json",
    "sha": "12e1370373c45b29c7680bb8b041b3951e82d6aa"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_B.json",
    "sha": "690c7d5977178fbdd3441f71335f92fda370b6fd"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_B.md",
    "sha": "7bd47fef0aa4a4ebe6b3e38a8081e028d05d2f6a"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_C.json",
    "sha": "4b9b2dab17d0a0138abde0aa97a999a39b83a8d4"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_C.md",
    "sha": "b03cf28567907d8bf644b582ab99769371b7f0e0"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_D.json",
    "sha": "cbc221ba94f0517d3fc1b6d6519ab8494505a677"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_D.md",
    "sha": "debddad45f19e66b9efd94662de62423c28027ac"
  },
  {
    "path": "docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json",
    "sha": "c97428ebcf09d623c4da4f89f092ec50ebdb4619"
  },
  {
    "path": "docs/PVE_CONTENT_005R.md",
    "sha": "98df3fd0a2821857bd0a66f1eafcce8be937c8b5"
  },
  {
    "path": "docs/PVE_CONTENT_005R_CONDITION_AUDIT.json",
    "sha": "3334ac50a36a18a931bf2cb6bba43fe653a01406"
  },
  {
    "path": "docs/PVE_CONTENT_005R_DECISIONS.json",
    "sha": "3411c25b9d9a016da0fd089f44970cc9a885d532"
  },
  {
    "path": "docs/PVE_CONTENT_005R_DEPENDENCIES.json",
    "sha": "87bbb2f086b05ed237c983e105b38a481c610cc6"
  },
  {
    "path": "docs/PVE_CONTENT_005R_EXECUTABLE_AUDIT.json",
    "sha": "c2a51ed39629c363c76a2a3c13c1f7f521c8a1c9"
  },
  {
    "path": "docs/pve-augment-beta-005b.json",
    "sha": "644b1b6b1193887f09a663a943fcd0629dbf9b8c"
  },
  {
    "path": "docs/pve-augment-beta-005c.json",
    "sha": "dd591a32cc486d9acddce54b1aba66782bcc5c01"
  },
  {
    "path": "docs/pve-augment-beta-005d.json",
    "sha": "98c975149f7e5ad4af26cb9f560804618b25ad0b"
  },
  {
    "path": "docs/pve-augment-resolution-005b.json",
    "sha": "e0643fd27b13b2c0f734e745e78e44e639d5a91d"
  },
  {
    "path": "docs/pve-augment-resolution-005c.json",
    "sha": "4eeadf703dc486c6049a4ade8130b6e47659c870"
  },
  {
    "path": "docs/pve-augment-resolution-005d.json",
    "sha": "26dd9d360d0a4692c52a33fd83ef1d2a171b3b17"
  }
];
for(const row of protectedSources)test('005D FINAL immutable source '+row.path,()=>{
 const body=fs.readFileSync(new URL('../'+row.path,import.meta.url));
 const sha=createHash('sha1').update(Buffer.from('blob '+body.length+'\0')).update(body).digest('hex');
 assert.equal(sha,row.sha,'BETA/005R/DESIGN/stable decision source must remain unchanged');
});
test('005D FINAL canonical settlement SQL preserves locked once ledger Gold and unchanged RP',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/202609280002_pve_beta_reward_canonical.sql',import.meta.url),'utf8');
 assert.match(sql,/where id=p_run for update/i);assert.match(sql,/if r\.rewards_committed then/i);
 assert.match(sql,/on conflict\(run_id,user_id\) do nothing/i);assert.match(sql,/gold:=0/i);
 assert.match(sql,/terminal_phase='RUN_CLEAR'/i);assert.match(sql,/old_rating,0,old_rating,terminal_phase/i);
 assert.match(sql,/set rewards_committed=true/i);assert.match(sql,/'rp_delta',0/i);
});

test('005D FINAL telemetry persistence drains pending rows instead of carrying state history',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/202609270002_pve_hardening_telemetry.sql',import.meta.url),'utf8');
 assert.match(sql,/clean_state:=\(p_state-'_telemetryPending'\)/);assert.match(sql,/jsonb_array_elements\(coalesce\(p_state->'_telemetryPending'/);
});
