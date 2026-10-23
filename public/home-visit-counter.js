(() => {
  if (!document.body.classList.contains('frontpage')) return;
  const counter = document.createElement('div');
  counter.className = 'home-visit-counter';
  counter.setAttribute('role','status');
  counter.setAttribute('aria-label','全站累计访问次数');
  counter.innerHTML = '<button type="button" class="visit-label" aria-label="访问计数设置">累计访问</button><span class="visit-wheels" aria-hidden="true"></span>';
  const style = document.createElement('style');
  style.textContent = `
    .home-visit-counter{position:absolute;top:24px;left:24px;z-index:51;display:flex;flex-direction:column;gap:4px;color:var(--foreground,#eee);font:10px/1.2 sans-serif;visibility:hidden}
    .visit-label{letter-spacing:.12em;opacity:.7;border:0;background:none;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer}
    .visit-settings{box-sizing:border-box;inset:0;margin:auto;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:24px;border:1px solid #786047;border-radius:18px;background:#191919;color:#eee;font:14px/1.7 sans-serif}
    .visit-settings::backdrop{background:#0009}
    html:has(.visit-settings[open]) .neon-cursor{display:none!important}
    html.custom-cursor-enabled .visit-settings,html.custom-cursor-enabled .visit-settings *{cursor:auto!important}
    html.custom-cursor-enabled .visit-settings label,html.custom-cursor-enabled .visit-settings input,html.custom-cursor-enabled .visit-settings button{cursor:pointer!important}
    .visit-settings{outline:none}.visit-settings h2{font-size:20px;margin:0 0 12px}.visit-settings p{color:#bbb}.visit-settings label{display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer}.visit-settings input{width:18px;height:18px;flex:0 0 18px;margin:0;accent-color:#ffbc80}
    .visit-settings button{margin-top:18px;padding:9px 18px;border:1px solid #786047;border-radius:10px;background:#30271e;color:#ffbc80;cursor:pointer}
    .visit-wheels{display:flex;gap:3px;padding:5px;border:1px solid #373737;border-radius:8px;background:linear-gradient(#090909,#282828);box-shadow:inset 0 2px 5px #000,0 1px 1px #ffffff25}
    .visit-wheel{position:relative;display:block;width:19px;height:28px;overflow:hidden;border-radius:4px;background:#151515;box-shadow:inset 0 1px 5px #000;color:#fff}
    .visit-wheel:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(#000c,transparent 34%,#ffffff12 50%,transparent 65%,#000c);border:1px solid #0009;border-radius:4px}
    .visit-reel{display:flex;flex-direction:column;transform:translateY(0);transition:transform 1.5s cubic-bezier(.18,.7,.25,1);will-change:transform}
    .visit-reel i{height:28px;flex:0 0 28px;display:grid;place-items:center;font:bold 23px/28px Arial,sans-serif;font-style:normal;text-shadow:0 2px 2px #000}
    @media(max-width:767px){.visit-wheels{padding:3px;gap:2px}.visit-wheel{width:14px;height:22px}.visit-reel i{height:22px;flex-basis:22px;font-size:18px;line-height:22px}.home-visit-counter{font-size:9px;gap:3px}.frontpage .universe-header:not(.projects-nav) .main-nav{justify-self:center;transform:scale(var(--visit-nav-scale,1));transform-origin:center bottom}}
    @media(prefers-reduced-motion:reduce){.visit-reel{transition:none}}
  `;
  document.head.append(style); document.body.append(counter);
  const ownerKey='magicj.visit.exclude', dayKey='magicj.visit.day';
  const settings=document.createElement('dialog');
  settings.className='visit-settings';
  settings.setAttribute('aria-labelledby','visit-settings-title');
  settings.innerHTML='<h2 id="visit-settings-title">访问计数设置</h2><p>同一浏览器每天只计一次（北京时间）。</p><label><input type="checkbox">本人访问不统计（仅此浏览器）</label><p class="visit-storage-note">清除浏览器数据或换浏览器后，需要重新设置。已有计数不会扣回。</p><form method="dialog"><button>完成</button></form>';
  document.body.append(settings);
  const excluded=settings.querySelector('input');
  function read(key){try{return localStorage.getItem(key);}catch{return null;}}
  function write(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}
  counter.querySelector('.visit-label').addEventListener('click',()=>{excluded.checked=read(ownerKey)==='1';settings.showModal();});
  excluded.addEventListener('change',()=>{
    if(!write(ownerKey,excluded.checked?'1':'0')){
      excluded.checked=false;
      settings.querySelector('.visit-storage-note').textContent='浏览器禁止保存设置，当前访问不会计数。请允许本站存储后再设置。';
    }
  });
  const wheels = counter.querySelector('.visit-wheels');
  function show(value) {
    const digits = value === null ? '----' : String(value).padStart(4,'0');
    wheels.replaceChildren();
    for (const [index,digit] of [...digits].entries()) {
      const wheel=document.createElement('span');wheel.className='visit-wheel';
      const reel=document.createElement('span');reel.className='visit-reel';
      const target=digit==='-'?0:10+Number(digit);
      for(let n=0;n<=target;n++){const face=document.createElement('i');face.textContent=digit==='-'?'—':String(n%10);reel.append(face);}
      reel.style.transitionDelay=`${index*70}ms`;wheel.append(reel);wheels.append(wheel);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{reel.style.transform=`translateY(-${target*wheel.clientHeight}px)`;}));
    }
    counter.setAttribute('aria-label',value===null?'累计访问次数暂不可用':`累计访问 ${value} 次`);
    align();
  }
  function align(){
    const intro=document.querySelector('.hero-intro'),nav=document.querySelector('#main-navigation');
    if(!intro||!nav)return;
    const p=intro.getBoundingClientRect();
    nav.style.setProperty('--visit-nav-scale','1');
    nav.style.removeProperty('scale');
    if(innerWidth<768)nav.style.transition='none';
    counter.style.left='0px';counter.style.top='0px';
    let scale=1;for(let el=counter;el;el=el.parentElement)scale*=Number.parseFloat(getComputedStyle(el).zoom)||1;
    const origin=counter.getBoundingClientRect();
    if(innerWidth<768 && !nav.closest('.projects-nav')){
      const available=innerWidth-2*(p.left+origin.width+8);
      nav.style.setProperty('--visit-nav-scale',String(Math.min(1,Math.max(.5,available/nav.getBoundingClientRect().width))));
      nav.style.setProperty('scale',nav.style.getPropertyValue('--visit-nav-scale'),'important');
    }
    const n=nav.getBoundingClientRect();
    counter.style.left=`${(p.left-origin.left)/scale}px`;counter.style.top=`${(n.bottom-origin.top-origin.height)/scale}px`;counter.style.visibility='visible';
  }
  show(null);
  const observer=new ResizeObserver(align);
  observer.observe(document.documentElement);
  document.fonts.ready.then(align);
  // Follow the existing entrance animation until the intro settles.
  let frames=0;function settle(){align();if(++frames<180)requestAnimationFrame(settle);}requestAnimationFrame(settle);
  window.addEventListener('resize',()=>{const value=counter.dataset.count;show(value===undefined?null:Number(value));});
  const local = ['localhost','127.0.0.1'].includes(location.hostname);
  async function loadCount(){
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    let method='GET';
    // Reserve before sending: a timed-out response may already have incremented.
    // If storage is blocked, read only rather than count every refresh.
    if(!local && read(ownerKey)!=='1' && read(dayKey)!==day && write(dayKey,day))method='POST';
    const response=await fetch('/officialwebsite/api/home-visits',{method,cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Unavailable');
    return response.json();
  }
  // Serialize visits from simultaneous tabs on browsers supporting Web Locks.
  (navigator.locks?navigator.locks.request('magicj.visit.daily',loadCount):loadCount())
    .then(data=>{if(!Number.isSafeInteger(data.count)||data.count<0)throw new Error('Invalid count');counter.dataset.count=String(data.count);show(data.count);counter.title='累计访问；同一浏览器每天计一次（北京时间）。点击累计访问可设置本人不统计。';})
    .catch(()=>{show(null);counter.title=local?'本地预览：云端计数接口尚未启用':'访问计数暂不可用';});
})();
