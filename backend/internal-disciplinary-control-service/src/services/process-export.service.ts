import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { AutoStatus, AutoType } from '../entities/legal-auto.entity';
import { TerminosCalculatorService } from './terminos-calculator.service';

const HEADERS = [
  'No. DE TRAMITE DISCIPLINARIO',
  'FECHAS DE ASIGNACIONES D/M/A',
  'Cuenta 10',
  'Diferencia Dias',
  'ABOGADO ASIGNADO',
  'II. ESTADO DEL PROCESO',
  'No. DE IDENTIFICACIÓN DEL PRESUNTO IMPLICADO ',
  'NOMBRES Y APELLIDOS DEL PRESUNTO IMPLICADO ',
  'ESTAMENTO DEL IMPLICADO',
  'LUGAR DE LOS HECHOS\n(TERRITORIAL)',
  'TIPO DE CONDUCTA',
  'INDICADOR (si aplica)',
  'FECHA DE HECHOS D/M/A',
  'Prescripción',
  'FECHA INDAGACIÓN PREVIA',
  'FECHA INVESTIGACIÓN DISCIPLINARIA',
  'PRÓRROGA SI/NO',
  'FECHA AUTO DE PRORROGAD/M/A',
  'No.  DE MESES A PRORROGAR',
  'Fecha Vencimiento IP ID y P',
  'FECHA AUTO DE CIERRE EVALUACION ID\nD/M/A',
  'Fecha Vencimiento Evaluacion ID',
  'DECISIÓN',
  'Vencimientos',
];

const DATE_COLUMNS = [2, 3, 13, 14, 15, 16, 18, 20, 21, 22]; // B,C,M,N,O,P,R,T,U,V

function mapEtapaToLabel(etapa: string | null | undefined): string {
  switch (etapa) {
    case 'RECEPCION':
    case 'VALORACION':
      return '01 NOTICIA DISCIPLINARIA';
    case 'INDAGACION_PREVIA':
    case 'INDAGACION':
      return '02 INDAGACIÓN PREVIA';
    case 'INVESTIGACION':
      return '03 INVESTIGACIÓN DISCIPLINARIA';
    case 'EVALUACION':
      return '04 EVALUACIÓN ID';
    case 'JUZGAMIENTO':
      return '05 CARGOS';
    default:
      return etapa || '';
  }
}

function getImplicado(news: DisciplinaryProcess['news']): any {
  const disciplinable = news?.disciplinable;
  if (!disciplinable) return null;
  return Array.isArray(disciplinable) ? disciplinable[0] : disciplinable;
}

