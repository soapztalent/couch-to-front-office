
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
