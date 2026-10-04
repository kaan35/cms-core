import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createZipArchive, escapeCsvCell, generateCsv, generateXlsx } from "./exportUtils.js";

describe("exportUtils", () => {
  describe("escapeCsvCell", () => {
    it("escapes null, undefined, strings, numbers, objects and quotes", () => {
      assert.equal(escapeCsvCell(null), '""');
      assert.equal(escapeCsvCell(undefined), '""');
      assert.equal(escapeCsvCell(123), '"123"');
      assert.equal(escapeCsvCell(true), '"true"');
      assert.equal(escapeCsvCell("Hello, World"), '"Hello, World"');
      assert.equal(escapeCsvCell('Hello "World"'), '"Hello ""World"""');
      assert.equal(escapeCsvCell({ a: 1 }), '"{""a"":1}"');
    });
  });

  describe("generateCsv", () => {
    it("includes UTF-8 BOM and formats CSV with CRLF", () => {
      const headers = ["Ad Soyad", "E-posta", "Şehir"];
      const rows = [
        ["Kaan Özel", "kaan@example.com", "İstanbul"],
        ["Çağrı Şahin", "cagri@example.com", "İzmir"],
      ];

      const csv = generateCsv(headers, rows);

      // Verify UTF-8 BOM prefix
      assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM marker");

      // Verify header and rows
      const lines = csv.slice(1).split("\r\n");
      assert.equal(lines.length, 3);
      assert.equal(lines[0], '"Ad Soyad","E-posta","Şehir"');
      assert.equal(lines[1], '"Kaan Özel","kaan@example.com","İstanbul"');
      assert.equal(lines[2], '"Çağrı Şahin","cagri@example.com","İzmir"');
    });
  });

  describe("createZipArchive & generateXlsx", () => {
    it("creates a valid ZIP archive buffer with PK signatures", () => {
      const zip = createZipArchive([
        { name: "test.txt", data: "Hello World" },
        { name: "folder/test2.txt", data: Buffer.from("Binary data") },
      ]);

      assert.ok(Buffer.isBuffer(zip));
      assert.ok(zip.length > 50);

      // Verify ZIP local header signature 0x04034b50 (PK\x03\x04)
      assert.equal(zip.readUInt32LE(0), 0x04034b50);

      // Verify End of Central Directory signature 0x06054b50 (PK\x05\x06) near the end
      const eocdOffset = zip.length - 22;
      assert.equal(zip.readUInt32LE(eocdOffset), 0x06054b50);
    });

    it("generates a valid ECMA-376 OpenXML (.xlsx) buffer with Turkish characters", () => {
      const headers = ["İsim", "Mesaj", "Tarih"];
      const rows = [
        ["Şükrü Dağ", "Görüşmek üzere, teşekkürler & iyi çalışmalar <test>", "2026-09-27"],
      ];

      const xlsxBuffer = generateXlsx(headers, rows);

      assert.ok(Buffer.isBuffer(xlsxBuffer));
      assert.ok(xlsxBuffer.length > 200);

      // Must start with PK ZIP signature
      assert.equal(xlsxBuffer.readUInt32LE(0), 0x04034b50);
    });
  });
});
