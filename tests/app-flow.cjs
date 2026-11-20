const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {TextEncoder,TextDecoder}=require('node:util');
const root=path.resolve(__dirname,'..');
const {fixture}=require(path.join(__dirname,'pose-fixtures.cjs'));
async function harness(){
  let now=0,next=0,state,reminderCompleted=0,stopped=0,cameraDenied=false,noPerson=false,frozen=false,badPose=false,worldMissing=false,inferenceThrows=false,delayCamera=false,resolveCamera;
  let frameMs=200,sampleMs=0,inferenceDelay=0,pendingInference=[],forcedTarget=null;
  const timestamps=[];
  const frames=new Map(),nodes=new Map(),listeners={};
  const gradient={addColorStop(){}};
  const context2d=new Proxy({}, {get:(_,key)=>String(key).startsWith('create')?()=>gradient:()=>{}});
  function node(id){
    if(nodes.has(id))return nodes.get(id);
    const element={id,style:{},dataset:{},events:{},value:id==='courseLength'?'full':'',textContent:'',innerHTML:'',hidden:false,open:false,
      width:600,height:600,videoWidth:640,videoHeight:480,readyState:4,currentTime:0,
      classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},
      getContext:()=>context2d,getBoundingClientRect:()=>({width:600,height:600}),
      addEventListener(type,fn){this.events[type]=fn;},showModal(){this.open=true;},close(){this.open=false;},
      play:async()=>{},focus(){},select(){}};
    nodes.set(id,element);return element;
  }
  const doc={hidden:false,activeElement:null,body:{style:{}},getElementById:node,querySelector:node,querySelectorAll:()=>[],createElement:node,
    addEventListener(type,fn){listeners['doc:'+type]=fn;}};
  const context=vm.createContext({console,crypto:webcrypto,TextEncoder,TextDecoder,URL,Date,
    btoa:text=>Buffer.from(text,'binary').toString('base64'),atob:text=>Buffer.from(text,'base64').toString('binary'),
    document:doc,location:{protocol:'http:',href:'http://localhost:8943/'},devicePixelRatio:1,
    performance:{now:()=>now},requestAnimationFrame(fn){const id=++next;frames.set(id,fn);return id;},
    cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>++next,clearTimeout(){},
    addEventListener(type,fn){listeners['win:'+type]=fn;},scrollTo(){},dispatchEvent(){},
    navigator:{mediaDevices:{async getUserMedia(){if(cameraDenied)throw Error('denied');if(delayCamera)await new Promise(resolve=>{resolveCamera=resolve;});return{getTracks:()=>[{stop(){stopped++;}}]};}}},
  });
  context.window=context;
  for(const file of ['courses.js','motion.js','progress.js','companion.js','coach.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  state=context.QimaiProgress.fresh();
  context.QimaiStore={get:()=>state,init:async()=>state,transaction:async change=>change(state)};
  context.QimaiSound={settings(){},ensure(){},start(){},stop(){},speak(){},chime(){}};
  context.QimaiReminder={setBusy(){},complete(){reminderCompleted++;}};
  function modelResult(){
    if(inferenceThrows)throw Error('inference interrupted');
    if(noPerson)return{landmarks:[],worldLandmarks:[]};
    const standing=node('practiceKind').textContent.includes('站姿');
    const list=standing?context.QimaiData.lessons:context.QimaiData.seated;
    const lesson=list.find(item=>item.name===node('practiceName').textContent)||list[0];
    const phase=Number(node('stepLabel').textContent.match(/步骤 (\d)/)?.[1]||1)-1;
    const target=forcedTarget||lesson.steps[phase].pose;
    const f=fixture(target);
    if(badPose){f.landmarks[16].y=.08;f.landmarks[16].visibility=.2;}
    return{landmarks:[f.landmarks],worldLandmarks:worldMissing?[]:[f.worldLandmarks]};
  }
  context.mockVision={FilesetResolver:{forVisionTasks:async()=>({})},PoseLandmarker:{createFromOptions:async()=>({detectForVideo:(_video,timestamp)=>{timestamps.push(timestamp);const result=modelResult();return inferenceDelay?new Promise(resolve=>pendingInference.push({at:now+inferenceDelay,resolve,result})):result;}})}};
  vm.runInContext(fs.readFileSync(path.join(root,'tracker.js'),'utf8').replace("import('./vendor/tasks-vision/vision_bundle.mjs')",'Promise.resolve(mockVision)'),context);
  const source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace('  const $=id', '  window.qaSession=()=>session;\n  const $=id');
  await vm.runInContext(source,context);
  async function framesFor(seconds){
    for(let i=0;i<Math.ceil(seconds*1000/frameMs);i++){
      now+=frameMs;if(!frozen)node('video').currentTime=sampleMs?Math.floor(now/sampleMs)*sampleMs/1000:now/1000;
      for(const item of pendingInference.filter(p=>p.at<=now))item.resolve(item.result);
      pendingInference=pendingInference.filter(p=>p.at>now);
      const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));
      for(let flush=0;flush<12;flush++)await Promise.resolve();
    }
  }
  return{state,node,framesFor,context,
    get session(){return context.qaSession();},get now(){return now;},setFrameMs(value){frameMs=value;},setSampleMs(value){sampleMs=value;},setInferenceDelay(value){inferenceDelay=value;},setTarget(value){forcedTarget=value;},
    click:async id=>node(id).events.click?.(),
    action:async dataset=>listeners['doc:click']({target:{closest:()=>({dataset})}}),
    setHidden(value){doc.hidden=value;listeners['doc:visibilitychange']();},
    setDenied(value){cameraDenied=value;},setNoPerson(value){noPerson=value;},
    setFrozen(value){frozen=value;},setBadPose(value){badPose=value;},setWorldMissing(value){worldMissing=value;},setThrows(value){inferenceThrows=value;},
    setDelayed(value){delayCamera=value;},resolveCamera(){resolveCamera?.();},timestamps,
    get stopped(){return stopped;},get reminderCompleted(){return reminderCompleted;}};
}
async function main(){
  const h=await harness();
  await h.action({mode:'standing'});await h.click('startCourse');await h.framesFor(70);
  assert.equal(h.state.records.length,0);assert.match(h.node('stepLabel').textContent,/步骤 1/);
  assert.equal(h.node('cameraPanel').hidden,false);
  console.log('PASS standing challenge waits for camera; right skeleton module stays visible');
  await h.click('freePracticeToggle');await h.framesFor(520);
  assert.equal(h.state.records.length,12);assert.equal(Object.keys(h.state.cards).length,12);
  assert.equal(h.state.coins,60);assert.equal(h.node('resultDialog').open,true);assert.equal(h.reminderCompleted,1);
  assert.equal(h.state.records.filter(r=>r.verified).length,0);
  console.log('PASS explicit free practice completes all 12 lessons without AI pass records; rewards unchanged');
  const before=JSON.stringify(h.state);
  await h.click('resultHome');await h.click('previewCourse');await h.framesFor(280);
  assert.equal(JSON.stringify(h.state),before);assert.equal(h.reminderCompleted,1);
  console.log('PASS full demo does not award or alter practice history');

  const all=await harness();await all.action({mode:'standing'});await all.click('startCourse');await all.click('cameraToggle');await all.framesFor(600);
  assert.equal(all.state.records.length,12);assert.equal(all.state.records.filter(r=>r.verified).length,12);
  assert.equal(all.stopped,1);assert.equal(all.node('resultDialog').open,true);
  assert.ok(all.timestamps.every((t,i,a)=>i===0||t>a[i-1]));
  console.log('PASS every step of all 12 standing lessons passes using independent pose fixtures and continuous hold');

  const seated=await harness();await seated.click('startCourse');await seated.click('cameraToggle');await seated.framesFor(310);
  assert.equal(seated.state.records.length,6);assert.equal(seated.state.records.filter(record=>record.verified).length,4);
  assert.equal(seated.stopped,1);assert.equal(seated.node('resultDialog').open,true);
  console.log('PASS original six seated lessons retain four observable AI lessons');

  const blocked=await harness();await blocked.action({train:'wei2'});await blocked.click('cameraToggle');
  blocked.setBadPose(true);await blocked.framesFor(20);assert.match(blocked.node('cameraFeedback').textContent,/遮挡/);
  assert.match(blocked.node('stepLabel').textContent,/步骤 1/);assert.equal(blocked.node('holdValue').textContent,'0.0 / 1.2 秒');
  blocked.setBadPose(false);await blocked.framesFor(.8);assert.match(blocked.node('stepLabel').textContent,/步骤 1/);
  blocked.setFrozen(true);await blocked.framesFor(2);assert.equal(blocked.node('holdValue').textContent,'0.0 / 1.2 秒');
  blocked.setFrozen(false);await blocked.framesFor(.8);assert.match(blocked.node('stepLabel').textContent,/步骤 1/);
  await blocked.framesFor(.8);assert.match(blocked.node('stepLabel').textContent,/步骤 2/);
  blocked.setNoPerson(true);await blocked.framesFor(20);assert.equal(blocked.state.records.length,0);
  await blocked.click('cameraToggle');await blocked.framesFor(50);assert.equal(blocked.state.records.length,0);
  await blocked.click('freePracticeToggle');await blocked.framesFor(45);
  assert.equal(blocked.state.records.length,1);assert.equal(blocked.state.records[0].verified,false);
  console.log('PASS deviation, occlusion, stale video and camera off block progress; fresh observed confirmation required after correction');

  const depth=await harness();await depth.action({train:'push'});await depth.click('cameraToggle');depth.setWorldMissing(true);await depth.framesFor(40);
  assert.match(depth.node('stepLabel').textContent,/步骤 2/);assert.match(depth.node('cameraFeedback').textContent,/看不清/);
  assert.equal(depth.state.records.length,0);depth.setWorldMissing(false);await depth.framesFor(50);assert.equal(depth.state.records[0].verified,true);
  console.log('PASS ambiguous forward depth never passes without reliable 3D landmarks');

  const paused=await harness();await paused.action({train:'wei1'});await paused.click('cameraToggle');await paused.framesFor(8);
  paused.setHidden(true);await paused.framesFor(80);assert.equal(paused.state.records.length,0);assert.equal(paused.node('holdValue').textContent,'0.0 / 1.2 秒');
  paused.setHidden(false);await paused.framesFor(50);assert.equal(paused.state.records.length,0);
  await paused.click('pausePractice');paused.setThrows(true);await paused.framesFor(10);assert.equal(paused.node('holdValue').textContent,'0.0 / 1.2 秒');
  paused.setThrows(false);await paused.framesFor(60);assert.equal(paused.state.records[0].verified,true);
  console.log('PASS background pause and inference errors reset hold; explicit resume restores correct pass');

  const denied=await harness();await denied.action({train:'wei1'});denied.setDenied(true);await denied.click('cameraToggle');
  assert.equal(denied.node('cameraToggle').disabled,false);await denied.framesFor(60);assert.equal(denied.state.records.length,0);
  await denied.click('freePracticeToggle');await denied.framesFor(45);assert.equal(denied.state.records[0].verified,false);
  console.log('PASS denied camera never silently bypasses challenge');

  const race=await harness();await race.action({train:'wei1'});race.setDelayed(true);const opening=race.click('cameraToggle');
  await race.click('exitPractice');await race.action({train:'wei2'});race.setDelayed(false);await race.click('cameraToggle');
  race.resolveCamera();await opening;assert.equal(race.node('cameraToggle').textContent,'关闭摄像头');await race.framesFor(60);
  assert.equal(race.state.records.length,1);assert.equal(race.state.records[0].lessonId,'wei2');assert.equal(race.state.records[0].verified,true);
  console.log('PASS a late camera permission response cannot close a newer session camera');
}
module.exports={harness,main};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
