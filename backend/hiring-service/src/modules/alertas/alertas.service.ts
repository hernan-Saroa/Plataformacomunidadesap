import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AlcanceService } from '../../auth/alcance.service';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_PROCESO_VER_TODOS, tienePermiso } from '../../auth/permisos';
import { CadenaAprobacionService } from '../cadena-aprobacion/cadena-aprobacion.service';
import { NOMBRE_TIPO } from '../modificaciones/reglas-por-tipo';
import { Campana } from '../notificaciones/campana';
import { plazoDeActividad } from './plazos-actividad';
import {
  ClaveParametroAlerta,
  PARAMETROS_POR_DEFECTO,
  ParametrosAlertaService,
} from './parametros-alerta.service';

/** De qué parámetro sale la anticipación de cada vencimiento. */
const ANTICIPACION_DE: Record<string, ClaveParametroAlerta> = {
  AMPARO: 'anticipacion_amparo',
  CDP: 'anticipacion_cdp',
  REGISTRO_PRESUPUESTAL: 'anticipacion_rp',
  LIQUIDACION: 'anticipacion_liquidacion',
};

/** Cuántos días antes se avisa, si nadie lo dice. */
export const ANTICIPACION_POR_DEFECTO = 30;

/**
 * Días que un proceso puede estar recibido y sin abogado antes de alertar.
 *
 * Dos, y no los treinta de los vencimientos: aquello anticipa una fecha que
 * todavía no llegó —una póliza que vence el mes que viene—, y esto cuenta un
 * proceso que ya está parado. Un expediente sin quien lo revise durante una
 * semana no es una advertencia temprana, es trabajo detenido.
 *
 * Se dejan dos y no cero para no alarmar por el hueco normal entre recibir el
 * proceso y sentarse a repartirlo.
 */
export const TOLERANCIA_SIN_RESPONSABLE = 2;

/**
 * Plazo legal para liquidar de común acuerdo: cuatro meses desde que el
 * contrato terminó (Ley 1150 de 2007, art. 11).
 */
export const MESES_LIQUIDACION_BILATERAL = 4;

export type EstadoAlerta = 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';

export type TipoAlerta =
  | 'AMPARO'
  | 'CDP'
  | 'REGISTRO_PRESUPUESTAL'
  | 'LIQUIDACION'
  /**
   * Una actividad esperando que la apruebe quien está leyendo (EFDS-1183).
   *
   * Va en la misma lista que los vencimientos y no en una pantalla aparte: son
   * las dos cosas que le reclaman atención al usuario, y separarlas lo
   * obligaría a mirar en dos sitios para saber qué le espera.
   */
  | 'APROBACION_PENDIENTE'
  /**
   * Una actividad devuelta, hacia quien tiene que corregirla (EFDS-1183).
   *
   * Sin esto la devolución no le llegaba a nadie: se veía solo entrando al
   * panel de la actividad, así que quien la trabajó podía tardar días en
   * enterarse de que se la habían rechazado. El aprobador sí recibía su aviso;
   * el camino de vuelta no existía.
   */
  | 'DEVUELTA_PARA_CORREGIR'
  /**
   * Un proceso recibido en la Dirección al que nadie revisa (EFDS-1183).
   *
   * No debería pasar, pero quitar un abogado sin poner otro es una situación
   * real, y también lo es tomar el proceso y olvidarse de repartirlo. Mientras
   * dure, la 3.4 no la puede resolver nadie: el proceso está parado y no lo
   * dice ninguna pantalla salvo la suya.
   */
  | 'SIN_RESPONSABLE'
  /**
   * Una actividad con plazo que está por vencer o ya se venció (EFDS-1183).
   *
   * Sus días se cuentan hábiles, no calendario como los demás: así se acordó
   * para los plazos de las actividades.
   */
  | 'PLAZO_ACTIVIDAD';

/** Algo que espera la decisión de quien consulta (bandeja «Por revisar»). */
export interface ElementoPorRevisar {
  /**
   * Qué se decide. El estudio previo y la modalidad los decide el abogado del
   * proceso; la actividad, quien nombra su regla de aprobación; y las pólizas,
   * las modificaciones y las cuentas de cobro se deciden una por una dentro de
   * su actividad.
   */
  tipo: 'ESTUDIO_PREVIO' | 'ACTIVIDAD' | 'GARANTIA' | 'MODIFICACION' | 'PAGO' | 'REVISION_PAA';
  /** Cuál de ellas, cuando la actividad tiene varias: «Póliza 123 · Seguros X». */
  detalle: string | null;
  /**
   * Qué abrir cuando el proceso y el numeral no bastan: la revisión del PAA,
   * que no es una actividad del riel sino una decisión sobre el proceso.
   */
  referencia: string | null;
  procesoId: string;
  radicado: string | null;
  objeto: string;
  modalidad: string | null;
  numeral: string;
  actividad: string;
  etapa: number;
  version: number | null;
  enviadoPor: string | null;
  desde: string;
  diasEsperando: number;
  /**
   * En qué escalón espera, cuando la actividad se aprueba por una cadena
   * (migración 101): «Escalón 2 de 4 · Coordinador». Nulo en lo demás.
   */
  escalon?: { orden: number; de: number; nombre: string } | null;
}

/** Una actividad cuyo plazo aprieta o ya pasó. */
export interface PlazoDeActividad {
  procesoId: string;
  radicado: string | null;
  numeral: string;
  nombre: string;
  vence: string;
  /** Días hábiles; negativo cuando ya se venció. */
  restantes: number;
  estado: 'VENCIDO' | 'POR_VENCER';
}

/**
 * Días que faltan para la fecha. Negativo si ya pasó.
 *
 * Se calcula sobre fechas sin hora: un amparo que vence hoy vence hoy entero,
 * y restar milisegundos haría que a las 15:00 dijera que faltan 0,3 días.
 */
