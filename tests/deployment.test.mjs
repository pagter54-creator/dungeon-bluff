import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm, lstat, mkdir, writeFile, symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {migrationFindings, pendingMigrations, assertProductionTarget} from '../scripts/check-deploy-migrations.mjs';
import {preparePages, ROOT} from '../scripts/prepare-pages.mjs';

test('pending migration detection accepts CLI plans and refuses unknown/unsafe output', () => {
  assert.deepEqual(pendingMigrations('Would push these migrations:\n • 202609280003_fix.sql\n • 20261006062205_skin.sql\n'), ['202609280003_fix.sql', '20261006062205_skin.sql']);
  assert.deepEqual(pendingMigrations('Remote database is up to date.'), []);
  for (const output of ['', 'Would push these migrations:', 'Would push these migrations:\n • ../../bad.sql',
    'Would push these migrations:\n • 202609280003_fix.sql\n • 202609280003_fix.sql']) {
    assert.throws(() => pendingMigrations(output));
  }
});

test('migration guard detects destructive SQL despite comments, nesting and quoted identifiers', async () => {
  for (const sql of [
    'DROP /* comment */ TABLE "public"."players";',
    'TRUNCATE ONLY public.players;',
    'DELETE FROM public.players WHERE id = 1;',
    'WITH removed AS (DELETE FROM public.players RETURNING *) INSERT INTO archive SELECT * FROM removed;',
    'ALTER TABLE public.players DROP COLUMN score;',
    'ALTER TABLE public.players ALTER COLUMN score TYPE text;',
    'DROP SCHEMA public CASCADE;',
    'DO $$ BEGIN EXECUTE \'TRUNCATE public.players\'; END $$;',
    'SELECT public.account_cleanup_guests();',
    'INSERT INTO archive(id) VALUES (public.erase_players());',
    'UPDATE public.players SET score=0;',
    'DROP TRIGGER x ON public.players;',
    'ALTER TABLE public.players DROP CONSTRAINT score_check;',
  ]) assert.ok((await migrationFindings(sql)).length > 0, sql);
  await assert.rejects(migrationFindings('not valid sql'));
});

test('migration guard permits additive SQL, replacement metadata and stored gameplay cleanup', async () => {
  assert.deepEqual(await migrationFindings(`
    -- DELETE and DROP in comments are harmless.
    CREATE TABLE public.new_data(id uuid default gen_random_uuid());
    ALTER TABLE public.players ADD COLUMN extra integer;
    ALTER TABLE public.players DROP CONSTRAINT score_check;
    ALTER TABLE public.players ADD CONSTRAINT score_check CHECK(score >= 0);
    DROP TRIGGER IF EXISTS x ON public.players;
    CREATE TRIGGER x AFTER UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.f();
    CREATE OR REPLACE FUNCTION public.f() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN DELETE FROM public.players WHERE id=old.id; RETURN new; END $$;
    INSERT INTO public.new_data(id) VALUES (gen_random_uuid());
    UPDATE public.players SET extra=1 WHERE extra IS NULL;
  `), []);
  for (const file of ['202609280003_pve_abandon_rpc_privileges.sql', '20261006062205_twins_sun_moon_circus_skin.sql']) {
    assert.deepEqual(await migrationFindings(await readFile(path.join(ROOT, 'supabase/migrations', file), 'utf8')), []);
  }
});

test('deployment checks reject mismatched database/project targets without exposing credentials', () => {
  const ref = 'aaaaaaaaaaaaaaaaaaaa';
  const config = `export const SUPABASE_URL = 'https://${ref}.supabase.co';`;
  assert.doesNotThrow(() => assertProductionTarget(ref, `postgresql://postgres:password@db.${ref}.supabase.co/postgres`, config));
  assert.doesNotThrow(() => assertProductionTarget(ref, `postgresql://postgres.${ref}:password@aws-0-region.pooler.supabase.com/postgres`, config));
  assert.throws(() => assertProductionTarget('bbbbbbbbbbbbbbbbbbbb', `postgresql://postgres@db.${ref}.supabase.co/postgres`, config));
  assert.throws(() => assertProductionTarget(ref, 'postgresql://postgres:secret@db.bbbbbbbbbbbbbbbbbbbb.supabase.co/postgres', config), error => !error.message.includes('secret'));
});

test('Pages artifact includes the production frontend and excludes private repository content', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'dungeon-pages-'));
  const output = path.join(temporary, 'public');
  try {
    await preparePages(ROOT, output);
    const entries = await readdir(output);
    for (const file of ['index.html', 'styles.css', 'config.js', '.nojekyll', 'src', 'assets', 'monster', 'skin image', 'background']) {
      assert.ok(entries.includes(file), file);
    }
    for (const file of ['supabase', 'tests', 'scripts', 'node_modules', '.github', '.git', '.env', 'package.json']) {
      assert.ok(!entries.includes(file), file);
    }
    assert.equal(await readFile(path.join(output, 'config.js'), 'utf8'), await readFile(path.join(ROOT, 'config.js'), 'utf8'));
    assert.ok((await lstat(path.join(output, 'src/app.js'))).isFile());
    await assert.rejects(preparePages(ROOT, output), /EEXIST/);
    await assert.rejects(preparePages(ROOT, ROOT), /must not contain/);
  } finally { await rm(temporary, {recursive: true, force: true}); }
});

test('Pages packaging excludes nested hidden files and refuses secret-leaking symlinks', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'dungeon-pages-private-'));
  const root = path.join(temporary, 'source');
  try {
    await mkdir(root);
    for (const name of ['index.html', 'styles.css', 'config.js', '.nojekyll']) await writeFile(path.join(root, name), 'public');
    for (const name of ['src', 'assets', 'skin image', 'monster', 'background']) await mkdir(path.join(root, name));
    await writeFile(path.join(root, 'src/.env'), 'private');
    await preparePages(root, path.join(temporary, 'clean'));
    assert.deepEqual(await readdir(path.join(temporary, 'clean/src')), []);
    await symlink(path.join(root, 'src/.env'), path.join(root, 'src/leak.js'));
    await assert.rejects(preparePages(root, path.join(temporary, 'symlink')), /symbolic links/);
  } finally { await rm(temporary, {recursive: true, force: true}); }
});
