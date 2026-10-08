
/* ---------------- wiring: controls, draft-room hooks, resume after reload ---------------- */
function onClick(ev){var t=ev.target;if(!t||!t.closest)return;
 var cs=t.closest('#ctfo-show [data-cs],#ctfo-show [data-cs-answer]');if(cs){ev.preventDefault();ev.stopPropagation();var a=cs.getAttribute('data-cs');
  if(cs.hasAttribute('data-cs-answer'))return S.answer(cs.getAttribute('data-cs-answer'));
  if(a==='speed'){var s=S.settings(),n={1:2,2:4,4:1}[s.speed];S.saveSettings({speed:n});syncCtrl();return;}
  if(a==='continue'){if(cur)advance();return;}
  if(a==='skipq'){if(cur)finishItem();return;}
  if(a==='pick'||(a==='skip'&&cur&&cur.kind==='userclock')){finishItem();return;}
  if(a==='skip'){S.skip();return;}
  if(a==='ff'){S.simToMine();return;}return;}
 var b=t.closest('[data-action]');if(!b||b.disabled)return;var act=b.getAttribute('data-action');
 if(act==='finish-draft'){S._silent=true;setTimeout(function(){S._silent=false;},0);}
 if(act==='ctfo-sim-to-mine'||act==='simulate-next-pick'||act==='start-offseason-draft'||act==='continue-to-draft'||act==='continue-after-player-call'||act==='draft')S.preload();}
S.skip=function(){if(!cur)return;var userish=cur.kind==='user'||cur.kind==='talk';if(userish){var t=cur.p.ctfoDraft&&cur.p.ctfoDraft.talk,ph=cur.phases[cur.pi].n;if(t&&t.pending&&ph!=='question'){jump('question');return;}if(ph==='result'||ph==='board'){finishItem();return;}if(!t||!t.pending){if(!jump('result'))finishItem();return;}return;}finishItem();};
S.simToMine=function(){S._ff=true;queue.forEach(function(x){if(x.kind==='full'||x.kind==='quick')x.kind='ticker';});if(cur&&cur.kind!=='user'&&cur.kind!=='talk')finishItem();var g=game(),st=g&&g.offseason&&g.offseason.liveDraft,row=st&&st.order[st.cursor];if(g&&g.offseason.phase==='draft'&&!g.offseason.playerCall&&row&&row.owner!==g.team){var btn=document.querySelector('#office-content [data-action="ctfo-sim-to-mine"]');if(btn&&!btn.disabled)btn.click();}};
function onChange(ev){var t=ev.target;if(!t||!t.matches||!t.matches('[data-cs-pres]'))return;S.saveSettings({mode:t.value});document.querySelectorAll('[data-cs-pres]').forEach(function(s){s.value=t.value;});}
function checkClock(){var g=game();if(!g||!g.offseason||g.offseason.phase!=='draft'||g.offseason.playerCall)return;if(cur||queue.length)return;
 var pend=pendingTalk(g);if(pend){enqueue({kind:'talk',overall:pend.ctfoDraft.talk.overall,round:pend.ctfoDraft.round,slot:0,owner:g.team,origin:g.team,p:pend,year:pend.ctfoDraft.talk.year});return;}
 if(!document.querySelector('#office-content .draft-night-stage'))return;var st=g.offseason.liveDraft,row=st&&st.order&&st.order[st.cursor];if(!row||row.done||row.owner!==g.team||S.settings().mode==='off')return;var key=st.year+'|'+row.overall;if(S._clockShown[key])return;S._clockShown[key]=1;enqueue({kind:'userclock',overall:row.overall,round:row.round,slot:row.slot,owner:row.owner,origin:row.origin,p:{name:'',pos:''},year:st.year});}
S._clockShown={};
function pendingTalk(g){var all=(g.orgProspects||[]).concat(g.reserveRoster||[]);return all.find(function(p){return p.ctfoDraft&&p.ctfoDraft.talk&&p.ctfoDraft.talk.pending;})||null;}
S.pendingTalk=pendingTalk;
function pendingDebrief(g){var all=(g.orgProspects||[]).concat(g.reserveRoster||[]);return all.find(function(p){var t=p.ctfoDraft&&p.ctfoDraft.talk;return t&&t.debriefPending&&!t.pending;})||null;}
function resumeCheck(){var g=game();if(!g||cur||queue.length)return;var p=pendingTalk(g);if(p){var t=p.ctfoDraft.talk;enqueue({kind:'talk',overall:t.overall,round:p.ctfoDraft.round,slot:0,owner:t.owner,origin:t.owner,p:p,year:t.year});return;}var d=pendingDebrief(g);if(d){var td=d.ctfoDraft.talk,rep=S.replay(g,d);if(rep){enqueue({kind:'debrief',overall:td.overall,round:d.ctfoDraft.round||1,slot:0,owner:td.owner,origin:td.owner,p:d,year:td.year,res:rep,q:rep.q});return;}}checkClock();}
function inject(){var c=document.getElementById('office-content');if(!c)return;var acts=c.querySelector('.draft-night-stage .draft-night-actions');if(acts&&!acts.querySelector('.cs-pres')){var s=S.settings();acts.insertAdjacentHTML('beforeend','<label class="cs-pres cs-pres-room">Draft presentation <select data-cs-pres><option value="full">Full broadcast</option><option value="r1">Round 1 only</option><option value="off">Off</option></select></label>');acts.querySelector('[data-cs-pres]').value=s.mode;}
 var g=game();if(g&&g.offseason){if(S.settings().mode!=='off'||pendingTalk(g))S.preload();resumeCheck();}}
var obsT=0;function onMut(){if(obsT)return;obsT=setTimeout(function(){obsT=0;try{inject();}catch(e){console.error('draft show inject',e);}},60);}
S.boot=function(){if(S._booted||typeof document==='undefined')return;S._booted=true;W.addEventListener('click',onClick,true);document.addEventListener('change',onChange,true);
 var start=function(){var c=document.getElementById('office-content');if(!c)return setTimeout(start,300);new MutationObserver(onMut).observe(c,{childList:true});onMut();};start();};
/* test hooks */
S._hold=function(name,frac){hold={n:name,f:frac==null?0.5:frac};paused=false;S._held=null;};
S._resume=function(){hold=null;paused=false;S._held=null;};
S.state=function(){return {active:!!cur,kind:cur&&cur.kind,scene:cur&&cur.phases&&cur.phases[cur.pi]&&cur.phases[cur.pi].n,queue:queue.length,held:S._held||null,stage:stage&&stage.kind||null,noGL:!!S._noGL,glError:S._glError||null,ticker:tick.length};};
S._play=function(it){enqueue(it);};
S._reset=function(){queue.length=0;cur=null;close();};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',S.boot);else S.boot();}
})();
