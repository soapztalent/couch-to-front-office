/* Couch To Front Office - live game engine (patch9)
   The stats engine (simulateMatchup) decides every result. This file choreographs real hockey that produces
   exactly those events: same scorers, assists, shot counts, hits, blocks, penalties, faceoffs and goal times.
   Layout: [core: schedule + fixed-step simulation, no DOM]  [View3D / View2D renderers]  [UI controller]. */
(function(global){
'use strict';
var VERSION='9.1';
/* ---------- rink (feet). x = length (+x toward the right end), y = width (+y = far boards / benches) ---------- */
var RX=100,RY=42.5,CR=28,GL=89,BL=25,NETW=3,CREASE=6,FT=0.3;
var DOTS={center:[0,0],ez:69,nz:20,dy:22};
var BENCH={home:{x:-24,y:RY-1.5},away:{x:24,y:RY-1.5}},PBOX={home:{x:-15,y:-RY+1.5},away:{x:15,y:-RY+1.5}};
var DT=1/60;
function rng(seed){var a=(seed>>>0)||1;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function lerp(a,b,t){return a+(b-a)*t;}
function hyp(x,y){return Math.sqrt(x*x+y*y);}
function dist(a,b){return hyp(a.x-b.x,a.y-b.y);}
function sgn(v){return v<0?-1:1;}
/* rounded-rectangle clamp: keeps bodies inside the boards including the 28 ft corners */
function rinkClamp(p,m){var hx=RX-m,hy=RY-m,r=Math.max(1,CR-m),cx=hx-r,cy=hy-r,ox=p.x,oy=p.y;p.x=clamp(p.x,-hx,hx);p.y=clamp(p.y,-hy,hy);var hit=(ox!==p.x||oy!==p.y);var ax=Math.abs(p.x),ay=Math.abs(p.y);if(ax>cx&&ay>cy){var dx=ax-cx,dy=ay-cy,d=hyp(dx,dy);if(d>r){p.x=sgn(p.x)*(cx+dx/d*r);p.y=sgn(p.y)*(cy+dy/d*r);return true;}}return hit;}
function inRink(x,y,m){var p={x:x,y:y};return !rinkClamp(p,m)&&Math.abs(x)<=RX-m&&Math.abs(y)<=RY-m;}
/* board normal at a point outside the rounded rectangle (for puck bounces) */
function boardNormal(x,y){var cx=RX-CR,cy=RY-CR,ax=Math.abs(x),ay=Math.abs(y);if(ax>cx&&ay>cy){var dx=ax-cx,dy=ay-cy,d=hyp(dx,dy)||1;return {x:-sgn(x)*dx/d,y:-sgn(y)*dy/d};}if(RX-ax<RY-ay)return {x:-sgn(x),y:0};return {x:0,y:-sgn(y)};}
function clockLabel(sec){sec=Math.max(0,sec);var s=Math.ceil(sec-1e-6),m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r;}
function gameClock(t){var per=t>=3600?4:Math.floor(t/1200)+1,into=per===4?t-3600:t-(per-1)*1200;return {period:per,into:into};}
function intoLabel(t){var k=gameClock(t),s=Math.round(k.into),m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r;}
function perLabel(p){return p===4?'OT':['1st','2nd','3rd'][p-1];}
/* ---------- schedule: turns the stats engine's log into a timed script + shift plan ---------- */
function buildSchedule(spec,R){
  var TM={home:spec.teams.home,away:spec.teams.away},OTH={home:'away',away:'home'},SIDES=['home','away'];
  var END=spec.ot?(spec.otEnd||3900):3600;
  var pens=(spec.pens||[]).map(function(w){return {team:w.team,player:w.player,start:w.start,end:w.end,infraction:w.infraction,ppGoalTime:w.ppGoalTime};});
  var pull=spec.pull?{team:spec.pull.team,t0:spec.pull.t0,t1:spec.pull.t1}:null;
  function P(k,id){return TM[k].players[id]||null;}
  function isD(k,id){var p=P(k,id);return !!p&&p.pos==='D';}
  function lineIdx(k,id){var L=TM[k].lines||[];for(var i=0;i<L.length;i++)if(L[i].indexOf(id)>=0)return i;return -1;}
  function pairIdx(k,id){var L=TM[k].pairs||[];for(var i=0;i<L.length;i++)if(L[i].indexOf(id)>=0)return i;return -1;}
  function kindAt(k,t){if(t>=3600)return 'OT';for(var i=0;i<pens.length;i++){var w=pens[i];if(t>=w.start&&t<w.end)return w.team===k?'PK':'PP';}if(pull&&t>=pull.t0&&t<pull.t1)return pull.team===k?'EA':'ESL';return 'ES';}
  function boxedAt(k,t){var out=[];pens.forEach(function(w){if(w.team===k&&t>=w.start&&t<w.end)out.push(w.player);});return out;}
  /* hard requirements: who must be on the ice for goals and penalties */
  var req={home:[],away:[]};
  (spec.goals||[]).forEach(function(g){req[g.team].push({t:g.t,ids:(g.onIce||[g.scorer]).filter(Boolean),hard:1});if(g.against&&g.against.length)req[OTH[g.team]].push({t:g.t,ids:g.against.filter(Boolean),hard:1});});
  pens.forEach(function(w){req[w.team].push({t:w.start-0.5,ids:[w.player],hard:1});});
  SIDES.forEach(function(k){req[k].sort(function(a,b){return a.t-b.t;});});
  var hardT=[];(spec.goals||[]).forEach(function(g){hardT.push(g.t);});pens.forEach(function(w){hardT.push(w.start);});
  /* breakpoints with constant strength */
  var bp=[0,1200,2400,3600,END];pens.forEach(function(w){bp.push(w.start,w.end);});if(pull)bp.push(pull.t0,pull.t1);
  bp=bp.filter(function(x){return x>=0&&x<=END;}).sort(function(a,b){return a-b;}).filter(function(x,i,a){return i===0||x-a[i-1]>1e-6;});
  var segs={home:[],away:[]};
  function deficitPick(shares,acc,n,prefIds,group,k){var best=0,bv=-1e9;for(var i=0;i<n;i++){var v=(shares[i]||0)*1000-acc[i];if(prefIds){var ov=0;(group[i]||[]).forEach(function(id){if(prefIds.indexOf(id)>=0)ov++;});v+=ov*5000;}if(v>bv){bv=v;best=i;}}return best;}
  SIDES.forEach(function(k){var tm=TM[k],nL=Math.max(1,(tm.lines||[]).filter(function(l){return l.length;}).length),nP=Math.max(1,(tm.pairs||[]).filter(function(l){return l.length;}).length);
    var fAcc=[0,0,0,0],dAcc=[0,0,0],ppAcc=[0,0],pkAcc=[0,0],fS=tm.fShare||[.36,.3,.2,.14],dS=tm.dShare||[.4,.33,.27];
    // walk constant-strength intervals and merge ES-like runs (ES, EA, ESL) inside one period
    var runs=[];for(var i=0;i+1<bp.length;i++){var a=bp[i],b=bp[i+1];if(b-a<1e-6)continue;var kd=kindAt(k,(a+b)/2),es=(kd==='ES'||kd==='EA'||kd==='ESL'),per=Math.floor(a/1200);var last=runs[runs.length-1];if(es&&last&&last.es&&last.per===per&&Math.abs(last.b-a)<1e-6){last.b=b;last.parts.push({a:a,b:b,kind:kd});}else runs.push({a:a,b:b,es:es,kind:kd,per:per,parts:[{a:a,b:b,kind:kd}]});}
    runs.forEach(function(run){
      if(run.es){
        function shifts(n,shares,acc,groups,lo,hi,isDef){var out=[],t=run.a;while(run.b-t>0.5){var len=lo+R()*(hi-lo),end=Math.min(run.b,t+len);if(run.b-end<14)end=run.b;var rq=req[k].filter(function(r){return r.t>=t&&r.t<end+6;})[0],pref=null;if(rq){pref=rq.ids.filter(function(id){return isDef?isD(k,id):!isD(k,id);});if(!pref.length)pref=null;else if(rq.t>end-3&&rq.t<run.b)end=Math.min(run.b,rq.t+5+R()*8);}var gi=deficitPick(shares,acc,n,pref,groups,k);acc[gi]+=end-t;out.push({a:t,b:end,ids:(groups[gi]||[]).slice()});t=end;}return out;}
        var F=shifts(nL,fS,fAcc,tm.lines,34,54,false),D=shifts(nP,dS,dAcc,tm.pairs,40,62,true);
        var cuts=[run.a,run.b];F.forEach(function(s){cuts.push(s.a);});D.forEach(function(s){cuts.push(s.a);});run.parts.forEach(function(p){cuts.push(p.a);});
        cuts=cuts.sort(function(a,b){return a-b;}).filter(function(x,i,arr){return i===0||x-arr[i-1]>1e-6;});
        for(var c=0;c+1<cuts.length;c++){var a=cuts[c],b=cuts[c+1],mid=(a+b)/2,fs=F.filter(function(s){return s.a<=mid&&s.b>mid;})[0],ds=D.filter(function(s){return s.a<=mid&&s.b>mid;})[0],kd=kindAt(k,mid);var sk=(fs?fs.ids:[]).concat(ds?ds.ids:[]);
          if(kd==='EA'){var extra=[].concat(tm.lines[0]||[],tm.lines[1]||[],tm.pairs[0]||[]).filter(function(id){return sk.indexOf(id)<0;})[0];if(extra)sk.push(extra);}
          segs[k].push({t0:a,t1:b,kind:kd,sk:sk,locks:{}});}
      }else if(run.kind==='OT'){
        var topF=[].concat(tm.lines[0]||[],tm.lines[1]||[]).slice(0,4),topD=[].concat(tm.pairs[0]||[],tm.pairs[1]||[]).slice(0,3),t=run.a,n=0;
        while(run.b-t>0.5){var end=Math.min(run.b,t+35+R()*15);if(run.b-end<10)end=run.b;var f=n%2===0?topF.slice(0,2):topF.slice(2,4);if(f.length<2)f=topF.slice(0,2);var d=[topD[n%Math.max(1,topD.length)]].filter(Boolean);segs[k].push({t0:t,t1:end,kind:'OT',sk:f.concat(d),locks:{}});t=end;n++;}
      }else{
        // special teams: unit 1 then unit 2 by the engine's PP/PK share, never using the player in the box
        var pp=run.kind==='PP',units=(pp?tm.pp:tm.pk)||[],share=(pp?tm.ppShare:tm.pkShare)||[.6,.4],size=pp?5:4,boxed=boxedAt(k,(run.a+run.b)/2);
        var dressed=[].concat.apply([],(tm.lines||[]).concat(tm.pairs||[])).filter(function(id){return boxed.indexOf(id)<0;});
        function fill(u){var out=(u||[]).filter(function(id){return boxed.indexOf(id)<0;});var pool=[].concat.apply([],units).concat(dressed);for(var i=0;i<pool.length&&out.length<size;i++)if(out.indexOf(pool[i])<0&&boxed.indexOf(pool[i])<0)out.push(pool[i]);return out.slice(0,size);}
        var u1=fill(units[0]),u2=fill(units[1]||units[0]),len=run.b-run.a,sw=run.a+len*clamp((share[0]||.6)+(R()-.5)*.15,.45,.8);
        var rqs=req[k].filter(function(r){return r.t>=run.a&&r.t<run.b;});rqs.forEach(function(r){var in1=r.ids.filter(function(id){return u1.indexOf(id)>=0;}).length,in2=r.ids.filter(function(id){return u2.indexOf(id)>=0;}).length;if(in2>in1&&r.t<sw)sw=Math.max(run.a,r.t-10);if(in1>in2&&r.t>=sw)sw=Math.min(run.b,r.t+4);});
        if(sw-run.a>2)segs[k].push({t0:run.a,t1:sw,kind:run.kind,sk:u1,locks:{}});if(run.b-sw>2)segs[k].push({t0:Math.max(run.a,sw),t1:run.b,kind:run.kind,sk:u2,locks:{}});else if(segs[k].length&&segs[k][segs[k].length-1].t1<run.b)segs[k][segs[k].length-1].t1=run.b;
      }
    });
    segs[k].sort(function(a,b){return a.t0-b.t0;});
    for(var s=1;s<segs[k].length;s++)segs[k][s].t0=segs[k][s-1].t1;
  });
  function segAt(k,t){var L=segs[k];for(var i=0;i<L.length;i++)if(t>=L[i].t0&&t<L[i].t1)return L[i];return L[L.length-1];}
  function carve(k,seg,a,b){a=Math.max(seg.t0,a);b=Math.min(seg.t1,b);if(b-a<0.5)return seg;var L=segs[k],i=L.indexOf(seg),parts=[];function cp(x,y){var locks={};Object.keys(seg.locks).forEach(function(id){var ts=seg.locks[id].filter(function(q){return q.t>=x&&q.t<y;});if(ts.length)locks[id]=ts;});return {t0:x,t1:y,kind:seg.kind,sk:seg.sk.slice(),locks:locks};}
    if(a-seg.t0>0.5)parts.push(cp(seg.t0,a));else a=seg.t0;var mid=cp(a,b);parts.push(mid);if(seg.t1-b>0.5)parts.push(cp(b,seg.t1));else mid.t1=seg.t1;L.splice.apply(L,[i,1].concat(parts));return mid;}
  /* make sure ids are on the ice at time t (swaps same-position players; carves a short shift on conflicts) */
  function ensure(k,t,ids,lockIt){var bx=boxedAt(k,t);ids=ids.filter(function(id){return bx.indexOf(id)<0;});var seg=segAt(k,t),need=ids.filter(function(id){return seg.sk.indexOf(id)<0;});if(!need.length){if(lockIt)ids.forEach(function(id){(seg.locks[id]=seg.locks[id]||[]).push({t:t,h:lockIt===2});});return true;}
    function removable(s,id){var grp=isD(k,id);var c=s.sk.filter(function(x){return ids.indexOf(x)<0&&!(s.locks[x]&&s.locks[x].length)&&isD(k,x)===grp;});if(!c.length)c=s.sk.filter(function(x){return ids.indexOf(x)<0&&!(s.locks[x]&&s.locks[x].length);});return c;}
    var ok=need.every(function(id){return removable(seg,id).length>0;});
    if(!ok){var a=t-7,b=t+3;hardT.forEach(function(h){if(h<t-0.001&&h+0.01>a)a=h+0.01;if(h>t+0.001&&h<b)b=h;});seg=carve(k,seg,a,b);}
    need.forEach(function(id){var c=removable(seg,id);var out=c.length?c[0]:seg.sk.filter(function(x){return ids.indexOf(x)<0&&!(seg.locks[x]&&seg.locks[x].some(function(q){return q.h;}));})[0];if(out!=null){seg.sk[seg.sk.indexOf(out)]=id;delete seg.locks[out];}else seg.sk.push(id);});
    if(lockIt)ids.forEach(function(id){(seg.locks[id]=seg.locks[id]||[]).push({t:t,h:lockIt===2});});return true;}
  SIDES.forEach(function(k){req[k].forEach(function(r){ensure(k,r.t,r.ids,2);});});
  /* ---- events ---- */
  var events=[];
  (spec.goals||[]).forEach(function(g){events.push({t:g.t,type:'goal',team:g.team,p:g.scorer,a1:g.a1,a2:g.a2,sit:g.sit,hard:1,onIce:g.onIce,against:g.against});});
  pens.forEach(function(w){events.push({t:w.start,type:'penalty',team:w.team,p:w.player,infraction:w.infraction,end:w.end,ppGoalTime:w.ppGoalTime,hard:1});});
  var placed=events.map(function(e){return {t:e.t,team:e.team,hard:1};});
  function spacing(t,k){var s=1e9;for(var i=0;i<placed.length;i++){var q=placed[i],d=Math.abs(q.t-t)-(q.hard?(q.team===k?7:11):(q.team===k?3:7));if(d<s)s=d;}var pc=t%1200;if(t<3600){s=Math.min(s,pc-8,1200-pc-4);}return s;}
  function compatible(k,kind,sit,type){if(type==='save'){if(sit==='PP')return kind==='PP';if(sit==='SH')return kind==='PK';if(sit==='OT')return kind==='OT';return kind==='ES'||kind==='EA';}if(type==='icing')return kind==='ES'||kind==='ESL';if(type==='offside')return kind==='ES'||kind==='EA'||kind==='PP';return true;}
  function place(k,p,type,sit){var L=segs[k],cand=L.filter(function(s){return compatible(k,s.kind,sit,type)&&(p==null||s.sk.indexOf(p)>=0)&&s.t1-s.t0>3;});var forced=false;
    if(!cand.length){cand=L.filter(function(s){return compatible(k,s.kind,sit,type)&&s.t1-s.t0>6;});forced=true;}
    if(!cand.length)cand=L.filter(function(s){return s.t1-s.t0>6&&s.kind!=='OT';});
    if(!cand.length)cand=L.slice();
    var tot=cand.reduce(function(n,s){return n+(s.t1-s.t0);},0),best=null,bv=-1e9;
    function feasible(s,t){if(p==null||s.sk.indexOf(p)>=0)return true;if(boxedAt(k,t).indexOf(p)>=0)return false;var grp=isD(k,p);return s.sk.some(function(x){return !(s.locks[x]&&s.locks[x].length)&&isD(k,x)===grp;});}
    for(var n=0;n<24;n++){var r=R()*tot,s=cand[0];for(var i=0;i<cand.length;i++){r-=cand[i].t1-cand[i].t0;if(r<=0){s=cand[i];break;}}var t=s.t0+2+R()*Math.max(0.5,s.t1-s.t0-4),v=spacing(t,k)-(feasible(s,t)?0:1e6);if(v>bv){bv=v;best=t;}}
    if(bv<-1e5&&type==='save'&&sit!=='ES'&&sit!=='OT')return place(k,p,type,'ES');
    if(p!=null)ensure(k,best,[p],true);placed.push({t:best,team:k});return best;}
  var saves=[];SIDES.forEach(function(k){(TM[k].saves||[]).forEach(function(s){saves.push({team:k,p:s.p,sit:s.sit});});});
  saves.sort(function(){return R()-.5;});
  saves.forEach(function(s){var t=place(s.team,s.p,'save',s.sit);events.push({t:t,type:'save',team:s.team,p:s.p,sit:s.sit});});
  SIDES.forEach(function(k){(TM[k].blocks||[]).forEach(function(id){var t=place(k,id,'block');events.push({t:t,type:'block',team:k,p:id});});(TM[k].hits||[]).forEach(function(id){var t=place(k,id,'hit');events.push({t:t,type:'hit',team:k,p:id});});});
  /* faceoffs: the engine's total = period/OT openers + goals + penalties + extra stoppages (freezes, icings, offsides) */
  var nGoalsFo=(spec.goals||[]).filter(function(g){return g.t<END-0.01||!spec.ot||spec.so;}).filter(function(g){return !(g.sit==='OT');}).length;
  var natural=3+(spec.ot?1:0)+nGoalsFo+pens.length,extra=Math.max(0,((spec.fo&&spec.fo.total)||natural)-natural);
  var sv=events.filter(function(e){return e.type==='save';}).sort(function(){return R()-.5;}),nF=Math.min(Math.round(extra*.62),Math.floor(sv.length*.55));
  for(var f=0;f<nF;f++)sv[f].freeze=1;
  for(var x=nF;x<extra;x++){var k2=R()<.5?'home':'away',typ=R()<.6?'icing':'offside',t2=place(k2,null,typ);events.push({t:t2,type:typ,team:k2});}
  events.sort(function(a,b){return a.t-b.t||(a.hard?-1:1);});
  // nudge soft events that collide exactly
  for(var e=1;e<events.length;e++){if(events[e].t-events[e-1].t<0.6&&!events[e].hard)events[e].t=events[e-1].t+0.6;}
  events.sort(function(a,b){return a.t-b.t;});
  /* faceoff winners in chronological order, matching the engine's totals */
  var foEvents=[];[0,1200,2400].forEach(function(t){foEvents.push(t);});if(spec.ot)foEvents.push(3600);events.forEach(function(e){if((e.type==='goal'&&e.sit!=='OT')||e.type==='penalty'||e.type==='icing'||e.type==='offside'||(e.type==='save'&&e.freeze))foEvents.push(e.t+0.001);});
  var hw=(TM.home.fo||0),aw=(TM.away.fo||0),bag=[];for(var h=0;h<hw;h++)bag.push('home');for(var a=0;a<aw;a++)bag.push('away');bag.sort(function(){return R()-.5;});while(bag.length<foEvents.length)bag.push(R()<.5?'home':'away');
  var info={extraStoppages:extra,natural:natural,foScheduled:foEvents.length,foEngine:spec.fo&&spec.fo.total};
  return {events:events,segs:segs,segAt:segAt,pens:pens,pull:pull,end:END,foWinners:bag,info:info,kindAt:kindAt};
}
/* ---------- core game: fixed-step simulation, no DOM ---------- */
function Game(spec,opts){
  opts=opts||{};var self=this;
  this.spec=spec;this.R=rng(spec.seed||7);
  this.periodMs=opts.periodMs||180000;this.otMs=opts.otMs||60000;
  this.rateReg=1200/(this.periodMs/1000);this.rateOT=300/Math.max(5,(this.otMs/1000));
  this.quick=this.rateReg>45;            // test hook: very short periods skip choreography
  this.S=buildSchedule(spec,this.R);
  this.ev=this.S.events;this.ei=0;
  this.gt=0;this.period=1;this.t=0;this.phase='init';this.phaseT=0;this.done=false;
  this.score={home:0,away:0};this.sog={home:0,away:0};this.hits={home:0,away:0};this.blocks={home:0,away:0};this.fo={home:0,away:0};this.foIdx=0;this.pim={home:0,away:0};
  this.ledger=[];this.calls=[];this.call='Opening faceoff';this.banner=null;this.elastic=1;
  this.ents={};this.on={home:[],away:[]};this.goalieOn={home:true,away:true};this.box=[];this.pulled=null;
  this.metrics={passes:0,oneTimers:0,crossSeam:0,rebounds:0,tips:0,ppFrames:0,umbrellaFrames:0,pkFrames:0,boxFrames:0,forecheckFrames:0,fcF1:0,fcF2:0,fcF3:0,goalieOut:0,goalieFrames:0,holdTime:0,maxHold:0,forced:0,instantSwaps:0,lineChanges:0,faceoffs:0,whistles:0,steps:0,dumpIns:0,carryIns:0,breakouts:0,regroups:0,points:0,shotsTaken:0,wideShots:0,wideHome:0,wideAway:0,passHome:0,passAway:0,ozHome:0,ozAway:0};
  this.puck={x:0,y:0,z:0,vx:0,vy:0,vz:0,state:'dead',holder:null,px:0,py:0,pz:0};
  this.D={seq:null,hold:0,retr:null,decT:0};
  this.sysRoles={home:{},away:{},t:-1};
  ['home','away'].forEach(function(k){var tm=spec.teams[k];Object.keys(tm.players).forEach(function(id){var p=tm.players[id];self.ents[id]=self.mkEnt(p,k);});});
  this.goalies={home:this.ents[spec.teams.home.goalie],away:this.ents[spec.teams.away.goalie]};
  ['home','away'].forEach(function(k){var g=self.goalies[k];if(g){g.isG=true;g.onIce=true;g.mode='play';}});
  this.periodEnd=1200;this.startPeriod(1);
}
var GP=Game.prototype;
GP.mkEnt=function(p,k){var sp=27+clamp((p.skate||0),-12,25)*0.22;return {id:p.id,team:k,pos:p.pos,num:p.num,name:p.name,last:p.last,style:p.style,shoots:p.shoots,isG:p.pos==='G',vmax:sp,x:0,y:0,vx:0,vy:0,h:0,px:0,py:0,ph:0,tx:0,ty:0,urg:1,role:'',sys:'',pose:'skate',poseT:0,onIce:false,mode:'bench',stun:0,face:null,leaveT:0};};
GP.other=function(k){return k==='home'?'away':'home';};
GP.dir=function(k){var flip=(this.period===2||this.period===4);return (k==='home')!==flip?1:-1;};
GP.toU=function(k,x,y){var d=this.dir(k);return {u:x*d,s:-y*d};};
GP.toW=function(k,u,s){var d=this.dir(k);return {x:u*d,y:-s*d};};
GP.rate=function(){return this.period===4?this.rateOT:this.rateReg;};
GP.next=function(){return this.ev[this.ei]||null;};
GP.say=function(text){this.call=text;this.calls.push({t:this.gt,text:text});if(this.calls.length>60)this.calls.shift();};
GP.skaters=function(k){var self=this;return this.on[k].map(function(id){return self.ents[id];});};
GP.allOn=function(){var out=this.skaters('home').concat(this.skaters('away'));if(this.goalieOn.home&&this.goalies.home)out.push(this.goalies.home);if(this.goalieOn.away&&this.goalies.away)out.push(this.goalies.away);return out;};
GP.boxed=function(k){return this.box.filter(function(b){return b.team===k;}).map(function(b){return b.id;});};
GP.segAt=function(k,t){return this.S.segAt(k,t);};
/* ---------- flow: periods, faceoffs, whistles ---------- */
GP.startPeriod=function(p){this.period=p;this.gt=p===4?3600:(p-1)*1200;this.periodEnd=p===4?this.S.end:p*1200;this.say(p===4?'Overtime: 3-on-3, next goal wins':perLabel(p)+' period underway');this.setupFaceoff({x:0,y:0},true);};
GP.dotFor=function(kind,team,sideY){var d=this.dir(team),y=(sideY==null?(this.R()<.5?1:-1):sgn(sideY))*DOTS.dy;if(kind==='center')return {x:0,y:0};if(kind==='dz')return {x:-DOTS.ez*d,y:y};if(kind==='oz')return {x:DOTS.ez*d,y:y};if(kind==='nzOut')return {x:DOTS.nz*d,y:y};return {x:0,y:0};};
GP.desiredOn=function(k,t){var seg=this.segAt(k,t),bx=this.boxed(k);return seg.sk.filter(function(id){return bx.indexOf(id)<0;});};
GP.setupFaceoff=function(dot,instant){var self=this;this.phase='faceoff';this.phaseT=0;this.foDot=dot;this.D.seq=null;this.D.retr=null;
  var t=this.gt+0.01,e=this.next();if(e&&e.t-this.gt<3)t=e.type==='penalty'?e.t-0.5:e.t;
  ['home','away'].forEach(function(k){var want=self.desiredOn(k,t);self.on[k].slice().forEach(function(id){if(want.indexOf(id)<0)self.offIce(id);});want.forEach(function(id){if(self.on[k].indexOf(id)<0)self.onIce(id,instant);});
    var gOn=!(self.pulled&&self.pulled.team===k);self.goalieOn[k]=gOn;var g=self.goalies[k];if(g){var wasOn=g.onIce&&g.mode==='play';g.onIce=gOn;g.mode=gOn?'play':(g.mode==='leaving'?'leaving':'bench');if(gOn&&(instant||!wasOn)){var n=self.toW(k,-85,0);g.x=n.x;g.y=n.y;}}
    self.assignRoles(k);});
  this.box.forEach(function(b){var e2=self.ents[b.id];var pb=PBOX[b.team];e2.mode='box';e2.onIce=false;e2.x=pb.x+(self.R()-.5)*3;e2.y=pb.y-4;e2.vx=e2.vy=0;});
  var P=this.puck;P.state='dead';P.holder=null;P.x=dot.x;P.y=dot.y;P.z=3;P.vx=P.vy=P.vz=0;
  this.alignFaceoff(dot,instant);
};
GP.onIce=function(id,instant){var e=this.ents[id];if(!e||e.onIce)return;var k=e.team,b=BENCH[k];e.onIce=true;e.mode='play';e.stun=0;e.pose='skate';if(instant||this.phase==='init'){e.x=b.x+(this.R()-.5)*16;e.y=b.y-3;}else{e.x=b.x+(this.R()-.5)*8;e.y=b.y-1;}e.vx=0;e.vy=-4;e.px=e.x;e.py=e.y;if(this.on[k].indexOf(id)<0)this.on[k].push(id);};
GP.offIce=function(id){var e=this.ents[id];if(!e)return;e.onIce=false;if(e.mode!=='box')e.mode='bench';var L=this.on[e.team],i=L.indexOf(id);if(i>=0)L.splice(i,1);if(this.puck.holder===e)this.puck.holder=null;};
GP.alignFaceoff=function(dot,instant){var self=this;
  ['home','away'].forEach(function(k){var d=self.dir(k),sk=self.skaters(k),c=null;var du=dot.x*d,ds=-dot.y*d;
    // the centre (or the best faceoff man on the ice) takes the draw; wingers on the hash marks; D behind
    var cands=sk.filter(function(e){return e.role==='C'||e.role==='BUMP'||e.role==='PF1'||e.role==='W1';});c=cands[0]||sk.filter(function(e){return e.pos==='C';})[0]||sk.filter(function(e){return e.pos!=='D';})[0]||sk[0];
    var wings=sk.filter(function(e){return e!==c&&e.pos!=='D';}),ds2=sk.filter(function(e){return e!==c&&e.pos==='D';});
    var spots=[];if(c)spots.push([c,du-2.2,ds]);
    var wl=[[du-3,ds-14],[du-3,ds+14],[du-12,ds+(ds>0?-20:20)]];wings.forEach(function(w,i){var sp=wl[i%wl.length];var side=w.role==='RW'||w.role==='FR'?1:w.role==='LW'||w.role==='FL'?-1:0;if(side&&i<2)sp=[du-3,ds+side*14];spots.push([w,sp[0],sp[1]]);});
    var dl=[[du-20,ds-11],[du-20,ds+11],[du-28,ds]];ds2.forEach(function(e2,i){var sp=dl[i%dl.length];if(e2.role==='LD'&&i<2)sp=[du-20,ds-11];if(e2.role==='RD'&&i<2)sp=[du-20,ds+11];spots.push([e2,sp[0],sp[1]]);});
    spots.forEach(function(q){var u=Math.max(q[1],-GL+4),w=self.toW(k,u,q[2]);rinkClamp(w,3);q[0].tx=w.x;q[0].ty=w.y;q[0].face={x:dot.x,y:dot.y};if(instant){q[0].x=w.x;q[0].y=w.y;q[0].vx=q[0].vy=0;}q[0].urg=0.85;});
    self.foTaker=self.foTaker||{};self.foTaker[k]=c;});
};
GP.whistle=function(reason,dot,wait){this.phase='whistle';this.phaseT=0;this.nextDot=dot;this.whistleWait=wait||1.1;this.D.seq=null;this.D.retr=null;this.metrics.whistles++;if(this.puck.state!=='held'&&this.puck.state!=='frozen'){this.puck.state='dead';}};
GP.step=function(dt){dt=dt||DT;var self=this;this.t+=dt;this.metrics.steps++;
  this.allEnts().forEach(function(e){e.px=e.x;e.py=e.y;e.ph=e.h;});var P=this.puck;P.px=P.x;P.py=P.y;P.pz=P.z;
  if(this.banner&&this.t>this.banner.until)this.banner=null;
  this.phaseT+=dt;
  if(this.phase==='faceoff')this.stepFaceoff(dt);
  else if(this.phase==='play')this.stepPlay(dt);
  else if(this.phase==='whistle'){if(this.phaseT>this.whistleWait){this.releaseBox();this.setupFaceoff(this.nextDot||{x:0,y:0},false);}else if(this.phaseT>0.45&&this.nextDot){this.alignFaceoff(this.nextDot,false);}else this.glideTargets();}
  else if(this.phase==='goal'){this.celebrate();if(this.replayHold&&!this.replayDone){if(this.phaseT>1.0)this.phaseT=1.0;}else if(this.phaseT>2.8){if(this.period===4||this.gt>=this.S.end-1e-6&&this.spec.ot&&!this.spec.so){this.finish();}else this.setupFaceoff({x:0,y:0},false);}}
  else if(this.phase==='intermission'){if(this.phaseT>(this.quick?0.5:2.2))this.afterIntermission();}
  else if(this.phase==='shootout')this.stepShootout(dt);
  else if(this.phase==='final'){}
  if(this.phase!=='intermission'&&this.phase!=='final'&&this.phase!=='shootout')this.moveAll(dt);
  this.noteReplay();
  this.instrument();
};
GP.allEnts=function(){var o=[];for(var id in this.ents)o.push(this.ents[id]);return o;};
GP.stepFaceoff=function(dt){var self=this;this.alignFaceoff(this.foDot,false);var ready=this.allOn().every(function(e){return e.isG||hyp(e.tx-e.x,e.ty-e.y)<5;});
  if(this.phaseT>0.15&&this.puck.z>0&&(ready&&this.phaseT>(this.quick?0.05:0.7)||this.phaseT>2.0)){this.puck.z=0;this.dropT=this.phaseT;}
  if(this.puck.z===0&&this.phaseT-this.dropT>0.25){var w=this.S.foWinners[this.foIdx++]||'home';this.fo[w]++;this.metrics.faceoffs++;var L=this.other(w),c=this.foTaker[w],oc=this.foTaker[L];
    if(c){c.pose='draw';c.poseT=0.4;}
    var sk=this.skaters(w).filter(function(e){return e!==c;});var tgt=sk.filter(function(e){return e.pos==='D';})[0]||sk[0]||c;var self2=this;
    if(tgt){var dx=tgt.x-this.puck.x,dy=tgt.y-this.puck.y,d=hyp(dx,dy)||1,sp=Math.min(32,10+d*0.9);this.puck.state='loose';this.puck.vx=dx/d*sp;this.puck.vy=dy/d*sp;this.D.retr={team:w,ent:tgt,t:this.t};}
    this.say((c?c.last:this.spec.teams[w].abbr)+' wins the draw'+(oc?' over '+oc.last:''));this.phase='play';this.phaseT=0;}
};
GP.releaseBox=function(){var self=this;this.box=this.box.filter(function(b){if(b.out){var e=self.ents[b.id];e.mode='bench';return false;}return true;});};
GP.glideTargets=function(){this.allOn().forEach(function(e){if(!e.isG){e.tx=e.x+e.vx*0.35;e.ty=e.y+e.vy*0.35;e.urg=0.5;}});};
GP.endPeriod=function(){var p=this.period;this.whistleOnly();
  if(p<3){this.phase='intermission';this.phaseT=0;this.banner={title:'END OF '+perLabel(p).toUpperCase(),sub:this.spec.teams.away.abbr+' '+this.score.away+'  –  '+this.score.home+' '+this.spec.teams.home.abbr,until:this.t+2.2};this.nextPeriod=p+1;this.say('End of the '+perLabel(p)+' period');}
  else if(p===3&&this.spec.ot){this.phase='intermission';this.phaseT=0;this.banner={title:'OVERTIME',sub:'3-on-3 · next goal wins',until:this.t+2.2};this.nextPeriod=4;this.say('Tied after 60 minutes. Overtime.');}
  else if(p===4&&this.spec.so){this.startShootout();}
  else this.finish();};
GP.whistleOnly=function(){this.D.seq=null;this.D.retr=null;this.puck.state='dead';this.puck.holder=null;};
GP.afterIntermission=function(){this.startPeriod(this.nextPeriod);};
GP.finish=function(){if(this.phase==='final')return;this.phase='final';this.phaseT=0;this.done=true;var a=this.spec.teams.away.abbr,h=this.spec.teams.home.abbr;this.banner={title:'FINAL',sub:a+' '+this.score.away+'  –  '+this.score.home+' '+h+(this.spec.so?'  (SO)':this.spec.ot?'  (OT)':''),until:this.t+9999};this.say('Final: '+a+' '+this.score.away+', '+h+' '+this.score.home);};
/* ---------- the clock ---------- */
GP.stepPlay=function(dt){var e=this.next(),rate=this.rate();
  var k=this.elasticFactor(e);this.elastic=k;
  var adv=dt*rate*k,cap=this.periodEnd;var bound=this.nextBoundary();if(bound!=null&&bound<cap)cap=bound;
  var held=false;if(e&&e.t<=this.periodEnd+1e-6){var lim=e.t-0.02;if(lim<cap){cap=lim;}}
  var ng=this.gt+adv;if(ng>=cap){if(e&&cap===e.t-0.02&&ng>cap)held=true;ng=Math.max(this.gt,cap);}this.gt=ng;
  if(held){this.D.hold+=dt;this.metrics.holdTime+=dt;if(this.D.hold>this.metrics.maxHold)this.metrics.maxHold=this.D.hold;}else this.D.hold=0;
  this.boundaries();
  if(this.phase!=='play')return;
  if(this.gt>=this.periodEnd-1e-6&&(!e||e.t>this.periodEnd+1e-6)){this.endPeriod();return;}
  if(this.quick){if(e&&this.gt>=e.t-0.03){this.quickFire(e);}this.quickMotion(dt);return;}
  this.director(dt,e);
  if(this.phase!=='play')return;
  this.updatePuck(dt);
  if(this.phase!=='play')return;
  this.syncPersonnel(e);
  this.computeTargets();
};
GP.nextBoundary=function(){var b=null,gt=this.gt,self=this;this.S.pens.forEach(function(w){var end=w.ppGoalTime!=null?null:w.end;if(end!=null&&end>gt+1e-6&&(b==null||end<b))b=end;});if(this.S.pull&&!this.pulled&&!this.pullDone&&this.S.pull.t0>gt&&(b==null||this.S.pull.t0<b))b=this.S.pull.t0;return b;};
GP.boundaries=function(){var self=this,gt=this.gt;
  this.box.forEach(function(b){if(!b.out&&b.until!=null&&gt>=b.until-1e-6){b.out=true;var e=self.ents[b.id];var pb=PBOX[b.team];e.mode='play';e.onIce=true;e.x=pb.x;e.y=pb.y+1.5;e.vx=0;e.vy=6;if(self.on[b.team].indexOf(b.id)<0)self.on[b.team].push(b.id);self.assignRoles(b.team);self.assignRoles(self.other(b.team));self.say(e.last+' is back from the box. Full strength.');}});
  this.box=this.box.filter(function(b){return !b.out;});
  var pl=this.S.pull;if(pl&&!this.pulled&&!this.pullDone&&gt>=pl.t0-1e-6&&gt<pl.t1){this.pulled={team:pl.team,t1:pl.t1};var g=this.goalies[pl.team];self.goalieOn[pl.team]=false;if(g){g.mode='leaving';}this.say(this.spec.teams[pl.team].abbr+' pull '+(g?g.last:'the goalie')+' for the extra attacker');}
};
GP.elasticFactor=function(e){if(!e||this.quick)return 1;var rate=this.rate(),R=(e.t-this.gt)/rate,seq=this.D.seq;
  if(seq&&seq.e===e&&seq.eta!=null){var left=Math.max(0.05,seq.eta-this.t);return clamp(R/left,0.25,3.2);}
  var need=this.estimateNeed(e);if(need>R)return clamp(R/need,0.3,1);
  // catch-up: stoppages and slow-downs put the broadcast behind the nominal period length; run the clock a bit faster while nothing is due
  var debt=this.t-(this.period===4?3600/this.rateReg+(this.gt-3600)/this.rateOT:this.gt/this.rateReg);if(debt>0)return clamp(1+debt*0.025,1,Math.min(2.2,R/Math.max(need,0.3)));return 1;};
/* ---------- director: plays real hockey toward the next scripted event ---------- */
var SHOT_TYPES={goal:1,save:1};
GP.attacker=function(e){return (e.type==='goal'||e.type==='save'||e.type==='icing'||e.type==='offside')?e.team:this.other(e.team);};
GP.holderTeam=function(){var h=this.puck.holder;return (this.puck.state==='held'&&h)?h.team:null;};
GP.pf=function(k){return this.toU(k,this.puck.x,this.puck.y);};
GP.uOf=function(k,e){return this.toU(k,e.x,e.y);};
GP.strength=function(k){var a=this.on[k].length,b=this.on[this.other(k)].length;if(this.period===4)return 'OT';var bx=this.boxed(k).length,bo=this.boxed(this.other(k)).length;if(bx>bo)return 'PK';if(bo>bx)return 'PP';if(this.pulled&&this.pulled.team===k)return 'EA';return 'ES';};
GP.leadNeeded=function(e,A,pu){var t=e.type;if(t==='hit'||t==='penalty')return 0.9;if(t==='icing')return pu<0?1.5:2.8;if(t==='offside')return 2.8;if(t==='block')return pu>25?1.2:pu>-25?2.6:4.2;var pp=this.strength(A)==='PP'?0.7:0;return (pu>25?1.4:pu>-25?3.2:4.8)+pp;};
GP.estimateNeed=function(e){var A=this.attacker(e),P=this.holderTeam(),pu=this.pf(A).u,st=this.puck.state;var base=(st==='pass'||st==='shot')?0.35:0,shot=!!(SHOT_TYPES[e.type]||e.type==='block');
  if(st==='dead'||st==='frozen')return 2.2;
  if(P===A){
    if(shot){if(pu>50)return base+1.15;if(pu>25)return base+2.5;if(pu>-25)return base+4.8;return base+7.0;}
    if(e.type==='icing')return pu<-8?1.3:pu<18?3.4:6.4;
    if(e.type==='offside')return (pu>8&&pu<24)?1.7:5.0;
    var X=this.ents[e.p];return base+(X&&this.puck.holder?Math.min(3.2,dist(X,this.puck.holder)/Math.max(8,X.vmax)):1.4);}
  if(shot){if(pu>25)return base+5.2;if(pu>-15)return base+7.4;return base+9.0;}
  if(e.type==='icing')return base+(pu<0?3.6:6.6);
  if(e.type==='offside')return base+5.4;
  return base+this.leadNeeded(e,A,pu)+1.6;};
/* how early the team that does NOT have the puck must start giving it up, and how early the team that does must attack the spot */
GP.offStyle=function(k){var s=this.spec.teams[k]&&this.spec.teams[k].strategy;return (s&&s.offensive)||'Balanced';};
GP.setupHorizon=function(e){var pu=this.pf(this.attacker(e)).u,shot=!!(SHOT_TYPES[e.type]||e.type==='block');
  if(shot){if(pu>25)return 4.8;if(pu>-15)return 7.0;return 8.6;}
  if(e.type==='icing')return pu<0?3.4:6.2;
  if(e.type==='offside')return 5.0;
  if(e.type==='hit'||e.type==='penalty'){var X=this.ents[e.p],H=this.puck.holder,d=X&&H?dist(X,H):40;return Math.min(7.2,(d/Math.max(10,(X&&X.vmax)||22))+2.6);}
  return 3.6;};
GP.attackHorizon=function(e){var pu=this.pf(this.attacker(e)).u,shot=!!(SHOT_TYPES[e.type]||e.type==='block');
  if(shot){if(pu>48)return 1.65;if(pu>25)return 2.5;if(pu>-20)return 5.6;return 8.4;}
  if(e.type==='icing')return pu<-8?2.4:6.4;
  if(e.type==='offside')return 5.4;
  if(e.type==='hit'||e.type==='penalty')return 3.6;
  return 2.6;};
GP.director=function(dt,e){var D=this.D,P=this.puck;
  if(e&&D.hold>3.5&&!(D.seq&&D.seq.e===e&&(P.state==='shot'||P.state==='pass'))){this.force(e);return;}
  if(D.seq){this.runSeq(dt);return;}
  if(P.state==='pass'||P.state==='shot'||P.state==='dead'||P.state==='frozen'||P.state==='net'){if(e&&P.state!=='dead'&&P.state!=='frozen'&&P.state!=='net')this.pending(e,this.attacker(e),(e.t-this.gt)/this.rate());return;}
  if(!e){if(P.state==='held')this.filler(dt,null,99);else this.looseLogic(null,null,99);return;}
  var A=this.attacker(e),R=(e.t-this.gt)/this.rate();
  this.pending(e,A,R);
  if(P.state==='loose'){this.looseLogic(e,A,R);return;}
  var H=P.holder;if(!H){P.state='loose';return;}
  if(H.team===A){if(this.tryCommit(e,H,R))return;this.filler(dt,e,R);}
  else{if(R<=this.setupHorizon(e)){this.turnover(H,A,e,R);return;}this.filler(dt,e,R);}
};
/* designated players start moving early: the shooter finds soft ice, the blocker gets in the lane, the hitter closes */
GP.pending=function(e,A,R){var D=this.D,X=this.ents[e.p];D.pend=null;if(!X||X.mode==='box'||X.mode==='bench')return;var on=X.onIce&&X.mode==='play';
  if(SHOT_TYPES[e.type]&&R<8.8&&on)D.pend={kind:'shooter',ent:X,e:e,spot:this.shotSpot(X,e)};
  else if(e.type==='block'&&R<6.2&&on)D.pend={kind:'block',ent:X,e:e};
  else if((e.type==='hit'||e.type==='penalty')&&on&&this.holderTeam()===A){var H=this.puck.holder,d=H?dist(X,H):80;if(H&&R<d/Math.max(8,X.vmax)+3.4)D.pend={kind:'hunt',ent:X,victim:H,e:e};}
  else if(e.type==='offside'&&R<5.2&&this.holderTeam()===A)D.pend={kind:'offside',e:e};
};
GP.shotSpot=function(S,e){var k=S.team,st=this.strength(k),r=S.role,lane=(r==='RW'||r==='FR'||r==='RD')?1:(r==='LW'||r==='FL'||r==='LD')?-1:(this.pf(k).s>=0?-1:1),u,s,R=this.R;
  if(e.type==='save'&&e.sit==='OT'||this.period===4){u=70;s=lane*12;}
  else if(st==='PP'){if(r==='QB'){u=62;s=0;}else if(r==='FL'||r==='FR'){u=67;s=lane*21;}else if(r==='BUMP'){u=73;s=3*lane;}else{u=83;s=2*lane;}}
  else if(S.pos==='D'&&!(e.type==='goal'&&S.style==='offensive'&&R()<.3)){u=61;s=lane*13;}
  else if(S.style==='grinder'){u=82;s=lane*3;}
  else if(S.style==='sniper'){u=67;s=lane*19;}
  else{u=72;s=lane*7;}
  return this.toW(k,u,s);};
GP.tryCommit=function(e,H,R){var S=this.ents[e.p];if(e.type==='goal'||e.type==='save')return this.commitShot(e,H,R,S);if(e.type==='block')return this.commitBlock(e,H,R,S);if(e.type==='hit'||e.type==='penalty')return this.commitContact(e,H,R,S);if(e.type==='icing')return this.commitIcing(e,H,R);if(e.type==='offside')return this.commitOffside(e,H,R);return false;};
GP.netW=function(k){return {x:GL*this.dir(k),y:0};};
GP.stick=function(e){var s=e.shoots==='R'?1:-1,c=Math.cos(e.h),n=Math.sin(e.h);return {x:e.x+c*2.2-n*0.9*s,y:e.y+n*2.2+c*0.9*s};};
GP.commitShot=function(e,H,R,S){var A=e.team;if(!S||!S.onIce||S.mode!=='play')return false;var hu=this.uOf(A,H).u;
  var ot=this.period===4;if(hu<(ot?18:26)){if(!(R<0.3&&hu>-5&&H===S))return false;}
  var net=this.netW(A),style=this.shotStyle(S,e);
  if(H===S){var sp=style.speed,fl=dist(S,net)/sp,need=fl+0.24;if(R>need+0.04)return false;this.D.seq={kind:'shot',e:e,S:S,stage:'windup',timer:0.24,style:style,eta:this.t+need};S.pose='windup';S.poseT=0.3;return true;}
  var spot=this.D.pend&&this.D.pend.ent===S?this.D.pend.spot:{x:S.x,y:S.y};var dS=dist(S,spot);
  var oneT=style.oneTimer,tip=style.tip,pd=dist(H,spot),psp=clamp(34+pd*1.05,42,84),tp=pd/psp,hold=oneT||tip?0:0.3,fl=dist(spot,net)/style.speed,need=tp+hold+fl+0.06;
  if(R>need+0.04)return false;if(dS>12&&R>0.12)return false;
  var su=this.uOf(A,spot),hs=this.uOf(A,H),cross=(sgn(su.s)!==sgn(hs.s))&&Math.abs(su.s)>7&&Math.abs(hs.s)>7&&su.u>55;
  this.D.seq={kind:'passShot',e:e,S:S,passer:H,stage:'pass',style:style,oneT:oneT,tip:tip,cross:cross,eta:this.t+need};
  this.pass(H,S,{target:spot,speed:cross?Math.max(psp,74):psp,tip:tip});if(cross)this.metrics.crossSeam++;return true;};
GP.shotStyle=function(S,e){var k=S.team,st=this.strength(k),R=this.R,r=S.role,ot=0.32,tip=false,sp=98,kind='wrist';
  if(st==='PP'&&(r==='FL'||r==='FR'))ot=0.82;else if(S.style==='sniper')ot=0.7;else if(S.pos==='D')ot=0.5;
  if(S.style==='grinder'||r==='NET'){ot=0.1;if(e.type==='goal'&&R()<0.55)tip=true;else if(R()<0.25)tip=true;}
  var oneTimer=!tip&&R()<ot;if(oneTimer){sp=122;kind='one-timer';}else if(tip){sp=78;kind='tip';}else if(S.pos==='D'){sp=118;kind='slap shot';}else if(R()<.4){sp=105;kind='snap shot';}
  return {oneTimer:oneTimer,tip:tip,speed:sp,kind:kind};};
GP.commitBlock=function(e,H,R,B){var A=H.team;if(!B||!B.onIce)return false;var hu=this.uOf(A,H).u;if(hu<26)return false;
  var net=this.netW(A),bp={x:lerp(H.x,net.x,0.38),y:lerp(H.y,net.y,0.38)};var need=0.22+dist(H,bp)/110;if(R>need+0.04)return false;if(dist(B,bp)>18&&R>0.12)return false;
  this.D.seq={kind:'block',e:e,S:H,B:B,stage:'windup',timer:0.22,eta:this.t+need};H.pose='windup';H.poseT=0.3;return true;};
GP.commitContact=function(e,H,R,X){if(!X||!X.onIce)return false;var d=dist(X,H),need=Math.max(0.1,(d-3)/(X.vmax*1.1));if(R>need+0.05)return false;this.D.seq={kind:'contact',e:e,X:X,V:H,eta:this.t+need};return true;};
GP.commitIcing=function(e,H,R){var hu=this.uOf(H.team,H).u;if(hu>-3)return false;var travel=(GL-hu)/88;if(R>travel+0.05)return false;
  var w=this.toW(H.team,98,this.uOf(H.team,H).s>0?18:-18),d=hyp(w.x-H.x,w.y-H.y)||1;var P=this.puck;P.state='loose';P.holder=null;P.vx=(w.x-H.x)/d*90;P.vy=(w.y-H.y)/d*90;P.icing={team:H.team};this.D.seq={kind:'icing',e:e,team:H.team,eta:this.t+travel};this.say(H.last+' fires it the length of the ice');return true;};
GP.commitOffside=function(e,H,R){var k=H.team,hu=this.uOf(k,H).u;if(hu<8||hu>24)return false;if(R>1.4)return false;var self=this,W=this.skaters(k).filter(function(x){return x!==H&&x.mode==='play';}).sort(function(a,b){return self.uOf(k,b).u-self.uOf(k,a).u;})[0];if(!W||this.uOf(k,W).u<hu-8)return false;this.D.seq={kind:'offside',e:e,H:H,W:W,eta:this.t+Math.max(0.4,(26-hu)/H.vmax)};return true;};
GP.runSeq=function(dt){var q=this.D.seq,P=this.puck;if(!q)return;
  if(q.kind==='shot'||q.kind==='block'){if(q.stage==='windup'){q.timer-=dt;if(q.timer<=0){q.stage='flight';if(q.kind==='shot')this.shoot(q.S,q.e,q.style);else this.shootAtBlocker(q.S,q.B,q.e);}}return;}
  if(q.kind==='passShot'){if(q.stage==='hold'){q.timer-=dt;if(q.timer<=0){q.stage='flight';this.shoot(q.S,q.e,q.style);}}return;}
  if(q.kind==='contact'){var X=q.X,V=q.V;if(P.holder!==V&&P.state==='held'){q.V=V=P.holder;}X.tx=V.x+V.vx*0.15;X.ty=V.y+V.vy*0.15;X.urg=this.D.hold>0?1.45:1.2;if(dist(X,V)<3.6||(this.D.hold>1.2&&dist(X,V)<7))this.contact(q);return;}
  if(q.kind==='steal'){var X2=q.X,V2=P.holder;if(!V2||V2.team===X2.team){this.D.seq=null;return;}X2.tx=V2.x+V2.vx*0.1;X2.ty=V2.y+V2.vy*0.1;X2.urg=1.38;var sd=dist(X2,V2);if(sd<24)V2.urg=Math.min(V2.urg||1,0.52);if(sd<3.5||(this.D.hold>0.7&&sd<8)){X2.pose='poke';X2.poseT=0.35;this.give(X2);this.say(X2.last+' strips '+V2.last+' of the puck');this.D.seq=null;}return;}
  if(q.kind==='offside'){var H=q.H,W=q.W,k=H.team;var wt=this.toW(k,32,this.uOf(k,W).s);W.tx=wt.x;W.ty=wt.y;W.urg=1.3;var ht=this.toW(k,30,this.uOf(k,H).s);H.tx=ht.x;H.ty=ht.y;if(this.uOf(k,H).u>=25.2&&(this.uOf(k,W).u>25.5||this.D.hold>0.8&&this.uOf(k,W).u>22)){if(this.uOf(k,W).u<=25.5){var wq=this.uOf(k,W);var ww=this.toW(k,26.5,wq.s);W.x=lerp(W.x,ww.x,0.5);W.y=lerp(W.y,ww.y,0.5);}this.fire(q.e);this.say('Offside. '+W.last+' was over the line before the puck.');this.whistle('offside',this.dotFor('nzOut',k,H.y));}else if(this.puck.holder!==H)this.D.seq=null;return;}
  if(q.kind==='icing'){return;}
};
GP.contact=function(q){var X=q.X,V=q.V,e=q.e,P=this.puck;var dx=V.x-X.x,dy=V.y-X.y,d=hyp(dx,dy)||1;
  if(e.type==='hit'){V.stun=0.75;V.vx+=dx/d*9;V.vy+=dy/d*9;V.pose='hit';V.poseT=0.75;X.pose='check';X.poseT=0.5;this.fire(e);this.say('HIT! '+X.last+' finishes his check on '+V.last);
    var n=this.next(),nA=n?this.attacker(n):null;if(P.holder===V&&(nA===X.team||this.R()<.35)){P.state='loose';P.holder=null;P.vx=dx/d*14+(this.R()-.5)*10;P.vy=dy/d*14+(this.R()-.5)*10;this.D.retr=null;}}
  else{V.stun=1.1;V.pose='fall';V.poseT=1.1;X.pose='check';X.poseT=0.5;this.fire(e);if(P.holder===V){P.state='loose';P.holder=null;P.vx=dx/d*8;P.vy=dy/d*8;}this.say('Penalty: '+X.last+', '+e.infraction.toLowerCase()+' on '+V.last);this.penaltyCall(e,X);}
  this.D.seq=null;};
GP.penaltyCall=function(e,X){var k=e.team,dot=this.dotFor('dz',k,this.puck.y);this.box.push({id:X.id,team:k,until:e.ppGoalTime!=null?null:e.end,ppGoal:e.ppGoalTime});X.mode='toBox';this.pim[k]+=2;this.banner={title:'PENALTY',sub:X.name+' · '+e.infraction+' · 2:00',until:this.t+2};this.whistle('penalty',dot,1.4);};
GP.force=function(e){this.metrics.forced++;this.D.seq=null;this.D.hold=0;this.D.pend=null;var X=this.ents[e.p],A=this.attacker(e),P=this.puck,self=this;
  if(X&&!X.onIce&&e.type!=='penalty'){this.instantSwapIn(X);}
  if(e.type==='goal'||e.type==='save'){var S=X;if(!S){this.fire(e);return;}var spot=this.shotSpot(S,e);S.x=lerp(S.x,spot.x,.7);S.y=lerp(S.y,spot.y,.7);this.give(S);this.shoot(S,e,{speed:110,kind:'shot'});return;}
  if(e.type==='block'){var sh=this.skaters(A)[0];if(sh&&X){this.give(sh);var net=this.netW(A);X.x=lerp(sh.x,net.x,.4);X.y=lerp(sh.y,net.y,.4);this.shootAtBlocker(sh,X,e);return;}}
  if((e.type==='hit'||e.type==='penalty')&&X){var V=P.holder&&P.holder.team===A?P.holder:this.skaters(A)[0];if(V){X.x=V.x-2.5;X.y=V.y;this.contact({X:X,V:V,e:e});return;}}
  this.fire(e);if(e.type==='icing'){this.whistle('icing',this.dotFor('dz',e.team));}else if(e.type==='offside'){this.whistle('offside',this.dotFor('nzOut',e.team));}else if(e.type==='penalty'&&X){this.penaltyCall(e,X);}};
GP.instantSwapIn=function(X){var k=X.team,out=this.skaters(k).filter(function(o){return o.pos===X.pos;})[0]||this.skaters(k)[0];var x=out?out.x:0,y=out?out.y:0;if(out)this.offIce(out.id);this.onIce(X.id,false);X.x=x;X.y=y;this.metrics.instantSwaps++;this.assignRoles(k);};
/* ---------- puck actions ---------- */
GP.give=function(ent){var P=this.puck;P.state='held';P.holder=ent;P.vz=0;P.z=0;ent.decT=0.35+this.R()*0.5;ent.carry=null;this.D.retr=null;this.lastPoss=ent.team;};
GP.pass=function(from,to,o){o=o||{};var P=this.puck,st=this.stick(from),tg=o.target||{x:to.x+to.vx*0.4,y:to.y+to.vy*0.4};tg={x:tg.x,y:tg.y};rinkClamp(tg,3);var d=hyp(tg.x-st.x,tg.y-st.y),sp=o.speed||clamp(34+d*1.05,40,82);
  P.state='pass';P.holder=null;P.pass={from:{x:st.x,y:st.y},to:tg,t0:this.t,T:Math.max(0.12,d/sp),recv:to,tip:o.tip,intercept:o.intercept,lift:o.lift};to.recvT=P.pass.T;to.recvAt=tg;from.pose='pass';from.poseT=0.25;this.metrics.passes++;if(from.team==='home')this.metrics.passHome++;else this.metrics.passAway++;this.lastPasser=from;};
GP.shoot=function(S,e,style){var P=this.puck,A=S.team,dir=this.dir(A),G=this.goalieOn[this.other(A)]?this.goalies[this.other(A)]:null,st=this.stick(S),tgt;
  if(e.type==='goal'){var gs=G?this.uOf(A,G).s:0,side=gs>0.3?-1:gs<-0.3?1:(this.R()<.5?-1:1);tgt=this.toW(A,GL+1.2,side*(1.9+this.R()*0.8));tgt.z=this.R()<.5?0.35:2.6+this.R()*0.9;}
  else if(G){var gu=this.uOf(A,G);tgt=this.toW(A,gu.u-0.6,gu.s+(this.R()-.5)*1.6);tgt.z=0.4+this.R()*2.2;}
  else{tgt=this.toW(A,GL-1,0);tgt.z=0.5;}
  var d=hyp(tgt.x-st.x,tgt.y-st.y),T=Math.max(0.1,d/(style.speed||100));P.state='shot';P.holder=null;P.shot={from:{x:st.x,y:st.y},to:tgt,t0:this.t,T:T,e:e,S:S,style:style};S.pose='shoot';S.poseT=0.35;this.metrics.shotsTaken++;if(style.oneTimer)this.metrics.oneTimers++;
  if(this.D.seq&&this.D.seq.e===e)this.D.seq.eta=this.t+T;else this.D.seq={kind:'flight',e:e,eta:this.t+T};
  if(G&&!(e.type==='goal'&&style.oneTimer&&this.D.seq&&this.D.seq.cross)){G.pose='butterfly';G.poseT=0.8;}
  var tag=style.kind||'shot';this.say(S.last+' '+(style.tip?'tips it':tag==='one-timer'?'one-timer':'with the '+tag));};
GP.shootAtBlocker=function(S,B,e){var P=this.puck,st=this.stick(S),net=this.netW(S.team),bp={x:B.x,y:B.y};var d=hyp(bp.x-st.x,bp.y-st.y),T=Math.max(0.08,d/105);P.state='shot';P.holder=null;P.shot={from:{x:st.x,y:st.y},to:{x:bp.x,y:bp.y,z:0.6},t0:this.t,T:T,e:e,S:S,B:B,style:{kind:'shot'}};S.pose='shoot';S.poseT=0.3;B.pose='block';B.poseT=0.6;if(this.D.seq)this.D.seq.eta=this.t+T;this.say(S.last+' shoots from the point');this.metrics.points++;};
GP.turnover=function(H,A,e,R){var k=H.team,opp=this.skaters(A).filter(function(x){return x.mode==='play'&&!x.stun;});if(!opp.length)return;
  var near=opp.slice().sort(function(a,b){return dist(a,H)-dist(b,H);})[0],dn=dist(near,H);
  // close enough to finish a check; otherwise put the puck on the attacker's stick so the scheduled play can start
  if(dn<22){this.D.seq={kind:'steal',X:near,eta:this.t+Math.max(0.12,(dn-3)/(near.vmax*1.25))};return;}
  var px=near.x+(H.x-near.x)*0.22,py=near.y+(H.y-near.y)*0.22,P=this.puck,dx=px-H.x,dy=py-H.y,d=hyp(dx,dy)||1,sp=clamp(44+dn*0.32,46,80);
  P.state='loose';P.holder=null;P.vx=dx/d*sp;P.vy=dy/d*sp;this.D.retr={team:A,ent:near,t:this.t};this.D.retrPref=A;H.pose='pass';H.poseT=0.25;this.say(near.last+' steps up and takes it from '+H.last);};
GP.wide=function(H){var k=H.team,net=this.netW(k),st=this.stick(H),side=this.R()<.5?1:-1,tg=this.toW(k,GL+0.5,side*(5+this.R()*4));var d=hyp(tg.x-st.x,tg.y-st.y)||1,sp=95;var P=this.puck;P.state='loose';P.holder=null;P.vx=(tg.x-st.x)/d*sp;P.vy=(tg.y-st.y)/d*sp;this.D.retr=null;H.pose='shoot';H.poseT=0.3;this.metrics.wideShots++;if(H.team==='home')this.metrics.wideHome++;else this.metrics.wideAway++;this.say(H.last+' fires wide');};
GP.dump=function(H,toTeam){var k=H.team,side=this.uOf(k,H).s>=0?1:-1,tg=this.toW(k,96,side*30),d=hyp(tg.x-H.x,tg.y-H.y)||1,P=this.puck;P.state='loose';P.holder=null;P.vx=(tg.x-H.x)/d*62;P.vy=(tg.y-H.y)/d*62;this.D.retr=null;this.D.retrPref=toTeam;H.pose='pass';H.poseT=0.25;this.metrics.dumpIns++;this.say(H.last+' dumps it in');};
GP.clear=function(H,toTeam){var k=H.team,tg=this.toW(k,10,(this.R()-.5)*50),d=hyp(tg.x-H.x,tg.y-H.y)||1,P=this.puck;P.state='loose';P.holder=null;P.vx=(tg.x-H.x)/d*55;P.vy=(tg.y-H.y)/d*55;this.D.retr=null;this.D.retrPref=toTeam;H.pose='pass';H.poseT=0.25;this.say(H.last+' clears the zone');};
GP.clearPuck=function(H){var k=H.team,tg=this.toW(k,95,(this.R()-.5)*40),d=hyp(tg.x-H.x,tg.y-H.y)||1,P=this.puck;P.state='loose';P.holder=null;P.vx=(tg.x-H.x)/d*80;P.vy=(tg.y-H.y)/d*80;this.D.retr=null;this.D.retrPref=this.other(k);H.pose='pass';H.poseT=0.25;this.say(H.last+' clears it down the ice');};
GP.looseLogic=function(e,A,R){var P=this.puck,D=this.D,self=this;
  if(!D.retr||!D.retr.ent||!D.retr.ent.onIce||D.retr.ent.mode!=='play'||D.retr.ent.stun>0){var team;if(e&&R<this.setupHorizon(e)+1.6)team=A;else if(D.retrPref){team=D.retrPref;}else{var all=this.skaters('home').concat(this.skaters('away')).filter(function(x){return x.mode==='play'&&!x.stun;});all.sort(function(a,b){return dist(a,P)-dist(b,P);});team=all[0]?all[0].team:'home';if(all[1]&&this.R()<.3)team=all[1].team;}
    var cands=this.skaters(team).filter(function(x){return x.mode==='play'&&!x.stun;}).sort(function(a,b){return dist(a,P)-dist(b,P);});
    if(e&&SHOT_TYPES[e.type]&&team===A&&R<6.5){var S=this.ents[e.p];if(S&&S.onIce&&S.mode==='play'&&!S.stun&&dist(S,P)<60)cands=[S].concat(cands.filter(function(x){return x!==S;}));}
    D.retr=cands[0]?{team:team,ent:cands[0],t:this.t}:null;D.retrPref=null;}
  var r=D.retr&&D.retr.ent;if(!r)return;var sp=hyp(P.vx,P.vy),lead=Math.min(0.6,dist(r,P)/Math.max(10,r.vmax));r.tx=P.x+P.vx*lead*0.6;r.ty=P.y+P.vy*lead*0.6;r.urg=1.05;
  if(dist(this.stick(r),P)<3.2||dist(r,P)<2.6){this.give(r);if(P.icing&&this.uOf(P.icing.team,r).u<GL)P.icing=null;}};
/* ---------- filler: what the puck carrier does while there is time before the next scripted event ---------- */
GP.zoneU=function(u){return u>25?'O':u<-25?'D':'N';};
GP.lane=function(e){var r=e.role;return (r==='RW'||r==='FR'||r==='RD'||r==='W2')?1:(r==='LW'||r==='FL'||r==='LD'||r==='W1')?-1:0;};
GP.decInterval=function(H){var b=H.style==='playmaker'?0.75:H.style==='grinder'?1.25:1.0,off=this.offStyle(H.team);if(off==='Shoot first')b*=0.62;else if(off==='Possession')b*=0.88;if(this.strength(H.team)==='PP')b*=0.85;return b*(0.75+this.R()*0.6);};
GP.openness=function(Q){var opp=this.skaters(this.other(Q.team)),m=99;opp.forEach(function(o){var d=dist(o,Q);if(d<m)m=d;});return m;};
GP.laneClear=function(A,B){var opp=this.skaters(this.other(A.team)),ax=B.x-A.x,ay=B.y-A.y,L2=ax*ax+ay*ay||1;for(var i=0;i<opp.length;i++){var o=opp[i],t=clamp(((o.x-A.x)*ax+(o.y-A.y)*ay)/L2,0,1),d=hyp(o.x-(A.x+ax*t),o.y-(A.y+ay*t));if(d<3.5&&t>0.1&&t<0.9)return false;}return true;};
GP.pickMate=function(H,score){var self=this,best=null,bv=-1e9;this.skaters(H.team).forEach(function(Q){if(Q===H||Q.mode!=='play'||Q.stun>0)return;var v=score(Q);if(v==null)return;v+=Math.min(12,self.openness(Q))*0.6+self.R()*3;if(!self.laneClear(H,Q))v-=8;var d=dist(H,Q);if(d>90)v-=10;if(d<8)v-=6;if(v>bv){bv=v;best=Q;}});return best;};
GP.filler=function(dt,e,R){var H=this.puck.holder;if(!H)return;var k=H.team;H.decT=(H.decT==null?0.45:H.decT)-dt;var decide=H.decT<=0;if(decide)H.decT=this.decInterval(H);
  var hu=this.uOf(k,H),z=this.zoneU(hu.u),st=this.strength(k),A=e?this.attacker(e):null,needMe=!e||A===k,spare=!e||R>(this.leadNeeded(e,A,0)+3.2),self=this,R2=this.R();
  if(needMe&&e&&R<this.attackHorizon(e)){if(this.prepAttack(H,e,R,decide))return;}
  if(!decide)return;
  if(st==='PK'&&z!=='O'&&(!needMe||R2<.55)){this.clearPuck(H);return;}
  if(e&&e.type==='icing'&&A===k&&hu.u>-3){var dm=this.pickMate(H,function(Q){var u=self.uOf(k,Q).u;return u<hu.u-10?10:null;});if(dm&&R2<.6){this.pass(H,dm);return;}H.carry={u:-40,s:hu.s};return;}
  if(e&&e.type==='offside'&&A===k&&hu.u>24){H.carry={u:5,s:hu.s};return;}
  if(z==='D')return this.breakoutDecision(H,hu,needMe,spare,R2);
  if(z==='N')return this.neutralDecision(H,hu,needMe,spare,R2,e,R);
  return this.ozDecision(H,hu,needMe,spare,R2,st,e,R);};
/* steer the puck toward the scheduled shooter, lane or goal line while there is still time to arrive without a teleport */
GP.prepAttack=function(H,e,R,decide){var k=H.team,style=this.offStyle(k),poss=style==='Possession',shoot=style==='Shoot first',hu=this.uOf(k,H),self=this,S=this.ents[e.p];
  if(e.type==='icing'){if(hu.u>-6){if(decide){var back=this.pickMate(H,function(Q){return self.uOf(k,Q).u<hu.u-12?8:null;});if(back&&(poss||this.R()<0.45)){this.pass(H,back);return true;}}H.carry={u:-55,s:hu.s*0.45};return true;}return false;}
  if(e.type==='offside'){var W=this.skaters(k).filter(function(x){return x!==H&&x.mode==='play';}).sort(function(a,b){return self.uOf(k,b).u-self.uOf(k,a).u;})[0];
    if(W){var wt=this.toW(k,34,this.uOf(k,W).s||(this.R()<.5?10:-10));W.tx=wt.x;W.ty=wt.y;W.urg=1.28;}
    if(hu.u>26){H.carry={u:14,s:hu.s};return true;}if(hu.u<6){H.carry={u:18,s:clamp(hu.s,-14,14)};return true;}H.carry={u:21,s:clamp(hu.s,-12,12)};return true;}
  if(e.type==='hit'||e.type==='penalty'){var Xh=this.ents[e.p];if(Xh&&Xh.onIce&&dist(Xh,H)<28)H.urg=Math.min(H.urg||1,0.7);return false;}
  var shot=e.type==='goal'||e.type==='save',block=e.type==='block';if(!(shot||block))return false;
  if(hu.u<22){if(decide&&shoot&&hu.u>-5&&R>2.6&&this.R()<0.7){this.wide(H);this.say(H.last+' shoots it in');return true;}
    if(shoot&&R>2.65){H.carry={u:Math.min(16,hu.u+14),s:clamp(hu.s*0.5,-14,14)};return true;}
    if(decide){var up=this.pickMate(H,function(Q){var u=self.uOf(k,Q).u;if(u<hu.u+10)return null;var v=(u-hu.u)*0.25;if(S&&Q===S)v+=16;if(Q.pos!=='D')v+=poss?7:2;return v;});if(up&&(poss?this.R()<0.82:this.R()<0.28)){this.pass(H,up);return true;}}
    H.carry={u:Math.min(poss?86:76,hu.u+(poss?32:36)),s:shoot?clamp(hu.s*0.35,-12,12):((this.lane(H)||sgn(hu.s||1))*(poss?22:16))};return true;}
  if(block){if(decide&&H.pos!=='D'){var dman=this.pickMate(H,function(Q){return Q.pos==='D'?9:null;});if(dman&&this.R()<(poss?0.85:0.5)){this.pass(H,dman);return true;}}H.carry={u:61,s:clamp(hu.s,-16,16)};return true;}
  if(decide&&shoot&&R>3.25&&hu.u>42&&this.R()<0.74){this.wide(H);this.say(H.last+' shoots first');return true;}
  if(decide&&poss&&R>2.1&&hu.u>50&&this.R()<0.8){var cyc=this.pickMate(H,function(Q){var q=self.uOf(k,Q);if(Q===S)return q.u>40?7:null;return q.u>58?8:q.u>48?5:null;});if(cyc){this.pass(H,cyc);return true;}}
  if(S&&S.onIce&&S.mode==='play'&&S!==H){var su=this.uOf(k,S),spot=this.shotSpot(S,e),d=dist(H,S),passOk=R>1.7&&d<78&&su.u>38&&(this.laneClear(H,S)||d<28);
    if(decide&&passOk&&(poss||shoot||this.R()<0.55)){this.pass(H,S,{target:dist(S,spot)<16?spot:{x:S.x+S.vx*0.15,y:S.y+S.vy*0.15}});return true;}
    if(decide&&poss&&R>2.3&&!passOk){var extra=this.pickMate(H,function(Q){if(Q===S)return null;var q=self.uOf(k,Q);return q.u>52?6:null;});if(extra&&this.R()<0.7){this.pass(H,extra);return true;}}
    H.carry={u:Math.max(hu.u,Math.min(70,Math.max(su.u,62))),s:su.s*0.7};return true;}
  var spot2=S?this.shotSpot(S,e):this.toW(k,70,0),w=this.toU(k,spot2.x,spot2.y);
  if(decide&&poss&&R>2.5&&hu.u>58&&this.R()<0.6){var sw=this.pickMate(H,function(Q){var q=self.uOf(k,Q);return q.u>55&&Math.abs(q.s-hu.s)>8?6:null;});if(sw){this.pass(H,sw);return true;}}
  H.carry={u:w.u,s:w.s};return true;};
GP.breakoutDecision=function(H,hu,needMe,spare,R2){var k=H.team,self=this,style=this.offStyle(k),poss=style==='Possession',shoot=style==='Shoot first',press=this.skaters(this.other(k)).filter(function(o){return dist(o,H)<14;}).length;this.metrics.breakouts++;
  if(press>=2&&R2<(poss?0.62:0.45)){var w=this.pickMate(H,function(Q){var q=self.uOf(k,Q);return (Q.role==='LW'||Q.role==='RW')&&q.u>hu.u?10:null;});if(w){this.rim(H,w);return;}}
  if(H.pos==='D'&&R2<(poss?0.55:shoot?0.16:0.3)){var p2=this.pickMate(H,function(Q){return Q.pos==='D'?8:null;});if(p2){this.pass(H,p2);this.say(H.last+' D-to-D to '+p2.last);return;}}
  var opt=this.pickMate(H,function(Q){var q=self.uOf(k,Q);if(q.u<hu.u-6&&Q.pos!=='D')return null;var v=(q.u-hu.u)*0.2;if(Q.role==='C'||Q.role==='BUMP')v+=6;if(Q.role==='LW'||Q.role==='RW'||Q.role==='FL'||Q.role==='FR')v+=5;if(poss)v+=3;return v;});
  if(opt&&(press>0||R2<(poss?0.86:shoot?0.38:0.65))){this.pass(H,opt);this.say(H.last+(opt.role==='C'?' hits the centre swinging low, ':' up to ')+opt.last);return;}
  H.carry={u:hu.u+30,s:(this.lane(H)||sgn(hu.s))*(shoot?16:24)};this.say(H.last+' carries it out');};
GP.rim=function(H,W){var P=this.puck,st=this.stick(H),k=H.team,wq=this.uOf(k,W),tg=this.toW(k,wq.u+4,sgn(wq.s)*41),d=hyp(tg.x-st.x,tg.y-st.y)||1;P.state='loose';P.holder=null;P.vx=(tg.x-st.x)/d*58;P.vy=(tg.y-st.y)/d*58;this.D.retr={team:k,ent:W,t:this.t};H.pose='pass';H.poseT=0.25;this.say(H.last+' rims it around the wall to '+W.last);};
GP.neutralDecision=function(H,hu,needMe,spare,R2,e,R){var k=H.team,self=this,o=this.other(k),strat=this.spec.teams[k].strategy||{},style=strat.offensive||'Balanced',poss=style==='Possession',shoot=style==='Shoot first';
  var wall=this.skaters(o).filter(function(x){var q=self.uOf(k,x);return q.u>hu.u&&q.u<hu.u+32&&Math.abs(q.s-hu.s)<30;}).length;
  if(wall>=3&&spare&&R2<(poss?0.62:0.4)){var dm=this.pickMate(H,function(Q){return (Q.pos==='D'&&self.uOf(k,Q).u<hu.u-8)?10:null;});if(dm){this.pass(H,dm);this.metrics.regroups++;this.say('Regroup. '+H.last+' goes back to '+dm.last);return;}}
  var needControlled=needMe&&e&&(SHOT_TYPES[e.type]||e.type==='block'||e.type==='offside')&&R<3.15;
  if(hu.u>8){var dumpP=(wall>=2?0.42:0.1)+(style==='Crash the net'?0.12:0)+(shoot?0.32:0)+(H.style==='grinder'?0.12:0);if(poss)dumpP=Math.max(0.02,dumpP-0.3);if(needControlled)dumpP=0;
    if(R2<dumpP&&(spare||!needMe||(e&&R>4.2))){this.dump(H,needMe?k:null);this.D.retrPref=k;var ch=this.skaters(k).filter(function(x){return x!==H&&x.pos!=='D';}).sort(function(a,b){return dist(b,H)-dist(a,H);})[0];if(ch)this.D.retr={team:k,ent:ch,t:this.t};this.say(H.last+' dumps it in and they chase');return;}}
  if(shoot&&hu.u>14&&(!needMe||!e||R>3.6)&&R2<0.48){this.wide(H);this.say(H.last+' fires from outside the zone');return;}
  var st=this.pickMate(H,function(Q){var q=self.uOf(k,Q);if(q.u<hu.u+4)return null;return 4+(q.u-hu.u)*0.15+(poss?2:0);});
  if(st&&R2<(poss?0.72:shoot?0.18:0.4)){this.pass(H,st);return;}
  H.carry={u:hu.u+28,s:(this.lane(H)||sgn(hu.s||1))*(shoot?12:18+R2*10)};};
GP.ozDecision=function(H,hu,needMe,spare,R2,st,e,R){var k=H.team,self=this,strat=this.spec.teams[k].strategy||{},style=strat.offensive||'Balanced',poss=style==='Possession',shoot=style==='Shoot first';
  if(st==='PP'){var m=this.pickMate(H,function(Q){var r=Q.role,hr=H.role;if(hr==='QB')return (r==='FL'||r==='FR')?10:r==='BUMP'?5:null;if(hr==='FL'||hr==='FR')return r==='QB'?9:r==='BUMP'?6:(r==='FL'||r==='FR')?2:r==='NET'?3:null;if(hr==='BUMP')return (r==='QB'||r==='FL'||r==='FR')?8:null;return r==='QB'||r==='BUMP'?8:5;});if(m){this.pass(H,m);return;}H.carry={u:hu.u,s:hu.s*0.8};return;}
  var safeMiss=!needMe||!e||R>3.35;
  if(shoot&&hu.u>52&&safeMiss&&R2<0.78){this.wide(H);this.say(H.last+' lets it go');return;}
  if(!shoot&&spare&&R2<0.05&&!needMe){this.wide(H);return;}
  if(H.pos==='D'){var d2d=poss?0.74:shoot?0.14:0.35;if(R2<d2d){var p2=this.pickMate(H,function(Q){return Q.pos==='D'?8:null;});if(p2){this.pass(H,p2);this.say(H.last+' moves it D-to-D');return;}}
    if(R2<(poss?0.82:shoot?0.28:0.7)){var low=this.pickMate(H,function(Q){var q=self.uOf(k,Q).u;return q>hu.u+6?6:null;});if(low){this.pass(H,low);return;}}
    if(shoot&&hu.u>52&&safeMiss&&R2<0.55){this.wide(H);this.say(H.last+' fires from the point');return;}
    H.carry={u:shoot?63:58,s:(this.R()-.5)*(shoot?14:28)};return;}
  if(poss&&hu.u>64&&R2<0.78){var pt=this.pickMate(H,function(Q){return Q.pos==='D'?8:self.uOf(k,Q).u<hu.u-4?5:null;});if(pt){this.pass(H,pt);this.say(H.last+' low-to-high to '+pt.last);return;}}
  else if(hu.u>74&&R2<(shoot?0.16:0.48)){var pt2=this.pickMate(H,function(Q){return Q.pos==='D'?7:self.uOf(k,Q).u<hu.u-6?4:null;});if(pt2){this.pass(H,pt2);this.say(H.last+' low-to-high to '+pt2.last);return;}}
  if(R2<(poss?0.88:shoot?0.2:0.58)){var c=this.pickMate(H,function(Q){var q=self.uOf(k,Q);return Q.pos==='D'?(poss?7:4):(q.u>58?6:3);});if(c){this.pass(H,c);return;}}
  if(shoot){var lane=this.lane(H)||sgn(hu.s||1);H.carry={u:67,s:lane*17};this.say(H.last+' drives to a shooting lane');return;}
  var side=sgn(hu.s||1),cyc=poss?(hu.u<84?{u:92,s:side*34}:Math.abs(hu.s)>12?{u:86,s:side*6}:{u:76,s:-side*28}):(hu.u<80?{u:86,s:side*30}:Math.abs(hu.s)>12?{u:93,s:side*6}:{u:84,s:-side*28});
  H.carry=cyc;this.say(H.last+(poss?' keeps it moving down low':hu.u<80?' takes it down the wall':' works it below the goal line'));};
GP.carryTarget=function(H){var k=H.team,q=this.uOf(k,H),c=H.carry;if(!c){var z=this.zoneU(q.u);c=z==='O'?{u:q.u,s:q.s}:{u:q.u+25,s:(this.lane(H)||sgn(q.s))*22};H.carry=c;}
  var tu=c.u,ts=c.s;var mates=this.skaters(k),offside=false;for(var i=0;i<mates.length;i++){var m=mates[i];if(m!==H&&m.mode==='play'&&this.uOf(k,m).u>25.3){offside=true;break;}}
  if(q.u<25&&tu>=24&&offside&&!(this.D.seq&&this.D.seq.kind==='offside')){tu=Math.min(tu,21);}
  if(q.u<25&&tu>=25&&!offside)this._entering=true;
  if(tu>GL+6)tu=GL+6;var w=this.toW(k,tu,ts);rinkClamp(w,3);H.tx=w.x;H.ty=w.y;H.urg=0.86;H.face=null;
  var pd=this.D.pend;if(pd&&pd.kind==='hunt'&&pd.victim===H&&dist(pd.ent,H)<20)H.urg=0.58;
  if(this.D.seq&&this.D.seq.kind==='steal'&&this.D.seq.X&&dist(this.D.seq.X,H)<24)H.urg=0.5;
  if(hyp(H.tx-H.x,H.ty-H.y)<4)H.carry=null;};
/* ---------- puck physics and arrivals ---------- */
GP.updatePuck=function(dt){var P=this.puck;
  if(P.state==='held'){var h=P.holder;if(!h||!h.onIce||h.mode!=='play'){P.state='loose';P.holder=null;return;}var s=this.stick(h);if(this._entering&&this.uOf(h.team,h).u>25){this.metrics.carryIns++;this._entering=false;}P.x=s.x;P.y=s.y;P.z=0;P.vx=h.vx;P.vy=h.vy;return;}
  if(P.state==='pass'){var q=P.pass,u=(this.t-q.t0)/q.T;if(u>=1){P.x=q.to.x;P.y=q.to.y;P.z=0;this.passArrive(q);}else{P.x=lerp(q.from.x,q.to.x,u);P.y=lerp(q.from.y,q.to.y,u);P.z=q.lift?Math.sin(Math.PI*u)*2:0;}return;}
  if(P.state==='shot'){var s2=P.shot,u2=(this.t-s2.t0)/s2.T;if(u2>=1){P.x=s2.to.x;P.y=s2.to.y;P.z=s2.to.z;this.shotArrive(s2);}else{P.x=lerp(s2.from.x,s2.to.x,u2);P.y=lerp(s2.from.y,s2.to.y,u2);P.z=lerp(0.1,s2.to.z,u2)+Math.sin(Math.PI*u2)*0.4;}return;}
  if(P.state==='frozen'){var g=P.holder;if(g){P.x=g.x+Math.cos(g.h)*1.2;P.y=g.y+Math.sin(g.h)*1.2;P.z=0.8;}return;}
  if(P.state==='loose'){P.x+=P.vx*dt;P.y+=P.vy*dt;P.z=Math.max(0,P.z-dt*6);var sp=hyp(P.vx,P.vy);if(sp>0){var ns=Math.max(0,sp-9*dt);P.vx*=ns/sp;P.vy*=ns/sp;}
    var p={x:P.x,y:P.y};if(rinkClamp(p,0.4)){var n=boardNormal(P.x,P.y),vn=P.vx*n.x+P.vy*n.y;if(vn<0){P.vx-=1.6*vn*n.x;P.vy-=1.6*vn*n.y;}P.x=p.x;P.y=p.y;}
    [-1,1].forEach(function(sd){var ax=Math.abs(P.x);if(sgn(P.x)===sd&&ax>GL-0.6&&ax<GL+3.8&&Math.abs(P.y)<3.4){if(ax<GL+0.4&&P.vx*sd>0){P.x=sd*(GL-0.7);P.vx=-P.vx*0.4;}else if(ax>=GL+0.4){if(Math.abs(P.y)>2.6){P.vy=-P.vy*0.5;P.y=sgn(P.y)*3.5;}else{P.x=sd*(GL+4);P.vx=Math.abs(P.vx)*sd*0.4+sd*2;}}}});
    if(P.icing){var ui=this.toU(P.icing.team,P.x,P.y).u;if(ui>GL+0.5&&this.D.seq&&this.D.seq.kind==='icing'){var e=this.D.seq.e;this.fire(e);this.say('Icing on '+this.spec.teams[P.icing.team].abbr);this.whistle('icing',this.dotFor('dz',P.icing.team,P.y));P.icing=null;return;}if(ui>GL+0.5)P.icing=null;}
    if(this.D.seq&&this.D.seq.kind==='icing'&&!P.icing)this.D.seq=null;}};
GP.passArrive=function(q){var r=q.recv,P=this.puck,seq=this.D.seq;var tol=(seq&&seq.kind==='passShot'&&seq.S===r)?15:7;if(r&&r.onIce&&r.mode==='play'&&dist(this.stick(r),P)<tol){if(tol>7&&dist(this.stick(r),P)>5){var dd=dist(r,P)||1,mv=dd-3;r.x+=(P.x-r.x)/dd*mv*0.6;r.y+=(P.y-r.y)/dd*mv*0.6;}
    if(seq&&seq.kind==='passShot'&&seq.S===r){if(seq.oneT||seq.tip){if(seq.tip)this.metrics.tips++;P.holder=r;this.shoot(r,seq.e,seq.style);seq.stage='flight';return;}this.give(r);seq.stage='hold';seq.timer=0.3;return;}
    this.give(r);if(q.intercept){this.D.seq=null;}return;}
  P.state='loose';P.holder=null;var dx=q.to.x-q.from.x,dy=q.to.y-q.from.y,d=hyp(dx,dy)||1;P.vx=dx/d*18;P.vy=dy/d*18;this.metrics.passFail=(this.metrics.passFail||0)+1;if(seq&&seq.kind==='passShot'){this.metrics.psFail=(this.metrics.psFail||0)+1;this.D.seq=null;if(r&&r.onIce&&r.mode==='play')this.D.retr={team:r.team,ent:r,t:this.t};}};
GP.shotArrive=function(q){var e=q.e,P=this.puck,A=q.S.team,o=this.other(A),G=this.goalieOn[o]?this.goalies[o]:null,self=this;this.D.seq=null;
  if(q.B){this.fire(e);this.say('Blocked by '+q.B.last+'!');P.state='loose';P.holder=null;var a=Math.atan2(q.from.y-q.to.y,q.from.x-q.to.x)+(this.R()-.5)*2;P.vx=Math.cos(a)*16;P.vy=Math.sin(a)*16;this.D.retr=null;return;}
  if(e.type==='goal'){var nt=this.toW(A,GL+2.6,this.toU(A,q.to.x,q.to.y).s*0.8);P.state='net';P.x=nt.x;P.y=nt.y;P.z=0.3;this.fire(e);this.onGoal(e,q);return;}
  this.fire(e);if(G){G.pose='save';G.poseT=0.5;}
  if(e.freeze&&G){P.state='frozen';P.holder=G;this.say('Save '+G.last+'. He covers it up.');this.whistle('freeze',this.dotFor('dz',o,q.from.y),1.2);return;}
  var n=this.next(),S2=n&&n.team===A&&SHOT_TYPES[n.type]?this.ents[n.p]:null;P.state='loose';P.holder=null;
  if(S2&&S2.onIce&&S2.mode==='play'&&(n.t-this.gt)/this.rate()<1.9&&S2!==q.S||S2&&S2===q.S&&(n.t-this.gt)/this.rate()<1.2){var spot=this.toW(A,GL-11-this.R()*6,(this.R()-.5)*14),d=hyp(spot.x-P.x,spot.y-P.y)||1;P.vx=(spot.x-P.x)/d*24;P.vy=(spot.y-P.y)/d*24;this.D.retr={team:A,ent:S2,t:this.t};this.metrics.rebounds++;this.say('Save '+(G?G.last:'')+'. Rebound!');}
  else{var au=this.toU(A,P.x,P.y),ang=Math.PI+(this.R()-.5)*2.4,vu=Math.cos(ang)*(18+this.R()*12),vs=Math.sin(ang)*(18+this.R()*12),w=this.toW(A,vu,vs);P.vx=w.x;P.vy=w.y;this.D.retr=null;this.say('Save '+(G?G.last:'')+(this.R()<.5?' kicks it aside':' with the blocker'));}};
GP.fire=function(e){var i=this.ev.indexOf(e);if(i<this.ei)return;this.ei=i+1;if(this.gt<e.t)this.gt=e.t;this.D.hold=0;var k=e.team;
  if(e.type==='goal'){this.score[k]++;this.sog[k]++;}else if(e.type==='save')this.sog[k]++;else if(e.type==='block')this.blocks[k]++;else if(e.type==='hit')this.hits[k]++;
  this.ledger.push({type:e.type,team:k,p:e.p,t:e.t,gt:this.gt,sit:e.sit,freeze:e.freeze});
  if(e.type==='goal'&&this.pulled){this.pulled=null;this.pullDone=true;}};
GP.noteReplay=function(force){if(this.phase!=='play'&&this.phase!=='whistle'&&!force)return;this._rf=(this._rf||0)+1;if(!force&&(this._rf&1))return;var P=this.puck,pl=[];this.allEnts().forEach(function(e){if(!(e.onIce||e.mode==='leaving'||(e.isG&&e.mode==='play')))return;pl.push({id:e.id,x:e.x,y:e.y,h:e.h,pose:e.pose||'skate'});});var hist=this._hist||(this._hist=[]);hist.push({p:{x:P.x,y:P.y,z:P.z||0},pl:pl});if(hist.length>180)hist.shift();};
GP.onGoal=function(e,q){this.noteReplay(true);var hist=this._hist||[];this.replayClip=hist.slice(-150);this.replayDur=4+((Math.abs(Math.round((e.t||0)*10))%21)/10);this.replayHold=false;this.replayDone=false;this.replayUsed=false;var k=e.team,S=this.ents[e.p],a=[e.a1,e.a2].map(function(id){return id;}).filter(Boolean),self=this;
  var names=a.map(function(id){var x=self.ents[id];return x?x.last:'';}).filter(Boolean);
  this.phase='goal';this.phaseT=0;this.goalTeam=k;this.goalScorer=S;
  var tag=e.sit==='PP'?'POWER-PLAY GOAL':e.sit==='SH'?'SHORTHANDED GOAL':e.sit==='EN'?'EMPTY-NET GOAL':this.period===4?'OVERTIME WINNER':'GOAL';
  this.banner={title:tag,sub:(S?S.name:'Goal')+(names.length?'  ·  from '+names.join(' and '):'  ·  unassisted')+'  ·  '+perLabel(gameClock(e.t).period)+' '+intoLabel(e.t),until:this.t+2.8,team:k};
  this.say('GOAL! '+(S?S.name:'')+' scores for '+this.spec.teams[k].name+(names.length?'. Assists: '+names.join(', '):''));
  this.box.forEach(function(b){if(b.team!==k&&b.ppGoal!=null&&Math.abs(b.ppGoal-e.t)<0.6)b.out=true;});
};
GP.celebrate=function(){var k=this.goalTeam,S=this.goalScorer,self=this;if(!S)return;var c=this.toW(k,80,sgn(this.toU(k,S.x,S.y).s||1)*34);rinkClamp(c,3);S.tx=c.x;S.ty=c.y;S.urg=0.9;S.pose='celebrate';S.poseT=0.3;
  this.skaters(k).forEach(function(e,i){if(e!==S){e.tx=S.x+Math.cos(i*1.7)*3.2;e.ty=S.y+Math.sin(i*1.7)*3.2;e.urg=0.95;}});
  this.skaters(this.other(k)).forEach(function(e){var b=BENCH[e.team];e.tx=lerp(e.x,b.x,0.02);e.ty=lerp(e.y,0,0.02);e.urg=0.35;});};
/* ---------- line changes on the fly, following the engine's lines and TOI ---------- */
GP.syncPersonnel=function(e){var self=this,gt=this.gt,R=e?(e.t-gt)/this.rate():99;
  ['home','away'].forEach(function(k){var look=e&&R<6.8;var tt=look?(e.type==='penalty'?e.t-0.5:e.t):Math.min(gt+self.rate()*2.5,e?e.t-0.01:1e9);var want=self.desiredOn(k,tt);
    var cur=self.on[k].filter(function(id){return self.ents[id].mode==='play';}),leaving=self.on[k].filter(function(id){return self.ents[id].mode==='leaving';});
    var inc=want.filter(function(id){return self.on[k].indexOf(id)<0;});var outs=cur.filter(function(id){return want.indexOf(id)<0;});
    if(!inc.length&&!outs.length)return;
    var critical=e&&R<6.8&&(inc.indexOf(e.p)>=0||(e.onIce||[]).some(function(id){return inc.indexOf(id)>=0;})||(e.against||[]).some(function(id){return inc.indexOf(id)>=0;}));
    var hu=self.pf(k).u,poss=self.holderTeam()===k,allowed=critical||poss||hu>-20||self.puck.state==='loose'&&hu>-40;
    if(!allowed)return;
    var slots=want.length-(cur.length+leaving.length-outs.length);
    outs.forEach(function(id){var x=self.ents[id];if(self.puck.holder===x||self.D.seq&&(self.D.seq.S===x||self.D.seq.passer===x||self.D.seq.X===x||self.D.seq.V===x))return;x.mode='leaving';x.leaveT=0;x.swapFor=inc.shift()||null;});
    while(slots>0&&inc.length){self.onIce(inc.shift(),false);slots--;self.assignRoles(k);}
    if(critical&&R<3.2){self.on[k].slice().forEach(function(id){var x=self.ents[id];if(x.mode==='leaving'&&x.swapFor&&hyp(x.x-BENCH[k].x,x.y-BENCH[k].y)<40)self.finishLeave(x);});}
    if(critical&&R<0.4){inc=want.filter(function(id){return self.on[k].indexOf(id)<0||self.ents[id].mode!=='play';});self.on[k].forEach(function(id){var x=self.ents[id];if(x.mode==='leaving'&&x.swapFor&&inc.indexOf(x.swapFor)>=0){var px=x.x,py=x.y,nid=x.swapFor;self.offIce(id);self.onIce(nid,false);var n=self.ents[nid];n.x=px;n.y=py;self.metrics.instantSwaps++;}});self.assignRoles(k);}
  });};
GP.finishLeave=function(x){var k=x.team,nid=x.swapFor;this.offIce(x.id);this.metrics.lineChanges++;if(nid&&this.on[k].indexOf(nid)<0){this.onIce(nid,false);}this.assignRoles(k);};
/* ---------- roles ---------- */
GP.assignRoles=function(k){var self=this,tm=this.spec.teams[k],sk=this.skaters(k).filter(function(e){return e.mode!=='leaving';}),o=this.other(k);sk.forEach(function(e){e.role='';});
  if(this.period===4){var f=sk.filter(function(e){return e.pos!=='D';}),d=sk.filter(function(e){return e.pos==='D';});var ord=f.concat(d);var rl=['W1','W2','D1'];if(!d.length)rl=['W1','W2','D1'];ord.forEach(function(e,i){e.role=i<2&&e.pos!=='D'?rl[i]:(i===2||e.pos==='D')?'D1':'W'+(i+1);});return;}
  var bx=this.boxed(k).length,bo=this.boxed(o).length;
  function P_(e){return tm.players[e.id]||{pass:1,shot:1,phys:1};}
  if(bo>bx&&sk.length>=4){var D=sk.filter(function(e){return e.pos==='D';}).sort(function(a,b){return P_(b).pass-P_(a).pass;}),qb=D[0]||sk.slice().sort(function(a,b){return P_(b).pass-P_(a).pass;})[0];qb.role='QB';var rest=sk.filter(function(e){return e!==qb;}).sort(function(a,b){return P_(b).shot-P_(a).shot;});
    var f1=rest[0],f2=rest[1];if(f1&&f2){if(f1.shoots==='L'){f1.role='FR';f2.role='FL';}else{f1.role='FL';f2.role='FR';}}else if(f1)f1.role='FR';
    var left=rest.slice(2).sort(function(a,b){return (b.style==='grinder')-(a.style==='grinder')||P_(b).phys-P_(a).phys;});if(left[0])left[0].role='NET';if(left[1])left[1].role='BUMP';left.slice(2).forEach(function(e){e.role='BUMP';});return;}
  if(bx>bo){var Fs=sk.filter(function(e){return e.pos!=='D';}),Ds=sk.filter(function(e){return e.pos==='D';}),ordr=Fs.concat(Ds);var rl2=Fs.length>=2?['PF1','PF2','PD1','PD2']:['PF1','PD1','PD2','PF2'];ordr.forEach(function(e,i){e.role=rl2[i]||'PD2';});return;}
  var used={};sk.forEach(function(e){var r='';(tm.lines||[]).forEach(function(l){var i=l.indexOf(e.id);if(i>=0)r=['LW','C','RW'][i]||'';});(tm.pairs||[]).forEach(function(l){var i=l.indexOf(e.id);if(i>=0)r=['LD','RD'][i]||'';});if(!r||used[r])r='';if(r)used[r]=1;e.role=r;});
  var need=['C','LW','RW','LD','RD'].filter(function(r){return !used[r];});sk.forEach(function(e){if(e.role)return;var pref=e.pos==='D'?['LD','RD']:e.pos==='C'?['C','LW','RW']:e.pos==='LW'?['LW','C','RW']:['RW','C','LW'];var r=pref.filter(function(x){return need.indexOf(x)>=0;})[0]||need[0];if(r){e.role=r;need.splice(need.indexOf(r),1);}else e.role='X';});
};
/* ---------- systems: where every skater wants to be (team frame u = toward the opponent net, s = right side) ---------- */
GP.computeTargets=function(){var self=this,P=this.puck,D=this.D,ctl={};
  var poss=this.holderTeam()||(P.state==='pass'&&P.pass.recv&&!P.pass.intercept?P.pass.recv.team:null)||(P.state==='shot'?P.shot.S.team:null)||this.lastPoss||'home';
  this.possTeam=poss;
  if(P.state==='held'&&P.holder){this.carryTarget(P.holder);ctl[P.holder.id]=1;}
  if(P.state==='pass'&&P.pass.recv){var r=P.pass.recv;r.tx=P.pass.to.x;r.ty=P.pass.to.y;r.urg=1.05;ctl[r.id]=1;}
  if(P.state==='loose'&&D.retr&&D.retr.ent){ctl[D.retr.ent.id]=1;var o=this.skaters(this.other(D.retr.team)).filter(function(x){return x.mode==='play';}).sort(function(a,b){return dist(a,P)-dist(b,P);})[0];if(o&&dist(o,P)<45){var dd=dist(o,P)||1;o.tx=P.x+(o.x-P.x)/dd*3.5;o.ty=P.y+(o.y-P.y)/dd*3.5;o.urg=0.95;ctl[o.id]=1;}}
  var q=D.seq;if(q){['S','X','V','H','W','B'].forEach(function(n){if(q[n]&&n!=='S'&&n!=='V')ctl[q[n].id]=1;});if(q.kind==='passShot'&&q.S&&q.stage==='pass'){q.S.tx=P.pass?P.pass.to.x:q.S.tx;q.S.ty=P.pass?P.pass.to.y:q.S.ty;ctl[q.S.id]=1;}
    if(q.kind==='block'&&q.B&&q.S){var net=this.netW(q.S.team);q.B.tx=lerp(q.S.x,net.x,0.38);q.B.ty=lerp(q.S.y,net.y,0.38);q.B.urg=1.1;}}
  if(q&&q.kind==='contact'&&q.V&&q.V===P.holder){var V=q.V;V.tx=V.x+V.vx*0.3+(q.X.x-V.x)*0.05;V.ty=V.y+V.vy*0.3+(q.X.y-V.y)*0.05;V.urg=0.55;ctl[V.id]=1;}
  var pd=D.pend;if(pd&&!q){if(pd.kind==='shooter'&&!ctl[pd.ent.id]){pd.ent.tx=pd.spot.x;pd.ent.ty=pd.spot.y;pd.ent.urg=1;ctl[pd.ent.id]=1;}
    else if(pd.kind==='block'&&P.state==='held'&&P.holder){var n2=this.netW(P.holder.team);pd.ent.tx=lerp(P.holder.x,n2.x,0.4);pd.ent.ty=lerp(P.holder.y,n2.y,0.4);pd.ent.urg=1.05;ctl[pd.ent.id]=1;}
    else if(pd.kind==='hunt'&&pd.victim){pd.ent.tx=pd.victim.x+pd.victim.vx*0.2;pd.ent.ty=pd.victim.y+pd.victim.vy*0.2;pd.ent.urg=1.35;ctl[pd.ent.id]=1;}}
  if(pd&&!q&&pd.kind==='hunt'&&pd.victim===P.holder&&dist(pd.ent,pd.victim)<16){pd.victim.urg=Math.min(pd.victim.urg||1,0.6);}
  ['home','away'].forEach(function(k){var off=poss===k,pq=self.toU(k,P.x,P.y),c={k:k,pu:pq.u,ps:pq.s,ss:pq.s>=0?1:-1,st:self.strength(k),strat:self.spec.teams[k].strategy||{},carrier:P.state==='held'?P.holder:null,t:self.t};
    var sk=self.skaters(k).filter(function(e){return e.mode==='play';});
    if(!off)self.updateSysRoles(k,sk,c);else sk.forEach(function(e){e.sys='';});
    sk.forEach(function(e){if(ctl[e.id]||e.stun>0)return;var sp=off?self.offSpot(e,c):self.defSpot(e,c);if(!sp)return;var ph=(e.num||1)*1.37;sp.u+=Math.cos(self.t*0.7+ph)*1.2;sp.s+=Math.sin(self.t*0.9+ph)*1.4;if(sp.u>GL+8)sp.u=GL+8;var w=sp.abs?sp:self.toW(k,sp.u,sp.s);w={x:w.x,y:w.y};rinkClamp(w,3);e.tx=w.x;e.ty=w.y;e.urg=sp.urg||0.8;e.face={x:P.x,y:P.y};});});
};
GP.updateSysRoles=function(k,sk,c){var self=this,P=this.puck;if(this.sysRoles[k].t>this.t-0.8&&this.sysRoles[k].pu===this.zoneU(c.pu))return;var F=sk.filter(function(e){return e.pos!=='D'&&!/^P?D/.test(e.role);}).sort(function(a,b){return dist(a,P)-dist(b,P);});sk.forEach(function(e){e.sys='';});
  if(c.st==='PK'||c.st==='OT'){this.sysRoles[k]={t:this.t,pu:this.zoneU(c.pu)};return;}F.forEach(function(e,i){e.sys=['F1','F2','F3'][i]||'';});this.sysRoles[k]={t:this.t,pu:this.zoneU(c.pu)};};
GP.offSpot=function(e,c){var r=e.role,pu=c.pu,ps=c.ps,ss=c.ss,st=c.st,lane=this.lane(e),u,s;
  if(st==='OT'){if(pu>25){if(r==='D1')return {u:60,s:-ss*6};return {u:r==='W1'?78:70,s:(r==='W1'?ss:-ss)*16};}return {u:Math.min(pu+(r==='D1'?-18:8),23),s:r==='D1'?0:(r==='W1'?-1:1)*24};}
  if(pu>25){
    if(st==='PP'){var sp={QB:[61,ps*0.12],FL:[68,-26],FR:[68,26],BUMP:[74,ps*0.15],NET:[84,-ss*2]}[r]||[72,0];return {u:sp[0],s:sp[1],urg:0.9};}
    var off=c.strat.offensive;
    if(off==='Shoot first'){if(r==='LD'||r==='RD')return {u:56,s:(lane||ss)*11,urg:0.92};if(r==='LW'||r==='RW')return {u:66,s:(lane||ss)*20,urg:0.96};if(r==='C')return {u:70,s:ss*2,urg:0.96};}
    if(off==='Possession'){if(r==='LD'||r==='RD')return {u:55,s:(lane||ss)*24};if(r==='LW'||r==='RW'){if((lane||0)===ss)return {u:90,s:(lane||ss)*33};return {u:67,s:(lane||-ss)*22};}if(r==='C')return {u:84,s:ss*8};}
    if(r==='LD'||r==='RD'){var strong=lane===ss;if(e.style==='offensive'&&!strong&&pu>78&&Math.floor(c.t/3.5)%3===0)return {u:74,s:lane*14,urg:0.95};if(strong)return {u:pu<64&&Math.abs(ps)>20?62:60,s:lane*(pu<64&&Math.abs(ps)>20?23:19)};return {u:58,s:lane*(e.style==='defensive'?13:8)};}
    if(r==='LW'||r==='RW'){if(lane===ss){if(pu<72)return {u:66,s:lane*31};return {u:74,s:lane*21};}if(e.style==='sniper')return {u:66,s:lane*18};if(e.style==='grinder')return {u:84,s:lane*3};return {u:75,s:lane*13};}
    if(r==='C'){if(c.strat.offensive==='Crash the net'&&pu<72)return {u:83,s:-ss*2};if(pu>74&&Math.abs(ps)>14)return {u:79,s:ss*12};return {u:74,s:ss*4};}
    if(r==='X')return {u:80,s:-ss*8};return {u:72,s:lane*10};}
  var cap=23.5;
  if(pu>=-25){ // neutral zone with the puck: lanes, offside-aware
    if(r==='LD'||r==='RD'||r==='QB')return {u:Math.max(-70,pu-21),s:(lane||(r==='QB'?0:1))*13};
    if(r==='C'||r==='BUMP')return {u:Math.min(pu+3,cap),s:-ss*7};
    return {u:Math.min(pu+11,cap),s:(lane||(r==='NET'?1:-1))*28,urg:0.95};}
  // own zone breakout
  if(r==='LD'||r==='RD'||r==='QB'){if(pu<-80)return {u:-86,s:-ss*11};return {u:-74,s:(lane||-ss)*12};}
  if(r==='LW'||r==='RW'||r==='FL'||r==='FR'){if(lane===ss)return {u:-64,s:lane*33};return {u:-42,s:lane*18};}
  if(r==='C'||r==='BUMP'){if(pu<-75)return {u:-80,s:ss*7};return {u:-58,s:-ss*6};}
  return {u:-40,s:lane*15};};
GP.defSpot=function(e,c){var r=e.role,pu=c.pu,ps=c.ps,ss=c.ss,st=c.st,lane=this.lane(e),strat=c.strat,self=this,P=this.puck,car=c.carrier;
  function goalSide(t,dd){var nu=-GL,q=self.toU(c.k,t.x,t.y),du=nu-q.u,ds=-q.s,L=hyp(du,ds)||1;return {u:q.u+du/L*dd,s:q.s+ds/L*dd,urg:1};}
  if(st==='OT'){var att=this.skaters(this.other(c.k)),me=this.skaters(c.k),idx=me.indexOf(e),sorted=att.slice().sort(function(a,b){return self.toU(c.k,a.x,a.y).u-self.toU(c.k,b.x,b.y).u;});var t=sorted[idx%Math.max(1,sorted.length)];return t?goalSide(t,5):{u:-60,s:0};}
  if(pu<-25){
    if(st==='PK'){var diamond=strat.defensive==='Tight point'&&pu>-66;var spots=diamond?{PF1:[-58,0],PF2:[-72,ss*18],PD1:[-72,-ss*18],PD2:[-84,0]}:{PF1:[-63,-11],PF2:[-63,11],PD1:[-80,-8],PD2:[-80,8]};var b=spots[r]||[-75,0],u=b[0],s=b[1]+ps*0.18;
      if(!diamond&&car&&(r==='PF1'||r==='PF2')&&sgn(b[1])===ss&&pu>-72&&Math.abs(ps)>10){var g2=goalSide(car,6);g2.urg=1;return g2;}
      if(diamond&&r==='PF1'&&car&&pu>-66&&Math.abs(ps)<16){var g3=goalSide(car,7);return g3;}return {u:u,s:s,urg:0.95};}
    if(r==='LD'||r==='RD'){var strong=lane===ss;if(strong){if(pu<-68&&car)return goalSide(car,3.5);return {u:-79,s:ss*9};}return {u:-84,s:-ss*3};}
    if(r==='C'){if(pu<-86)return {u:-82,s:-ss*8};return {u:-75,s:ss*5};}
    var tight=strat.defensive==='Tight point',protect=strat.defensive==='Protect slot',wStrong=lane===ss||(!lane&&r!=='X');var spot=wStrong?(tight?{u:-57,s:ss*21}:protect?{u:-66,s:ss*14}:{u:-60,s:ss*19}):(protect?{u:-70,s:-ss*7}:{u:-64,s:-ss*9});
    var near=null,nd=15;this.skaters(this.other(c.k)).forEach(function(a){var q=self.toU(c.k,a.x,a.y),d=hyp(q.u-spot.u,q.s-spot.s);if(d<nd){nd=d;near=a;}});if(near){var gs=goalSide(near,4);spot={u:lerp(spot.u,gs.u,0.4),s:lerp(spot.s,gs.s,0.4)};}return spot;}
  if(st==='PK'){if(r==='PF1'&&car)return {u:pu-9,s:ps*0.7};if(r==='PF2')return {u:-16,s:-ss*14};return {u:-36,s:(r==='PD1'?-1:1)*12};}
  var fc=strat.forecheck||'1-2-2',nz=strat.neutral||'1-2-2',sys=e.sys;
  if(pu>25){ // forecheck in their end
    if(sys==='F1'&&car){var cq=this.toU(c.k,car.x,car.y);return {u:cq.u-3,s:cq.s-sgn(cq.s)*3,urg:1.05};}
    if(fc==='2-1-2'){if(sys==='F2'){if(pu>78)return {u:66,s:ss*31,urg:1};return {u:Math.min(pu+6,80),s:-ss*14,urg:1};}if(sys==='F3')return {u:54,s:0};if(r==='LD'||r==='RD'){var st2=lane===ss;if(st2&&pu<70&&Math.abs(ps)>18)return {u:42,s:ss*30,urg:1};return {u:34,s:(lane||1)*17};}}
    else if(fc==='1-1-3'){if(sys==='F2')return {u:46,s:0};if(sys==='F3')return {u:27,s:-ss*22};if(r==='LD'||r==='RD')return {u:22,s:(lane||1)*13};}
    else{if(sys==='F2')return {u:52,s:ss*21};if(sys==='F3')return {u:52,s:-ss*21};if(r==='LD'||r==='RD')return {u:31,s:(lane||1)*15};}
    return {u:40,s:(lane||0)*18};}
  // neutral zone defense
  var base=clamp(pu-17,-22,10);
  if(sys==='F1'&&car){var cq2=this.toU(c.k,car.x,car.y);return {u:cq2.u-7,s:cq2.s+(Math.abs(cq2.s)<20?-sgn(cq2.s||1)*3:0),urg:1};}
  if(nz==='1-3-1'){if(sys==='F2')return {u:base,s:-24};if(sys==='F3')return {u:base,s:24};if((r==='LD'||r==='RD')&&lane===ss)return {u:base-4,s:0};if(r==='LD'||r==='RD')return {u:clamp(pu-38,-55,-30),s:0};}
  else if(nz==='2-1-2'){if(sys==='F2'&&car){var cq3=this.toU(c.k,car.x,car.y);return {u:cq3.u-14,s:cq3.s*0.5,urg:1};}if(sys==='F3')return {u:pu-20,s:0};if(r==='LD'||r==='RD')return {u:clamp(pu-34,-55,-24),s:(lane||1)*13};}
  else{if(sys==='F2')return {u:base,s:ss*20};if(sys==='F3')return {u:base,s:-ss*20};if(r==='LD'||r==='RD')return {u:clamp(pu-34,-50,-22),s:(lane||1)*12};}
  return {u:base-6,s:(lane||0)*16};};
/* ---------- movement ---------- */
GP.moveAll=function(dt){var self=this,P=this.puck,list=[];
  ['home','away'].forEach(function(k){self.on[k].forEach(function(id){list.push(self.ents[id]);});});
  list.forEach(function(e){if(e.mode==='leaving'){var b=BENCH[e.team];e.tx=b.x+(self.R()-.5)*2;e.ty=b.y;e.urg=0.95;e.leaveT=(e.leaveT||0)+dt;e.face=null;}});
  list.forEach(function(e){self.steer(e,dt,e===P.holder);});
  for(var id in this.ents){var x=this.ents[id];if(x.mode==='toBox'){var pb=PBOX[x.team];x.tx=pb.x;x.ty=pb.y+2;x.urg=0.7;x.face=null;this.steer(x,dt,false);}}
  for(var i=0;i<list.length;i++)for(var j=i+1;j<list.length;j++){var a=list[i],b=list[j],dx=b.x-a.x,dy=b.y-a.y,d=hyp(dx,dy);if(d>0&&d<2.9){var push=(2.9-d)/2;if(a===P.holder||b===P.holder)push*=0.6;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;}}
  list.forEach(function(e){rinkClamp(e,1.6);if(e.mode==='leaving'){var b=BENCH[e.team];if(hyp(e.x-b.x,e.y-b.y)<9||e.leaveT>4.2)self.finishLeave(e);}});
  ['home','away'].forEach(function(k){var g=self.goalies[k];if(!g)return;if(self.goalieOn[k])self.goalieStep(g,dt);else if(g.mode==='leaving'){var b=BENCH[k];g.tx=b.x;g.ty=b.y;g.urg=0.9;self.steer(g,dt,false);if(hyp(g.x-b.x,g.y-b.y)<8){g.mode='bench';g.onIce=false;}}});
  for(var id2 in this.ents){var z=this.ents[id2];if(z.poseT>0){z.poseT-=dt;if(z.poseT<=0)z.pose='skate';}}
};
GP.steer=function(e,dt,hasPuck){if(e.stun>0){e.stun-=dt;e.vx*=Math.pow(0.2,dt);e.vy*=Math.pow(0.2,dt);e.x+=e.vx*dt;e.y+=e.vy*dt;return;}
  var dx=e.tx-e.x,dy=e.ty-e.y,d=hyp(dx,dy),vmax=e.vmax*(hasPuck?0.9:1)*(e.urg||1),want=d>0.25?Math.min(vmax,Math.sqrt(2*20*d)):0,wx=d>0?dx/d*want:0,wy=d>0?dy/d*want:0;
  var ax=wx-e.vx,ay=wy-e.vy,al=hyp(ax,ay),lim=(want<hyp(e.vx,e.vy)?32:24)*dt;if(al>lim){ax=ax/al*lim;ay=ay/al*lim;}e.vx+=ax;e.vy+=ay;e.x+=e.vx*dt;e.y+=e.vy*dt;
  var sp=hyp(e.vx,e.vy),aim;if(e.face&&sp<9){aim=Math.atan2(e.face.y-e.y,e.face.x-e.x);}else if(sp>1.5)aim=Math.atan2(e.vy,e.vx);else aim=e.h;
  if(e.face&&sp>=9){var fa=Math.atan2(e.face.y-e.y,e.face.x-e.x),va=Math.atan2(e.vy,e.vx),df=Math.atan2(Math.sin(fa-va),Math.cos(fa-va));if(Math.abs(df)>2.2&&!hasPuck)aim=fa;} // backskating defenders keep their eyes on the puck
  var dh=Math.atan2(Math.sin(aim-e.h),Math.cos(aim-e.h));e.h+=clamp(dh,-9*dt,9*dt);};
/* goalie: stays in the crease, squares to the puck, shuffles and T-pushes, butterflies on shots */
GP.goalieStep=function(G,dt){var k=G.team,P=this.puck,q=this.toU(k,P.x,P.y),me=this.toU(k,G.x,G.y),tu,ts;
  if(P.state==='shot'&&P.shot&&P.shot.S.team!==k){var to=this.toU(k,P.shot.to.x,P.shot.to.y);tu=clamp(to.u,-GL+0.6,-GL+4.5);ts=clamp(to.s,-4,4);if(P.shot.e.type==='goal'){var lag=P.shot.style&&P.shot.style.oneTimer?0.35:0.6;ts=lerp(me.s,ts,lag*0.4);tu=me.u;}}
  else{var a=Math.atan2(q.s,q.u+GL);a=clamp(a,-1.42,1.42);var depth=q.u<-GL?1.0:clamp(2.4+(q.u+GL)*0.035,2.4,4.6);if(q.u<-GL+2)a=sgn(q.s||1)*1.45;tu=-GL+Math.cos(a)*depth;ts=Math.sin(a)*depth;}
  var du=tu-me.u,ds=ts-me.s,d=hyp(du,ds),fast=d>3.2,vm=fast?17:9;if(fast&&G.pose!=='butterfly'&&G.pose!=='save'){G.pose='tpush';G.poseT=0.25;}
  var step=Math.min(d,vm*dt),nu=me.u+(d?du/d*step:0),ns=me.s+(d?ds/d*step:0),cr=hyp(nu+GL,ns);if(cr>5.6){nu=-GL+(nu+GL)/cr*5.6;ns=ns/cr*5.6;}nu=Math.max(nu,-GL+0.4);
  var w=this.toW(k,nu,ns);G.vx=(w.x-G.x)/dt;G.vy=(w.y-G.y)/dt;G.x=w.x;G.y=w.y;var aim=Math.atan2(P.y-G.y,P.x-G.x),dh=Math.atan2(Math.sin(aim-G.h),Math.cos(aim-G.h));G.h+=clamp(dh,-7*dt,7*dt);
  if(this.phase==='play'){this.metrics.goalieFrames++;if(hyp(nu+GL,ns)>6.05||nu<-GL-0.1)this.metrics.goalieOut++;}};
/* ---------- instrumentation (for the headless tests) ---------- */
var UMB={QB:[61,0],FL:[68,-26],FR:[68,26],BUMP:[74,0],NET:[84,0]};
GP.instrument=function(){if(this.phase!=='play')return;var self=this;['home','away'].forEach(function(k){var st=self.strength(k);self.ozT=self.ozT||{home:0,away:0};var inOz=self.possTeam===k&&self.pf(k).u>25;self.ozT[k]=inOz?self.ozT[k]+DT:0;if(inOz&&(self.puck.state==='held'||self.puck.state==='pass')){if(k==='home')self.metrics.ozHome+=DT;else self.metrics.ozAway+=DT;}
  if(st==='PP'){var pu=self.pf(k).u,bw=self.box[0],wk=bw?bw.id+'@'+bw.team:null;if(wk&&!(self.ppSeen||(self.ppSeen={}))[wk]){self.ppSeen[wk]={umb:false};self.metrics.ppWindows=(self.metrics.ppWindows||0)+1;}if(self.possTeam===k&&pu>25&&self.ozT[k]>2.5){self.metrics.ppFrames++;var n=0;self.skaters(k).forEach(function(e){var s=UMB[e.role];if(!s)return;var q=self.toU(k,e.x,e.y);if(hyp(q.u-s[0],q.s-s[1])<11)n++;});if(n>=4){self.metrics.umbrellaFrames++;if(wk&&!self.ppSeen[wk].umb){self.ppSeen[wk].umb=true;self.metrics.ppWindowsUmb=(self.metrics.ppWindowsUmb||0)+1;}}}}
  if(st==='PK'){var o=self.other(k);if(self.possTeam===o&&self.pf(o).u>25&&self.ozT&&self.ozT[o]>2.5){self.metrics.pkFrames++;var m=0;self.skaters(k).forEach(function(e){var q=self.toU(k,e.x,e.y);if(q.u<-55&&Math.abs(q.s)<24)m++;});if(m>=4)self.metrics.boxFrames++;}}
  if(self.possTeam!==k&&self.pf(k).u>25&&st==='ES'){var f=self.skaters(k).filter(function(e){return e.sys;});if(f.length){self.metrics.forecheckFrames++;var H=self.puck.holder;if(H&&self.puck.state==='held'){f.forEach(function(e){var d=dist(e,H);if(e.sys==='F1'&&d<16)self.metrics.fcF1++;if(e.sys==='F2'&&self.toU(k,e.x,e.y).u>40)self.metrics.fcF2++;if(e.sys==='F3'&&self.toU(k,e.x,e.y).u>20)self.metrics.fcF3++;});}}}});};
/* ---------- shootout ---------- */
GP.startShootout=function(){var self=this,R=this.R,W=this.spec.soWinner||'home',L=this.other(W);this.phase='shootout';this.phaseT=0;this.so={i:0,att:[],sub:'setup',goals:{home:0,away:0}};
  function shooters(k){var tm=self.spec.teams[k];return Object.keys(tm.players).map(function(id){return tm.players[id];}).filter(function(p){return p.pos!=='G'&&p.pos!=='D';}).sort(function(a,b){return b.shot-a.shot;}).map(function(p){return p.id;});}
  var sh={home:shooters('home'),away:shooters('away')},plan=null;
  for(var tries=0;tries<200&&!plan;tries++){var g={home:0,away:0},seq=[],ok=true,order=['away','home'];for(var r=0;r<3;r++){order.forEach(function(k){seq.push({team:k,goal:R()<0.33});});}
    seq.forEach(function(a){if(a.goal)g[a.team]++;});if(g[W]===g[L]+1&&seq.length){var gg={home:0,away:0},left={home:3,away:3},dec=false;for(var i=0;i<seq.length;i++){var a=seq[i];left[a.team]--;if(a.goal)gg[a.team]++;if(gg[L]>gg[W]+left[W]){ok=false;break;}if(gg[W]>gg[L]+left[L]){seq=seq.slice(0,i+1);dec=true;break;}}if(ok)plan=seq;}}
  if(!plan){plan=[];for(var r2=0;r2<3;r2++){plan.push({team:'away',goal:false});plan.push({team:'home',goal:false});}plan.push({team:'away',goal:W==='away'});plan.push({team:'home',goal:W==='home'});if(W==='away')plan.pop();}
  var n={home:0,away:0};plan.forEach(function(a){a.p=sh[a.team][n[a.team]%Math.max(1,sh[a.team].length)];n[a.team]++;});this.so.att=plan;
  ['home','away'].forEach(function(k){self.on[k].slice().forEach(function(id){self.offIce(id);});});this.banner={title:'SHOOTOUT',sub:'Best of three',until:this.t+2};this.say('Shootout!');};
GP.stepShootout=function(dt){var so=this.so,P=this.puck,self=this;if(!so)return;var a=so.att[so.i];
  if(!a){if(so.sub!=='end'){so.sub='end';this.score[this.spec.soWinner]++;this.banner={title:'SHOOTOUT WINNER',sub:this.spec.teams[this.spec.soWinner].name+' win it',until:this.t+2.5};this.say(this.spec.teams[this.spec.soWinner].name+' win the shootout '+so.goals[this.spec.soWinner]+'-'+so.goals[this.other(this.spec.soWinner)]);so.endT=this.t;}else if(this.t-so.endT>2.6)this.finish();return;}
  var o=this.other(a.team),G=this.goalies[o],S=this.ents[a.p],netX=GL;
  ['home','away'].forEach(function(k){var g=self.goalies[k];if(!g)return;if(k===o){var me={u:g.x-netX};}else{g.x=-GL+3;g.y=0;}});
  if(so.sub==='setup'){if(S){this.on[a.team]=[a.p];S.onIce=true;S.mode='play';S.x=0;S.y=0;S.vx=0;S.vy=0;S.h=0;}if(G){G.x=netX-3;G.y=0;G.h=Math.PI;}this.give(S);so.sub='skate';so.t0=this.t;this.say(S.last+' skates in on '+(G?G.last:'the goalie'));}
  if(so.sub==='skate'&&S){var wob=Math.sin((this.t-so.t0)*2.4)*10;S.tx=netX-14;S.ty=wob;S.urg=0.75;S.face=null;this.steer(S,dt,true);var st=this.stick(S);P.x=st.x;P.y=st.y;
    if(G){var a2=Math.atan2(-P.y,-(P.x-netX))||0;G.x=netX-3.2+Math.abs(Math.sin(a2))*0.6;G.y=clamp(P.y*0.12,-2.5,2.5);G.h=Math.atan2(P.y-G.y,P.x-G.x);}
    if(S.x>netX-22||this.t-so.t0>4){var sd=G&&G.y>0?-1:1;var tg=a.goal?{x:netX+1.2,y:sd*2.3,z:0.4+this.R()*2.6}:{x:G?G.x+0.5:netX,y:G?G.y+(this.R()-.5):0,z:0.5+this.R()*1.5};P.state='shot';P.holder=null;P.shot={from:{x:P.x,y:P.y},to:tg,t0:this.t,T:Math.max(0.15,hyp(tg.x-P.x,tg.y-P.y)/90),S:S,so:a};S.pose='shoot';S.poseT=0.4;if(G&&!a.goal){G.pose='butterfly';G.poseT=0.8;}so.sub='shot';}}
  if(so.sub==='shot'){var q=P.shot,u=(this.t-q.t0)/q.T;if(u<1){P.x=lerp(q.from.x,q.to.x,u);P.y=lerp(q.from.y,q.to.y,u);P.z=lerp(0,q.to.z,u);}else{if(a.goal){so.goals[a.team]++;P.x=netX+2.5;this.say('Scores! '+S.last+' beats '+(G?G.last:'him'));this.banner={title:'SO GOAL',sub:S.name,until:this.t+1.2};}else{this.say('Stopped! '+(G?G.last:'')+' says no to '+S.last);P.state='dead';}so.sub='pause';so.t1=this.t;}}
  if(so.sub==='pause'&&this.t-so.t1>1.3){if(S){this.offIce(a.p);}so.i++;so.sub='setup';P.state='dead';}};
/* ---------- quick mode (test hook: periods shorter than ~30 s) ---------- */
GP.quickFire=function(e){var X=this.ents[e.p];this.fire(e);if(e.type==='goal'){this.onGoal(e,null);this.phase='play';this.releaseBox();this.setupFaceoff({x:0,y:0},true);this.phase='play';}
  else if(e.type==='penalty'&&X){this.offIce(X.id);this.box.push({id:X.id,team:e.team,until:e.ppGoalTime!=null?null:e.end,ppGoal:e.ppGoalTime});this.pim[e.team]+=2;this.setupFaceoff(this.dotFor('dz',e.team),true);this.phase='play';}
  else if(e.type==='icing'||e.type==='offside'||(e.type==='save'&&e.freeze)){this.setupFaceoff({x:0,y:0},true);this.phase='play';}
  var w=this.S.foWinners[this.foIdx];if((e.type==='goal'&&e.sit!=='OT')||e.type==='penalty'||e.type==='icing'||e.type==='offside'||(e.type==='save'&&e.freeze)){this.foIdx++;if(w)this.fo[w]++;}};
GP.quickMotion=function(dt){var P=this.puck;P.state='loose';P.x=Math.sin(this.t*0.8)*60;P.y=Math.cos(this.t*1.3)*25;};
/* ---------- run helpers ---------- */
GP.simToEndOfPeriod=function(maxSteps){var p=this.period,n=0;maxSteps=maxSteps||400000;while(n<maxSteps&&!this.done&&this.period===p&&this.phase!=='intermission'&&this.phase!=='shootout'){this.step(DT);n++;}return n;};
GP.runToEnd=function(maxSteps){var n=0;maxSteps=maxSteps||2000000;while(!this.done&&n<maxSteps){this.step(DT);n++;}return n;};
GP.ppInfo=function(){var self=this;if(!this.box.length)return null;var b=this.box.filter(function(x){return !x.out;});if(!b.length)return null;var x=b[0],rem=x.until!=null?x.until-this.gt:null;return {pp:this.other(x.team),left:rem};};
GP.clockText=function(){if(this.phase==='shootout')return 'SO';if(this.phase==='final')return '0:00';var left=this.periodEnd-this.gt;if(this.phase==='intermission')return '0:00';return clockLabel(left);};
GP.periodText=function(){if(this.phase==='final')return 'FINAL'+(this.spec.so?' / SO':this.spec.ot?' / OT':'');if(this.phase==='shootout')return 'SHOOTOUT';if(this.phase==='intermission')return 'INTERMISSION';return this.period===4?'OVERTIME':['1ST','2ND','3RD'][this.period-1]+' PERIOD';};
/* ====================================================================================================
   View3D: three.js broadcast renderer. Reads game state only; never changes it.
   World units: 1 = 0.3 ft. x = ft*0.3, z = -y*0.3 (far boards / benches at -z, camera side +z).
   ==================================================================================================== */
function hexToRgb(h){h=String(h||'#888').replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');var n=parseInt(h,16)||0;return [(n>>16)&255,(n>>8)&255,n&255];}
function lum(c){return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
function loadScriptOnce(src,globalName,cb){if(globalName&&global[globalName]){cb(true);return;}if(typeof document==='undefined'){cb(false);return;}var t=document.createElement('script');t.src=src;t.onload=function(){cb(!globalName||!!global[globalName]);};t.onerror=function(){cb(false);};document.head.appendChild(t);}
function b64ToBuf(b64){var bin=atob(b64),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function View3D(canvas,game,opts){this.ok=false;opts=opts||{};var THREE=global.THREE;if(!THREE)return;this.T=THREE;this.g=game;this.canvas=canvas;this.opts=opts;
  try{this.r=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}catch(e){return;}
  var r=this.r;r.setPixelRatio(Math.min(global.devicePixelRatio||1,opts.lowPower?1:1.5));r.setClearColor(0x05070b);
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x05070b,70,150);
  this.cam=new THREE.PerspectiveCamera(34,16/9,0.5,260);this.camX=0;this.camV=0;this.camH=opts.highCam?1:0;
  var hemi=new THREE.HemisphereLight(0xffffff,0x334455,0.85);this.scene.add(hemi);var dl=new THREE.DirectionalLight(0xffffff,0.55);dl.position.set(-12,40,22);this.scene.add(dl);var dl2=new THREE.DirectionalLight(0xbfd4ff,0.25);dl2.position.set(15,30,-25);this.scene.add(dl2);
  this.proc=[];this.ents={};this.tags={};this.boards={};this.screens=[];this.ribbon=null;this.arena=null;
  this.buildRink();this.buildPuck();this.buildPlayers();this.loadArena(game.spec.arena==='home'?'home':'neutral');
  this.ok=true;}
var VP=View3D.prototype;
VP.W=function(x,y){return {x:x*FT,z:-y*FT};};
/* ---------- procedural rink (fallback when the arena GLB is not available) ---------- */
VP.iceTexture=function(){var T=this.T,c=document.createElement('canvas');c.width=2048;c.height=872;var x=c.getContext('2d'),sx=c.width/200,sy=c.height/85;function X(f){return (f+100)*sx;}function Y(f){return (42.5-f)*sy;}
  x.fillStyle='#eef4f8';x.fillRect(0,0,c.width,c.height);var gr=x.createRadialGradient(c.width/2,c.height/2,50,c.width/2,c.height/2,c.width/1.6);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(170,190,205,0.25)');x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);
  function line(f,col,w){x.fillStyle=col;x.fillRect(X(f)-w*sx/2,0,w*sx,c.height);}
  line(0,'#c8102e',1);line(25,'#1f4aa8',1);line(-25,'#1f4aa8',1);line(89,'#c8102e',0.17);line(-89,'#c8102e',0.17);
  x.strokeStyle='#c8102e';x.lineWidth=0.17*sx;[[69,22],[69,-22],[-69,22],[-69,-22]].forEach(function(d){x.beginPath();x.arc(X(d[0]),Y(d[1]),15*sx,0,Math.PI*2);x.stroke();x.fillStyle='#c8102e';x.beginPath();x.arc(X(d[0]),Y(d[1]),1*sx,0,Math.PI*2);x.fill();});
  [[20,22],[20,-22],[-20,22],[-20,-22]].forEach(function(d){x.fillStyle='#c8102e';x.beginPath();x.arc(X(d[0]),Y(d[1]),1*sx,0,Math.PI*2);x.fill();});
  x.strokeStyle='#1f4aa8';x.beginPath();x.arc(X(0),Y(0),15*sx,0,Math.PI*2);x.stroke();
  [-1,1].forEach(function(s){x.fillStyle='rgba(80,140,230,0.55)';x.beginPath();x.moveTo(X(s*89),Y(4));x.arc(X(s*89),Y(0),6*sx,s>0?Math.PI/2:-Math.PI/2,s>0?Math.PI*1.5:Math.PI/2,false);x.closePath();x.fill();});
  var t=new T.CanvasTexture(c);t.anisotropy=this.r.capabilities.getMaxAnisotropy();return t;};
VP.buildRink=function(){var T=this.T,S=this.scene,self=this;
  // ice: rounded rectangle shape
  var hx=RX*FT,hy=RY*FT,cr=CR*FT,sh=new T.Shape();sh.moveTo(-hx+cr,-hy);sh.lineTo(hx-cr,-hy);sh.absarc(hx-cr,-hy+cr,cr,-Math.PI/2,0);sh.lineTo(hx,hy-cr);sh.absarc(hx-cr,hy-cr,cr,0,Math.PI/2);sh.lineTo(-hx+cr,hy);sh.absarc(-hx+cr,hy-cr,cr,Math.PI/2,Math.PI);sh.lineTo(-hx,-hy+cr);sh.absarc(-hx+cr,-hy+cr,cr,Math.PI,Math.PI*1.5);
  var ig=new T.ShapeGeometry(sh,24),pos=ig.attributes.position,uv=[];for(var i=0;i<pos.count;i++){uv.push((pos.getX(i)+hx)/(2*hx),(pos.getY(i)+hy)/(2*hy));}ig.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  var ice=new T.Mesh(ig,new T.MeshStandardMaterial({map:this.iceTexture(),roughness:0.35,metalness:0}));ice.rotation.x=-Math.PI/2;S.add(ice);this.proc.push(ice);
  // boards + glass follow the rounded rectangle
  var pts=[];function seg(ax,az,bx,bz){pts.push([ax,az,bx,bz]);}var N=10,corner=function(cx,cz,a0){for(var k=0;k<N;k++){var a=a0+k*(Math.PI/2)/N,b=a0+(k+1)*(Math.PI/2)/N;seg(cx+Math.cos(a)*cr,cz+Math.sin(a)*cr,cx+Math.cos(b)*cr,cz+Math.sin(b)*cr);}};
  seg(-hx+cr,hy,hx-cr,hy);corner(hx-cr,hy-cr,Math.PI*0.5-Math.PI/2);seg(hx,hy-cr,hx,-hy+cr);corner(hx-cr,-hy+cr,-Math.PI/2);seg(hx-cr,-hy,-hx+cr,-hy);corner(-hx+cr,-hy+cr,Math.PI);seg(-hx,-hy+cr,-hx,hy-cr);corner(-hx+cr,hy-cr,Math.PI/2);
  var bm=new T.MeshStandardMaterial({color:0xf4f4f0,roughness:0.6}),km=new T.MeshStandardMaterial({color:0xffb81c,roughness:0.6}),gm=new T.MeshStandardMaterial({color:0xcfe6ff,transparent:true,opacity:0.12,roughness:0.1,depthWrite:false});
  var grp=new T.Group();pts.forEach(function(p){var dx=p[2]-p[0],dz=p[3]-p[1],L=Math.hypot(dx,dz),a=Math.atan2(dz,dx);var b=new T.Mesh(new T.BoxGeometry(L+0.02,1.12,0.18),bm);b.position.set((p[0]+p[2])/2,0.56,(p[1]+p[3])/2);b.rotation.y=-a;grp.add(b);var k=new T.Mesh(new T.BoxGeometry(L+0.02,0.18,0.2),km);k.position.set(b.position.x,0.09,b.position.z);k.rotation.y=-a;grp.add(k);var gl=new T.Mesh(new T.PlaneGeometry(L,1.5),gm);gl.position.set(b.position.x,1.9,b.position.z);gl.rotation.y=-a;grp.add(gl);});
  S.add(grp);this.proc.push(grp);
  // nets
  [-1,1].forEach(function(s){var n=new T.Group(),red=new T.MeshStandardMaterial({color:0xd0102a,roughness:0.4}),mesh=new T.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:0.55});
    function tube(ax,ay,az,bx,by,bz){var a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),L=a.distanceTo(b),c=new T.Mesh(new T.CylinderGeometry(0.035,0.035,L,8),red);c.position.copy(a).add(b).multiplyScalar(0.5);c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());n.add(c);}
    tube(0,0,-0.9,0,1.2,-0.9);tube(0,0,0.9,0,1.2,0.9);tube(0,1.2,-0.9,0,1.2,0.9);tube(0,0,-0.9,s*1.0,0,-0.6);tube(0,0,0.9,s*1.0,0,0.6);tube(s*1.0,0,-0.6,s*1.0,0,0.6);
    var back=new T.Mesh(new T.BoxGeometry(1.0,1.15,1.75,4,4,6),mesh);back.position.set(s*0.5,0.58,0);n.add(back);n.position.set(s*GL*FT,0,0);S.add(n);self.proc.push(n);});
  // bowl + crowd
  var cc=document.createElement('canvas');cc.width=512;cc.height=128;var cx=cc.getContext('2d');cx.fillStyle='#14181f';cx.fillRect(0,0,512,128);for(var q=0;q<2600;q++){var hue=[0,40,210,0,48][q%5];cx.fillStyle='hsl('+hue+','+(20+Math.random()*50)+'%,'+(18+Math.random()*45)+'%)';cx.fillRect(Math.random()*512,Math.random()*128,2,2);}
  var ct=new T.CanvasTexture(cc);ct.wrapS=ct.wrapT=T.RepeatWrapping;ct.repeat.set(10,3);
  var bowl=new T.Mesh(new T.CylinderGeometry(46,36,16,48,1,true),new T.MeshStandardMaterial({map:ct,side:T.BackSide,roughness:1}));bowl.scale.z=0.62;bowl.position.y=7;S.add(bowl);this.proc.push(bowl);
  // benches and penalty boxes (simple)
  var benchM=new T.MeshStandardMaterial({color:0x222831,roughness:0.9});[['home',BENCH.home],['away',BENCH.away],['hb',PBOX.home],['ab',PBOX.away]].forEach(function(b){var m=new T.Mesh(new T.BoxGeometry(b[0].length>2?7:4.2,0.5,1.0),benchM);m.position.set(b[1].x*FT,0.25,-(b[1].y+sgn(b[1].y)*2.2)*FT);S.add(m);self.proc.push(m);});
};
/* ---------- arena GLB (TD Garden) ---------- */
VP.loadArena=function(kind){var self=this,T=this.T,glob=kind==='home'?'CTFO_ARENA_HOME_GLB':'CTFO_ARENA_NEUTRAL_GLB',src='live-assets/arena-'+kind+'-glb.js';if(this.opts.noArena)return;
  loadScriptOnce(src,glob,function(ok){if(!ok||!global[glob]||!T.GLTFLoader||self.dead)return;try{new T.GLTFLoader().parse(b64ToBuf(global[glob]),'',function(gltf){if(self.dead)return;self.useArena(gltf.scene);},function(err){if(global.console)console.warn('arena glb',err);});}catch(e){if(global.console)console.warn('arena',e);}});};
VP.useArena=function(root){var T=this.T,self=this,an=this.r.capabilities.getMaxAnisotropy();
  root.traverse(function(o){if(!o.isMesh)return;var ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(function(m){['map','emissiveMap'].forEach(function(k){var t=m[k];if(!t)return;t.encoding=T.LinearEncoding;t.anisotropy=an;m.needsUpdate=true;});});});
  this.proc.forEach(function(o){self.scene.remove(o);o.traverse(function(q){if(q.geometry)q.geometry.dispose();});});this.proc=[];
  this.scene.add(root);this.arena=root;this.scene.fog=null;
  for(var i=0;i<4;i++){var n=root.getObjectByName('Scoreboard_Screen_'+i);if(n){var c=document.createElement('canvas');c.width=512;c.height=256;var t=new T.CanvasTexture(c);t.flipY=false;t.encoding=T.LinearEncoding;var mat=new T.MeshBasicMaterial({map:t,toneMapped:false});n.traverse(function(q){if(q.isMesh)q.material=mat;});this.screens.push({c:c,t:t});}}
  var rb=root.getObjectByName('Club_LED_Ribbon');if(rb){var c2=document.createElement('canvas');c2.width=1024;c2.height=32;var t2=new T.CanvasTexture(c2);t2.flipY=false;t2.wrapS=T.RepeatWrapping;t2.encoding=T.LinearEncoding;var m2=new T.MeshBasicMaterial({map:t2,toneMapped:false});rb.traverse(function(q){if(q.isMesh)q.material=m2;});this.ribbon={c:c2,t:t2,last:''};}
  this.scoreKey='';this.arenaLoaded=true;};
VP.drawScreens=function(){var g=this.g,sp=g.spec,key=g.score.away+'|'+g.score.home+'|'+g.clockText()+'|'+g.period+'|'+g.sog.away+'|'+g.sog.home+'|'+(g.ppInfo()?1:0)+'|'+g.phase;if(key===this.scoreKey)return;this.scoreKey=key;
  var ja=sp.teams.away.jersey||['#888','#fff'],jh=sp.teams.home.jersey||['#111','#ffb81c'];
  this.screens.forEach(function(s){var x=s.c.getContext('2d');x.fillStyle='#04060a';x.fillRect(0,0,512,256);x.fillStyle=ja[0];x.fillRect(0,0,256,70);x.fillStyle=jh[0];x.fillRect(256,0,256,70);x.fillStyle='#fff';x.font='bold 46px Arial';x.textAlign='center';x.fillText(sp.teams.away.abbr,128,52);x.fillText(sp.teams.home.abbr,384,52);
    x.font='bold 120px Arial';x.fillStyle='#ffd54a';x.fillText(String(g.score.away),110,190);x.fillText(String(g.score.home),402,190);x.fillStyle='#fff';x.font='bold 54px Arial';x.fillText(g.clockText(),256,150);x.font='bold 30px Arial';x.fillStyle='#ffb81c';x.fillText(g.phase==='final'?'FINAL':g.period===4?'OT':'P'+g.period,256,200);x.fillStyle='#9fb3c8';x.font='24px Arial';x.fillText('SOG '+g.sog.away+' - '+g.sog.home,256,240);s.t.needsUpdate=true;});
  if(this.ribbon){var r=this.ribbon,x2=r.c.getContext('2d');x2.fillStyle='#000';x2.fillRect(0,0,1024,32);x2.font='bold 22px Arial';x2.fillStyle='#ffb81c';var pp=g.ppInfo(),txt=sp.teams.away.abbr+' '+g.score.away+'   '+sp.teams.home.abbr+' '+g.score.home+'   '+(pp?sp.teams[pp.pp].abbr+' POWER PLAY   ':'')+'SHOTS '+g.sog.away+'-'+g.sog.home+'   ';x2.fillText(txt+txt,8,24);r.t.needsUpdate=true;}};
/* ---------- players ---------- */
VP.buildPlayers=function(){var self=this,T=this.T,g=this.g;
  for(var id in g.ents){var e=g.ents[id],grp=new T.Group(),body=new T.Group();grp.add(body);grp.visible=false;this.scene.add(grp);
    var col=(g.spec.teams[e.team].jersey||['#888'])[e.team==='home'?0:1]||'#888';
    // placeholder capsule until the GLB is parsed (also the permanent fallback)
    var ph=new T.Group(),jm=new T.MeshStandardMaterial({color:e.team==='home'?new T.Color(col):new T.Color('#eef0f2'),roughness:0.7}),tm=new T.MeshStandardMaterial({color:new T.Color((g.spec.teams[e.team].jersey||['#888'])[e.team==='home'?1:0]),roughness:0.7});
    var torso=new T.Mesh(new T.CylinderGeometry(0.26,0.3,0.8,10),jm);torso.position.y=1.15;ph.add(torso);var legs=new T.Mesh(new T.CylinderGeometry(0.22,0.18,0.75,8),new T.MeshStandardMaterial({color:0x1a1a1a}));legs.position.y=0.4;ph.add(legs);var head=new T.Mesh(new T.SphereGeometry(0.17,10,8),tm);head.position.y=1.72;ph.add(head);if(e.isG){ph.scale.set(1.25,0.85,1.25);}
    body.add(ph);var num=this.numberPlate(e);if(num){body.add(num);}
    this.ents[id]={g:grp,body:body,ph:ph,e:e,bob:Math.random()*6,lean:0,yaw:0,num:num};}
  this.loadModels();};
VP.numberPlate=function(e){var T=this.T,c=document.createElement('canvas');c.width=128;c.height=128;var x=c.getContext('2d'),jr=this.g.spec.teams[e.team].jersey||['#111','#fc0'];x.clearRect(0,0,128,128);x.font='bold 84px Arial';x.textAlign='center';x.textBaseline='middle';x.lineWidth=10;x.strokeStyle=e.team==='home'?'#ffffff':jr[0];x.fillStyle=e.team==='home'?jr[1]||'#fff':jr[1]||jr[0];if(e.team!=='home'){x.fillStyle=jr[0];x.strokeStyle='#ffffff';}x.strokeText(String(e.num||''),64,68);x.fillText(String(e.num||''),64,68);
  var t=new T.CanvasTexture(c);var m=new T.Mesh(new T.PlaneGeometry(0.42,0.42),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:T.DoubleSide}));m.position.set(0,e.isG?1.05:1.3,-0.24);m.rotation.y=Math.PI;m.renderOrder=3;return m;};
