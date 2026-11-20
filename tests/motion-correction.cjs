const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {fixture}=require(path.join(__dirname,'pose-fixtures.cjs'));
const ctx=vm.createContext({console,devicePixelRatio:1});ctx.window=ctx;
for(const file of ['courses.js','motion.js','coach.js','companion.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
const {QimaiData:D,QimaiMotion:M,QimaiCoach:C,QimaiCompanion:A}=ctx;let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const evaluate=(target,f=fixture(target))=>C.evaluate(f.landmarks,target,'standing',4/3,{worldLandmarks:f.worldLandmarks});
test('all 12 lessons and both sides have supported, independently authored positive inputs',()=>{
  for(const l of D.lessons){assert.equal(l.ai,true);for(const s of l.steps){assert.ok(C.supported.includes(s.check));assert.equal(evaluate(s.check).ready,true,l.name+' '+s.check);}}
  for(const target of C.supported)assert.equal(evaluate(target).ready,true,target);
});
test('each pose rejects occluded joints and supplies specific corrective joints',()=>{
  for(const target of C.supported){const f=fixture(target);f.landmarks[16].visibility=.2;const result=evaluate(target,f);assert.equal(result.ready,false,target);assert.ok(result.joints.includes(16));assert.match(result.message,/手腕被遮挡/);}
});
test('height, elbow, front knee, squat, depth, turn, bend and tail faults cannot pass',()=>{
  const faults=[
    ['prayer',f=>{f.landmarks[15].x=.20;},'together'],
    ['spread',f=>{f.landmarks[16].y=.58;},'raise右'],
    ['sky',f=>{f.landmarks[15].y=.40;},'raise左'],
    ['starR',f=>{f.landmarks[15].y=.25;},'waist-左'],
    ['pullL',f=>{f.landmarks[25]={...f.landmarks[25],x:f.landmarks[23].x,y:.74};f.landmarks[27]={...f.landmarks[27],x:f.landmarks[23].x,y:.92};f.worldLandmarks[25]={x:f.worldLandmarks[23].x,y:.35,z:0};f.worldLandmarks[27]={x:f.worldLandmarks[23].x,y:.70,z:0};},'front-knee'],
    ['push',f=>{for(const id of [13,14,15,16])f.worldLandmarks[id].z=0;},'push-depth-左'],
    ['knifeR',f=>{f.landmarks[14].y=.4;},'knife-elbow'],
    ['squat',f=>{f.landmarks[27].x=.44;f.landmarks[28].x=.56;},'squat-width'],
    ['clawL',f=>{for(const p of f.worldLandmarks)p.z=0;f.worldLandmarks[0].z=-.12;},'claw-turn'],
    ['tigerR',f=>{f.landmarks[15].y=.4;},'tiger-hand-左'],
    ['bow',f=>{for(const id of [11,12]){f.worldLandmarks[id].y=-.486;f.worldLandmarks[id].z=0;}},'bend'],
    ['tailL',f=>{f.landmarks[15].x=.16;f.landmarks[16].x=.24;},'tail-hands'],
    ['tailR',f=>{f.landmarks[0].x=.43;},'tail-turn']
  ];
  for(const [target,change,code]of faults){const f=fixture(target);change(f);const r=evaluate(target,f);assert.equal(r.ready,false,target);assert.equal(r.code,code,target+' '+r.message);assert.ok(r.joints.length>0);}
});
test('complex poses with unknown depth/turn never guess a pass',()=>{
  for(const target of ['push','knifeL','knifeR','clawL','clawR','tigerL','tigerR','bow','tailL','tailR']){
    const f=fixture(target);f.worldLandmarks=null;const r=evaluate(target,f);assert.equal(r.ready,false,target);assert.ok(r.checks.some(x=>x.unknown),target);
  }
  assert.equal(C.evaluate(null,'sky').ready,false);assert.equal(C.evaluate(fixture('rest').landmarks,'bogus').code,'unsupported');
});
test('confirmation uses fresh observations and preserves only brief uncertain gaps',()=>{
  let h={elapsed:0,lastAt:null};for(let t=0;t<=600;t+=100)h=C.advanceHold(h,true,t);assert.equal(h.elapsed,600);
  h=C.advanceHold(h,false,700);assert.equal(h.elapsed,600);assert.equal(h.complete,false);
  h=C.advanceHold(h,true,800);assert.equal(h.elapsed,600);
  for(let t=900;t<=1400;t+=100)h=C.advanceHold(h,true,t);assert.equal(h.elapsed,C.holdMs);assert.equal(h.complete,true);
  h=C.advanceHold(h,true,1400);assert.equal(h.elapsed,0);
  h=C.advanceHold(h,true,2400);assert.equal(h.elapsed,0);
  h=C.advanceHold(h,true,2700);assert.equal(h.elapsed,250);
  h=C.advanceHold(h,{ready:false,hardFailure:true},2800);assert.equal(h.elapsed,0);
});
test('motion paths land exactly, stay finite and remain continuous through via poses',()=>{
  for(const l of D.lessons){let from='prayer';for(const step of l.steps){
    const end=M.sample(from,step,1);for(const id of Object.keys(end))for(let axis=0;axis<2;axis++)assert.ok(Math.abs(end[id][axis]-D.poses[step.pose][id][axis])<1e-9,l.id+' endpoint');
    let last=M.sample(from,step,0);for(let n=1;n<=240;n++){const p=M.sample(from,step,n/240);for(const id of Object.keys(p)){assert.ok(p[id].every(Number.isFinite));assert.ok(Math.hypot(p[id][0]-last[id][0],p[id][1]-last[id][1])<.045,l.id+' joint '+id+' continuity');}last=p;}
    from=step.pose;
  }}
});
test('seated paths keep legs planted, stationary standing feet do not float',()=>{
  for(const l of D.lessons)for(const step of l.steps)for(const t of [0,.2,.5,.8,1]){const p=M.sample('prayer',step,t,true);assert.equal(p[27][1],.88);assert.equal(p[23][1],.61);}
  for(const target of ['prayer','spread','push','knifeL','bow'])for(const t of [0,.2,.5,.8,1])assert.ok(Math.abs(M.sample('rest',{pose:target},t)[27][1]-.94)<1e-9,target);
});
test('character arms keep fixed lengths and avoid elbow jumps across all paths',()=>{
  let segments=[],pending=[],start,width,previousLines;const gradient={addColorStop(){}};
  const canvasContext=new Proxy({}, {set:(_,key,value)=>{if(key==='lineWidth')width=value;return true;},get:(_,key)=>key==='beginPath'?()=>{pending=[];}:key==='stroke'?()=>{segments.push(...pending);pending=[];}:key==='moveTo'?(x,y)=>{start=[x,y];}:key==='lineTo'?(x,y)=>{pending.push({width,a:start,b:[x,y]});}:String(key).startsWith('create')?()=>gradient:()=>{}});
  const canvas={width:500,height:440,getBoundingClientRect:()=>({width:500,height:440}),getContext:()=>canvasContext};
  const size=Math.min(500*.78,(440-105)*.98);
  for(const l of D.lessons){let from='prayer';for(const step of l.steps){previousLines=null;for(let n=0;n<=120;n++){
    segments=[];A.draw(canvas,M.sample(from,step,n/120),{},{practice:true,pose:step.pose,time:n*1000/60});
    const armLines=segments.filter(x=>Math.abs(x.width-size*.042)<1e-8);if(previousLines&&armLines.length===previousLines.length)armLines.forEach((line,i)=>{assert.ok(Math.hypot(line.a[0]-previousLines[i].a[0],line.a[1]-previousLines[i].a[1])<size*.06,l.id+' smooth elbow');});previousLines=armLines;
    for(const line of segments){const expected=Math.abs(line.width-size*.043)<1e-8?size*.165:Math.abs(line.width-size*.042)<1e-8?size*.17:null;if(expected!==null)assert.ok(Math.abs(Math.hypot(line.b[0]-line.a[0],line.b[1]-line.a[1])-expected)<.001,l.id+' fixed arm length');}
  }from=step.pose;}}
});
// 近距离坐姿回归：小房间坐 40–50cm，双臂展开时手腕被模型外推到画面左右之外。
// 旧版把画面外的关键点一律判为「没入镜」，连平举角度和 1.2 秒确认都进不去。
function closeRange(target='spread'){
  const f=fixture(target);
  f.landmarks[15]={...f.landmarks[15],x:-.18,visibility:.35,presence:.6};
  f.landmarks[16]={...f.landmarks[16],x:1.18,visibility:.35,presence:.6};
  return f;
}
const seated=(target,f)=>C.evaluate(f.landmarks,target,'seated',4/3,{worldLandmarks:f.worldLandmarks});
test('close seated spread with wrists outside the frame is no longer stuck at 等待入镜',()=>{
  const r=seated('spread',closeRange());
  assert.notEqual(r.code,'framing');assert.equal(r.tracking,true);assert.equal(r.ready,true,r.message);
});
test('close seated overhead reach with wrists above the top edge still passes',()=>{
  const f=fixture('sky');
  f.landmarks[15]={...f.landmarks[15],y:-.10,visibility:.35,presence:.6};
  f.landmarks[16]={...f.landmarks[16],y:-.10,visibility:.35,presence:.6};
  const r=seated('sky',f);
  assert.notEqual(r.code,'framing');assert.equal(r.ready,true,r.message);
});
test('an occluded wrist inside the frame and a missing torso are still blocked',()=>{
  const hidden=fixture('spread');hidden.landmarks[16].visibility=.2;
  const blocked=seated('spread',hidden);
  assert.equal(blocked.code,'framing');assert.ok(blocked.joints.includes(16));assert.match(blocked.message,/手腕被遮挡/);
  const nobody=closeRange();nobody.landmarks[11].visibility=.1;nobody.landmarks[12].visibility=.1;
  assert.equal(seated('spread',nobody).tracking,false);
});
test('close-range frames accumulate into a real 1.2s confirmation',()=>{
  const observer=C.createEvaluator();let hold={elapsed:0,lastAt:null},now=0;
  for(let i=0;i<=16;i++){
    const f=closeRange();
    const r=observer.evaluate(f.landmarks,'spread','seated',4/3,{worldLandmarks:f.worldLandmarks,timestamp:now});
    hold=C.advanceHold(hold,r.ready,now);now+=100;
  }
  assert.equal(hold.elapsed,C.holdMs);assert.equal(hold.complete,true);
});
console.log(count+' motion/correction groups passed');
