const assert=require('node:assert/strict');
const {harness}=require('./app-flow.cjs');
const {fixture}=require('./pose-fixtures.cjs');
async function main(){
  const base=await harness(),C=base.context.QimaiCoach;
  for(const interval of [50,100,200,300,500]){
    let hold={elapsed:0,lastAt:null};
    for(let now=0;now<4000&&!hold.complete;now+=interval)hold=C.advanceHold(hold,{ready:true},now);
    assert.equal(hold.complete,true,'valid '+interval+'ms samples must finish');
  }
  console.log('PASS low-frame-rate cameras (2–20 observations/sec) can confirm a correct pose');
  for(const target of C.supported){
    const observer=C.createEvaluator();let hold={},at=0;
    for(let i=0;i<40&&!hold.complete;i++,at+=100){
      const f=fixture(target);if(i%7===3)f.landmarks[16].visibility=.25;
      const result=observer.evaluate(f.landmarks,target,'standing',4/3,{worldLandmarks:f.worldLandmarks,timestamp:at});
      hold=C.advanceHold(hold,result,at);
    }
    assert.equal(hold.complete,true,target+' intermittent wrist occlusion');
    assert.ok(at<3000,target+' timely confirmation');
  }
  console.log('PASS every target tolerates isolated occluded frames without counting them as correct');
  let h={};for(let t=0;t<=800;t+=100)h=C.advanceHold(h,true,t);
  const before=h.elapsed;h=C.advanceHold(h,false,900);h=C.advanceHold(h,true,1000);
  assert.equal(h.elapsed,before);assert.equal(h.complete,false);
  h=C.advanceHold(h,{ready:false,hardFailure:true},1100);assert.equal(h.elapsed,0);
  for(let t=1200;t<=2000;t+=100)h=C.advanceHold(h,true,t);
  h=C.advanceHold(h,false,2500);assert.equal(h.elapsed,0);
  h=C.advanceHold(h,true,4000);assert.equal(h.elapsed,0);
  assert.equal(C.advanceHold(h,true,4000).elapsed,0);
  console.log('PASS gross mistakes, prolonged loss, repeated timestamps and stale frames cannot carry progress');

  const first=await harness();first.setFrameMs(50);
  await first.action({train:'wei1'});await first.click('cameraToggle');await first.framesFor(7.3);
  assert.equal(first.session.phase,1);assert.equal(first.session.previousPose,'rest');
  first.setTarget('prayer');const started=first.now;await first.framesFor(2);
  assert.equal(first.session.phase,2);assert.ok(first.now-started<=2100);
  const phase2Start=first.now;await first.framesFor(.6);assert.equal(first.session.phase,2);
  await first.framesFor(1.5);assert.equal(first.session.phase,3);
  await first.framesFor(8);assert.equal(first.session.phase,3);assert.equal(first.state.records.length,0);
  first.setTarget(null);await first.framesFor(25);
  assert.equal(first.state.records.length,1);assert.equal(first.state.records[0].verified,true);
  console.log('PASS first-form chest prayer advances automatically; repeated prayer needs fresh confirmation; lowering hands is still required');

  const slow=await harness();slow.setFrameMs(50);slow.setSampleMs(300);slow.setInferenceDelay(200);
  await slow.action({train:'wei1'});await slow.click('cameraToggle');await slow.framesFor(45);
  assert.equal(slow.state.records.length,1);assert.equal(slow.state.records[0].verified,true);
  assert.ok(slow.state.records[0].seconds<38);assert.equal(slow.state.records[0].coins,12);
  console.log('PASS 300ms camera samples with delayed inference complete the first form and save real elapsed time');

  const heavy=await harness();heavy.setFrameMs(50);heavy.setInferenceDelay(550);
  await heavy.action({train:'wei1'});await heavy.click('cameraToggle');await heavy.framesFor(55);
  assert.equal(heavy.state.records.length,1);assert.equal(heavy.state.records[0].verified,true);
  console.log('PASS 550ms inference latency does not trigger an endless stale-result reset');

  const paused=await harness();paused.setFrameMs(50);paused.setInferenceDelay(300);
  await paused.action({train:'wei2'});await paused.click('cameraToggle');await paused.framesFor(5.7);
  await paused.click('pausePractice');await paused.framesFor(.4);
  assert.equal(paused.session.goodMs,0);assert.equal(paused.session.playing,false);
  await paused.click('pausePractice');paused.setBadPose(true);await paused.framesFor(3);
  assert.equal(paused.session.phase,0);assert.equal(paused.session.goodMs,0);
  paused.setBadPose(false);await paused.framesFor(4);assert.ok(paused.session.phase>0);
  console.log('PASS late inference replies after pause cannot restore cleared progress');

  const stale=await harness();stale.setFrameMs(50);stale.setInferenceDelay(1100);
  await stale.action({train:'wei2'});await stale.click('cameraToggle');await stale.framesFor(15);
  assert.equal(stale.session.phase,0);assert.equal(stale.session.goodMs,0);
  stale.setInferenceDelay(0);await stale.framesFor(4);assert.ok(stale.session.phase>0);
  console.log('PASS over-age results never pass a step; fresh tracking recovers without restarting the lesson');

  const save=await harness(),P=save.context.QimaiProgress,record={id:'tracking-verified',lessonId:'wei1',seconds:16,completedSteps:8,verified:true};
  assert.throws(()=>P.award(P.fresh(),{...record,completedSteps:7}));
  assert.throws(()=>P.award(P.fresh(),{...record,seconds:12}));
  const state=P.fresh();P.award(state,record);assert.equal(state.records[0].seconds,16);assert.equal(state.coins,12);
  assert.equal(P.award(state,record).coins,0);
  console.log('PASS faster complete lessons save without invented time; incomplete runs and duplicate rewards remain blocked');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
