/* Couch To Front Office - draft broadcast presentation + on-stage draft conversation (patch13 / v9).
   Sits on top of draft.js (window.CTFODraft). It never chooses players: draft.js calls
   CTFODraftShow.picked() after every selection and CTFODraftShow.cpuDecide() for CPU rights.
   Question pool: draft-questions.js (window.CTFO_DRAFT_QUESTIONS). Styles: draft-show.css. */
(function(){
'use strict';
var W=typeof window!=='undefined'?window:{},S={};W.CTFODraftShow=S;
function DR(){return W.CTFODraft;}function X(){return DR()&&DR().X;}function A(){return DR()&&DR().api;}
function hash(s){var h=2166136261>>>0;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;}
function rng(seed){var a=hash(seed)||1;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function gauss(r){var u=Math.max(1e-9,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function cl(n,a,b){return Math.max(a,Math.min(b,n));}
function sig(x){return 1/(1+Math.exp(-x));}
function pct(x){return Math.round(x*100)+'%';}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ordinal(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function QS(){return W.CTFO_DRAFT_QUESTIONS||[];}
S._hash=hash;S._rng=rng;

/* ---------------- personality model ---------------- */
var TRAITS=[
 ['amb','Ambitious',['In no hurry to turn pro; promises of quick minutes do not move him.','Wants a path to the NHL, but can wait for the right one.','Wants NHL minutes now; talk of patience cools him off.']],
 ['loy','Loyal',['Not attached to any organization; it is a business to him.','Appreciates feeling wanted, but keeps his options open.','Fiercely loyal; wants to feel the club believes in him.']],
 ['pat','Patient',['Impatient; wants a fast track and hates waiting.','Will take the long road if the plan makes sense.','Comfortable with a long development road.']],
 ['col','School-first',['Not attached to the school route at all.','Open to school or turning pro.','Committed to his college or education path.']],
 ['cmp','Competitive',['Not motivated by blunt challenges; prefers encouragement.','Responds to a fair challenge.','A fierce competitor who respects being challenged.']],
 ['fam','Family-first',['Independent; home and family are not a big factor.','Family matters, but it does not drive his decisions.','Family and home weigh on every decision he makes.']],
 ['con','Confident',['Short on confidence; needs reassurance.','Believes in his game on most days.','Very confident; wants to hear that he belongs.']],
 ['coa','Coachable',['Resists being over-coached; trusts his own instincts.','Takes coaching well when it is explained.','Very coachable; responds to a clear plan.']]];
var TL={};TRAITS.forEach(function(t){TL[t[0]]=t[1];});
var PHRASE={amb:['in no rush to turn pro','highly ambitious and wants NHL minutes now'],loy:['not attached to any organization','fiercely loyal and wants to feel wanted'],pat:['impatient and wants a fast track','patient and happy to take the long road'],col:['not attached to the school route','committed to school and his college path'],cmp:['not motivated by blunt challenges','a fierce competitor who respects a blunt challenge'],fam:['independent and not tied to home','family-first'],con:['short on confidence and looking for reassurance','confident and wants to hear he belongs'],coa:['resistant to being over-coached','very coachable and responds to a clear plan']};
var THEME={amb:['talking about patience','promising a fast track'],loy:['sounding transactional','showing real commitment to him'],pat:['pushing him to hurry','laying out a long-term plan'],col:['pulling him away from school','respecting his school path'],cmp:['going easy on him','challenging him bluntly'],fam:['brushing off his family','putting his family first'],con:['questioning his game','telling him he belongs'],coa:['leaving him to figure it out','laying out a clear development plan']};
var CTXP={rebuild:'your rebuild opens a door for him',contend:'your contending roster',thin:'thin depth at his position',deep:'a crowded depth chart at his position',chl:'his CHL path',ncaa:'his college path',euro:'his European club ties',young:'his age (still a teenager)',older:'his age (ready to turn pro)',top:'being a top pick',late:'being a late pick'};
function ltype(p){var t=A()&&A().leagueType?A().leagueType(p):(p.leagueType||'CHL');return /EURO/.test(t)?'EURO':t;}
S.leagueClass=ltype;
/* 0-100 traits, seeded per player id, with league/age biases */
S.traits=function(seed,p,lt,age){if(p.ctfoTraits&&p.ctfoTraits.amb!=null)return p.ctfoTraits;var r=rng(seed+'|traits|'+p.id),o={};TRAITS.forEach(function(t){o[t[0]]=50+gauss(r)*17;});
 if(lt==='NCAA')o.col+=32;else if(lt==='NCAA_BOUND')o.col+=22;else if(lt==='CHL')o.col-=22;else if(lt==='EURO'){o.col-=8;o.fam+=8;}
 if(age>=19)o.con+=6;if(lt==='NCAA')o.pat+=6;Object.keys(o).forEach(function(k){o[k]=Math.round(cl(o[k],3,98));});p.ctfoTraits=o;return o;};
S.character=function(t){return TRAITS.map(function(x){return [x[0],t[x[0]]];}).filter(function(x){return x[0]!=='col'||x[1]>=60;}).sort(function(a,b){return b[1]-a[1];}).slice(0,2).map(function(x){return TL[x[0]];});};
S.traitLine=function(k,v){var d=TRAITS.find(function(t){return t[0]===k;})[2];return v>=65?d[2]:v<=35?d[0]:d[1];};
function z(v){return (v-50)/50;}
/* context: league class, age, pick, org role, positional depth */
function roleOf(g,id){if(id===g.team){var ph=String(g.philosophy||'');return /youth|rebuild/i.test(ph)?'rebuild':/win|contend/i.test(ph)?'contend':'retool';}var c=g.leagueTeams&&g.leagueTeams[id],r=String(c&&c.orgState&&c.orgState.role||'');return /REBUILD|YOUTH/i.test(r)?'rebuild':/WIN|CONTEND/i.test(r)?'contend':'retool';}
S.context=function(g,p,ownerId,overall,year){var api=A(),lt=ltype(p),age=(api&&api.ageAt&&p.ctfoDob?api.ageAt(p.ctfoDob,api.iso(year,9,15)):null)||Number(p.age)||18,nb=0;try{nb=api&&api.needBonus?api.needBonus(g,ownerId,p.pos):0;}catch(e){}
 return S.makeCtx(lt,age,overall,roleOf(g,ownerId),nb>0?'thin':nb<0?'deep':'',p.pos);};
S.makeCtx=function(lt,age,overall,role,depth,pos){var f={rebuild:role==='rebuild'?1:0,contend:role==='contend'?1:0,thin:depth==='thin'?1:0,deep:depth==='deep'?1:0,chl:lt==='CHL'?1:0,ncaa:/NCAA/.test(lt)?1:0,euro:lt==='EURO'?1:0,young:age<=18?1:0,older:age>=19?1:0,top:overall<=15?1:0,late:overall>=97?1:0};
 return {lt:lt,age:age,overall:overall,role:role,depth:depth,pos:pos==='D'?'D':pos==='G'?'G':'F',f:f};};
/* hidden willingness to sign now, as a logit, with named terms */
S.baseTerms=function(ctx,t){var T=[{k:'const',v:-0.5,label:'most draftees are not ready to sign on draft day'}],L={CHL:[0,'CHL players usually turn pro early'],EURO:[-0.9,'his European club wants him back'],NCAA:[-1.4,'he is committed to his college team'],NCAA_BOUND:[-1.0,'he is headed for college hockey']}[ctx.lt]||[0,''];
 T.push({k:'league',v:L[0],label:L[1]});T.push({k:'age',v:ctx.age>=20?0.6:ctx.age===19?0.3:ctx.age<=17?-0.1:0,label:'his age'});
 var o=ctx.overall;T.push({k:'pick',v:o<=10?0.7:o<=32?-0.2:o<=64?-1.6:o<=128?-2.4:-2.9,label:'where he was picked'});
 T.push({k:'role',v:ctx.role==='rebuild'?0.3:ctx.role==='contend'?-0.2:0,label:'your team direction'});T.push({k:'depth',v:ctx.depth==='thin'?0.3:ctx.depth==='deep'?-0.3:0,label:'your depth at his position'});
 T.push({k:'amb',v:0.6*z(t.amb),label:'ambition'});T.push({k:'col',v:-0.9*z(t.col),label:'school commitment'});T.push({k:'pat',v:-0.3*z(t.pat),label:'patience'});T.push({k:'loy',v:0.2*z(t.loy),label:'loyalty'});return T;};
S.baseLogit=function(ctx,t){return S.baseTerms(ctx,t).reduce(function(n,x){return n+x.v;},0);};
S.eligible=function(q,ctx){var e=q.elig||{};if(e.league&&e.league.indexOf(ctx.lt)<0&&!(ctx.lt==='EURO'&&e.league.indexOf('EURO')>=0))return false;if(e.role&&e.role.indexOf(ctx.role)<0)return false;if(e.pos&&e.pos.indexOf(ctx.pos)<0)return false;if(e.age&&e.age.indexOf(ctx.f.young?'young':'older')<0)return false;return true;};
/* answer effect: type base + trait weights x (trait-50)/50 + context weights. A negative weight mostly hurts
   players high in that trait; for players low in it the (positive) effect is damped to 35%. */
S.effect=function(a,t,ctx){var terms=[{kind:'base',k:a.type,val:a.base}],E=a.base;Object.keys(a.traits||{}).forEach(function(k){var w=a.traits[k],zz=z(t[k]),v=w*zz,dm=w<0&&zz<0;if(dm)v*=0.35;terms.push({kind:'trait',k:k,w:w,val:v,damped:dm});E+=v;});Object.keys(a.ctx||{}).forEach(function(k){if(ctx.f[k]){var v=a.ctx[k];terms.push({kind:'ctx',k:k,w:v,val:v});E+=v;}});return {E:E,terms:terms};};
S.evaluate=function(q,t,ctx){var base=S.baseLogit(ctx,t),pb=sig(base);return q.answers.map(function(a,i){var e=S.effect(a,t,ctx);return {i:i,type:a.type,E:e.E,terms:e.terms,pBefore:pb,pAfter:sig(base+e.E)};});};
S.unhappyChance=function(E){return cl(0.008+Math.max(0,-E-0.2)*0.06,0,0.15);};
S.laterShare=function(lt,pAfter,overall){return (lt==='CHL'||lt==='EURO'?0.15+0.45*pAfter:0.05+0.15*pAfter)*(overall>64?0.5:1);};
S.rollOutcome=function(r,ev,ctx,cpu){var u=r(),a=r(),b=r(),w=r();if(u<S.unhappyChance(ev.E))return {outcome:'unhappy'};if(a<ev.pAfter)return {outcome:'now'};if(b<S.laterShare(ctx.lt,ev.pAfter,ctx.overall)*(cpu?S.CPU_LATER:1))return {outcome:'later',weeks:2+Math.floor(w*7)};return {outcome:'return'};};
S.policy=function(r,evs){var order=evs.slice().sort(function(a,b){return b.E-a.E;}),x=r(),w=[0.35,0.30,0.20,0.15],acc=0;for(var i=0;i<4;i++){acc+=w[i];if(x<acc)return order[i].i;}return order[0].i;};
S.verdict=function(ev,evs){var best=Math.max.apply(null,evs.map(function(e){return e.E;}));return ev.E>=best-0.12?'Great':ev.E>=0.4?'Good':ev.E>-0.4?'Risky':'Wrong';};
function ctxNote(e){var c=e.terms.filter(function(x){return x.kind==='ctx'&&Math.abs(x.val)>=0.2;})[0];return c?'Context: '+CTXP[c.k]+' '+(c.val>=0?'helped':'hurt')+' this answer.':'';}
S.explain=function(ev,evs,t,q){var best=evs.slice().sort(function(a,b){return b.E-a.E;})[0],pick=function(e,dir){return e.terms.filter(function(x){return x.kind!=='base'&&!x.damped&&(dir==null||(dir>0?x.val>0.05:x.val<-0.05));}).sort(function(a,b){return Math.abs(b.val)-Math.abs(a.val);});};
 function sentence(x){if(x.kind==='trait'){var zz=x.val/(x.w||1);return 'He is '+PHRASE[x.k][zz>=0?1:0]+' ('+TL[x.k]+' '+t[x.k]+'), so '+THEME[x.k][x.w>=0?1:0]+' '+(x.val>=0?'won him over':'cooled him off')+'.';}return 'With '+CTXP[x.k]+', this answer '+(x.val>=0?'fit his situation':'missed his situation')+'.';}
 var main=pick(ev,ev.E>=0?1:-1),opp=pick(ev,ev.E>=0?-1:1),why=[];if(main[0])why.push(sentence(main[0]));
 if(opp[0]&&Math.abs(opp[0].val)>=0.12)why.push((ev.E>=0?'But ':'On the plus side, ')+sentence(opp[0]).replace(/^He is/,'he is').replace(/won him over\.$/,'won some of him back.').replace(/cooled him off\.$/,'cost you some ground.'));else if(main[1])why.push(sentence(main[1]));
 if(ctxNote(ev))why.push(ctxNote(ev));
 if(!main[0])why.push(ev.type==='strong'?'A strong, direct pitch. Nothing in his personality pushed back on it.':ev.type==='negative'?'A cold answer. It told him the club does not see him the way he sees himself.':'A neutral answer. His personality did not react strongly either way.');
 why.push(Math.abs(ev.E)<0.4?'Net effect: small ('+(ev.E>=0?'+':'')+ev.E.toFixed(2)+'). '+(opp[0]&&Math.abs(opp[0].val)>=0.12?'The pluses and minuses mostly cancelled out.':'Only a nudge; a pitch built for his personality would have moved him more.'):ev.E>=0?'Net effect: a clear lift ('+'+'+ev.E.toFixed(2)+').':'Net effect: it pushed him away ('+ev.E.toFixed(2)+').');
 var b=null;if(best.i!==ev.i){var bm=pick(best,1)[0];b={i:best.i,text:q.answers[best.i].text,pAfter:best.pAfter,why:bm?(bm.kind==='trait'?'He is '+PHRASE[bm.k][(bm.val/(bm.w||1))>=0?1:0]+' ('+TL[bm.k]+' '+t[bm.k]+'), and '+THEME[bm.k][bm.w>=0?1:0]+' is exactly what he needed to hear.':'With '+CTXP[bm.k]+', that answer fit his situation best.'):'It was the most direct pitch, and nothing in his profile pushed back on it.'};}
 return {why:why.join(' '),best:b};};

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

/* ---------------- pick card data ---------------- */
var CITIES={CAN:['Toronto, ON','Kitchener, ON','Sudbury, ON','Kingston, ON','London, ON','Ottawa, ON','Sault Ste. Marie, ON','Winnipeg, MB','Brandon, MB','Regina, SK','Saskatoon, SK','Calgary, AB','Edmonton, AB','Red Deer, AB','Kelowna, BC','Burnaby, BC','Kamloops, BC','Halifax, NS','Moncton, NB','St. John\'s, NL'],QUE:['Quebec City, QC','Montreal, QC','Sherbrooke, QC','Rimouski, QC','Gatineau, QC','Trois-Rivieres, QC'],
 USA:['Minneapolis, MN','Duluth, MN','Warroad, MN','Boston, MA','Hingham, MA','Buffalo, NY','Rochester, NY','Detroit, MI','Plymouth, MI','Grand Rapids, MI','Chicago, IL','Madison, WI','Fargo, ND','St. Louis, MO','Pittsburgh, PA','Denver, CO','Dallas, TX','Scottsdale, AZ','Anchorage, AK','San Jose, CA'],
 SWE:['Stockholm','Gothenburg','Malmo','Ornskoldsvik','Skelleftea','Lulea','Vaxjo','Jonkoping','Linkoping','Karlstad'],FIN:['Helsinki','Turku','Tampere','Oulu','Espoo','Lahti','Jyvaskyla','Rauma','Pori','Kuopio'],RUS:['Moscow','St. Petersburg','Yaroslavl','Kazan','Omsk','Chelyabinsk','Ufa','Magnitogorsk','Nizhny Novgorod','Novosibirsk'],
 CZE:['Prague','Brno','Pardubice','Plzen','Liberec','Trinec','Zlin','Kladno'],SVK:['Bratislava','Kosice','Nitra','Trencin','Zvolen','Banska Bystrica'],SUI:['Zurich','Bern','Lugano','Davos','Geneva','Zug'],GER:['Mannheim','Cologne','Munich','Berlin','Fussen','Landshut'],LAT:['Riga','Liepaja','Daugavpils'],NOR:['Oslo','Stavanger','Lillehammer'],DEN:['Herning','Aalborg','Copenhagen'],AUT:['Vienna','Salzburg','Klagenfurt','Innsbruck'],BLR:['Minsk','Grodno','Vitebsk'],KAZ:['Ust-Kamenogorsk','Astana','Karaganda']};
var NATION={SWE:'Sweden',FIN:'Finland',RUS:'Russia',CZE:'Czechia',SVK:'Slovakia',SUI:'Switzerland',GER:'Germany',LAT:'Latvia',NOR:'Norway',DEN:'Denmark',AUT:'Austria',BLR:'Belarus',KAZ:'Kazakhstan'};
function natCode(p){var n=String(p.nationality||'').toUpperCase();if(CITIES[n])return n;var m={CANADA:'CAN',USA:'USA','UNITED STATES':'USA',SWEDEN:'SWE',FINLAND:'FIN',RUSSIA:'RUS',CZECHIA:'CZE','CZECH REPUBLIC':'CZE',SLOVAKIA:'SVK',SWITZERLAND:'SUI',GERMANY:'GER',LATVIA:'LAT',NORWAY:'NOR',DENMARK:'DEN',AUSTRIA:'AUT',BELARUS:'BLR',KAZAKHSTAN:'KAZ'};return m[n]||'CAN';}
S.birthplace=function(p){if(p.birthplace)return p.birthplace;var n=natCode(p),r=rng('born|'+p.id+'|'+p.name),list=n==='CAN'&&/QMJHL/.test(p.league||'')&&r()<0.7?CITIES.QUE:CITIES[n];var c=list[Math.floor(r()*list.length)];return NATION[n]?c+', '+NATION[n]:c+(n==='USA'?', USA':', CAN');};
var POSN={C:'center',LW:'left winger',RW:'right winger',D:'defenseman',G:'goaltender'};
var STR={F:['soft hands in tight','an elite release','high-end vision','a relentless forecheck','a deceptive first step','a heavy, accurate shot','strong two-way instincts','a natural finisher\'s touch'],D:['a calm first pass','four-way mobility','a heavy point shot','a nasty edge in front of his net','excellent gap control','a quarterback\'s vision on the power play'],G:['quiet, efficient movement','elite rebound control','great size and reach','a battler\'s compete level','sharp post-to-post speed']};
var WEAK={F:['needs to add strength on the puck','has to improve his first three strides','his defensive reads are still a work in progress','his consistency comes and goes','has to shoot more'],D:['decision-making under pressure needs work','has to get stronger in the corners','tends to over-commit in the neutral zone','his footwork needs refining'],G:['tracking through traffic needs work','can be beaten glove side','has to cut down on rebounds','needs more reps against men']};
function grp(p){return p.pos==='D'?'D':p.pos==='G'?'G':'F';}
S.tier=function(p){var v=Number(p.potential)||Number(p.projection)||70,k=grp(p),L={F:['Franchise forward','First-line forward','Top-six forward','Middle-six forward','Bottom-six forward','Long-term project'],D:['No. 1 defenseman','Top-pair defenseman','Top-four defenseman','Second-pair defenseman','Third-pair defenseman','Long-term project'],G:['Franchise goaltender','Future starter','Future starter','1B goaltender','Backup goaltender','Long-term project']}[k],i=v>=90?0:v>=86?1:v>=82?2:v>=77?3:v>=72?4:5;return L[i];};
S.grade=function(v){v=Number(v)||70;return v>=90?'A+':v>=87?'A':v>=84?'A-':v>=81?'B+':v>=78?'B':v>=75?'B-':v>=72?'C+':'C';};
function ft(cm){if(!cm)return '';var i=Math.round(cm/2.54);return Math.floor(i/12)+'\''+(i%12)+'"';}
S.blurb=function(p){var r=rng('blurb|'+p.id),k=grp(p),h=Number(p.heightCm)||183,frame=h>=191?'big':h>=185?'pro-sized':h<=175?'undersized':'average-sized',shot=p.shoots?(p.shoots==='L'?'left-shot ':'right-shot '):'',pos=POSN[p.pos]||'forward',s=p.stats||{},team=p.amateurTeam||p.league||'his club';
 var lead=frame+' '+(k==='G'?'':shot)+pos,a=(/^[aeiou]/i.test(lead)?'An ':'A ')+lead+' with '+STR[k][Math.floor(r()*STR[k].length)]+'.';
 var b=k==='G'?(s.gp?' Posted a '+String(s.svp).replace(/^0/,'')+' save percentage in '+s.gp+' games with '+team+'.':''):(s.gp?' Put up '+s.pts+' points in '+s.gp+' games with '+team+'.':'');
 return a+b+' The knock: '+WEAK[k][Math.floor(r()*WEAK[k].length)]+'.';};
function teamOf(id){var x=X();var t=x&&x.team?x.team(id):null;return t||{id:id,name:id,color:'#FFB81C',secondary:'#111111'};}
function hexOk(c,f){return /^#[0-9a-f]{6}$/i.test(c||'')?c:f;}
function lum(h){var n=parseInt(h.slice(1),16);return 0.299*(n>>16)+0.587*((n>>8)&255)+0.114*(n&255);}
S.colors=function(id){var t=teamOf(id),a=hexOk(t.color,'#FFB81C'),b=hexOk(t.secondary,'#111111');var accent=lum(a)>40?a:b;return {primary:a,secondary:b,accent:lum(accent)>40?accent:'#FFB81C'};};

/* ---------------- broadcast engine ---------------- */
var queue=[],cur=null,root=null,stage=null,raf=0,last=0,paused=false,hold=null,stripTimer=0,tick=[];
S._queue=queue;
var DUR={
 full:[['clock',1.5],['podium',2.3],['card',2.8],['walk',3.0],['jersey',1.8],['handshake',1.8],['photo',1.5],['board',1.5]],
 user:[['clock',2.2],['podium',3.2],['card',4.2],['walk',4.2],['jersey',2.6],['handshake',2.6],['photo',2.2],['question',Infinity],['debrief',Infinity],['result',3.2],['board',2.4]],
 talk:[['question',Infinity],['debrief',Infinity],['result',3.2]],
 userclock:[['clock',2.6]],quick:[['quick',1.4]],ticker:[['strip',0.2]]};
var STAGE_SCENES={podium:1,walk:1,jersey:1,handshake:1,photo:1,question:1,debrief:1,result:1};
function game(){var x=X(),c=x&&x.cur&&x.cur();return c&&c.game;}
function nmT(id){return teamOf(id).name;}
function draftYear(g){var st=g&&g.offseason&&g.offseason.liveDraft;return st&&st.year||(A()&&A().draftYearOf?A().draftYearOf(g):2027);}
S.picked=function(g,row,p,how){try{if(!g||!g.offseason||!X())return;var year=draftYear(g),user=row.owner===g.team,base={overall:row.overall,round:row.round,slot:row.slot,owner:row.owner,origin:row.origin,p:p,year:year};
 if(user&&how==='manual'){var ctx=S.context(g,p,row.owner,row.overall,year),q=S.pickQuestion(g,p,ctx,true);if(q&&p.ctfoDraft)p.ctfoDraft.talk={v:1,qid:q.id,pending:true,year:year,owner:row.owner,overall:row.overall,user:true};base.kind=S.settings().mode==='off'?'talk':'user';enqueue(base);return;}
 if(user){S.cpuDecide(g,p,row,year);return;}
 if(S._silent)return;var m=S.settings().mode;if(m==='off')return;base.kind=S._ff?'ticker':row.round===1?'full':m==='full'?'quick':'ticker';enqueue(base);}catch(e){console.error('draft show',e);}};
function enqueue(it){queue.push(it);if(!cur)setTimeout(next,40);}
function next(){if(cur)return;var it=queue.shift(),strip=false;
 if(it&&it.kind==='quick'&&queue.filter(function(x){return x.kind==='quick';}).length>12){it.kind='ticker';queue.forEach(function(x){if(x.kind==='quick')x.kind='ticker';});}
 while(it&&it.kind==='ticker'){addTick(it);strip=it;it=queue.shift();}
 if(!it){if(strip)showStrip(strip);else close();return;}
 cur=it;if(it.kind==='user'||it.kind==='talk'||it.kind==='userclock')S._ff=false;it.phases=DUR[it.kind].map(function(a){return {n:a[0],d:a[1]};});it.pi=0;open();enter();}
function showStrip(it){cur={kind:'ticker',owner:it.owner,year:it.year,phases:[{n:'strip',d:0.2}],pi:0,p:it.p};open();root.dataset.scene='strip';root.querySelector('.cs-scene').innerHTML='';root.querySelector('.cs-lower').innerHTML='';renderTick();cur=null;close();}
function needsStage(it){return it.phases.some(function(ph){return STAGE_SCENES[ph.n];});}
function open(){if(stripTimer){clearTimeout(stripTimer);stripTimer=0;}if(!root){root=document.createElement('div');root.id='ctfo-show';root.className='cs-root';root.setAttribute('role','dialog');root.setAttribute('aria-label','NHL Draft broadcast');
  root.innerHTML='<div class="cs-stage"></div><div class="cs-wash"></div><div class="cs-scene"></div><div class="cs-flash"></div><div class="cs-lower"></div><div class="cs-top"><div class="cs-brand"><i></i><b class="cs-year"></b><span>LIVE</span></div><div class="cs-ctrl"><button type="button" class="cs-btn" data-cs="skip">Skip this pick</button><button type="button" class="cs-btn" data-cs="ff">Sim to my next pick</button><button type="button" class="cs-btn" data-cs="speed"></button><label class="cs-pres">Presentation <select data-cs-pres><option value="full">Full</option><option value="r1">Round 1 only</option><option value="off">Off</option></select></label></div></div><div class="cs-ticker"><b>THE PICKS</b><div class="cs-tick-list"></div></div>';
  document.body.appendChild(root);}
 var it=cur,c=S.colors(it.owner);root.hidden=false;root.classList.remove('cs-out');root.dataset.kind=it.kind;root.style.setProperty('--cs-team',c.primary);root.style.setProperty('--cs-team2',c.secondary);root.style.setProperty('--cs-accent',c.accent);
 root.querySelector('.cs-year').textContent=it.year+' NHL DRAFT';syncCtrl();
 if(stage&&stage.kind==='2d'&&S._ready3d()){stage.dispose();stage=null;}if(needsStage(it)){if(!stage)stage=makeStage(root.querySelector('.cs-stage'));if(stage)stage.setInfo(it,c);}
 if(!raf){last=0;raf=requestAnimationFrame(loop);}}
function syncCtrl(){if(!root)return;var s=S.settings(),it=cur||{},userish=it.kind==='user'||it.kind==='talk';root.querySelector('[data-cs="speed"]').textContent='Speed '+s.speed+'x';root.querySelector('[data-cs-pres]').value=s.mode;
 var sk=root.querySelector('[data-cs="skip"]');sk.textContent=it.kind==='userclock'?'Make your pick':'Skip this pick';var ph=it.phases&&it.phases[it.pi];sk.hidden=userish&&ph&&/question|debrief/.test(ph.n);root.querySelector('[data-cs="ff"]').hidden=userish||it.kind==='userclock';}
function close(){cur=null;if(!root)return;if(stage){try{stage.dispose();}catch(e){}stage=null;root.querySelector('.cs-stage').innerHTML='';}
 var stripOnly=root.dataset.kind==='ticker';if(raf){cancelAnimationFrame(raf);raf=0;}root.classList.add('cs-out');
 stripTimer=setTimeout(function(){stripTimer=0;if(!cur&&root){root.hidden=true;root.classList.remove('cs-out');}},stripOnly?2600:260);setTimeout(checkClock,stripOnly?60:300);}
function loop(ts){raf=requestAnimationFrame(loop);var dt=last?Math.min(0.1,(ts-last)/1000):0;last=ts;if(!cur||!cur.phases)return;var ph=cur.phases[cur.pi];if(!ph)return;
 if(stage&&stage.kind==='2d'&&S._ready3d()&&root){try{stage.dispose();stage=makeStage(root.querySelector('.cs-stage'));stage.setInfo(cur,S.colors(cur.owner));root.querySelector('.cs-stage').style.visibility=STAGE_SCENES[ph.n]?'visible':'hidden';}catch(e){console.error('draft stage swap',e);}}/* v9.1: models finished loading mid-item */
 if(!paused)cur.t+=dt*S.settings().speed;var f=ph.d===Infinity?0:Math.min(1,cur.t/ph.d);if(hold&&hold.n===ph.n&&f>=hold.f&&!paused){paused=true;f=hold.f;cur.t=f*ph.d;S._held=ph.n;}
 try{update(ph,f,cur.t);if(stage&&STAGE_SCENES[ph.n])stage.render(ph.n,f,cur.t,dt,cur);}catch(e){console.error('draft show frame',e);finishItem();return;}
 if(f>=1&&!paused)advance();}
function advance(){cur.pi++;if(cur.pi>=cur.phases.length){finishItem();return;}enter();}
function finishItem(){cur=null;paused=false;if(queue.length)next();else{S._ff=false;close();}}
S._finish=finishItem;
function jump(name){var i=cur.phases.findIndex(function(p){return p.n===name;});if(i>=0){cur.pi=i;enter();return true;}return false;}
function enter(){var it=cur,ph=it.phases[it.pi];it.t=0;root.dataset.scene=ph.n;syncCtrl();var sc=root.querySelector('.cs-scene'),lo=root.querySelector('.cs-lower'),p=it.p,x=X(),tm=nmT(it.owner),user=it.kind==='user'||it.kind==='talk'||it.kind==='userclock';
 root.querySelector('.cs-stage').style.visibility=STAGE_SCENES[ph.n]&&stage?'visible':'hidden';lo.innerHTML='';sc.innerHTML='';lo.className='cs-lower';
 var gmLabel=user?'YOU · GENERAL MANAGER':'GENERAL MANAGER · '+tm.toUpperCase();
 if(ph.n==='clock'){var from=it.owner!==it.origin?'<small class="cs-from">Pick acquired from the '+esc(nmT(it.origin))+'</small>':'';sc.innerHTML='<div class="cs-clock"><div class="cs-crest">'+x.officeMark(it.owner,'cs-crest-mark')+'</div><p class="cs-kick">'+(it.kind==='userclock'?'YOU ARE ON THE CLOCK':'ON THE CLOCK')+'</p><h1>'+esc(tm)+'</h1><div class="cs-clock-meta"><span>ROUND '+it.round+'</span><b>PICK '+it.slot+'</b><span>'+ordinal(it.overall).toUpperCase()+' OVERALL</span></div>'+from+'<div class="cs-bar"><i></i></div><div class="cs-timer">2:30</div>'+(it.kind==='userclock'?'<button type="button" class="cs-btn cs-gold" data-cs="pick">Make your pick →</button>':'')+'</div>';}
 else if(ph.n==='podium'){lo.innerHTML=l3(gmLabel,tm);sc.innerHTML='<div class="cs-speech"><p class="cs-typed"></p><span class="cs-dots"><i></i><i></i><i></i></span></div>';it.line='With the '+ordinal(it.overall)+' pick in the '+it.year+' NHL Draft, the '+tm+' are proud to select\u2026';}
 else if(ph.n==='card'||ph.n==='quick'){sc.innerHTML=card(it,ph.n==='quick');if(ph.n==='card'||ph.n==='quick')addTick(it);}
 else if(ph.n==='walk'){lo.innerHTML=l3(esc(p.name).toUpperCase()+' · '+esc(p.pos),'Making his way to the stage');}
 else if(ph.n==='jersey'){lo.innerHTML=l3(esc(p.name).toUpperCase(),'Pulling on the '+esc(tm)+' sweater');}
 else if(ph.n==='handshake'){lo.innerHTML='<div class="cs-l3 cs-duo"><span class="cs-l3-k">Welcome to the '+esc(tm)+'</span><div class="cs-duo-row"><div class="cs-duo-p"><small>'+esc(ordinal(it.overall))+' overall · '+esc(p.pos)+'</small><b class="cs-duo-name">'+esc(p.name)+'</b></div><div class="cs-duo-g"><small>'+(user?'You · general manager':'General manager')+'</small><b class="cs-duo-gm">'+esc(tm)+' GM</b></div></div></div>';}
 else if(ph.n==='photo'){lo.innerHTML=l3(ordinal(it.overall).toUpperCase()+' OVERALL · '+esc(tm).toUpperCase(),esc(p.name)+' · '+esc(p.pos)+' · '+esc(p.amateurTeam||p.league||''));}
 else if(ph.n==='question'){sc.innerHTML=questionHtml(it);}
 else if(ph.n==='debrief'){sc.innerHTML=debriefHtml(it);}
 else if(ph.n==='result'){var t=p.ctfoDraft&&p.ctfoDraft.talk||{},o=OUT[t.outcome]||OUT.return;lo.className='cs-lower cs-result cs-'+o[1];lo.innerHTML=l3('DRAFT STAGE · '+esc(p.name).toUpperCase(),'<span class="cs-res-t">'+esc(S.outcomeTitle(t,p))+'</span>','<small>'+esc(S.outcomeDetail(t,p,game()))+'</small>');if(t.outcome==='now')sc.innerHTML='<div class="cs-stamp">SIGNED · ENTRY-LEVEL CONTRACT</div>';}
 else if(ph.n==='board'){sc.innerHTML=boardHtml(it);}
 else if(ph.n==='strip'){}}
function l3(k,b,extra){return '<div class="cs-l3"><span class="cs-l3-k">'+k+'</span><b>'+b+'</b>'+(extra||'')+'</div>';}
function update(ph,f,t){var it=cur;if(ph.n==='clock'){var bar=root.querySelector('.cs-bar i'),tm=root.querySelector('.cs-timer');if(bar)bar.style.width=((1-f)*100).toFixed(1)+'%';if(tm){var s=Math.max(0,Math.round(150*(1-f)));tm.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}}
 else if(ph.n==='podium'){var el=root.querySelector('.cs-typed');if(el){var n=Math.round(it.line.length*Math.min(1,f/0.62));if(el.textContent.length!==n)el.textContent=it.line.slice(0,n);}root.querySelector('.cs-dots').style.opacity=f>0.64?1:0;}
 else if(ph.n==='photo'){var fl=root.querySelector('.cs-flash'),r=rng('flash|'+Math.floor(t*9)+'|'+it.overall)();fl.style.opacity=r>0.62&&f<0.72?((r-0.62)*1.1).toFixed(2):'0';}
 if(ph.n!=='photo'){var fl2=root.querySelector('.cs-flash');if(fl2&&fl2.style.opacity!=='0')fl2.style.opacity='0';}}
function addTick(it){var p=it.p;if(tick.some(function(x){return x.year===it.year&&x.overall===it.overall;}))return;tick.push({year:it.year,overall:it.overall,owner:it.owner,name:p.name,pos:p.pos,league:p.league||''});if(tick.length>14)tick.shift();renderTick();}
function renderTick(){if(!root)return;root.querySelector('.cs-tick-list').innerHTML=tick.slice().reverse().map(function(x,i){return '<span class="'+(i===0?'cs-new':'')+'"><em>#'+x.overall+'</em><b>'+esc(x.owner)+'</b>'+esc(x.name)+' · '+esc(x.pos)+'</span>';}).join('');}
function card(it,mini){var p=it.p,x=X(),g=game(),tm=nmT(it.owner),lt=ltype(p),t=S.traits(seedOf(g),p,lt,Number(p.age)||18),chr=S.character(t),s=p.stats||{},stat=p.pos==='G'?(s.gp?s.gp+' GP · '+s.svp+' SV% · '+s.gaa+' GAA':''):(s.gp?s.gp+' GP · '+s.g+' G · '+s.a+' A · '+s.pts+' PTS':''),talk=p.ctfoDraft&&p.ctfoDraft.talk,user=it.kind==='user'||it.kind==='talk';
 var chip=!user&&talk&&!talk.pending?'<span class="cs-chip cs-'+(OUT[talk.outcome]||OUT.return)[1]+'">'+esc(S.outcomeTitle(talk,p))+'</span>':'';
 if(mini)return '<div class="cs-mini"><div class="cs-mini-crest">'+x.officeMark(it.owner,'cs-crest-mark')+'</div><div><p class="cs-kick">#'+it.overall+' · ROUND '+it.round+' · '+esc(tm.toUpperCase())+'</p><h3>'+esc(p.name)+'</h3><small>'+esc(p.pos)+' · '+esc(p.amateurTeam||'')+' ('+esc(p.league||'')+') · '+esc(S.tier(p))+'</small></div>'+chip+'</div>';
 var sr=p.scoutReport,ovr=sr&&sr.currentLow!=null?sr.currentLow+'–'+sr.currentHigh:sr?'?':String(p.ovr||'—'),pot=sr&&sr.low!=null?sr.low+'–'+sr.high:S.grade(p.potential);/* v9.1: scoutReport low/high is the POT range, currentLow/currentHigh the OVR range */
 return '<div class="cs-card"><aside class="cs-card-l"><div class="cs-crest">'+x.officeMark(it.owner,'cs-crest-mark')+'</div><b>#'+it.overall+'</b><small>ROUND '+it.round+' · PICK '+it.slot+'</small><small>'+esc(tm.toUpperCase())+'</small></aside><div class="cs-card-m"><p class="cs-kick">THE PICK</p><h1>'+esc(p.name)+'</h1><p class="cs-pos">'+esc(POSN[p.pos]||p.pos).toUpperCase()+' · '+esc(p.amateurTeam||'')+' · '+esc(p.league||'')+'</p>'+
  '<dl class="cs-facts"><div><dt>Height / Weight</dt><dd>'+ft(p.heightCm)+' · '+(p.weightKg?Math.round(p.weightKg*2.2046)+' lb':'—')+'</dd></div><div><dt>'+(p.pos==='G'?'Catches':'Shoots')+'</dt><dd>'+esc(p.shoots||'—')+'</dd></div><div><dt>Born</dt><dd>'+esc(p.ctfoDob||'—')+' · '+esc(S.birthplace(p))+'</dd></div><div><dt>Last season</dt><dd>'+esc(stat||'—')+'</dd></div></dl><p class="cs-blurb">'+esc(S.blurb(p))+'</p><p class="cs-char">Character: <b>'+esc(chr.join(', '))+'</b></p>'+chip+'</div>'+
  '<aside class="cs-card-r"><div><span>'+(sr?'SCOUT OVR':'OVR')+'</span><b>'+esc(ovr)+'</b></div><div><span>'+(sr&&sr.low!=null?'SCOUT POT':'POTENTIAL')+'</span><b>'+esc(pot)+'</b></div><div class="cs-tier"><span>PROJECTION</span><b>'+esc(S.tier(p))+'</b></div><div><span>AGE</span><b>'+esc(p.age||'—')+'</b></div></aside></div>';}
function order(it,p){var q=S.qById(p.ctfoDraft.talk.qid),r=rng('ans|'+q.id+'|'+p.id),a=[0,1,2,3];for(var i=3;i>0;i--){var j=Math.floor(r()*(i+1)),k=a[i];a[i]=a[j];a[j]=k;}return a;}
function questionHtml(it){var p=it.p,t=p.ctfoDraft&&p.ctfoDraft.talk,q=t&&S.qById(t.qid),g=game();if(!q)return '<div class="cs-panel"><p>No question available.</p><button type="button" class="cs-btn cs-gold" data-cs="skipq">Continue</button></div>';var trs=S.traits(seedOf(g),p,ltype(p),Number(p.age)||18);
 var ask=q.by==='player'?'<div class="cs-ask"><span class="cs-who">'+esc(p.name)+' asks you</span><blockquote>“'+esc(q.q)+'”</blockquote></div><p class="cs-sub">Your answer</p>':'<div class="cs-ask cs-you"><span class="cs-who">You ask '+esc(p.name.split(' ')[0])+'</span><blockquote>“'+esc(q.q)+'”</blockquote></div><div class="cs-ask cs-reply"><span class="cs-who">'+esc(p.name)+'</span><blockquote>“'+esc(q.reply)+'”</blockquote></div><p class="cs-sub">Your response</p>';
 return '<div class="cs-panel cs-q"><p class="cs-kick">ON STAGE · THE CONVERSATION · '+esc(q.cat.toUpperCase())+'</p>'+ask+'<div class="cs-answers">'+order(it,p).map(function(i,n){return '<button type="button" class="cs-answer" data-cs-answer="'+i+'"><em>'+'ABCD'[n]+'</em><span>'+esc(q.answers[i].text)+'</span></button>';}).join('')+'</div><p class="cs-note">What you say here moves his willingness to sign an entry-level contract now. Character: <b>'+esc(S.character(trs).join(', '))+'</b>.</p></div>';}
S.answer=function(i){if(!cur||cur.phases[cur.pi].n!=='question')return;var g=game(),p=cur.p,t=p.ctfoDraft&&p.ctfoDraft.talk,q=t&&S.qById(t.qid);if(!g||!q)return;cur.res=S.resolve(g,p,t.owner,t.year,t.overall,q,Number(i),true);cur.q=q;var skipped=skipCall(g,p);try{X().persist();}catch(e){console.error(e);}if(skipped){try{X().renderOffice();}catch(e){console.error(e);}}advance();};
/* v9.1: the base game's phone call is skipped when the stage conversation already happened for that pick (no double moment) */
function skipCall(g,p){var off=g&&g.offseason,c=off&&off.playerCall,D=DR();if(!c||!p||c.playerId!==p.id)return false;off.playerCall=null;if(D){D._round=null;if(off.phase==='draft'&&D.advanceDraftOnePick){try{D.advanceDraftOnePick(g);}catch(e){console.error(e);}}}S._callsSkipped=(S._callsSkipped||0)+1;return true;}
S._skipCall=skipCall;
function debriefHtml(it){var res=it.res,p=it.p,q=it.q;if(!res)return '';var ev=res.ev,t=res.traits,ex=S.explain(ev,res.evs,t,q),talk=res.talk,v=talk.verdict,o=OUT[talk.outcome]||OUT.return;
 var prof=TRAITS.map(function(tr){var val=t[tr[0]];return '<div class="cs-trait"><b>'+tr[1]+'</b><span class="cs-tbar"><i style="width:'+val+'%"></i></span><em>'+val+'</em><small>'+esc(S.traitLine(tr[0],val))+'</small></div>';}).join('');
 var best=ex.best?'<p><b>“'+esc(ex.best.text)+'”</b></p><p>'+esc(ex.best.why)+' It would have put his signing chance at '+pct(ex.best.pAfter)+'.</p>':'<p>You picked the best available answer for his personality.</p>';
 return '<div class="cs-panel cs-debrief"><header><div><p class="cs-kick">DEBRIEF · '+esc(p.name.toUpperCase())+'</p><h2>How that landed</h2></div><span class="cs-verdict cs-v-'+v.toLowerCase()+'">'+v.toUpperCase()+' ANSWER</span></header><div class="cs-db-grid"><section class="cs-profile"><h4>Personality profile</h4>'+prof+'</section><section class="cs-why"><h4>Your answer</h4><p class="cs-chosen">“'+esc(q.answers[talk.choice].text)+'”</p><h4>Why</h4><p>'+esc(ex.why)+'</p><h4>Best answer</h4>'+best+
  '<div class="cs-meter"><span>Signing chance</span><b>'+pct(talk.pBefore)+' → '+pct(talk.pAfter)+'</b><div class="cs-meter-bar"><i class="cs-m-after" style="width:'+pct(talk.pAfter)+'"></i><i class="cs-m-before" style="left:'+pct(talk.pBefore)+'"></i></div></div><div class="cs-outcome cs-'+o[1]+'"><b>'+esc(S.outcomeTitle(talk,p))+'</b><small>'+esc(S.outcomeDetail(talk,p,game()))+'</small></div></section></div><div class="cs-db-actions"><button type="button" class="cs-btn cs-gold" data-cs="continue">Continue →</button></div></div>';}
function boardHtml(it){var g=game(),x=X(),log=(g&&g.offseason&&g.offseason.draftLog||[]).filter(function(r){return r.overall<=it.overall;}).slice(-6).reverse(),st=g&&g.offseason&&g.offseason.liveDraft,nx=st&&st.order&&st.order[it.overall];
 return '<div class="cs-panel cs-board"><p class="cs-kick">DRAFT BOARD · ROUND '+it.round+'</p><div class="cs-board-list">'+log.map(function(r,i){return '<div class="'+(i===0?'cs-new':'')+'"><em>#'+r.overall+'</em><span class="cs-b-crest">'+x.officeMark(r.team,'cs-crest-mark')+'</span><b>'+esc(r.playerName)+'</b><small>'+esc(r.pos)+' · '+esc(r.teamName)+'</small></div>';}).join('')+'</div><div class="cs-next">'+(nx?'<span>UP NEXT</span><span class="cs-b-crest">'+x.officeMark(nx.owner,'cs-crest-mark')+'</span><b>'+esc(nmT(nx.owner))+'</b><small>#'+nx.overall+' · ROUND '+nx.round+'</small>':'<span>DRAFT COMPLETE</span><b>All seven rounds are in the books</b>')+'</div></div>';}

/* ---------------- stage: poses shared by the 3D and 2D renderers ---------------- */
function lerp(a,b,f){return a+(b-a)*f;}
function ease(f){f=cl(f,0,1);return f<0.5?2*f*f:1-Math.pow(-2*f+2,2)/2;}
function seg(f,a,b){return cl((f-a)/(b-a),0,1);}
function lv(a,b,f){return [lerp(a[0],b[0],f),lerp(a[1],b[1],f),lerp(a[2],b[2],f)];}
var POD=[2.6,0,-1.05],PL_END=[-0.3,0,0.5],GM_END=[0.3,0,0.5],SIDE=[1.85,0,-1.05],STRIDE=1.25,HS=0.88;
function plPath(f){var a=seg(f,0,0.35),b=seg(f,0.35,0.5),c=seg(f,0.5,1);if(f<0.35)return lv([-3.9,-0.8,4.9],[-2.7,-0.8,3.0],a);if(f<0.5)return lv([-2.7,-0.8,3.0],[-2.5,0,2.2],b);return lv([-2.5,0,2.2],PL_END,ease(c)*0.15+c*0.85);}
function gmPath(f){var gf=seg(f,0.4,1);return gf<0.3?lv(POD,SIDE,gf/0.3):lv(SIDE,GM_END,(gf-0.3)/0.7);}
function pathDist(fn,f){var d=0,p=fn(0),n=Math.max(2,Math.ceil(f*48));for(var i=1;i<=n;i++){var q=fn(f*i/n);d+=Math.hypot(q[0]-p[0],q[2]-p[2],(q[1]-p[1])*0.6);p=q;}return d;}
function heading(fn,f,def){var a=fn(Math.max(0,f-0.02)),b=fn(Math.min(1,f+0.02));var dx=b[0]-a[0],dz=b[2]-a[2];return dx*dx+dz*dz>1e-6?Math.atan2(dx,dz):def;}
function pose(n,f,t){var P={p:PL_END.slice(),ry:HS,walk:0,jersey:1,shake:0,vis:1,arm:0,act:'idle',look:'G'},G={p:GM_END.slice(),ry:-HS,walk:0,shake:0,vis:1,arm:0,act:'idle',look:'P'},cam={p:[0.1,1.5,3.0],l:[0,1.25,0.5]},J=null;
 if(n==='podium'){P.vis=0;G.p=POD.slice();G.ry=-0.3;G.act='podium';G.look='cam';G.k=f;cam={p:lv([1.0,1.75,2.4],[1.55,1.68,1.55],ease(f)),l:[2.55,1.35,-1.0]};}
 else if(n==='walk'){var pp=plPath(f);P.p=pp;P.walk=f<0.985?1:0;P.wph=pathDist(plPath,f)/STRIDE*Math.PI*2;P.ry=f<0.985?heading(plPath,f,0.4):lerp(heading(plPath,0.97,0.4),0.4,seg(f,0.985,1));P.jersey=0;P.look='fwd';
  var gf=seg(f,0.4,1);G.p=gmPath(f);G.walk=gf>0&&gf<0.985?1:0;G.wph=pathDist(gmPath,f)/STRIDE*Math.PI*2+1.3;G.ry=gf<=0?-0.3:gf<0.985?heading(gmPath,f,-Math.PI/2):-0.9;G.look=gf<=0?'cam':'fwd';
  cam={p:lv([0.2,2.1,7.2],[0.35,1.75,4.6],ease(f)),l:lv([-1.7,0.6,2.6],[-0.1,1.05,0.6],ease(f))};}
 else if(n==='jersey'){P.ry=lerp(0.4,0.15,ease(seg(f,0,0.3)));G.ry=-0.75;P.jersey=f<0.62?0:1;P.act='pull';P.k=f;G.act='hold';G.k=f;P.look=f<0.45?'G':'cam';G.look='P';
  cam={p:[0.1,1.5,3.55],l:[0,1.22,0.45]};}
 else if(n==='handshake'){var tf=ease(seg(f,0,0.22));P.ry=lerp(0.15,HS,tf);G.ry=lerp(-0.75,-HS,tf);P.p=[-0.3,0,0.5];G.p=[0.3,0,0.5];P.shake=G.shake=ease(seg(f,0.12,0.4));P.wob=G.wob=f>0.4?Math.sin(t*14)*0.03:0;P.act=G.act='shake';P.look='G';G.look='P';if(f>0.62){P.look='cam';G.look='cam';}
  cam={p:lv([-0.1,1.6,3.3],[0.0,1.55,2.95],ease(f)),l:[0,1.22,0.5]};}
 else if(n==='photo'){P.p=[-0.27,0,0.52];G.p=[0.27,0,0.52];P.ry=0.22;G.ry=-0.22;P.act=G.act='photo';P.k=G.k=ease(seg(f,0,0.25));P.look=G.look='cam';cam={p:[0,1.42,3.45],l:[0,1.12,0.5]};}
 else {P.p=[-0.36,0,0.48];G.p=[0.36,0,0.52];P.ry=1.05;G.ry=-1.05;cam={p:[1.1,1.55,2.9],l:[0,1.28,0.5]};if(n==='result'){P.p=[-0.27,0,0.52];G.p=[0.27,0,0.52];P.ry=0.22;G.ry=-0.22;P.act=G.act='photo';P.k=G.k=1;P.look=G.look='cam';cam={p:[0,1.42,3.45],l:[0,1.12,0.5]};}}
 return {P:P,G:G,cam:cam};}
function makeStage(host){if(S._ready3d()){try{return stage3d(host);}catch(e){S._noGL=true;S._glError=String(e&&e.message||e);console.warn('draft stage 3d',e);host.innerHTML='';}}if(!S._noGL)loadThree();return stage2d(host);}

/* ---------------- loading: three r128 + GLTFLoader + the live game's ctfo-v2 player model ---------------- */
var MOD={st:'idle'};
function loadScript(src,glob,cb){if(glob&&W[glob]){cb(true);return;}var s=document.createElement('script');s.src=src;s.onload=function(){cb(!glob||!!W[glob]);};s.onerror=function(){cb(false);};document.head.appendChild(s);}
function loadThree(){if(S._noGL||MOD.st!=='idle')return;if(!webglOk()){S._noGL=true;return;}MOD.st='loading';var fail=function(why){MOD.st='failed';S._glError=why;};
 loadScript('vendor/three.min.js','THREE',function(ok){if(!ok)return fail('three');var T=W.THREE;
  (T.GLTFLoader?function(cb){cb();}:function(cb){loadScript('vendor/GLTFLoader.js',null,cb);})(function(){if(!T.GLTFLoader)return fail('gltf');
   loadScript('skater-glb.js?v=ctfo2','SKATER_GLB',function(ok2){if(!ok2)return fail('skater glb');
    loadScript('skater-models.js?v=ctfo2','buildHockeyPlayer',function(ok3){if(!ok3)return fail('models');
     try{var r=W.buildHockeyPlayer(T,null,0,false),n=0;unreg(r);var iv=setInterval(function(){if(r.userData.filled){clearInterval(iv);MOD.st='ready';}else if(++n>400){clearInterval(iv);fail('parse timeout');}},50);}catch(e){fail(String(e));}});});});});}
function unreg(r){var reg=W.CTFO_PLAYERS;if(reg&&reg.all){var i=reg.all.indexOf(r);if(i>=0)reg.all.splice(i,1);}}
S.preload=loadThree;S._models=MOD;
S._ready3d=function(){return !S._noGL&&MOD.st==='ready'&&!!W.THREE&&typeof W.buildHockeyPlayer==='function';};
function webglOk(){try{var c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}}

/* shared caches (survive stage disposal; one parse of the GLB for the whole session) */
var FC={meas:null,hair:null,mask:null,maskWait:[],mats:{}};
function comp(a,i,c){var arr,idx;if(a.isInterleavedBufferAttribute){arr=a.data.array;idx=i*a.data.stride+a.offset+c;}else{arr=a.array;idx=i*a.itemSize+c;}var v=arr[idx];if(a.normalized){if(arr instanceof Uint16Array)v/=65535;else if(arr instanceof Uint8Array)v/=255;else if(arr instanceof Int16Array)v=Math.max(-1,v/32767);else if(arr instanceof Int8Array)v=Math.max(-1,v/127);}return v;}
function hexRgb(h){var n=parseInt(String(h).replace('#',''),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function loadMask(){if(FC.mask||FC.maskLoading)return;var info=W.SKATER_TINT;if(!info||!info.mask)return;FC.maskLoading=true;var img=new Image();img.onload=function(){FC.mask=img;var w=FC.maskWait;FC.maskWait=[];w.forEach(function(f){f();});};img.src=info.mask;}
/* helmet region (texels of triangles skinned to the head bone): recoloured to hair so the GM and the pick read as people in street clothes */
function hairMask(mesh,w,h){if(FC.hair&&FC.hair.width===w)return FC.hair;var g=mesh.geometry,uv=g.attributes.uv,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=g.index,hb=mesh.skeleton.bones.findIndex(function(b){return b.name==='head';});
 var cv=document.createElement('canvas');cv.width=w;cv.height=h;var c=cv.getContext('2d');c.fillStyle='#fff';c.strokeStyle='#fff';c.lineWidth=3;c.lineJoin='round';if(!uv||!si||!sw||hb<0){FC.hair=cv;return cv;}
 function hw(v){var s=0;for(var k=0;k<4;k++)if(Math.round(comp(si,v,k))===hb)s+=comp(sw,v,k);return s;}
 var n=ix?ix.count:uv.count,hwc={};function H(v){return hwc[v]!=null?hwc[v]:(hwc[v]=hw(v));}
 for(var i=0;i+2<n;i+=3){var a=ix?ix.getX(i):i,b=ix?ix.getX(i+1):i+1,d=ix?ix.getX(i+2):i+2;if(H(a)<0.5||H(b)<0.5||H(d)<0.5)continue;c.beginPath();c.moveTo(comp(uv,a,0)*w,comp(uv,a,1)*h);c.lineTo(comp(uv,b,0)*w,comp(uv,b,1)*h);c.lineTo(comp(uv,d,0)*w,comp(uv,d,1)*h);c.closePath();c.fill();c.stroke();}
 FC.hair=cv;return cv;}
/* body material: jersey/socks (R), stripes (G) tinted, helmet texels -> hair. Same shading model as skater-models.js */
function bodyMat(T,mesh,base,key,prim,sec,hair){var suit=/^suit/.test(key);if(FC.mats[key])return FC.mats[key];var map=base&&base.map,info=W.SKATER_TINT;if(!map||!map.image||!FC.mask||!info)return null;
 var w=map.image.width,h=map.image.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d');g.drawImage(map.image,0,0,w,h);var px=g.getImageData(0,0,w,h),d=px.data;
 var mc=document.createElement('canvas');mc.width=w;mc.height=h;var mg=mc.getContext('2d');mg.drawImage(FC.mask,0,0,w,h);var m=mg.getImageData(0,0,w,h).data,hm=hairMask(mesh,w,h).getContext('2d').getImageData(0,0,w,h).data;
 var ref=info.ref||[0.3,0.3,0.3],cols=[prim,sec],hr=hair;
 for(var i=0;i<d.length;i+=4){var m0=m[i]/255,m1=m[i+1]/255,mt=m0+m1;if(mt<0.004){if(hm[i]>100)continue;var R=d[i],Gc=d[i+1],Bc=d[i+2],mx=Math.max(R,Gc,Bc),mn=Math.min(R,Gc,Bc),sat=mx?(mx-mn)/mx:0,LL=(0.299*R+0.587*Gc+0.114*Bc)/255,tc=null,sc=0;
   if(suit&&sat<0.22&&LL>0.5){tc=prim;sc=Math.min(1.5,LL/0.7);}else if(sat>0.55&&R>Gc&&Gc>=Bc&&R-Bc>80&&LL>0.25){tc=suit?prim:sec;sc=Math.min(1.5,LL/0.45);}
   if(tc){d[i]=Math.min(255,tc[0]*sc);d[i+1]=Math.min(255,tc[1]*sc);d[i+2]=Math.min(255,tc[2]*sc);}continue;}if(mt>1){m0/=mt;m1/=mt;mt=1;}
  var L=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255,hz=hm[i]/255*m0,o0=d[i]*(1-mt),o1=d[i+1]*(1-mt),o2=d[i+2]*(1-mt);
  for(var k=0;k<2;k++){var mk=k?m1:m0;if(k===0&&hz>0){var s0=Math.min(1.5,L/ref[0]);o0+=hz*Math.min(255,hr[0]*s0);o1+=hz*Math.min(255,hr[1]*s0);o2+=hz*Math.min(255,hr[2]*s0);mk-=hz;}if(mk<=0)continue;var c=cols[k],s=Math.min(1.7,L/ref[k]);o0+=mk*Math.min(255,c[0]*s);o1+=mk*Math.min(255,c[1]*s);o2+=mk*Math.min(255,c[2]*s);}
  d[i]=o0;d[i+1]=o1;d[i+2]=o2;}
 g.putImageData(px,0,0);var tex=new T.CanvasTexture(cv);tex.flipY=map.flipY;tex.encoding=map.encoding;tex.wrapS=map.wrapS;tex.wrapT=map.wrapT;tex.minFilter=map.minFilter;tex.magFilter=map.magFilter;
 var mat=base.clone();mat.map=tex;mat.needsUpdate=true;FC.mats[key]=mat;
 if(!suit){FC.order=(FC.order||[]).filter(function(k){return k!==key;});FC.order.push(key);while(FC.order.length>4){var old=FC.order.shift(),om=FC.mats[old];delete FC.mats[old];try{om.map.dispose();om.dispose();}catch(e){}}}/* keep a few team textures only */
 return mat;}
/* bind-pose surface points (model space) for the shirt/tie and number decals */
function measure(F){if(FC.meas)return FC.meas;var T=W.THREE,mesh=F.body,g=mesh.geometry,pos=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,bones=mesh.skeleton.bones,inv=mesh.skeleton.boneInverses;
 var idx={};bones.forEach(function(b,i){idx[b.name]=i;idx[b.name.replace(/(L|R)$/,'.$1')]=i;});var M=bones.map(function(b,i){return new T.Matrix4().multiplyMatrices(b.matrixWorld,inv[i]);});
 var v=new T.Vector3(),o=new T.Vector3(),tmp=new T.Vector3(),res={zf:0.14,zb:-0.17,yc:1.32,arm:{L:null,R:null}},bf=-9,bb=9,ax={L:[],R:[]};
 for(var i=0;i<pos.count;i++){v.set(comp(pos,i,0),comp(pos,i,1),comp(pos,i,2)).applyMatrix4(mesh.bindMatrix);o.set(0,0,0);var main=-1,mw=0;
  for(var k=0;k<4;k++){var w=comp(sw,i,k);if(!w)continue;var bi=Math.round(comp(si,i,k));o.addScaledVector(tmp.copy(v).applyMatrix4(M[bi]),w);if(w>mw){mw=w;main=bi;}}
  o.applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);F.model.worldToLocal(o);
  if(main===idx.chest&&mw>0.5&&Math.abs(o.x)<0.06&&o.y>1.24&&o.y<1.42){if(o.z>bf)bf=o.z;if(o.z<bb)bb=o.z;}
  if(main===idx['upper_arm.L']&&mw>0.6)ax.L.push(o.clone());if(main===idx['upper_arm.R']&&mw>0.6)ax.R.push(o.clone());}
 if(bf>-9)res.zf=bf;if(bb<9)res.zb=bb;
 ['L','R'].forEach(function(s){var a=ax[s];if(!a.length)return;var ys=a.map(function(p){return p.y;}).sort(function(x,y){return x-y;}),ym=ys[Math.floor(ys.length*0.55)],best=null;a.forEach(function(p){if(Math.abs(p.y-ym)<0.04&&(!best||(s==='L'?p.x>best.x:p.x<best.x)))best=p;});res.arm[s]=best;});
 FC.meas=res;return res;}

/* ---------------- 3D stage (ctfo-v2 rigged players with procedural bone animation; disposed after the pick) ---------------- */
function stage3d(host){var T=W.THREE;if(!webglOk())throw new Error('WebGL unavailable');
 var canvas=document.createElement('canvas');canvas.className='cs-canvas';host.innerHTML='';host.appendChild(canvas);
 var renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(1.25,W.devicePixelRatio||1));
 var scene=new T.Scene(),camera=new T.PerspectiveCamera(40,16/9,0.1,60),disp=[],figs=[];scene.background=new T.Color('#06080a');scene.fog=new T.Fog('#06080a',9,22);
 function M(c,o){var m=new T.MeshStandardMaterial(Object.assign({color:c,roughness:0.75,metalness:0.05},o||{}));disp.push(m);return m;}
 function G_(g){disp.push(g);return g;}
 function box(w,h,d,m){return new T.Mesh(G_(new T.BoxGeometry(w,h,d)),m);}
 function tex(draw,w,h){var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);var t=new T.CanvasTexture(c);disp.push(t);return t;}
 scene.add(new T.HemisphereLight(0xb4bec8,0x101317,0.75));var key=new T.SpotLight(0xfff1d6,1.7,24,0.55,0.6,1);key.position.set(0.6,6.5,5.2);key.target.position.set(0,1.1,0.4);scene.add(key);scene.add(key.target);
 var fill=new T.DirectionalLight(0xcfe0ff,0.35);fill.position.set(-4,3,5);scene.add(fill);
 var rim=new T.PointLight(0xffffff,1.0,12);rim.position.set(0,3,-1.6);scene.add(rim);var flash=new T.PointLight(0xffffff,0,14);flash.position.set(0,2,4);scene.add(flash);
 var floor=new T.Mesh(G_(new T.PlaneGeometry(30,20)),M('#0b0e12',{roughness:0.45,metalness:0.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.8;scene.add(floor);
 var deck=box(8.4,0.8,4.6,M('#14181d',{roughness:0.5,metalness:0.25}));deck.position.set(0,-0.4,0.1);scene.add(deck);var edge=box(8.42,0.05,0.05,M('#FFB81C',{emissive:'#FFB81C',emissiveIntensity:0.6}));edge.position.set(0,0.0,2.41);scene.add(edge);
 for(var si=0;si<4;si++){var st=box(0.9,0.2,0.32,M('#1a1f25'));st.position.set(-2.6,-0.7+si*0.2,2.9-si*0.18);scene.add(st);}
 var wallMat=M('#ffffff',{roughness:0.9}),wall=new T.Mesh(G_(new T.PlaneGeometry(9.6,4.2)),wallMat);wall.position.set(0,1.6,-2.3);scene.add(wall);
 var podMat=M('#ffffff'),pod=box(0.85,1.12,0.55,[M('#101317'),M('#101317'),M('#101317'),M('#101317'),podMat,M('#101317')]);pod.position.set(POD[0]+0.05,0.56,POD[2]+0.62);scene.add(pod);
 var cm=M('#2a3038'),hm=M('#c9a585'),cg=G_(new T.BoxGeometry(0.42,0.55,0.3)),hg=G_(new T.SphereGeometry(0.12,8,6));var cr=rng('crowd');
 var cbody=new T.InstancedMesh(cg,cm,96),chead=new T.InstancedMesh(hg,hm,96),dummy=new T.Object3D(),col=new T.Color();var k=0;
 for(var row=0;row<6;row++)for(var i=0;i<16&&k<96;i++,k++){var x=-4.6+i*0.6+(row%2)*0.3+(cr()-0.5)*0.12,zz=3.6+row*0.62,y=-0.8+row*0.24;if(x>-3.3&&x<-2.2&&row<2){x+=1.4;}dummy.position.set(x,y+0.28,zz);dummy.updateMatrix();cbody.setMatrixAt(k,dummy.matrix);dummy.position.set(x,y+0.68,zz);dummy.updateMatrix();chead.setMatrixAt(k,dummy.matrix);col.set(['#2a3038','#3a4048','#1f242a','#4a3a30','#30384a'][Math.floor(cr()*5)]);cbody.setColorAt(k,col);}
 scene.add(cbody);scene.add(chead);
 var shadowTex=tex(function(g2,w,h){var gr=g2.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);gr.addColorStop(0,'rgba(0,0,0,0.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g2.fillStyle=gr;g2.fillRect(0,0,w,h);},64,64);
 var shadowMat=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});disp.push(shadowMat);var shadowGeo=G_(new T.PlaneGeometry(0.85,0.85));
 /* figures */
 var V1=new T.Vector3(),V2=new T.Vector3(),V3=new T.Vector3(),V4=new T.Vector3(),V5=new T.Vector3(),Q1=new T.Quaternion(),Q2=new T.Quaternion(),Q3=new T.Quaternion(),AX=new T.Vector3(1,0,0),AY=new T.Vector3(0,1,0),AZ=new T.Vector3(0,0,1);
 function figure(scale,phase){var root=W.buildHockeyPlayer(T,null,0,false);unreg(root);var ud=root.userData;if(!ud.filled||!ud.model)throw new Error('player model not ready');
  try{ud.setAuto(false);ud.ctfo.mixer.stopAllAction();}catch(e){}
  var F={root:root,model:ud.model,b:{},rest:{},body:null,extra:[],ph:phase,mqi:new T.Quaternion(),decals:[],front:[]};
  ud.model.traverse(function(o){if(o.isBone){F.b[o.name]=o;F.rest[o.name]=[o.quaternion.clone(),o.position.clone()];}if(o.isMesh){var mn=o.material&&o.material.name||'';if(/stick|tape/.test(mn))o.visible=false;if(/_body$/.test(mn)){F.body=o;F.base=o.material;}}});
  if(!F.body)throw new Error('player body mesh missing');
  ['shoulder','upper_arm','forearm','hand','thigh','shin','foot'].forEach(function(b){['L','R'].forEach(function(sd){var a=b+'.'+sd;if(!F.b[a])F.b[a]=F.b[b+sd];});});/* GLTFLoader strips the dots from node names */
  root.scale.setScalar(scale);var sh=new T.Mesh(shadowGeo,shadowMat);sh.rotation.x=-Math.PI/2;sh.position.y=0.005;root.add(sh);scene.add(root);root.updateMatrixWorld(true);measure(F);figs.push(F);return F;}
 function attachTo(F,bone,mesh,pt,normal){var b=F.b[bone];F.root.updateMatrixWorld(true);V1.copy(pt);F.model.localToWorld(V1);b.worldToLocal(V1);mesh.position.copy(V1);
  Q1.setFromUnitVectors(AZ,normal);F.model.getWorldQuaternion(Q2);Q1.premultiply(Q2);b.getWorldQuaternion(Q3);mesh.quaternion.copy(Q3.invert().multiply(Q1));b.add(mesh);return mesh;}
 function decalMat(t){var m=new T.MeshStandardMaterial({map:t,transparent:true,roughness:0.8,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});disp.push(m);return m;}
 var gm=figure(1.02,0.7),pl=figure(1,0),ms=FC.meas;
 /* GM and pick before the sweater: white shirt + tie on the chest */
 function shirt(F,tie){var t=tex(function(g2,w,h){g2.clearRect(0,0,w,h);g2.fillStyle='#e8ecf0';g2.beginPath();g2.moveTo(w*0.18,0);g2.lineTo(w*0.82,0);g2.lineTo(w*0.5,h);g2.closePath();g2.fill();g2.fillStyle=tie;g2.beginPath();g2.moveTo(w*0.44,h*0.06);g2.lineTo(w*0.56,h*0.06);g2.lineTo(w*0.6,h*0.66);g2.lineTo(w*0.5,h*0.8);g2.lineTo(w*0.4,h*0.66);g2.closePath();g2.fill();},64,128);
  var m=new T.Mesh(G_(new T.PlaneGeometry(0.17,0.3)),decalMat(t));attachTo(F,'chest',m,V5.set(0,ms.yc+0.1,ms.zf+0.012),V4.set(0,0.12,1).normalize());F.front.push(m);return m;}
 var gmTie=shirt(gm,'#FFB81C'),plTie=shirt(pl,'#8a95a0');
 var numMat=decalMat(null),sleeveMat=decalMat(null),num=new T.Mesh(G_(new T.PlaneGeometry(0.33,0.28)),numMat);attachTo(pl,'chest',num,V5.set(0,ms.yc-0.1,ms.zb-0.02),V4.set(0,0,-1));pl.decals.push(num);
 ['L','R'].forEach(function(s){var a=ms.arm[s];if(!a)return;var m=new T.Mesh(G_(new T.PlaneGeometry(0.1,0.085)),sleeveMat);attachTo(pl,'upper_arm.'+s,m,V5.set(a.x+(s==='L'?0.01:-0.01),a.y,a.z),V4.set(s==='L'?1:-1,0,0));pl.decals.push(m);});
 /* the sweater the GM holds up (name + number on the back) */
 var cardMat=new T.MeshStandardMaterial({transparent:true,roughness:0.85,side:T.DoubleSide,depthWrite:true,alphaTest:0.04});disp.push(cardMat);var card=new T.Mesh(G_(new T.PlaneGeometry(0.62,0.62)),cardMat);card.visible=false;scene.add(card);
 var info=null,mats={};
 function setInfo(it,c){info={it:it,c:c};var tmn=nmT(it.owner).toUpperCase(),p=it.p||{},numTxt=String(p.jerseyNumber||p.number||(Number(it.year)%100)),last=String(p.name||'').split(' ').slice(1).join(' ').toUpperCase()||String(p.name||'').toUpperCase();
  wallMat.map=tex(function(g2,w,h){var gr=g2.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#05070a');gr.addColorStop(1,'#0d1116');g2.fillStyle=gr;g2.fillRect(0,0,w,h);g2.fillStyle=c.primary;g2.globalAlpha=0.85;g2.fillRect(0,h*0.70,w,h*0.05);g2.fillStyle=c.secondary;g2.fillRect(0,h*0.75,w,h*0.02);g2.globalAlpha=1;g2.fillStyle='#FFB81C';g2.font='700 34px "Barlow Condensed","Arial Narrow",Arial';g2.textAlign='center';g2.fillText(it.year+' NHL DRAFT',w/2,h*0.22);g2.fillStyle='#eef1f4';g2.font='800 92px "Barlow Condensed","Arial Narrow",Arial';g2.fillText(tmn,w/2,h*0.5);g2.fillStyle='#8a95a0';g2.font='600 26px "DM Sans",Arial';g2.fillText('ROUND '+it.round+' · PICK '+it.overall,w/2,h*0.62);},1024,448);wallMat.needsUpdate=true;
  podMat.map=tex(function(g2,w,h){g2.fillStyle='#0d1013';g2.fillRect(0,0,w,h);g2.fillStyle=c.primary;g2.fillRect(0,h*0.78,w,h*0.08);g2.fillStyle='#eef1f4';g2.font='800 64px "Barlow Condensed","Arial Narrow",Arial';g2.textAlign='center';g2.fillText(it.owner,w/2,h*0.45);g2.fillStyle='#FFB81C';g2.font='700 18px "DM Sans",Arial';g2.fillText('NHL DRAFT',w/2,h*0.63);},256,320);podMat.needsUpdate=true;
  var jc=lum(c.primary)<18&&lum(c.secondary)>60?c.secondary:c.primary,jc2=jc===c.primary?c.secondary:c.primary;if(Math.abs(lum(jc)-lum(jc2))<25)jc2=lum(jc)>110?'#15181c':'#f1f3f5';var ink=lum(jc)>150?'#111418':'#ffffff';
  gmTie.material.map&&gmTie.material.map.dispose();gmTie.material.map=tex(function(g2,w,h){g2.clearRect(0,0,w,h);g2.fillStyle='#e8ecf0';g2.beginPath();g2.moveTo(w*0.18,0);g2.lineTo(w*0.82,0);g2.lineTo(w*0.5,h);g2.closePath();g2.fill();g2.fillStyle=c.accent;g2.beginPath();g2.moveTo(w*0.44,h*0.06);g2.lineTo(w*0.56,h*0.06);g2.lineTo(w*0.6,h*0.66);g2.lineTo(w*0.5,h*0.8);g2.lineTo(w*0.4,h*0.66);g2.closePath();g2.fill();},64,128);gmTie.material.needsUpdate=true;
  numMat.map=tex(function(g2,w,h){g2.clearRect(0,0,w,h);g2.font='800 150px "Barlow Condensed","Arial Narrow",Arial';g2.textAlign='center';g2.textBaseline='middle';g2.lineWidth=10;g2.strokeStyle=jc2;g2.strokeText(numTxt,w/2,h/2+8);g2.fillStyle=ink;g2.fillText(numTxt,w/2,h/2+8);},256,220);numMat.needsUpdate=true;
  sleeveMat.map=numMat.map;sleeveMat.needsUpdate=true;
  cardMat.map=tex(function(g2,w,h){g2.clearRect(0,0,w,h);g2.fillStyle=jc;g2.beginPath();g2.moveTo(w*0.3,h*0.06);g2.lineTo(w*0.7,h*0.06);g2.lineTo(w*0.98,h*0.2);g2.lineTo(w*0.98,h*0.5);g2.lineTo(w*0.8,h*0.5);g2.lineTo(w*0.8,h*0.97);g2.lineTo(w*0.2,h*0.97);g2.lineTo(w*0.2,h*0.5);g2.lineTo(w*0.02,h*0.5);g2.lineTo(w*0.02,h*0.2);g2.closePath();g2.fill();
   g2.fillStyle=jc2;g2.fillRect(w*0.2,h*0.84,w*0.6,h*0.05);g2.fillRect(w*0.02,h*0.4,w*0.18,h*0.04);g2.fillRect(w*0.8,h*0.4,w*0.18,h*0.04);g2.fillRect(w*0.3,h*0.06,w*0.4,h*0.025);
   g2.textAlign='center';g2.fillStyle=ink;g2.font='800 '+(last.length>9?30:38)+'px "Barlow Condensed","Arial Narrow",Arial';g2.fillText(last,w/2,h*0.25);g2.font='800 150px "Barlow Condensed","Arial Narrow",Arial';g2.lineWidth=8;g2.strokeStyle=jc2;g2.strokeText(numTxt,w/2,h*0.66);g2.fillText(numTxt,w/2,h*0.66);},320,320);cardMat.needsUpdate=true;
  rim.color.set(c.accent);
  var go=function(){mats.suitG=bodyMat(T,gm.body,gm.base,'suit|g',[40,44,52],[34,37,44],[36,27,21]);mats.suitP=bodyMat(T,pl.body,pl.base,'suit|p',[58,66,80],[48,55,66],[70,48,30]);mats.team=bodyMat(T,pl.body,pl.base,'team|'+jc+'|'+jc2,hexRgb(jc),hexRgb(jc2),[70,48,30]);if(mats.suitG)gm.body.material=mats.suitG;};
  if(FC.mask)go();else{FC.maskWait.push(go);loadMask();}}
 /* bone helpers: rotations are given in the figure's model space (+Z forward, +X = his left, +Y up) */
 function resetPose(F){for(var n in F.rest){var b=F.b[n],r=F.rest[n];b.quaternion.copy(r[0]);b.position.copy(r[1]);}}
 function applyQ(F,n,dq){var b=F.b[n];b.parent.getWorldQuaternion(Q1);Q1.premultiply(F.mqi);Q2.copy(Q1).invert().multiply(dq).multiply(Q1);b.quaternion.premultiply(Q2);}
 function rot(F,n,ax,a){if(!a||!F.b[n])return;Q3.setFromAxisAngle(ax,a);applyQ(F,n,Q3);}
 function mpos(F,n,out){F.b[n].getWorldPosition(out);return F.model.worldToLocal(out);}
 function aim(F,n,c,dir){mpos(F,n,V1);mpos(F,c,V2);V2.sub(V1).normalize();Q3.setFromUnitVectors(V2,dir);applyQ(F,n,Q3);}
 var D1=new T.Vector3(),D2=new T.Vector3(),TT=new T.Vector3(),PO=new T.Vector3(),SS=new T.Vector3(),EE=new T.Vector3(),HH=new T.Vector3();
 function ik(F,s,tgt,pole){var u='upper_arm.'+s,fa='forearm.'+s,h='hand.'+s;mpos(F,u,SS);mpos(F,fa,EE);mpos(F,h,HH);var L1=SS.distanceTo(EE),L2=EE.distanceTo(HH);
  D1.copy(tgt).sub(SS);var d=cl(D1.length(),Math.abs(L1-L2)+0.02,L1+L2-0.004);D1.normalize();var a=(L1*L1-L2*L2+d*d)/(2*d),hh=Math.sqrt(Math.max(0,L1*L1-a*a));
  PO.copy(pole).addScaledVector(D1,-pole.dot(D1)).normalize();D2.copy(SS).addScaledVector(D1,a).addScaledVector(PO,hh).sub(SS).normalize();aim(F,u,fa,D2);
  mpos(F,fa,EE);TT.copy(SS).addScaledVector(D1,d).sub(EE).normalize();aim(F,fa,h,TT);}
 function toModel(F,w,out){out.copy(w);return F.model.worldToLocal(out);}
 var N1=new T.Vector3(),N2=new T.Vector3(),POL=new T.Vector3();
 function neutralArms(F,swing,bend){aim(F,'upper_arm.L','forearm.L',N1.set(0.2,-1,-0.02).normalize());aim(F,'upper_arm.R','forearm.R',N1.set(-0.2,-1,-0.02).normalize());
  rot(F,'upper_arm.L',AX,swing||0);rot(F,'upper_arm.R',AX,-(swing||0));
  mpos(F,'forearm.L',V3);mpos(F,'upper_arm.L',V4);N2.copy(V3).sub(V4).normalize();N1.copy(N2).applyAxisAngle(AX,-(bend||0.3));aim(F,'forearm.L','hand.L',N1);
  mpos(F,'forearm.R',V3);mpos(F,'upper_arm.R',V4);N2.copy(V3).sub(V4).normalize();N1.copy(N2).applyAxisAngle(AX,-(bend||0.3));aim(F,'forearm.R','hand.R',N1);}
 function walkLegs(F,ph,amp){var s=Math.sin(ph),c=Math.cos(ph);rot(F,'thigh.L',AX,-amp*s);rot(F,'thigh.R',AX,amp*s);rot(F,'shin.L',AX,0.08+0.8*amp*Math.max(0,c)*1.6);rot(F,'shin.R',AX,0.08+0.8*amp*Math.max(0,-c)*1.6);
  rot(F,'foot.L',AX,amp*0.5*s-0.3*Math.max(0,c)*amp);rot(F,'foot.R',AX,-amp*0.5*s-0.3*Math.max(0,-c)*amp);}
 function look(F,o,ps){var tx,tz,ry=o.ry;if(o.look==='cam'){tx=ps.cam.p[0];tz=ps.cam.p[2];}else if(o.look==='G'||o.look==='P'){var q=o.look==='G'?ps.G:ps.P;tx=q.p[0];tz=q.p[2];}else return;
  var want=Math.atan2(tx-o.p[0],tz-o.p[2]),d=want-ry;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;d=cl(d,-0.85,0.85);rot(F,'neck',AY,d*0.4);rot(F,'head',AY,d*0.6);}
 function animate(F,o,ps,t,isPl){F.root.visible=!!o.vis;if(!o.vis)return;var bob=o.walk?-0.028*Math.abs(Math.sin(o.wph||0)):0;
  F.root.position.set(o.p[0],o.p[1]+bob,o.p[2]);F.root.rotation.y=o.ry;resetPose(F);F.root.updateMatrixWorld(true);F.model.getWorldQuaternion(F.mqi);F.mqi.invert();
  var br=Math.sin(t*1.6+F.ph)*0.015,k=o.k||0;
  if(o.walk){var s=Math.sin(o.wph);rot(F,'hips',AY,0.07*s);rot(F,'spine',AX,0.05);rot(F,'chest',AY,-0.12*s);}else{rot(F,'chest',AX,br);}
  if(o.walk)neutralArms(F,0.38*Math.sin(o.wph),0.35);else neutralArms(F,0,0.25);
  if(o.walk)walkLegs(F,o.wph,0.42);
  if(o.act==='podium'){rot(F,'spine',AX,0.1);var lean=Math.sin(t*0.9)*0.01;[['L',0.2],['R',-0.2]].forEach(function(a){toModel(F,V5.set(POD[0]+0.05+a[1]*Math.cos(o.ry),1.12,POD[2]+0.38+lean),TT);ik(F,a[0],TT.clone(),POL.set(a[0]==='L'?0.8:-0.8,-0.5,-0.5));});rot(F,'head',AX,k<0.55?0.22:0.05);}
  else if(o.act==='pull'&&isPl){var up=k<0.35?0:k<0.5?ease((k-0.35)/0.15):k<0.62?1:k<0.82?1-ease((k-0.62)/0.2):0;if(up>0){var ty=lerp(1.05,1.98,up),tz=lerp(0.32,0.12,up);[['L',1],['R',-1]].forEach(function(a){TT.set(0.13*a[1],ty,tz);var cur=TT.clone();ik(F,a[0],cur,POL.set(a[1]*0.9,-0.2,0.3));});rot(F,'head',AX,-0.12*up);}}
  else if(o.act==='hold'&&!isPl){var hold=k<0.35?1:k<0.5?1-(k-0.35)/0.15:0;if(hold>0){card.updateMatrixWorld(true);[['L',0.26],['R',-0.26]].forEach(function(a){V5.set(-a[1]*1,0.24,0);card.localToWorld(V5);toModel(F,V5,TT);var cur=TT.clone();ik(F,a[0],cur,POL.set(a[0]==='L'?0.9:-0.9,-0.6,-0.2));});}}
  else if(o.act==='shake'){var sh=o.shake||0;if(sh>0){var other=isPl?ps.G:ps.P;V5.set((o.p[0]+other.p[0])/2+(isPl?-0.02:0.02),1.03+(o.wob||0),(o.p[2]+other.p[2])/2+0.17);toModel(F,V5,TT);mpos(F,'hand.R',HH);var tg=HH.clone().lerp(TT,sh);ik(F,'R',tg,POL.set(-0.6,-0.8,-0.2));}
  }
  else if(o.act==='photo'){var other2=isPl?ps.G:ps.P,side=isPl?'L':'R';V5.set(other2.p[0]+(isPl?0.02:-0.02),1.0,other2.p[2]-0.2);toModel(F,V5,TT);mpos(F,'hand.'+side,HH);var tp=HH.clone().lerp(TT,k);ik(F,side,tp,POL.set(isPl?0.4:-0.4,-0.5,-1));}
  look(F,o,ps);}
 function size(){var r=host.getBoundingClientRect(),w=Math.max(320,Math.round(r.width)),h=Math.max(200,Math.round(r.height));if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
 function cardPose(n,f,ps){card.visible=false;if(n!=='jersey')return;var G=ps.G,P=ps.P;if(f<0.35){var a=G.ry;card.visible=true;card.position.set(G.p[0]+Math.sin(a)*0.42,1.3,G.p[2]+Math.cos(a)*0.42);card.rotation.set(0,a,0);card.scale.setScalar(1);cardMat.opacity=1;}
  else if(f<0.62){var u=ease(seg(f,0.35,0.5));card.visible=true;var g0=[G.p[0]+Math.sin(G.ry)*0.42,1.3,G.p[2]+Math.cos(G.ry)*0.42],p0=[P.p[0]+Math.sin(P.ry)*0.12,1.95,P.p[2]+Math.cos(P.ry)*0.12];var q=lv(g0,p0,u);var dn=ease(seg(f,0.5,0.62));q[1]-=dn*0.62;card.position.set(q[0],q[1],q[2]);card.rotation.set(0,lerp(G.ry,P.ry,u),0);card.scale.setScalar(lerp(1,0.8,u));cardMat.opacity=1-dn;}}
 function render(n,f,t){size();var ps=pose(n,f,t);var jOn=ps.P.jersey>=0.5;
  if(mats.team&&mats.suitP){pl.body.material=jOn?mats.team:mats.suitP;}pl.front.forEach(function(m){m.visible=!jOn;});pl.decals.forEach(function(m){m.visible=jOn&&!!mats.team;});
  cardPose(n,f,ps);animate(gm,ps.G,ps,t,false);animate(pl,ps.P,ps,t,true);
  var cm=S._cam||ps.cam;camera.position.set(cm.p[0],cm.p[1],cm.p[2]);camera.lookAt(cm.l[0],cm.l[1],cm.l[2]);
  var fl=n==='photo'&&f<0.72?rng('flash|'+Math.floor(t*9)+'|'+(info?info.it.overall:0))():0;if(n==='jersey'&&f>0.6&&f<0.66)fl=0.9;flash.intensity=fl>0.62?(fl-0.62)*2.6:0;key.intensity=n==='question'||n==='debrief'?1.0:1.7;renderer.render(scene,camera);}
 function dispose(){figs.forEach(function(F){if(F.root.parent)F.root.parent.remove(F.root);});disp.forEach(function(d){try{d.dispose();}catch(e){}});try{cbody.dispose&&cbody.dispose();chead.dispose&&chead.dispose();}catch(e){}try{renderer.dispose();renderer.forceContextLoss&&renderer.forceContextLoss();}catch(e){}host.innerHTML='';}
 S._fig={gm:gm,pl:pl,mats:mats};
 return {kind:'3d',setInfo:setInfo,render:render,dispose:dispose};}

/* ---------------- 2D fallback (CSS figures) ---------------- */
function stage2d(host){host.innerHTML='<div class="cs2d"><div class="cs2d-wall"><b></b><span></span></div><div class="cs2d-deck"></div><div class="cs2d-podium"><b></b></div><div class="cs2d-crowd"></div>'+fig('gm')+fig('pl')+'</div>';
 var el=host.firstChild,crowd=el.querySelector('.cs2d-crowd'),r=rng('crowd2d'),h='';for(var i=0;i<60;i++)h+='<i style="left:'+(i%20*5+r()*2).toFixed(1)+'%;bottom:'+(Math.floor(i/20)*30+r()*6).toFixed(0)+'%"></i>';crowd.innerHTML=h;
 var gmE=el.querySelector('.cs2d-gm'),plE=el.querySelector('.cs2d-pl');
 function fig(k){return '<div class="cs2d-fig cs2d-'+k+'"><i class="h"></i><i class="b"><em></em></i><i class="a al"></i><i class="a ar"></i><i class="l ll"></i><i class="l lr"></i></div>';}
 function place(e,o,t,isPl,n){var x=o.p[0],zz=o.p[2],y=o.p[1],sc=0.78+0.07*zz;e.style.display=o.vis?'':'none';e.style.left=(50+x*11).toFixed(2)+'%';e.style.bottom=(26+y*14-zz*4).toFixed(2)+'%';var face=Math.sin(o.ry)>=0?1:-1;e.style.transform='translateX(-50%) scale('+sc.toFixed(3)+') scaleX('+face+')';e.style.zIndex=String(10+Math.round(zz*10));
  var w=o.walk?Math.sin(t*7.5)*24:0;e.querySelector('.ll').style.transform='rotate('+w+'deg)';e.querySelector('.lr').style.transform='rotate('+(-w)+'deg)';e.querySelector('.ar').style.transform='rotate('+(-w*0.7-(o.shake||0)*70+(o.wob||0)*40)+'deg)';e.querySelector('.al').style.transform='rotate('+(w*0.7+(o.arm||0)*30)+'deg)';
  if(isPl)e.classList.toggle('jersey',o.jersey>0.6);}
 return {kind:'2d',setInfo:function(it,c){el.style.setProperty('--cs-j',lum(c.primary)<18&&lum(c.secondary)>60?c.secondary:c.primary);el.style.setProperty('--cs-j2',c.secondary);el.querySelector('.cs2d-wall b').textContent=it.year+' NHL DRAFT';el.querySelector('.cs2d-wall span').textContent=nmT(it.owner).toUpperCase();el.querySelector('.cs2d-podium b').textContent=it.owner;plE.querySelector('em').textContent=it.owner;},
  render:function(n,f,t){var ps=pose(n,f,t);place(plE,ps.P,t,true,n);place(gmE,ps.G,t,false,n);el.dataset.shot=n;el.classList.toggle('cs2d-zoom',n==='podium'||n==='handshake');},dispose:function(){host.innerHTML='';}};}

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
function resumeCheck(){var g=game();if(!g||cur||queue.length)return;var p=pendingTalk(g);if(p){var t=p.ctfoDraft.talk;enqueue({kind:'talk',overall:t.overall,round:p.ctfoDraft.round,slot:0,owner:t.owner,origin:t.owner,p:p,year:t.year});return;}checkClock();}
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
