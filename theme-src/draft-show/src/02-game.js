
/* ---------------- game integration ---------------- */
var OUT={now:['SIGNS ELC ON THE SPOT','green'],later:['WILL SIGN LATER THIS SUMMER','gold'],return:['RETURNING TO JUNIOR / COLLEGE','blue'],unhappy:['UNHAPPY · MAY NOT SIGN','red']};
function seedOf(g){return A()&&A().seedOf?A().seedOf(g):(g.draftSeed||'ctfo');}
function returnLabel(p){var lt=ltype(p);return lt==='CHL'?'RETURNING TO JUNIOR':/NCAA/.test(lt)?'RETURNING TO COLLEGE':'STAYING WITH HIS EUROPEAN CLUB';}
S.outcomeTitle=function(t,p){return t.outcome==='return'?returnLabel(p):OUT[t.outcome][0];};
S.outcomeDetail=function(t,p,g){var d=p.ctfoDraft||{},lt=ltype(p);if(t.outcome==='now')return p.contractSource||'Entry-level contract signed.';
 if(t.outcome==='later')return (t.limit?'At the 50-contract limit right now. ':'')+'Rights held. Expected to sign within '+t.weeks+' weeks, before training camp.';
 if(t.outcome==='return')return /NCAA/.test(lt)?'Rights retained while he stays in school (through June 1, '+d.expires+').':'Rights retained until June 1, '+d.expires+'. Back with '+(p.amateurTeam||'his club')+' next season.';
 return 'Rights at risk. A future ELC offer is much less likely; if his rights lapse he can re-enter the draft or hit free agency.';};
S.pickQuestion=function(g,p,ctx,consume){var used=consume?(g.ctfoTalkUsed=g.ctfoTalkUsed||[]):[],all=QS().filter(function(q){return S.eligible(q,ctx);}),pool=all.filter(function(q){return used.indexOf(q.id)<0;});
 if(!pool.length&&consume){g.ctfoTalkCycles=(Number(g.ctfoTalkCycles)||0)+1;g.ctfoTalkUsed=used=[];pool=all;}if(!pool.length)return null;
 var r=rng(seedOf(g)+'|q|'+p.id+'|'+used.length),tot=0,w=pool.map(function(q){var x=Object.keys(q.elig||{}).length?2.5:1;tot+=x;return x;}),x=r()*tot;for(var i=0;i<pool.length;i++){x-=w[i];if(x<=0)break;}var q=pool[Math.min(i,pool.length-1)];if(consume)used.push(q.id);return q;};
function qById(id){return QS().find(function(q){return q.id===id;})||null;}
S.qById=qById;
/* apply an answer: real ELC via draft.js signElc (50-contract limit respected), rights otherwise */
S.resolve=function(g,p,ownerId,year,overall,q,ai,user){var ctx=S.context(g,p,ownerId,overall,year),t=S.traits(seedOf(g),p,ctx.lt,ctx.age),evs=S.evaluate(q,t,ctx),ev=evs[ai],r=rng(seedOf(g)+'|talk|'+p.id+'|'+year+'|'+ai),o=S.rollOutcome(r,user?ev:S.cpuEv(ev,ctx),ctx,!user),limit=false;
 if(o.outcome==='now'){var res=A().signElc(g,p,ownerId,year,true);if(res==='limit'){o={outcome:'later',weeks:2+Math.floor(r()*7)};limit=true;}}
 if(o.outcome==='unhappy'&&p.ctfoDraft)p.ctfoDraft.atRisk=true;
 var evr=user?ev:S.cpuEv(ev,ctx);var talk={v:1,qid:q.id,by:q.by,choice:ai,pBefore:+evr.pBefore.toFixed(4),pAfter:+evr.pAfter.toFixed(4),E:+ev.E.toFixed(3),outcome:o.outcome,weeks:o.weeks||0,limit:limit,verdict:user?S.verdict(ev,evs):null,year:year,owner:ownerId,overall:overall,user:!!user,pending:false};
 if(p.ctfoDraft)p.ctfoDraft.talk=talk;return {talk:talk,evs:evs,ev:ev,traits:t,ctx:ctx};};
