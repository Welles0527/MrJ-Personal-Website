export type BackupSheet = { name: string; rows: string[][] };
const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
const column = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : column(Math.floor(index / 26) - 1) + column(index % 26);

// A lossless copy of every field accompanies the readable sheets. Cells stay below Excel's limit.
export function jsonRows(value: unknown): string[][] {
  const text = JSON.stringify(value);
  const rows = [['分段序号', 'JSON原文（按序拼接，可还原全部字段）']];
  for (let offset = 0; offset < text.length;) {
    let end = Math.min(offset + 30000, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    rows.push([String(rows.length), text.slice(offset, end)]); offset = end;
  }
  return rows;
}

export function createBackupWorkbook(sheets: BackupSheet[]): Uint8Array {
  const ns = 'http://schemas.openxmlformats.org';
  const files: [string, string][] = [
    ['[Content_Types].xml', `<Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<Relationships xmlns="${ns}/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`]
  ];
  for (const [index, sheet] of sheets.entries()) {
    if (sheet.rows.length > 1048576) throw new Error('数据超过 Excel 行数上限，未下载不完整备份');
    const rows = sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((text, c) => {
      if (text.length > 32767 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) throw new Error('字段无法无损写入 Excel，已停止导出');
      return `<c r="${column(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
    }).join('')}</row>`).join('');
    files.push([`xl/worksheets/sheet${index + 1}.xml`, `<worksheet xmlns="${ns}/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="16" width="60" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`]);
  }
  const encoder = new TextEncoder(), local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = encoder.encode(path), bytes = encoder.encode('<?xml version="1.0" encoding="UTF-8"?>' + content);
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    local.push(header, bytes);
    const directory = new Uint8Array(46 + name.length), d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x800, true);
    d.setUint32(16, crc, true); d.setUint32(20, bytes.length, true); d.setUint32(24, bytes.length, true); d.setUint16(28, name.length, true); d.setUint32(42, offset, true); directory.set(name, 46);
    central.push(directory); offset += header.length + bytes.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, central.reduce((n, part) => n + part.length, 0), true); e.setUint32(16, offset, true);
  const parts = [...local, ...central, end], result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let cursor = 0; for (const part of parts) { result.set(part, cursor); cursor += part.length; }
  return result;
}
