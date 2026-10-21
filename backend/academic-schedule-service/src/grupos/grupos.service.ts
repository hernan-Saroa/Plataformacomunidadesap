import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { GrupoEntity, TIPOS_OFERTA, type TipoOferta } from './grupo.entity.js';
import { parsearPeriodo, type RefPeriodo } from '../periodos/periodo-ref.js';
import { siguienteNumeroGrupo } from './numeracion-grupo.js';
import { AsignaturaCatalogoEntity } from '../catalogo/entities/asignatura.readonly.entity.js';
import { aulasQueNoCoinciden, ofertasCetapDe, validarOfertaDelGrupo, type OfertaCetap } from './oferta-cetap.js';

export interface CrearGrupoDto {
  idAsignatura: string;
  /** `idPeriodo` de GET /periodos: de plataforma (número) o legado (UUID). */
  idPeriodo?: string | null;
  /** Solo en periodos de plataforma: la oferta es del grupo (EFDS-2328). */
  tipoOferta?: TipoOferta;
  idDocente?: string | null;
  cupoMaximo?: number;
  observaciones?: string | null;
  /** Cantidad de grupos a crear de una vez (AC-01). Por defecto 1. */
  cantidad?: number;
  /** Oferta CETAP donde se dicta (EFDS-2315). Opcional al crear; sin ella no se concerta. */
  idOfertaCetap?: string | number | null;
}

/** Dónde vive el grupo según su periodo; `null` = sin periodo. */
function ubicacion(ref: RefPeriodo | null, tipoOferta?: TipoOferta) {
  if (!ref) return { idPeriodo: null, idPeriodoAcademico: null, tipoOferta: null };
  if (ref.modelo === 'legado') return { idPeriodo: ref.id, idPeriodoAcademico: null, tipoOferta: null };
  return { idPeriodo: null, idPeriodoAcademico: ref.id, tipoOferta: tipoOferta ?? 'periodo_regular' };
}

