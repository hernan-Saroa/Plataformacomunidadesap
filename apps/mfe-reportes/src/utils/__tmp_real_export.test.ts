// @vitest-environment jsdom
// Prueba temporal (NO mockea xlsx/jspdf) para generar archivos reales en disco
// y poder inspeccionarlos visualmente. Se borra después de la revisión.
import fs from 'fs';
import path from 'path';
import { describe, it } from 'vitest';
import { exportRundReportToExcel, exportRundReportToPDF } from './rundReportExport';

const OUT_DIR = 'C:\\Users\\DRKGOD~1\\AppData\\Local\\Temp\\claude\\c--Users-DrkGodEater-Documents-ProyectosGit-Plataformacomunidadesap\\a00c95db-1d13-4844-b882-622420a61807\\scratchpad';

const blobStore = new Map<string, Blob>();
const pendingWrites: Promise<void>[] = [];
URL.createObjectURL = (blob: Blob) => {
  const url = `blob:captured-${blobStore.size}`;
  blobStore.set(url, blob);
  return url;
};
(URL as any).revokeObjectURL = () => {};

const originalClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  // this.href resuelve la URL contra el base del documento; getAttribute('href') nos da el string crudo que pusimos.
  const rawHref = this.getAttribute('href') || '';
  const blob = blobStore.get(rawHref);
  console.log(`[click en <a>] href="${rawHref}" download="${this.download}" blobEncontrado=${Boolean(blob)}`);
  if (blob) {
    const filename = this.download || 'archivo-sin-nombre';
    pendingWrites.push(
      blob.arrayBuffer().then((buf) => {
        fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(buf));
        console.log(`[capturado via <a download>] ${filename} (${buf.byteLength} bytes)`);
      }),
    );
    return;
  }
  return originalClick.call(this);
};

const DETALLE_COLUMNAS = [
  { header: 'Nombre completo', key: 'nombre_completo' },
  { header: 'Territorial', key: 'territorial' },
  { header: 'Tipo de vinculación', key: 'vinculacion' },
  { header: 'Categoría', key: 'categoria' },
  { header: 'Género', key: 'genero' },
  { header: 'Nivel de formación', key: 'nivel_formacion' },
  { header: 'Núcleo temático', key: 'nucleo_tematico' },
];

const rowsPlanta: any[] = [
  { nombre_completo: 'María Fernanda Rodríguez Betancourt', territorial: 'Bogotá, Cundinamarca y Sede Central', vinculacion: 'Carrera', categoria: 'Titular', genero: 'Femenino', nivel_formacion: 'Doctorado', nucleo_tematico: 'Ciencias Políticas, Administración Pública y Gestión del Desarrollo Territorial' },
  { nombre_completo: 'José Luis Hernández Martínez de la Torre', territorial: 'Antioquia', vinculacion: 'Ocasional', categoria: 'Asistente', genero: 'Masculino', nivel_formacion: 'Maestría', nucleo_tematico: 'Economía' },
  { nombre_completo: 'Ana Sofía Gómez', territorial: null, vinculacion: 'Hora Cátedra', categoria: null, genero: 'Femenino', nivel_formacion: null, nucleo_tematico: 'Derecho Público' },
  { nombre_completo: 'Carlos Andrés Pérez Zuluaga', territorial: 'Valle del Cauca', vinculacion: 'Carrera', categoria: 'Asociado', genero: 'Masculino', nivel_formacion: 'Especialización', nucleo_tematico: 'Gobierno y Relaciones Internacionales' },
];
for (let i = 0; i < 40; i++) {
  rowsPlanta.push({
    nombre_completo: `Docente de prueba número ${i + 1} con nombre bastante largo para forzar el ajuste`,
    territorial: ['Bogotá', 'Antioquia', 'Valle del Cauca', 'Santander', 'Meta'][i % 5],
    vinculacion: ['Carrera', 'Ocasional', 'Hora Cátedra'][i % 3],
    categoria: ['Titular', 'Asociado', 'Asistente'][i % 3],
    genero: i % 2 === 0 ? 'Femenino' : 'Masculino',
    nivel_formacion: ['Maestría', 'Doctorado', 'Especialización'][i % 3],
    nucleo_tematico: 'Ciencias Sociales y Administración Pública Territorial',
  });
}