/* players: ctfo-v2 rigged + animated models through buildHockeyPlayer (skater-models.js); capsules until they parse (or if they can't) */
VP.loadModels=function(){var self=this;if(this.opts.noModels||!this.T.GLTFLoader)return;
  var need=[];if(!global.SKATER_GLB)need.push(['skater-glb.js?v=ctfo2','SKATER_GLB']);if(!global.GOALIE_GLB)need.push(['goalie-glb.js?v=ctfo2','GOALIE_GLB']);if(typeof global.buildHockeyPlayer!=='function')need.push(['skater-models.js?v=ctfo2','buildHockeyPlayer']);
  var go=function(){if(self.dead||typeof global.buildHockeyPlayer!=='function'||!global.SKATER_GLB)return;self.attachModels();};
  var left=need.length;if(!left){go();return;}need.forEach(function(n){loadScriptOnce(n[0],n[1],function(){if(--left===0)go();});});};
VP.teamColors=function(k,goalie){var jr=this.g.spec.teams[k].jersey||['#335577','#ffffff'];
  // home: dark jersey with trim; away: white jersey with team-colour trim (goalie pads follow the jersey)
  if(k==='home')return {p:jr[0],s:jr[1]||'#ffffff',gear:goalie?jr[0]:null};return {p:'#F2F3F5',s:jr[0],gear:goalie?'#EDEDED':null};};
