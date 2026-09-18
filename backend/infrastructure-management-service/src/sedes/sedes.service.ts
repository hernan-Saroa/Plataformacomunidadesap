import { Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity.js';
import { BloqueEdificio } from './bloque.entity.js';
import { CreateSedeDto, CreateBloqueDto } from './dto/create-sede.dto.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPOS_SEDE_NORMALIZADOS = ['SEDE_CENTRAL', 'SEDE_ALTERNA', 'TERRITORIAL', 'CETAP'] as const;
type TipoSedeNormalizado = (typeof TIPOS_SEDE_NORMALIZADOS)[number];

const CODIGOS_SEDE_ESPERADOS_POR_DEFECTO: ReadonlyArray<string> = [
  'SEDE-CENTRAL',
  'SEDE-ROSALES',
  'SEDE-TEUSAQUILLO',
  'TERR-ANTIOQUIA',
  'TERR-ATLANTICO',
  'TERR-SANTANDER',
  'TERR-VALLE',
];

function normalizarTipo(raw: string | undefined | null): TipoSedeNormalizado {
  const base = String(raw ?? '').trim().toUpperCase().replace(/[\s\-]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
  if (TIPOS_SEDE_NORMALIZADOS.includes(base as TipoSedeNormalizado)) {
    return base as TipoSedeNormalizado;
  }
  return 'TERRITORIAL';
}

@Injectable()
export class SedesService implements OnModuleInit {
  constructor(
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(BloqueEdificio)
    private readonly bloqueRepo: Repository<BloqueEdificio>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.validarIntegridadSedes();
    } catch (err) {
      console.warn('[SedesService] onModuleInit validación integridad falló (no bloqueante):', err?.message ?? err);
    }
  }

  private async validarIntegridadSedes(): Promise<void> {
    let presentes: Sede[] = [];
    try {
      presentes = await this.sedeRepo.find();
    } catch {
      return;
    }

    const codigos = new Set(presentes.map((s) => s.codigo));
    const faltantes = CODIGOS_SEDE_ESPERADOS_POR_DEFECTO.filter((c) => !codigos.has(c));
    if (faltantes.length > 0) {
      console.warn(
        `[SedesService] Integridad: faltan ${faltantes.length} sedes esperadas por migraciones (${faltantes.join(', ')}). Revise que se ejecutaron las migraciones 001 y 003.`,
      );
    }

    const actualizarAlcance: Sede[] = [];
    for (const s of presentes) {
      if ((s.tipo === 'SEDE_CENTRAL' || s.tipo === 'SEDE_ALTERNA') && s.alcanceUmi !== true) {
        actualizarAlcance.push(s);
      }
    }
    if (actualizarAlcance.length > 0) {
      console.warn(
        `[SedesService] Normalizando alcance_umi=true para sedes ${actualizarAlcance.map((s) => s.codigo).join(', ')} (ajuste migración 004).`,
      );
      for (const s of actualizarAlcance) {
        s.alcanceUmi = true;
      }
      try {
        await this.sedeRepo.save(actualizarAlcance);
      } catch (err) {
        console.warn('[SedesService] No se pudo actualizar alcance_umi por ahora:', err?.message);
      }
    }
  }

  async findAllSedes(soloActivos: boolean = true): Promise<Sede[]> {
    const where: Record<string, any> = {};
    if (soloActivos === true) where.isActivo = true;
    return this.sedeRepo.find({
      where: Object.keys(where).length ? where : undefined,
      relations: ['bloques'],
      order: { nombre: 'ASC' },
    });
  }

  async findSedeById(id: string): Promise<Sede> {
    const sede = await this.sedeRepo.findOne({
      where: { idSede: id },
      relations: ['bloques', 'bloques.espacios'],
    });
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }
    return sede;
  }

  async createSede(dto: CreateSedeDto): Promise<Sede> {
    const codigo = (dto.codigo ?? '').trim().toUpperCase();
    if (!codigo) throw new BadRequestException('El código de la sede es obligatorio.');
    if (codigo.length > 30) throw new BadRequestException('El código excede 30 caracteres permitidos.');

    const nombre = (dto.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('El nombre de la sede es obligatorio.');

    const departamento = (dto.departamento ?? '').trim();
    if (!departamento) throw new BadRequestException('El departamento es obligatorio.');

    const municipio = (dto.municipio ?? '').trim();
    if (!municipio) throw new BadRequestException('El municipio es obligatorio.');

    const direccion = (dto.direccion ?? '').trim();
    if (!direccion) throw new BadRequestException('La dirección es obligatoria.');

    let telefono: string | undefined = dto.telefono?.trim();
    if (telefono === '') telefono = undefined;

    let emailContacto: string | undefined = dto.emailContacto?.trim().toLowerCase();
    if (emailContacto === '') emailContacto = undefined;
    if (emailContacto && !EMAIL_REGEX.test(emailContacto)) {
      throw new BadRequestException('Formato de email de contacto inválido.');
    }

    const tipoNormalizado: TipoSedeNormalizado = normalizarTipo(dto.tipo);
    const alcanceUmiDefault =
      typeof dto.alcanceUmi === 'boolean'
        ? dto.alcanceUmi
        : (tipoNormalizado === 'SEDE_CENTRAL' || tipoNormalizado === 'SEDE_ALTERNA');

    const dup = await this.sedeRepo.findOne({ where: { codigo } });
    if (dup) {
      throw new ConflictException(`Código ${codigo} ya existe en la sede ${dup.nombre}.`);
    }

    const sede = this.sedeRepo.create({
      codigo,
      nombre,
      tipo: tipoNormalizado,
      departamento,
      municipio,
      direccion,
      telefono,
      emailContacto,
      isActivo: dto.isActivo ?? true,
      alcanceUmi: alcanceUmiDefault,
    } as Partial<Sede> as any);

    const guardada = await this.sedeRepo.save(sede as any);
    return this.findSedeById(guardada.idSede);
  }

  async updateSede(id: string, partial: Partial<CreateSedeDto & { isActivo?: boolean; alcanceUmi?: boolean }>): Promise<Sede> {
    const sede = await this.findSedeById(id);

    if (partial.codigo !== undefined) {
      const cod = partial.codigo.trim().toUpperCase();
      if (cod.length > 30) throw new BadRequestException('Código excede 30 caracteres.');
      if (cod !== sede.codigo) {
        const dup = await this.sedeRepo.findOne({ where: { codigo: cod } });
        if (dup && dup.idSede !== id) {
          throw new ConflictException(`Código ${cod} ya está en uso.`);
        }
        sede.codigo = cod;
      }
    }

    if (partial.nombre !== undefined) {
      const n = partial.nombre.trim();
      if (!n) throw new BadRequestException('Nombre no puede ser vacío.');
      sede.nombre = n;
    }

    if (partial.tipo !== undefined) {
      const nt = normalizarTipo(partial.tipo);
      sede.tipo = nt;
      if (partial.alcanceUmi === undefined && (nt === 'SEDE_CENTRAL' || nt === 'SEDE_ALTERNA')) {
        sede.alcanceUmi = true;
      }
    }
    if (partial.departamento !== undefined) sede.departamento = partial.departamento.trim();
    if (partial.municipio !== undefined) sede.municipio = partial.municipio.trim();
    if (partial.direccion !== undefined) sede.direccion = partial.direccion.trim();
    if (partial.telefono !== undefined) sede.telefono = (partial.telefono.trim() || null) as any;
    if (partial.emailContacto !== undefined) {
      const em = partial.emailContacto.trim().toLowerCase();
      if (em && !EMAIL_REGEX.test(em)) throw new BadRequestException('Email inválido.');
      sede.emailContacto = (em || null) as any;
    }
    if (typeof partial.isActivo === 'boolean') sede.isActivo = partial.isActivo;
    if (typeof partial.alcanceUmi === 'boolean') sede.alcanceUmi = partial.alcanceUmi;

    return this.sedeRepo.save(sede);
  }

  async toggleSedeActiva(id: string): Promise<Sede> {
    const sede = await this.findSedeById(id);
    sede.isActivo = !sede.isActivo;
    return this.sedeRepo.save(sede);
  }

  async deleteSede(id: string): Promise<{ idSede: string; eliminado: boolean }> {
    const sede = await this.sedeRepo.findOne({
      where: { idSede: id },
      relations: ['bloques'],
    });
    if (!sede) throw new NotFoundException(`Sede ${id} no existe.`);
    if (sede.bloques && sede.bloques.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la sede ${sede.codigo}: tiene ${sede.bloques.length} bloque(s) ligado(s). Desactive la sede en su lugar.`,
      );
    }
    await this.sedeRepo.delete(sede.idSede);
    return { idSede: sede.idSede, eliminado: true };
  }

  async findAllBloques(soloActivos: boolean = true): Promise<BloqueEdificio[]> {
    const where: Record<string, any> = {};
    if (soloActivos === true) where.isActivo = true;
    return this.bloqueRepo.find({
      where: Object.keys(where).length ? where : undefined,
      relations: ['sede'],
      order: { codigo: 'ASC' },
    });
  }

  async findBloqueById(idBloque: string): Promise<BloqueEdificio> {
    const b = await this.bloqueRepo.findOne({
      where: { idBloque },
      relations: ['sede', 'espacios'],
    });
    if (!b) throw new NotFoundException(`Bloque ${idBloque} no existe.`);
    return b;
  }

  async listBloquesPorSede(idSede: string, soloActivos: boolean = true): Promise<BloqueEdificio[]> {
    const sede = await this.sedeRepo.findOne({ where: { idSede } });
    if (!sede) throw new NotFoundException(`Sede ${idSede} no existe.`);
    const where: Record<string, any> = { idSede };
    if (soloActivos === true) where.isActivo = true;
    return this.bloqueRepo.find({ where, order: { codigo: 'ASC' } });
  }

  async createBloque(dto: CreateBloqueDto): Promise<BloqueEdificio> {
    const sede = await this.sedeRepo.findOne({ where: { idSede: dto.idSede } });
    if (!sede) throw new NotFoundException(`Sede ${dto.idSede} no existe para crear el bloque.`);

    const codigo = (dto.codigo ?? '').trim().toUpperCase();
    if (!codigo) throw new BadRequestException('El código del bloque es obligatorio.');
    if (codigo.length > 30) throw new BadRequestException('El código de bloque excede 30 caracteres.');

    const nombre = (dto.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('El nombre del bloque es obligatorio.');
    if (nombre.length > 100) throw new BadRequestException('El nombre del bloque excede 100 caracteres.');

    const pisos = typeof dto.pisos === 'number' ? Math.max(1, Math.floor(dto.pisos)) : 1;

    const dup = await this.bloqueRepo.findOne({ where: { idSede: dto.idSede, codigo } });
    if (dup) {
      throw new ConflictException(
        `Ya existe el bloque ${codigo} en la sede ${sede.codigo} (${sede.nombre}).`,
      );
    }

    let descripcion: string | undefined = dto.descripcion?.trim();
    if (descripcion === '') descripcion = undefined;

    const bloque = this.bloqueRepo.create({
      idSede: dto.idSede,
      codigo,
      nombre,
      pisos,
      descripcion,
      isActivo: typeof dto.isActivo === 'boolean' ? dto.isActivo : true,
    } as Partial<BloqueEdificio> as any);

    const guardado = await this.bloqueRepo.save(bloque as any);
    return this.findBloqueById(guardado.idBloque);
  }

  async updateBloque(idBloque: string, partial: Partial<CreateBloqueDto> & { isActivo?: boolean }): Promise<BloqueEdificio> {
    const b = await this.findBloqueById(idBloque);

    if (partial.idSede !== undefined && partial.idSede !== b.idSede) {
      const sedeDest = await this.sedeRepo.findOne({ where: { idSede: partial.idSede } });
      if (!sedeDest) throw new NotFoundException(`Sede destino ${partial.idSede} no existe.`);
      b.idSede = partial.idSede;
    }

    if (partial.codigo !== undefined) {
      const cod = partial.codigo.trim().toUpperCase();
      if (!cod) throw new BadRequestException('Código no puede ser vacío.');
      if (cod.length > 30) throw new BadRequestException('Código excede 30 caracteres.');
      if (cod !== b.codigo) {
        const dup = await this.bloqueRepo.findOne({ where: { idSede: b.idSede, codigo: cod } });
        if (dup && dup.idBloque !== idBloque) {
          throw new ConflictException(`Código ${cod} ya existe en la sede.`);
        }
        b.codigo = cod;
      }
    }

    if (partial.nombre !== undefined) {
      const n = partial.nombre.trim();
      if (!n) throw new BadRequestException('Nombre no puede ser vacío.');
      if (n.length > 100) throw new BadRequestException('Nombre excede 100 caracteres.');
      b.nombre = n;
    }
    if (typeof partial.pisos === 'number') {
      const p = Math.max(1, Math.floor(partial.pisos));
      b.pisos = p;
    }
    if (partial.descripcion !== undefined) {
      b.descripcion = (partial.descripcion.trim() || null) as any;
    }
    if (typeof partial.isActivo === 'boolean') b.isActivo = partial.isActivo;

    await this.bloqueRepo.save(b);
    return this.findBloqueById(idBloque);
  }

  async toggleBloqueActivo(idBloque: string): Promise<BloqueEdificio> {
    const b = await this.findBloqueById(idBloque);
    b.isActivo = !b.isActivo;
    await this.bloqueRepo.save(b);
    return this.findBloqueById(idBloque);
  }

  async deleteBloque(idBloque: string): Promise<{ idBloque: string; eliminado: boolean }> {
    const b = await this.findBloqueById(idBloque);
    if (b.espacios && b.espacios.length > 0) {
      throw new ConflictException(
        `No se puede eliminar el bloque ${b.codigo}: tiene ${b.espacios.length} espacio(s) ligado(s). Desactive el bloque en su lugar.`,
      );
    }
    await this.bloqueRepo.delete(b.idBloque);
    return { idBloque: b.idBloque, eliminado: true };
  }
}