S.cpuDecide=function(g,p,row,year){try{var ctx=S.context(g,p,row.owner,row.overall,year),q=S.pickQuestion(g,p,ctx,false);if(!q)return;var t=S.traits(seedOf(g),p,ctx.lt,ctx.age),ai=S.policy(rng(seedOf(g)+'|cpugm|'+p.id),S.evaluate(q,t,ctx));S.resolve(g,p,row.owner,year,row.overall,q,ai,false);}catch(e){console.error('draft talk cpu',e);}};
/* v9.1: CPU clubs' draft-night signings calibrated back to realistic rates (about Build Bot's: CHL 1-20 60%, 21-64 25%, 65+ 5%, Europe 1-15 35%, 16+ 4%, NCAA ~1%). The same personality model still decides who signs; only the CPU baseline shifts. User odds are unchanged. */
S.CPU_ADJ={c1:-0.12,c2:-0.40,c3:-1.16,e1:-0.54,e2:-1.30,n:-1.77,nb:-1.49};S.CPU_LATER=0.35;
S.cpuBucket=function(ctx){var o=ctx.overall,lt=ctx.lt;return lt==='CHL'?(o<=20?'c1':o<=64?'c2':'c3'):lt==='EURO'?(o<=15?'e1':'e2'):lt==='NCAA'?'n':'nb';};
S.cpuEv=function(ev,ctx){var off=S.CPU_ADJ[S.cpuBucket(ctx)]||0,lg=function(p){p=cl(p,1e-4,1-1e-4);return Math.log(p/(1-p));};return {i:ev.i,type:ev.type,E:ev.E,terms:ev.terms,pBefore:sig(lg(ev.pBefore)+off),pAfter:sig(lg(ev.pAfter)+off)};};
S.adjustAccept=function(p,year,a){var t=p&&p.ctfoDraft&&p.ctfoDraft.talk;if(!t||t.pending)return a;if(t.outcome==='later'&&!t.done)return 1;if(t.outcome==='unhappy')return a*0.35;if(t.outcome==='return'&&year===t.year)return a*0.5;
 /* later summers: how the draft-stage talk went still colours his view of the club */var m=t.verdict==='Great'?1.15:t.verdict==='Good'?1.08:t.verdict==='Wrong'?0.8:1;if(!t.verdict){m=t.E>=0.8?1.1:t.E<=-0.6?0.85:1;}return Math.min(0.97,a*m);};
/* end of summer: players who agreed to sign later sign their ELC (unless the club is at the 50-contract limit) */
S.summerTick=function(g){var x=X();if(!x||!A())return;var notes=[];x.teams.forEach(function(tm){var c=tm.id===g.team?g:x.leagueClub(g,tm.id);if(!c)return;(c.orgProspects||[]).concat(c.reserveRoster||[]).forEach(function(p){var t=p.ctfoDraft&&p.ctfoDraft.talk;if(!t||t.outcome!=='later'||t.done)return;if(!p.unsigned){t.done='signed';return;}var res=A().signElc(g,p,tm.id,t.year,true);t.done=res==='limit'?'limit':'signed';if(tm.id===g.team)notes.push(p.name+(res==='limit'?' could not sign (50-contract limit; rights kept)':' signed his entry-level deal'));});});
 if(notes.length){g.history=g.history||[];g.history.push({year:x.seasonLabel(g),text:'Summer signings from the draft stage: '+notes.join('; ')+'.',tag:'NHL DRAFT'});}};
S.rightsNote=function(p,year){var t=p&&p.ctfoDraft&&p.ctfoDraft.talk;if(!t||!t.user||t.pending)return '';var o=OUT[t.outcome]||OUT.return,lt=ltype(p),label={now:'Signed his ELC on the spot',later:'Will sign later this summer',unhappy:'Unhappy, may not sign',return:lt==='CHL'?'Returning to junior':/NCAA/.test(lt)?'Returning to college':'Staying with his European club'}[t.outcome]||'';return '<p class="ctfo-small cs-rights-note cs-'+o[1]+'"><b>Draft stage:</b> '+esc(label)+(t.outcome==='later'&&!t.done?' · within '+t.weeks+' weeks (an ELC offer now is accepted)':'')+(t.done==='limit'?' · blocked by the 50-contract limit':'')+' · '+esc(t.verdict||'')+' answer · signing chance '+pct(t.pBefore)+' → '+pct(t.pAfter)+'</p>';};

/* ---------------- settings ---------------- */
var SET_KEY='ctfo.draftShow';
S.settings=function(){var s={mode:'full',speed:1};try{var v=JSON.parse(W.localStorage.getItem(SET_KEY)||'{}');if(/^(full|r1|off)$/.test(v.mode))s.mode=v.mode;if([1,2,4].indexOf(Number(v.speed))>=0)s.speed=Number(v.speed);}catch(e){}return s;};
S.saveSettings=function(o){var s=S.settings();Object.keys(o).forEach(function(k){s[k]=o[k];});try{W.localStorage.setItem(SET_KEY,JSON.stringify(s));}catch(e){}return s;};