export interface ActualizarGrupoDto {
  /** Oferta CETAP donde se dicta (EFDS-2315); null la quita. */
  idOfertaCetap?: string | number | null;
  idDocente?: string | null;
  cupoMaximo?: number;
  estado?: string;
  observaciones?: string | null;
}

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(GrupoEntity)
    private readonly grupoRepo: Repository<GrupoEntity>,
    @InjectRepository(AsignaturaCatalogoEntity)
    private readonly asignaturaRepo: Repository<AsignaturaCatalogoEntity>,
  ) {}

  /**
   * Crea uno o varios grupos para una asignatura (AC-01).
   *
   * Los números se calculan sobre los ya existentes en (asignatura, periodo)
   * usando la estrategia aislada, de modo que la regla de numeración pueda
   * cambiar sin tocar este método (B-4).
   */
  async crear(dto: CrearGrupoDto): Promise<GrupoEntity[]> {
    const cantidad = Number(dto.cantidad ?? 1);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
      throw new BadRequestException('La cantidad de grupos debe ser un entero entre 1 y 20.');
    }

    // La asignatura es del catálogo: se valida su existencia antes de crear, para
    // dar un error legible en vez de dejar que reviente la FK.
    const asignatura = await this.asignaturaRepo.findOne({
      where: { id: String(dto.idAsignatura) },
    });
    if (!asignatura) throw new NotFoundException('La asignatura no existe en el catálogo.');

    const ref = dto.idPeriodo ? parsearPeriodo(dto.idPeriodo) : null;
    if (dto.idPeriodo && !ref) throw new BadRequestException('El periodo no es válido.');
    if (dto.tipoOferta !== undefined && !TIPOS_OFERTA.includes(dto.tipoOferta)) {
      throw new BadRequestException(`La oferta debe ser una de: ${TIPOS_OFERTA.join(', ')}.`);
    }
    const donde = ubicacion(ref, dto.tipoOferta);
    const oferta = dto.idOfertaCetap != null
      ? await validarOfertaDelGrupo(this.grupoRepo.manager, dto.idOfertaCetap,
        { idAsignatura: String(dto.idAsignatura), idPeriodoAcademico: donde.idPeriodoAcademico })
      : null;

    // Numeración por asignatura, periodo y oferta (índice de la migración 036).
    const existentes = await this.grupoRepo.find({
      where: {
        idAsignatura: String(dto.idAsignatura),
        idPeriodo: (donde.idPeriodo ?? IsNull()) as any,
        idPeriodoAcademico: (donde.idPeriodoAcademico ?? IsNull()) as any,
        ...(donde.tipoOferta ? { tipoOferta: donde.tipoOferta } : {}),
      },
      select: ['numeroGrupo'],
    });
    const numeros = existentes.map((g) => g.numeroGrupo);

    const creados: GrupoEntity[] = [];
    for (let i = 0; i < cantidad; i += 1) {
      const numero = siguienteNumeroGrupo(numeros);
      numeros.push(numero);
      creados.push(
        this.grupoRepo.create({
          idAsignatura: String(dto.idAsignatura),
          idPeriodo: donde.idPeriodo,
          idPeriodoAcademico: donde.idPeriodoAcademico,
          tipoOferta: donde.tipoOferta,
          numeroGrupo: numero,
          idDocente: dto.idDocente ?? null,
          cupoMaximo: dto.cupoMaximo ?? 30,
          // Explícito, no heredado del default de columna: así el estado inicial
          // no depende de la semántica de create() del ORM.
          estado: 'PROGRAMADO',
          observaciones: dto.observaciones ?? null,
          idOfertaCetap: oferta?.idOfertaCetap ?? null,
        }),
      );
    }
    return this.grupoRepo.save(creados);
  }

  /** Grupos de una asignatura, en orden de numeración. */
  listarPorAsignatura(idAsignatura: string, idPeriodo?: string): Promise<GrupoEntity[]> {
    // Con periodo, solo los grupos de ESE periodo: un grupo creado en 2027-1 no
    // debe aparecer al programar 2026-1. Sin periodo, todos (compatibilidad).
    const where: any = { idAsignatura: String(idAsignatura) };
    if (idPeriodo) {
      const ref = parsearPeriodo(idPeriodo);
      if (!ref) return Promise.resolve([]);
      if (ref.modelo === 'plataforma') where.idPeriodoAcademico = ref.id;
      else { where.idPeriodo = ref.id; where.idPeriodoAcademico = IsNull(); }
    }
    return this.grupoRepo.find({ where, order: { numeroGrupo: 'ASC' } });
  }

  async obtener(idGrupo: string): Promise<GrupoEntity> {
    const grupo = await this.grupoRepo.findOne({ where: { idGrupo } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado.');
    return grupo;
  }

  /**
   * Actualiza SOLO los campos propios del grupo (AC-02: aislamiento).
   *
   * No se permite mover un grupo de asignatura ni renumerarlo: eso cambiaría la
   * identidad de una oferta ya publicada. `id_asignatura` y `numero_grupo` no
   * son editables por diseño.
   */
  async actualizar(idGrupo: string, dto: ActualizarGrupoDto): Promise<GrupoEntity> {
    const grupo = await this.obtener(idGrupo);
    if (dto.idOfertaCetap !== undefined) {
      if (dto.idOfertaCetap === null) {
        grupo.idOfertaCetap = null;
      } else {
        const oferta = await validarOfertaDelGrupo(this.grupoRepo.manager, dto.idOfertaCetap, grupo);
        // Un grupo presencial ya tiene aulas: deben ser del CETAP de la oferta.
        const otras = await aulasQueNoCoinciden(this.grupoRepo.manager, idGrupo, oferta.cetap.codigo);
        if (otras.length) {
          throw new BadRequestException(
            `Las aulas ${otras.join(', ')} del grupo no son del CETAP ${oferta.cetap.codigo} (${oferta.cetap.nombre}).`);
        }
        grupo.idOfertaCetap = oferta.idOfertaCetap;
      }
    }
    if (dto.idDocente !== undefined) grupo.idDocente = dto.idDocente;
    if (dto.cupoMaximo !== undefined) {
      if (!Number.isInteger(dto.cupoMaximo) || dto.cupoMaximo < 1) {
        throw new BadRequestException('El cupo máximo debe ser un entero positivo.');
      }
      grupo.cupoMaximo = dto.cupoMaximo;
    }
    if (dto.estado !== undefined) grupo.estado = dto.estado;
    if (dto.observaciones !== undefined) grupo.observaciones = dto.observaciones;
    return this.grupoRepo.save(grupo);
  }

  /**
   * Ofertas CETAP elegibles para un grupo de la asignatura en un periodo de
   * plataforma: las del programa de la asignatura en ese periodo, activas.
   * Un periodo legado no tiene ofertas CETAP.
   */
  async ofertasCetap(idAsignatura: string, idPeriodo: string): Promise<OfertaCetap[]> {
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) throw new BadRequestException('El periodo no es válido.');
    if (ref.modelo !== 'plataforma') return [];
    return ofertasCetapDe(this.grupoRepo.manager, String(idAsignatura), String(ref.id));
  }

  /** Elimina el grupo. Sus franjas caen con él (ON DELETE CASCADE): son suyas. */
  async eliminar(idGrupo: string): Promise<{ eliminado: true }> {
    const grupo = await this.obtener(idGrupo);
    await this.grupoRepo.remove(grupo);
    return { eliminado: true };
  }
}
