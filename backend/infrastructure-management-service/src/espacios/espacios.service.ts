import { Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspacioFisico } from './espacio.entity.js';
import { BloqueEdificio } from '../sedes/bloque.entity.js';
import {
  CreateEspacioDto,
  UpdateEstadoEspacioDto,
  UpdateEspacioDto,
  ES_TIPO_ESPACIO_VALIDO,
} from './dto/create-espacio.dto.js';

const ESTADOS_VALIDOS = ['DISPONIBLE', 'MANTENIMIENTO', 'INACTIVO', 'RESERVADO'] as const;
type EstadoEspacio = (typeof ESTADOS_VALIDOS)[number];

function esEstadoValido(v: string): v is EstadoEspacio {
  return (ESTADOS_VALIDOS as readonly string[]).includes(v);
}

function normalizarTipoEspacio(raw: string | undefined | null): string {
  const base = String(raw ?? '').trim().toUpperCase().replace(/[\s\-]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
  if (ES_TIPO_ESPACIO_VALIDO(base)) return base;
  return base;
}

@Injectable()
export class EspaciosService implements OnModuleInit {
  constructor(
    @InjectRepository(EspacioFisico)
    private readonly espacioRepo: Repository<EspacioFisico>,
    @InjectRepository(BloqueEdificio)
    private readonly bloqueRepo: Repository<BloqueEdificio>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.guardianIntegridadTabla();
    } catch (err) {
      console.warn('[EspaciosService] onModuleInit guardian no bloqueante falló:', err?.message ?? err);
    }
  }

  private async guardianIntegridadTabla(): Promise<void> {
    let total = 0;
    try {
      total = await this.espacioRepo.count();
    } catch {
      return;
    }
    if (total === 0) {
      console.warn(
        '[EspaciosService] La tabla espacio_fisico está vacía. Esperando migraciones 009 (bloques + espacios seed). No se insertarán datos por defecto (fuente migraciones).',
      );
    }
  }

  async findAll(opts?: {
    tipo?: string;
    estado?: string;
    idBloque?: string;
    idSede?: string;
    soloActivos?: boolean;
  }): Promise<EspacioFisico[]> {
    const soloActivos = opts?.soloActivos !== false; // default true
    const query = this.espacioRepo
      .createQueryBuilder('espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque')
      .leftJoinAndSelect('bloque.sede', 'sede');

    if (soloActivos === true) query.andWhere('espacio.isActivo = :isActivo', { isActivo: true });
    if (opts?.tipo) query.andWhere('espacio.tipo = :tipo', { tipo: normalizarTipoEspacio(opts.tipo) });
    if (opts?.estado && esEstadoValido(opts.estado.toUpperCase())) {
      query.andWhere('espacio.estado = :estado', { estado: opts.estado.toUpperCase() });
    }
    if (opts?.idBloque) query.andWhere('espacio.idBloque = :idBloque', { idBloque: opts.idBloque });
    if (opts?.idSede) query.andWhere('bloque.idSede = :idSede', { idSede: opts.idSede });

    return query.orderBy('sede.nombre', 'ASC').addOrderBy('bloque.codigo', 'ASC').addOrderBy('espacio.codigo', 'ASC').getMany();
  }

  async findById(id: string): Promise<EspacioFisico> {
    const espacio = await this.espacioRepo.findOne({
      where: { idEspacio: id },
      relations: ['bloque', 'bloque.sede'],
    });
    if (!espacio) throw new NotFoundException(`Espacio con ID ${id} no encontrado`);
    return espacio;
  }

  async create(dto: CreateEspacioDto): Promise<EspacioFisico> {
    const idBloque = dto.idBloque?.trim();
    if (!idBloque) throw new BadRequestException('idBloque es obligatorio.');

    const bloque = await this.bloqueRepo.findOne({ where: { idBloque }, relations: ['sede'] });
    if (!bloque) throw new NotFoundException(`Bloque ${idBloque} no existe.`);

    const codigo = (dto.codigo ?? '').trim().toUpperCase();
    if (!codigo) throw new BadRequestException('Código de espacio es obligatorio.');
    if (codigo.length > 50) throw new BadRequestException('Código supera 50 caracteres.');

    const dup = await this.espacioRepo.findOne({ where: { idBloque, codigo } });
    if (dup) {
      throw new ConflictException(
        `Ya existe un espacio con código ${codigo} en el bloque ${bloque.codigo} (sede ${bloque.sede?.codigo ?? '?'}).`,
      );
    }

    const nombre = (dto.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('Nombre del espacio es obligatorio.');

    const tipoNormalizado = normalizarTipoEspacio(dto.tipo);
    if (!ES_TIPO_ESPACIO_VALIDO(tipoNormalizado)) {
      throw new BadRequestException(`Tipo inválido ${tipoNormalizado}. Valores permitidos: AULA, AUDITORIO, LABORATORIO, OFICINA, BIBLIOTECA, SALA_CONSEJO.`);
    }

    const capacidadRaw = dto.capacidad ?? 30;
    const capacidad = typeof capacidadRaw === 'number' && Number.isFinite(capacidadRaw) ? Math.max(1, Math.floor(capacidadRaw)) : 30;
    const pisoRaw = dto.piso ?? 1;
    const piso = typeof pisoRaw === 'number' && Number.isFinite(pisoRaw) ? Math.floor(pisoRaw) : 1;

    let areaM2: number | undefined = dto.areaM2;
    if (areaM2 !== undefined && areaM2 !== null) {
      if (typeof areaM2 !== 'number' || !Number.isFinite(areaM2) || areaM2 <= 0) {
        areaM2 = undefined;
      }
    }

    const estadoRaw = (dto.estado ?? 'DISPONIBLE').toUpperCase();
    const estado = esEstadoValido(estadoRaw) ? estadoRaw : 'DISPONIBLE';

    const tieneAireAcondicionado = Boolean(dto.tieneAireAcondicionado ?? false);
    const tieneVideobeam = Boolean(dto.tieneVideobeam ?? false);
    const tieneComputadores = Boolean(dto.tieneComputadores ?? false);
    const isActivo = Boolean(dto.isActivo ?? true);

    const espacio = this.espacioRepo.create({
      idBloque,
      codigo,
      nombre,
      tipo: tipoNormalizado,
      capacidad,
      piso,
      areaM2,
      tieneAireAcondicionado,
      tieneVideobeam,
      tieneComputadores,
      estado,
      isActivo,
    } as Partial<EspacioFisico> as any);

    const guardado = await this.espacioRepo.save(espacio as any);
    return this.findById(guardado.idEspacio);
  }

  async updateEspacio(id: string, partial: UpdateEspacioDto): Promise<EspacioFisico> {
    const espacio = await this.findById(id);

    if (partial.idBloque !== undefined) {
      const idB = partial.idBloque.trim();
      if (idB !== espacio.idBloque) {
        const blq = await this.bloqueRepo.findOne({ where: { idBloque: idB } });
        if (!blq) throw new NotFoundException(`Nuevo bloque ${idB} no existe.`);
        espacio.idBloque = idB;
      }
    }

    if (partial.codigo !== undefined) {
      const c = partial.codigo.trim().toUpperCase();
      if (c && c !== espacio.codigo) {
        const dup = await this.espacioRepo.findOne({ where: { idBloque: espacio.idBloque, codigo: c } });
        if (dup && dup.idEspacio !== id) {
          throw new ConflictException(`Código ${c} ya existe en el bloque.`);
        }
        espacio.codigo = c;
      }
    }

    if (partial.nombre !== undefined) {
      const n = partial.nombre.trim();
      if (!n) throw new BadRequestException('Nombre no puede ser vacío.');
      espacio.nombre = n;
    }

    if (partial.tipo !== undefined) {
      const nt = normalizarTipoEspacio(partial.tipo);
      if (!ES_TIPO_ESPACIO_VALIDO(nt)) throw new BadRequestException(`Tipo ${nt} inválido.`);
      espacio.tipo = nt;
    }

    if (partial.capacidad !== undefined && partial.capacidad !== null) {
      const c = Number(partial.capacidad);
      if (!Number.isFinite(c) || c < 1) throw new BadRequestException('Capacidad debe ser entero >= 1.');
      espacio.capacidad = Math.floor(c);
    }
    if (partial.piso !== undefined && partial.piso !== null) {
      espacio.piso = Math.floor(Number(partial.piso));
    }
    if (partial.areaM2 !== undefined) {
      espacio.areaM2 = partial.areaM2 as any;
    }
    if (partial.estado !== undefined) {
      const est = (partial.estado || '').toUpperCase();
      if (!esEstadoValido(est)) throw new BadRequestException(`Estado ${partial.estado} inválido.`);
      espacio.estado = est;
    }
    if (typeof partial.tieneAireAcondicionado === 'boolean') espacio.tieneAireAcondicionado = partial.tieneAireAcondicionado;
    if (typeof partial.tieneVideobeam === 'boolean') espacio.tieneVideobeam = partial.tieneVideobeam;
    if (typeof partial.tieneComputadores === 'boolean') espacio.tieneComputadores = partial.tieneComputadores;
    if (typeof partial.isActivo === 'boolean') espacio.isActivo = partial.isActivo;

    const guardado = await this.espacioRepo.save(espacio as any);
    return this.findById(guardado.idEspacio);
  }

  async updateEstado(id: string, dto: UpdateEstadoEspacioDto): Promise<EspacioFisico> {
    return this.updateEspacio(id, { estado: dto.estado });
  }

  async toggleEspacioActivo(id: string): Promise<EspacioFisico> {
    const espacio = await this.findById(id);
    espacio.isActivo = !espacio.isActivo;
    if (!espacio.isActivo && espacio.estado !== 'INACTIVO') espacio.estado = 'INACTIVO';
    if (espacio.isActivo && espacio.estado === 'INACTIVO') espacio.estado = 'DISPONIBLE';
    const guardado = await this.espacioRepo.save(espacio as any);
    return this.findById(guardado.idEspacio);
  }

  async deleteEspacio(id: string): Promise<{ idEspacio: string; eliminado: boolean }> {
    const espacio = await this.espacioRepo.findOne({
      where: { idEspacio: id },
      relations: ['bloque', 'bloque.sede'],
    });
    if (!espacio) throw new NotFoundException(`Espacio ${id} no existe.`);
    // TODO: validar solicitudes de mantenimiento ligadas cuando exista relación
    await this.espacioRepo.delete(espacio.idEspacio);
    return { idEspacio: espacio.idEspacio, eliminado: true };
  }

  async getEstadisticas() {
    const total = await this.espacioRepo.count({ where: { isActivo: true } });
    const disponibles = await this.espacioRepo.count({ where: { isActivo: true, estado: 'DISPONIBLE' } });
    const enMantenimiento = await this.espacioRepo.count({ where: { isActivo: true, estado: 'MANTENIMIENTO' } });
    const reservadas = await this.espacioRepo.count({ where: { isActivo: true, estado: 'RESERVADO' } });
    return {
      total,
      disponibles,
      enMantenimiento,
      reservadas,
      porcentajeOcupacion: total > 0 ? Math.round(((total - disponibles) / total) * 100) : 0,
    };
  }
}
