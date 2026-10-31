/* Local checklist import/export. No workbook content is sent to a third party. */
window.CareFiles = (() => {
  const xml = text => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw Error('表格 XML 无法读取');
    return doc;
  };
  const nodes = (parent, name) => [...parent.getElementsByTagNameNS('*', name)];
  async function xlsx(file) {
    if (file.size > 2 * 1024 * 1024) throw Error('清单 Excel 最大 2 MB');
    const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer), entries = new Map();
    let end = bytes.length - 22;
    for (; end >= Math.max(0, bytes.length - 65557); end--) if (view.getUint32(end, true) === 0x06054b50) break;
    if (end < Math.max(0, bytes.length - 65557)) throw Error('请选择有效的 .xlsx 文件');
    let pos = view.getUint32(end + 16, true), total = 0;
    const count = view.getUint16(end + 10, true);
    if (count > 1000) throw Error('表格文件过于复杂');
    for (let i = 0; i < count; i++) {
      if (view.getUint32(pos, true) !== 0x02014b50) throw Error('Excel 文件结构无效');
      const method = view.getUint16(pos + 10, true), size = view.getUint32(pos + 20, true), length = view.getUint32(pos + 24, true);
      const n = view.getUint16(pos + 28, true), name = new TextDecoder().decode(bytes.slice(pos + 46, pos + 46 + n));
      total += length;
      if (total > 8 * 1024 * 1024 || view.getUint16(pos + 8, true) & 1) throw Error('不支持加密或过大的 Excel');
      entries.set(name, { method, size, length, offset: view.getUint32(pos + 42, true) });
      pos += 46 + n + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
    }
    async function read(name) {
      const e = entries.get(name); if (!e) throw Error('Excel 缺少工作表');
      const start = e.offset + 30 + view.getUint16(e.offset + 26, true) + view.getUint16(e.offset + 28, true);
      let data = bytes.slice(start, start + e.size);
      if (e.method === 8) {
        const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const parts = []; let size = 0;
        while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > e.length || size > 8 * 1024 * 1024) { await reader.cancel(); throw Error('Excel 解压大小异常'); } parts.push(part.value); }
        data = new Uint8Array(await new Blob(parts).arrayBuffer());
      } else if (e.method !== 0) throw Error('不支持此 Excel 压缩格式');
      if (data.length !== e.length) throw Error('Excel 内容不完整');
      return xml(new TextDecoder().decode(data));
    }
    const strings = entries.has('xl/sharedStrings.xml') ? nodes(await read('xl/sharedStrings.xml'), 'si').map(n => nodes(n, 't').map(t => t.textContent).join('')) : [];
    const book = await read('xl/workbook.xml'), relations = await read('xl/_rels/workbook.xml.rels');
    const sheet = nodes(book, 'sheet')[0], rel = sheet?.getAttribute('r:id');
    const target = nodes(relations, 'Relationship').find(r => r.getAttribute('Id') === rel)?.getAttribute('Target');
    const path = target?.startsWith('/') ? target.slice(1) : 'xl/' + target;
    const rows = nodes(await read(path), 'row').map(row => {
      const result = [];
      for (const c of nodes(row, 'c')) {
        const index = (c.getAttribute('r')?.match(/^[A-Z]+/)?.[0] || 'A').split('').reduce((n, s) => n * 26 + s.charCodeAt(0) - 64, 0) - 1;
        if (index > 50) continue;
        const value = nodes(c, 'v')[0]?.textContent || '';
        result[index] = c.getAttribute('t') === 's' ? strings[Number(value)] || '' : c.getAttribute('t') === 'inlineStr' ? nodes(c, 't').map(t => t.textContent).join('') : value;
      }
      return result;
    });
    return table(rows);
  }
  function table(rows) {
    const header = rows.findIndex(r => r.some(c => /物品或事项|物品名称|事项名称/.test(c)));
    if (header < 0) throw Error('需要“类别、物品或事项、准备状态”表头');
    const h = rows[header], name = h.findIndex(c => /物品或事项|物品名称|事项名称/.test(c)), category = h.findIndex(c => /类别|分类/.test(c)), status = h.findIndex(c => /准备状态|状态/.test(c));
    const items = rows.slice(header + 1).filter(r => String(r[name] || '').trim()).map(r => ({ id: crypto.randomUUID(), category: String(r[category] || '').trim(), name: String(r[name]).trim(), ready: /^(已准备|已完成|完成|✓|☑|TRUE|true|1)$/.test(String(r[status] || '').trim()), note: String(r[status] || '').includes('待确认') ? '待确认' : '' }));
    if (!items.length || items.length > 200 || items.some(r => r.name.length > 200 || r.category.length > 50)) throw Error('清单须为 1–200 项，物品名称不超过 200 字');
    return items;
  }
  function csv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; } else if (!quoted && (c === ',' || c === '\n')) { row.push(cell.replace(/\r$/, '')); cell = ''; if (c === '\n') { rows.push(row); row = []; } } else cell += c; }
    row.push(cell); rows.push(row); return table(rows);
  }
  const safe = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mobileHTML(items, title) {
    const data = JSON.stringify({ title, items: items.map(x => ({ ...x, ready: false })) }).replace(/</g, '\\u003c');
    return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>住院物品清单</title><style>body{font:16px system-ui;background:#f3f5f0;color:#26332c;max-width:720px;margin:24px auto;padding:16px}h1{font-size:24px}label{display:flex;gap:14px;background:white;border-radius:14px;margin:8px 0;padding:16px;align-items:center}input{width:23px;height:23px;accent-color:#6d9746}small{display:block;color:#6c7870}button{padding:12px;border:0;border-radius:10px;background:#ceefa1;margin:6px 8px 6px 0;font:inherit}p{line-height:1.6}</style><h1>${safe(title)}</h1><p>勾选后自动尝试保存在此浏览器。离开前点击“保存已勾选文件”；手机文件预览若不能操作，请用支持脚本的浏览器打开。此文件不自动同步家安账号。</p><div id="status" role="status"></div><div id="list"></div><button id="save">保存已勾选文件</button><button id="progress">导出进度供家安导入</button><script id="checklist-data" type="application/json">${data}</script><script>
const data=JSON.parse(document.getElementById('checklist-data').textContent), key='jiaan-checklist-'+data.items.map(x=>x.id).join('|');
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved)data.items.forEach(x=>x.ready=Boolean(saved[x.id]));}catch{}
function sync(){document.getElementById('checklist-data').textContent=JSON.stringify(data).replace(/</g,'\\u003c');try{localStorage.setItem(key,JSON.stringify(Object.fromEntries(data.items.map(x=>[x.id,x.ready]))));document.getElementById('status').textContent='已勾选 '+data.items.filter(x=>x.ready).length+' / '+data.items.length;}catch{document.getElementById('status').textContent='此环境不能自动保存，请点击保存已勾选文件。';}}
data.items.forEach(item=>{const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span'),small=document.createElement('small');box.type='checkbox';box.checked=item.ready;text.textContent=item.name;small.textContent=item.category+(item.note?' · '+item.note:'');text.append(small);box.onchange=()=>{item.ready=box.checked;sync();};label.append(box,text);document.getElementById('list').append(label);});sync();
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
document.getElementById('save').onclick=()=>{sync();const copy=document.documentElement.cloneNode(true);copy.querySelector('#list').replaceChildren();copy.querySelector('#status').textContent='';save(new Blob(['<!doctype html>'+copy.outerHTML],{type:'text/html'}),'住院清单_已勾选.html');};
document.getElementById('progress').onclick=()=>save(new Blob([JSON.stringify({format:'jiaan-checklist',items:data.items})],{type:'application/json'}),'住院清单_进度.json');
<\/script></html>`;
  }
  return { xlsx, csv, mobileHTML };
})();
