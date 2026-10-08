(function(){
  var cache={};
  function load(THREE, url, key, done){
    if(cache[key]){ done(cache[key]); return; }
    cache.q=cache.q||{};
    (cache.q[key]=cache.q[key]||[]).push(done);
    if(cache.q[key].length>1) return;
    var loader=new THREE.GLTFLoader();
    loader.load(url, function(gltf){
      cache[key]=gltf.scene;
      cache.q[key].forEach(function(fn){ fn(gltf.scene); });
    });
  }
  window.buildHockeyPlayer=function(THREE, color, num, isGoalie){
    var root=new THREE.Group();
    root.userData={legL:{rotation:{}}, legR:{rotation:{}}, goalie:isGoalie?1:0};
    var url=isGoalie?'models/bruins_goalie_3d.glb':'models/hockey_skater_3d.glb';
    load(THREE, url, isGoalie?'goalie':'skater', function(src){
      if(root.userData.filled) return;
      root.userData.filled=1;
      var model=src.clone(true);
      model.rotation.x=-Math.PI/2;
      model.scale.setScalar(0.78);
      root.add(model);
    });
    return root;
  };
})();
