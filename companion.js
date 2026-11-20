(function () {
  'use strict';
  let bodyImage=null,bodyReady=false;
  const rigs=new WeakMap();
  if(typeof Image==='function'){
    bodyImage=new Image();
    bodyImage.onload=()=>{bodyReady=true;window.dispatchEvent(new Event('qimai-avatar-ready'));};
    bodyImage.src='assets/mascot/liukanshan-body.png';
  }
  function interpolate(from,to,amount,seated=false) {
    const t=Math.max(0,Math.min(1,amount)),ease=t*t*(3-2*t),points={};
    Object.keys(from).forEach(key=>{points[key]=[from[key][0]+(to[key][0]-from[key][0])*ease,from[key][1]+(to[key][1]-from[key][1])*ease];});
    if(seated){points[23]=[.43,.61];points[24]=[.57,.61];points[25]=[.34,.70];points[26]=[.66,.70];points[27]=[.34,.88];points[28]=[.66,.88];}
    return points;
  }
  function draw(canvas,points,equipped={},options={}) {
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
    const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
    const scene=equipped.scene;
    const palette=scene==='sunset'?['#fbf1eb','#f2d8cf','#d9a99d']:scene==='moon'?['#ececfa','#d9def2','#a5aed5']:['#edf5ff','#deedf9','#aac9e4'];
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,palette[0]);bg.addColorStop(1,palette[1]);c.fillStyle=bg;c.fillRect(0,0,w,h);
    const circle=(x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    if(!options.preview){
      c.strokeStyle='#ffffffa0';c.lineWidth=1;
      for(const radius of [.32,.42]){c.beginPath();c.arc(w*.5,h*.43,Math.max(w,h)*radius,0,Math.PI*2);c.stroke();}
      circle(w*.82,h*.18,h*.035,scene==='moon'?'#fff9dd':'#ffffffa8');
      if(scene==='moon'){circle(w*.83,h*.17,h*.028,palette[0]);}
      c.fillStyle=palette[2]+'28';c.beginPath();c.moveTo(0,h*.83);c.bezierCurveTo(w*.25,h*.61,w*.56,h*.94,w,h*.76);c.lineTo(w,h);c.lineTo(0,h);c.fill();
      c.fillStyle='#ffffff55';c.beginPath();c.moveTo(0,h*.91);c.bezierCurveTo(w*.4,h*.76,w*.67,h*.88,w,h*.83);c.lineTo(w,h);c.lineTo(0,h);c.fill();
    }
    const bottom=options.practice?105:options.preview?5:25;
    const size=options.outfit?Math.min(w*.82,h*1.65):options.practice?Math.min(w*.78,(h-bottom)*.98):Math.min(w*.81,(h-bottom)*1.08),ox=(w-size)/2,oy=options.outfit?4:(h-bottom-size*(options.practice?.98:.84))/2+3;
    const p=id=>{let x=points[id][0],y=points[id][1];if(id>=25){if(!options.practice){const hip=points[id%2===1?23:24][1];y=hip+(y-hip)*.65;}if(options.seated)x=.5+(x-.5)*.55;}return[ox+x*size,oy+y*size];};
    const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
    const line=(a,b,width,color)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();};
    const floor=(options.practice?oy+size*(options.seated?.88:.94):Math.max(p(27)[1],p(28)[1]))+size*.015;
    oval(w*.5,floor,size*.30,size*.041,'#ffffffa8');
    oval(w*.5,floor-size*.004,size*.21,size*.022,'#7193b71d');
    const limb=(a,b,width)=>{
      const shade=c.createLinearGradient(a[0]-width*.5,a[1]-width*.5,b[0]+width*.5,b[1]+width*.5);
      shade.addColorStop(0,'#24292f');shade.addColorStop(.48,'#3e444b');shade.addColorStop(1,'#252a30');
      line(a,b,width,shade);
    };
    if(options.seated){
      line([ox+size*.30,oy+size*.66],[ox+size*.70,oy+size*.66],size*.04,'#d5b18b');
      line([ox+size*.33,oy+size*.68],[ox+size*.30,floor],size*.024,'#b28c6a');
      line([ox+size*.67,oy+size*.68],[ox+size*.70,floor],size*.024,'#b28c6a');
    }
    for(const [hip,knee,ankle]of [[23,25,27],[24,26,28]]){
      limb(p(hip),p(knee),size*.053);limb(p(knee),p(ankle),size*.047);
      oval(p(ankle)[0]+(ankle===27?-.009:.009)*size,p(ankle)[1],size*.041,size*.026,'#292e34');
      oval(p(ankle)[0]-.009*size,p(ankle)[1]-.008*size,size*.021,size*.009,'#ffffff11');
    }
    const shoulderMid=[(p(11)[0]+p(12)[0])/2,(p(11)[1]+p(12)[1])/2];
    const hipMid=[(p(23)[0]+p(24)[0])/2,(p(23)[1]+p(24)[1])/2];
    const nose=p(0),dx=nose[0]-hipMid[0],dy=nose[1]-hipMid[1];
    const height=options.practice?size*(.52+.07*Math.min(1,Math.max(0,-dy/(size*.40)))):Math.max(size*.36,Math.min(size*.64,Math.hypot(dx,dy)/.72));
    const width=options.practice?size*.43:Math.max(size*.37,Math.min(size*.49,height*.8));
    const angle=Math.max(-1.28,Math.min(1.28,Math.atan2(dx,-dy)));
    const arms={};
    const now=options.time??(typeof performance!=='undefined'?performance.now():Date.now());
    const previous=rigs.get(canvas),rig=previous&&previous.size===size&&now>previous.at?previous:null;
    const dt=rig?Math.min(.05,(now-rig.at)/1000):0,nextRig={size,at:now,angles:{}};
    const settle=(before,after,speed)=>{if(before===undefined||!rig||options.instant)return after;const change=Math.atan2(Math.sin(after-before),Math.cos(after-before));return before+Math.max(-speed*dt,Math.min(speed*dt,change*(1-Math.exp(-18*dt))));};
    if(options.practice){
      // 两段定长手臂：肩根随躯干旋转，肘部求解到目标手腕，避免伸缩橡皮管与脱肩。
      for(const [shoulder,elbow,wrist,sign]of [[11,13,15,-1],[12,14,16,1]]){
        const local=[sign*width*.46,-height*.45],root=[hipMid[0]+local[0]*Math.cos(angle)-local[1]*Math.sin(angle),hipMid[1]+local[0]*Math.sin(angle)+local[1]*Math.cos(angle)];
        // 俯身是髋部折叠，双肩不随平面旋转成上下两层；向示意肩线平滑收拢。
        const lean=Math.min(1,Math.abs(angle)/.8),shoulderPoint=p(shoulder);root[0]+=(shoulderPoint[0]-root[0])*lean;root[1]+=(shoulderPoint[1]-root[1])*lean;
        const upper=size*.165,lower=size*.17;
        const modelS=p(shoulder),modelE=p(elbow),modelW=p(wrist),u=[modelE[0]-modelS[0],modelE[1]-modelS[1]],v=[modelW[0]-modelE[0],modelW[1]-modelE[1]];
        const alignment=(u[0]*v[0]+u[1]*v[1])/Math.max(.001,Math.hypot(...u)*Math.hypot(...v));
        const reach=/^(spread|sky|push|star|pull)/.test(options.pose||'')?Math.max(0,Math.min(1,(alignment-.7)/.3)):0,smoothReach=reach*reach*(3-2*reach),direction=Math.atan2(modelW[1]-modelS[1],modelW[0]-modelS[0]);
        const extended=[root[0]+Math.cos(direction)*(upper+lower),root[1]+Math.sin(direction)*(upper+lower)];
        const desired=modelW.map((n,i)=>n+(extended[i]-n)*smoothReach),vector=[desired[0]-root[0],desired[1]-root[1]],theta=Math.atan2(vector[1],vector[0]);
        const distance=Math.max(size*.015,Math.min(upper+lower-.001,Math.hypot(...vector)));
        const wristPoint=[root[0]+Math.cos(theta)*distance,root[1]+Math.sin(theta)*distance];
        const offset=Math.acos(Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
        const candidates=[theta-offset,theta+offset].map(a=>[root[0]+Math.cos(a)*upper,root[1]+Math.sin(a)*upper]);
        const hint=p(elbow),cost=q=>Math.hypot(q[0]-hint[0],q[1]-hint[1]);
        const chosen=cost(candidates[0])<cost(candidates[1])?candidates[0]:candidates[1];
        const upperAngle=settle(rig?.angles[elbow],Math.atan2(chosen[1]-root[1],chosen[0]-root[0]),5);
        const foreAngle=settle(rig?.angles[wrist],Math.atan2(wristPoint[1]-chosen[1],wristPoint[0]-chosen[0]),7);
        nextRig.angles[elbow]=upperAngle;nextRig.angles[wrist]=foreAngle;
        arms[shoulder]=root;arms[elbow]=[root[0]+Math.cos(upperAngle)*upper,root[1]+Math.sin(upperAngle)*upper];arms[wrist]=[arms[elbow][0]+Math.cos(foreAngle)*lower,arms[elbow][1]+Math.sin(foreAngle)*lower];
      }
    }
    if(options.practice)rigs.set(canvas,nextRig);
    const arm=id=>{if(arms[id])return arms[id];const q=p(id),offset=q[0]-shoulderMid[0],d=Math.abs(offset);const extra=d<size*.25?size*.055*Math.sin(Math.PI*d/(size*.25)):0;return[shoulderMid[0]+(id===11||id===12?Math.sign(offset)*size*.21:offset+Math.sign(offset)*extra),q[1]];};
    const backElbow=options.practice&&/^(star|knife)/.test(options.pose||'')?(options.pose.endsWith('L')?14:13):null;
    for(const [shoulder,elbow,wrist]of [[11,13,15],[12,14,16]]){limb(arm(shoulder),arm(elbow),size*.043);if(elbow===backElbow){limb(arm(elbow),arm(wrist),size*.042);const hand=arm(wrist);oval(...hand,size*.026,size*.031,'#2c3137');}}
    c.save();c.translate(...hipMid);c.rotate(angle);
    if(bodyReady)c.drawImage(bodyImage,-width*.57,-height*1.02,width*1.14,height*1.08);
    else{
      const shade=c.createLinearGradient(-width/2,-height,width/2,0);shade.addColorStop(0,'#fff');shade.addColorStop(1,'#e4e6eb');
      c.fillStyle=shade;c.beginPath();c.moveTo(-width*.45,-height*.13);c.bezierCurveTo(-width*.55,-height*.35,-width*.39,-height*.75,-width*.32,-height*.98);c.quadraticCurveTo(-width*.26,-height*1.06,-width*.13,-height*.83);c.lineTo(width*.13,-height*.83);c.quadraticCurveTo(width*.26,-height*1.06,width*.32,-height*.98);c.bezierCurveTo(width*.39,-height*.75,width*.55,-height*.35,width*.45,-height*.13);c.bezierCurveTo(width*.37,height*.04,-width*.37,height*.04,-width*.45,-height*.13);c.fill();
      oval(-width*.27,-height*.69,width*.028,height*.027,'#252b31');oval(width*.27,-height*.69,width*.028,height*.027,'#252b31');
      const noseShade=c.createRadialGradient(-width*.04,-height*.74,1,0,-height*.69,width*.18);noseShade.addColorStop(0,'#555b61');noseShade.addColorStop(1,'#181e24');oval(0,-height*.68,width*.18,height*.12,noseShade);
    }
    if(equipped.body==='robe'){
      c.fillStyle='#6f9fac';c.beginPath();c.moveTo(-width*.39,-height*.43);c.quadraticCurveTo(0,-height*.28,width*.39,-height*.43);c.lineTo(width*.44,-height*.12);c.quadraticCurveTo(0,height*.015,-width*.44,-height*.12);c.closePath();c.fill();
      line([-width*.23,-height*.38],[width*.17,-height*.13],size*.008,'#b9d6d8');line([-width*.35,-height*.15],[width*.35,-height*.15],size*.018,'#527c8c');
    }
    if(equipped.neck){
      const color=equipped.neck==='ribbon'?'#e7ae91':'#88b8a5';
      line([-width*.31,-height*.49],[width*.31,-height*.49],size*.034,color);
      line([width*.15,-height*.48],[width*.24,-height*.32],size*.039,color);
      line([width*.18,-height*.38],[width*.25,-height*.35],size*.004,'#ffffff6f');
    }
    if(equipped.head==='leaf'){
      c.save();c.translate(width*.14,-height*.94);c.rotate(-.35);c.fillStyle='#82b89c';c.beginPath();c.ellipse(0,0,size*.027,size*.059,0,0,Math.PI*2);c.fill();line([0,size*.035],[0,-size*.04],size*.005,'#c8e6d4');c.restore();
    }
    if(equipped.head==='crown'){
      c.fillStyle='#e8c77c';c.beginPath();for(const [i,[x,y]]of [[-.65,-.05],[-.7,-.35],[-.25,-.22],[0,-.5],[.25,-.22],[.7,-.35],[.65,-.05]].entries()){if(i===0)c.moveTo(x*width*.45,-height*.85+y*width*.45);else c.lineTo(x*width*.45,-height*.85+y*width*.45);}c.closePath();c.fill();
    }
    c.restore();
    if(options.practice)for(const [shoulder,elbow]of [[11,13],[12,14]]){if(elbow===backElbow)continue;const a=arm(shoulder),b=arm(elbow);limb(a,b,size*.043);}
    for(const [elbow,wrist]of [[13,15],[14,16]]){
      if(elbow===backElbow)continue;
      limb(arm(elbow),arm(wrist),size*.042);const hand=arm(wrist);oval(hand[0],hand[1],size*.026,size*.031,'#2c3137');
      line([hand[0]-.008*size,hand[1]],[hand[0]-.008*size,hand[1]+size*.019],size*.003,'#555a61');

    }
  }
  window.QimaiCompanion={draw,interpolate};
})();