VP.attachModels=function(){var self=this,T=this.T;
  for(var id in this.ents){(function(v){var e=v.e,c=self.teamColors(e.team,e.isG),root;try{root=global.buildHockeyPlayer(T,c.p,e.num,!!e.isG,{secondary:c.s,gear:c.gear});}catch(err){return;}if(!root)return;
    root.userData.setAuto(false);v.root=root;v.body.add(root);v.ph.visible=false;
    var tries=0,iv=setInterval(function(){tries++;if(self.dead){clearInterval(iv);return;}if(root.userData.filled){clearInterval(iv);v.anim=true;self.modelsLoaded=(self.modelsLoaded||0)+(e.isG?0:0)+1;v.body.remove(v.ph);self.pinNumber(v);v.loco=null;}else if(tries>200){clearInterval(iv);root.visible=false;v.ph.visible=true;}},50);})(this.ents[id]);}};
/* the back number rides the chest bone so it follows the animation */
VP.pinNumber=function(v){var T=this.T,m=v.root&&v.root.userData.model,bone=m&&m.getObjectByName('chest');if(!bone||!v.num)return;
  v.g.updateMatrixWorld(true);var rootInv=new T.Matrix4().copy(v.root.matrixWorld).invert(),boneRel=new T.Matrix4().multiplyMatrices(rootInv,bone.matrixWorld);
  var want=new T.Matrix4().compose(new T.Vector3(0,v.e.isG?1.02:1.33,-0.2),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI),new T.Vector3(1,1,1));
  var local=new T.Matrix4().copy(boneRel).invert().multiply(want);v.body.remove(v.num);bone.add(v.num);v.num.matrixAutoUpdate=false;v.num.matrix.copy(local);};
