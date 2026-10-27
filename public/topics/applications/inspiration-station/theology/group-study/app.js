import { getCloudSession, getCloudDb, getRememberedSession, signInWithPassword, signOut } from '../../../../../../src/scripts/site-auth';
const $ = (selector) => document.querySelector(selector);
const KEY = 'magicj.group-study.v1';
let storageKey = KEY;
try { if(localStorage.getItem(`${KEY}:legacy-owner`))storageKey=`${KEY}:guest`; } catch { /* Persistence errors are reported by save(). */ }
let accountSession = null;
let syncTimer;
let syncing = false;
let epoch = 0;
let basePlans = [];
let baseRevision = 0;
let applyingCloud = false;
const uid = () => crypto.randomUUID();
const books = 'gen:创世记 exo:出埃及记 lev:利未记 num:民数记 deu:申命记 jos:约书亚记 jdg:士师记 rut:路得记 1sa:撒母耳记上 2sa:撒母耳记下 1ki:列王纪上 2ki:列王纪下 1ch:历代志上 2ch:历代志下 ezr:以斯拉记 neh:尼希米记 est:以斯帖记 job:约伯记 psa:诗篇 pro:箴言 ecc:传道书 sng:雅歌 isa:以赛亚书 jer:耶利米书 lam:耶利米哀歌 ezk:以西结书 dan:但以理书 hos:何西阿书 jol:约珥书 amo:阿摩司书 oba:俄巴底亚书 jon:约拿书 mic:弥迦书 nam:那鸿书 hab:哈巴谷书 zep:西番雅书 hag:哈该书 zec:撒迦利亚书 mal:玛拉基书 mat:马太福音 mrk:马可福音 luk:路加福音 jhn:约翰福音 act:使徒行传 rom:罗马书 1co:哥林多前书 2co:哥林多后书 gal:加拉太书 eph:以弗所书 php:腓立比书 col:歌罗西书 1th:帖撒罗尼迦前书 2th:帖撒罗尼迦后书 1ti:提摩太前书 2ti:提摩太后书 tit:提多书 phm:腓利门书 heb:希伯来书 jas:雅各书 1pe:彼得前书 2pe:彼得后书 1jn:约翰一书 2jn:约翰二书 3jn:约翰三书 jud:犹大书 rev:启示录'.split(' ').map(x => x.split(':'));
const bookNames = Object.fromEntries(books);
function newPlan() {
  return { id: uid(), title: '新的查经聚会', date: '', leader: '', goal: '', notes: '', followup: '', passages: [], resources: [],
    steps: [],
    questions: ['观察：这段经文中发生了什么？','理解：上下文怎样帮助我们理解这段经文？','应用：这周我可以如何回应？'].map(text=>({id:uid(),text,answer:'',focus:false})) };
}
const string = x => typeof x === 'string' && x.length <= 100000;
const safeUrl = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
function validPlan(p) {
  return p && ['id','title','date','leader','goal','notes','followup'].every(k=>string(p[k])) &&
    Array.isArray(p.steps) && p.steps.length <= 300 && p.steps.every(s=>s && ['id','title','content'].every(k=>string(s[k])) && Number.isFinite(s.minutes) && s.minutes >= 0 && s.minutes <= 600 && typeof s.focus==='boolean' && Array.isArray(s.highlights) && s.highlights.length<=100 && s.highlights.every(string)) &&
    Array.isArray(p.questions) && p.questions.length<=300 && p.questions.every(q=>q && ['id','text','answer'].every(k=>string(q[k])) && typeof q.focus==='boolean') &&
    Array.isArray(p.resources) && p.resources.length<=300 && p.resources.every(r=>r && ['id','title','type','url'].every(k=>string(r[k])) && safeUrl(r.url)) &&
    Array.isArray(p.passages) && p.passages.length<=300 && p.passages.every(p=>p && string(p.id) && bookNames[p.book] && Number.isInteger(p.chapter) && p.chapter>0 && p.chapter<=150 && Number.isInteger(p.start) && p.start>0 && Array.isArray(p.verses) && p.verses.length<=176 && p.verses.every(string) && Array.isArray(p.marked) && p.marked.every(n=>Number.isInteger(n) && n>=0 && n<p.verses.length));
}
let state = {version:1, active:'', plans:[]};
let storageBlocked = false;
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const data = JSON.parse(raw);
    if (data.version!==1 || !Array.isArray(data.plans) || !data.plans.length || !data.plans.every(validPlan)) throw new Error('invalid');
    state = data;
  }
} catch { storageBlocked = true; }
if (!state.plans.length) state.plans.push(newPlan());
if (!state.plans.some(p=>p.id===state.active)) state.active=state.plans[0].id;
const current = () => state.plans.find(p=>p.id===state.active);
let noticeTimer;
function notice(text) { $('#notice').textContent=text; clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>$('#notice').textContent='',5000); }
function save() {
  try {
    if(storageBlocked) throw new Error('blocked');
    localStorage.setItem(storageKey,JSON.stringify({...state, cloudBase: {plans:basePlans, revision:baseRevision}}));
    $('#save-state').textContent=`已保存在此浏览器 · ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`;
    $('#save-state').classList.remove('save-error');
  } catch { $('#save-state').textContent='本地保存不可用，请导出备份；已有存储未被覆盖。'; $('#save-state').classList.add('save-error'); }
  if(accountSession && !applyingCloud && !storageBlocked){clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncCloud(),1500);}
}
function node(tag, text, className) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(className)e.className=className; return e; }
function button(text, action) { const b=node('button',text); b.type='button'; b.addEventListener('click',action); return b; }
function field(tag, value, label, update) { const e=node(tag); e.value=value; e.setAttribute('aria-label',label); e.addEventListener('input',()=>{update(e.value);save();}); return e; }
function richEditor(value,label,update,getHighlights,setHighlights,placeholder='点击这里直接编辑…'){
  const root=node('div',undefined,'editor-block'), tools=node('div',undefined,'rich-tools edit-only');
  const editor=node('div',undefined,'rich-editor');
  editor.contentEditable=String(!document.body.classList.contains('present'));editor.setAttribute('role','textbox');editor.setAttribute('aria-label',label);editor.setAttribute('aria-multiline','true');editor.dataset.placeholder=placeholder;
  function paint(text){
    editor.replaceChildren();let cursor=0;
    const terms=(Array.isArray(getHighlights())?getHighlights():[]).filter(t=>typeof t==='string'&&t.length);
    while(cursor<text.length){
      let start=text.length,term='';for(const t of terms){const at=text.indexOf(t,cursor);if(at>=0&&at<start){start=at;term=t;}}
      editor.append(document.createTextNode(text.slice(cursor,start)));if(!term)break;
      editor.append(node('mark',term));cursor=start+term.length;
    }
  }
  paint(value);
  function capture(){const text=editor.innerText.replace(/\r\n/g,'\n');update(text);setHighlights([...new Set([...editor.querySelectorAll('mark')].map(m=>m.textContent).filter(Boolean))]);save();}
  editor.addEventListener('input',capture);
  editor.addEventListener('paste',event=>{
    event.preventDefault();const text=event.clipboardData?.getData('text/plain')||'';const selection=window.getSelection();if(!selection?.rangeCount)return;
    const range=selection.getRangeAt(0);if(!editor.contains(range.commonAncestorContainer))return;
    range.deleteContents();const inserted=document.createTextNode(text);range.insertNode(inserted);range.setStartAfter(inserted);range.collapse(true);selection.removeAllRanges();selection.addRange(range);capture();
  });
  editor.addEventListener('drop',event=>event.preventDefault());
  const highlight=button('高亮选中文字',()=>{
    const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed||!editor.contains(selection.getRangeAt(0).commonAncestorContainer))return notice('请先在这块内容中选中文字。');
    const text=selection.toString();if(!text.trim())return;
    const terms=Array.isArray(getHighlights())?getHighlights():[];setHighlights([...new Set([...terms,text])]);
    const content=editor.innerText.replace(/\r\n/g,'\n');update(content);const position=scrollY;paint(content);save();editor.focus({preventScroll:true});window.scrollTo(0,position);
  });
  // Keep the editor selection while using the formatting toolbar, including on touch screens.
  highlight.addEventListener('pointerdown',event=>event.preventDefault());
  const clear=button('清除高亮',()=>{
    const text=editor.innerText.replace(/\r\n/g,'\n'), position=scrollY, selection=window.getSelection();
    const offsets=selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)
      ? [[selection.anchorNode,selection.anchorOffset],[selection.focusNode,selection.focusOffset]].map(([node,offset])=>{const range=document.createRange();range.selectNodeContents(editor);range.setEnd(node,offset);return range.toString().length;}) : null;
    setHighlights([]);
    editor.querySelectorAll('mark').forEach(mark=>mark.replaceWith(...mark.childNodes));editor.normalize();
    update(text);save();
    if(offsets){
      const points=offsets.map(offset=>{const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(offset<=node.length)return [node,offset];offset-=node.length;}return [editor,editor.childNodes.length];});
      editor.focus({preventScroll:true});selection.setBaseAndExtent(...points.flat());
    }
    window.scrollTo(0,position);
  });
  clear.addEventListener('pointerdown',event=>event.preventDefault());tools.append(highlight,clear);root.append(tools,editor);return root;
}
function renderMetaEditors(){
  document.querySelectorAll('[data-meta-editor]').forEach(host=>{
    const key=host.dataset.metaEditor,p=current();
    host.replaceChildren(richEditor(p[key],host.dataset.label,v=>p[key]=v,()=>p.highlights?.[key]||[],v=>{p.highlights={...p.highlights,[key]:v};},host.dataset.placeholder));
  });
}
function moveQuestion(id,direction){
  const list=current().questions,index=list.findIndex(q=>q.id===id),target=index+direction;if(index<0||target<0||target>=list.length)return;
  [list[index],list[target]]=[list[target],list[index]];save();renderQuestions();
  [...document.querySelectorAll('.question')].find(c=>c.dataset.questionId===id)?.querySelector('.drag-handle').focus({preventScroll:true});
  notice(`问题已移至第 ${target+1} 位`);
}
let questionDragging=false;
function questionDrag(handle,card){
  handle.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();moveQuestion(card.dataset.questionId,event.key==='ArrowUp'?-1:1);}});
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();handle.setPointerCapture(event.pointerId);
    const startY=event.clientY;let moved=false,lastY=startY,frame;
    function move(e){if(e.pointerId!==event.pointerId)return;lastY=e.clientY;if(!moved&&Math.abs(lastY-startY)<6)return;moved=true;questionDragging=true;card.classList.add('is-dragging');
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.question');if(!target||target===card)return;
      const rect=target.getBoundingClientRect(),before=e.clientY>rect.top+rect.height/2?target.nextSibling:target;if(before!==card&&card.nextSibling!==before)$('#questions').insertBefore(card,before);
    }
    function scroll(){if(moved){if(lastY>innerHeight-60)window.scrollBy(0,14);else if(lastY<60)window.scrollBy(0,-14);}frame=requestAnimationFrame(scroll);}
    function finish(e){if(e.pointerId!==event.pointerId)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);cancelAnimationFrame(frame);card.classList.remove('is-dragging');questionDragging=false;
      if(moved&&e.type!=='pointercancel'){const byId=new Map(current().questions.map(q=>[q.id,q]));current().questions=[...$('#questions').children].map(c=>byId.get(c.dataset.questionId));save();notice('问题顺序已保存');}if(moved)renderQuestions();
    }
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);frame=requestAnimationFrame(scroll);
  });
}
function totals() { $('#total-time').textContent=`${current().steps.length} 个环节 · 共 ${current().steps.reduce((n,s)=>n+s.minutes,0)} 分钟`; }
function renderPlans() {
  $('#plans').replaceChildren(...state.plans.map(p=>{
    const b=button('',()=>{state.active=p.id;save();render();}); b.setAttribute('aria-current',String(p.id===state.active));
    b.append(node('span',p.title||'未命名聚会'),node('small',p.date||'日期待定'));return b;
  }));
}
function removeItem(list, item, renderList) {
  const index=list.indexOf(item); list.splice(index,1);save();renderList();totals();
  $('#notice').replaceChildren(node('span','已移除。 '),button('撤销',()=>{list.splice(index,0,item);save();render();$('#notice').replaceChildren();}));
  clearTimeout(noticeTimer);
}
function renderSteps() {
  $('#steps').replaceChildren(...current().steps.map((s,i)=>{
    const card=node('article',undefined,`step${s.focus?' focus':''}`), head=node('div',undefined,'step-head');
    const title=field('input',s.title,'环节名称',v=>s.title=v), minutes=field('input',s.minutes,'环节分钟数',v=>{s.minutes=Math.min(600,Math.max(0,Number(v)||0));totals();});minutes.type='number';minutes.min='0';minutes.max='600';minutes.title='分钟';
    head.append(node('span',String(i+1).padStart(2,'0'),'step-number'),title,minutes);
    const content=richEditor(s.content,'环节内容',v=>s.content=v,()=>s.highlights,v=>s.highlights=v);
    const tools=node('div',undefined,'tools edit-only');
    const up=button('↑ 上移',()=>{[current().steps[i-1],current().steps[i]]=[s,current().steps[i-1]];save();renderSteps();});up.disabled=i===0;
    const down=button('↓ 下移',()=>{[current().steps[i+1],current().steps[i]]=[s,current().steps[i+1]];save();renderSteps();});down.disabled=i===current().steps.length-1;
    const focus=button(s.focus?'★ 重点环节':'☆ 设为重点',()=>{s.focus=!s.focus;save();renderSteps();});focus.setAttribute('aria-pressed',String(s.focus));
    tools.append(up,down,focus,button('移除',()=>removeItem(current().steps,s,renderSteps)));
    card.append(head,content,tools);return card;
  })); totals();
}
function renderQuestions() {
  $('#questions').replaceChildren(...current().questions.map((q,i)=>{
    const card=node('article',undefined,`question${q.focus?' focus':''}`);
    card.dataset.questionId=q.id;
    const head=node('div',undefined,'section-head'), handle=button('⠿ 拖动排序',()=>{});handle.className='drag-handle edit-only';handle.setAttribute('aria-label',`拖动问题 ${i+1} 排序`);handle.title='拖动排序，也可聚焦后使用上下方向键';questionDrag(handle,card);
    head.append(node('span',`QUESTION ${String(i+1).padStart(2,'0')}`,'eyebrow'),handle);
    const question=richEditor(q.text,`问题 ${i+1}`,v=>q.text=v,()=>q.textHighlights||[],v=>q.textHighlights=v);
    const answer=richEditor(q.answer,`问题 ${i+1} 的讨论记录`,v=>q.answer=v,()=>q.answerHighlights||[],v=>q.answerHighlights=v,'记录组员的回应、不同观点和待查考的问题…');
    const tools=node('div',undefined,'tools edit-only');const focus=button(q.focus?'★ 重点问题':'☆ 设为重点',()=>{q.focus=!q.focus;save();renderQuestions();});focus.setAttribute('aria-pressed',String(q.focus));
    tools.append(focus,button('移除',()=>removeItem(current().questions,q,renderQuestions)));
    card.append(head,question,answer,tools);return card;
  }));
}
function renderResources() {
  $('#resource-list').replaceChildren(...current().resources.map(r=>{
    const card=node('article',undefined,'resource'), copy=node('div'),a=node('a',r.title+' ↗');a.href=safeUrl(r.url);a.target='_blank';a.rel='noopener noreferrer';copy.append(node('small',r.type),a);
    const remove=button('移除',()=>removeItem(current().resources,r,renderResources));remove.className='edit-only';card.append(copy,remove);return card;
  }));
  if(!current().resources.length)$('#resource-list').append(node('p','加入与本次经文相关的视频、背景文章或讨论资料。','empty'));
}
function renderPassages() {
  $('#passages').replaceChildren(...current().passages.map(p=>{
    const card=node('article',undefined,'passage'),head=node('div',undefined,'section-head');
    const a=node('a',`${bookNames[p.book]} ${p.chapter}:${p.start}–${p.start+p.verses.length-1} ↗`);a.href=`../?book=${p.book}&chapter=${p.chapter}&verse=${p.start}`;a.target='_blank';a.rel='noopener';
    const remove=button('移除',()=>removeItem(current().passages,p,renderPassages));remove.className='edit-only';head.append(a,remove);card.append(head);
    p.verses.forEach((text,i)=>{const row=node('p',undefined,'verse');const toggle=button(String(p.start+i),()=>{p.marked=p.marked.includes(i)?p.marked.filter(n=>n!==i):[...p.marked,i];save();renderPassages();});toggle.setAttribute('aria-label',`高亮第 ${p.start+i} 节`);toggle.setAttribute('aria-pressed',String(p.marked.includes(i)));row.append(toggle,node(p.marked.includes(i)?'mark':'span',text));card.append(row);});
    card.append(node('small','点击节号标记重点；点击经文标题阅读上下文。','muted'));return card;
  }));
  if(!current().passages.length)$('#passages').append(node('p','选择书卷、章节与范围，将经文加入本次查经。','empty'));
}
function render() { renderPlans();document.querySelectorAll('[data-meta]').forEach(e=>e.value=current()[e.dataset.meta]);renderMetaEditors();renderSteps();renderQuestions();renderResources();renderPassages(); }
document.querySelectorAll('textarea[data-meta]').forEach(original=>{
  const label=original.closest('label'), host=node('div');host.dataset.metaEditor=original.dataset.meta;host.dataset.label=label.firstChild.textContent.trim();host.dataset.placeholder=original.placeholder;
  // A label would activate the first formatting button when the editor is clicked, stealing keyboard focus.
  const container=node('div',undefined,label.className);container.classList.add('muted');container.append(...label.childNodes);label.replaceWith(container);
  original.replaceWith(host);
});
document.querySelectorAll('[data-meta]').forEach(e=>e.addEventListener('input',()=>{current()[e.dataset.meta]=e.value;save();if(['title','date'].includes(e.dataset.meta))renderPlans();}));
$('#new-plan').onclick=()=>{const p=newPlan();state.plans.unshift(p);state.active=p.id;save();render();$('#title').focus();};
$('#add-step').onclick=()=>{current().steps.push({id:uid(),title:'新的环节',minutes:5,content:'',highlights:[],focus:false});save();renderSteps();};
$('#add-question').onclick=()=>{current().questions.push({id:uid(),text:'',answer:'',focus:false});save();renderQuestions();$('#questions').lastElementChild.querySelector('.rich-editor').focus();};
$('#present').onclick=()=>{const on=document.body.classList.toggle('present');$('#present').textContent=on?'返回编辑':'带领模式';document.querySelectorAll('.rich-editor').forEach(e=>{e.contentEditable=String(!on);e.setAttribute('aria-readonly',String(on));});document.querySelectorAll('input').forEach(e=>e.readOnly=on);};
for(const [id,name] of books){const option=node('option',name);option.value=id;$('#book').append(option);}
let bible;
$('#scripture-form').onsubmit=async e=>{
  e.preventDefault();const plan=current(),book=$('#book').value,chapter=Number($('#chapter').value),start=Number($('#verse-start').value),end=Number($('#verse-end').value);
  $('#add-scripture').disabled=true;$('#scripture-status').textContent='正在读取经文…';
  try {
    if(!bible){const response=await fetch('/officialwebsite/data/bible/chi-cuv-simp.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('load');bible=await response.json();}
    const verses=bible.chapters[`${book}-${chapter}`];
    if(!Number.isInteger(start)||!Number.isInteger(end)||!verses||start<1||end<start||end>verses.length){$('#scripture-status').textContent='章节或节数范围无效，请核对后再加入。';return;}
    plan.passages.push({id:uid(),book,chapter,start,verses:verses.slice(start-1,end),marked:[]});save();renderPassages();$('#scripture-status').textContent=plan===current()?'经文已加入。':'经文已加入原查经计划。';
  }catch{$('#scripture-status').textContent='经文加载失败，请检查网络后再次点击“加入经文”。';}finally{$('#add-scripture').disabled=false;}
};
$('#resource-form').onsubmit=e=>{e.preventDefault();const url=safeUrl($('#resource-url').value);if(!url)return notice('仅支持 http 或 https 链接。');current().resources.push({id:uid(),type:$('#resource-type').value,title:$('#resource-title').value.trim()||'未命名资料',url});save();renderResources();e.target.reset();};
$('#export').onclick=async()=>{try{
  await assertCloudClean();
  const owner=await getCloudSession(); if(!owner)throw new Error('请登录后导出');
  const result=checkCloud(await getCloudDb().collection('officialWebsiteBibleReaderState').doc(owner.uid).get());
  const record=Array.isArray(result.data)?result.data[0]:result.data;
  if((await getCloudSession())?.uid!==owner.uid)throw new Error('账号已改变，已停止导出');
  if(!record?.groupStudy)throw new Error('云端暂无小组查经档案');
  const url=URL.createObjectURL(new Blob([JSON.stringify({...record.groupStudy,source:'cloud',accountUid:owner.uid,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));
  const a=node('a');a.href=url;a.download=`小组查经云端备份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}catch(error){notice(error.message||'云端导出失败');}};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
  if(file.size>10*1024*1024)throw new Error();const imported=JSON.parse(await file.text());
  if(imported.version!==1||!Array.isArray(imported.plans)||!imported.plans.length||imported.plans.length>100||!imported.plans.every(validPlan))throw new Error();
  const plans=imported.plans.map(p=>({...p,id:uid(),title:`${p.title}（导入）`}));state.plans.push(...plans);state.active=plans[0].id;save();render();notice('已导入为新计划，原有草稿保留。');
}catch{notice('备份格式无效或文件过大，未更改现有草稿。');}finally{e.target.value='';}};
const copy = value => JSON.parse(JSON.stringify(value));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const editing = () => questionDragging || (document.activeElement?.matches('input,textarea,select,[contenteditable="true"]') && !$('#login-dialog').open);
const blankPlan = p => p.title === '新的查经聚会' && !p.date && !p.leader && !p.goal && !p.notes && !p.followup && !p.steps.length && !p.resources.length && !p.passages.length && p.questions.length===3 && p.questions.every((q,i)=>!q.answer && !q.focus && q.text===['观察：这段经文中发生了什么？','理解：上下文怎样帮助我们理解这段经文？','应用：这周我可以如何回应？'][i]);
function syncStatus(text,error=false){$('#save-state').textContent=text;$('#save-state').classList.toggle('save-error',error);}
function rememberLocally(){applyingCloud=true;try{save();}finally{applyingCloud=false;}}
function backupLegacyDraft(){
  const raw=localStorage.getItem(KEY);
  if(raw && !localStorage.getItem(`${KEY}:legacy-original-backup`))localStorage.setItem(`${KEY}:legacy-original-backup`,raw);
  return raw;
}
async function migrateLegacyDraft(session,token){
  const owner=localStorage.getItem(`${KEY}:legacy-owner`);
  if(owner && owner!==session.uid)return;
  const raw=backupLegacyDraft();if(!raw)return;
  const source=JSON.parse(raw);
  if(source.version!==1||!Array.isArray(source.plans)||!source.plans.every(validPlan))throw new Error('原始草稿格式异常，原件已保留，请先导出备份');
  const incoming=source.plans.filter(p=>!blankPlan(p));if(!incoming.length)return;
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(token!==epoch)return;
  if(localStorage.getItem(KEY)!==raw)throw new Error('本机草稿仍在更新，稍后会重新合并');
  if(localStorage.getItem(`${KEY}:legacy-receipt:${session.uid}`)===digest)return;
  const merged=new Map(state.plans.filter(p=>!blankPlan(p)).map(p=>[p.id,p]));let active=state.active;
  for(const original of incoming){
    const existing=merged.get(original.id);
    const plan=existing&&!same(existing,original)?{...copy(original),id:uid(),title:`${original.title}（本机原始草稿）`}:copy(original);
    merged.set(plan.id,plan);if(source.active===original.id)active=plan.id;
  }
  const migrated={...state,plans:[...merged.values()],active};
  // Preserve the original key and immutable backup; claim ownership only after the account cache is saved.
  localStorage.setItem(storageKey,JSON.stringify({...migrated,cloudBase:{plans:basePlans,revision:baseRevision}}));
  localStorage.setItem(`${KEY}:legacy-owner`,session.uid);
  localStorage.setItem(`${KEY}:legacy-receipt:${session.uid}`,digest);
  state=migrated;const position=scrollY;render();window.scrollTo(0,position);
}
function switchAccount(session){
  clearTimeout(syncTimer);epoch++;accountSession=session;basePlans=[];baseRevision=0;storageBlocked=false;
  storageKey=session?`${KEY}:account:${session.uid}`:(localStorage.getItem(`${KEY}:legacy-owner`)?`${KEY}:guest`:KEY);
  let cached=null;
  try{
    const raw=localStorage.getItem(storageKey);
    if(raw){cached=JSON.parse(raw);if(!Array.isArray(cached.plans)||!cached.plans.length||!cached.plans.every(validPlan))throw new Error('invalid');}
    state=cached || {version:1,active:'',plans:[newPlan()]};
    if(cached?.cloudBase){if(!Array.isArray(cached.cloudBase.plans)||!cached.cloudBase.plans.every(validPlan)||!Number.isInteger(cached.cloudBase.revision)||cached.cloudBase.revision<0)throw new Error('invalid');basePlans=cached.cloudBase.plans;baseRevision=cached.cloudBase.revision;}
  }catch{storageBlocked=true;state={version:1,active:'',plans:[newPlan()]};syncStatus('账号本地草稿读取异常，已停止同步以保留原数据。',true);}
  if(!state.plans.some(p=>p.id===state.active))state.active=state.plans[0].id;
  const position=scrollY;render();window.scrollTo(0,position);
  $('#account-name').textContent=session?`已登录 · ${session.account}`:'未登录 · 登录后同步查经记录';$('#login-open').hidden=Boolean(session);$('#logout').hidden=!session;
  if(!storageBlocked)rememberLocally();
}
function checkCloud(result){if(!result || result.error || result.code)throw new Error(result?.error?.message||result?.message||'云端请求失败');return result;}
function mergePlans(remote,baseline=basePlans,conflictIds=new Map()){
  const merged=new Map(remote.map(p=>[p.id,p])), previous=new Map(baseline.map(p=>[p.id,p]));
  for(const local of state.plans){
    const base=previous.get(local.id),cloud=merged.get(local.id);
    if(same(local,base)||(!base && blankPlan(local)))continue;
    if(cloud && base && !same(cloud,base) && !same(local,cloud)){
      const conflict={...copy(local),id:uid(),title:`${local.title}（本地冲突副本）`};merged.set(conflict.id,conflict);conflictIds.set(local.id,conflict.id);
    }else if(cloud && !base && !same(local,cloud)){
      const conflict={...copy(local),id:uid(),title:`${local.title}（本地冲突副本）`};merged.set(conflict.id,conflict);conflictIds.set(local.id,conflict.id);
    }else merged.set(local.id,local);
  }
  return [...merged.values()];
}
async function syncCloud(){
  if(syncing || !navigator.onLine)return;
  syncing=true;
  syncStatus('正在同步…');
  let token=epoch;
  try{
    const session=await getCloudSession();
    if(token!==epoch)return;
    if(session?.uid!==accountSession?.uid){switchAccount(session);token=epoch;}
    if(!session){$('#account-name').textContent='未登录 · 登录后同步查经记录';syncStatus('未登录 · 草稿保存在此浏览器');return;}
    $('#account-name').textContent=`已登录 · ${session.account}`;
    $('#login-open').hidden=true;$('#login-open').textContent='登录账号';
    if(storageBlocked)return;
    await migrateLegacyDraft(session,token);if(token!==epoch)return;
    const owner=session.uid, collection=getCloudDb().collection('officialWebsiteBibleReaderState');
    const result=checkCloud(await collection.doc(owner).get());if(token!==epoch)return;
    const record=Array.isArray(result.data)?result.data[0]:result.data;
    if(record && ((record.ownerId && record.ownerId!==owner)||(record._openid && record._openid!==owner)))throw new Error('云端记录所属账号异常');
    const remote=record?.groupStudy?.plans || [];
    if((record?.groupStudy && record.groupStudy.version!==1)||!Array.isArray(remote)||!remote.every(validPlan))throw new Error('云端查经数据格式异常，已保留本地草稿');
    const revision=record?.groupStudyRevision ?? 0;
    if(!Number.isInteger(revision)||revision<0)throw new Error('云端版本异常');
    const observed=copy(state.plans), conflictIds=new Map(), merged=copy(mergePlans(remote,basePlans,conflictIds));
    const changed=!same(merged,state.plans) && !(merged.length===0 && state.plans.every(blankPlan));
    if(changed && editing()){syncStatus('云端有更新，结束当前输入后自动同步');return;}
    if(!same(merged,remote)){
      const payload={groupStudy:{version:1,plans:copy(merged)},groupStudyRevision:revision+1};
      if(new TextEncoder().encode(JSON.stringify(payload)).length>500000)throw new Error('查经记录超过单次同步容量，请先导出备份');
      const actual=await getCloudSession();if(token!==epoch||actual?.uid!==owner)return;
      if(record){
        const expected=record.groupStudyRevision===undefined?getCloudDb().command.exists(false):revision;
        const updated=checkCloud(await collection.where({_id:owner,groupStudyRevision:expected}).update(payload));
        if((updated.updated??updated.data?.updated)!==1)throw new Error('其他设备刚更新，将自动重试并保留冲突副本');
      }else{
        const now=new Date().toISOString();
        checkCloud(await collection.add({_id:owner,ownerId:owner,account:session.account,lastRead:{book:'gen',chapter:1,updatedAt:now},bookmarks:[],notes:[],readVerses:[],bookStatuses:{},updatedAt:now,...payload}));
      }
      if(token!==epoch)return;
      // Verify the committed version before marking this browser clean.
      const verified=checkCloud(await collection.doc(owner).get());if(token!==epoch)return;
      const saved=Array.isArray(verified.data)?verified.data[0]:verified.data;
      if(saved?.groupStudyRevision!==revision+1||!same(saved?.groupStudy,payload.groupStudy))throw new Error('云端保存后核验失败，将自动重试');
      baseRevision=revision+1;
    }else baseRevision=revision;
    if(token!==epoch)return;
    if(changed && editing()){syncStatus('云端有更新，结束当前输入后自动同步');return;}
    // A pending request must never replace text typed after the request started.
    const latestMerged=mergePlans(merged,observed,conflictIds);
    basePlans=copy(merged);
    if(changed && !editing()){
      const position=scrollY;state.plans=latestMerged.length?latestMerged:[newPlan()];
      // Keep the user's edited version visible instead of switching back to the conflicting cloud version.
      if(conflictIds.has(state.active))state.active=conflictIds.get(state.active);
      if(!state.plans.some(p=>p.id===state.active))state.active=state.plans[0].id;
      render();window.scrollTo(0,position);
    }
    rememberLocally();
    if(!same(state.plans.filter(p=>!blankPlan(p)),basePlans.filter(p=>!blankPlan(p)))){syncStatus('已保存本地，继续同步最新编辑…');clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncCloud(),1500);}
    else syncStatus(`已保存到账号云端 · ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`);
  }catch(error){if(token!==epoch)return;if(error?.code==='SITE_AUTH_REQUIRED'){$('#login-open').hidden=false;$('#login-open').textContent='重新登录';$('#account-name').textContent=`需要重新登录${accountSession?.account?` · ${accountSession.account}`:''}`;}syncStatus(`同步暂不可用，本地编辑已保留。${error instanceof Error?error.message:''}`,true);}
  finally{syncing=false;}
}
$('#login-open').onclick=()=>$('#login-dialog').showModal();
$('#login-cancel').onclick=()=>$('#login-dialog').close();
$('#login-form').onsubmit=async event=>{event.preventDefault();$('#login-submit').disabled=true;$('#login-error').textContent='';try{await signInWithPassword($('#login-email').value.trim(),$('#login-password').value);$('#login-password').value='';$('#login-dialog').close();await syncCloud();}catch(error){$('#login-error').textContent=error instanceof Error?error.message:'登录失败，请重试';}finally{$('#login-submit').disabled=false;}};
$('#logout').onclick=async()=>{epoch++;clearTimeout(syncTimer);try{await signOut();switchAccount(null);syncStatus('已退出账号，账号草稿已保留在本机');}catch{syncStatus('退出未完成，请重试',true);}};
$('#sync-now').onclick=()=>void syncCloud();
window.addEventListener('site-auth-change',()=>{epoch++;clearTimeout(syncTimer);if(!syncing)void syncCloud();else syncTimer=setTimeout(()=>void syncCloud(),500);});
window.addEventListener('online',()=>void syncCloud());
window.addEventListener('offline',()=>syncStatus('当前离线，编辑保存在此浏览器，联网后自动同步'));
window.addEventListener('focus',()=>void syncCloud());
document.addEventListener('focusout',()=>setTimeout(()=>{if(!editing())void syncCloud();},0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void syncCloud();});
setInterval(()=>{if(document.visibilityState==='visible')void syncCloud();},30000);
window.addEventListener('storage',e=>{if(e.key===storageKey){storageBlocked=true;syncStatus('另一个标签页已更新草稿。请先导出当前编辑，再刷新载入最新版本。',true);}if(e.key==='mywebsite.site-auth-session.v1'){epoch++;clearTimeout(syncTimer);syncTimer=setTimeout(()=>void syncCloud(),300);}});
const tabLinks=[...document.querySelectorAll('.tabs a')];
function activateTab(id,scroll=false){
  const selected=tabLinks.some(a=>a.hash===`#${id}`)?id:'overview';
  for(const a of tabLinks){const key=a.hash.slice(1),panel=document.getElementById(key);a.id=`tab-${key}`;a.setAttribute('role','tab');a.setAttribute('aria-controls',key);a.setAttribute('aria-selected',String(key===selected));a.tabIndex=key===selected?0:-1;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',a.id);panel.hidden=key!==selected;}
  if(scroll)window.scrollTo(0,$('.tabs').getBoundingClientRect().top+scrollY);
}
tabLinks.forEach((a,i)=>{
  a.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',a.hash);activateTab(a.hash.slice(1),true);});
  a.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(i+1)%tabLinks.length;if(event.key==='ArrowLeft')target=(i+tabLinks.length-1)%tabLinks.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabLinks.length-1;if(target!==undefined){event.preventDefault();tabLinks[target].click();tabLinks[target].focus({preventScroll:true});}});
});
window.addEventListener('hashchange',()=>activateTab(location.hash.slice(1)));
activateTab(location.hash.slice(1));
// The remembered identity selects only an offline cache; cloud requests still require getCloudSession().
try{backupLegacyDraft();}catch{storageBlocked=true;syncStatus('原始草稿备份未成功，请先导出；已停止覆盖和同步。',true);}
const remembered=getRememberedSession();
if(remembered)switchAccount(remembered);
render();rememberLocally();void syncCloud();

async function assertCloudClean(){
  if(syncing||storageBlocked||!same(state.plans.filter(p=>!blankPlan(p)),basePlans.filter(p=>!blankPlan(p))))throw new Error('有尚未保存到云端的查经编辑，请先同步');
}
function registerGroupAccount(){window.MagicJAccount?.register({beforeLeave:assertCloudClean,sync:async()=>{await syncCloud();await assertCloudClean();if($('#save-state').classList.contains('save-error'))throw new Error($('#save-state').textContent);}});}
window.addEventListener('magicj-account-ready',registerGroupAccount);registerGroupAccount();