export function diasParaVencer(fecha: string, hoy: string): number {
  const unDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(fecha) - Date.parse(hoy)) / unDia);
}

/** En qué punto está la alerta según los días que falten. */
export function estadoAlerta(dias: number, anticipacion: number): EstadoAlerta {
  if (dias < 0) return 'VENCIDO';
  if (dias <= anticipacion) return 'POR_VENCER';
  return 'VIGENTE';
}

/**
 * Hasta cuándo se puede liquidar de común acuerdo.
 *
 * Se cuenta en meses y no en días para que caiga en el mismo día del mes, que
 * es como está redactado el plazo legal.
 */
export function limiteLiquidacion(fechaTerminacion: string): string {
  const fecha = new Date(`${fechaTerminacion}T00:00:00Z`);
  const dia = fecha.getUTCDate();

  fecha.setUTCDate(1);
  fecha.setUTCMonth(fecha.getUTCMonth() + MESES_LIQUIDACION_BILATERAL);

  // El día se fija después de mover el mes y sin pasarse del último: sumarle
  // cuatro meses al 31 de octubre daría «31 de febrero», que JavaScript
  // desborda a marzo y correría el plazo tres días a favor de la entidad.
  const ultimoDelMes = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0),
  ).getUTCDate();
  fecha.setUTCDate(Math.min(dia, ultimoDelMes));

  return fecha.toISOString().slice(0, 10);
}

/**
 * El CDP y el RP se imputan a una vigencia fiscal, no a una fecha: valen hasta
 * el 31 de diciembre de ese año.
 */
export function finDeVigenciaFiscal(anio: number): string {
  return `${anio}-12-31`;
}

export interface Alerta {
  tipo: TipoAlerta;
  procesoId: string;
  radicado: string | null;
  contrato: string | null;
  descripcion: string;
  vence: string;
  diasRestantes: number;
  estado: EstadoAlerta;
  responsable: string | null;
  responsableEmail: string | null;
  /** `id_person` del supervisor vigente; a él va la notificación. */
  responsableId: string | null;
}

/**
 * Alertas de vencimiento (EFDS-1185, RF-SIS-03).
 *
 * No hay tabla de alertas: se calculan al consultar. Guardarlas duplicaría la
 * fecha que ya vive en el amparo o el CDP, y una copia se desincroniza en
 * cuanto alguien renueva la póliza.
 */