VP.clip=function(v,name,o){if(!v.anim)return null;o=o||{};var act=v.root.userData.play(name,{fade:o.fade!=null?o.fade:0.12,timeScale:o.ts||1,hold:o.hold||0});if(act&&o.at)act.time=o.at;v.oneShotUntil=this.g.t+(Math.max(0.2,(v.root.userData.duration(name)-(o.at||0))/(o.ts||1)))+(o.hold||0);v.loco=null;return act;};
VP.animate=function(v,e,sp,turn){var g=this.g,P=g.puck,speedK=this.replay?0.55:(this.speedK||1),poseNow=v.poseOverride||e.pose;
  // one-shots from play events (pose changes set by the simulation)
  var fresh=poseNow!==v.lastPose||e.poseT>v.lastPoseT+0.02;v.lastPose=poseNow;v.lastPoseT=e.poseT;
  if(fresh&&poseNow!=='skate'){var ps=poseNow;
    if(!e.isG){var st=P.state==='shot'&&P.shot&&P.shot.S===e?P.shot.style:null,q=g.D.seq&&g.D.seq.S===e?g.D.seq.style:null,sty=st||q||{};
      var shotClip=sty.oneTimer?['one_timer',0.3]:(sty.kind==='slap shot'?['slap_shot',0.55]:['wrist_shot',0.38]);
      if(ps==='windup'){this.clip(v,shotClip[0],{at:Math.max(0,shotClip[1]-0.24),ts:speedK});v.shotT=g.t;}
      else if(ps==='shoot'){if(!(v.shotT&&g.t-v.shotT<0.5))this.clip(v,sty.tip?'one_timer':shotClip[0],{at:shotClip[1],ts:speedK});v.shotT=0;}
      else if(ps==='pass'){this.clip(v,'pass',{at:0.3,ts:speedK});}
      else if(ps==='check'){this.clip(v,'body_check',{at:0.3,ts:speedK});}
      else if(ps==='celebrate'&&!(v.celebT&&g.t-v.celebT<4)){v.celebT=g.t;this.clip(v,'celebrate',{ts:speedK});}}
    else{if(ps==='butterfly')this.clip(v,'butterfly',{hold:0.35,ts:speedK});
      else if(ps==='save'){var side=P.y*Math.cos(e.h)-P.x*Math.sin(e.h);this.clip(v,(P.z>1.6&&side>0)||(side>0.6)?'glove_save':'blocker_save',{at:0.15,ts:speedK});}
      else if(ps==='tpush'&&!(v.oneShotUntil>g.t)){var lat=e.vx*Math.cos(e.h+Math.PI/2)+e.vy*Math.sin(e.h+Math.PI/2);this.clip(v,lat>0?'t_push_left':'t_push_right',{ts:speedK});}}}
  if(!e.isG&&P.state==='held'&&P.holder===e&&v.lastHeld!==true&&this.prevPuckState==='pass'&&!(v.oneShotUntil>g.t))this.clip(v,'receive_pass',{at:0.15,ts:speedK});
  v.lastHeld=P.state==='held'&&P.holder===e;
  if(e.isG&&P.state==='frozen'&&P.holder===e&&!v.covered){v.covered=true;this.clip(v,'cover_puck',{hold:0.6,ts:speedK});}if(P.state!=='frozen')v.covered=false;
  if(v.oneShotUntil>g.t)return;
  // locomotion loops (world units/s; skaters top out around 8-9 u/s)
  var u=sp*FT,name,ts=1;
  if(e.isG){name=hyp(P.x-e.x,P.y-e.y)>70?'goalie_idle':'goalie_ready';}
  else if(u<0.7)name='idle';else if(Math.abs(turn)>1.4&&u>1.4)name=turn>0?'crossover_left':'crossover_right';else if(u>3){name='skate_stride';ts=clamp(u/8,0.75,1.7);}else name='glide';
  ts*=speedK;if(name!==v.loco&&v.locoT&&g.t-v.locoT<0.3)return;if(name!==v.loco){v.locoT=g.t;v.loco=name;v.root.userData.play(name,{fade:0.25,timeScale:ts});}else if(name==='skate_stride'&&Math.abs((v.locoTs||1)-ts)>0.08){v.root.userData.play(name,{timeScale:ts});}v.locoTs=ts;};