const metaPlanta = {
  titulo: 'Reporte de planta docente — Detalle',
  subtitulo: 'Página 1 de 3 · 62 docente(s) en total',
  filtros: { Territorial: 'Bogotá', 'Tipo de vinculación': 'Carrera', Categoría: undefined, Género: 'Femenino', 'Nivel de formación': undefined, 'Núcleo temático': undefined, 'Período académico': '2025-2' },
  totalRegistros: rowsPlanta.length,
};

const AGREGADO_COLUMNAS = [
  { header: 'Dimensión', key: 'dimension' },
  { header: 'Valor', key: 'valor' },
  { header: 'Total', key: 'total' },
];
const rowsAgregado = [
  { dimension: 'Total', valor: 'Total', total: 62 },
  { dimension: 'Territorial', valor: 'Bogotá', total: 30 },
  { dimension: 'Territorial', valor: 'Antioquia', total: 20 },
  { dimension: 'Núcleo temático', valor: 'Ciencias Sociales y Administración Pública Territorial', total: 12 },
];
const metaAgregado = {
  titulo: 'Reporte de planta docente — Agregado',
  filtros: { Territorial: 'Bogotá' },
  totalRegistros: rowsAgregado.length,
};

const HISTORIAL_COLUMNAS = [
  { header: 'Docente', key: 'docente_nombre' },
  { header: 'Documento', key: 'documento_identidad' },
  { header: 'Período', key: 'periodo' },
  { header: 'Territorial', key: 'territorial' },
  { header: 'CETAP', key: 'cetap' },
  { header: 'Programa', key: 'programa' },
  { header: 'Núcleo temático', key: 'nucleo_tematico' },
  { header: 'Asignatura', key: 'asignatura_nombre' },
  { header: 'Horas', key: 'horas' },
];
const rowsMacro: any[] = [];
for (let i = 0; i < 30; i++) {
  rowsMacro.push({
    docente_nombre: 'María Fernanda Rodríguez Betancourt de los Ángeles',
    documento_identidad: '******7890',
    periodo: '2025-2',
    territorial: 'Bogotá, Cundinamarca',
    cetap: 'CETAP Centro Oriente',
    programa: 'Especialización en Gerencia Pública y Control Fiscal Territorial',
    nucleo_tematico: 'Ciencias Políticas, Administración Pública y Gestión del Desarrollo',
    asignatura_nombre: 'Fundamentos de Derecho Administrativo Colombiano Contemporáneo',
    horas: 64,
  });
}
const metaMacro = {
  titulo: 'Macro Docente — Historial de asignaturas',
  subtitulo: 'Página 1 de 2 · 55 registro(s) en total',
  filtros: { Docente: 'María Fernanda Rodríguez Betancourt', 'Período académico': '2025-2', Territorial: 'Bogotá', CETAP: undefined, Programa: undefined, 'Núcleo temático': undefined },
  totalRegistros: rowsMacro.length,
};

describe('generación real de archivos para inspección visual (temporal)', () => {
  it('genera los xlsx/pdf reales en el scratchpad', async () => {
    exportRundReportToExcel(rowsPlanta, DETALLE_COLUMNAS, metaPlanta, 'RUND_Planta_Docente_Detalle');
    exportRundReportToPDF(rowsPlanta, DETALLE_COLUMNAS, metaPlanta, 'RUND_Planta_Docente_Detalle');
    exportRundReportToPDF(rowsAgregado, AGREGADO_COLUMNAS, metaAgregado, 'RUND_Planta_Docente_Agregado');
    exportRundReportToExcel(rowsMacro, HISTORIAL_COLUMNAS, metaMacro, 'RUND_Macro_Docente_Historial');
    exportRundReportToPDF(rowsMacro, HISTORIAL_COLUMNAS, metaMacro, 'RUND_Macro_Docente_Historial');
    console.log(`pendingWrites=${pendingWrites.length}`);
    await Promise.all(pendingWrites);
  });
});
