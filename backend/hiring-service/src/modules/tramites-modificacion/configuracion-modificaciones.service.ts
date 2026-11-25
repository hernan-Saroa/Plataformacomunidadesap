import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  CadenaModificacion,
  FaseCadenaModificacion,
  TipoDeModificacion,
} from '../../entities/tramite-modificacion.entity';
import { GuardarCadenaModificacionDto, GuardarTipoModificacionDto } from './dto/tramites-modificacion.dto';
import { validarCadena } from './reglas';

const FASES: FaseCadenaModificacion[] = ['REVISION', 'VISTO_BUENO'];

/** MAYÚSCULAS, sin tildes y con guiones bajos: el código de un tipo nuevo. */
export function normalizarCodigo(codigo: string): string {
  return codigo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/**
 * Configuración del módulo de Modificaciones (150): el catálogo de tipos y las
 * dos cadenas.
 *
 * Los tipos se crean sin migración, pero su efecto sale de una lista cerrada:
 * es lo que el código sabe aplicarle al contrato. Un tipo nuevo como
 * «Reducción de valor» o «Modificación de obligaciones» se crea con efecto
 * «otro», que no cambia nada y deja el registro. Ninguno se borra: se retira,
 * porque las modificaciones radicadas lo nombran.
 */
@Injectable()
export class ConfiguracionModificacionesService {
  constructor(private readonly dataSource: DataSource) {}

  tipos() {
    return this.dataSource.getRepository(TipoDeModificacion).find({ order: { orden: 'ASC', nombre: 'ASC' } });
  }

  async guardarTipo(dto: GuardarTipoModificacionDto) {
    const repo = this.dataSource.getRepository(TipoDeModificacion);
    const codigo = normalizarCodigo(dto.codigo);
    if (!codigo) throw new BadRequestException('El código del tipo no puede quedar vacío');

    const existente = await repo.findOne({ where: { codigo } });
    if (existente) {
      existente.nombre = dto.nombre.trim();
      if (dto.descripcion !== undefined) existente.descripcion = dto.descripcion.trim() || null;
      existente.efecto = dto.efecto;
      if (dto.vaSola !== undefined) existente.vaSola = dto.vaSola;
      if (dto.activo !== undefined) existente.activo = dto.activo;
      if (dto.orden !== undefined) existente.orden = dto.orden;
      existente.confirmado = true;
      return repo.save(existente);
    }

    const ultimo = await repo.createQueryBuilder('t').select('MAX(t.orden)', 'max').getRawOne();
    return repo.save(
      repo.create({
        codigo,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        efecto: dto.efecto,
        // Lo que cambia el estado del contrato va solo aunque no se diga.
        vaSola: dto.vaSola ?? ['SUSPENSION', 'REANUDACION', 'TERMINACION_ANTICIPADA'].includes(dto.efecto),
        activo: dto.activo ?? true,
        orden: dto.orden ?? Number(ultimo?.max ?? 0) + 10,
        confirmado: true,
      }),
    );
  }

  async retirarTipo(codigo: string) {
    const repo = this.dataSource.getRepository(TipoDeModificacion);
    const tipo = await repo.findOne({ where: { codigo } });
    if (!tipo) throw new NotFoundException('El tipo de modificación no existe');
    tipo.activo = false;
    return repo.save(tipo);
  }

  cadenas() {
    return this.dataSource.getRepository(CadenaModificacion).find({ order: { fase: 'DESC' } });
  }

  async guardarCadena(fase: string, dto: GuardarCadenaModificacionDto, quien: string) {
    if (!FASES.includes(fase as FaseCadenaModificacion)) {
      throw new NotFoundException('La cadena es la de revisión o la de visto bueno');
    }
    const { escalones, problemas } = validarCadena(dto.escalones);
    if (problemas.length) throw new BadRequestException(problemas.join('. '));

    const repo = this.dataSource.getRepository(CadenaModificacion);
    const cadena = (await repo.findOne({ where: { fase: fase as FaseCadenaModificacion } })) ??
      repo.create({ fase: fase as FaseCadenaModificacion });
    cadena.escalones = escalones;
    cadena.confirmado = true;
    cadena.updatedBy = quien;
    cadena.updatedAt = new Date();
    // Las rondas abiertas conservan la copia con la que empezaron.
    return repo.save(cadena);
  }
}
