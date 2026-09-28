import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { Actividad } from '../../entities/actividad.entity';
import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import {
  ActualizarDocumentoRequeridoDto,
  CrearDocumentoRequeridoDto,
} from './dto/documentos-requeridos.dto';

/**
 * El código de negocio de un documento, a partir de su nombre.
 *
 * Mayúsculas sin tildes y con guion bajo, como los que sembraron la 019 y la
 * 074 (MEMORANDO_SOLICITUD, AVISO_CONVOCATORIA). Las entregas lo citan, así
 * que se fija al crear y ya no cambia aunque se corrija el nombre.
 */
export function codigoDesdeNombre(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return base || 'DOCUMENTO';
}

/** El primer código libre de la actividad: el propio, o con sufijo _2, _3… */
export function codigoLibre(base: string, ocupados: string[]): string {
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base.slice(0, 56)}_${n}`;
    if (!usados.has(candidato)) return candidato;
  }
}

/**
 * Administra qué documentos pide cada actividad (EFDS-2066).
 *
 * Es la otra cara de `DocumentosActividadService`: aquel responde qué le pide
 * la actividad a un proceso, este deja a Contratación decidirlo sin desplegar.
 * No borra: un requisito que deja de pedirse se desactiva, porque los procesos
 * que ya lo entregaron tienen que poder mostrar qué se les pidió.
 */
@Injectable()
export class DocumentosRequeridosService {
  constructor(private readonly dataSource: DataSource) {}

  /** Los de una actividad, activos e inactivos, con su plantilla resuelta. */
  async listar(numeral?: string) {
    const filas = await this.dataSource.getRepository(DocumentoRequerido).find({
      where: numeral ? { numeral } : {},
      order: { numeral: 'ASC', orden: 'ASC', nombre: 'ASC' },
    });

    const codigos = [
      ...new Set(filas.map((f) => f.plantillaCodigo).filter((c): c is string => !!c)),
    ];
    const plantillas = codigos.length
      ? await this.dataSource.getRepository(Plantilla).find({
          where: { codigo: In(codigos), activo: true },
          order: { createdAt: 'DESC' },
        })
      : [];
    const vigente = new Map<string, Plantilla>();
    for (const p of plantillas) if (!vigente.has(p.codigo)) vigente.set(p.codigo, p);

    return filas.map((f) => {
      const p = f.plantillaCodigo ? vigente.get(f.plantillaCodigo) : undefined;
      return {
        id: f.id,
        numeral: f.numeral,
        codigo: f.codigo,
        nombre: f.nombre,
        descripcion: f.descripcion ?? null,
        obligatorio: f.obligatorio,
        modalidades: f.modalidades,
        tipologias: f.tipologias,
        orden: f.orden,
        activo: f.activo,
        confirmado: f.confirmado,
        notaFuente: f.notaFuente,
        plantillaCodigo: f.plantillaCodigo,
        /*
         * La versión que se ofrecerá hoy, o null si el código ya no tiene
         * ninguna activa. Se dice en la pantalla: un requisito que cita un
         * formato retirado no ofrece nada para descargar.
         */
        plantilla: p
          ? { id: p.id, codigo: p.codigo, nombre: p.nombre, version: p.version, tieneArchivo: !!p.archivoUrl }
          : null,
      };
    });
  }

  async crear(dto: CrearDocumentoRequeridoDto) {
    return this.dataSource.transaction(async (em) => {
      const numeral = dto.numeral.trim();
      await this.exigirActividad(em, numeral);
      await this.exigirPlantilla(em, dto.plantillaCodigo);

      const existentes = await em.getRepository(DocumentoRequerido).find({ where: { numeral } });
      const nombre = dto.nombre.trim();

      const fila = em.getRepository(DocumentoRequerido).create({
        numeral,
        codigo: codigoLibre(
          codigoDesdeNombre(nombre),
          existentes.map((e) => e.codigo),
        ),
        nombre,
        descripcion: dto.descripcion?.trim() || null,
        plantillaCodigo: dto.plantillaCodigo?.trim() || null,
        obligatorio: dto.obligatorio ?? true,
        modalidades: dto.modalidades ?? [],
        tipologias: dto.tipologias ?? [],
        // Al final de la lista si no se dice otra cosa.
        orden: dto.orden ?? Math.max(0, ...existentes.map((e) => e.orden)) + 10,
        activo: true,
        // Lo configura el área: es decisión suya, no lectura del equipo.
        confirmado: true,
        notaFuente: 'Configurado desde Configuración de etapas (EFDS-2066).',
      } as Partial<DocumentoRequerido>);

      return em.save(fila);
    });
  }

  async actualizar(id: string, dto: ActualizarDocumentoRequeridoDto) {
    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(DocumentoRequerido);
      const fila = await repo.findOne({ where: { id } });
      if (!fila) throw new NotFoundException('El documento requerido no existe');

      if (dto.plantillaCodigo !== undefined) {
        await this.exigirPlantilla(em, dto.plantillaCodigo);
        fila.plantillaCodigo = dto.plantillaCodigo?.trim() || null;
      }
      if (dto.nombre !== undefined) fila.nombre = dto.nombre.trim();
      if (dto.descripcion !== undefined) fila.descripcion = dto.descripcion?.trim() || null;
      if (dto.obligatorio !== undefined) fila.obligatorio = dto.obligatorio;
      if (dto.modalidades !== undefined) fila.modalidades = dto.modalidades;
      if (dto.tipologias !== undefined) fila.tipologias = dto.tipologias;
      if (dto.orden !== undefined) fila.orden = dto.orden;
      if (dto.activo !== undefined) fila.activo = dto.activo;

      // Quien lo toca desde la pantalla lo está decidiendo: deja de ser la
      // lectura del procedimiento que el equipo sembró sin confirmar.
      fila.confirmado = true;

      return repo.save(fila);
    });
  }

  /**
   * Copia un requisito a otra actividad.
   *
   * Es la forma de reutilizar: el mismo documento, con su plantilla y su
   * alcance, pedido en otro punto. Queda como fila propia porque cada
   * actividad decide después, por su cuenta, si lo exige o no.
   */
  async copiar(id: string, numeralDestino: string) {
    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(DocumentoRequerido);
      const origen = await repo.findOne({ where: { id } });
      if (!origen) throw new NotFoundException('El documento requerido no existe');

      const numeral = numeralDestino.trim();
      if (numeral === origen.numeral) {
        throw new BadRequestException('El documento ya está en esa actividad');
      }
      await this.exigirActividad(em, numeral);

      const existentes = await repo.find({ where: { numeral } });

      return em.save(
        repo.create({
          numeral,
          codigo: codigoLibre(
            origen.codigo,
            existentes.map((e) => e.codigo),
          ),
          nombre: origen.nombre,
          descripcion: origen.descripcion,
          plantillaCodigo: origen.plantillaCodigo,
          obligatorio: origen.obligatorio,
          modalidades: origen.modalidades,
          tipologias: origen.tipologias,
          orden: Math.max(0, ...existentes.map((e) => e.orden)) + 10,
          activo: true,
          confirmado: true,
          notaFuente: `Copiado de la actividad ${origen.numeral} (EFDS-2066).`,
        } as Partial<DocumentoRequerido>),
      );
    });
  }

  private async exigirActividad(em: EntityManager, numeral: string) {
    const actividad = await em.getRepository(Actividad).findOne({ where: { numeral } });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe`);
  }

  /**
   * Que el formato citado exista en la biblioteca.
   *
   * Basta con que tenga alguna versión activa: el requisito cita el código y
   * la versión que se ofrece se resuelve al consultar.
   */
  private async exigirPlantilla(em: EntityManager, codigo: string | null | undefined) {
    if (!codigo?.trim()) return;
    const hay = await em.getRepository(Plantilla).count({
      where: { codigo: codigo.trim(), activo: true },
    });
    if (!hay) {
      throw new BadRequestException(
        `El formato ${codigo} no está en la biblioteca o fue retirado: súbelo antes de asociarlo`,
      );
    }
  }
}
