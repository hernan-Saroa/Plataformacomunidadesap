import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { DisciplinaryProcess, ProcessStage, ProcessStatus } from '../entities/disciplinary-process.entity';
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

interface SemaforoStyle {
  fill: string;
  font: string;
  bold: boolean;
}

const SEMAFORO_STYLES: Record<string, SemaforoStyle> = {
  VENCIDO: { fill: 'FFFEE2E2', font: 'FF991B1B', bold: true },
  'ETAPA POR VENCER': { fill: 'FFFEF3C7', font: 'FF92400E', bold: true },
  'EN TÉRMINOS': { fill: 'FFD1FAE5', font: 'FF065F46', bold: true },
  'CARGOS - VENCIDO': { fill: 'FFFEE2E2', font: 'FF991B1B', bold: true },
  'CARGOS - ETAPA POR VENCER': { fill: 'FFFEF3C7', font: 'FF92400E', bold: true },
  'CARGOS - EN TÉRMINOS': { fill: 'FFD1FAE5', font: 'FF065F46', bold: true },
  'CARGOS - Sin datos': { fill: 'FFF3F4F6', font: 'FF6B7280', bold: false },
  CARGOS: { fill: 'FFFEF3C7', font: 'FF92400E', bold: true },
  ARCHIVADO: { fill: 'FFE2E8F0', font: 'FF334155', bold: true },
  INHIBIDO: { fill: 'FFEDE9FE', font: 'FF5B21B6', bold: true },
  'Sin datos': { fill: 'FFF3F4F6', font: 'FF6B7280', bold: false },
};

function calculateNetworkDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (cur > end) return 0;

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

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
    case 'SEGUNDA_INSTANCIA':
      return '07 SEGUNDA INSTANCIA';
    case 'FALLO':
      return '08 FALLO';
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
    .filter(
      (a) =>
        tipos.includes(a.tipo) &&
        [AutoStatus.APROBADO, AutoStatus.FIRMADO, AutoStatus.NOTIFICADO].includes(a.estado),
    )
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
    fechaUltimaReactivacion: Map<string, Date>;
  }> {
    const fechasEtapa = new Map<string, Map<string, Date>>();
    const fechaProrroga = new Map<string, Date>();
    const fechaUltimaReactivacion = new Map<string, Date>();
    if (processIds.length === 0) return { fechasEtapa, fechaProrroga, fechaUltimaReactivacion };

    const actuaciones = await this.actuacionesRepository.find({
      where: { processId: In(processIds) },
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

      // Actuaciones que indican reactivación, desarchivo, apelación o reversión del auto
      const tipoLower = (actuacion.tipo || '').toLowerCase();
      const esReactivacion =
        ['reversion_aprobacion', 'restaurar', 'desarchivar', 'apelacion', 'recurso'].includes(tipoLower) ||
        /revers|restaur|apelac|desarchiv/i.test(actuacion.descripcion || '') ||
        /revers|restaur|apelac|desarchiv/i.test(actuacion.observaciones || '');

      if (esReactivacion) {
        fechaUltimaReactivacion.set(actuacion.processId, actuacion.fechaActuacion);
      }
    }

    return { fechasEtapa, fechaProrroga, fechaUltimaReactivacion };
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

    const {
      fechasEtapa: fechasEtapaPorProceso,
      fechaProrroga: fechaProrrogaPorProceso,
      fechaUltimaReactivacion: fechaReactivacionPorProceso,
    } = await this.buildActuacionesPorProceso(processes.map((p) => p.id));

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
      const autoArchivo = latestAprobado(process.autos, [AutoType.AUTO_ARCHIVO]);
      const autoInhibitorio = latestAprobado(process.autos, [AutoType.AUTO_INHIBITORIO]);

      // --- VALIDACIÓN ROBUSTA DE ARCHIVO / INHIBITORIO ---
      // No se puede fiar solo de que exista un auto aprobado de tipo archivo o inhibitorio,
      // porque el proceso pudo haber sido RESTAURADO (restore), su aprobación REVERSADA por el Jefe,
      // APELADO a segunda instancia (recurso de apelación) o continuado con autos posteriores.

      const isProcesoActivo =
        process.estado === ProcessStatus.ACTIVO ||
        process.estado === 'ACTIVO' ||
        (process.restaurado === true && process.estado !== ProcessStatus.ARCHIVADO);

      const isEnSegundaInstancia =
        process.etapaActual === ProcessStage.SEGUNDA_INSTANCIA ||
        process.etapaActual === 'SEGUNDA_INSTANCIA';

      const fechaAutoArchivo = fechaAprobacionAuto(autoArchivo);
      const fechaAutoInhibitorio = fechaAprobacionAuto(autoInhibitorio);
      const fechaCorteArchivo = fechaAutoArchivo || fechaAutoInhibitorio;

      const fechaReactivacion = fechaReactivacionPorProceso.get(process.id);
      const fueReactivadoPosterior = Boolean(
        fechaReactivacion &&
        fechaCorteArchivo &&
        new Date(fechaReactivacion).getTime() >= new Date(fechaCorteArchivo).getTime(),
      );

      const tieneAutoPosterior = fechaCorteArchivo
        ? (process.autos || []).some((a) => {
            const esMismoAuto =
              (autoArchivo && a.id === autoArchivo.id) ||
              (autoInhibitorio && a.id === autoInhibitorio.id);
            if (esMismoAuto) return false;
            const esAprobado = [
              AutoStatus.APROBADO,
              AutoStatus.FIRMADO,
              AutoStatus.NOTIFICADO,
            ].includes(a.estado);
            const fechaA = fechaAprobacionAuto(a);
            return (
              esAprobado &&
              fechaA &&
              new Date(fechaA).getTime() > new Date(fechaCorteArchivo).getTime()
            );
          })
        : false;

      // El proceso solo se considera formalmente archivado si su estado es ARCHIVADO
      // y no se encuentra activo por restauración, apelación o actuaciones posteriores.
      const isEstadoArchivado =
        (process.estado === ProcessStatus.ARCHIVADO ||
          (process as any).estadoActual === 'ARCHIVADO') &&
        !isProcesoActivo;

      const isArchivadoEfectivo =
        isEstadoArchivado &&
        !isEnSegundaInstancia &&
        !fueReactivadoPosterior &&
        !tieneAutoPosterior;

      const isInhibido =
        isArchivadoEfectivo &&
        (process.etapaActual === ProcessStage.INHIBITORIO ||
          (process as any).estadoActual === 'INHIBIDO' ||
          Boolean(
            autoInhibitorio &&
              (!autoArchivo ||
                (fechaAutoInhibitorio &&
                  fechaAutoArchivo &&
                  new Date(fechaAutoInhibitorio).getTime() >= new Date(fechaAutoArchivo).getTime())),
          ));

      const isArchivado = isArchivadoEfectivo && !isInhibido;

      let etapaLabel = mapEtapaToLabel(process.etapaActual);
      if (isInhibido) {
        etapaLabel = 'INHIBIDO';
      } else if (isArchivado) {
        etapaLabel = 'ARCHIVADO';
      } else if (process.estado === ProcessStatus.SUSPENDIDO) {
        etapaLabel = 'SUSPENDIDO';
      }

      // Fecha en que entró a evaluación (auto de cierre o registro en actuaciones / inicio etapa)
      const fechaEntradaEvaluacion =
        fechasEtapa?.get('EVALUACION') ||
        (process.etapaActual === 'EVALUACION' ? process.fechaInicioEtapa : null) ||
        fechaAprobacionAuto(autoCierre);

      let fechaVencimientoEvaluacion: Date | null = null;
      if (fechaEntradaEvaluacion) {
        if (process.etapaActual === 'EVALUACION' && process.fechaVencimientoEtapa) {
          fechaVencimientoEvaluacion = new Date(process.fechaVencimientoEtapa);
        } else {
          const resultado = await this.terminosCalculatorService.calculateVencimientoEtapa(
            'EVALUACION',
            new Date(fechaEntradaEvaluacion),
          );
          fechaVencimientoEvaluacion = resultado.fechaVencimiento;
        }
      }

      // Vencimiento de la etapa activa del proceso
      let fechaVencimientoEtapaActual: Date | null = null;
      if (isInhibido || isArchivado) {
        fechaVencimientoEtapaActual = null;
      } else if (process.etapaActual === 'EVALUACION') {
        fechaVencimientoEtapaActual = fechaVencimientoEvaluacion;
      } else if (
        process.etapaActual === 'JUZGAMIENTO' ||
        process.etapaActual === ProcessStage.JUZGAMIENTO
      ) {
        const fechaEntradaCargos =
          fechasEtapa?.get('JUZGAMIENTO') ||
          process.fechaInicioEtapa ||
          fechaAprobacionAuto(autoPliego);
        if (fechaEntradaCargos) {
          const resultado = await this.terminosCalculatorService.calculateVencimientoEtapa(
            'JUZGAMIENTO',
            new Date(fechaEntradaCargos),
          );
          fechaVencimientoEtapaActual = resultado.fechaVencimiento;
        }
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

      // Si tiene auto de pliego / formulación de cargos pero aún no tenía vencimiento calculado
      if (!fechaVencimientoEtapaActual && autoPliego && !isInhibido && !isArchivado) {
        const fAprob = fechaAprobacionAuto(autoPliego);
        if (fAprob) {
          const resultado = await this.terminosCalculatorService.calculateVencimientoEtapa(
            'JUZGAMIENTO',
            new Date(fAprob),
          );
          fechaVencimientoEtapaActual = resultado.fechaVencimiento;
        }
      }

      // Si no se pudo calcular por falta de actuaciones pero el proceso tiene fechaVencimientoEtapa registrada:
      if (!fechaVencimientoEtapaActual && process.fechaVencimientoEtapa && !isInhibido && !isArchivado) {
        fechaVencimientoEtapaActual = new Date(process.fechaVencimientoEtapa);
      }

      let decisionTexto = '';
      if (isInhibido) {
        decisionTexto = 'Auto Inhibitorio';
      } else if (isArchivado) {
        decisionTexto = 'Auto de Archivo';
      } else if (
        autoPliego ||
        process.etapaActual === ProcessStage.JUZGAMIENTO ||
        (process as any).etapaActual === 'JUZGAMIENTO'
      ) {
        decisionTexto = 'Formulación de Cargos';
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
        21: fechaEntradaEvaluacion || fechaAprobacionAuto(autoCierre),
        23: decisionTexto,
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

      // Columna 20 (T): Fecha Vencimiento IP ID y P
      const vencimientoEtapaLiteral = fechaVencimientoEtapaActual
        ? `DATE(${fechaVencimientoEtapaActual.getFullYear()},${fechaVencimientoEtapaActual.getMonth() + 1},${fechaVencimientoEtapaActual.getDate()})`
        : '""';
      worksheet.getCell(r, 20).value = {
        formula: `IF(Q${r}="SI",EDATE(R${r},S${r}),${vencimientoEtapaLiteral})`,
        result: autoProrroga ? undefined : (fechaVencimientoEtapaActual || undefined),
      } as any;

      // Columna 22 (V): Fecha Vencimiento Evaluacion ID
      if (fechaVencimientoEvaluacion) {
        const fvLiteral = `DATE(${fechaVencimientoEvaluacion.getFullYear()},${fechaVencimientoEvaluacion.getMonth() + 1},${fechaVencimientoEvaluacion.getDate()})`;
        worksheet.getCell(r, 22).value = {
          formula: `IF(U${r}="","",${fvLiteral})`,
          result: fechaVencimientoEvaluacion,
        } as any;
      } else {
        worksheet.getCell(r, 22).value = null;
      }

      // Columna 24 (X): Vencimientos (Última Columna)
      // Se calcula el estado precalculado para visualización inmediata y semaforización
      const esCargos =
        !isInhibido &&
        !isArchivado &&
        (decisionTexto === 'Formulación de Cargos' ||
          decisionTexto === 'Pliego de Cargos' ||
          Boolean(autoPliego) ||
          process.etapaActual === ProcessStage.JUZGAMIENTO ||
          (process as any).etapaActual === 'JUZGAMIENTO' ||
          etapaLabel === '05 CARGOS' ||
          etapaLabel === 'CARGOS');

      const fechaRefCargos =
        fechaVencimientoEtapaActual ||
        fechaVencimientoEvaluacion ||
        (process.fechaVencimientoEtapa ? new Date(process.fechaVencimientoEtapa) : null);

      let resultadoVencimiento = 'Sin datos';
      if (isInhibido) {
        resultadoVencimiento = 'INHIBIDO';
      } else if (isArchivado) {
        resultadoVencimiento = 'ARCHIVADO';
      } else if (esCargos) {
        if (!fechaRefCargos) {
          resultadoVencimiento = 'CARGOS - Sin datos';
        } else {
          const hoyDate = new Date(y, m - 1, d);
          const fvDate = new Date(fechaRefCargos);
          fvDate.setHours(0, 0, 0, 0);
          if (fvDate < hoyDate) {
            resultadoVencimiento = 'CARGOS - VENCIDO';
          } else {
            const diasHabiles = calculateNetworkDays(hoyDate, fvDate);
            resultadoVencimiento =
              diasHabiles <= umbralDias + 1
                ? 'CARGOS - ETAPA POR VENCER'
                : 'CARGOS - EN TÉRMINOS';
          }
        }
      } else if (process.etapaActual === 'EVALUACION') {
        if (!fechaVencimientoEvaluacion) {
          resultadoVencimiento = 'Sin datos';
        } else {
          const hoyDate = new Date(y, m - 1, d);
          const fvDate = new Date(fechaVencimientoEvaluacion);
          fvDate.setHours(0, 0, 0, 0);
          if (fvDate < hoyDate) {
            resultadoVencimiento = 'VENCIDO';
          } else {
            const diasHabiles = calculateNetworkDays(hoyDate, fvDate);
            resultadoVencimiento = diasHabiles <= umbralDias + 1 ? 'ETAPA POR VENCER' : 'EN TÉRMINOS';
          }
        }
      } else {
        if (!fechaVencimientoEtapaActual) {
          resultadoVencimiento = 'Sin datos';
        } else {
          const hoyDate = new Date(y, m - 1, d);
          const fvDate = new Date(fechaVencimientoEtapaActual);
          fvDate.setHours(0, 0, 0, 0);
          if (fvDate < hoyDate) {
            resultadoVencimiento = 'VENCIDO';
          } else {
            const diasHabiles = calculateNetworkDays(hoyDate, fvDate);
            resultadoVencimiento = diasHabiles <= umbralDias + 1 ? 'ETAPA POR VENCER' : 'EN TÉRMINOS';
          }
        }
      }

      // La fórmula contempla ARCHIVADO, INHIBIDO, Formulación de Cargos (CARGOS), Evaluación y demás etapas
      const formulaVencimientos =
        `IF(OR(F${r}="ARCHIVADO",F${r}="06 ARCHIVADO",W${r}="Auto de Archivo"),"ARCHIVADO",` +
        `IF(OR(F${r}="INHIBIDO",F${r}="INHIBITORIO",F${r}="00 INHIBITORIO",W${r}="Auto Inhibitorio"),"INHIBIDO",` +
        `IF(OR(W${r}="Formulación de Cargos",W${r}="Pliego de Cargos",F${r}="05 CARGOS",F${r}="CARGOS"),` +
        `IF(IF(T${r}<>"",T${r},V${r})="","CARGOS - Sin datos",` +
        `IF(IF(T${r}<>"",T${r},V${r})<DATE(${y},${m},${d}),"CARGOS - VENCIDO",` +
        `IF(NETWORKDAYS(DATE(${y},${m},${d}),IF(T${r}<>"",T${r},V${r}))<=${umbralDias + 1},"CARGOS - ETAPA POR VENCER","CARGOS - EN TÉRMINOS"))),` +
        `IF(OR(F${r}="04 EVALUACIÓN ID",F${r}="EVALUACION",F${r}="EVALUACIÓN"),` +
        `IF(IF(V${r}<>"",V${r},T${r})="","Sin datos",` +
        `IF(IF(V${r}<>"",V${r},T${r})<DATE(${y},${m},${d}),"VENCIDO",` +
        `IF(NETWORKDAYS(DATE(${y},${m},${d}),IF(V${r}<>"",V${r},T${r}))<=${umbralDias + 1},"ETAPA POR VENCER","EN TÉRMINOS"))),` +
        `IF(T${r}="","Sin datos",` +
        `IF(T${r}<DATE(${y},${m},${d}),"VENCIDO",` +
        `IF(NETWORKDAYS(DATE(${y},${m},${d}),T${r})<=${umbralDias + 1},"ETAPA POR VENCER","EN TÉRMINOS"))))))`;

      const cellX = worksheet.getCell(r, 24);
      cellX.value = {
        formula: formulaVencimientos,
        result: resultadoVencimiento,
      } as any;

      // Colorear celda directamente según formato (semaforización visual en descarga)
      const styleVencimiento = SEMAFORO_STYLES[resultadoVencimiento] || SEMAFORO_STYLES['Sin datos'];
      cellX.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: styleVencimiento.fill },
      };
      cellX.font = {
        color: { argb: styleVencimiento.font },
        bold: styleVencimiento.bold,
      };
      cellX.alignment = { horizontal: 'center', vertical: 'middle' };

      // Estilo de Columna 6 (Estado)
      const cellF = worksheet.getCell(r, 6);
      if (isInhibido) {
        cellF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
        cellF.font = { color: { argb: 'FF5B21B6' }, bold: true };
      } else if (isArchivado) {
        cellF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cellF.font = { color: { argb: 'FF334155' }, bold: true };
      }

      DATE_COLUMNS.forEach((col) => {
        worksheet.getCell(r, col).numFmt = 'dd/mm/yyyy';
      });
    }

    // Reglas de formato condicional en columna "Vencimientos" (X, la última)
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
            text: 'ARCHIVADO',
            priority: 4,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
              font: { color: { argb: 'FF334155' }, bold: true },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'INHIBIDO',
            priority: 5,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } },
              font: { color: { argb: 'FF5B21B6' }, bold: true },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'Sin datos',
            priority: 6,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
              font: { color: { argb: 'FF6B7280' } },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'CARGOS',
            priority: 7,
            style: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
              font: { color: { argb: 'FF92400E' }, bold: true },
            },
          },
        ],
      });
    }

    return workbook;
  }
}
