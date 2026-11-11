// Montar este archivo de solo lectura como /check.cjs en la imagen del chatbot.
const assert = require('node:assert/strict');
require('/app/node_modules/reflect-metadata');
const { OllamaService } = require('/app/dist/modules/knowledge/ollama.service');
const { DocumentReaderService } = require('/app/dist/modules/knowledge/document-reader.service');
const config = { get: (key) => process.env[key] };
(async () => {
  const ai = await new OllamaService(config).diagnostic();
  assert.equal(ai.available, true); assert.equal(ai.model, 'qwen3.5:9b');
  const content = 'BT /F1 12 Tf 20 100 Td (Documento ficticio del contenedor: prueba de lectura PDF.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const text = await new DocumentReaderService(config).pdfText(Buffer.from(pdf));
  assert(text.includes('Documento ficticio del contenedor'));
  console.log(JSON.stringify({ ok: true, ai, pdfParser: 'isolated-process', sqlQueried: false, modelLoaded: false }));
})().catch((error) => { console.error(JSON.stringify({ ok: false, code: error.code || error.message })); process.exitCode = 1; });
