import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { TipoAmparo, TipoPoliza } from '../../entities/amparo.entity';
import { GuardarTipoAmparoDto, GuardarTipoPolizaDto } from './dto/polizas-y-amparos.dto';

/**
 * Tipos de póliza y de amparo de la 8.4 (145).
 *
 * Se administran desde Configuración y no por migración: pueden aparecer
 * clases de garantía o coberturas nuevas, y cada una pediría un despliegue.
 * Ninguno se borra: se retira, porque las garantías ya registradas lo
 * referencian y el expediente tiene que seguir diciendo qué se aseguró.
 */
@Injectable()
export class PolizasYAmparosService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------ tipos de póliza --

  tiposPoliza() {
    return this.dataSource.getRepository(TipoPoliza).find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async guardarTipoPoliza(dto: GuardarTipoPolizaDto) {
    const repo = this.dataSource.getRepository(TipoPoliza);
    const codigo = normalizarCodigo(dto.codigo);
    const existente = await repo.findOne({ where: { codigo } });

    if (existente) {
      existente.nombre = dto.nombre.trim();
      // Sin descripción en el cuerpo se conserva: volver a ofrecer no la borra.
      if (dto.descripcion !== undefined) existente.descripcion = dto.descripcion.trim() || null;
      if (dto.activo !== undefined) existente.activo = dto.activo;
      if (dto.orden !== undefined) existente.orden = dto.orden;
      return repo.save(existente);
    }

    return repo.save(
      repo.create({
        codigo,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        activo: dto.activo ?? true,
        orden: dto.orden ?? (await this.siguienteOrden(repo)),
      }),
    );
  }

  async retirarTipoPoliza(codigo: string) {
    const repo = this.dataSource.getRepository(TipoPoliza);
    const tipo = await repo.findOne({ where: { codigo } });
    if (!tipo) throw new NotFoundException('El tipo de póliza no existe');

    tipo.activo = false;
    return repo.save(tipo);
  }

  // ------------------------------------------------------ tipos de amparo --

  tiposAmparo() {
    return this.dataSource.getRepository(TipoAmparo).find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async guardarTipoAmparo(dto: GuardarTipoAmparoDto) {
    const repo = this.dataSource.getRepository(TipoAmparo);
    const codigo = normalizarCodigo(dto.codigo);
    const tiposPoliza =
      dto.tiposPoliza === undefined ? undefined : await this.validarTiposPoliza(dto.tiposPoliza);
    const existente = await repo.findOne({ where: { codigo } });

    if (existente) {
      existente.nombre = dto.nombre.trim();
      // Sin descripción en el cuerpo se conserva: volver a ofrecer no la borra.
      if (dto.descripcion !== undefined) existente.descripcion = dto.descripcion.trim() || null;
      if (dto.activo !== undefined) existente.activo = dto.activo;
      if (dto.orden !== undefined) existente.orden = dto.orden;
      if (tiposPoliza !== undefined) existente.tiposPoliza = tiposPoliza;
      if (dto.amparaTrasElContrato !== undefined) {
        existente.amparaTrasElContrato = dto.amparaTrasElContrato;
      }
      return repo.save(existente);
    }

    return repo.save(
      repo.create({
        codigo,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        activo: dto.activo ?? true,
        orden: dto.orden ?? (await this.siguienteOrden(repo)),
        tiposPoliza: tiposPoliza ?? [],
        amparaTrasElContrato: dto.amparaTrasElContrato ?? false,
      }),
    );
  }

  async retirarTipoAmparo(codigo: string) {
    const repo = this.dataSource.getRepository(TipoAmparo);
    const tipo = await repo.findOne({ where: { codigo } });
    if (!tipo) throw new NotFoundException('El tipo de amparo no existe');

    tipo.activo = false;
    return repo.save(tipo);
  }

  // ----------------------------------------------------------- auxiliares --

  /** Que existan; si no, se respondería con un amparo que no se ofrece en ningún lado. */
  private async validarTiposPoliza(codigos: string[]) {
    const unicos = [...new Set(codigos.map((c) => c.trim()).filter(Boolean))];
    if (unicos.length === 0) return [];

    const existentes = await this.dataSource
      .getRepository(TipoPoliza)
      .find({ where: { codigo: In(unicos) } });
    const faltan = unicos.filter((c) => !existentes.some((e) => e.codigo === c));
    if (faltan.length > 0) {
      throw new BadRequestException(`No existen los tipos de póliza: ${faltan.join(', ')}`);
    }
    return unicos;
  }

  private async siguienteOrden(repo: { find: (o: any) => Promise<{ orden: number }[]> }) {
    const ultimo = await repo.find({ order: { orden: 'DESC' }, take: 1 });
    return (ultimo[0]?.orden ?? 0) + 10;
  }
}

/** «Seguro de vida» → SEGURO_DE_VIDA: el código viaja en URLs y en la base. */
export function normalizarCodigo(codigo: string) {
  const limpio = codigo
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!limpio) throw new BadRequestException('El código solo puede tener letras y números');
  return limpio.slice(0, 60);
}
