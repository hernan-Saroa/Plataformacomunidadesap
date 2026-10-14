import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

/**
 * Docencia concertada en Programación Académica — EFDS-2315 (lado del PTA).
 *
 * ⚠️ UN SOLO INTERRUPTOR: PROG_CONCERTACION_HABILITADA, el mismo nombre en los
 * dos servicios. El régimen nuevo solo rige si los DOS lo tienen encendido:
 *   · aquí APAGADO → `regimenDocencia` devuelve 'actual' SIN consultar a nadie.
 *     El PTA se comporta exactamente como hoy. Así llega a producción.
 *   · aquí ENCENDIDO → se pregunta a Programación Académica (contrato) si allá
 *     también lo está y cuál es el periodo de corte (una sola fuente). Si allá
 *     está apagado, el PTA sigue aprobando la Docencia (nunca "ninguna").
 *     Si no responde, se falla cerrado con un error explícito.
 *
 * En el régimen 'programacion' (periodo >= corte):
 *   · el PTA NO aprueba ni revisa los componentes de Docencia: los recibe;
 *   · el docente no puede enviar el PTA hasta que llegue su docencia concertada;
 *   · la docencia "de programación" no se edita en el PTA;
 *   · la auto-aprobación "Sistema" no aplica a la Docencia (sería aprobar sin
 *     concertación).
 * Los PTA ya enviados o firmados cuando se encendió (sin docencia de
 * programación) siguen con el flujo actual.
 */
export const DOCENCIA_KEYS: ReadonlySet<string> = new Set(['academica_pregrado', 'academica_posgrado', 'academica_territorial']);
export const ORIGEN_PROGRAMACION = 'programacion';
export const SCOPE_PROGRAMACION = 'programacion';

export type Regimen = 'actual' | 'programacion';

interface ConfigProgramacion { habilitada: boolean; desdePeriodo: string | null }

export function habilitadaLocal(): boolean {
  return String(process.env.PROG_CONCERTACION_HABILITADA ?? '').trim().toLowerCase() === 'true';
}

let cache: { valor: ConfigProgramacion; en: number } | null = null;

/** Solo para pruebas: olvida la configuración leída de Programación Académica. */
export function reiniciarCacheProgramacion(): void { cache = null; }

/** Configuración de Programación Académica (interruptor efectivo y corte). Lanza si no responde. */
export async function configuracionProgramacion(): Promise<ConfigProgramacion> {
  const ahora = Date.now();
  if (cache && ahora - cache.en < 30_000) return cache.valor;
  const base = process.env.ACADEMIC_SCHEDULE_SERVICE_URL || 'http://academic-schedule-service:3013';
  let res: Response;
  try {
    res = await fetch(`${base}/concertacion/configuracion`);
  } catch (e: any) {
    throw new ServiceUnavailableException(`No se pudo consultar la concertación en Programación Académica: ${e?.message ?? e}`);
  }
  if (!res.ok) throw new ServiceUnavailableException(`Programación Académica respondió ${res.status} al consultar la concertación.`);
  const c: any = await res.json();
  const d = c?.data ?? c;
  const valor = { habilitada: d?.habilitada === true, desdePeriodo: typeof d?.desdePeriodo === 'string' ? d.desdePeriodo : null };
  cache = { valor, en: ahora };
  return valor;
}

export function periodoEnCorte(periodo: unknown, desde: string | null): boolean {
  const p = String(periodo ?? '').trim();
  return !!desde && /^\d{4}-[12]$/.test(p) && p >= desde;
}

export function asignaturasDe(ds: any): any[] {
  return Array.isArray(ds?.asignaturas) ? ds.asignaturas : [];
}

export function tieneDocenciaDeProgramacion(ds: any): boolean {
  return asignaturasDe(ds).some((a) => a?.origen === ORIGEN_PROGRAMACION);
}