function latestAprobado(autos: DisciplinaryProcess['autos'], tipos: string[]) {
  return (autos || [])
    .filter((a) => tipos.includes(a.tipo) && a.estado === AutoStatus.APROBADO)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

// auto.updatedAt refleja el último toque al registro (firma, notificación, etc.), no la fecha
// real de aprobación. auto.service.ts registra un AutoVersion con changeReason "...Aprobado..."
// exactamente en el momento de aprobar, así que es una fuente más confiable. Se excluyen las
// versiones de "reversión" (EFDS-1564 permite reversar una aprobación y volver a aprobar).
function fechaAprobacionAuto(auto?: { updatedAt: Date; versions?: { changeReason: string; createdAt: Date }[] }): Date | null {
  if (!auto) return null;
  const versionAprobacion = (auto.versions || [])
    .filter((v) => /aprobad/i.test(v.changeReason || '') && !/revers/i.test(v.changeReason || ''))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return versionAprobacion?.createdAt || auto.updatedAt || null;
}

@Injectable()
export class ProcessExportService {
  constructor(
    @InjectRepository(DisciplinaryProcess)
    private processRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryProcessActuacion)
    private actuacionesRepository: Repository<DisciplinaryProcessActuacion>,
    @InjectRepository(ReglaAlerta)
    private reglaAlertaRepository: Repository<ReglaAlerta>,
    private terminosCalculatorService: TerminosCalculatorService,
  ) {}

  private async buildActuacionesPorProceso(processIds: string[]): Promise<{
    fechasEtapa: Map<string, Map<string, Date>>;
    fechaProrroga: Map<string, Date>;
  }> {
    const fechasEtapa = new Map<string, Map<string, Date>>();
    const fechaProrroga = new Map<string, Date>();
    if (processIds.length === 0) return { fechasEtapa, fechaProrroga };

    const actuaciones = await this.actuacionesRepository.find({
      where: { tipo: In(['cambio_etapa', 'PRORROGA']), processId: In(processIds) },
      order: { fechaActuacion: 'ASC' },
    });

    for (const actuacion of actuaciones) {
      if (!actuacion.processId) continue;

      if (actuacion.tipo === 'cambio_etapa' && actuacion.etapa) {
        if (!fechasEtapa.has(actuacion.processId)) {
          fechasEtapa.set(actuacion.processId, new Map());
        }
        const porEtapa = fechasEtapa.get(actuacion.processId)!;
        // Se recorre en orden ascendente: la primera actuación hacia una etapa es la fecha de entrada real.
        if (!porEtapa.has(actuacion.etapa)) {
          porEtapa.set(actuacion.etapa, actuacion.fechaActuacion);
        }
      }

      if (actuacion.tipo === 'PRORROGA') {
        // La más reciente: coincide con la última prórroga aprobada, que es la que se reporta.
        fechaProrroga.set(actuacion.processId, actuacion.fechaActuacion);
      }
    }

    return { fechasEtapa, fechaProrroga };
  }

  // Reutiliza el umbral de "próximo a vencer" ya configurado en Configuración > Reglas de Alerta,
  // para que el informe sea consistente con el semáforo que ya ven los usuarios en el sistema.
  private async getUmbralPorVencerDias(): Promise<number> {
    const reglas = await this.reglaAlertaRepository.find({ where: { activa: true } });
    const candidatos = reglas.map((r) => r.diasAnticipacion).filter((d) => d > 0);
    return candidatos.length ? Math.max(...candidatos) : 5;
  }

  async generateVencimientosReport(): Promise<ExcelJS.Workbook> {
    const [processes, umbralDias] = await Promise.all([
      this.processRepository.find({
        relations: ['news', 'abogadoAsignado', 'autos', 'autos.versions'],
        order: { createdAt: 'ASC' },
      }),
      this.getUmbralPorVencerDias(),
    ]);

    const { fechasEtapa: fechasEtapaPorProceso, fechaProrroga: fechaProrrogaPorProceso } =
      await this.buildActuacionesPorProceso(processes.map((p) => p.id));

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Base');
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    HEADERS.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = 22;
    });
    const headerRow = worksheet.getRow(1);
    HEADERS.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    headerRow.height = 30;

    for (let i = 0; i < processes.length; i++) {
      const process = processes[i];
      const r = i + 2;
      const implicado = getImplicado(process.news);
      const etapaLabel = mapEtapaToLabel(process.etapaActual);
      const fechasEtapa = fechasEtapaPorProceso.get(process.id);

      const fechaIndagacionPrevia =
        fechasEtapa?.get('INDAGACION_PREVIA') ||
        fechasEtapa?.get('INDAGACION') ||
        (['INDAGACION_PREVIA', 'INDAGACION'].includes(process.etapaActual)
          ? process.fechaInicioEtapa
          : null);
      const fechaInvestigacion =
        fechasEtapa?.get('INVESTIGACION') ||
        (process.etapaActual === 'INVESTIGACION' ? process.fechaInicioEtapa : null);

      const autoProrroga = latestAprobado(process.autos, [AutoType.AUTO_PRORROGA]);
      const autoCierre = latestAprobado(process.autos, [AutoType.AUTO_CIERRE]);
      const autoPliego = latestAprobado(process.autos, [
        AutoType.AUTO_FORMULACION_PLIEGO,
        AutoType.PLIEGO_CARGOS,
      ]);

      // Evaluación y Cargos comparten UN SOLO plazo de 40 días calendario, contado
      // desde que el proceso entra a Evaluación (confirmado con el usuario) — Cargos NO
      // tiene un plazo propio ni reinicia el conteo al pasar de una etapa a la otra.
      const fechaEntradaEvaluacion =
        fechasEtapa?.get('EVALUACION') ||
        (process.etapaActual === 'EVALUACION' ? process.fechaInicioEtapa : null) ||
        fechaAprobacionAuto(autoCierre);
      let fechaVencimientoEvaluacion: Date | null = null;
      if (fechaEntradaEvaluacion) {
        const fv = new Date(fechaEntradaEvaluacion);
        fv.setDate(fv.getDate() + 40);
        fechaVencimientoEvaluacion = fv;
      }

      // EFDS: para el resto de las etapas, el cálculo es GENÉRICO — se ancla a la fecha
      // real de entrada a la etapa ACTUAL (sea cual sea) y usa los días hábiles
      // configurados en Configuración > Etapas (mismo TerminosCalculatorService que usa
      // el semáforo en vivo, con festivos reales). Así, si se crea una etapa nueva, el
      // informe la calcula sola, sin tocar este código.
      let fechaVencimientoEtapaActual: Date | null = null;
      if (process.etapaActual === 'EVALUACION' || process.etapaActual === 'JUZGAMIENTO') {
        fechaVencimientoEtapaActual = fechaVencimientoEvaluacion;
      } else {
        const esEtapaInicial = ['RECEPCION', 'VALORACION'].includes(process.etapaActual);
        const fechaEntradaEtapaActual =
          fechasEtapa?.get(process.etapaActual) ||
          process.fechaInicioEtapa ||
          (esEtapaInicial ? process.createdAt : null) ||
          null;
        if (fechaEntradaEtapaActual) {
          const resultado = await this.terminosCalculatorService.calculateVencimientoEtapa(
            process.etapaActual,
            new Date(fechaEntradaEtapaActual),
          );
          fechaVencimientoEtapaActual = resultado.fechaVencimiento;
        }
      }

      const values: Record<number, any> = {
        1: process.radicadoProceso,
        2: process.createdAt,
        5: process.abogadoAsignado?.nombreCompleto || '',
        6: etapaLabel,
        7: implicado?.cedula || '',
        8: implicado?.nombre || '',
        9: implicado?.cargo || '',
        10: process.news?.territorial || '',
        // EFDS-1563: "conductas" incluye la original del Radicador más las que agregue el Jefe;
        // si existe, es la fuente más completa. "conducta" es el respaldo para procesos anteriores.
        11: process.news?.conductas?.length
          ? process.news.conductas.join(', ')
          : process.news?.conducta || '',
        12: '',
        13: process.news?.fechaHechos || null,
        15: fechaIndagacionPrevia || null,
        16: fechaInvestigacion || null,
        17: autoProrroga ? 'SI' : 'NO',
        18: (autoProrroga && fechaProrrogaPorProceso.get(process.id)) || fechaAprobacionAuto(autoProrroga),
        19: autoProrroga?.prorrogaMeses ?? null,
        21: fechaAprobacionAuto(autoCierre),
        23: autoPliego ? 'Formulación de Cargos' : '',
      };

      Object.entries(values).forEach(([col, value]) => {
        worksheet.getCell(r, Number(col)).value = value ?? null;
      });

      worksheet.getCell(r, 3).value = {
        formula: `IF(F${r}="01 NOTICIA DISCIPLINARIA",WORKDAY(B${r},11),"")`,
      } as any;
      worksheet.getCell(r, 4).value = {
        formula: `IF(F${r}="01 NOTICIA DISCIPLINARIA",(C${r}-DATE(${y},${m},${d})),"")`,
      } as any;
      worksheet.getCell(r, 14).value = {
        formula: `IF(ISNUMBER(M${r}),DATE(YEAR(M${r})+5,MONTH(M${r}),DAY(M${r})),"Faltan datos/Vacia")`,
      } as any;
      // EFDS: la fórmula ya no enumera etapas — usa el vencimiento ya calculado con
      // TerminosCalculatorService (fechaVencimientoEtapaActual) para la etapa en la que
      // el proceso esté HOY, sea la que sea. La prórroga (si existe) sigue mandando.
      const vencimientoEtapaLiteral = fechaVencimientoEtapaActual
        ? `DATE(${fechaVencimientoEtapaActual.getFullYear()},${fechaVencimientoEtapaActual.getMonth() + 1},${fechaVencimientoEtapaActual.getDate()})`
        : '""';
      worksheet.getCell(r, 20).value = {
        formula: `IF(Q${r}="SI",EDATE(R${r},S${r}),${vencimientoEtapaLiteral})`,
      } as any;
      // Columna V: ya viene totalmente calculada (días hábiles reales, con festivos) —
      // se escribe como valor, no como fórmula de Excel.
      worksheet.getCell(r, 22).value = fechaVencimientoEvaluacion || null;
      worksheet.getCell(r, 24).value = {
        formula:
          `IF(T${r}="","Sin datos",` +
          `IF(T${r}<DATE(${y},${m},${d}),"VENCIDO",` +
          `IF(NETWORKDAYS(DATE(${y},${m},${d}),T${r})<=${umbralDias + 1},"ETAPA POR VENCER","EN TÉRMINOS")))`,
      } as any;

      DATE_COLUMNS.forEach((col) => {
        worksheet.getCell(r, col).numFmt = 'dd/mm/yyyy';
      });
    }

    // Colorea la columna "Vencimientos" (X, la última) según el mismo semáforo
    // rojo/amarillo/verde ya usado en el resto del sistema.
    if (processes.length > 0) {
      worksheet.addConditionalFormatting({
        ref: `X2:X${processes.length + 1}`,
        rules: [
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'VENCIDO',
            priority: 1,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
              font: { color: { argb: 'FF991B1B' }, bold: true },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'ETAPA POR VENCER',
            priority: 2,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
              font: { color: { argb: 'FF92400E' }, bold: true },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'EN TÉRMINOS',
            priority: 3,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
              font: { color: { argb: 'FF065F46' }, bold: true },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'Sin datos',
            priority: 4,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
              font: { color: { argb: 'FF6B7280' } },
            },
          },
        ],
      });
    }

    return workbook;
  }
}
