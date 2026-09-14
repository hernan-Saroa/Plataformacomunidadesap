import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { AuditoriasService } from '../auditorias/auditorias.service';
import {
  CambioCampo,
  CambioProgramaAnual,
  FilaProgramaAnual,
  VersionProgramaAnual,
} from './entities/version-programa-anual.entity';

/**
 * Campos que imprime el documento del Programa Anual. Solo un cambio en ellos
 * genera versión nueva (EFDS-1919): los auditores, el estado, el avance, el área
 * objetivo y todo lo interno de cada etapa no aparecen en el documento y por eso
 * no cuentan.
 */
const CAMPOS_VERSIONADOS: Array<keyof FilaProgramaAnual> = [
  'nombre',
  'tipo',
  'responsableArea',
  'observaciones',
  'fechaInicio',
  'fechaFinPlaneacion',
  'fechaInicioEjecucion',
  'fechaFinEjecucion',
  'fechaInicioComunicacion',
  'fechaFin',
];

export interface UsuarioVersion {
  id?: string | null;
  nombre?: string | null;
}

export interface VersionResuelta {
  version: number;
  nueva: boolean;
  fecha: Date;
  generadaPor: string;
  motivo: string | null;
  filas: FilaProgramaAnual[];
  cambios: CambioProgramaAnual[];
}

export interface OpcionesGeneracion {
  motivo?: string | null;
  /** Generar versión desde el banner: si no hubo cambios, cierra el ajuste abierto. */
  cerrarAjuste?: boolean;
}

export interface EntradaLogPrograma {
  fecha: string;
  tipo: 'version' | 'ajuste' | 'auditores' | 'programacion' | 'ampliacion' | 'creacion';
  autor: string;
  auditoria: string | null;
  detalle: string;
}

@Injectable()
export class ProgramaAnualVersionesService {
  constructor(
    @InjectRepository(VersionProgramaAnual)
    private readonly versionRepository: Repository<VersionProgramaAnual>,
    private readonly auditoriasService: AuditoriasService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Devuelve la versión que corresponde al programa actual de la vigencia. Si
   * no hay ninguna, crea la V1; si lo impreso cambió desde la última, crea la
   * siguiente y cierra el ajuste abierto; si no cambió nada, devuelve la última.
   */
  async resolverVersion(
    vigencia: number,
    usuario: UsuarioVersion,
    opciones: OpcionesGeneracion = {},
  ): Promise<VersionResuelta> {
    const filas = await this.construirFilas(vigencia);
    const huella = this.calcularHuella(filas);
    const motivo = opciones.motivo?.trim() || null;

    return this.dataSource.transaction(async (manager) => {
      // Dos exportaciones simultáneas no deben crear el mismo número de versión.
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [1919, vigencia]);

      const repo = manager.getRepository(VersionProgramaAnual);
      const ultima = await repo.findOne({ where: { vigencia }, order: { version: 'DESC' } });
      const cambios = ultima ? this.compararFilas(ultima.filas, filas) : [];

      if (ultima && (ultima.huella === huella || cambios.length === 0)) {
        if (opciones.cerrarAjuste) await this.cerrarAjuste(manager, vigencia, null);
        return this.aResuelta(ultima, false);
      }

      const nueva = await repo.save(
        repo.create({
          vigencia,
          version: (ultima?.version ?? 0) + 1,
          huella,
          filas,
          cambios,
          motivo,
          generadaPor: usuario?.nombre || 'Sistema',
          generadaPorId: usuario?.id ?? null,
        }),
      );
      await this.cerrarAjuste(manager, vigencia, nueva.version);
      return this.aResuelta(nueva, true);
    });
  }

