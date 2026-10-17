import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer | string;
}

/**
 * Creates a valid PKZIP (.zip) buffer with zero external dependencies using Node.js built-in zlib.
 */
export function createZipArchive(files: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, "utf-8");
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf-8");
    const compressed = deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    // Local file header (30 bytes + filename)
    const local = Buffer.alloc(30 + filenameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // Local header signature
    local.writeUInt16LE(20, 4); // Version needed (2.0)
    local.writeUInt16LE(0x0800, 6); // Flags: UTF-8 filename (bit 11)
    local.writeUInt16LE(8, 8); // Compression method: Deflate
    local.writeUInt16LE(0, 10); // File mod time
    local.writeUInt16LE(0, 12); // File mod date
    local.writeUInt32LE(crc, 14); // CRC-32
    local.writeUInt32LE(compressed.length, 18); // Compressed size
    local.writeUInt32LE(dataBuf.length, 22); // Uncompressed size
    local.writeUInt16LE(filenameBuf.length, 26); // Filename length
    local.writeUInt16LE(0, 28); // Extra field length
    filenameBuf.copy(local, 30);
    localHeaders.push(local, compressed);

    // Central directory header (46 bytes + filename)
    const central = Buffer.alloc(46 + filenameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // Central header signature
    central.writeUInt16LE(20, 4); // Version made by
    central.writeUInt16LE(20, 6); // Version needed
    central.writeUInt16LE(0x0800, 8); // Flags: UTF-8
    central.writeUInt16LE(8, 10); // Compression method: Deflate
    central.writeUInt16LE(0, 12); // Mod time
    central.writeUInt16LE(0, 14); // Mod date
    central.writeUInt32LE(crc, 16); // CRC-32
    central.writeUInt32LE(compressed.length, 20); // Compressed size
    central.writeUInt32LE(dataBuf.length, 24); // Uncompressed size
    central.writeUInt16LE(filenameBuf.length, 28); // Filename length
    central.writeUInt16LE(0, 30); // Extra field length
    central.writeUInt16LE(0, 32); // File comment length
    central.writeUInt16LE(0, 34); // Disk number start
    central.writeUInt16LE(0, 36); // Internal file attributes
    central.writeUInt32LE(0, 38); // External file attributes
    central.writeUInt32LE(offset, 42); // Relative offset of local header
    filenameBuf.copy(central, 46);
    centralHeaders.push(central);

    offset += local.length + compressed.length;
  }

  const centralStart = offset;
  const centralTotalSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central dir starts
  eocd.writeUInt16LE(files.length, 8); // Number of central dir records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central dir records
  eocd.writeUInt32LE(centralTotalSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralStart, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // ZIP comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Escapes values for CSV in compliance with RFC 4180.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str: string;
  if (typeof val === "object") {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates an Excel-ready UTF-8 CSV string with BOM marker (\uFEFF) for immediate Turkish character rendering.
 */
export function generateVaultCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return `\uFEFF${headerLine}\r\n${dataLines.join("\r\n")}`;
}

/**
 * Generates a valid ECMA-376 Microsoft Excel (.xlsx) workbook buffer with zero external dependencies.
 */
export function generateVaultXlsx(
  headers: string[],
  rows: unknown[][],
  sheetName = "Vault",
): Buffer {
  function escapeXml(str: unknown): string {
    if (str === null || str === undefined) return "";
    let s: string;
    if (typeof str === "object") {
      s = JSON.stringify(str);
    } else {
      s = String(str);
    }
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function colName(n: number): string {
    let s = "";
    let temp = n;
    while (temp >= 0) {
      s = String.fromCharCode((temp % 26) + 65) + s;
      temp = Math.floor(temp / 26) - 1;
    }
    return s;
  }

  let sheetData = "";
  // Header row
  sheetData += '<row r="1">';
  headers.forEach((h, i) => {
    sheetData += `<c r="${colName(i)}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`;
  });
  sheetData += "</row>";

  // Data rows
  rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    sheetData += `<row r="${rowNum}">`;
    row.forEach((cell, cIdx) => {
      sheetData += `<c r="${colName(cIdx)}${rowNum}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
    });
    sheetData += "</row>";
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const safeSheetName = escapeXml(sheetName || "Vault");
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`;

  return createZipArchive([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels },
    { name: "xl/worksheets/sheet1.xml", data: worksheet },
  ]);
}

/**
 * Normalizes header strings across English and Turkish variations into canonical property keys.
 */
export function normalizeHeaderName(rawHeader: string): string {
  const clean = rawHeader
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (!clean) return "";

  if (
    clean.includes("changed") ||
    clean.includes("değiştirilme") ||
    clean.includes("degistirilme")
  ) {
    return "passwordChangedAt";
  }
  if (clean.includes("created") || clean.includes("oluşturulma") || clean.includes("olusturulma")) {
    return "createdAt";
  }
  if (
    ["password", "parola", "şifre", "sifre", "pass", "pwd", "secret"].some(
      (k) => clean === k || (clean.startsWith(k) && !clean.includes("changed")),
    )
  ) {
    return "password";
  }
  if (
    ["username", "kullanıcıadı", "kullaniciadi", "user", "email", "eposta", "login"].some(
      (k) => clean === k || clean.includes(k),
    )
  ) {
    return "username";
  }
  if (
    ["title", "başlık", "baslik", "name", "isim", "hesap", "account"].some(
      (k) => clean === k || clean.includes(k),
    )
  ) {
    return "title";
  }
  if (
    ["url", "link", "website", "web", "adres", "site"].some((k) => clean === k || clean.includes(k))
  ) {
    return "url";
  }
  if (["category", "kategori", "group", "grup"].some((k) => clean === k || clean.includes(k))) {
    return "category";
  }
  if (
    ["notes", "notlar", "not", "note", "description", "açıklama", "aciklama"].some(
      (k) => clean === k || clean.includes(k),
    )
  ) {
    return "notes";
  }
  if (
    ["tags", "etiketler", "etiket", "tag", "labels"].some((k) => clean === k || clean.includes(k))
  ) {
    return "tags";
  }
  return rawHeader.trim();
}

/**
 * Detects the most probable delimiter outside quotes for CSV parsing.
 */
function detectDelimiter(text: string): string {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (c === ",") commas++;
      else if (c === ";") semicolons++;
      else if (c === "\t") tabs++;
      else if (c === "\n" || c === "\r") {
        if (commas > 0 || semicolons > 0 || tabs > 0) break;
      }
    }
  }

  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/**
 * Robust RFC 4180 CSV parser supporting UTF-8 BOM, comma/semicolon/tab delimiters,
 * quoted newlines, escaped quotes, and automatic column name normalization.
 */
export function parseVaultCsv(csvContent: string): Array<Record<string, string>> {
  if (!csvContent || typeof csvContent !== "string") {
    return [];
  }

  let text = csvContent;
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < text.length && text[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out blank rows
  const cleanRows = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (cleanRows.length < 2) {
    return [];
  }

  const headers = cleanRows[0]!.map((h) => normalizeHeaderName(h));
  const results: Array<Record<string, string>> = [];

  for (let r = 1; r < cleanRows.length; r++) {
    const row = cleanRows[r]!;
    const item: Record<string, string> = {};
    let hasValue = false;

    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const val = (row[c] ?? "").trim();
      if (val) hasValue = true;
      item[key] = val;
    }

    if (hasValue) {
      results.push(item);
    }
  }

  return results;
}

function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colLetterToIndex(colStr: string): number {
  let index = 0;
  for (let i = 0; i < colStr.length; i++) {
    index = index * 26 + (colStr.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Zero-dependency ECMA-376 OpenXML (.xlsx) parser.
 * Reads worksheets with inline strings, shared strings (Excel & Google Sheets), and numeric cells.
 * Supports both PKZIP Central Directory (standard Excel/LibreOffice with data descriptors) and local headers.
 */
export function parseVaultXlsx(buf: Buffer): Array<Record<string, string>> {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 30) {
    return [];
  }

  const files: Record<string, string> = {};

  // 1. Try Central Directory unzipping (handles files created with data descriptors by Excel/LibreOffice)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = buf.readUInt16LE(eocdOffset + 10);
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);
    let curr = cdOffset;

    for (let e = 0; e < totalEntries && curr < eocdOffset; e++) {
      if (curr + 46 > buf.length || buf.readUInt32LE(curr) !== 0x02014b50) break;
      const method = buf.readUInt16LE(curr + 10);
      const compSize = buf.readUInt32LE(curr + 20);
      const fnLen = buf.readUInt16LE(curr + 28);
      const extraLen = buf.readUInt16LE(curr + 30);
      const commentLen = buf.readUInt16LE(curr + 32);
      const localOffset = buf.readUInt32LE(curr + 42);
      const fn = buf.toString("utf8", curr + 46, curr + 46 + fnLen);

      if (localOffset + 30 <= buf.length && buf.readUInt32LE(localOffset) === 0x04034b50) {
        const localFnLen = buf.readUInt16LE(localOffset + 26);
        const localExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localFnLen + localExtraLen;
        const compData = buf.subarray(dataStart, dataStart + compSize);
        try {
          const uncompData =
            method === 8 ? inflateRawSync(compData) : method === 0 ? compData : null;
          if (uncompData) {
            files[fn] = uncompData.toString("utf8");
          }
        } catch {
          // ignore corrupted entry
        }
      }

      curr += 46 + fnLen + extraLen + commentLen;
    }
  }

  // 2. Fallback to Local Headers if Central Directory yielded no files
  if (Object.keys(files).length === 0) {
    let offset = 0;
    while (offset < buf.length - 30) {
      const sig = buf.readUInt32LE(offset);
      if (sig !== 0x04034b50) break;
      const method = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const fnLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const fn = buf.toString("utf8", offset + 30, offset + 30 + fnLen);
      const dataStart = offset + 30 + fnLen + extraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      try {
        const uncompData = method === 8 ? inflateRawSync(compData) : method === 0 ? compData : null;
        if (uncompData) {
          files[fn] = uncompData.toString("utf8");
        }
      } catch {
        // Ignore corrupted entry
      }
      offset = dataStart + compSize;
    }
  }

  // 3. Parse sharedStrings.xml if present (used by Microsoft Excel & Google Sheets)
  const sharedStrings: string[] = [];
  const sstXml = files["xl/sharedStrings.xml"];
  if (sstXml) {
    const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m: RegExpExecArray | null;
    while ((m = siRegex.exec(sstXml)) !== null) {
      const textMatches = m[1]?.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) || [];
      const str = textMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("");
      sharedStrings.push(decodeXml(str));
    }
  }

  // 4. Locate worksheet (usually xl/worksheets/sheet1.xml)
  const sheetXmlKey =
    Object.keys(files).find((k) => k.startsWith("xl/worksheets/sheet")) ||
    "xl/worksheets/sheet1.xml";
  const sheetXml = files[sheetXmlKey];
  if (!sheetXml) return [];

  const rawRows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rMatch: RegExpExecArray | null;

  while ((rMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rMatch[1] ?? "";
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cMatch: RegExpExecArray | null;
    const rowValues: string[] = [];
    let naturalIndex = 0;

    while ((cMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cMatch[1] ?? cMatch[3] ?? "";
      const valContent = cMatch[2] ?? "";
      const isShared = attrs.includes('t="s"');
      const isInline = attrs.includes('t="inlineStr"');

      // Determine cell column index if 'r' attribute is present (e.g. r="C2")
      const rAttrMatch = attrs.match(/r="([A-Z]+)\d+"/);
      const targetColIndex = rAttrMatch?.[1] ? colLetterToIndex(rAttrMatch[1]) : naturalIndex;

      let cellVal: string;
      if (isInline) {
        const tMatch = valContent.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
        cellVal = tMatch ? decodeXml(tMatch[1] ?? "") : "";
      } else if (isShared) {
        const vMatch = valContent.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
        const idx = vMatch ? parseInt(vMatch[1] ?? "-1", 10) : -1;
        cellVal = idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx]! : "";
      } else {
        const vMatch = valContent.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
        cellVal = vMatch ? decodeXml(vMatch[1] ?? "") : "";
      }

      // Pad array if needed
      while (rowValues.length < targetColIndex) {
        rowValues.push("");
      }
      rowValues[targetColIndex] = cellVal.trim();
      naturalIndex = targetColIndex + 1;
    }

    if (rowValues.some((v) => v.length > 0)) {
      rawRows.push(rowValues);
    }
  }

  if (rawRows.length < 2) return [];

  const headers = rawRows[0]!.map((h) => normalizeHeaderName(h));
  const results: Array<Record<string, string>> = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r]!;
    const item: Record<string, string> = {};
    let hasValue = false;

    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      const val = (row[c] ?? "").trim();
      if (val) hasValue = true;
      item[key] = val;
    }

    if (hasValue) {
      results.push(item);
    }
  }

  return results;
}
