(() => {
  if (!document.body.classList.contains('frontpage')) return;
  const counter = document.createElement('div');
  counter.className = 'home-visit-counter';
  counter.setAttribute('role','status');
  counter.setAttribute('aria-label','全站累计访问次数');
  counter.innerHTML = '<span class="visit-label">累计访问</span><span class="visit-wheels" aria-hidden="true"></span>';
  const style = document.createElement('style');
  style.textContent = `
    .home-visit-counter{position:absolute;top:24px;left:24px;z-index:51;display:flex;flex-direction:column;gap:4px;color:var(--foreground,#eee);font:10px/1.2 sans-serif;visibility:hidden}
    .visit-label{letter-spacing:.12em;opacity:.7}
    .visit-wheels{display:flex;gap:3px;padding:5px;border:1px solid #373737;border-radius:8px;background:linear-gradient(#090909,#282828);box-shadow:inset 0 2px 5px #000,0 1px 1px #ffffff25}
    .visit-wheel{position:relative;display:block;width:19px;height:28px;overflow:hidden;border-radius:4px;background:#151515;box-shadow:inset 0 1px 5px #000;color:#fff}
    .visit-wheel:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(#000c,transparent 34%,#ffffff12 50%,transparent 65%,#000c);border:1px solid #0009;border-radius:4px}
    .visit-reel{display:flex;flex-direction:column;transform:translateY(0);transition:transform 1.5s cubic-bezier(.18,.7,.25,1);will-change:transform}
    .visit-reel i{height:28px;flex:0 0 28px;display:grid;place-items:center;font:bold 23px/28px Arial,sans-serif;font-style:normal;text-shadow:0 2px 2px #000}
    @media(max-width:767px){.visit-wheels{padding:3px;gap:2px}.visit-wheel{width:14px;height:22px}.visit-reel i{height:22px;flex-basis:22px;font-size:18px;line-height:22px}.home-visit-counter{font-size:9px;gap:3px}.frontpage .universe-header:not(.projects-nav) .main-nav{justify-self:center;transform:scale(var(--visit-nav-scale,1));transform-origin:center bottom}}
    @media(prefers-reduced-motion:reduce){.visit-reel{transition:none}}
  `;
  document.head.append(style); document.body.append(counter);
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
  // Local previews read only. Publishing enables one increment per page load.
  fetch('/officialwebsite/api/home-visits',{method:local?'GET':'POST',cache:'no-store',signal:AbortSignal.timeout(8000)})
    .then(async response=>{if(!response.ok)throw new Error('Unavailable');return response.json();})
    .then(data=>{if(!Number.isSafeInteger(data.count)||data.count<0)throw new Error('Invalid count');counter.dataset.count=String(data.count);show(data.count);counter.title='从计数功能启用时累计；每次打开或刷新首页计一次';})
    .catch(()=>{show(null);counter.title=local?'本地预览：云端计数接口尚未启用':'访问计数暂不可用';});
})();
