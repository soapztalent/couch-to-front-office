(function(){
  var maps={};
  function texture(THREE, b64){
    if(maps[b64]) return maps[b64];
    var img=new Image();
    var t=new THREE.Texture(img);
    img.onload=function(){ t.needsUpdate=true; };
    img.src='data:image/png;base64,'+b64;
    if(THREE.sRGBEncoding) t.encoding=THREE.sRGBEncoding;
    maps[b64]=t;
    return t;
  }
  window.buildHockeyPlayer=function(THREE, color, num, isGoalie){
    var pack=window.PLAYER_SPRITE&&window.PLAYER_SPRITE[isGoalie?'goalie':'skater'];
    var root=new THREE.Group();
    root.userData={legL:{rotation:{}}, legR:{rotation:{}}, goalie:isGoalie?1:0, card:1};
    if(!pack) return root;
    var height=isGoalie?1.28:1.92;
    var width=height*(pack.w/pack.h);
    var mat=new THREE.MeshBasicMaterial({map:texture(THREE, pack.b), transparent:true, alphaTest:0.35, side:THREE.DoubleSide, depthWrite:true});
    var card=new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    card.position.y=height*0.5;
    card.frustumCulled=false;
    root.add(card);
    return root;
  };
})();
