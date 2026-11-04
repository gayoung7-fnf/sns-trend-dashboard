(async function () {
 'use strict';
 document.documentElement.classList.add('pages-mode');
 const box = document.createElement('div');box.id='pagesLoadStatus';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.append(box);
 const apiBase=String(window.DASHBOARD_CONFIG?.apiBase||'').replace(/\/$/,'');
 const failures=[];const results=[];
 const state=window.PagesLoadState={status:'loading',results,failures};
 const message=text=>{box.textContent=text;};
 async function load(entry){
  message(entry.name+' 데이터 다운로드 중…');
  const parts=[];
  for(let i=0;i<entry.parts;i++){
   message(entry.name+' 다운로드 중… '+(i+1)+'/'+entry.parts);
   const response=await fetch(apiBase+'/api/data?id='+encodeURIComponent(entry.id)+'&part='+i);
   if(!response.ok)throw Error('HTTP '+response.status);
   parts.push(await response.blob());
  }
  const packed=new Blob(parts);
  message(entry.name+' 압축 해제 중…');
  const blob=await new Response(packed.stream().pipeThrough(new DecompressionStream('gzip'))).blob();
  if(blob.size!==entry.bytes)throw Error('데이터 크기가 원본과 다릅니다.');
  message(entry.name+' 분석 데이터 연결 중…');
  await new Promise(resolve=>setTimeout(resolve,30));
  const file=new File([blob],entry.originalName,{type:entry.kind==='sns'?'application/json':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  if(entry.kind==='sns'){
   if(!await window.SeenDashboard.importFiles([file],entry.id))throw Error(document.getElementById('importMessage').textContent||'SNS 연결 실패');
   const ds=window.SeenDashboard.datasets.get(entry.id);
   if(!ds)throw Error('국가 데이터가 연결되지 않았습니다.');
   return {id:entry.id,posts:ds.postMap.size,images:ds.imageMap.size};
  }
  return {id:entry.id,...await window.CrossCheck.importBundledPlatform(file,entry.id)};
 }
 try{
  if(!('DecompressionStream' in window))throw Error('자동 로딩을 지원하는 최신 Chrome 또는 Edge로 열어주세요.');
  if(!window.SeenDashboard||!window.CrossCheck)throw Error('대시보드 초기화 실패');
  message('배포 데이터 확인 중…');
  if(!apiBase)throw Error('데이터 서버 배포 및 연결 설정이 필요합니다.');
  const response=await fetch(apiBase+'/api/data',{cache:'no-cache'});
  if(!response.ok)throw Error('데이터 목록 HTTP '+response.status);
  const manifest=await response.json();
  for(const entry of manifest.entries){
   try{results.push(await load(entry));}catch(error){failures.push({id:entry.id,message:error.message});console.error(entry.name+' 연결 실패:',error);}
  }
  state.status=failures.length?'partial':'complete';
  message(failures.length?'일부 데이터 연결 실패: '+failures.map(f=>f.id+' · '+f.message).join(' / '):'SNS 2개 · 쇼핑몰 3개 자동 연결 완료');
  const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>box.remove();box.append(close);
 }catch(error){state.status='failed';failures.push({message:error.message});message('자동 연결 실패: '+error.message);console.error(error);}
})();
