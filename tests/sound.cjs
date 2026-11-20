const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
async function main(){
  const requested=[],started=[],utterances=[],pending=new Map();
  let stopped=0;
  class AudioContext {
    constructor(){this.state='running';this.currentTime=0;this.destination={};}
    createGain(){return{gain:{value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
    createBufferSource(){return{connect(){},disconnect(){},start(){started.push(this.buffer);},stop(){stopped++;}};}
    decodeAudioData(bytes){return Promise.resolve(bytes);}
  }
  const sandbox={AudioContext,console,setInterval(){},clearInterval(){},
    speechSynthesis:{cancel(){},getVoices:()=>[],speak:text=>utterances.push(text)},
    SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
    fetch(url){requested.push(url);return new Promise((resolve,reject)=>pending.set(url,{resolve,reject}));},
    QimaiVoiceClips:{first:'first.wav',second:'second.wav',cancelled:'cancelled.wav',broken:'broken.wav'}};
  sandbox.window=sandbox;vm.runInNewContext(fs.readFileSync(path.join(root,'sound.js'),'utf8'),sandbox);
  const S=sandbox.QimaiSound;
  async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
  S.speak('first');S.speak('second');
  pending.get('second.wav').resolve({ok:true,arrayBuffer:async()=>2});await settle();
  pending.get('first.wav').resolve({ok:true,arrayBuffer:async()=>1});await settle();
  assert.deepEqual(started,[2]);
  console.log('PASS newer voice cue replaces stale asynchronous audio');
  S.speak('cancelled');S.stop();pending.get('cancelled.wav').resolve({ok:true,arrayBuffer:async()=>3});await settle();
  assert.deepEqual(started,[2]);assert.equal(stopped,1);
  S.speak('second');await settle();assert.deepEqual(started,[2,2]);assert.equal(requested.filter(x=>x==='second.wav').length,1);
  console.log('PASS pause cancels pending playback and repeated cues reuse decoded audio');
  S.speak('broken');pending.get('broken.wav').reject(Error('missing'));await settle();assert.equal(utterances[0].text,'broken');
  S.settings({voice:false,music:false,volume:.18});assert.equal(S.speak('second'),false);
  console.log('PASS missing clip falls back to system speech; voice toggle disables new cues');
  const data={};data.window=data;
  for(const name of ['courses.js','voice-clips.js'])vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),data);
  for(const lesson of [...data.QimaiData.lessons,...data.QimaiData.seated]){
    for(const step of lesson.steps)for(const text of [step.cue,step.cue+'。'+step.breath])assert.ok(data.QimaiVoiceClips[text],text);
  }
  for(const file of Object.values(data.QimaiVoiceClips)){
    const bytes=fs.readFileSync(path.join(root,file));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length>1000);
  }
  console.log('PASS all 134 offline clips exist and cover every action and breathing cue');
}
module.exports=main();
