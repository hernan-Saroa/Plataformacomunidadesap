import { Controller, Get, Header, Injectable, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

@Injectable()
export class RundCatalogosService {
  constructor(private readonly db: DataSource) {}

  async seccionales() {
    // ID y código son distintos. Se preserva el ID textual de bigint, sin convertirlo a Number.
    const items = await this.db.query(`SELECT id_seccional::text AS id, nom_seccional AS nombre
      FROM auth.seccionales ORDER BY id_seccional`);
    return { items, total: items.length };
  }

  async territorialesBanco() {
    // Conserva el orden y las tres columnas que utilizaba la carga/edición de RUND.
    const items = await this.db.query(`SELECT id_seccional::text AS id, nom_seccional AS nombre,
      cod_seccional AS codigo FROM auth.seccionales ORDER BY nom_seccional ASC`);
    return { items, total: items.length };
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/catalogos')
export class RundCatalogosController {
  constructor(private readonly catalogos: RundCatalogosService) {}

  @Get('seccionales')
  @Header('Cache-Control', 'private, no-store')
  seccionales() { return this.catalogos.seccionales(); }

  @Get('territoriales-banco')
  @Header('Cache-Control', 'private, no-store')
  territorialesBanco() { return this.catalogos.territorialesBanco(); }
}