VP.buildPuck=function(){var T=this.T;var p=new T.Mesh(new T.CylinderGeometry(0.11,0.11,0.07,16),new T.MeshStandardMaterial({color:0x050505,roughness:0.4}));this.scene.add(p);this.puck=p;var sh=new T.Mesh(new T.CircleGeometry(0.2,16),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.25,depthWrite:false}));sh.rotation.x=-Math.PI/2;this.scene.add(sh);this.puckShadow=sh;};
VP.setTags=function(on){this.showTags=on;var self=this;if(!on){for(var id in this.tags){this.ents[id].g.remove(this.tags[id].s);}this.tags={};}};
VP.tagSprite=function(id,text,col){var T=this.T,t=this.tags[id];if(t&&t.text===text)return t;var c=t?t.c:document.createElement('canvas');c.width=128;c.height=48;var x=c.getContext('2d');x.clearRect(0,0,128,48);x.fillStyle='rgba(0,0,0,0.65)';x.fillRect(14,4,100,40);x.fillStyle=col;x.font='bold 28px Arial';x.textAlign='center';x.fillText(text,64,35);
  if(!t){var tex=new T.CanvasTexture(c);var s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));s.scale.set(1.3,0.5,1);s.position.y=2.6;s.renderOrder=9;this.ents[id].g.add(s);t=this.tags[id]={s:s,c:c,tex:tex};}t.text=text;t.tex.needsUpdate=true;return t;};
