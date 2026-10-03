import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDesignDFiles, validateDesignD } from '../scripts/validate-pve-content-005q-design-d.mjs';
const files = await loadDesignDFiles();
const check = document => validateDesignD(document, files.decisions, files.source);
const entry = (d, n) => d.entries.find(x => x.augmentId === 'aug-' + n);
const operation = (d, n, name) => entry(d, n).effectValue.operations.find(x => x.op === name);

test('DESIGN-D exact120 identities, behavioral contracts and all seven decisions', () => {
  const result = check(files.document);
  assert.deepEqual(result.errors, []);
  for (const k of ['target','uniqueIds','specComplete','runtimeReady','roomResolved','positiveTestContracts','negativeTestContracts']) assert.equal(result.audit[k], 120);
  assert.equal(result.audit.newContractExecutable, 0);
  assert.equal(result.audit.userConfirmedDecisionCoverage, 'D01-D07_ALL_APPLIED');
  for (const [k,v] of Object.entries(result.audit)) assert.deepEqual(files.audit[k], v, 'audit drift: ' + k);
});
const regressions = [
  ['missing ID', d => d.entries.pop(), /Expected120|Exact271/],
  ['duplicate ID', d => d.entries[1].augmentId = d.entries[0].augmentId, /Duplicate/],
  ['stage drift', d => entry(d,271).stage=4, /stage|source identity/],
  ['null machine condition', d => entry(d,271).condition=null, /condition|Null/],
  ['missing room boolean', d => delete entry(d,271).roomApplicability.REST, /rooms/],
  ['executable activation', d => entry(d,271).executable=true, /readiness\/executable/],
  ['unresolved marker', d => entry(d,271).condition.expression='TBD', /Incomplete marker/],
  ['unlabelled inference', d => entry(d,271).provenance.fieldOrigins.condition='LEGACY_RUNTIME', /origincondition/],
  ['missing actual test case', d => entry(d,271).testCasesRequired.minimumPositiveCase.givenWhenThen='', /behavioraltest/],
  ['D01 ally-wide protection', d => entry(d,287).targetRule='ALL_ALLIES', /D01ownerreservation/],
  ['D02 exclusive target', d => d.baseCanonicals.vampire.mark.sharedTarget=false, /D02owner/],
  ['D03 overflow no conversion', d => d.baseCanonicals.demon_swordsman.devour.multipleLevels=false, /D03overflow/],
  ['D04 parity wrong phase', d => d.baseCanonicals.twins.parity.input='FINAL_NUMBER', /D04printed/],
  ['D05 reserve cap2', d => operation(d,303,'GRANT_COMMAND_RESERVE').cap=2, /D05reserve/],
  ['D05 same-resolve or permanent Dominance damage', d => { const op = operation(d,308,'ARM_COMMAND_DAMAGE_STREAM'); op.eligibleFrom='CURRENT_RESOLVE'; op.charges=0; op.consumeCharge=false; }, /D05persistent/],
  ['D06 whole collision group protected', d => operation(d,307,'PROTECT_OWNER_COLLISION_VALIDITY').leaveOtherMembersInvalid=false, /D06owner/],
  ['D07 automatic transform', d => operation(d,351,'SET_TRANSFORMATION_READY').automatic=true, /D07manual/],
  ['D07 restore parked normal cycle', d => operation(d,351,'ACTIVATE_TRANSFORMATION').replaceNormalCycle=false, /D07manual/],
  ['D07 incorrect five-card override', d => operation(d,358,'OVERRIDE_TRANSFORM_POOL').value=[3,4,5,6], /D07pool/],
  ['D07 missing dependent card reference', d => entry(d,360).provenance.userConfirmedDecisionIds= ['D03'], /D07card360/],
  ['Q08 random instead of recent recovery', d => operation(d,390,'RECOVER_CARD').selector='RANDOM', /Q08recent/],
  ['undeclared condition symbol', d => entry(d,271).condition.expression='MISSING_PREDICATE', /undeclared predicate/],
  ['source row rewritten', d => entry(d,283).sourceValueV01='defense shred1', /source wording/]
];
for (const [name, mutate, expected] of regressions) test('DESIGN-D rejects ' + name, () => {
  const changed = structuredClone(files.document); mutate(changed);
  assert.match(check(changed).errors.join('\n'), expected);
});
test('historical source quotations are excluded from unresolved scanner', () => {
  assert.ok(files.document.entries.some(x => x.sourceValueV01.includes('조건 달성 시')));
  assert.equal(check(files.document).audit.unresolvedScannerMatches, 0);
});
