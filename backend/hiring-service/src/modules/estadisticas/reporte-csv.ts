import { ConteoValor, EstadisticasGestion } from './estadisticas.service';

/**
 * Las estadísticas de gestión como archivo descargable (EFDS-1189).
 *
 * CSV y no PDF ni XLSX: rendir cuentas termina con las cifras pegadas en el
 * informe que arma el área, y un CSV se abre en Excel y se copia. Un PDF se
 * vería mejor y obligaría a teclear los números otra vez, que es donde se
 * introducen los errores que después no cuadran con el expediente.
 *
 * Se arma sobre el mismo objeto que responde la consulta, y no con su propia
 * consulta a la base: dos cifras distintas para el mismo indicador —una en
 * pantalla y otra en el archivo— es peor que no tener el archivo.
 */

/**
 * Punto y coma y no coma.
 *
 * Excel en configuración regional española lee la coma como separador decimal,
 * así que un archivo separado por comas le llega en una sola columna. Es el
 * mismo motivo por el que los reportes de la entidad usan punto y coma.
 */
const SEPARADOR = ';';

/**
 * Escapa un campo para que ni el separador ni un salto de línea lo partan.
 *
 * El objeto de un contrato lleva comas, punto y coma y a veces saltos de línea:
 * sin comillas, una fila se convierte en tres.
 */
function campo(valor: string | number): string {
  const texto = String(valor ?? '');
  if (!/[";\r\n]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Una fila del CSV a partir de sus celdas. */
function fila(...celdas: (string | number)[]): string {
  return celdas.map(campo).join(SEPARADOR);
}

/** Las filas de un corte, con su encabezado de sección. */
function seccion(titulo: string, cortes: ConteoValor[]): string[] {
  if (cortes.length === 0) return [fila(titulo), fila('Sin datos'), ''];

  return [
    fila(titulo),
    fila('Concepto', 'Cantidad', 'Valor'),
    ...cortes.map((c) => fila(c.etiqueta, c.cuantos, c.valor)),
    '',
  ];
}

/**
 * El reporte completo en CSV.
 *
 * Con BOM al principio: sin él, Excel abre el archivo como ANSI y «Adjudicación
 * de mínima cuantía» se lee «AdjudicaciÃ³n». Es un byte y ahorra que el área
 * tenga que importar el archivo a mano cada vez.
 */
export function reporteCsv(estadisticas: EstadisticasGestion): string {
  const { filtros, contratos, procesos, presupuesto } = estadisticas;

  const lineas = [
    fila('Estadísticas y reportes de gestión contractual'),
    fila('Generado', estadisticas.generadoEn),
    fila('Vigencia', filtros.vigencia ?? 'Todas'),
    fila('Modalidad', filtros.modalidad ?? 'Todas'),
    '',

    ...seccion('Contratos por estado', contratos.porEstado),
    ...seccion('Contratos por modalidad de selección', contratos.porModalidad),
    ...seccion('Contratos por tipología', contratos.porTipologia),
    ...seccion('Procesos de selección por desenlace', procesos.porDesenlace),

    fila('Ejecución presupuestal'),
    fila('Concepto', 'Valor'),
    fila('Contratado', presupuesto.contratado),
    fila('Pagado', presupuesto.pagado),
    fila('Por pagar', presupuesto.porPagar),
    fila('Porcentaje ejecutado', presupuesto.porcentajeEjecutado),
    '',

    fila('Totales'),
    fila('Contratos', contratos.total),
    fila('Valor total', contratos.valorTotal),
    fila('Procesos de selección', procesos.total),
  ];

  return `﻿${lineas.join('\r\n')}\r\n`;
}

/**
 * Cómo se llama el archivo al descargarlo.
 *
 * Lleva la vigencia y la fecha del corte porque quien rinde cuentas guarda
 * varios: tres archivos llamados `estadisticas.csv` en la misma carpeta no se
 * distinguen, y el informe cita el que se descargó ese día.
 */
export function nombreDelArchivo(estadisticas: EstadisticasGestion): string {
  const alcance = estadisticas.filtros.vigencia ?? 'historico';
  const corte = estadisticas.generadoEn.slice(0, 10);
  return `estadisticas-contratacion-${alcance}-${corte}.csv`;
}