  /**
   * Estado del programa para el banner: versión vigente, si hay un ajuste
   * abierto y cuántos cambios hay sin versionar. Modificar el programa activa el
   * ajuste aunque nadie lo haya iniciado (EFDS-1919).
   */
  async obtenerEstado(vigencia: number) {
    const [ultima, filas, ajuste] = await Promise.all([
      this.versionRepository.findOne({ where: { vigencia }, order: { version: 'DESC' } }),
      this.construirFilas(vigencia),
      this.ajusteAbierto(this.dataSource.manager, vigencia),
    ]);
    const cambiosPendientes = ultima ? this.compararFilas(ultima.filas, filas).length : filas.length;

    return {
      vigencia,
      versionActual: ultima
        ? { version: ultima.version, fecha: ultima.createdAt, generadaPor: ultima.generadaPor, motivo: ultima.motivo ?? null }
        : null,
      enAjuste: ajuste ? { iniciadoPor: ajuste.iniciado_por, iniciadoEn: ajuste.iniciado_at } : null,
      cambiosPendientes,
    };
  }

  /**
   * Abre el ajuste sobre la última versión vigente: los cambios que se hagan dan
   * origen a la siguiente versión, que lo cierra. La versión vigente no se toca
   * (EFDS-1919).
   */
  async iniciarAjuste(vigencia: number, usuario: UsuarioVersion) {
    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [1919, vigencia]);

      const ultima = await manager.getRepository(VersionProgramaAnual).findOne({ where: { vigencia }, order: { version: 'DESC' } });
      if (!ultima) {
        throw new BadRequestException(
          `El Programa Anual ${vigencia} aún no tiene versiones: está en elaboración y se puede modificar.`,
        );
      }
      if (await this.ajusteAbierto(manager, vigencia)) return;

