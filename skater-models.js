(function(){
  function mats(THREE, color){
    var hex=String(color||'#222');
    var r=parseInt(hex.slice(1,3),16)||0, g=parseInt(hex.slice(3,5),16)||0, b=parseInt(hex.slice(5,7),16)||0;
    var lum=(r*299+g*587+b*114)/1000;
    var body=lum>175?'#161616':hex, stripe=lum>175?hex:'#f2f2f2';
    return {
      jersey:new THREE.MeshStandardMaterial({color:body,roughness:0.5}),
      stripe:new THREE.MeshStandardMaterial({color:stripe,roughness:0.4}),
      black:new THREE.MeshStandardMaterial({color:0x1c1c1c,roughness:0.65}),
      pad:new THREE.MeshStandardMaterial({color:0xf7f7f7,roughness:0.38}),
      steel:new THREE.MeshStandardMaterial({color:0xc5ccd3,metalness:0.7,roughness:0.25}),
      glove:new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:0.55})
    };
  }
  function add(parent, THREE, geo, mat, x, y, z, rx, ry, rz){
    var m=new THREE.Mesh(geo, mat);
    m.position.set(x||0, y||0, z||0);
    if(rx)m.rotation.x=rx;
    if(ry)m.rotation.y=ry;
    if(rz)m.rotation.z=rz;
    parent.add(m);
    return m;
  }
  function stickBetween(parent, THREE, mat, ax, ay, az, bx, by, bz, radius){
    var dir=new THREE.Vector3(bx-ax, by-ay, bz-az), len=dir.length()||0.001;
    var m=new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
    m.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    parent.add(m);
    return m;
  }
    function plate(THREE, num){
    var c=document.createElement('canvas');
    c.width=128; c.height=128;
    var g=c.getContext('2d');
    g.fillStyle='#fff';
    g.font='700 80px Arial';
    g.textAlign='center';
    g.textBaseline='middle';
    g.fillText(String(num==null?'':num), 64, 68);
    var m=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.28), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
    return m;
  }
  function skater(THREE, color, num){
    var M=mats(THREE, color), root=new THREE.Group();
    function leg(x){
      var g=new THREE.Group();
      g.position.set(x, 0.92, 0);
      add(g, THREE, new THREE.CylinderGeometry(0.09,0.08,0.36,10), M.black, 0, -0.16, 0);
      add(g, THREE, new THREE.CylinderGeometry(0.07,0.06,0.32,10), M.stripe, 0, -0.46, 0.02, -0.2);
      add(g, THREE, new THREE.BoxGeometry(0.13,0.09,0.26), M.black, 0, -0.64, 0.06);
      add(g, THREE, new THREE.BoxGeometry(0.015,0.045,0.3), M.steel, 0, -0.71, 0.06);
      root.add(g);
      return g;
    }
    var legL=leg(-0.15), legR=leg(0.15);
    var body=new THREE.Group();
    body.position.y=0.95;
    body.rotation.x=0.28;
    add(body, THREE, new THREE.CylinderGeometry(0.18,0.2,0.22,12), M.black, 0, 0.08, 0);
    add(body, THREE, new THREE.CylinderGeometry(0.18,0.22,0.42,12), M.jersey, 0, 0.36, 0);
    add(body, THREE, new THREE.CylinderGeometry(0.24,0.24,0.045,12), M.stripe, 0, 0.2, 0);
    add(body, THREE, new THREE.BoxGeometry(0.52,0.12,0.24), M.jersey, 0, 0.54, 0);
    add(body, THREE, new THREE.CylinderGeometry(0.055,0.05,0.28,8), M.jersey, -0.28, 0.38, 0.04, 0.5, 0, 0.35);
    add(body, THREE, new THREE.CylinderGeometry(0.055,0.05,0.28,8), M.jersey, 0.28, 0.34, 0.1, 0.8, 0, -0.3);
    add(body, THREE, new THREE.SphereGeometry(0.055,10,8), M.glove, 0.34, 0.22, 0.08);
    add(body, THREE, new THREE.SphereGeometry(0.055,10,8), M.glove, -0.34, 0.22, 0.08);
    add(body, THREE, new THREE.SphereGeometry(0.16,16,12), M.jersey, 0, 0.74, 0.04);
    add(body, THREE, new THREE.BoxGeometry(0.16,0.035,0.05), M.black, 0, 0.73, 0.18);
    var numPlate=plate(THREE, num);
    numPlate.position.set(0, 0.38, -0.2);
    body.add(numPlate);
    root.add(body);
    stickBetween(root, THREE, M.black, 0.36, 1.12, 0.12, 0.72, 0.04, 0.38, 0.016);
    add(root, THREE, new THREE.BoxGeometry(0.22,0.02,0.08), M.black, 0.78, 0.03, 0.42);
    root.userData={legL:legL, legR:legR};
    return root;
  }
  function goalie(THREE, color, num){
    var M=mats(THREE, color), root=new THREE.Group();
    function leg(x){
      var g=new THREE.Group();
      g.position.set(x, 0.86, 0.02);
      add(g, THREE, new THREE.BoxGeometry(0.26,0.62,0.14), M.pad, 0, -0.28, 0.04);
      add(g, THREE, new THREE.BoxGeometry(0.28,0.07,0.18), M.pad, 0, -0.58, 0.08);
      add(g, THREE, new THREE.BoxGeometry(0.016,0.04,0.26), M.steel, 0, -0.64, 0.08);
      root.add(g);
      return g;
    }
    var legL=leg(-0.2), legR=leg(0.2);
    var body=new THREE.Group();
    body.position.set(0, 0.9, 0);
    body.rotation.x=0.18;
    add(body, THREE, new THREE.BoxGeometry(0.58,0.5,0.32), M.jersey, 0, 0.32, 0.02);
    add(body, THREE, new THREE.BoxGeometry(0.64,0.12,0.3), M.jersey, 0, 0.54, 0);
    add(body, THREE, new THREE.BoxGeometry(0.6,0.05,0.34), M.stripe, 0, 0.14, 0.02);
    add(body, THREE, new THREE.SphereGeometry(0.17,16,12), M.pad, 0, 0.78, 0.04);
    add(body, THREE, new THREE.BoxGeometry(0.18,0.08,0.04), M.steel, 0, 0.76, 0.2);
    var catcher=add(body, THREE, new THREE.BoxGeometry(0.16,0.18,0.08), M.pad, -0.42, 0.32, 0.08);
    var blocker=add(body, THREE, new THREE.BoxGeometry(0.14,0.2,0.08), M.pad, 0.42, 0.3, 0.06);
    var numPlate=plate(THREE, num);
    numPlate.position.set(0, 0.34, -0.18);
    body.add(numPlate);
    root.add(body);
    stickBetween(root, THREE, M.pad, 0.46, 1.05, 0.12, 0.62, 0.08, 0.48, 0.03);
    add(root, THREE, new THREE.BoxGeometry(0.16,0.05,0.28), M.pad, 0.66, 0.06, 0.55);
    root.userData={legL:legL, legR:legR, goalie:1};
    return root;
  }
  window.buildHockeyPlayer=function(THREE, color, num, isGoalie){
    return isGoalie?goalie(THREE, color, num):skater(THREE, color, num);
  };
})();