/** Régimen de la Docencia de un PTA. Apagado aquí: 'actual', sin consultar a nadie. */
export async function regimenDocencia(pta: { periodo?: unknown; estado?: unknown; datosEstructurados?: any } | null): Promise<Regimen> {
  if (!habilitadaLocal() || !pta) return 'actual';
  const cfg = await configuracionProgramacion();
  if (!cfg.habilitada || !periodoEnCorte(pta.periodo, cfg.desdePeriodo)) return 'actual';
  if (tieneDocenciaDeProgramacion(pta.datosEstructurados)) return 'programacion';
  // Sin docencia de programación: solo un PTA aún en borrador entra al régimen
  // nuevo. Uno ya enviado o firmado cuando se encendió sigue con el flujo actual.
  return String(pta.estado ?? 'BORRADOR').trim().toUpperCase() === 'BORRADOR' ? 'programacion' : 'actual';
}

/** Variante que nunca lanza: ante la duda, 'programacion' (para NO auto-aprobar Docencia). */
export async function regimenDocenciaSeguro(pta: Parameters<typeof regimenDocencia>[0]): Promise<Regimen> {
  try { return await regimenDocencia(pta); } catch { return 'programacion'; }
}

/** El PTA no decide la Docencia del régimen nuevo: la recibe de la concertación. */
export async function exigirDecisionDocenciaEnPta(pta: Parameters<typeof regimenDocencia>[0], componente: string): Promise<void> {
  if (!DOCENCIA_KEYS.has(componente)) return;
  if (await regimenDocencia(pta) === 'programacion') {
    throw new ConflictException(
      'La Docencia de este periodo se aprueba en la concertación de Programación Académica, no en el PTA.');
  }
}

/** No se envía un PTA del régimen nuevo sin su docencia concertada. */
export async function exigirDocenciaParaEnviar(pta: Parameters<typeof regimenDocencia>[0]): Promise<void> {
  if (await regimenDocencia(pta) !== 'programacion') return;
  if (!tieneDocenciaDeProgramacion(pta?.datosEstructurados)) {
    throw new ConflictException(
      'Su docencia de este periodo todavía no llega de Programación Académica: se envía cuando la concertación esté aprobada.');
  }
}

/**
 * Asignaturas que se guardan en el régimen nuevo: las "de programación" salen
 * SIEMPRE de lo ya guardado (no se editan en el PTA) y no se agregan a mano.
 */
export function protegerAsignaturas(regimen: Regimen, dsExistente: any, entrantes: any[] | undefined): any[] | undefined {
  if (regimen !== 'programacion' || !Array.isArray(entrantes)) return entrantes;
  const manuales = entrantes.filter((a) => a?.origen !== ORIGEN_PROGRAMACION && (a?.asignatura_id || a?.asignatura_nombre));
  if (manuales.length) {
    throw new ConflictException(
      'En este periodo la docencia viene de Programación Académica: no se agregan asignaturas en el PTA.');
  }
  return asignaturasDe(dsExistente).filter((a) => a?.origen === ORIGEN_PROGRAMACION);
}

// ── Aplicar una decisión concertada ──────────────────────────────────────────

interface Queryable { query(sql: string, params?: any[]): Promise<any> }

const ESTADOS_EDITABLES = /^(BORRADOR|DEVUELTO|REVISION_DOCENTE_N\d)$/;
const ESTADOS_CERRADOS = new Set([
  'APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO', 'RECHAZADO',
]);