VP.resize=function(w,h){this.r.setSize(w,h,false);this.cam.aspect=w/Math.max(1,h);this.cam.updateProjectionMatrix();this.w=w;this.h=h;};
VP.replaySample=function(rep){var clip=rep&&rep.clip;if(!clip||clip.length<2)return null;var n=clip.length,u=clamp(rep.u,0,1),span=Math.max(8,Math.min(n,Math.round(n*0.5))),start=n-span,f=start+u*(span-1);
  var i0=clamp(Math.floor(f),0,n-1),i1=Math.min(n-1,i0+1),a=f-i0,A=clip[i0],B=clip[i1],by={};A.pl.forEach(function(p){by[p.id]={a:p};});B.pl.forEach(function(p){by[p.id]=by[p.id]||{a:p};by[p.id].b=p;});var map={};Object.keys(by).forEach(function(id){var pa=by[id].a,pb=by[id].b||pa;map[id]={x:lerp(pa.x,pb.x,a),y:lerp(pa.y,pb.y,a),h:a<0.5?pa.h:pb.h,pose:a<0.5?pa.pose:pb.pose};});
  return {map:map,puck:{x:lerp(A.p.x,B.p.x,a),y:lerp(A.p.y,B.p.y,a),z:lerp(A.p.z||0,B.p.z||0,a)}};};
