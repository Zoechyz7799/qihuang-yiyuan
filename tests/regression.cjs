const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {TextEncoder,TextDecoder}=require('node:util');
const root=path.resolve(__dirname,'..');
const sandbox={crypto:webcrypto,TextEncoder,TextDecoder,console,
  btoa:text=>Buffer.from(text,'binary').toString('base64'),atob:text=>Buffer.from(text,'base64').toString('binary')};
sandbox.window=sandbox;
const context=vm.createContext(sandbox);
for(const file of ['courses.js','motion.js','progress.js','coach.js','companion.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const D=context.QimaiData,P=context.QimaiProgress,C=context.QimaiCoach;
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const record=(lessonId,id=webcrypto.randomUUID())=>({id,lessonId,seconds:40,verified:false});
test('12 standing and 6 seated lessons have valid, distinct motion paths',()=>{
  assert.equal(D.lessons.length,12);assert.equal(D.seated.length,6);
  const all=[...D.lessons,...D.seated];
  assert.equal(new Set(all.map(x=>x.id)).size,18);
  for(const lesson of all){assert.equal(lesson.steps.length,4);for(const step of lesson.steps)assert.ok(D.poses[step.pose]);}
  assert.equal(new Set(D.lessons.map(x=>x.steps.map(s=>s.pose).join(','))).size,12);
});
test('seated animation keeps hips and feet fixed for every pose',()=>{
  const avatar=context.QimaiCompanion;
  for(const target of Object.values(D.poses)){
    const points=avatar.interpolate(D.poses.rest,target,1,true);
    assert.equal(points[27][1],.88);assert.equal(points[23][1],.61);
  }
});
test('real practice rewards once per record and once per lesson per day',()=>{
  const state=P.fresh(),r=record('wei1');
  assert.equal(P.award(state,r).coins,12);
  assert.equal(P.award(state,r).coins,0);
  assert.equal(P.award(state,record('wei1')).coins,0);
  assert.equal(state.cards.wei1.count,2);assert.equal(state.records.length,2);
});
test('daily practice coins capped at 60; demo and incomplete practice earn nothing',()=>{
  const state=P.fresh();for(const lesson of D.lessons)P.award(state,record(lesson.id));
  assert.equal(state.coins,60);
  const before=JSON.stringify(state);
  P.award(state,{...record('seat1'),demo:true});
  assert.equal(JSON.stringify(state),before);
  assert.throws(()=>P.award(state,{...record('seat1'),seconds:12}));
});
test('milestone rewards are earned and cannot be claimed twice',()=>{
  const state=P.fresh();assert.throws(()=>P.claim(state,'start'));
  P.award(state,record('seat1'));
  assert.equal(P.claim(state,'start'),12);assert.equal(state.coins,24);
  assert.throws(()=>P.claim(state,'start'));
});
test('purchases and equip/unequip preserve balance and ownership',()=>{
  const state=P.fresh();assert.throws(()=>P.purchase(state,'scarf'));
  state.coins=24;P.purchase(state,'scarf');
  assert.equal(state.coins,0);assert.equal(state.equipped.neck,'scarf');
  P.purchase(state,'scarf');assert.equal(state.equipped.neck,null);assert.equal(state.coins,0);
  P.purchase(state,'scarf');assert.equal(state.owned.length,1);
});
test('friends join via invitation and update leaderboard from reports',()=>{
  const host=P.fresh(),friend=P.fresh();host.name='小山';friend.name='小溪';
  P.createGroup(host,'午后松风');P.importCode(friend,P.invite(host));
  P.award(friend,record('seat1'));
  const code=P.encode(P.report(friend));P.importCode(host,code);
  const rows=P.leaderboard(host);assert.equal(rows.length,2);assert.equal(rows[0].name,'小溪');
  assert.equal(rows[0].activeDays,1);
  assert.throws(()=>P.importCode(host,code));
});
test('cross-group, malformed and future reports are rejected',()=>{
  const host=P.fresh(),friend=P.fresh();P.createGroup(host,'甲');P.createGroup(friend,'乙');
  assert.throws(()=>P.importCode(host,P.encode(P.report(friend))));
  P.importCode(friend,P.invite(host));
  const report=P.report(friend);report.sentAt=Date.now()+600000;
  assert.throws(()=>P.importCode(host,P.encode(report)));
  assert.throws(()=>P.importCode(host,'QM3.invalid'));
  report.sentAt=Date.now();report.days=[{date:'2026-02-31',seconds:40,count:1}];
  assert.throws(()=>P.importCode(host,P.encode(report)));
});
test('leaderboard limits effective minutes and ignores previous weeks',()=>{
  const state=P.fresh();P.createGroup(state,'测试');
  state.records.push({date:P.dayKey(),seconds:3600,lessonId:'wei1'});
  const rows=P.leaderboard(state);assert.equal(rows[0].minutes,20);assert.equal(rows[0].activeDays,1);
});
function landmarks(pose){
  const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
  for(const [id,[x,y]]of Object.entries(D.poses[pose]))points[id]={x,y,visibility:1};
  return points;
}
test('upper-body steps ignore unseen legs; leg-dependent steps still require full framing',()=>{
  const points=landmarks('spread');for(const id of [23,24,25,26,27,28])points[id]=null;
  assert.equal(C.evaluate(points,'spread','seated').ready,true);
  assert.equal(C.evaluate(points,'spread','standing').ready,true);
  assert.equal(C.evaluate(points,'squat','standing').code,'framing');
});
test('basic targets accepted; low arm and occlusion produce specific correction',()=>{
  for(const target of ['rest','close','prayer','spread','sky'])assert.equal(C.evaluate(landmarks(target),target,'seated').ready,true,target);
  const points=landmarks('spread');points[16].y=.6;
  assert.equal(C.evaluate(points,'spread','seated').code,'raise右');
  points[16].visibility=.1;assert.equal(C.evaluate(points,'spread','seated').code,'framing');
});
console.log(count+' regression groups passed');
