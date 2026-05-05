import * as fs from 'fs/promises';
import * as path from 'path';
import * as mammoth from 'mammoth';

// Simple test for Mammoth conversion
async function testMammoth() {
  try {
    console.log('Testing Mammoth conversion...');

    const inputPath = path.join(process.cwd(), 'uploads', 'test.docx');
    console.log(`Input file: ${inputPath}`);

    const docxBuffer = await fs.readFile(inputPath);
    console.log(`File size: ${docxBuffer.length} bytes`);

    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = result.value;

    console.log(`HTML length: ${htmlContent.length}`);
    console.log('Mammoth conversion successful');

    if (result.messages && result.messages.length > 0) {
      console.log('Messages:', result.messages);
    }

  } catch (error) {
    console.error('Mammoth test failed:', error.message);
  }
}

testMammoth();