import { ConteoValor, EstadisticasGestion, ResumenDias } from './estadisticas.service';

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

/** Un tramo del ciclo: promedio, mediana y sobre cuántos contratos se midió. */
function tramo(nombre: string, resumen: ResumenDias): string {
  return fila(nombre, resumen.promedio ?? 'Sin datos', resumen.mediana ?? 'Sin datos', resumen.muestras);
}

/**
 * Cómo se llama un filtro en el archivo.
 *
 * Con el nombre y no con el código: `ABREVIADA_MENOR_CUANTIA` en el encabezado
 * de un informe obliga a quien lo lee a saber cómo lo guarda el sistema. Si el
 * corte quedó vacío no hay de dónde sacar el nombre y va el código.
 */
function nombreDelFiltro(codigo: string | null, cortes: ConteoValor[]): string {
  if (!codigo) return 'Todas';
  return cortes.find((c) => c.clave === codigo)?.etiqueta ?? codigo;
}

/**
 * El reporte completo en CSV.
 *
 * Con BOM al principio: sin él, Excel abre el archivo como ANSI y «Adjudicación
 * de mínima cuantía» se lee «AdjudicaciÃ³n». Es un byte y ahorra que el área
 * tenga que importar el archivo a mano cada vez.
 *
 * Termina con el listado de contratos: las cifras de arriba se citan en el
 * informe, y el listado es lo que el organismo de control pide para cruzarlas.
 */
export function reporteCsv(estadisticas: EstadisticasGestion): string {
  const { filtros, contratos, procesos, presupuesto, modificaciones, seguimiento, tiempos } =
    estadisticas;

  const lineas = [
    fila('Estadísticas y reportes de gestión contractual'),
    fila('Generado', estadisticas.generadoEn),
    fila('Vigencia', filtros.vigencia ?? 'Todas'),
    fila('Modalidad', nombreDelFiltro(filtros.modalidad, contratos.porModalidad)),
    fila('Tipología', nombreDelFiltro(filtros.tipologia, contratos.porTipologia)),
    '',

    fila('Totales'),
    fila('Contratos', contratos.total),
    fila('Valor total', contratos.valorTotal),
    fila('Valor inicial, sin adiciones', contratos.valorInicial),
    fila('Valor promedio por contrato', contratos.valorPromedio),
    fila('Contratistas distintos', contratos.contratistasDistintos),
    fila('Procesos de selección', procesos.total),
    fila('Valor estimado de los procesos', procesos.valorEstimado),
    '',

    ...seccion('Contratos por estado', contratos.porEstado),
    ...seccion('Contratos por modalidad de selección', contratos.porModalidad),
    ...seccion('Contratos por tipología', contratos.porTipologia),
    ...seccion('Contratos por tipo de persona del contratista', contratos.porTipoPersona),
    ...seccion('Contratos suscritos por mes', contratos.porMes),
    ...seccion('Principales contratistas por valor', contratos.principalesContratistas),

    ...seccion('Procesos de selección por desenlace', procesos.porDesenlace),
    ...seccion('Procesos de selección por modalidad', procesos.porModalidad),
    ...seccion('Procesos en curso por etapa', procesos.enCursoPorEtapa),

    fila('Ejecución presupuestal'),
    fila('Concepto', 'Valor'),
    fila('Contratado', presupuesto.contratado),
    fila('Pagado', presupuesto.pagado),
    fila('Por pagar', presupuesto.porPagar),
    fila('Porcentaje ejecutado', presupuesto.porcentajeEjecutado),
    fila('Cuentas en trámite', presupuesto.enTramite),
    '',
    ...seccion('Cuentas de cobro por estado', presupuesto.cuentasPorEstado),

    fila('Modificaciones contractuales'),
    fila('Concepto', 'Valor'),
    fila('Modificaciones aprobadas', modificaciones.total),
    fila('Contratos modificados', modificaciones.contratosModificados),
    fila('Valor adicionado', modificaciones.valorAdicionado),
    fila('Porcentaje adicionado sobre el valor inicial', modificaciones.porcentajeAdicionado),
    fila('Días prorrogados', modificaciones.diasProrrogados),
    '',
    ...seccion('Modificaciones por tipo', modificaciones.porTipo),

    ...seccion('Contratos que requieren atención', seguimiento.porSituacion),
    fila('Casos de presunto incumplimiento abiertos', seguimiento.incumplimientosAbiertos),
    fila('Contratos con incumplimiento abierto', seguimiento.contratosConIncumplimiento),
    '',

    fila('Tiempos del ciclo, en días calendario'),
    fila('Tramo', 'Promedio', 'Mediana', 'Contratos medidos'),
    tramo('De la radicación del proceso a la firma', tiempos.radicacionASuscripcion),
    tramo('De la firma al acta de inicio', tiempos.suscripcionAInicio),
    '',

    fila('Listado de contratos'),
    ...(estadisticas.contratosDelReporte.length === 0
      ? [fila('Sin datos')]
      : [
          fila(
            'Proceso',
            'Contrato',
            'Objeto',
            'Contratista',
            'Tipo de persona',
            'Modalidad',
            'Tipología',
            'Estado',
            'Valor inicial',
            'Valor actual',
            'Pagado',
            'Porcentaje pagado',
            'Suscrito el',
            'Inicio',
            'Plazo en días',
            'Fin del plazo',
            'Modificaciones',
            'Supervisor',
          ),
          ...estadisticas.contratosDelReporte.map((c) =>
            fila(
              c.radicado,
              c.numero,
              c.objeto,
              c.contratista,
              c.tipoPersona,
              c.modalidad ?? '',
              c.tipologia ?? '',
              contratos.porEstado.find((e) => e.clave === c.estado)?.etiqueta ?? c.estado,
              c.valorInicial,
              c.valor,
              c.pagado,
              c.porcentajePagado,
              c.suscritoEl ?? '',
              c.inicioEl ?? '',
              c.plazoDias ?? '',
              c.finDelPlazo ?? '',
              c.modificaciones,
              c.supervisor ?? '',
            ),
          ),
        ]),
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
