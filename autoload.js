(async()=>{
 'use strict';
 document.documentElement.classList.add('pages-mode');
 const status=document.createElement('div');status.id='pagesLoadStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.body.append(status);
 const state=window.PagesLoadState={status:'loading',results:[],failures:[],retries:0};
 const base=String(window.DASHBOARD_CONFIG?.apiBase||'').replace(/\/$/,'');
 const message=text=>status.textContent=text;
 async function readWithRetry(url,options,read){
  for(let attempt=0;attempt<2;attempt++){
   try{
    const response=await fetch(url,options);
    if(!response.ok){const error=new Error('데이터 요청 HTTP '+response.status);error.retryable=[408,425,429].includes(response.status)||response.status>=500;throw error;}
    return await read(response);
   }catch(error){
    if(attempt===1||error.retryable===false)throw error;
    state.retries++;message('연결을 다시 시도하고 있습니다…');
    await new Promise(resolve=>setTimeout(resolve,1000));
   }
  }
 }
 async function download(entry){
  const parts=[];
  for(let i=0;i<entry.parts;i++){
   message(entry.name+' 다운로드 중… '+(i+1)+'/'+entry.parts);
   parts.push(await readWithRetry(base+'/api/data?id='+encodeURIComponent(entry.id)+'&part='+i+'&v='+entry.sha256,undefined,response=>response.blob()));
  }
  message(entry.name+' 데이터 연결 중…');
  const blob=await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
  if(blob.size!==entry.bytes)throw Error(entry.name+' 크기 검증 실패');return blob;
 }
 try{
  if(window.FirstScreen)await window.FirstScreen.shown;
  if(!base)throw Error('데이터 서버 주소가 없습니다.');
  const manifest=await readWithRetry(base+'/api/data',{cache:'no-cache'},response=>response.json());
  if(!manifest.analysis)throw Error('최신 AI 분석 서버가 아직 준비되지 않았습니다. 잠시 후 새로고침해 주세요.');
  const ai=JSON.parse(await(await download(manifest.analysis)).text());window.SeenDashboard.setAIAnalyses(ai);
  for(const entry of manifest.entries){
   try{
    const blob=await download(entry),file=new File([blob],entry.originalName,{type:'application/json'});
    if(entry.kind==='sns'){
     if(!await window.SeenDashboard.importFiles([file],entry.id))throw Error(document.getElementById('importMessage').textContent);
     const ds=window.SeenDashboard.datasets.get(entry.id);state.results.push({id:entry.id,posts:ds.postMap.size,images:ds.imageMap.size});
    }else{
     const data=await window.CrossCheck.readRankingFile(file,entry.id);window.CrossCheck.loadSavedRanking(entry.id,data,entry.originalName);
     state.results.push({id:entry.id,rows:data.rankings.length});
    }
   }catch(error){state.failures.push({id:entry.id,message:error.message});console.error('자동 연결 실패',entry.id,error.message);}
  }
  window.SeenDashboard.state.market='KR';window.SeenDashboard.renderAll();window.CrossCheck.dialog();
  document.documentElement.dataset.snsAIReady=state.failures.length?'error':'true';
  state.status=state.failures.length?'partial':'complete';
  message(state.failures.length?'일부 자료 연결 실패: '+state.failures.map(e=>e.id+' '+e.message).join(' / '):'SNS 2개 · 쇼핑몰 3개 · AI 분석 자동 연결 완료');
  if(window.FirstScreen){if(state.failures.length)window.FirstScreen.fail();else window.FirstScreen.finish();}
  const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>status.remove();status.append(close);
 }catch(error){window.FirstScreen?.fail();state.status='failed';state.failures.push({message:error.message});document.documentElement.dataset.snsAIReady='error';message('자동 연결 실패: '+error.message);console.error(error.message);}
})();
