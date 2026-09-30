import {readFileSync} from 'node:fs';

const BATCHES=['005b','005c','005d'];
const SOURCE_SHA='53f7b239f25778321b63c5fbdcdab2958114ab60869e81dec6274163bf05d48a';
const read=(name)=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));

export function loadAugmentContracts(){
  const sourceBatches=BATCHES.map(batch=>read('pve-augment-beta-'+batch+'.json'));
  const resolutionBatches=BATCHES.map(batch=>read('pve-augment-resolution-'+batch+'.json'));
  const sourceEntries=sourceBatches.flatMap(batch=>batch.entries);
  const resolutionEntries=resolutionBatches.flatMap(batch=>batch.entries);
  if(sourceBatches.some(batch=>batch.sourceSha256!==SOURCE_SHA)||
     resolutionBatches.some(batch=>batch.sourceSha256!==SOURCE_SHA))
    throw new Error('BETA source checksum mismatch');
  if(sourceEntries.length!==390||resolutionEntries.length!==390)
    throw new Error('Expected exactly 390 source and resolution rows');
  const sourceIds=sourceEntries.map(row=>row.augmentId);
  const overlayIds=resolutionEntries.map(row=>row.augmentId);
  if(new Set(sourceIds).size!==390||sourceIds.some((id,index)=>id!==overlayIds[index]))
    throw new Error('Augment IDs missing, duplicated or reordered');
  const contracts=sourceEntries.map((source,index)=>({
    ...source,
    ...resolutionEntries[index],
    sourceBetaValue:source.betaValue,
    sourceLimit:source.limit,
    sourceDescription:source.canonicalDescription,
    sourceRecord:source
  }));
  return {sourceEntries,resolutionEntries,contracts};
}

if(process.argv[1]&&new URL('file://'+process.argv[1].replaceAll('\\','/')).href===import.meta.url){
  const {contracts}=loadAugmentContracts();
  const status=Object.fromEntries(['SPEC_COMPLETE','SPEC_PARTIAL','SPEC_AMBIGUOUS'].map(key=>[key,contracts.filter(row=>row.status===key).length]));
  process.stdout.write(JSON.stringify({count:contracts.length,status})+'\n');
}
