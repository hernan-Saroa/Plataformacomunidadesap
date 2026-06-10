const { execSync } = require('child_process');

const containers = [
  "superapp-frontend-shell-local",
  "superapp-mfe-estructura-org-local",
  "superapp-mfe-gestion-profesoral-local",
  "superapp-mfe-programas-academicos-local",
  "superapp-mfe-gestion-personas-local",
  "superapp-mfe-auditoria-local",
  "superapp-mfe-reportes-local",
  "superapp-mfe-registro-academico-local",
  "superapp-mfe-certificados-laborales-local",
  "superapp-mfe-firma-electronica-local",
  "superapp-mfe-control-interno-local",
  "superapp-mfe-control-disciplinario-local",
  "superapp-mfe-gestion-legal-local",
  "superapp-mfe-pta-local"
];

for (const container of containers) {
  try {
    const cmd = `docker exec ${container} grep -rh "localhost/services" /usr/share/nginx/html/`;
    const output = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (output) {
      console.log(`${container}: Found localhost/services`);
    } else {
      console.log(`${container}: (not found)`);
    }
  } catch (error) {
    console.log(`${container}: Error or not found`);
  }
}
