const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      errors.push(`[Console Warn] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[Page Error] ${error.message}`);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    errors.push(`[Navigation Error] ${err.message}`);
  }

  if (errors.length === 0) {
    console.log('No console errors found.');
  } else {
    console.log('--- CONSOLE ERRORS ---');
    errors.forEach(e => console.log(e));
  }

  await browser.close();
})();
