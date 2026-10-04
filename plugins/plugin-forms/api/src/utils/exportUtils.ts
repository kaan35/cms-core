import { crc32, deflateRawSync } from "node:zlib";

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
export function generateCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  // \uFEFF Byte Order Mark signals Excel to decode as UTF-8
  return `\uFEFF${headerLine}\r\n${dataLines.join("\r\n")}`;
}

/**
 * Generates a valid ECMA-376 Microsoft Excel (.xlsx) workbook buffer with zero external dependencies.
 */
export function generateXlsx(headers: string[], rows: unknown[][]): Buffer {
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

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Submissions" sheetId="1" r:id="rId1"/>
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
