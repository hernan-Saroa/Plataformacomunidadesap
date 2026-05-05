import * as fs from 'fs/promises';
import * as path from 'path';
import * as mammoth from 'mammoth';
import puppeteer from 'puppeteer';

// Test the full conversion process
async function testFullConversion() {
  try {
    console.log('Testing full DOCX to PDF conversion...');

    const inputPath = path.join(process.cwd(), 'uploads', 'test.docx');
    const outputPath = path.join(process.cwd(), 'uploads', 'test_output.pdf');

    console.log(`Input: ${inputPath}`);
    console.log(`Output: ${outputPath}`);

    // Read DOCX
    const docxBuffer = await fs.readFile(inputPath);
    console.log(`File size: ${docxBuffer.length} bytes`);

    // Convert to HTML
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = result.value;
    console.log(`HTML length: ${htmlContent.length}`);

    // Create full HTML
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

    // Launch Puppeteer
    console.log('Launching Puppeteer...');
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

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    // Generate PDF
    console.log('Generating PDF...');
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

    // Check result
    const stats = await fs.stat(outputPath);
    console.log(`PDF generated successfully! Size: ${stats.size} bytes`);

  } catch (error) {
    console.error('Full conversion test failed:', error.message);
    console.error(error.stack);
  }
}

testFullConversion();