VP.render=function(alpha,dt){var g=this.g,T=this.T,self=this,P=g.puck;dt=dt||1/60;var rep=this.replay?this.replaySample(this.replay):null;
  for(var id in this.ents){var v=this.ents[id],e=v.e,rp=rep&&rep.map[id],vis=rp?true:(e.onIce||e.mode==='leaving'||e.mode==='toBox'||e.mode==='box'||(e.isG&&g.goalieOn[e.team]));if(rep&&!rp)vis=false;if(!rep&&g.phase==='shootout'&&!e.isG)vis=e.onIce;v.g.visible=vis;if(!vis){v.poseOverride=null;continue;}
    var x=rp?rp.x:lerp(e.px,e.x,alpha),y=rp?rp.y:lerp(e.py,e.y,alpha);v.poseOverride=rp?rp.pose:null;v.g.position.set(x*FT,0,-y*FT);
    var h=rp?rp.h:e.h;v.yaw+=Math.atan2(Math.sin(h+Math.PI/2-v.yaw),Math.cos(h+Math.PI/2-v.yaw))*Math.min(1,dt*12);v.g.rotation.y=v.yaw;
    var sp=rp?hyp(rp.x-(v._rx==null?rp.x:v._rx),rp.y-(v._ry==null?rp.y:v._ry))/Math.max(dt,1e-3):hyp(e.vx,e.vy);if(rp){v._rx=rp.x;v._ry=rp.y;}else{v._rx=v._ry=null;}var stride=Math.min(1,sp/22);v.bob+=dt*(4+sp*0.25);var lean=0,pitch=0,yS=1,yOff=0;
    var acc=(sp-(v.lsp||0))/Math.max(dt,1e-3);v.lsp=sp;pitch=clamp(0.12*stride+acc*0.004,-0.1,0.3);
    var turn=Math.atan2(Math.sin(h-(v.lh==null?h:v.lh)),Math.cos(h-(v.lh==null?h:v.lh)))/Math.max(dt,1e-3);v.lh=h;lean=clamp(-turn*0.05*stride,-0.35,0.35);v.lean=lerp(v.lean,lean,Math.min(1,dt*8));
    var pose=rp?rp.pose:e.pose;if(pose==='shoot'||pose==='windup'){pitch=0.32;}else if(pose==='pass'){pitch=0.2;}else if(pose==='check'){pitch=0.35;}else if(pose==='hit'){pitch=-0.25;}else if(pose==='fall'){pitch=1.3;yOff=-0.3;}else if(pose==='block'){pitch=0.9;yOff=-0.4;}else if(pose==='celebrate'){yOff=Math.abs(Math.sin(g.t*7))*0.25;pitch=-0.15;}
    if(e.isG){pitch=0.18;if(pose==='butterfly'||pose==='save'){yS=0.72;}else if(pose==='tpush'){v.lean=clamp(v.lean,-0.2,0.2);}}
    if(v.anim){this.animate(v,e,sp,turn);var big=pose==='fall'||pose==='block'||pose==='hit';v.body.rotation.set(big?pitch:0,0,e.isG?0:v.lean*0.6);v.body.scale.set(1,1,1);v.body.position.y=big?yOff:0;}
    else{v.body.rotation.set(pitch,0,v.lean+(e.isG?0:Math.sin(v.bob)*0.05*stride));v.body.scale.set(e.isG&&yS<1?1.18:1,yS,1);v.body.position.y=yOff+(e.isG?0:Math.abs(Math.sin(v.bob))*0.03*stride);}
    if(this.showTags){var lab=e.isG?'G':(e.sys||e.role||'');var colr=e.sys?'#ff6b6b':(/^(QB|FL|FR|NET|BUMP)$/.test(e.role)?'#ffd54a':/^P[FD]/.test(e.role)?'#7fdcff':'#ffffff');if(lab)this.tagSprite(id,lab,colr).s.visible=true;else if(this.tags[id])this.tags[id].s.visible=false;}}
  this.prevPuckState=P.state;
  var px=rep?rep.puck.x:lerp(P.px,P.x,alpha),py=rep?rep.puck.y:lerp(P.py,P.y,alpha),pz=rep?rep.puck.z:lerp(P.pz,P.z,alpha);this.puck.position.set(px*FT,0.04+pz*FT,-py*FT);this.puckShadow.position.set(px*FT,0.012,-py*FT);this.puck.visible=rep||P.state!=='dead'||g.phase==='faceoff';
  if(rep){var dir=g.dir(g.goalTeam||'home'),netX=GL*dir*FT,sway=Math.sin((this.replay.u||0)*Math.PI)*1.1;this.cam.position.set(netX+dir*2.6,1.62,2.6+sway);var lookX=lerp(netX-dir*18,px*FT,0.42);this.cam.lookAt(lookX,1.05,sway*0.25);if(Math.abs(this.cam.fov-28)>0.01){this.cam.fov=28;this.cam.updateProjectionMatrix();}}
  else{// broadcast camera: side-on from the camera-side stands, follows the play with critical damping
  var follow=(g.phase==='faceoff'&&g.foDot)?g.foDot.x:P.state==='held'&&P.holder?P.holder.x+P.holder.vx*0.5:px;if(g.phase==='goal'&&g.goalScorer)follow=g.goalScorer.x;var tx=clamp(follow*FT*0.85,-19,19);
  var k=3.2,a=(tx-this.camX)*k*k-2*k*this.camV;this.camV+=a*dt;this.camX+=this.camV*dt;
  this.camHs=(this.camHs==null?this.camH:this.camHs)+((this.camH||0)-(this.camHs==null?this.camH:this.camHs))*Math.min(1,dt*2.5);var hi=this.camHs;var cy=lerp(10.5,17,hi),cz=lerp(25,40,hi),ly=lerp(-0.6,4,hi);this.cam.position.set(this.camX*0.94,cy,cz);this.cam.lookAt(this.camX,ly,-2.2);var fov=lerp(30,50,hi);if(Math.abs(this.cam.fov-fov)>0.01){this.cam.fov=fov;this.cam.updateProjectionMatrix();}}
  if(this.screens.length||this.ribbon){this.drawScreens();if(this.ribbon)this.ribbon.t.offset.x=(this.ribbon.t.offset.x+dt*0.02)%1;}
  this.r.render(this.scene,this.cam);};
