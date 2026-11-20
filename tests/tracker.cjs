const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../tracker.js'),'utf8').replace("import('./vendor/tasks-vision/vision_bundle.mjs')",'Promise.resolve(mockVision)');
async function run({supported=true,failInit=false,failDetect=false}={}){
  let terminations=0,framesClosed=0,mainCalls=0,workerCalls=0;
  const ctx=vm.createContext({URL,console,setTimeout,clearTimeout,location:{href:'http://localhost:9036/tests/check.html'},document:{currentScript:{src:'http://localhost:9036/tracker.js'}},
    OffscreenCanvas:function(){},createImageBitmap:async()=>({close(){framesClosed++;}}),
    mockVision:{FilesetResolver:{forVisionTasks:async url=>{assert.equal(url,'http://localhost:9036/vendor/tasks-vision/wasm');return{};}},PoseLandmarker:{createFromOptions:async()=>({detectForVideo(){mainCalls++;return{landmarks:[],worldLandmarks:[]};},close(){}})}},
    Worker:supported?class{
      constructor(url){assert.equal(String(url),'http://localhost:9036/pose-worker.js');}
      postMessage(message){queueMicrotask(()=>{
        if(message.type==='init')this.onmessage({data:{id:message.id,...(failInit?{error:'init failed'}:{ready:true})}});
        else{workerCalls++;this.onmessage({data:{id:message.id,...(failDetect?{error:'worker failed'}:{result:{landmarks:[],worldLandmarks:[]}})}});}
      });}
      terminate(){terminations++;}
    }:undefined
  });ctx.window=ctx;vm.runInContext(source,ctx);
  const model=await ctx.QimaiTracker.create();
  const result=await model.detectForVideo({},100);assert.equal(result.landmarks.length,0);
  const backend=model.backend;model.close();
  return{backend,terminations,framesClosed,mainCalls,workerCalls};
}
(async()=>{
 let r=await run();assert.equal(r.backend,'worker');assert.equal(r.mainCalls,0);assert.equal(r.workerCalls,1);assert.equal(r.framesClosed,1);assert.equal(r.terminations,1);
 console.log('PASS worker uses script-relative URLs and releases frame buffers and worker resources');
 r=await run({supported:false});assert.equal(r.backend,'main');assert.equal(r.mainCalls,1);
 r=await run({failInit:true});assert.equal(r.backend,'main');assert.equal(r.mainCalls,1);assert.equal(r.terminations,1);
 console.log('PASS browsers without worker support and failed worker initialization use the existing local model fallback');
 r=await run({failDetect:true});assert.equal(r.backend,'main');assert.equal(r.mainCalls,1);assert.equal(r.terminations,1);assert.equal(r.framesClosed,1);
 console.log('PASS a failed worker inference switches to compatibility mode without hanging the frame queue');
})().catch(error=>{console.error(error);process.exitCode=1;});
