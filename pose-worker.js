/* Classic Worker supports the bundled WASM loader's importScripts call. */
let model;
self.onmessage=async({data})=>{
  const {id,type,frame,timestamp}=data;
  try{
    if(type==='init'){
      const vision=await import('./vendor/tasks-vision/vision_bundle.mjs');
      const files=await vision.FilesetResolver.forVisionTasks(new URL('./vendor/tasks-vision/wasm',self.location.href).href);
      model=await vision.PoseLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:new URL('./vendor/tasks-vision/pose_landmarker_lite.task',self.location.href).href,delegate:'CPU'},
        // 近距离坐姿只拍到上半身时，人体检测置信度会明显下降；放宽门槛后不必后退 1 米也能开始识别。
        runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.3,minPosePresenceConfidence:.3,minTrackingConfidence:.3
      });
      self.postMessage({id,ready:true});
    }else if(type==='detect'){
      if(!model)throw Error('识别模型尚未就绪');
      const result=model.detectForVideo(frame,timestamp);
      self.postMessage({id,result:{landmarks:result.landmarks,worldLandmarks:result.worldLandmarks}});
    }
  }catch(error){self.postMessage({id,error:error.message||String(error)});}
  finally{frame?.close();}
};
