(function(){
  var ready={}, wait={skater:[], goalie:[]}, started={};
  function bytes(b64){
    var bin=atob(b64), n=bin.length, u=new Uint8Array(n);
    for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
    return u.buffer;
  }
  function attach(root, src){
    var model=src.clone(true);
    model.rotation.x=-Math.PI/2;
    model.scale.setScalar(0.78);
    model.traverse(function(o){ if(o.isMesh) o.frustumCulled=false; });
    root.add(model);
    root.userData.filled=1;
  }
  window.buildHockeyPlayer=function(THREE, color, num, isGoalie){
    var root=new THREE.Group();
    var key=isGoalie?'goalie':'skater';
    root.userData={legL:{rotation:{}}, legR:{rotation:{}}, goalie:isGoalie?1:0};
    if(ready[key]){ attach(root, ready[key]); return root; }
    (wait[key]=wait[key]||[]).push(root);
    if(started[key]) return root;
    started[key]=1;
    var data=window.PLAYER_GLB&&window.PLAYER_GLB[key];
    if(!data||!THREE.GLTFLoader) return root;
    new THREE.GLTFLoader().parse(bytes(data), '', function(gltf){
      ready[key]=gltf.scene;
      wait[key].forEach(function(r){ if(!r.userData.filled) attach(r, gltf.scene); });
    }, function(err){ console.error(err); });
    return root;
  };
})();
