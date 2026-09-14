import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
 * genera versión nueva (EFDS-1919): los auditores, el estado, el avance y todo
 * lo interno de cada etapa no aparecen en el documento y por eso no cuentan.
 */
const CAMPOS_VERSIONADOS: Array<keyof FilaProgramaAnual> = [
  'nombre',
  'areaObjetivo',
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
  filas: FilaProgramaAnual[];
  cambios: CambioProgramaAnual[];
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
   * siguiente; si no cambió nada, devuelve la última sin crear otra.
   */
  async resolverVersion(vigencia: number, usuario: UsuarioVersion): Promise<VersionResuelta> {
    const filas = await this.construirFilas(vigencia);
    const huella = this.calcularHuella(filas);

    return this.dataSource.transaction(async (manager) => {
      // Dos exportaciones simultáneas no deben crear el mismo número de versión.
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [1919, vigencia]);

      const repo = manager.getRepository(VersionProgramaAnual);
      const ultima = await repo.findOne({ where: { vigencia }, order: { version: 'DESC' } });

      if (ultima && ultima.huella === huella) {
        return this.aResuelta(ultima, false);
      }

      const nueva = repo.create({
        vigencia,
        version: (ultima?.version ?? 0) + 1,
        huella,
        filas,
        cambios: ultima ? this.compararFilas(ultima.filas, filas) : [],
        generadaPor: usuario?.nombre || 'Sistema',
        generadaPorId: usuario?.id ?? null,
      });

      return this.aResuelta(await repo.save(nueva), true);
    });
  }

  /** Histórico de la vigencia, de la más reciente a la más antigua, sin las filas. */
  async listarVersiones(vigencia: number) {
    const versiones = await this.versionRepository.find({
      where: { vigencia },
      order: { version: 'DESC' },
      select: ['id', 'vigencia', 'version', 'cambios', 'generadaPor', 'createdAt'],
    });

    return versiones.map((v) => ({
      id: v.id,
      vigencia: v.vigencia,
      version: v.version,
      fecha: v.createdAt,
      generadaPor: v.generadaPor,
      cambios: v.cambios || [],
    }));
  }

  /** Una versión completa, con sus filas, para volver a descargar el documento. */
  async obtenerVersion(vigencia: number, version: number): Promise<VersionResuelta> {
    const encontrada = await this.versionRepository.findOne({ where: { vigencia, version } });
    if (!encontrada) {
      throw new NotFoundException(`No existe la versión ${version} del Programa Anual ${vigencia}`);
    }
    return this.aResuelta(encontrada, false);
  }

  /** Mismas auditorías que muestra el Programa: activas y de la vigencia. */
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
      }))
      .sort((x, y) => x.codigo.localeCompare(y.codigo) || x.id.localeCompare(y.id));
  }

  private calcularHuella(filas: FilaProgramaAnual[]): string {
    const impreso = filas.map((f) => [f.id, ...CAMPOS_VERSIONADOS.map((c) => f[c] ?? null)]);
    return createHash('sha256').update(JSON.stringify(impreso)).digest('hex');
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
        .filter((c) => (previa[c] ?? null) !== (fila[c] ?? null))
        .map((c) => ({ campo: c, antes: (previa[c] as string) ?? null, despues: (fila[c] as string) ?? null }));
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
      filas: v.filas || [],
      cambios: v.cambios || [],
    };
  }
}