      await manager.query(
        `INSERT INTO control_interno.programa_anual_ajuste (vigencia, iniciado_por, iniciado_por_id)
         VALUES ($1, $2, $3)`,
        [vigencia, usuario?.nombre || 'Sistema', usuario?.id ?? null],
      );
    });
    return this.obtenerEstado(vigencia);
  }

  /**
   * Log de cambios del programa: versiones, ajustes y lo que se modificó en sus
   * auditorías, incluido el cambio de auditores que no genera versión.
   */
  async obtenerLog(vigencia: number): Promise<EntradaLogPrograma[]> {
    const [versiones, ajustes, historial] = await Promise.all([
      this.versionRepository.find({
        where: { vigencia },
        select: ['version', 'motivo', 'cambios', 'generadaPor', 'createdAt'],
      }),
      this.dataSource.query(
        `SELECT iniciado_por, iniciado_at, cerrado_at, version_resultante
           FROM control_interno.programa_anual_ajuste WHERE vigencia = $1`,
        [vigencia],
      ),
      this.dataSource.query(
        `SELECT to_char(h.fecha, 'YYYY-MM-DD') || 'T' || to_char(h.hora, 'HH24:MI:SS') || '-05:00' AS fecha,
                h.accion, h.descripcion, a.codigo,
                COALESCE(p.nom_largo, h.nombre_usuario, 'Sistema') AS autor
           FROM control_interno.historial_auditoria h
           JOIN control_interno.auditoria a ON a.id = h.auditoria_id
           LEFT JOIN auth.personas p ON p.id_person = h.usuario_id
          WHERE (a.plan_anual_vigencia = $1
                 OR (a.plan_anual_vigencia IS NULL AND EXTRACT(YEAR FROM a.fecha_inicio) = $1))
            AND (h.accion IN ('Auditoría creada', 'Aprobación de ampliación de plazo')
                 OR (h.accion = 'Auditoría actualizada'
                     AND h.descripcion ~* '(auditor|equipo|inicio de|fin de|nombre:|tipo:|responsable|programa anual)'))
          ORDER BY h.fecha DESC, h.hora DESC
          LIMIT 500`,
        [vigencia],
      ),
    ]);

    const log: EntradaLogPrograma[] = [
      ...versiones.map((v) => ({
        fecha: new Date(v.createdAt).toISOString(),
        tipo: 'version' as const,
        autor: v.generadaPor,
        auditoria: null,
        detalle:
          `Versión v${v.version}.0 generada` +
          (v.cambios?.length ? ` con ${v.cambios.length} cambio(s)` : ' (versión inicial)') +
          (v.motivo ? `. Motivo: ${v.motivo}` : ''),
      })),
      ...ajustes.flatMap((j: any) => [
        { fecha: new Date(j.iniciado_at).toISOString(), tipo: 'ajuste' as const, autor: j.iniciado_por, auditoria: null, detalle: 'Ajuste iniciado' },
        ...(j.cerrado_at && !j.version_resultante
          ? [{ fecha: new Date(j.cerrado_at).toISOString(), tipo: 'ajuste' as const, autor: j.iniciado_por, auditoria: null, detalle: 'Ajuste cerrado sin cambios' }]
          : []),
      ]),
      ...historial.map((h: any) => ({
        fecha: new Date(h.fecha).toISOString(),
        tipo: (h.accion === 'Auditoría creada'
          ? 'creacion'
          : h.accion.startsWith('Aprobación de ampliación')
            ? 'ampliacion'
            : /auditor|equipo/i.test(h.descripcion || '') ? 'auditores' : 'programacion') as EntradaLogPrograma['tipo'],
        autor: h.autor,
        auditoria: h.codigo,
        detalle: String(h.descripcion || h.accion).replace(/^Cambios realizados:\s*/, ''),
      })),
    ];

    return log.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /** Histórico de la vigencia, de la más reciente a la más antigua, sin las filas. */
  async listarVersiones(vigencia: number) {
    const versiones = await this.versionRepository.find({
      where: { vigencia },
      order: { version: 'DESC' },
      select: ['id', 'vigencia', 'version', 'cambios', 'motivo', 'generadaPor', 'createdAt'],
    });

    return versiones.map((v) => ({
      id: v.id,
      vigencia: v.vigencia,
      version: v.version,
      fecha: v.createdAt,
      generadaPor: v.generadaPor,
      motivo: v.motivo ?? null,
      cambios: v.cambios || [],
    }));
  }

  private async ajusteAbierto(manager: EntityManager, vigencia: number) {
    const filas = await manager.query(
      `SELECT iniciado_por, iniciado_at FROM control_interno.programa_anual_ajuste
        WHERE vigencia = $1 AND cerrado_at IS NULL LIMIT 1`,
      [vigencia],
    );
    return filas[0] ?? null;
  }

  private async cerrarAjuste(manager: EntityManager, vigencia: number, version: number | null) {
    await manager.query(
      `UPDATE control_interno.programa_anual_ajuste
          SET cerrado_at = CURRENT_TIMESTAMP, version_resultante = $2
        WHERE vigencia = $1 AND cerrado_at IS NULL`,
      [vigencia, version],
    );
  }

  /** Una versión completa, con sus filas, para volver a descargar el documento. */
  async obtenerVersion(vigencia: number, version: number): Promise<VersionResuelta> {
    const encontrada = await this.versionRepository.findOne({ where: { vigencia, version } });
    if (!encontrada) {
      throw new NotFoundException(`No existe la versión ${version} del Programa Anual ${vigencia}`);
    }
    return this.aResuelta(encontrada, false);
  }

  /**
   * Mismas auditorías que muestra el Programa: activas y de la vigencia, en el
   * mismo orden en que las lista la pantalla (más recientes primero), para que
   * el documento salga igual que antes.
   */
  private async construirFilas(vigencia: number): Promise<FilaProgramaAnual[]> {
    const auditorias = (await this.auditoriasService.findAll({
      planAnualVigencia: vigencia,
      activasOnly: true,
      light: true,
    })) as any[];

    return auditorias
      .map((a): FilaProgramaAnual => ({
        id: String(a.id),
        codigo: String(a.codigo || ''),
        nombre: String(a.nombre || '').trim(),
        areaObjetivo: a.areaObjetivo ? String(a.areaObjetivo).trim() : null,
        tipo: this.normalizarTipo(a.tipo, a.tipoKanban),
        territorial: a.territorial ? String(a.territorial) : null,
        responsableArea: this.resolverResponsableArea(a),
        observaciones: String(a.observaciones || '').trim(),
        fechaInicio: this.aFecha(a.fechaInicio),
        fechaFinPlaneacion: this.aFecha(a.fechaFinPlaneacion),
        fechaInicioEjecucion: this.aFecha(a.fechaInicioEjecucion),
        fechaFinEjecucion: this.aFecha(a.fechaFinEjecucion),
        fechaInicioComunicacion: this.aFecha(a.fechaInicioComunicacion),
        fechaFin: this.aFecha(a.fechaFin),
      }));
  }

  private calcularHuella(filas: FilaProgramaAnual[]): string {
    // Se ordena solo para la huella: el orden de la lista no es un cambio del programa.
    const impreso = [...filas]
      .sort((x, y) => x.id.localeCompare(y.id))
      .map((f) => [f.id, ...CAMPOS_VERSIONADOS.map((c) => this.valorImpreso(f, c))]);
    return createHash('sha256').update(JSON.stringify(impreso)).digest('hex');
  }

  /** Valor tal como sale en el documento: la plantilla quita del nombre lo que va entre paréntesis. */
  private valorImpreso(fila: FilaProgramaAnual, campo: keyof FilaProgramaAnual): string | null {
    const valor = (fila[campo] as string) ?? null;
    return campo === 'nombre' && valor ? valor.replace(/\([^)]*\)/g, '').trim() : valor;
  }

  private compararFilas(anteriores: FilaProgramaAnual[], actuales: FilaProgramaAnual[]): CambioProgramaAnual[] {
    const previas = new Map(anteriores.map((f) => [f.id, f]));
    const nuevas = new Map(actuales.map((f) => [f.id, f]));
    const cambios: CambioProgramaAnual[] = [];

    for (const fila of actuales) {
      const previa = previas.get(fila.id);
      if (!previa) {
        cambios.push({ tipo: 'agregada', codigo: fila.codigo, nombre: fila.nombre });
        continue;
      }
      const campos: CambioCampo[] = CAMPOS_VERSIONADOS
        .filter((c) => this.valorImpreso(previa, c) !== this.valorImpreso(fila, c))
        .map((c) => ({ campo: c, antes: this.valorImpreso(previa, c), despues: this.valorImpreso(fila, c) }));
      if (campos.length > 0) {
        cambios.push({ tipo: 'modificada', codigo: fila.codigo, nombre: fila.nombre, campos });
      }
    }

    for (const previa of anteriores) {
      if (!nuevas.has(previa.id)) {
        cambios.push({ tipo: 'eliminada', codigo: previa.codigo, nombre: previa.nombre });
      }
    }

    return cambios;
  }

  private normalizarTipo(tipo?: string, tipoKanban?: string): FilaProgramaAnual['tipo'] {
    const valor = `${tipo || ''} ${tipoKanban || ''}`.toLowerCase();
    if (valor.includes('especial')) return 'Especial';
    if (valor.includes('territorial')) return 'Territorial';
    return 'Regular';
  }

  private resolverResponsableArea(a: any): string {
    const candidatos = [
      a.responsableArea?.nombre,
      a.responsableAreaNombre,
      a.proceso?.responsable?.nombre ?? a.proceso?.responsable,
      a.responsable,
    ];
    const nombre = candidatos.find(
      (c) => typeof c === 'string' && c.trim() && c.trim() !== 'Por asignar',
    );
    return nombre ? nombre.trim() : 'No asignado';
  }

  private aFecha(valor: unknown): string | null {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
    const texto = String(valor);
    return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null;
  }

  private aResuelta(v: VersionProgramaAnual, nueva: boolean): VersionResuelta {
    return {
      version: v.version,
      nueva,
      fecha: v.createdAt,
      generadaPor: v.generadaPor,
      motivo: v.motivo ?? null,
      filas: v.filas || [],
      cambios: v.cambios || [],
    };
  }
}
