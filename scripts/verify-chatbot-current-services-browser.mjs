// Prueba local de lectura: no envía formularios ni modifica documentos de Isolución.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin = 'http://localhost:3000';
const question = 'donde puedo solicitar un certificado de titulos academicos?';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const landing = await page.goto(origin, { waitUntil: 'networkidle2' });
  assert.equal(landing.status(), 200);
  const serviceName = await page.$$eval('h3', (items) => items.map((item) => item.textContent.trim())
    .find((name) => name === 'Verificación de títulos'));
  assert.equal(serviceName, 'Verificación de títulos');
  await page.waitForSelector('.esap-chatbot-widget__launcher');
  await page.click('.esap-chatbot-widget__launcher');
  const input = 'input[aria-label="Mensaje para el asistente"]';
  await page.waitForSelector(input);
  await page.type(input, question);
  const started = performance.now();
  await page.click('.esap-chatbot-widget__panel button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('[role="log"] a[href="/certificacion-titulos-graduados"]'), { timeout: 4000 });
  const elapsedMs = Math.round(performance.now() - started);
  assert(elapsedMs < 4000, `La respuesta tardó ${elapsedMs} ms`);
  const answer = await page.$eval('[role="log"]', (log) => log.textContent);
  assert(answer.includes('Servicios → ' + serviceName));
  assert(!answer.includes('Certificados de Graduados'));
  assert(!answer.includes('La IA no pudo redactar'));
  await fs.mkdir('.local', { recursive: true });
  await page.screenshot({ path: '.local/chatbot-current-services.png', fullPage: false });
  const link = await page.$eval('[role="log"] a', (item) => item.href);
  assert.equal(link, origin + '/certificacion-titulos-graduados');
  const form = await browser.newPage();
  const response = await form.goto(link, { waitUntil: 'networkidle2' });
  assert.equal(response.status(), 200);
  await form.waitForSelector('#graduateDocument');
  const heading = await form.$eval('h1', (item) => item.textContent);
  assert(heading.includes(serviceName));
  console.log(JSON.stringify({ serviceName, elapsedMs, link, heading, formSubmitted: false,
    screenshot: '.local/chatbot-current-services.png' }));
} finally { await browser.close(); }