VP.dispose=function(){this.dead=true;try{this.r.dispose();if(this.r.forceContextLoss)this.r.forceContextLoss();}catch(e){}};
/* ====================================================================================================
   View2D: canvas fallback (no WebGL). Same data, top-down broadcast board.
   ==================================================================================================== */
function View2D(canvas,game){this.c=canvas;this.g=game;this.x=canvas.getContext('2d');this.ok=!!this.x;}
View2D.prototype.resize=function(w,h){this.c.width=w;this.c.height=h;this.w=w;this.h=h;};
View2D.prototype.render=function(alpha){var x=this.x,g=this.g,w=this.w||this.c.width,h=this.h||this.c.height,s=Math.min(w/215,h/95),ox=w/2,oy=h/2;function X(f){return ox+f*s;}function Y(f){return oy-f*s;}
  x.fillStyle='#05070b';x.fillRect(0,0,w,h);x.save();x.beginPath();var hx=RX*s,hy=RY*s,r=CR*s;x.moveTo(ox-hx+r,oy-hy);x.arcTo(ox+hx,oy-hy,ox+hx,oy+hy,r);x.arcTo(ox+hx,oy+hy,ox-hx,oy+hy,r);x.arcTo(ox-hx,oy+hy,ox-hx,oy-hy,r);x.arcTo(ox-hx,oy-hy,ox+hx,oy-hy,r);x.closePath();x.fillStyle='#eef4f8';x.fill();x.lineWidth=3;x.strokeStyle='#c9ccd0';x.stroke();x.clip();
  x.fillStyle='#c8102e';x.fillRect(X(0)-1.5,0,3,h);x.fillStyle='#1f4aa8';x.fillRect(X(25)-2,0,4,h);x.fillRect(X(-25)-2,0,4,h);x.fillStyle='#c8102e';x.fillRect(X(89)-1,0,2,h);x.fillRect(X(-89)-1,0,2,h);
  x.strokeStyle='#c8102e';[[69,22],[69,-22],[-69,22],[-69,-22]].forEach(function(d){x.beginPath();x.arc(X(d[0]),Y(d[1]),15*s,0,7);x.stroke();});x.restore();
  var sp=g.spec;for(var id in g.ents){var e=g.ents[id];if(!(e.onIce||(e.isG&&g.goalieOn[e.team])))continue;var px=lerp(e.px,e.x,alpha),py=lerp(e.py,e.y,alpha),jr=sp.teams[e.team].jersey||['#888','#fff'];x.beginPath();x.arc(X(px),Y(py),(e.isG?3.2:2.6)*s,0,7);x.fillStyle=e.team==='home'?jr[0]:'#f4f6f8';x.fill();x.lineWidth=2;x.strokeStyle=e.team==='home'?jr[1]:jr[0];x.stroke();x.fillStyle=e.team==='home'?(jr[1]||'#fff'):jr[0];x.font='bold '+Math.round(2.6*s)+'px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(String(e.num||''),X(px),Y(py)+0.5);}
  var P=g.puck;x.beginPath();x.arc(X(lerp(P.px,P.x,alpha)),Y(lerp(P.py,P.y,alpha)),Math.max(2,0.9*s),0,7);x.fillStyle='#000';x.fill();};
View2D.prototype.dispose=function(){};View2D.prototype.setTags=function(){};
/* ====================================================================================================
   UI controller: scoreboard, play-by-play, 2x, sim to end of period, skip to box score
   ==================================================================================================== */
var CSS='.live-rink .lv-sog{font-size:11px;color:#9fb3c8;letter-spacing:.08em;display:block}.live-rink .lv-pp{display:inline-block;margin-left:8px;padding:1px 6px;border-radius:3px;background:#ffb81c;color:#000;font-size:11px;font-weight:700;letter-spacing:.06em}.live-rink .lv-pp[hidden]{display:none}'+
 '.live-rink .lv-banner{position:absolute;left:50%;top:14%;transform:translateX(-50%);min-width:320px;text-align:center;background:rgba(5,7,11,.86);border:2px solid #ffb81c;border-radius:6px;padding:10px 22px;pointer-events:none;transition:opacity .25s}.live-rink .lv-banner b{display:block;font-size:30px;letter-spacing:.1em;color:#ffb81c}.live-rink .lv-banner span{display:block;font-size:15px;margin-top:4px;color:#fff}.live-rink .lv-banner[hidden]{display:none}'+
 '.live-rink .lv-tactic{position:absolute;left:14px;top:44px;background:rgba(5,7,11,.88);border:1px solid #ffb81c;color:#ffb81c;font-size:13px;font-weight:800;letter-spacing:.16em;padding:5px 10px;border-radius:3px;pointer-events:none}.live-rink .lv-tactic[hidden]{display:none}'+
 '.live-rink .lv-replay{position:absolute;left:16px;bottom:16px;display:flex;align-items:center;gap:10px;background:#07090d;border:2px solid #ffb81c;border-radius:4px;padding:6px 12px 6px 6px;z-index:6;box-shadow:0 10px 28px rgba(0,0,0,.5)}.live-rink .lv-replay b{background:#ffb81c;color:#111;font-size:15px;letter-spacing:.18em;padding:5px 9px;font-weight:800}.live-rink .lv-replay small{color:#e7edf4;font-size:12px;letter-spacing:.03em}.live-rink .lv-replay[hidden]{display:none}'+
 '.live-rink .lv-strength{position:absolute;left:14px;top:12px;background:rgba(5,7,11,.75);padding:5px 10px;border-radius:4px;font-size:12px;letter-spacing:.08em;color:#cfd8e3;pointer-events:none}.live-rink .lv-log{position:absolute;right:12px;top:12px;width:300px;max-height:40%;overflow:hidden;background:rgba(5,7,11,.6);border-radius:4px;padding:6px 10px;font-size:12px;line-height:1.45;color:#cfd8e3;pointer-events:none}.live-rink .lv-log div b{color:#ffb81c;font-weight:700;margin-right:6px}'+
 '.live-rink-actions .lv-left{margin-right:auto;display:flex;gap:8px;align-items:center;color:#9fb3c8;font-size:12px}.live-rink-actions button.on{background:#ffb81c;color:#000}@media(max-width:720px){.live-rink .lv-log{display:none}.live-rink-actions{flex-wrap:wrap}}';
function el(tag,cls,html){var d=document.createElement(tag);if(cls)d.className=cls;if(html!=null)d.innerHTML=html;return d;}
function openLive(o){if(typeof document==='undefined')return null;o=o||{};var spec=o.spec;if(!spec)throw new Error('no spec');
  if(!document.getElementById('ctfo-live-css')){var st=document.createElement('style');st.id='ctfo-live-css';st.textContent=CSS;document.head.appendChild(st);}
  var game=new Game(spec,{periodMs:o.periodMs,otMs:o.otMs});
  var root=el('section','live-rink');root.setAttribute('data-live','v9');
  root.innerHTML='<div class="live-rink-bar"><div class="live-rink-side"><small id="live-away-name"></small><strong id="live-away-score">0</strong><span><span class="lv-sog" id="lv-away-sog">SOG 0</span><span class="lv-pp" id="lv-away-pp" hidden>PP</span></span></div><div class="live-rink-clock"><span id="live-period">1ST PERIOD</span><b id="live-clock">20:00</b></div><div class="live-rink-side away"><span><span class="lv-sog" id="lv-home-sog">SOG 0</span><span class="lv-pp" id="lv-home-pp" hidden>PP</span></span><strong id="live-home-score">0</strong><small id="live-home-name"></small></div></div><div id="live-call">Opening faceoff</div><div class="live-rink-stage"><canvas id="live-ice"></canvas><div class="lv-strength" id="lv-strength">5 ON 5</div><div class="lv-log" id="lv-log"></div><div class="lv-banner" id="lv-banner" hidden><b></b><span></span></div><div class="lv-tactic" id="lv-tactic" hidden></div><div class="lv-replay" id="lv-replay" hidden><b>REPLAY</b><small>Click or press a key to skip</small></div></div><div class="live-rink-actions"><div class="lv-left"><button type="button" id="live-tags" title="Show F1/F2/F3 and power-play roles">Show systems</button><button type="button" id="live-cam" title="Higher camera shows the scoreboard and banners">High camera</button></div><button type="button" id="live-speed">2x speed</button><button type="button" id="live-simper">Sim to end of period</button><button type="button" id="live-skip" class="gold">Skip to box score</button></div>';
  document.body.appendChild(root);var $=function(id){return root.querySelector('#'+id);};
  $('live-away-name').textContent=(spec.teams.away.name||spec.away).toUpperCase();$('live-home-name').textContent=(spec.teams.home.name||spec.home).toUpperCase();
  var canvas=$('live-ice'),view=null,lowPower=!!o.lowPower;
  var speed=1,acc=0,last=null,raf=0,closed=false,finished=false,simming=false,replaying=null,ui={game:game,view:null,root:root,speed:function(){return speed;}};
  function makeView(){if(!o.force2d&&global.THREE){try{view=new View3D(canvas,game,{lowPower:lowPower,noArena:o.noArena,noModels:o.noModels,highCam:o.highCam});if(!view.ok)view=null;}catch(e){if(global.console)console.warn('live 3d',e);view=null;}}
    if(!view){var c2=canvas.cloneNode(false);canvas.parentNode.replaceChild(c2,canvas);canvas=c2;view=new View2D(canvas,game);}ui.view=view;resize();}
  function resize(){if(!view)return;var st=root.querySelector('.live-rink-stage'),w=st.clientWidth||960,h=st.clientHeight||540;view.resize(w,h);}
  global.addEventListener('resize',resize);
  var lastCall='',lastLog=0;
  function hud(){var g=game,sp=spec;$('live-away-score').textContent=g.score.away;$('live-home-score').textContent=g.score.home;$('lv-away-sog').textContent='SOG '+g.sog.away;$('lv-home-sog').textContent='SOG '+g.sog.home;$('live-clock').textContent=g.clockText();$('live-period').textContent=g.periodText();
    var pp=g.ppInfo();$('lv-away-pp').hidden=!(pp&&pp.pp==='away');$('lv-home-pp').hidden=!(pp&&pp.pp==='home');if(pp&&pp.left!=null){$('lv-'+pp.pp+'-pp').textContent='PP '+clockLabel(pp.left);}
    var nh=g.on.home.length+(g.goalieOn.home?1:0),na=g.on.away.length+(g.goalieOn.away?1:0);$('lv-strength').textContent=g.phase==='shootout'?'SHOOTOUT':(g.skaters('away').filter(function(e){return e.mode==='play';}).length+' ON '+g.skaters('home').filter(function(e){return e.mode==='play';}).length)+(pp?' · '+sp.teams[pp.pp].abbr+' POWER PLAY':'')+(g.pulled?' · '+sp.teams[g.pulled.team].abbr+' EMPTY NET':'');
    var tacTeam=g.possTeam,tac=tacTeam&&g.spec.teams[tacTeam]&&g.spec.teams[tacTeam].strategy&&g.spec.teams[tacTeam].strategy.offensive,tb=$('lv-tactic');if(tb){var showT=tac&&tac!=='Balanced'&&g.phase==='play'&&!replaying;tb.hidden=!showT;if(showT)tb.textContent=tac.toUpperCase();}
    if(g.call!==lastCall){lastCall=g.call;$('live-call').textContent=g.call;}
    if(g.calls.length&&g.calls[g.calls.length-1]!==lastLog){lastLog=g.calls[g.calls.length-1];var lg=$('lv-log');lg.innerHTML=g.calls.slice(-9).reverse().map(function(c){var k=gameClock(Math.min(c.t,g.S.end));return '<div><b>'+(k.period===4?'OT':'P'+k.period)+' '+intoLabel(c.t)+'</b>'+String(c.text).replace(/</g,'&lt;')+'</div>';}).join('');}
    var b=g.banner,bn=$('lv-banner');if(b){bn.hidden=false;bn.querySelector('b').textContent=b.title;bn.querySelector('span').textContent=b.sub||'';}else bn.hidden=true;}
  function skipReplay(){if(!replaying)return;replaying=null;game.replayDone=true;game.replayHold=false;if(view)view.replay=null;var bug=$('lv-replay');if(bug)bug.hidden=true;}
  function showReplay(now){var gap=replaying.last==null?0:Math.min(0.05,Math.max(0,(now-replaying.last)/1000));replaying.last=now;replaying.elapsed=(replaying.elapsed||0)+gap;var u=replaying.elapsed/replaying.dur;if(u>=1){skipReplay();return;}if(view)view.replay={clip:replaying.clip,u:Math.max(0,Math.min(1,u)),team:game.goalTeam};var bug=$('lv-replay');if(bug)bug.hidden=false;}
  function considerReplay(now){if(replaying){showReplay(now);return;}
    if(simming||speed!==1||!view||view.camH==null)return;if(game.phase==='goal'&&game.replayClip&&game.replayClip.length>6&&!game.replayUsed&&game.phaseT>0.45){game.replayUsed=true;game.replayHold=true;replaying={t0:now,last:now,elapsed:0,dur:clamp(game.replayDur||5,4,6),clip:game.replayClip};showReplay(now);}}
  function onReplayKey(ev){if(!replaying)return;skipReplay();if(ev&&ev.preventDefault)ev.preventDefault();}
  root.addEventListener('click',function(ev){if(!replaying)return;if(ev.target&&ev.target.closest&&ev.target.closest('button'))return;skipReplay();});
  global.addEventListener('keydown',onReplayKey);
  function frame(now){if(closed||!view)return;raf=requestAnimationFrame(frame);if(last==null)last=now;var real=Math.min(0.25,(now-last)/1000);last=now;considerReplay(now);if(speed!==1&&replaying)skipReplay();acc+=real*speed;var n=0,maxN=Math.max(1,Math.ceil(16*speed));while(!replaying&&acc>=DT&&n<maxN&&!game.done){game.step(DT);acc-=DT;n++;}if(n>=maxN)acc=0;if(game.done&&!finished){finished=true;onDone();}
    try{view.render(replaying?1:Math.min(1,acc/DT),real);}catch(e){if(global.console)console.error('live render',e);}hud();}
  function onDone(){$('live-skip').textContent='Box score';$('live-simper').disabled=true;$('live-speed').disabled=true;ui.autoClose=setTimeout(function(){close(true);},o.autoCloseMs!=null?o.autoCloseMs:(game.quick?2500:9000));}
  function close(fin){if(closed)return;closed=true;cancelAnimationFrame(raf);clearTimeout(ui.autoClose);global.removeEventListener('resize',resize);global.removeEventListener('keydown',onReplayKey);try{view.dispose();}catch(e){}if(root.parentNode)root.parentNode.removeChild(root);if(global.CTFOLive&&global.CTFOLive.current===ui)global.CTFOLive.current=null;if(o.onFinish)o.onFinish({game:game,finished:!!fin});}
  $('live-speed').onclick=function(){speed=speed===1?2:1;if(speed!==1)skipReplay();if(view)view.speedK=speed;this.classList.toggle('on',speed===2);this.textContent=speed===2?'1x speed':'2x speed';};
  $('live-simper').onclick=function(){var btn=this;simming=true;skipReplay();btn.disabled=true;btn.textContent='Simulating...';setTimeout(function(){try{ui.simToEndOfPeriod();}finally{simming=false;btn.disabled=game.done;btn.textContent='Sim to end of period';}},20);};
  $('live-skip').onclick=function(){close(game.done);};
  $('live-tags').onclick=function(){var on=!view.showTags;view.setTags&&view.setTags(on);this.classList.toggle('on',on);};
  $('live-cam').onclick=function(){if(view.camH==null)return;view.camH=view.camH?0:1;this.classList.toggle('on',!!view.camH);};
  ui.simToEndOfPeriod=function(){var n=0;while(!game.done&&game.phase==='intermission'&&n<100000){game.step(DT);n++;}var p=game.period;while(!game.done&&n<600000){var ph=game.phase;if(game.period!==p||ph==='intermission'||ph==='shootout')break;game.step(DT);n++;}
    // land at the intermission (or final) so the scoreboard shows the period-end state
    acc=0;hud();return n;};
  ui.setSpeed=function(n){speed=n;if(view)view.speedK=Math.max(1,Math.min(3,n));};ui.close=close;ui.hud=hud;global.CTFOLive.current=ui;hud();
  function start(){if(closed)return;makeView();raf=requestAnimationFrame(frame);}
  if(global.THREE&&global.THREE.GLTFLoader||o.force2d)start();
  else loadScriptOnce('vendor/three.min.js','THREE',function(){if(!global.THREE){start();return;}loadScriptOnce('vendor/GLTFLoader.js',null,function(){start();});});
  return ui;}
/* ---------- exports ---------- */
var API={Game:Game,buildSchedule:buildSchedule,version:VERSION,DT:DT,
  open:function(o){return (typeof openLive==='function')?openLive(o):null;},
  util:{rinkClamp:rinkClamp,clockLabel:clockLabel,gameClock:gameClock,intoLabel:intoLabel}};
global.CTFOLive=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
