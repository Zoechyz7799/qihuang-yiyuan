(async function () {
  'use strict';
  const $=id=>document.getElementById(id);
  if(location.protocol==='file:') { $('fileWarning').hidden=false;return; }
  const D=QimaiData,P=QimaiProgress,Store=QimaiStore,Avatar=QimaiCompanion,Sound=QimaiSound;
  const poseEvaluator=QimaiCoach.createEvaluator();
  Sound.onStatus?.(message=>{$('voiceStatus').textContent=message;});
  let mode='seated',page='home',session=null,model=null,stream=null,cameraLoading=false;
  let frameId=0,lastAt=0,lastVideoTime=-1,lastModelAt=-1,lastInferenceTs=-1,feedback=null,feedbackCode='',feedbackSince=0,lastSpokenFeedback=0,cameraRequest=0,modelPromise=null;
  let inferencePending=false,lastCaptureAt=-1,lastResultAt=-1,observationEpoch=0;
  let toastTimer,cardLesson=null,resultSummary=null,greetingTimer,greetingIndex=0;
  const icon=name=>'<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"/></svg>';
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const getState=()=>Store.get();
  function toast(text){
    $('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{$('toast').hidden=true;},5000);
  }
  async function change(fn) {
    try {const result=await Store.transaction(fn);render();return result;}
    catch(error){toast(error.message);throw error;}
  }
  function dismiss(id){if($(id).open) $(id).close();}
  function navigate(target){
    page=target;
    document.querySelectorAll('.page').forEach(el=>{el.hidden=el.id!==target;});
    document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===target));
    $('pageContext').textContent=({home:'今天，也给自己一小段时间',journey:'把每一份认真，留在路上',wardrobe:'你的伙伴，你来装扮',circle:'和熟悉的人，一起慢慢来'})[target];
    window.scrollTo(0,0);render();
  }
  function listForMode(){return mode==='seated'?D.seated:D.lessons;}
  function chosenLessons(){
    const lessons=listForMode();
    return mode==='standing'&&$('courseLength').value==='short'?lessons.slice(0,3):lessons;
  }
  function lessonCard(lesson,index,collection=false){
    const card=getState().cards[lesson.id],status=card?'已收集':'练习后解锁';
    return '<article class="lesson-card'+(collection&&!card?' locked':'')+'"><div class="lesson-visual"><canvas data-pose-preview="'+lesson.id+'" aria-label="'+esc(lesson.name)+'动作示意"></canvas><div class="lesson-meta"><span>'+ (lesson.ai?'基础 AI 反馈':'动作路径跟练') +'</span><span class="'+(card?'completed-label':'')+'">'+status+'</span></div></div><div class="lesson-info"><h3>'+esc(lesson.name)+'</h3><p>'+esc(lesson.short)+' · 约 40 秒</p><div class="button-row"><button class="button" data-train="'+lesson.id+'">练这一式</button><button class="text-button" data-card="'+lesson.id+'">'+(card?'查看动作卡':'查看要领')+'</button></div></div></article>';
  }
  function render(){
    const state=getState();if(!state) return;
    $('coinBalance').textContent=state.coins;$('profileLabel').textContent=state.name;
    const stats=P.stats(state);
    $('weekDays').textContent=stats.days;$('weekMinutes').textContent=stats.minutes;$('cardCount').textContent=Object.keys(state.cards).length;
    if(page==='home'){
      document.querySelectorAll('[data-mode]').forEach(button=>{const selected=button.dataset.mode===mode;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
      $('courseKind').textContent=mode==='seated'?'坐姿 · 上半身改编练习':'站姿 · 易筋经';
      $('courseTitle').textContent=mode==='seated'?'一椅松风':$('courseLength').value==='short'?'从三势开始':'十二势，连成一段时光';
      $('courseDescription').textContent=mode==='seated'?'六段上半身练习，从合掌松肩到放松收势。':'从预备到收势，跟着刘看山逐段学习动作路径。';
      $('courseDuration').textContent=chosenLessons().length+' 段 · 约 '+Math.round(chosenLessons().length*40/60)+' 分钟';
      $('courseLengthWrap').hidden=mode==='seated';
      $('lessonGrid').innerHTML=listForMode().map(lessonCard).join('');
    }
    if(page==='journey'){
      const count=Object.keys(state.cards).length;
      $('route').innerHTML=D.milestones.map((item,index)=>{
        const unlocked=count>=item.goal,claimed=state.claimed.includes(item.id);
        return '<article class="route-stop '+(unlocked?'unlocked':'')+'"><div class="route-mark">'+icon(['leaf','journey','friends','spark'][index])+'</div><h3>'+item.name+'</h3><p>'+item.story+'</p><p>'+Math.min(count,item.goal)+' / '+item.goal+' 张动作卡 · '+item.coins+' 金币</p><button class="button '+(unlocked&&!claimed?'primary':'')+'" data-claim="'+item.id+'" '+(!unlocked||claimed?'disabled':'')+'>'+(claimed?'已收好奖励':unlocked?'领取奖励':'继续积累')+'</button></article>';
      }).join('');
      $('collectionCount').textContent=count+' / 18 张';
      $('collection').innerHTML=[...D.lessons,...D.seated].map((lesson,index)=>lessonCard(lesson,index,true)).join('');
    }
    if(page==='wardrobe'){
      $('shop').innerHTML=D.shop.map((item,index)=>{
        const owned=state.owned.includes(item.id),equipped=state.equipped[item.slot]===item.id;
        return '<article class="shop-card"><canvas data-outfit-preview="'+item.id+'" aria-label="'+esc(item.name)+'装扮预览"></canvas><h3>'+item.name+'</h3><p>'+item.description+'</p><button class="button '+(equipped?'primary':'')+'" data-buy="'+item.id+'">'+(equipped?'已穿戴 · 点击卸下':owned?'穿戴装扮':item.price+' 金币 · 兑换')+'</button></article>';
      }).join('');
    }
    if(page==='circle') renderCircle();
    drawIdle();drawPreviews();
  }
  function drawIdle(){
    if(session||!getState())return;
    if(page==='wardrobe')Avatar.draw($('wardrobeAvatar'),D.poses.rest,getState().equipped);
  }
  function drawPreviews(){
    const state=getState();if(!state||session)return;
    document.querySelectorAll('[data-pose-preview]').forEach(canvas=>{
      const lesson=[...D.lessons,...D.seated].find(item=>item.id===canvas.dataset.posePreview);
      const seated=lesson.id.startsWith('seat');
      const shown=lesson.steps.find(step=>!['rest','close','prayer'].includes(step.pose))||lesson.steps.find(step=>step.pose==='prayer')||lesson.steps[1];
      Avatar.draw(canvas,Avatar.interpolate(D.poses.rest,D.poses[shown.pose],1,seated),{}, {seated,preview:true});
    });
    document.querySelectorAll('[data-outfit-preview]').forEach(canvas=>{
      const item=D.shop.find(item=>item.id===canvas.dataset.outfitPreview);
      Avatar.draw(canvas,D.poses.rest,{[item.slot]:item.id},{preview:true,outfit:true});
    });
  }
  function greetCompanion(){
    clearTimeout(greetingTimer);
    const lines=['你来啦。今天想从哪一式开始？','不着急，我陪你慢慢来。','休息一下，也是在认真生活。','今天的一点小进步，我会替你记住。'];
    $('homeMascot').src='assets/gif/hello.gif';$('companionBubble').textContent=lines[greetingIndex++%lines.length];
    greetingTimer=setTimeout(()=>{$('homeMascot').src='assets/gif/idle.gif';},4500);
  }
  function renderCircle(){
    const state=getState(),group=P.activeGroup(state);
    if(document.activeElement!==$('nickname')) $('nickname').value=state.name;
    $('groupPanel').hidden=!group;
    if(!group) return;
    $('groupSelect').innerHTML=state.groups.map(item=>'<option value="'+item.id+'" '+(item.id===group.id?'selected':'')+'>'+esc(item.name)+'</option>').join('');
    $('groupTitle').textContent=group.name;
    const rows=P.leaderboard(state),days=rows.reduce((sum,row)=>sum+row.activeDays,0),goal=rows.length*3;
    $('groupGoal').textContent='本周一起点亮 '+days+' / '+goal+' 个练习日 · 每位伙伴 3 天的小目标';
    $('groupGoalBar').style.width=Math.min(100,days/goal*100)+'%';
    $('leaderboard').innerHTML=rows.map((row,index)=>{
      const date=new Date(row.sentAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
      const cheered=group.cheers.includes(P.dayKey()+':'+row.id);
      return '<div class="rank-row '+(row.self?'self':'')+'"><span class="rank-number">'+(index+1)+'</span><div><b>'+esc(row.name)+(row.self?' · 我':'')+'</b><small>'+(row.self?'本机实时记录':'战报更新于 '+date)+'</small></div><div><b>'+row.activeDays+' 天</b><small>'+row.minutes+' 有效分钟</small></div>'+(!row.self?'<button class="text-button" data-cheer="'+row.id+'" '+(cheered?'disabled':'')+'>'+(cheered?'今日鼓励已记下':'给 TA 一份鼓励')+'</button>':'')+'</div>';
    }).join('')+(rows.length===1?'<p class="empty">把入圈口令分享给好友，再导入对方的战报，就能在这里相遇。</p>':'');
  }
  function openCard(id){
    const lesson=[...D.lessons,...D.seated].find(item=>item.id===id);if(!lesson) return;
    cardLesson=lesson;
    $('cardTitle').textContent=lesson.name;$('cardStory').textContent=lesson.story;$('cardTip').textContent=lesson.tip;
    const card=getState().cards[id];
    $('cardRecord').textContent=card?'首次收集 '+card.firstDate+' · 跟练 '+card.count+' 次 · 动作要点观察达标 '+card.verified+' 次':'完成一段练习后，这张卡就会收进你的动作手册。';
    $('cardDialog').showModal();
  }
  function setSoundSettings(){
    const settings=getState().settings;
    Sound.settings(settings,!!session?.playing);
    for(const [id,key] of [['settingVoice','voice'],['settingBreath','breath'],['settingMusic','music'],['breathToggle','breath']]) $(id).checked=settings[key];
    $('settingVolume').value=settings.volume;
    $('soundToggle').textContent=settings.voice?'语音已开启':'开启语音';
    $('musicToggle').textContent=settings.music?'关闭背景音乐':'开启背景音乐';
    $('voiceStatus').textContent='内置 134 条中文口令，可离线播放。动作、呼吸与纠正提示同步显示文字。';
  }
  async function updateSound(key,value){
    try{await change(state=>{state.settings[key]=value;});setSoundSettings();}catch(_){}
  }
  function startPractice(lessons,demo=false){
    if(session) return;
    dismiss('cardDialog');dismiss('resultDialog');dismiss('settingsDialog');
    const first=lessons[0];
    mode=first.id.startsWith('seat')?'seated':'standing';
    session={id:crypto.randomUUID(),lessons,demo,index:0,phase:0,round:0,phaseElapsed:0,lessonElapsed:0,totalElapsed:0,
      stage:'prepare',stageElapsed:0,previousPose:'prayer',playing:true,aiOn:false,aiEligible:false,challenge:!demo&&mode==='standing',checkedSteps:0,completedSteps:0,hold:{elapsed:0,lastAt:null},goodMs:0,completed:[],coins:0,verifiedCount:0,
      saving:false,lessonRecordId:crypto.randomUUID(),speed:demo?2:1};
    QimaiReminder.setBusy(demo?'demo':true);
    $('practice').hidden=false;$('previewBadge').hidden=!demo;
    document.querySelector('.sidebar').inert=true;document.querySelector('.workspace').inert=true;
    document.body.style.overflow='hidden';$('practice').scrollTop=0;$('exitPractice').focus({preventScroll:true});
    $('cameraToggle').disabled=demo;$('cameraToggle').textContent='开启摄像头，开始纠正';$('cameraPanel').hidden=false;$('freePracticeToggle').disabled=demo;
    $('pausePractice').textContent='暂停';feedback=null;feedbackCode='';lastVideoTime=-1;lastModelAt=-1;lastAt=performance.now();drawSkeleton(null);
    setSoundSettings();Sound.ensure();Sound.start();
    updatePracticeUI(true);
    Sound.speak(mode==='seated'?'坐在稳定的椅子上，双脚平放地面。准备开始。':'请给身体留出足够的活动空间。准备开始。');
    frameId=requestAnimationFrame(tick);
  }
  function currentLesson(){return session.lessons[session.index];}
  function currentStep(){return currentLesson().steps[session.phase];}
  function updatePracticeUI(announce=false){
    const s=session;if(!s) return;
    const lesson=currentLesson(),step=currentStep(),settings=getState().settings;
    $('practiceKind').textContent=(s.demo?'演示 · ':mode==='seated'?'坐姿改编 · ':'站姿易筋经 · ')+(s.stage==='prepare'?'预备':s.stage==='closing'?'收势':'第 '+(s.index+1)+' 段');
    $('practiceName').textContent=lesson.name;
    $('sessionProgress').textContent=(s.index+1)+' / '+s.lessons.length;
    $('viewLabel').textContent='镜头位置：'+lesson.view;$('coverageNote').textContent=lesson.coverage||'观察上半身可见关键点；遮挡时暂停判定。';
    $('lessonTip').textContent=mode==='seated'?lesson.tip.replace('站姿上托可轻提脚跟，先保持平衡。','保持坐稳，双手舒适地向上伸展。'):lesson.tip;
    $('stepLabel').textContent=s.stage==='prepare'?'预备 · 找到舒适的位置':s.stage==='closing'?'收势 · 放松回落':'第 '+(s.round+1)+' 遍 · 步骤 '+(s.phase+1)+' / 4';
    let cue=s.stage==='prepare'?('跟随示范，'+step.cue):s.stage==='closing'?'缓缓放下双手，回到自然呼吸':step.cue;
    if(mode==='seated') cue=cue.replace('站姿可轻提脚跟','保持坐稳');
    $('stepCue').textContent=cue;
    const breath=settings.breath&&s.stage==='run'?step.breath:'自然呼吸';
    $('breathLabel').textContent=breath;
    $('breathOrb').classList.toggle('inhale',settings.breath&&breath.includes('吸气'));
    $('phaseDots').innerHTML=lesson.steps.map((_,i)=>'<span class="phase-dot '+(i<=s.phase?'active':'')+'"></span>').join('');
    $('recognitionStatus').textContent=s.demo?'演示播放 · 不读取摄像头，不计通关':s.challenge&&lesson.ai?'逐步通关 · 到位约 1.2 秒自动衔接，短暂抖动暂停计时':'自由跟练 · 显示动作反馈，不记录 AI 通关';
    $('freePracticeToggle').textContent=s.challenge?'仅跟练，不判定通关':'开启逐步通关，从本式重新开始';
    renderObservation();
    $('lessonQueue').innerHTML=s.lessons.map((item,i)=>'<span class="queue-item '+(i===s.index?'active':i<s.index?'done':'')+'">'+(i<s.index?'✓ ':'')+esc(item.name)+'</span>').join('');
    if(announce&&s.stage==='run'){
      Sound.speak(cue+(settings.breath?'。'+step.breath:''));
    }
    if(announce&&s.stage==='closing')Sound.speak(cue);
  }
  function resetHold(){observationEpoch++;poseEvaluator.reset();if(session){session.hold={elapsed:0,lastAt:null};session.goodMs=0;}renderHold();}
  function renderHold(){
    const s=session,value=s?.goodMs||0,limit=QimaiCoach.holdMs;
    $('holdValue').textContent=(value/1000).toFixed(1)+' / '+(limit/1000).toFixed(1)+' 秒';
    $('holdFill').style.width=(value/limit*100)+'%';$('holdProgress').setAttribute('aria-valuenow',String(Math.round(value)));
    $('holdProgress').setAttribute('aria-valuemax',String(limit));
    $('holdLabel').textContent=!s?.playing?'已暂停 · 继续后重新确认':s?.demo?'演示不计通关':!s?.challenge?'自由跟练 · 不计通关':!s?.aiOn?'等待摄像头':s.stage!=='run'?'准备入镜':s.hold.complete?'本步到位 · 正在衔接':s.hold.recovering?'短暂抖动 · 进度已保留':feedback?.ready?'动作到位 · 正在确认':'调整到位后开始确认';
  }
  function renderObservation(){
    const s=session;if(!s)return;
    let title='准备好后，开启动作观察',message='动作到位约 1.2 秒后自动衔接下一步，短暂抖动会暂停计时。',badge='等待开启';
    if(s.demo){title='先看看刘看山怎么做';message='演示只展示动作路径，不读取摄像头，也不计入通关。';badge='动作演示';}
    else if(!s.playing){title='已暂停，放松一下';message='继续后重新观察动作，确认到位后自动继续。';badge='已暂停';}
    else if(cameraLoading){title='正在准备摄像头';message='首次加载本机识别模型，请稍候。';badge='正在开启';}
    else if(s.aiOn){
      title=feedback?.ready?(s.hold.complete?'本步已到位，准备下一步':'要点到位，正在确认'):feedback?.tracking?'再调整一点，就能继续':'先让头肩清晰入镜';
      message=feedback?.message||'等待新的摄像头画面。';badge=feedback?.ready?'已到位':feedback?.tracking?'调整中':'等待入镜';
    }
    else if(!s.challenge){title='按自己的节奏跟练';message='可以开启摄像头查看动作反馈；自由跟练不记录 AI 通关。';badge='自由跟练';}
    $('feedbackTitle').textContent=title;
    if($('cameraFeedback').textContent!==message)$('cameraFeedback').textContent=message;
    $('trackingBadge').textContent=badge;
    $('cameraPanel').classList.toggle('ready',!!(s.playing&&s.aiOn&&feedback?.ready));
    $('cameraPanel').classList.toggle('adjust',!!(s.playing&&s.aiOn&&feedback?.tracking&&!feedback?.ready));
    const checks=s.aiOn&&s.playing?feedback?.checks||[]:[];
    $('poseChecklistCount').textContent=checks.length?feedback.passed+' / '+feedback.total+' 项到位':'等待识别';
    const html=checks.length?checks.map(item=>'<li class="'+(item.ready?'passed':item.unknown?'unknown':'needs-adjust')+'"><span class="check-mark">'+(item.ready?'✓':item.unknown?'?':'·')+'</span><span>'+esc(item.label)+'</span><small>'+esc(item.actual||'')+'</small></li>').join(''):'<li>入镜后显示各项动作完成情况</li>';
    if($('poseChecklist').innerHTML!==html)$('poseChecklist').innerHTML=html;
    $('cameraPlaceholder').hidden=!!(s.aiOn&&feedback?.tracking&&s.playing);
    $('cameraPlaceholderTitle').textContent=s.demo?'正在观看示范':s.aiOn?'调整镜头，让头肩入镜即可':'让刘看山看见你的动作';
    $('cameraPlaceholderText').textContent=s.demo?'亲自练习时，这里显示你的实时骨骼':s.aiOn?(mode==='seated'?'近距离坐姿也能识别：头、肩、双肘看清即可，双手可略伸出画面':'头、双肩入镜即可，手脚可略伸出画面'):'开启摄像头后，这里会显示你的骨骼轮廓';
    renderHold();
  }
  function stopCamera(){
    cameraRequest++;cameraLoading=false;
    if(stream)stream.getTracks().forEach(track=>track.stop());
    stream=null;$('video').srcObject=null;
    if(session){session.aiOn=false;session.aiEligible=false;}
    feedback=null;resetHold();drawSkeleton(null);
    $('cameraToggle').disabled=!!session?.demo;$('cameraToggle').textContent='开启摄像头，开始纠正';renderObservation();
  }
  async function toggleCamera(){
    if(!session||session.demo||cameraLoading)return;
    if(stream){stopCamera();updatePracticeUI();return;}
    const s=session,request=++cameraRequest;let acquired=null;
    cameraLoading=true;$('cameraToggle').disabled=true;$('cameraToggle').textContent='正在打开摄像头';renderObservation();
    const stale=()=>session!==s||request!==cameraRequest;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('当前浏览器无法使用摄像头，请通过 localhost 打开');
      acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
      if(stale()){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;
      if(!model){
        if(!modelPromise)modelPromise=QimaiTracker.create().catch(error=>{modelPromise=null;throw error;});
        model=await modelPromise;
      }
      if(stale()){acquired.getTracks().forEach(track=>track.stop());return;}
      $('video').srcObject=acquired;await $('video').play();
      if(stale()){acquired.getTracks().forEach(track=>track.stop());return;}
      s.aiOn=true;s.aiEligible=s.checkedSteps===0;resetHold();lastVideoTime=-1;lastModelAt=performance.now();lastResultAt=lastModelAt;lastCaptureAt=-1;feedback=null;
      // 坐姿课程保持原来的使用方式：开启观察后，对已有可观察步骤启用判定。
      if(mode==='seated')s.challenge=true;
      $('cameraToggle').textContent='关闭摄像头';updatePracticeUI();
    }catch(error){
      if(acquired)acquired.getTracks().forEach(track=>track.stop());
      if(!stale()){stopCamera();toast('AI 反馈未开启。'+(error.name==='NotAllowedError'?'请在浏览器设置中允许摄像头后重试。':error.message));}
    }finally{
      if(request===cameraRequest){cameraLoading=false;$('cameraToggle').disabled=!!session?.demo;if(!stream)$('cameraToggle').textContent='开启摄像头，开始纠正';renderObservation();}
    }
  }
  function drawSkeleton(landmarks){
    const canvas=$('skeleton'),ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    if(!landmarks)return;
    // 等比 contain，给顶部和脚下留边；不裁掉全身与侧向伸展的手。
    const ratio=($('video').videoWidth||640)/($('video').videoHeight||480),w=Math.min(rect.width-28,(rect.height-36)*ratio),h=w/ratio,ox=(rect.width-w)/2,oy=(rect.height-h)/2-7;
    const point=id=>[ox+(1-landmarks[id].x)*w,oy+landmarks[id].y*h];
    const visible=id=>QimaiCoach.isVisible(landmarks[id]);
    const joints=new Set(feedback?.joints||[]),edges=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
    ctx.lineWidth=4;ctx.lineCap='round';ctx.shadowBlur=10;
    for(const [a,b]of edges){
      if(!visible(a)||!visible(b))continue;
      ctx.strokeStyle=joints.has(a)||joints.has(b)?'#d79b58':feedback?.ready?'#6bae92':'#70a7db';ctx.shadowColor=ctx.strokeStyle;
      ctx.beginPath();ctx.moveTo(...point(a));ctx.lineTo(...point(b));ctx.stroke();
    }
    ctx.shadowBlur=0;
    for(const id of [0,11,12,13,14,15,16,23,24,25,26,27,28]){
      if(!visible(id))continue;
      ctx.fillStyle=joints.has(id)?'#d59a55':feedback?.ready?'#64a68a':'#598fc2';ctx.strokeStyle='#fff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(...point(id),id===0?7:5,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }
  function detect(now){
    const s=session,video=$('video');if(!s.aiOn||!model)return;
    if(lastResultAt>=0&&now-lastResultAt>QimaiCoach.staleMs&&feedback?.code!=='stale'){
      resetHold();feedback={code:'stale',ready:false,tracking:false,checks:[],message:'画面暂时中断，请保持入镜；恢复后重新确认动作',joints:[]};
      drawSkeleton(null);renderObservation();
    }
    // 最多约 15 次/秒，只处理最新一帧，不排队；动画仍独立按屏幕帧率播放。
    if(inferencePending||video.readyState<2||lastVideoTime===video.currentTime||now-lastCaptureAt<66)return;
    lastVideoTime=video.currentTime;lastCaptureAt=now;
    const epoch=observationEpoch,target=currentStep().check,aspect=(video.videoWidth||640)/(video.videoHeight||480);
    const active=()=>session===s&&s.playing&&s.aiOn&&!s.saving&&!document.hidden&&epoch===observationEpoch;
    inferencePending=true;lastInferenceTs=Math.max(now,lastInferenceTs+1);
    (async()=>{
      try{
        const result=await model.detectForVideo(video,lastInferenceTs);
        if(!active()||performance.now()-now>QimaiCoach.staleMs)return;
        const landmarks=result.landmarks?.[0];lastModelAt=now;lastResultAt=performance.now();
        feedback=currentLesson().ai?poseEvaluator.evaluate(landmarks,target,mode,aspect,{worldLandmarks:result.worldLandmarks?.[0],timestamp:now}):{code:'guided',ready:false,tracking:!!landmarks,checks:[],joints:[],message:landmarks?'已捕捉骨骼，本段按节奏跟练，不计 AI 通关':'请进入镜头，让上半身清晰可见'};
        const canHold=s.challenge&&currentLesson().ai&&s.stage==='run';
        s.hold=QimaiCoach.advanceHold(s.hold,canHold?feedback:{ready:false,hardFailure:true},now);s.goodMs=s.hold.elapsed;
        drawSkeleton(landmarks);
        if(feedback.code!==feedbackCode){feedbackCode=feedback.code;feedbackSince=now;}
        renderObservation();
        if(canHold&&!feedback.ready&&feedback.tracking&&now-feedbackSince>350&&now-lastSpokenFeedback>7000){Sound.speak(feedback.message);lastSpokenFeedback=now;}
      }catch(_){
        if(active()){resetHold();feedback={code:'error',ready:false,tracking:false,checks:[],joints:[],message:'识别暂时中断，请重新入镜；恢复后重新确认动作'};drawSkeleton(null);renderObservation();}
      }finally{inferencePending=false;}
    })();
  }
  function tick(now){
    const s=session;if(!s)return;
    const dt=Math.min(.2,Math.max(0,(now-lastAt)/1000));lastAt=now;
    if(s.playing&&!s.saving&&!document.hidden){
      const advance=dt*s.speed;s.stageElapsed+=advance;
      if(s.stage==='prepare'&&s.stageElapsed>=5){s.stage='run';s.stageElapsed=0;s.previousPose=currentStep().pose;s.aiEligible=s.aiOn;resetHold();feedback=null;updatePracticeUI(true);}
      else if(s.stage==='closing'&&s.stageElapsed>=5){finishPractice();return;}
      else if(s.stage==='run'){
        s.phaseElapsed+=advance;
        if(!s.challenge||s.aiOn){s.lessonElapsed+=dt;s.totalElapsed+=dt;}
      }
      if(s.stage!=='closing')detect(now);
      if(s.stage==='run'){
        const gated=s.challenge&&currentLesson().ai&&!s.demo;
        const ready=gated?s.aiOn&&s.hold.complete&&feedback?.ready&&now-lastResultAt<=400&&now-lastModelAt<=QimaiCoach.staleMs:false;
        if(gated?ready&&s.phaseElapsed>=QimaiMotion.moveMs/1000:s.phaseElapsed>=D.phaseMs/1000)advancePhase();
      }
    }
    if(session!==s)return;
    let target=currentStep().pose,points;
    if(s.saving)points=QimaiMotion.interpolate(D.poses[s.previousPose],D.poses[s.previousPose],1,mode==='seated');
    else if(s.stage==='prepare')points=QimaiMotion.interpolate(D.poses.rest,D.poses[currentStep().pose],Math.min(1,s.stageElapsed/5),mode==='seated');
    else if(s.stage==='closing')points=QimaiMotion.interpolate(D.poses[s.previousPose],D.poses.close,Math.min(1,s.stageElapsed/5),mode==='seated');
    else points=QimaiMotion.sample(s.previousPose,currentStep(),Math.min(1,s.phaseElapsed/(QimaiMotion.moveMs/1000)),mode==='seated');
    Avatar.draw($('practiceAvatar'),points,getState().equipped,{seated:mode==='seated',active:s.stage==='run',practice:true,pose:target,time:now});
    const fraction=s.challenge&&currentLesson().ai?Math.min(1,s.goodMs/QimaiCoach.holdMs):Math.min(1,s.phaseElapsed/5);
    const done=s.stage==='closing'?s.lessons.length*8:s.index*8+s.round*4+s.phase+fraction;
    $('sessionBar').style.width=Math.min(100,done/(s.lessons.length*8)*100)+'%';renderHold();
    frameId=requestAnimationFrame(tick);
  }
  function advancePhase(){
    const s=session;
    if(s.challenge&&s.aiOn&&currentLesson().ai&&s.hold.complete)s.checkedSteps++;
    s.completedSteps++;s.previousPose=currentStep().pose;s.phaseElapsed=0;resetHold();feedback=null;s.phase++;
    if(s.phase<4){updatePracticeUI(true);return;}
    s.phase=0;s.round++;
    if(s.round<D.rounds){updatePracticeUI(true);return;}
    s.saving=true;completeLesson(s);
  }
  function toggleFreePractice(){
    const s=session;if(!s||s.demo||s.saving||s.stage==='closing')return;
    s.challenge=!s.challenge;resetHold();s.checkedSteps=0;s.aiEligible=false;feedback=null;s.phaseElapsed=0;
    if(s.challenge){s.completedSteps=0;s.previousPose=currentStep().pose;s.phase=0;s.round=0;s.phaseElapsed=0;s.lessonElapsed=0;s.stage='prepare';s.stageElapsed=0;}
    updatePracticeUI(true);
  }
  async function completeLesson(s){
    const lesson=currentLesson();
    const verified=s.challenge&&s.aiOn&&lesson.ai&&s.checkedSteps===lesson.steps.length*D.rounds;
    try{
      const reward=await change(state=>P.award(state,{id:s.lessonRecordId,lessonId:lesson.id,seconds:Math.min(900,s.lessonElapsed),verified,completedSteps:s.completedSteps,demo:s.demo}));
      if(session!==s) return;
      s.coins+=reward.coins;s.completed.push({id:lesson.id,name:lesson.name,verified});if(verified)s.verifiedCount++;
      Sound.chime();
      s.index++;
      if(s.index>=s.lessons.length){s.index=s.lessons.length-1;s.phase=3;s.stage='closing';s.stageElapsed=0;}
      else{s.phase=0;s.round=0;s.lessonElapsed=0;s.lessonRecordId=crypto.randomUUID();s.aiEligible=s.aiOn;s.checkedSteps=0;s.completedSteps=0;}
      s.saving=false;updatePracticeUI(true);
    }catch(error){
      if(session!==s)return;
      s.playing=false;s.saving=false;s.phase=3;s.round=D.rounds-1;
      $('pausePractice').textContent='重试保存并继续';
      s.retrySave=true;
      toast('练习已完成，但进度尚未保存。请重试。');
    }
  }
  function finishPractice(){
    const s=session;if(!s)return;
    cancelAnimationFrame(frameId);Sound.stop();stopCamera();session=null;$('practice').hidden=true;
    document.querySelector('.sidebar').inert=false;document.querySelector('.workspace').inert=false;document.body.style.overflow='';
    resultSummary={demo:s.demo,completed:s.completed,coins:s.coins,seconds:s.totalElapsed,mode,at:new Date(),name:getState().name};
    $('resultEyebrow').textContent=s.demo?'动作演示结束':'今天的练习已收好';
    $('resultTitle').textContent=s.demo?'已经看过，可以亲自试一试。':'给这份认真一个拥抱。';
    $('resultDetail').textContent=s.demo?'角色已展示本次课程的动作路径。':'完成 '+s.completed.length+' 段练习，其中 '+s.verifiedCount+' 段完成动作要点观察。';
    $('earnedCoins').textContent=s.coins;$('earnedCards').textContent=s.demo?'演示':s.completed.length;$('earnedTime').textContent=s.demo?'演示':(s.totalElapsed/60).toFixed(1);
    $('resultCards').innerHTML=s.completed.map(item=>'<span class="result-card">'+esc(item.name)+'</span>').join('');
    $('resultHint').textContent=s.demo?'演示用于查看路线。亲自完成练习后可以获得金币和动作卡。':'每式每日首次完成可得金币。到山间旅程领取里程奖励，或给伙伴挑一件装扮。';
    $('resultDialog').showModal();
    if(!s.demo&&s.completed.length)QimaiReminder.complete();else QimaiReminder.setBusy(false);
    render();
  }
  function pausePractice(){
    const s=session;if(!s)return;
    if(s.retrySave){s.retrySave=false;s.saving=true;s.playing=true;completeLesson(s);$('pausePractice').textContent='暂停';return;}
    s.playing=!s.playing;resetHold();feedback=null;drawSkeleton(null);renderObservation();
    $('pausePractice').textContent=s.playing?'暂停':'继续练习';
    if(s.playing){Sound.start();updatePracticeUI(true);}else Sound.stop();
  }
  function exitPractice(){
    if(!session)return;
    const s=session;
    if(s.saving){toast('正在保存这段练习，请稍候');return;}
    cancelAnimationFrame(frameId);Sound.stop();stopCamera();session=null;$('practice').hidden=true;
    document.querySelector('.sidebar').inert=false;document.querySelector('.workspace').inert=false;document.body.style.overflow='';
    if(s.completed.length&&!s.demo)QimaiReminder.complete();else QimaiReminder.setBusy(false);
    toast(s.completed.length&&!s.demo?'已保留完成的 '+s.completed.length+' 段练习，下次继续。':'本次练习已结束，可以随时再出发。');
    render();
    $('startCourse').focus({preventScroll:true});
  }
  function showCode(type){
    const state=getState(),group=P.activeGroup(state);if(!group){toast('请先创建或加入圈子');return;}
    const code=type==='invite'?P.invite(state):P.encode(P.report(state));
    $('codeTitle').textContent=type==='invite'?'邀请好友一起练':'把这份练习分享给好友';
    $('codeSummary').textContent=type==='invite'?'圈子 '+group.name+'。好友导入后即可加入。':state.name+' · '+group.name+' · 本周 '+P.stats(state).days+' 个练习日。';
    $('exportCode').value=code;$('codeDialog').showModal();
  }
  function downloadReport(){
    if(!resultSummary)return;
    const r=resultSummary,c=document.createElement('canvas');c.width=900;c.height=900;
    const x=c.getContext('2d');x.fillStyle='#f3f8ff';x.fillRect(0,0,900,900);
    x.strokeStyle='#b8d2ef';x.lineWidth=2;x.strokeRect(35,35,830,830);
    x.fillStyle='#1773ed';x.font='24px sans-serif';x.fillText('气脉陪练 4.0 · 刘看山陪你舒展',70,105);
    x.fillStyle='#294467';x.font='bold 42px sans-serif';x.fillText(r.demo?'动作演示战报':'今天，也给自己一小段时间',70,180);
    x.font='24px sans-serif';x.fillStyle='#7a93b1';x.fillText(r.name+' · '+r.at.toLocaleDateString('zh-CN'),70,235);
    x.fillStyle='#b1904f';x.font='bold 35px sans-serif';x.fillText(r.demo?'演示完成':r.completed.length+' 段练习  ·  '+(r.seconds/60).toFixed(1)+' 分钟  ·  '+r.coins+' 金币',70,320);
    x.font='23px sans-serif';x.fillStyle='#5e7da2';
    r.completed.forEach((item,i)=>x.fillText('✓ '+item.name,70+(i%2)*390,390+Math.floor(i/2)*55));
    x.font='19px sans-serif';x.fillStyle='#91a5bc';x.fillText(r.demo?'演示数据，不计入练习记录。':'记录本次跟练与基础动作观察，继续按舒适节奏练习。',70,805);
    c.toBlob(blob=>{
      if(!blob){toast('图片生成失败，请重试');return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='气脉陪练4.0-练习战报.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    },'image/png');
  }
  // 所有动态内容均转义，好友口令只作为数据导入。
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    try{
      if(button.dataset.page)navigate(button.dataset.page);
      if(button.dataset.mode){mode=button.dataset.mode;render();}
      if(button.dataset.close)dismiss(button.dataset.close);
      if(button.dataset.train){const lesson=[...D.lessons,...D.seated].find(item=>item.id===button.dataset.train);startPractice([lesson]);}
      if(button.dataset.card)openCard(button.dataset.card);
      if(button.dataset.buy){await change(state=>P.purchase(state,button.dataset.buy));toast('伙伴的新装扮已保存');}
      if(button.dataset.claim){const coins=await change(state=>P.claim(state,button.dataset.claim));toast('收下 '+coins+' 枚旅程金币');Sound.chime();}
      if(button.dataset.cheer){await change(state=>{const group=P.activeGroup(state),key=P.dayKey()+':'+button.dataset.cheer;if(!group.cheers.includes(key))group.cheers.push(key);});toast('这份鼓励已记在本机，见面时也告诉 TA 吧');}
    }catch(_){}
  });
  $('greetCompanion').addEventListener('click',greetCompanion);
  $('choosePractice').addEventListener('click',()=>{$('modeChooser').scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});document.querySelector('[data-mode="'+mode+'"]')?.focus({preventScroll:true});});
  $('courseLength').addEventListener('change',render);
  $('startCourse').addEventListener('click',()=>startPractice(chosenLessons()));
  $('previewCourse').addEventListener('click',()=>startPractice(chosenLessons(),true));
  $('practiceCard').addEventListener('click',()=>startPractice([cardLesson]));
  $('exitPractice').addEventListener('click',exitPractice);$('pausePractice').addEventListener('click',pausePractice);
  $('cameraToggle').addEventListener('click',toggleCamera);$('freePracticeToggle').addEventListener('click',toggleFreePractice);
  $('settingsBtn').addEventListener('click',()=>{$('settingsDialog').showModal();setSoundSettings();});
  $('quickSettings').addEventListener('click',()=>{$('settingsDialog').showModal();setSoundSettings();});
  $('aboutBtn').addEventListener('click',()=>$('aboutDialog').showModal());
  $('resultHome').addEventListener('click',()=>{dismiss('resultDialog');navigate('home');});
  $('resultJourney').addEventListener('click',()=>{dismiss('resultDialog');navigate('journey');});
  $('downloadReport').addEventListener('click',downloadReport);
  $('soundToggle').addEventListener('click',()=>updateSound('voice',!getState().settings.voice));
  $('musicToggle').addEventListener('click',()=>updateSound('music',!getState().settings.music));
  for(const [id,key] of [['settingVoice','voice'],['settingBreath','breath'],['settingMusic','music'],['breathToggle','breath']])$(id).addEventListener('change',event=>updateSound(key,event.target.checked));
  $('settingVolume').addEventListener('change',event=>updateSound('volume',Number(event.target.value)));
  $('testVoice').addEventListener('click',()=>{if(!getState().settings.voice){toast('请先开启中文动作口令');return;}Sound.ensure();Sound.speak('放松肩膀，保持自然呼吸。准备好，我们一起慢慢开始。');});
  $('saveNickname').addEventListener('click',async()=>{
    const name=$('nickname').value.trim();if(!name||name.length>24){toast('昵称请填写 1—24 个字');return;}
    try{await change(state=>{state.name=name;});toast('昵称已保存');}catch(_){}
  });
  $('createGroup').addEventListener('click',async()=>{try{await change(state=>P.createGroup(state,$('groupName').value));$('groupName').value='';toast('圈子已创建，可以生成入圈口令');}catch(_){}});
  $('groupSelect').addEventListener('change',async event=>{try{await change(state=>{state.activeGroup=event.target.value;});}catch(_){}});
  $('leaveGroup').addEventListener('click',async()=>{try{await change(state=>{state.groups=state.groups.filter(group=>group.id!==state.activeGroup);state.activeGroup=state.groups[0]?.id||null;});toast('已退出本机保存的圈子');}catch(_){}});
  $('exportInvite').addEventListener('click',()=>showCode('invite'));$('exportReport').addEventListener('click',()=>showCode('report'));
  $('importFriend').addEventListener('click',async()=>{
    try{const message=await change(state=>P.importCode(state,$('friendCode').value));$('friendCode').value='';$('importStatus').textContent=message;}catch(error){$('importStatus').textContent=error.message;}
  });
  $('copyCode').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('exportCode').value);toast('口令已复制');}
    catch(_){$('exportCode').focus();$('exportCode').select();toast('请使用系统复制快捷键复制已选中的口令');}
  });
  window.addEventListener('qimai-start-practice',()=>{
    dismiss('settingsDialog');dismiss('resultDialog');
    startPractice(mode==='seated'?D.seated:D.lessons.slice(0,3));
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&session?.playing&&!session.saving){session.playing=false;resetHold();feedback=null;drawSkeleton(null);renderObservation();Sound.stop();$('pausePractice').textContent='继续练习';}
    if(!document.hidden)drawIdle();
  });
  window.addEventListener('pagehide',()=>{Sound.stop();stopCamera();cancelAnimationFrame(frameId);});
  window.addEventListener('resize',()=>{drawIdle();drawPreviews();});
  window.addEventListener('qimai-avatar-ready',()=>{drawIdle();drawPreviews();});
  window.addEventListener('qimai-progress',render);
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();navigate('home');});
  $('sources').innerHTML=D.sources.map(([label,url])=>'<p><a target="_blank" rel="noopener" href="'+url+'">'+label+' · 国家体育总局</a></p>').join('');
  try{
    await Store.init();render();setSoundSettings();
  }catch(error){
    $('fileWarning').textContent=error.message;$('fileWarning').hidden=false;
  }
})();
