const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {fixture}=require(path.join(__dirname,'pose-fixtures.cjs'));
const ctx=vm.createContext({console});ctx.window=ctx;
for(const file of ['courses.js','motion.js','coach.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
const C=ctx.QimaiCoach,D=ctx.QimaiData;let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const run=(target,f=fixture(target),aspect=4/3,observer=C,now)=>observer.evaluate(f.landmarks,target,'standing',aspect,{worldLandmarks:f.worldLandmarks,timestamp:now});
const check=(result,code)=>result.checks.find(x=>x.code===code);
function setHeight(f,ratio){f.landmarks[16].y=f.landmarks[12].y+(.2*4/3)*ratio;return f;}
function setXY(f,id,x,y){f.landmarks[id]={...f.landmarks[id],x,y};f.worldLandmarks[id]={...f.worldLandmarks[id],x:(x-.5)*1.8,y:(y-.57)*1.8,z:0};}
function bendingWorld(degrees){
  const world=fixture('rest').worldLandmarks,rad=degrees*Math.PI/180,cy=-.5*Math.cos(rad),cz=-.5*Math.sin(rad);
  world[23]={x:-.1,y:0,z:0};world[24]={x:.1,y:0,z:0};
  world[11]={x:-.2,y:cy,z:cz};world[12]={x:.2,y:cy,z:cz};
  world[0]={x:0,y:cy-.15,z:cz-.10};world[27]={x:-.1,y:.8,z:0};world[28]={x:.1,y:.8,z:0};
  return world;
}
function rotate(world,rx,rz){const x=rx*Math.PI/180,z=rz*Math.PI/180;return world.map(p=>{const yy=p.y*Math.cos(x)-p.z*Math.sin(x),zz=p.y*Math.sin(x)+p.z*Math.cos(x);return{...p,x:p.x*Math.cos(z)-yy*Math.sin(z),y:p.x*Math.sin(z)+yy*Math.cos(z),z:zz};});}

test('known geometric angles are correct; degenerate joints are unknown, not zero degrees',()=>{
  assert.equal(C.angle({x:1,y:0},{x:0,y:0},{x:0,y:1}),90);
  assert.equal(C.angle({x:-1,y:0},{x:0,y:0},{x:1,y:0}),180);
  assert.ok(Math.abs(C.angle({x:1,y:0},{x:0,y:0},{x:-1,y:1})-135)<1e-9);
  assert.equal(C.angle({x:0,y:0},{x:0,y:0},{x:1,y:0}),null);
  assert.equal(C.angle({x:NaN,y:0},{x:0,y:0},{x:1,y:0}),null);
});
test('raised, visibly straight arms do not inherit erroneous model depth angles',()=>{
  for(const target of ['spread','sky','starL','starR']){
    const f=fixture(target);const arm=target==='starR'?14:13;
    f.worldLandmarks[arm].z=.5;
    const result=run(target,f);assert.equal(result.ready,true,target);
    assert.ok(check(result,target==='starR'?'elbow右':'elbow左').value>165,target);
  }
});
test('overhead reach with natural elbow flexion is accepted; hands below the head are not',()=>{
  const f=fixture('sky');setXY(f,13,.36,.175);setXY(f,15,.40,.05);setXY(f,14,.64,.175);setXY(f,16,.60,.05);
  const result=run('sky',f);assert.equal(result.ready,true);
  assert.ok(check(result,'elbow左').value>125&&check(result,'elbow左').value<145);
  setXY(f,15,.4,.16);assert.equal(run('sky',f).ready,false);
  setXY(f,15,.4,.34);assert.equal(run('sky',f).ready,false);
});
test('small shoulder-height differences pass while a clearly dropped arm remains blocked',()=>{
  assert.equal(run('spread',setHeight(fixture('spread'),.27)).ready,true);
  assert.equal(run('spread',setHeight(fixture('spread'),.30)).ready,true);
  const bad=run('spread',setHeight(fixture('spread'),.80));assert.equal(bad.ready,false);assert.equal(bad.code,'raise右');
});
test('unseen knees and ankles cannot block an upper-body step; lower-body steps still require them',()=>{
  for(const target of ['rest','close','prayer','spread','sky','starL','starR','push','knifeL','knifeR','clawL','clawR']){
    const f=fixture(target);for(const id of [25,26,27,28]){f.landmarks[id].visibility=.1;f.worldLandmarks[id].visibility=.1;}
    assert.equal(run(target,f).ready,true,target);
  }
  for(const target of ['pullL','pullR','squat','tigerL','tigerR','bow','tailL','tailR']){
    const f=fixture(target);f.landmarks[25].visibility=.1;assert.equal(run(target,f).code,'framing',target);
  }
});
test('body size, distance, translation and video aspect do not change a valid pose result',()=>{
  for(const target of C.supported)for(const scale of [.72,1])for(const aspect of [4/3,16/9,1]){
    const f=fixture(target),factor=(4/3)/aspect;
    f.landmarks=f.landmarks.map(p=>({...p,x:.5+(p.x-.5)*scale*factor,y:.5+(p.y-.5)*scale}));
    if(f.landmarks.some(p=>p.x<0||p.x>1))continue;
    const result=run(target,f,aspect);assert.equal(result.ready,true,target+' scale '+scale+' aspect '+aspect);
  }
});
test('camera pitch and roll do not become forward-bend angles',()=>{
  for(const bend of [0,20,45,80,-30])for(const [pitch,roll]of [[0,0],[15,25],[-20,-15]]){
    const frame=C.worldFrame(rotate(bendingWorld(bend),pitch,roll));assert.ok(frame);assert.ok(Math.abs(frame.lean-bend)<1e-7,JSON.stringify({bend,pitch,roll,got:frame.lean}));
  }
});
test('shoulder-hip twist stays unchanged when the camera is tilted',()=>{
  const world=bendingWorld(0),r=30*Math.PI/180;world[11]={x:-.2*Math.cos(r),y:-.5,z:-.2*Math.sin(r)};world[12]={x:.2*Math.cos(r),y:-.5,z:.2*Math.sin(r)};
  assert.ok(Math.abs(C.worldFrame(world).twist-30)<1e-7);
  assert.ok(Math.abs(C.worldFrame(rotate(world,20,30)).twist-30)<1e-7);
});
test('unknown or degenerate 3D joints do not produce invented angles or a false pass',()=>{
  const f=fixture('push');f.worldLandmarks[13]={...f.worldLandmarks[11]};
  const r=run('push',f);assert.equal(r.ready,false);assert.equal(check(r,'push-elbow-左').unknown,true);assert.equal(check(r,'push-elbow-左').actual,'角度待确认');
  const g=fixture('push');g.worldLandmarks[16].visibility=.1;assert.equal(run('push',g).ready,false);
});
test('short-window filtering and hysteresis prevent boundary flicker without accumulating stale frames',()=>{
  const observer=C.createEvaluator();let hold={elapsed:0,lastAt:null};
  for(let i=0;i<=40;i++){
    const r=run('spread',setHeight(fixture('spread'),i%2?.315:.285),4/3,observer,i*100);
    assert.equal(r.ready,true,'boundary frame '+i);hold=C.advanceHold(hold,r.ready,i*100);
  }
  assert.equal(hold.elapsed,C.holdMs);
  const wrong=run('spread',setHeight(fixture('spread'),.80),4/3,observer,4100);
  assert.equal(wrong.ready,false);hold=C.advanceHold(hold,wrong,4100);assert.equal(hold.elapsed,0);
});
test('occlusion, target changes and timestamp gaps discard previously accepted measurements',()=>{
  const observer=C.createEvaluator();run('spread',setHeight(fixture('spread'),.285),4/3,observer,0);
  const hidden=fixture('spread');hidden.landmarks[16].visibility=.1;assert.equal(run('spread',hidden,4/3,observer,100).ready,false);
  assert.equal(run('spread',setHeight(fixture('spread'),.32),4/3,observer,200).ready,false);
  run('spread',setHeight(fixture('spread'),.285),4/3,observer,300);run('spread',setHeight(fixture('spread'),.285),4/3,observer,400);
  assert.equal(run('spread',setHeight(fixture('spread'),.32),4/3,observer,1400).ready,false);
  run('spread',fixture('spread'),4/3,observer,1500);
  assert.equal(run('sky',fixture('rest'),4/3,observer,1600).ready,false);
});
test('all twelve lessons still require actual pose observations and a fresh pose confirmation',()=>{
  for(const lesson of D.lessons){const observer=C.createEvaluator();let now=0;
    for(const step of lesson.steps){let hold={elapsed:0,lastAt:null};
      for(let i=0;i<=32;i++){const r=run(step.check,fixture(step.check),4/3,observer,now);hold=C.advanceHold(hold,r.ready,now);now+=100;}
      assert.equal(hold.elapsed,C.holdMs,lesson.id+' '+step.check);
    }
  }
});
test('standing still never passes any active target, and confidence gates match the skeleton',()=>{
  for(const target of C.supported.filter(p=>!['rest','close'].includes(p)))assert.equal(run(target,fixture('rest')).ready,false,target);
  const f=fixture('spread');f.landmarks[16].visibility=.55;assert.equal(C.isVisible(f.landmarks[16]),true);assert.equal(run('spread',f).ready,true);
  f.landmarks[16].presence=.3;assert.equal(C.isVisible(f.landmarks[16]),false);assert.equal(run('spread',f).ready,false);
});
console.log(count+' numeric accuracy and sensitivity groups passed');
