const fs = require('node:fs');
const path = require('node:path');
const { serviceRoot, reportError } = require('./rund-documental/local-context.cjs');
const { checkOpenKm } = require('./rund-documental/openkm-check.cjs');

(async () => {
  if (process.argv.length !== 2) throw new Error('NO_OPTIONS_SUPPORTED');
  const env = require(path.join(serviceRoot, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(serviceRoot, '.env')));
  const result = await checkOpenKm(env);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
})().catch(reportError);
