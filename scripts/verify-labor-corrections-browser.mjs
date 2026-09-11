// Run after: npm run build -w @esap-mfe/certificados-laborales
// Uses the production bundle with simulated responses; never contacts an API.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer';

const build = path.resolve('build');
const base = '/remotes/mfe-certificados-laborales/assets/';
const assets = await readdir(path.join(build, base));
const react = assets.find((name) => name.startsWith('__federation_shared_react-'));
const reactDOM = assets.find((name) => name.startsWith('__federation_shared_react-dom-'));
const output = path.join(os.tmpdir(), 'esap-corrections-review');
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><div id="root"></div><script type="module">
        import React from '${base}${react}';
        import ReactDOM from '${base}${reactDOM}';
        import {get} from '${base}remoteEntry.js';
        const {CertificadosLaboralesRouter: Router} = (await get('./Router'))();
        const root = ReactDOM.createRoot(document.getElementById('root'));
        window.renderPermissions = (permissions) => root.render(React.createElement(Router, { userPermissions: permissions }));
        window.renderPermissions([]);
      </script></html>`);
      return;
    }
    const file = path.resolve(build, `.${new URL(req.url, 'http://localhost').pathname}`);
    if (!file.startsWith(build + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (process.argv.includes('--decisions')) {
    page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()); });
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => {
    window.statsCalls = 0;
    window.openCorrections = 3;
    const originalFetch = window.fetch;
    window.fetch = async (input, options) => {
      const url = String(input);
      if (!url.includes('/api/')) return originalFetch(input, options);
      const isStats = url.includes('correction-requests/stats');
      if (isStats) window.statsCalls++;
      if (window.caseData && url.includes('correction-requests') && !isStats) {
        const data = url.endsWith('/preview')
          ? { html: '', template_variables: [] }
          : url.includes('/request-1') ? window.caseData : { items: [window.caseData], total: 1, totalPages: 1 };
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(isStats
        ? { pending: window.openCorrections, in_review: 0, total: window.openCorrections + 10, approved: 7, rejected: 3, overdue: 0 }
        : { items: [], total: 0, totalPages: 1 }), { headers: { 'Content-Type': 'application/json' } });
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.renderPermissions && document.body.textContent.includes('Certificados Laborales'));
  assert.equal(await page.$('.certificates-corrections-button'), null);
  assert.equal(await page.evaluate(() => window.statsCalls), 0);
  await page.evaluate(() => window.renderPermissions(['certificados-laborales.correction.manage', 'certificados-laborales.certificate.verify']));
  const waitCount = (count) => page.waitForFunction((expected) => document.querySelector('.certificates-corrections-button__count')?.textContent === expected, { timeout: 12000 }, String(count));
  await waitCount(3);
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  await page.evaluate(() => { window.openCorrections = 12; });
  await waitCount(12);
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
  const fits = await page.$eval('.certificates-corrections-button', (button) => {
    const badge = button.querySelector('.certificates-corrections-button__count').getBoundingClientRect();
    const bounds = button.getBoundingClientRect();
    return badge.right <= bounds.right && bounds.right <= window.innerWidth;
  });
  assert.equal(fits, true, 'The counter must fit inside the button on mobile');
  await page.evaluate(() => { window.openCorrections = 0; });
  await waitCount(0);
  await page.evaluate(() => window.renderPermissions([]));
  await page.waitForFunction(() => !document.querySelector('.certificates-corrections-button'));
  const calls = await page.evaluate(() => window.statsCalls);
  await page.waitForFunction(() => document.body.textContent.includes('Certificados Laborales'));
  await new Promise((resolve) => setTimeout(resolve, 5500));
  assert.equal(await page.evaluate(() => window.statsCalls), calls, 'Revoking permission must stop polling');
  if (process.argv.includes('--decisions')) {
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (!request.url().includes('/api/')) { await request.continue(); return; }
      const headers = {
        'Access-Control-Allow-Origin': request.headers().origin || `http://127.0.0.1:${server.address().port}`,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] || 'authorization,content-type,x-client-version',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      };
      if (request.method() === 'OPTIONS') { await request.respond({ status: 204, headers }); return; }
      const approved = request.url().endsWith('/approve');
      const data = await page.evaluate((approved) => {
        window.caseData = { ...window.caseData, status: approved ? 'APPROVED' : 'REJECTED', email: 'solicitante@example.com', email_sent: true, resolution_description: 'Decisión registrada para la verificación visual.' };
        return window.caseData;
      }, approved);
      await request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const clickButton = async (label) => {
      await page.waitForFunction((label) => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === label), {}, label);
      await page.evaluate((label) => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === label).click(), label);
    };
    for (const decision of ['approved', 'rejected']) {
      await page.evaluate(() => {
        window.caseData = {
          id: 'request-1', request_number: 'COR-20260910-DEMO', status: 'IN_REVIEW',
          description: 'Solicitud de corrección del cargo.', requester_name: 'Solicitante de prueba', requester_email: 'solicitante@example.com',
          created_at: '2026-09-10', due_date: '2026-10-01', submitted_evidence: [], resolution_evidence: [], traceability: [],
          certificate_snapshot: { full_name: 'Solicitante de prueba', document_type: 'CC', id_number: '12345', career_category: 'Profesional', position_category: 'Administrativo', hiring_date: '2020-01-01', certificate_number: 'CERT-DEMO' },
        };
        window.openCorrections = 1;
        window.renderPermissions(['certificados-laborales.correction.manage']);
      });
      await page.waitForSelector('.certificates-corrections-button');
      await page.click('.certificates-corrections-button');
      await clickButton('Revisar');
      await clickButton(decision === 'approved' ? 'Enviar certificado' : 'Rechazar');
      await page.type('[role="dialog"] textarea', 'Descripción completa de la decisión tomada.');
      await clickButton(decision === 'approved' ? 'Confirmar envío' : 'Confirmar rechazo');
      try {
        await page.waitForSelector('.correction-result-dialog', { timeout: 12000 });
      } catch (error) {
        await page.screenshot({ path: path.join(output, 'decision-failure.png') });
        console.error(await page.evaluate(() => ({ dialog: document.querySelector('[role="dialog"]')?.textContent, notices: [...document.querySelectorAll('[data-sonner-toast]')].map((node) => node.textContent) })));
        throw error;
      }
      await page.waitForFunction(() => document.activeElement?.textContent === 'Entendido');
      await page.screenshot({ path: path.join(output, `result-${decision}.png`) });
      await page.setViewport({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, `result-${decision}-mobile.png`) });
      const bounds = await page.$eval('.correction-result-dialog', (dialog) => {
        const box = dialog.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
      });
      assert.equal(bounds, true, 'The result dialog must fit on mobile');
      assert.equal(await page.$eval('.correction-result-dialog__icon', (icon) => icon.getBoundingClientRect().width), 72, 'The result icon must keep its intended size on mobile');
      await clickButton('Entendido');
      await page.waitForSelector('.correction-result-dialog', { hidden: true });
      await page.setViewport({ width: 1440, height: 1000 });
      await page.click('.certificate-dashboard-back');
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['permission gate', '3 → 12 → 0 without reload', 'mobile counter bounds', 'permission revocation cleanup', 'no runtime errors', ...(process.argv.includes('--decisions') ? ['approval and rejection result dialogs', 'keyboard focus', 'mobile dialog bounds and icon size'] : [])], screenshots: output }));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