/** Entrada de `datosEstructurados.asignaturas` con la forma que usa el PTA. */
function entradaPta(a: any, d: any, i: number) {
  return {
    id: Date.now() + i,
    // Donde se dicta (auth.seccionales.id_seccional), resuelto por Programación
    // Académica; vacío = sin dato: se clasifica por el nivel del programa.
    territorial_id: a.territorialId ? String(a.territorialId) : '',
    cetap_id: '',
    programa_id: String(a.programaId),
    pensum: a.pensum ?? '',
    asignatura_id: String(a.asignaturaId),
    asignatura_nombre: a.nombre,
    asignatura_codigo: a.codigo,
    nucleo_tematico: '',
    creditos: Number(a.creditos ?? 0),
    semestre: Number(a.semestre ?? 1),
    total_estudiantes: 0,
    horas_base: Number(a.horas),
    total_horas: Number(a.horas),
    porcentaje_pta: 0,
    observaciones: 'Concertada en Programación Académica',
    modalidad: a.modalidad ?? '',
    fecha_inicio: a.fechaInicio,
    fecha_fin: a.fechaFin,
    origen: ORIGEN_PROGRAMACION,
    // Explícito para la vista: el servidor ya la protege (protegerAsignaturas).
    editable: false,
    id_concertacion: d.id_concertacion,
    nivel_concertacion: d.nivel,
  };
}

/**
 * Aplica una decisión registrada a su PTA, si corresponde. Devuelve el estado
 * de aplicación, que también queda en `docencia_concertada`:
 *   aplicada | no_aplica_apagada | pendiente_sin_pta |
 *   pendiente_pta_flujo_anterior | pendiente_pta_firmado | pendiente_pta_en_aprobacion
 * Un PTA firmado NUNCA se modifica automáticamente: queda pendiente y se reporta.
 */
