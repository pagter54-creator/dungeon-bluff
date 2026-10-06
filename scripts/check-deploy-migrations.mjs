import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'libpg-query';
import {productionUrlFromConfig, projectRefFromSupabaseUrl} from './pve-beta-preflight.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const filenamePattern = /^(?:\d{12}|\d{14})_[A-Za-z0-9_-]+\.sql$/;
const allowedStatements = new Set([
  'TransactionStmt', 'CreateExtensionStmt', 'CreateStmt', 'CreateSeqStmt',
  'IndexStmt', 'CreateFunctionStmt', 'CreatePolicyStmt', 'AlterPolicyStmt',
  'CreateTrigStmt', 'GrantStmt', 'GrantRoleStmt', 'CommentStmt',
  'InsertStmt', 'UpdateStmt', 'AlterTableStmt', 'AlterEnumStmt', 'CreateEnumStmt',
]);
const allowedTableChanges = new Set([
  'AT_AddColumn', 'AT_AddConstraint', 'AT_AddIndexConstraint',
  'AT_ValidateConstraint', 'AT_ColumnDefault', 'AT_SetNotNull', 'AT_DropNotNull',
  'AT_EnableRowSecurity', 'AT_ForceRowSecurity',
]);
// Restrict functions evaluated by migration DML/defaults. Unknown calls may
// invoke destructive routines, even in an INSERT/UPDATE expression or CTE.
const safeCalls = new Set([
  'now', 'gen_random_uuid', 'char_length', 'lower', 'upper', 'length', 'btrim',
  'jsonb_array_length', 'jsonb_typeof', 'jsonb_set', 'to_jsonb',
  'jsonb_build_object', 'jsonb_build_array', 'jsonb_path_exists',
  'generate_series', 'array_length', 'cardinality',
]);
const names = list => (list || []).map(x => x.String?.sval).join('.');
const relation = rel => `${rel.schemaname || 'public'}.${rel.relname}`;

export function pendingMigrations(output) {
  const text = String(output).replace(/\x1b\[[0-9;]*m/g, '');
  const marker = text.indexOf('Would push these migrations:');
  if (marker < 0) {
    if (text.includes('Remote database is up to date.')) return [];
    throw new Error('Unrecognized dry-run output; no migrations will be applied.');
  }
  const files = [...text.slice(marker).matchAll(/^\s*[•*+-]\s+(\S+)\s*$/gm)].map(x => x[1]);
  if (!files.length || files.some(x => !filenamePattern.test(x)) || new Set(files).size !== files.length) {
    throw new Error('Invalid pending migration list; no migrations will be applied.');
  }
  return files;
}

export async function migrationFindings(sql) {
  const {stmts = []} = await parse(sql);
  const statements = stmts.map(x => x.stmt);
  const findings = new Set();
  const constraints = new Set();
  const triggers = new Set();
  for (const statement of statements) {
    const alter = statement.AlterTableStmt;
    if (alter) for (const {AlterTableCmd: cmd} of alter.cmds) {
      if (cmd.subtype === 'AT_AddConstraint') constraints.add(`${relation(alter.relation)}.${cmd.def.Constraint.conname}`);
    }
    const trigger = statement.CreateTrigStmt;
    if (trigger) triggers.add(`${relation(trigger.relation)}.${trigger.trigname}`);
  }
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    // Defining existing gameplay/cleanup routines does not execute their bodies.
    // Policy expressions also execute at runtime rather than during creation.
    if (node.CreateFunctionStmt || node.CreatePolicyStmt || node.AlterPolicyStmt) return;
    if (node.DeleteStmt) findings.add('DELETE (all migration-time deletes require separate review)');
    if (node.TruncateStmt) findings.add('TRUNCATE');
    if (node.DoStmt || node.CallStmt || node.ExecuteStmt) findings.add('Opaque immediate execution');
    if (node.MergeStmt) findings.add('MERGE may delete or overwrite data');
    if (node.UpdateStmt && !node.UpdateStmt.whereClause) findings.add('UPDATE without WHERE');
    if (node.FuncCall) {
      const name = names(node.FuncCall.funcname);
      const builtin = name.startsWith('pg_catalog.') ? name.slice(11) : name;
      if (!safeCalls.has(builtin)) findings.add(`Migration-time function call requires review: ${name}`);
    }
    if (node.AlterTableStmt) {
      const alter = node.AlterTableStmt;
      for (const {AlterTableCmd: cmd} of alter.cmds) {
        if (cmd.subtype === 'AT_DropConstraint' && cmd.behavior !== 'DROP_CASCADE' &&
            constraints.has(`${relation(alter.relation)}.${cmd.name}`)) continue;
        if (!allowedTableChanges.has(cmd.subtype)) findings.add(`Unsupported/destructive ALTER TABLE: ${cmd.subtype}`);
      }
    }
    if (node.DropStmt) {
      const drop = node.DropStmt;
      const replacedTrigger = drop.removeType === 'OBJECT_TRIGGER' && drop.behavior !== 'DROP_CASCADE' &&
        drop.objects.every(x => {
          const parts = names(x.List.items).split('.');
          if (parts.length === 2) parts.unshift('public');
          return triggers.has(parts.join('.'));
        });
      if (!replacedTrigger) findings.add(`DROP: ${drop.removeType}`);
    }
    for (const value of Object.values(node)) visit(value);
  }
  for (const statement of statements) {
    const type = Object.keys(statement)[0];
    if (!allowedStatements.has(type) && type !== 'DropStmt') findings.add(`Statement requires review: ${type}`);
    visit(statement);
  }
  return [...findings];
}

export function assertProductionTarget(projectId, dbUrl, configSource) {
  const expected = projectRefFromSupabaseUrl(productionUrlFromConfig(configSource));
  if (!expected || projectId !== expected) throw new Error('Production project does not match config.js.');
  let url;
  try { url = new URL(dbUrl); } catch { throw new Error('Invalid database URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !(url.hostname === `db.${expected}.supabase.co` ||
        (url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username) === `postgres.${expected}`))) {
    throw new Error('Database URL does not identify the configured production project.');
  }
}

async function main() {
  const {SUPABASE_PROJECT_ID: projectId, SUPABASE_DB_URL: dbUrl} = process.env;
  if (!projectId || !dbUrl) throw new Error('SUPABASE_PROJECT_ID and SUPABASE_DB_URL are required.');
  assertProductionTarget(projectId, dbUrl, await readFile(path.join(ROOT, 'config.js'), 'utf8'));
  const result = spawnSync('supabase', ['db', 'push', '--dry-run', '--db-url', dbUrl], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });
  // Never echo raw CLI output: it may contain a database URL or credentials.
  if (result.status !== 0) throw new Error('Supabase dry-run failed; inspect connection/migration history before retrying. No apply was started.');
  const pending = pendingMigrations((result.stdout || '') + (result.stderr || ''));
  const blocked = [];
  for (const file of pending) {
    let findings;
    try { findings = await migrationFindings(await readFile(path.join(ROOT, 'supabase/migrations', file), 'utf8')); }
    catch { findings = ['SQL could not be read or parsed']; }
    if (findings.length) blocked.push({file, findings});
  }
  console.log(JSON.stringify({pending, blocked}, null, 2));
  if (blocked.length) throw new Error('Automatic deployment blocked. Report these migrations; do not apply or bypass the guard.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
