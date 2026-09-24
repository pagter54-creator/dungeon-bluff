// Deduplicate foreground/background requests. Failed requests remain retryable.
export function createAssetLoader({imageFactory=()=>new Image(),fetcher=(...args)=>fetch(...args),timeout=25000}={}) {
  const ready=new Set(),pending=new Map(),queue=[];
  let active=0;
  const drain=()=>{
    while(active<2&&queue.length){const next=queue.shift();active++;
      Promise.resolve().then(next.run).then(next.resolve,next.reject).finally(()=>{active--;drain();});
    }
  };
  function load(url,audio=false) {
    if(ready.has(url))return Promise.resolve();
    if(pending.has(url))return pending.get(url);
    const run=()=>audio?new Promise((resolve,reject)=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>{controller.abort();reject(new Error('음악 로딩 시간 초과'));},timeout);
      Promise.resolve().then(()=>fetcher(url,{signal:controller.signal,cache:'force-cache'}))
        .then(response=>{if(!response.ok)throw new Error('음악 파일을 읽지 못했습니다.');return response.arrayBuffer();})
        .then(resolve,reject).finally(()=>clearTimeout(timer));
    }):new Promise((resolve,reject)=>{
      const img=imageFactory();
      const finish=error=>{clearTimeout(timer);img.onload=img.onerror=null;error?reject(error):resolve();};
      const timer=setTimeout(()=>{finish(new Error('이미지 로딩 시간 초과'));img.src='';},timeout);
      img.onload=()=>finish();img.onerror=()=>finish(new Error('이미지 파일을 읽지 못했습니다.'));img.src=url;
    });
    const work=new Promise((resolve,reject)=>{queue.push({run,resolve,reject});drain();});
    const request=work.then(()=>{ready.add(url);}).finally(()=>pending.delete(url));
    pending.set(url,request);return request;
  }
  async function batch(urls,{onProgress=()=>{},delay=0,audio=false}={}) {
    const unique=[...new Set(urls)],failed=[];let next=0,done=0;
    onProgress(0,unique.length);
    await Promise.all(Array.from({length:Math.min(2,unique.length)},async()=>{
      while(next<unique.length){const url=unique[next++];
        try{await load(url,audio);}catch{failed.push(url);}
        onProgress(++done,unique.length);
        if(delay&&next<unique.length)await new Promise(resolve=>setTimeout(resolve,delay));
      }
    }));return failed;
  }
  return {load,batch,ready};
}
export const assetLoader=createAssetLoader();
