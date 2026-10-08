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
S.unhappyChance=function(E){if(!(E<0))return 0;return cl(0.008+Math.max(0,-E-0.2)*0.06,0,0.15);};
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