export async function aplicarDecision(q: Queryable, idConcertacion: string): Promise<string> {
  const d = (await q.query(
    `SELECT * FROM academic_work_plan.docencia_concertada WHERE id_concertacion = $1`, [idConcertacion]))[0];
  if (!d) return 'no_registrada';

  const marcar = async (estado: string, detalle: string | null, idPta: string | null) => {
    await q.query(
      `UPDATE academic_work_plan.docencia_concertada
          SET estado_aplicacion = $2::varchar, detalle_aplicacion = $3::text, id_pta = $4::text,
              aplicada_en = CASE WHEN $2::varchar = 'aplicada' THEN NOW() ELSE aplicada_en END, actualizada_en = NOW()
        WHERE id_concertacion = $1`, [idConcertacion, estado, detalle, idPta]);
    return estado;
  };

  if (!habilitadaLocal()) return marcar('no_aplica_apagada', 'La concertación está apagada en el PTA.', null);

  const ptas: any[] = await q.query(
    `SELECT p.id::text AS id, p.estado, p.periodo, p."datosEstructurados" AS ds
       FROM academic_work_plan."PlanTrabajoAcademico" p
       JOIN academic_work_plan."Docente" doc ON doc.id::text = p."docenteId"::text
       JOIN auth.personas per ON per.id_person::text = doc."personaId"::text
      WHERE per.num_identificacion = $1 AND p.periodo = $2
      ORDER BY p."updatedAt" DESC`, [d.documento_docente, d.periodo]);
  if (!ptas.length) return marcar('pendiente_sin_pta', 'El docente aún no crea su PTA: se precarga al crearlo.', null);

  const vigente = ptas.find((p) => !ESTADOS_CERRADOS.has(String(p.estado).toUpperCase())) ?? ptas[0];
  const estado = String(vigente.estado ?? '').toUpperCase().replace(/\s+/g, '_');
  if (ESTADOS_CERRADOS.has(estado)) {
    return marcar('pendiente_pta_firmado', `El PTA está ${vigente.estado}: no se modifica automáticamente.`, vigente.id);
  }
  if (await regimenDocencia({ periodo: vigente.periodo, estado: vigente.estado, datosEstructurados: vigente.ds }) !== 'programacion') {
    return marcar('pendiente_pta_flujo_anterior', 'El PTA ya se había enviado antes del corte: aprueba su Docencia en el flujo actual.', vigente.id);
  }
  // Una asignatura dictada en una Dirección Territorial va en el PTA al componente
  // academica_territorial, que se aprueba por (territorial, nivel) en otra tabla.
  // La concertación decide por nivel: aplicarla aprobaría el componente
  // equivocado. No se aplica; queda pendiente y se reporta.
  const territoriales = (d.asignaturas as any[]).map((a) => a?.territorialId).filter(Boolean).map(String);
  if (territoriales.length) {
    const noCentrales: Array<{ id: string }> = await q.query(
      `SELECT id_seccional::text AS id FROM auth.seccionales
        WHERE id_seccional::text = ANY($1::text[])
          AND lower(regexp_replace(nom_seccional, '[^a-zA-Z0-9]', '', 'g')) <> 'sedecentral'`, [territoriales]);
    if (noCentrales.length) {
      return marcar('pendiente_docencia_territorial',
        'La docencia incluye asignaturas de una Dirección Territorial: su aprobación (academica_territorial) no la da la concertación por nivel.',
        vigente.id);
    }
  }
  if (!ESTADOS_EDITABLES.test(estado)) {
    return marcar('pendiente_pta_en_aprobacion', `El PTA está ${vigente.estado}: la docencia nueva se aplica cuando vuelva al docente.`, vigente.id);
  }

  // Docencia del nivel: reemplaza la de programación de ese nivel; quita las
  // asignaturas manuales (en el régimen nuevo la docencia solo viene de aquí).
  const ds = vigente.ds ?? {};
  const actuales = asignaturasDe(ds);
  const manualesQuitadas = actuales.filter((a) => a?.origen !== ORIGEN_PROGRAMACION).length;
  const conservadas = actuales.filter((a) => a?.origen === ORIGEN_PROGRAMACION && a?.nivel_concertacion !== d.nivel);
  const nuevas = (d.asignaturas as any[]).map((a, i) => entradaPta(a, d, i));
  const nuevoDs = { ...ds, asignaturas: [...conservadas, ...nuevas] };

  await q.query(
    `UPDATE academic_work_plan."PlanTrabajoAcademico" SET "datosEstructurados" = $2::jsonb, "updatedAt" = NOW()
      WHERE id::text = $1`, [vigente.id, JSON.stringify(nuevoDs)]);
  await q.query(
    `INSERT INTO academic_work_plan."PtaComponentApproval"
       (pta_id, componente, estado, aprobador_nombre, aprobador_rol, comentarios, fecha_aprobacion, scope, scope_id)
     -- pta_id sin cast: es uuid (327, entidad) o text (340) según el ambiente.
     VALUES ($1, $2, 'aprobado', 'Programación Académica', 'concertacion', $3, NOW(), $4, $5)
     ON CONFLICT (pta_id, componente) DO UPDATE SET
       estado = 'aprobado', aprobador_nombre = EXCLUDED.aprobador_nombre, aprobador_rol = EXCLUDED.aprobador_rol,
       comentarios = EXCLUDED.comentarios, fecha_aprobacion = NOW(), scope = EXCLUDED.scope,
       scope_id = EXCLUDED.scope_id, updated_at = NOW()`,
    [vigente.id, `academica_${d.nivel}`, 'Docencia concertada en Programación Académica', SCOPE_PROGRAMACION, idConcertacion]);

  return marcar('aplicada',
    manualesQuitadas ? `Se quitaron ${manualesQuitadas} asignatura(s) cargadas a mano antes del corte.` : null, vigente.id);
}

/** Al crear un PTA del régimen nuevo, aplica las decisiones que lo esperaban. */
export async function aplicarPendientesAlCrear(q: Queryable, pta: { id: string; periodo: string; docenteId: string; estado: string; datosEstructurados: any }): Promise<void> {
  if (await regimenDocencia(pta) !== 'programacion') return;
  const pendientes: Array<{ id: string }> = await q.query(
    `SELECT dc.id_concertacion::text AS id
       FROM academic_work_plan.docencia_concertada dc
       JOIN auth.personas per ON per.num_identificacion = dc.documento_docente
       JOIN academic_work_plan."Docente" doc ON doc."personaId"::text = per.id_person::text
      WHERE doc.id::text = $1 AND dc.periodo = $2 AND dc.aplicada_en IS NULL`, [pta.docenteId, pta.periodo]);
  for (const p of pendientes) await aplicarDecision(q, p.id);
}
