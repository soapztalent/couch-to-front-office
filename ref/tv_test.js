// trade-value short test: value table, deadline calls + meter + counter, AI deadline trades with grades. usage: node tv_test.js <dir> <out.json> [shots]
const puppeteer=require('/workspace/codereview/node_modules/puppeteer-core');const fs=require('fs');const W=ms=>new Promise(r=>setTimeout(r,ms));
const DIR=process.argv[2],OUT=process.argv[3],SHOTS=process.argv[4];const URL='http://localhost:8796/'+DIR+'/index.html',R={errors:[],net:0};const log=(k,v)=>{R[k]=v;console.log(k,JSON.stringify(v));};
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox'],userDataDir:'/tmp/tvt-'+process.pid});
 const p=await b.newPage();await p.setViewport({width:1440,height:900});
 p.on('pageerror',e=>R.errors.push('pageerror: '+e.message));p.on('console',m=>{const t=m.text();if(m.type()==='error'){if(/Failed to load resource|net::ERR|CORS/.test(t))R.net++;else R.errors.push('console: '+t.slice(0,300));}});
 await p.setRequestInterception(true);p.on('request',r=>{const u=r.url();if(u.startsWith('http://localhost')||u.startsWith('data:')||u.startsWith('blob:'))r.continue();else r.abort();});
 const ev=(f,...a)=>p.evaluate(f,...a);const G=s=>ev(s=>__ev('(function(g){'+s+'})')(__cur().game),s);
 const click=sel=>ev(s=>{const x=[...document.querySelectorAll(s)].find(x=>!x.disabled&&x.offsetParent!==null);if(x){x.click();return true}return false},sel);
 await p.goto(URL,{waitUntil:'load'});await W(1500);
 await ev(()=>{document.querySelector('[data-team="BOS"]').click()});await W(200);await ev(()=>document.getElementById('to-modes').click());await W(400);await ev(()=>document.getElementById('start-franchise').click());await W(3000);
 await ev(()=>document.querySelectorAll('#workspace-modal:not([hidden]) [data-ui-close]').forEach(c=>c.click()));
 await G('simulateToTradeDeadline();');await W(1500);await click('[data-game-action="continue-simulation-recap"]');await W(1000);
 log('values',await G(`aiStatusNow={kind:'deadline',date:tradeDeadlineISO(g)};aiStatusCache={};var out={picks:[],players:[]};function find(n){var r=null;teams.forEach(function(t){clubRoster(g,t.id).concat(tradeClubObject(g,t.id).reserveRoster||[]).forEach(function(p){if(p.name===n&&!r)r={p:p,id:t.id};});});return r;}
  ['STL','COL','BOS','CHI'].forEach(function(id){clubPicks(g,id).filter(function(k){return k.round<=3&&Number(k.year)<=Number(g.startYear)+Number(g.season)+1;}).slice(0,5).forEach(function(k){out.picks.push(id+' holds '+realPickLabel(k)+' slot~'+Math.round(draftSlotForTeam(g,k.origin||k.team))+' engine='+aiMarket(g,k)+' desk='+gmAssetValue(g,id,k));});});
  ['Fabian Lysell','Oskar Sundqvist','Morgan Geekie','Pavel Zacha','Elias Lindholm','David Pastrnak','Charlie McAvoy','Fraser Minten','Matthew Poitras'].forEach(function(n){var f=find(n);if(!f)return;var p=f.p;var grp=p.__group;p.__group=p.__group||'active';var si=aiStatusInfo(g,p);out.players.push(n+' '+f.id+' '+p.pos+' '+p.ovr+'/'+p.potential+' a'+p.age+' '+(si?si.label:'prospect')+' valueOvr='+Math.round(p19ValueOvr(p))+' engine='+Math.round(aiMarket(g,p))+' desk='+gmAssetValue(g,f.id,p)+(tvDepth(p)?' [depth cap]':''));});
  var stl=aiTeamCtx(g,'STL','deadline'),lys=find('Fabian Lysell');if(lys){lys.p.__group='active';var pk=clubPicks(g,'STL').filter(function(k){return k.round===1;}).slice(0,2),sun=find('Oskar Sundqvist');var give=pk.concat(sun?[sun.p]:[]);sun&&(sun.p.__group='active');var s=aiSideScore(g,stl,give,[lys.p]);out.replay='STL ('+stl.role+') gives '+give.map(function(a){return a.round?realPickLabel(a):a.name;}).join(' + ')+' for Lysell: STL give='+Math.round(s.give)+' get='+Math.round(s.get)+' accept='+aiAccept(s)+(s.tvBlock?' block: '+s.tvBlock:'');}
  return out;`));
 await W(500);
 const calls=[];for(let n=0;n<3;n++){let ok=false;for(let i=0;i<14;i++){await W(500);if(await G('return !!(g.deadlineDay&&dlActive(g.deadlineDay))')){ok=true;break;}}
   if(!ok){await ev(t=>CTFODeadline.ring(t),n%2?'pitch':'offer');await W(700);}
   const c=await G('var c=dlActive(g.deadlineDay);return c?{type:c.type,team:c.team,give:c.give.map(function(r){return r.txt;}),get:c.get.map(function(r){return r.txt;}),ratio:+(c.nu/c.na).toFixed(3)}:null');
   await W(600);const meter=await ev(()=>{const m=document.querySelector('#dl16-phone .p19-meter');return m?m.innerText.replace(/\n/g,' | '):null});
   if(n===0&&SHOTS)await p.screenshot({path:SHOTS+'-call.png'});
   if(n<2){await click('#dl16-phone [data-dl-call="decline"]');calls.push({c,meter});await W(4800);}
   else{await click('#dl16-phone [data-dl-call="counter"]');await W(900);const after=await G('var c=(g.deadlineDay.calls||[]).slice(-1)[0];return {state:c.state,note:c.note,get:c.get.map(function(r){return r.txt;}),give:c.give.map(function(r){return r.txt;}),ratio:+(c.nu/c.na).toFixed(3)}');calls.push({c,meter,countered:after});}}
 log('calls',calls);
 await click('#workspace-modal [data-dl-act="finish"]')||await click('[data-dl-act="finish"]');await W(2500);
 log('aiTrades',await G(`var ents=(g.aiTradeLog||[]).filter(function(e){return e.window==='deadline';});return {n:ents.length,grades:ents.map(function(e){var f=function(l){return (l||[]).some(function(x){return /1st-round/.test(x);});};return (f(e.aReceives)||f(e.bReceives)?'[1ST] ':'')+e.type+' | '+e.teamA+'('+e.stateA+') gets '+e.aReceives.join(' + ')+' ['+dlGrade(dlScore(e,'A'))+'] | '+e.teamB+'('+e.stateB+') gets '+e.bReceives.join(' + ')+' ['+dlGrade(dlScore(e,'B'))+'] mkt '+e.marketA+'/'+e.marketB;})};`));
 if(SHOTS){await W(500);await p.screenshot({path:SHOTS+'-results.png'});}
 log('mirror',await ev(async()=>{const a=await (await fetch('app.js')).text();const i=await (await fetch('index.html')).text();return i.split(a).length-1;}));
 console.log('ERRORS',R.errors.length,JSON.stringify(R.errors.slice(0,8)),'net',R.net);fs.writeFileSync(OUT,JSON.stringify(R,null,1));await b.close();})().catch(e=>{console.error('FATAL',e);process.exit(1);});