@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly parametros?: ParametrosAlertaService,
    /**
     * Quién puede aprobar pólizas, decidir modificaciones o ratificar la
     * modalidad: la matriz de permisos, la misma que consultan los guards.
     */
    @Optional() private readonly alcance?: AlcanceService,
    /**
     * Quién decide cada escalón (migración 101). Opcional como los demás, para
     * que las pruebas que construyen el servicio a mano sigan funcionando con
     * solo la fuente de datos.
     */
    @Optional() cadenas?: CadenaAprobacionService,
  ) {
    this.cadenas = cadenas ?? new CadenaAprobacionService(dataSource);
  }

  private readonly cadenas: CadenaAprobacionService;

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /** Los plazos configurados, o los de siempre si no hay servicio de parámetros. */
  private async plazos(): Promise<Record<ClaveParametroAlerta, number>> {
    if (this.parametros) return this.parametros.valores();
    return Object.fromEntries(PARAMETROS_POR_DEFECTO.map((p) => [p.clave, p.valor])) as Record<
      ClaveParametroAlerta,
      number
    >;
  }

  /**
   * Todo lo que vence dentro de la anticipación, y lo ya vencido.
   *
   * `anticipacion` en `null` usa la configurada para cada tipo de vencimiento;
   * con un número, la pantalla la fija igual para todos, que es lo que hace el
   * selector de 15, 30, 60 o 90 días.
   *
   * Una sola consulta por tipo y no una por proceso: quien vigila los
   * vencimientos los mira todos juntos, no proceso por proceso.
   */
  async listar(anticipacion: number | null, acceso: HiringAccess): Promise<Alerta[]> {
    const hoy = this.hoy();
    const plazos = await this.plazos();
    const anticipacionDe = (tipo: string) =>
      anticipacion ?? plazos[ANTICIPACION_DE[tipo]] ?? ANTICIPACION_POR_DEFECTO;

    const [
      amparos,
      presupuestales,
      liquidaciones,
      aprobaciones,
      devueltas,
      sinResponsable,
      plazosActividad,
    ] = await Promise.all([
      this.amparosPorVencer(),
      this.respaldosPorVencer(),
      this.liquidacionesPendientes(),
      this.aprobacionesPendientes(acceso),
      this.devueltasParaCorregir(acceso),
      this.procesosSinResponsable(hoy, plazos.tolerancia_sin_abogado, acceso),
      this.plazosDeActividades(acceso),
    ]);

    const conPlazo: Alerta[] = plazosActividad.map((p) => ({
      tipo: 'PLAZO_ACTIVIDAD' as const,
      procesoId: p.procesoId,
      radicado: p.radicado,
      contrato: null,
      descripcion: `${p.numeral} · ${p.nombre}`,
      vence: p.vence,
      diasRestantes: p.restantes,
      estado: p.estado,
      responsable: null,
      responsableEmail: null,
      responsableId: null,
    }));

    const vencimientos = [...amparos, ...presupuestales, ...liquidaciones]
      .map((fila) => {
        // pg devuelve las columnas `date` como Date; aquí todo es AAAA-MM-DD.
        const vence =
          typeof fila.vence === 'string'
            ? fila.vence.slice(0, 10)
            : new Date(fila.vence).toISOString().slice(0, 10);
        const diasRestantes = diasParaVencer(vence, hoy);
        return {
          ...fila,
          vence,
          diasRestantes,
          estado: estadoAlerta(diasRestantes, anticipacionDe(fila.tipo)),
        };
      })
      .filter((a) => a.estado !== 'VIGENTE');

    return [...aprobaciones, ...devueltas, ...sinResponsable, ...conPlazo, ...vencimientos]
      // Lo más urgente primero: lo vencido arriba, y dentro de eso lo que lleva
      // más tiempo vencido. Las aprobaciones usan el mismo número en negativo
      // —los días que llevan esperando—, así que una que lleva una semana sin
      // resolverse sube por encima de una póliza que vence dentro de un mes.
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }

  /**
   * Actividades esperando la aprobación de quien consulta (EFDS-1183).
   *
   * Solo las suyas: se cruzan las reglas `EXIGE_APROBACION` vigentes con los
   * roles del usuario y con su id, que es como la configuración declara a los
   * aprobadores. Ver las de los demás no le sirve de nada y le escondería las
   * propias.
   *
   * Incluidas las que él mismo envió: si tiene el rol, las aprueba. Antes se
   * excluían, y en las actividades que ejecuta la propia Dirección de
   * Contratación eso las dejaba sin nadie a quien ofrecérselas.
   */
  /**
   * Actividades devueltas a quien las trabajó, para que las corrija.
   *
   * El destinatario es quien la envió y no quien la radicó: es a él a quien se
   * le pidió el cambio. Mientras el reparto de la 3.4 no exista no hay un
   * «responsable asignado» al que avisar, así que se usa el único dato cierto.
   *
   * Sin `enviado_por_id` no aparece: era el caso de casi todas las actividades
   * hasta que se corrigió la entidad, que no declaraba la columna y hacía que
   * TypeORM la descartara al guardar.
   */
  private async devueltasParaCorregir(
    acceso: HiringAccess,
  ): Promise<Omit<Alerta, never>[]> {
    if (!acceso.userId) return [];

    const filas = await this.dataSource.query(
      `
      SELECT p.id           AS proceso_id,
             p.radicado     AS radicado,
             pa.numeral     AS numeral,
             a.nombre       AS actividad,
             pa.revisado_por AS revisado_por,
             pa.updated_at  AS desde
        FROM hiring.proceso_actividades pa
        JOIN hiring.procesos p ON p.id = pa.proceso_id
        JOIN hiring.actividades a ON a.numeral = pa.numeral
       WHERE pa.estado = 'DEVUELTO'
         AND pa.enviado_por_id = $1
       ORDER BY pa.updated_at ASC
      `,
      [acceso.userId],
    );

    return filas.map((f: any) => {
      const desde = f.desde instanceof Date ? f.desde : new Date(f.desde);
      const diasEsperando = Math.floor((Date.now() - desde.getTime()) / (24 * 60 * 60 * 1000));

      return {
        tipo: 'DEVUELTA_PARA_CORREGIR' as TipoAlerta,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: null,
        descripcion: `${f.numeral} · ${f.actividad}`,
        vence: desde.toISOString().slice(0, 10),
        // En negativo, como las aprobaciones: los días que lleva sin corregirse
        // la suben en la lista.
        diasRestantes: -diasEsperando,
        estado: 'POR_VENCER' as EstadoAlerta,
        // Quien la devolvió, que es de quien vino la petición de corregir.
        responsable: f.revisado_por ?? null,
        responsableEmail: null,
        responsableId: acceso.userId || null,
      };
    });
  }

  /**
   * Las actividades enviadas que quien consulta puede aprobar.
   *
   * Una sola consulta para la alerta y para la bandeja «Por revisar»: si cada
   * una decidiera por su cuenta quién aprueba, acabarían contando cosas
   * distintas sobre lo mismo.
   */
  private filasPorAprobar(acceso: HiringAccess): Promise<any[]> {
    // El escalón que espera a quien consulta, con la misma regla con que la
    // cadena le deja decidir (migración 101).
    return this.cadenas.filasPorDecidir(acceso);
  }

  private async aprobacionesPendientes(
    acceso: HiringAccess,
  ): Promise<Omit<Alerta, never>[]> {
    // DISTINCT ON exige ordenar por la fila; el orden de la lista se pone aquí.
    const filas = (await this.filasPorAprobar(acceso)).sort(
      (a: any, b: any) => new Date(a.desde).getTime() - new Date(b.desde).getTime(),
    );

    return filas.map((f: any) => {
      const desde = f.desde instanceof Date ? f.desde : new Date(f.desde);
      const diasEsperando = Math.floor((Date.now() - desde.getTime()) / (24 * 60 * 60 * 1000));

      return {
        tipo: 'APROBACION_PENDIENTE' as TipoAlerta,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: null,
        descripcion: `${f.numeral} · ${f.actividad}`,
        vence: desde.toISOString().slice(0, 10),
        // En negativo, como lo vencido: es lo que la ordena arriba y crece con
        // los días que lleva esperando.
        diasRestantes: -diasEsperando,
        estado: 'POR_VENCER' as EstadoAlerta,
        responsable: f.enviado_por ?? null,
        responsableEmail: null,
        /*
         * A quien consulta, que es justamente quien tiene que resolverla: la
         * consulta ya filtra por su rol aprobador y descarta lo que él mismo
         * envió. Sin esto la alerta se veía en pantalla pero nunca se
         * notificaba, porque `notificar` descarta lo que no tiene
         * destinatario, y la aprobación llegaba solo si el usuario entraba a
         * mirar.
         *
         * `id_user` y no `id_person`: la campana del portal consulta
         * `/users/:id/notifications` con el id de la cuenta —es lo que el shell
         * guarda en sesión—, así que una notificación escrita contra la persona
         * queda en la base sin que nadie la vea. Es lo que mandan también el
         * plan de trabajo académico y control disciplinario.
         */
        responsableId: acceso.userId || null,
      };
    });
  }

  /**
   * Lo que quien consulta tiene por revisar: la bandeja «Por revisar».
   *
   * Dos fuentes y una sola lista, como la «Revisión y Aprobación» del módulo
   * disciplinario: quien revisa ve de una vez todo lo que espera su decisión,
   * sin entrar proceso por proceso.
   *
   * Las actividades con aprobación configurada, con la misma consulta que la
   * alerta. El estudio previo (3.1) también: desde la 109 su revisión es
   * siempre una ronda de su aprobación —quizá del puesto Abogado—, y no un
   * camino aparte del abogado repartido.
   *
   * Desde que solo se decide en la pantalla de revisión entran también las
   * decisiones que no salen de una regla de aprobación: la modalidad (3.5), que
   * ratifica el abogado como la 3.1, y las que se toman una por una dentro de
   * su actividad —cada póliza (8.4), cada modificación (9.5), cada cuenta de
   * cobro (9.4)—. Sin ellas, quien tenía que decidir no tenía cómo enterarse.
   */
  async porRevisar(acceso: HiringAccess): Promise<ElementoPorRevisar[]> {
    const aprobaciones = await this.filasPorAprobar(acceso);

    const aElemento = (tipo: ElementoPorRevisar['tipo']) => (f: any): ElementoPorRevisar => {
      const desde = f.desde instanceof Date ? f.desde : new Date(f.desde);
      return {
        tipo,
        detalle: f.detalle ?? null,
        referencia: f.referencia ?? null,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        objeto: f.objeto,
        modalidad: f.modalidad ?? null,
        numeral: f.numeral,
        actividad: f.actividad,
        etapa: Number(f.etapa),
        version: f.version === null || f.version === undefined ? null : Number(f.version),
        enviadoPor: f.enviado_por ?? null,
        desde: desde.toISOString(),
        diasEsperando: Math.max(0, Math.floor((Date.now() - desde.getTime()) / 86_400_000)),
        escalon:
          f.escalon !== undefined && f.escalon !== null
            ? { orden: Number(f.escalon), de: Number(f.escalones), nombre: f.escalon_nombre }
            : null,
      };
    };

    const [garantias, modificaciones, pagos, revisionesPaa] = await Promise.all([
      this.garantiasPorAprobar(acceso),
      this.modificacionesPorDecidir(acceso),
      this.pagosPorAvalar(acceso),
      this.revisionesDelPaa(acceso),
    ]);

    return [

      // La 3.1 por cadena se abre en la revisión del estudio previo.
      ...aprobaciones.map((f: any) => aElemento(f.numeral === '3.1' ? 'ESTUDIO_PREVIO' : 'ACTIVIDAD')(f)),
      ...garantias.map(aElemento('GARANTIA')),
      ...modificaciones.map(aElemento('MODIFICACION')),
      ...pagos.map(aElemento('PAGO')),
      ...revisionesPaa.map(aElemento('REVISION_PAA')),
    ]
      // Lo que más lleva esperando, arriba.
      .sort((a, b) => b.diasEsperando - a.diasEsperando || a.desde.localeCompare(b.desde));
  }

  /**
   * Revisiones abiertas por un cambio del Plan Anual de Adquisiciones.
   *
   * Las decide quien tenga `decidir` en `PAA.R` (109): ya no hay un abogado
   * del proceso que responda por ellas.
   */
  private async revisionesDelPaa(acceso: HiringAccess): Promise<any[]> {
    const bandeja = !!this.alcance && (await this.alcance.puedeEn(acceso, 'decidir', 'PAA.R'));
    if (!bandeja) return [];

    return this.dataSource.query(
      `
      SELECT p.id           AS proceso_id,
             p.radicado     AS radicado,
             p.objeto       AS objeto,
             m.nombre       AS modalidad,
             '3.1'          AS numeral,
             CASE r.tipo
               WHEN 'CAMBIO_VIGENCIA' THEN 'Evaluación por cambio de vigencia del PAA'
               WHEN 'ELIMINACION' THEN 'Línea retirada del PAA'
               ELSE 'Línea modificada en el PAA'
             END            AS actividad,
             p.etapa        AS etapa,
             NULL           AS version,
             NULL           AS enviado_por,
             r.codigo || CASE WHEN r.bloquea THEN ' · detiene el proceso' ELSE '' END AS detalle,
             r.id::text     AS referencia,
             r.created_at   AS desde
        FROM hiring.paa_revisiones r
        JOIN hiring.procesos p ON p.id = r.proceso_id
        LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
       WHERE r.estado = 'PENDIENTE'
      `,
    );
  }

  /**
   * Pólizas cargadas que esperan aprobación (8.4).
   *
   * Las aprueba quien tiene el permiso en el punto, menos quien las cargó: es
   * la regla de `LegalizacionService.aprobarGarantia`, que responde 403.
   */
  private async garantiasPorAprobar(acceso: HiringAccess): Promise<any[]> {
    if (!this.alcance || !(await this.alcance.puedeEn(acceso, 'aprobar', '8.4'))) return [];

    return this.dataSource.query(
      `
      SELECT p.id           AS proceso_id,
             p.radicado     AS radicado,
             p.objeto       AS objeto,
             m.nombre       AS modalidad,
             a.numeral      AS numeral,
             a.nombre       AS actividad,
             a.etapa        AS etapa,
             NULL           AS version,
             g.cargada_por  AS enviado_por,
             g.created_at   AS desde,
             'Póliza ' || g.numero_poliza || ' · ' || g.aseguradora AS detalle
        FROM hiring.garantias g
        JOIN hiring.contratos c ON c.id = g.contrato_id
        JOIN hiring.procesos p ON p.id = c.proceso_id
        JOIN hiring.actividades a ON a.numeral = '8.4'
        LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
       WHERE g.estado = 'CARGADA'
         AND (g.cargada_por IS NULL OR g.cargada_por <> $1)
      `,
      [acceso.userName ?? ''],
    );
  }

  /**
   * Modificaciones en trámite que ya se pueden decidir (9.5).
   *
   * La adición no se aprueba sin su CDP y su RP expedidos
   * (`ModificacionesService.respaldoPendiente`): mientras los espera la tiene
   * Financiera y no quien decide, así que todavía no entra a su bandeja.
   */
  private async modificacionesPorDecidir(acceso: HiringAccess): Promise<any[]> {
    if (!this.alcance || !(await this.alcance.puedeEn(acceso, 'decidir', '9.5'))) return [];

    const filas = await this.dataSource.query(
      `
      SELECT p.id           AS proceso_id,
             p.radicado     AS radicado,
             p.objeto       AS objeto,
             m.nombre       AS modalidad,
             a.numeral      AS numeral,
             a.nombre       AS actividad,
             a.etapa        AS etapa,
             NULL           AS version,
             NULL           AS enviado_por,
             mc.created_at  AS desde,
             mc.tipo        AS tipo_modificacion
        FROM hiring.modificaciones_contrato mc
        JOIN hiring.contratos c ON c.id = mc.contrato_id
        JOIN hiring.procesos p ON p.id = c.proceso_id
        JOIN hiring.actividades a ON a.numeral = '9.5'
        LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
       WHERE mc.estado = 'EN_TRAMITE'
         AND (
           mc.tipo <> 'ADICION'
           OR (
             EXISTS (SELECT 1 FROM hiring.cdp x
                      WHERE x.modificacion_id = mc.id AND x.estado = 'EXPEDIDO')
             AND EXISTS (SELECT 1 FROM hiring.registros_presupuestales x
                          WHERE x.modificacion_id = mc.id AND x.estado = 'EXPEDIDO')
           )
         )
      `,
    );
    return filas.map((f: any) => ({
      ...f,
      detalle: NOMBRE_TIPO[f.tipo_modificacion as keyof typeof NOMBRE_TIPO] ?? f.tipo_modificacion,
    }));
  }

  /**
   * Cuentas de cobro radicadas que esperan el aval (9.4).
   *
   * Las avala el supervisor vigente del contrato, no un rol: es la regla de
   * `PagosService.exigirSupervisor`, por persona o por nombre de cuenta.
   */
  private pagosPorAvalar(acceso: HiringAccess): Promise<any[]> {
    const nombre = (acceso.userName ?? '').trim();
    const id = (acceso.userId ?? '').trim();
    if (!nombre && !id) return Promise.resolve([]);

    return this.dataSource.query(
      `
      SELECT p.id            AS proceso_id,
             p.radicado      AS radicado,
             p.objeto        AS objeto,
             m.nombre        AS modalidad,
             a.numeral       AS numeral,
             a.nombre        AS actividad,
             a.etapa         AS etapa,
             NULL            AS version,
             pg.radicado_por AS enviado_por,
             pg.radicado_at  AS desde,
             'Cuenta de cobro N.º ' || pg.numero AS detalle
        FROM hiring.pagos_contrato pg
        JOIN hiring.contratos c ON c.id = pg.contrato_id
        JOIN hiring.procesos p ON p.id = c.proceso_id
        JOIN hiring.supervisiones_contrato s
              ON s.contrato_id = c.id
             AND s.estado = 'VIGENTE'
        JOIN hiring.actividades a ON a.numeral = '9.4'
        LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
       WHERE pg.estado = 'RADICADO'
         AND (
           ($1 <> '' AND s.nombre = $1)
           OR ($2 <> '' AND s.persona_id::text = $2)
         )
      `,
      [nombre, id],
    );
  }

  /**
   * Las actividades con plazo que están por vencer o ya se vencieron.
   *
   * El plazo corre desde que la actividad se habilitó —cuando le tocó a
   * alguien— y solo mientras nadie la ha entregado: en borrador o devuelta.
   * Enviada a aprobación ya se entregó, y lo que tarde quien aprueba no es
   * plazo de quien la hizo.
   *
   * Cada usuario ve las de los procesos donde participa; quien ve todos los
   * procesos, todas. Sin usuario —el aviso diario— se traen todas, porque cada
   * aviso sale después a quien corresponde.
   */
  async plazosDeActividades(acceso?: HiringAccess): Promise<PlazoDeActividad[]> {
    const hoy = this.hoy();
    const todos = !acceso?.userId || tienePermiso(acceso, PERMISO_PROCESO_VER_TODOS);

    let filas: any[];
    try {
      filas = await this.dataSource.query(
        `SELECT h.proceso_id::text AS "procesoId",
                p.radicado,
                a.numeral,
                a.nombre,
                a.plazo_dias AS "plazoDias",
                a.alerta_dias_antes AS "avisarAntes",
                to_char(h.avisado_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS desde
           FROM hiring.avisos_habilitacion h
           JOIN hiring.actividades a ON a.numeral = h.numeral AND a.plazo_dias > 0
           JOIN hiring.procesos p ON p.id = h.proceso_id AND p.estado = 'EN_CURSO'
           LEFT JOIN hiring.proceso_actividades pa
                  ON pa.proceso_id = h.proceso_id AND pa.numeral = h.numeral
          WHERE COALESCE(pa.estado, 'BORRADOR') IN ('BORRADOR', 'DEVUELTO')
            AND ($1 = true OR EXISTS (
                  SELECT 1 FROM hiring.participaciones_proceso pp
                   WHERE pp.proceso_id = p.id
                     AND pp.estado = 'VIGENTE'
                     AND pp.usuario_id::text = $2))`,
        [todos, acceso?.userId ?? ''],
      );
    } catch (error: any) {
      // Sin la tabla de habilitaciones no hay desde cuándo contar: la lista
      // sigue sin los plazos, en vez de caerse entera.
      this.logger.warn(`Plazos de actividades no disponibles: ${error.message}`);
      return [];
    }

    return filas
      .map((f) => ({
        procesoId: f.procesoId,
        radicado: f.radicado ?? null,
        numeral: f.numeral,
        nombre: f.nombre,
        ...plazoDeActividad(
          f.desde,
          Number(f.plazoDias),
          f.avisarAntes === null || f.avisarAntes === undefined ? null : Number(f.avisarAntes),
          hoy,
        ),
      }))
      .filter((p): p is PlazoDeActividad => p.estado !== 'VIGENTE');
  }

  /**
   * Procesos recibidos en la Dirección y sin abogado que los revise
   * (EFDS-1183).
   *
   * Dos formas de llegar aquí y la consulta no las distingue porque el efecto
   * es el mismo: se tomó el proceso y no se repartió, o se quitó al abogado sin
   * poner otro. Lo que cuenta es desde cuándo está parado, que es lo más
   * reciente de las dos fechas —cuándo se recibió y cuándo salió el último
   * abogado—.
   *
   * Los que siguen en la bandeja no entran: nadie los ha recibido, así que no
   * hay a quién reclamarle el reparto, y el listado ya los marca como tales.
   *
   * `vence` es la fecha en que se agotó la tolerancia, no un plazo legal: así
   * los días restantes y el estado se calculan como en el resto de la lista, en
   * vez de inventar una segunda forma de ordenar lo urgente.
   */
  private async procesosSinResponsable(
    hoy: string,
    tolerancia: number = TOLERANCIA_SIN_RESPONSABLE,
    acceso?: HiringAccess,
  ): Promise<Alerta[]> {
    /*
     * Solo a quien le toca repartirlo, y a quien ve todos los procesos.
     *
     * Antes lo veía cualquiera con permiso de alertas: el supervisor de un
     * contrato o Financiera recibían en su lista el reparto pendiente de toda
     * la Dirección, que no pueden resolver. Sin usuario —el aviso diario— se
     * traen todos, porque cada uno se envía después a su propio destinatario.
     */
    const todos =
      !acceso?.userId || tienePermiso(acceso, PERMISO_PROCESO_VER_TODOS);

    // Un proceso recibido con un puesto obligatorio vacío (109): una fila por
    // puesto, porque cada uno se resuelve por separado en la 3.3.
    const filas = await this.dataSource.query(
      `SELECT p.id       AS proceso_id,
              p.radicado AS radicado,
              pu.nombre  AS puesto,
              c.usuario_id::text AS responsable_id,
              c.nombre   AS responsable,
              c.email    AS responsable_email,
              GREATEST(
                c.asignado_at,
                COALESCE(
                  (SELECT MAX(a.relevado_at)
                     FROM hiring.asignaciones_puesto a
                    WHERE a.proceso_id = p.id AND a.puesto_id = pu.id),
                  c.asignado_at
                )
              ) AS desde
         FROM hiring.procesos p
         JOIN hiring.participaciones_proceso c
           ON c.proceso_id = p.id AND c.papel = 'CONTRATACION' AND c.estado = 'VIGENTE'
         JOIN hiring.puestos_proceso pu ON pu.activo AND pu.obligatorio
        WHERE p.estado = 'EN_CURSO'
          AND NOT EXISTS (
            SELECT 1 FROM hiring.asignaciones_puesto a
             WHERE a.proceso_id = p.id AND a.puesto_id = pu.id AND a.estado = 'VIGENTE'
          )
          AND ($1 = true OR c.usuario_id::text = $2)
        ORDER BY desde ASC`,
      [todos, acceso?.userId ?? ''],
    );

    return filas
      .map((f: any) => {
        const desde = f.desde instanceof Date ? f.desde : new Date(f.desde);
        const limite = new Date(desde);
        limite.setDate(limite.getDate() + tolerancia);
        const vence = limite.toISOString().slice(0, 10);
        const diasRestantes = diasParaVencer(vence, hoy);

        return {
          tipo: 'SIN_RESPONSABLE' as TipoAlerta,
          procesoId: f.proceso_id,
          radicado: f.radicado,
          contrato: null,
          descripcion: `3.3 · nadie ocupa el puesto ${f.puesto}`,
          vence,
          diasRestantes,
          estado: estadoAlerta(diasRestantes, tolerancia),
          // A quien hay que reclamarle es a quien lo recibió: el reparto es suyo.
          responsable: f.responsable ?? null,
          responsableEmail: f.responsable_email ?? null,
          // Con su cuenta: antes iba en null y el aviso se descartaba sin
          // destinatario, así que el proceso parado no se lo contaba a nadie.
          responsableId: f.responsable_id ?? null,
        };
      })
      // Dentro de la tolerancia no se avisa: es el hueco normal entre recibir
      // el proceso y sentarse a repartirlo.
      .filter((a) => a.estado !== 'VIGENTE');
  }

  /**
   * Criterio 1: pólizas con fecha de vencimiento.
   *
   * Se consultan los amparos y no las garantías porque el desglose de la 8.4
   * existe justo para esto: no todos vencen a la vez.
   */
  private async amparosPorVencer(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const filas = await this.dataSource.query(`
      SELECT p.id            AS proceso_id,
             p.radicado      AS radicado,
             c.numero        AS contrato,
             a.tipo          AS tipo_amparo,
             a.vigencia_hasta AS vence,
             s.persona_id    AS responsable_id,
             s.nombre        AS responsable,
             s.email         AS responsable_email
        FROM hiring.amparos a
        JOIN hiring.garantias g ON g.id = a.garantia_id
        JOIN hiring.contratos c ON c.id = g.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
        LEFT JOIN hiring.supervisiones_contrato s
               ON s.contrato_id = c.id AND s.estado = 'VIGENTE'
       WHERE g.estado = 'APROBADA'
         AND c.estado NOT IN ('RECHAZADO', 'LIQUIDADO', 'CERRADO')
    `);

    return filas.map((f: any) => ({
      tipo: 'AMPARO' as const,
      procesoId: f.proceso_id,
      radicado: f.radicado,
      contrato: f.contrato,
      descripcion: `Amparo de ${f.tipo_amparo}`,
      vence: f.vence,
      responsable: f.responsable,
      responsableEmail: f.responsable_email,
      responsableId: f.responsable_id ?? null,
    }));
  }

  /** Criterio 1: CDP y RP, que valen hasta el cierre de su vigencia fiscal. */
  private async respaldosPorVencer(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const cdps = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, cdp.numero, cdp.vigencia_fiscal
        FROM hiring.cdp cdp
        JOIN hiring.procesos p ON p.id = cdp.proceso_id
       WHERE cdp.estado = 'EXPEDIDO' AND cdp.vigencia_fiscal IS NOT NULL
    `);

    const rps = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, rp.numero, rp.vigencia_fiscal,
             c.numero AS contrato
        FROM hiring.registros_presupuestales rp
        JOIN hiring.contratos c ON c.id = rp.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE rp.estado = 'EXPEDIDO' AND rp.vigencia_fiscal IS NOT NULL
         AND c.estado NOT IN ('RECHAZADO', 'LIQUIDADO', 'CERRADO')
    `);

    return [
      ...cdps.map((f: any) => ({
        tipo: 'CDP' as const,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: null,
        descripcion: `CDP ${f.numero ?? ''} de la vigencia ${f.vigencia_fiscal}`.trim(),
        vence: finDeVigenciaFiscal(f.vigencia_fiscal),
        responsable: null,
        responsableEmail: null,
        responsableId: null,
      })),
      ...rps.map((f: any) => ({
        tipo: 'REGISTRO_PRESUPUESTAL' as const,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        contrato: f.contrato,
        descripcion: `RP ${f.numero ?? ''} de la vigencia ${f.vigencia_fiscal}`.trim(),
        vence: finDeVigenciaFiscal(f.vigencia_fiscal),
        responsable: null,
        responsableEmail: null,
        responsableId: null,
      })),
    ];
  }

  /**
   * Criterio 2: contratos terminados acercándose al plazo de liquidación.
   *
   * La fecha de terminación sale de la modificación que lo terminó; si no la
   * hay —el contrato terminó por vencimiento del plazo— se toma la última
   * actualización del contrato, que es cuando cambió de estado.
   */
  private async liquidacionesPendientes(): Promise<Omit<Alerta, 'diasRestantes' | 'estado'>[]> {
    const filas = await this.dataSource.query(`
      SELECT p.id AS proceso_id, p.radicado, c.numero AS contrato,
             -- terminacion_el y no fecha_efecto: esa columna nunca existió
             -- —la 053 la creó con este nombre— y la consulta reventaba, así
             -- que el endpoint entero respondía 500 desde EFDS-1185.
             COALESCE(m.terminacion_el, c.updated_at::date) AS termino,
             s.persona_id AS responsable_id, s.nombre AS responsable, s.email AS responsable_email
        FROM hiring.contratos c
        JOIN hiring.procesos p ON p.id = c.proceso_id
        LEFT JOIN hiring.modificaciones_contrato m
               ON m.contrato_id = c.id
              AND m.tipo = 'TERMINACION_ANTICIPADA'
              AND m.estado = 'APROBADA'
        LEFT JOIN hiring.supervisiones_contrato s
               ON s.contrato_id = c.id AND s.estado = 'VIGENTE'
       WHERE c.estado = 'TERMINADO'
    `);

    return filas.map((f: any) => ({
      tipo: 'LIQUIDACION' as const,
      procesoId: f.proceso_id,
      radicado: f.radicado,
      contrato: f.contrato,
      descripcion: 'Plazo para liquidar de común acuerdo',
      vence: limiteLiquidacion(
        typeof f.termino === 'string' ? f.termino : f.termino.toISOString().slice(0, 10),
      ),
      responsable: f.responsable,
      responsableEmail: f.responsable_email,
      responsableId: f.responsable_id ?? null,
    }));
  }

  /**
   * Descarta los avisos que el destinatario ya tiene sin leer.
   *
   * La alerta se repite mientras dure lo que la causó: una aprobación tarda
   * días y el cron corre a diario, así que sin esto el aprobador acumulaba un
   * mensaje idéntico por jornada hasta decidirse —y el mismo botón pulsado dos
   * veces dejaba dos copias en la campana.
   *
   * Se compara contra lo no leído y no archivado: una vez leído, volver a
   * avisar es correcto, porque significa que lo vio y sigue sin resolverlo.
   *
   * Se consulta la tabla directamente porque notifications-service no ofrece
   * ninguna ruta para preguntar si un mensaje ya existe, y es de otro equipo.
   * Si la consulta falla se manda igual: un duplicado molesta, perder el aviso
   * no.
   */
  private async sinAvisarYa<T extends { id_usuario_destinatario: string; mensaje: string }>(
    mensajes: T[],
  ): Promise<T[]> {
    if (!mensajes.length) return mensajes;

    try {
      const pendientes = await this.dataSource.query(
        `SELECT id_usuario_destinatario, mensaje
           FROM notifications.notificacion
          WHERE leida = false
            AND archivada = false
            AND id_usuario_destinatario = ANY($1::uuid[])`,
        [[...new Set(mensajes.map((m) => m.id_usuario_destinatario))]],
      );

      const yaEsta = new Set(
        pendientes.map((f: any) => `${f.id_usuario_destinatario}|${f.mensaje}`),
      );

      return mensajes.filter(
        (m) => !yaEsta.has(`${m.id_usuario_destinatario}|${m.mensaje}`),
      );
    } catch (error: any) {
      this.logger.warn(`No se pudo comprobar si el aviso ya existía: ${error.message}`);
      return mensajes;
    }
  }

  /**
   * Avisa al responsable de cada alerta.
   *
   * Se delega en notifications-service, que es de otro equipo y ya lo consume
   * certification-service igual. Best-effort a propósito: si está caído, las
   * alertas se siguen viendo en pantalla y no se pierde el aviso, solo el
   * correo.
   */
  async notificar(anticipacion: number | null, acceso: HiringAccess) {
    // Los plazos de actividad avisan por el motor de avisos, que sabe a quién le
    // toca cada una y si va por correo; aquí saldrían sin destinatario.
    const brutas = (await this.listar(anticipacion, acceso)).filter((a) => a.tipo !== 'PLAZO_ACTIVIDAD');

    const alertas = brutas;

    // Sin destinatario no hay a quién avisar: se cuentan aparte para que el log
    // distinga «no había nada» de «había y nadie tenía responsable».
    const conDestinatario = alertas.filter((a) => a.responsableId);

    if (!conDestinatario.length) {
      return { alertas: alertas.length, notificadas: 0, sinDestinatario: alertas.length };
    }

    /*
     * A la cuenta, no a la persona.
     *
     * El supervisor de un contrato se guarda con su id de persona, pero la
     * campana consulta por cuenta: el aviso de una póliza por vencer quedaba
     * guardado sin que nadie lo viera. Lo que no se reconoce se conserva, porque
     * puede ser ya una cuenta.
     */
    const campana = new Campana(this.dataSource, this.logger);
    for (const alerta of conDestinatario) {
      const [cuenta] = await campana.cuentasDe([alerta.responsableId as string]);
      if (cuenta) alerta.responsableId = cuenta;
    }

    // Un mensaje por tipo y no uno solo: ni la aprobación ni la devolución son
    // vencimientos, y con el texto compartido el aprobador leía «vence en -3
    // días» sobre algo que no vence. Además cada una pide algo distinto —una
    // decidir, otra corregir— y el aviso tiene que decir cuál de las dos.
    const mensajes = conDestinatario.map((a) =>
      a.tipo === 'DEVUELTA_PARA_CORREGIR'
        ? {
            id_usuario_destinatario: a.responsableId as string,
            tipo_notificacion: 'contratacion_devolucion',
            titulo: 'Te devolvieron una actividad para corregir',
            mensaje: `${a.descripcion} del proceso ${a.radicado} fue devuelta${
              a.responsable ? ` por ${a.responsable}` : ''
            }. Corrígela y vuelve a enviarla.`,
          }
        : a.tipo === 'SIN_RESPONSABLE'
        ? {
            // Tenía que tener su propio texto: caía en el de vencimientos y
            // decía «vence en N días del contrato» sobre un proceso sin contrato.
            id_usuario_destinatario: a.responsableId as string,
            tipo_notificacion: 'contratacion_sin_responsable',
            titulo: 'Un proceso tiene un puesto vacío',
            mensaje: `En el proceso ${a.radicado}, ${a.descripcion.replace(/^3\.3 · /, '')} desde hace ${Math.abs(a.diasRestantes)} días. Asígnalo en la 3.3.`,
          }
        : a.tipo === 'APROBACION_PENDIENTE'
        ? {
            id_usuario_destinatario: a.responsableId as string,
            tipo_notificacion: 'contratacion_aprobacion',
            titulo: 'Tienes una actividad por aprobar',
            mensaje: `${a.descripcion} del proceso ${a.radicado} espera tu decisión${
              a.responsable ? `, enviada por ${a.responsable}` : ''
            }.`,
          }
        : {
            id_usuario_destinatario: a.responsableId as string,
            tipo_notificacion: 'contratacion_vencimiento',
            titulo: a.estado === 'VENCIDO' ? 'Vencimiento cumplido' : 'Vencimiento próximo',
            mensaje: `${a.descripcion} del contrato ${a.contrato ?? a.radicado}: ${
              a.estado === 'VENCIDO'
                ? `vencido hace ${Math.abs(a.diasRestantes)} días`
                : `vence en ${a.diasRestantes} días`
            } (${a.vence})`,
          },
    );

    const nuevos = await this.sinAvisarYa(mensajes);

    if (!nuevos.length) {
      return {
        alertas: alertas.length,
        notificadas: 0,
        sinDestinatario: alertas.length - conDestinatario.length,
        repetidas: mensajes.length,
      };
    }

    const url = process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3009';

    try {
      const respuesta = await fetch(`${url}/notifications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: nuevos }),
      });

      if (!respuesta.ok) {
        this.logger.warn(`notifications-service respondió ${respuesta.status}`);
        return { alertas: alertas.length, notificadas: 0, error: 'no se pudo notificar' };
      }
    } catch (error: any) {
      this.logger.warn(`No se pudo avisar a notifications-service: ${error.message}`);
      return { alertas: alertas.length, notificadas: 0, error: 'no se pudo notificar' };
    }

    return {
      alertas: alertas.length,
      notificadas: nuevos.length,
      repetidas: mensajes.length - nuevos.length,
      sinDestinatario: alertas.length - conDestinatario.length,
    };
  }
}
