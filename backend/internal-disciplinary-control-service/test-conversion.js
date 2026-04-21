import * as fs from 'fs/promises';
import * as path from 'path';
import * as mammoth from 'mammoth';
import puppeteer from 'puppeteer';

// Script de prueba para verificar la conversión
async function testConversion() {
  try {
    console.log('🚀 Iniciando prueba de conversión...');

    // Buscar un archivo .docx en la carpeta uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir);
    const docxFiles = files.filter(f => f.endsWith('.docx'));

    if (docxFiles.length === 0) {
      console.log('❌ No se encontraron archivos .docx en uploads');
      return;
    }

    const testFile = docxFiles[0];
    const inputPath = path.join(uploadsDir, testFile);
    const outputPath = path.join(uploadsDir, 'test_output.pdf');

    console.log(`📄 Procesando archivo: ${testFile}`);
    console.log(`📂 Input: ${inputPath}`);
    console.log(`📂 Output: ${outputPath}`);

    // Leer el archivo DOCX
    console.log('📖 Leyendo archivo DOCX...');
    const docxBuffer = await fs.readFile(inputPath);
    console.log(`📏 Tamaño del archivo: ${docxBuffer.length} bytes`);

    // Convertir DOCX a HTML usando Mammoth
    console.log('🔄 Convirtiendo DOCX a HTML...');
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = result.value;

    if (result.messages && result.messages.length > 0) {
      console.log('⚠️  Mensajes de conversión:', result.messages);
    }

    console.log(`📝 Longitud del HTML: ${htmlContent.length} caracteres`);

    // Crear HTML completo con estilos básicos
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            margin: 2cm;
          }
          .mammoth-style-wrapper {
            max-width: 100%;
          }
          p { margin: 0 0 10pt 0; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 4pt; }
        </style>
      </head>
      <body>
        <div class="mammoth-style-wrapper">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    // Convertir HTML a PDF usando puppeteer
    console.log('🌐 Lanzando Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    console.log('📄 Creando página y configurando contenido...');
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    // Generar PDF
    console.log('📋 Generando PDF...');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      }
    });

    await browser.close();

    console.log('✅ ¡Conversión exitosa!');
    console.log(`📄 PDF generado en: ${outputPath}`);

    // Verificar que el archivo se creó
    const stats = await fs.stat(outputPath);
    console.log(`📏 Tamaño del PDF: ${stats.size} bytes`);

  } catch (error) {
    console.error('❌ Error en la conversión:', error);
  }
}

testConversion();