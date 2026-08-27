import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Graduate } from './graduate.entity';
import { GraduateProgram } from './graduate-program.entity';

export type GraduateProgramCatalogItem = {
  id: string;
  name: string;
  usageCount: number;
  canDelete: boolean;
  createdBy?: string | null;
  createdAt: Date;
};

const INTEGRATION_CATALOG_CREATORS = [
  'Migración desde graduados existentes',
  'Sincronización de graduados',
];

@Injectable()
export class GraduateProgramsService {
  constructor(
    @InjectRepository(GraduateProgram)
    private readonly programRepository: Repository<GraduateProgram>,
    @InjectRepository(Graduate)
    private readonly graduateRepository: Repository<Graduate>,
  ) {}

  private normalizeDisplayName(value: unknown): string {
    return String(value || '')
      .normalize('NFC')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleUpperCase('es-CO');
  }

  private normalizeKey(value: unknown): string {
    return this.normalizeDisplayName(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private validateName(value: unknown): {
    name: string;
    normalizedName: string;
  } {
    const name = this.normalizeDisplayName(value);
    const normalizedName = this.normalizeKey(name);

    if (name.length < 3) {
      throw new BadRequestException(
        'El nombre del programa debe tener al menos 3 caracteres.',
      );
    }
    if (name.length > 255) {
      throw new BadRequestException(
        'El nombre del programa no puede superar 255 caracteres.',
      );
    }
    if (!normalizedName) {
      throw new BadRequestException('Ingrese un nombre de programa válido.');
    }

    return { name, normalizedName };
  }

  private async getGraduateProgramUsage(): Promise<Map<string, number>> {
    const graduates = await this.graduateRepository.find({
      select: {
        id: true,
        programName: true,
        degreeTitle: true,
      },
    });
    const usage = new Map<string, number>();

    graduates.forEach((graduate) => {
      const graduateProgramKeys = new Set(
        [graduate.programName, graduate.degreeTitle]
          .map((value) => this.normalizeKey(value))
          .filter(Boolean),
      );

      graduateProgramKeys.forEach((key) => {
        usage.set(key, (usage.get(key) || 0) + 1);
      });
    });

    return usage;
  }

  private async getGraduateProgramNames(): Promise<Map<string, string>> {
    const graduates = await this.graduateRepository.find({
      select: {
        programName: true,
        degreeTitle: true,
      },
    });
    const namesByKey = new Map<string, string>();

    graduates.forEach((graduate) => {
      [graduate.programName, graduate.degreeTitle].forEach((value) => {
        const name = this.normalizeDisplayName(value);
        const normalizedName = this.normalizeKey(name);
        if (normalizedName && !namesByKey.has(normalizedName)) {
          namesByKey.set(normalizedName, name);
        }
      });
    });

    return namesByKey;
  }

  private async getManuallyCreatedPrograms(): Promise<GraduateProgram[]> {
    return this.programRepository
      .createQueryBuilder('program')
      .where(
        '(program.createdBy IS NULL OR program.createdBy NOT IN (:...integrationCreators))',
        { integrationCreators: INTEGRATION_CATALOG_CREATORS },
      )
      .orderBy('program.name', 'ASC')
      .getMany();
  }

  /** Lista exclusiva para el administrador visual de programas. */
  async list(): Promise<GraduateProgramCatalogItem[]> {
    const [programs, usage] = await Promise.all([
      this.getManuallyCreatedPrograms(),
      this.getGraduateProgramUsage(),
    ]);

    return programs.map((program) => {
      const usageCount = usage.get(program.normalizedName) || 0;
      return {
        id: program.id,
        name: program.name,
        usageCount,
        canDelete: usageCount === 0,
        createdBy: program.createdBy,
        createdAt: program.createdAt,
      };
    });
  }

  /**
   * Opciones completas para filtros y formularios. Combina, sin persistir,
   * los programas de graduados existentes con los creados manualmente.
   */
  async listOptions(): Promise<string[]> {
    const [graduateNames, manualPrograms] = await Promise.all([
      this.getGraduateProgramNames(),
      this.getManuallyCreatedPrograms(),
    ]);
    const namesByKey = new Map(graduateNames);

    manualPrograms.forEach((program) => {
      namesByKey.set(program.normalizedName, program.name);
    });

    return Array.from(namesByKey.values()).sort((first, second) =>
      first.localeCompare(second, 'es', { sensitivity: 'base' }),
    );
  }

  async create(
    value: unknown,
    createdBy?: string,
  ): Promise<GraduateProgramCatalogItem> {
    const { name, normalizedName } = this.validateName(value);

    const existing = await this.programRepository.findOne({
      where: { normalizedName },
    });
    if (existing) {
      throw new ConflictException(`El programa “${existing.name}” ya existe.`);
    }

    const graduateNames = await this.getGraduateProgramNames();
    const existingGraduateProgram = graduateNames.get(normalizedName);
    if (existingGraduateProgram) {
      throw new ConflictException(
        `El programa “${existingGraduateProgram}” ya existe en los registros de graduados.`,
      );
    }

    try {
      const saved = await this.programRepository.save(
        this.programRepository.create({
          name,
          normalizedName,
          createdBy: String(createdBy || '').trim() || 'Gestión de Graduados',
        }),
      );
      return {
        id: saved.id,
        name: saved.name,
        usageCount: 0,
        canDelete: true,
        createdBy: saved.createdBy,
        createdAt: saved.createdAt,
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`El programa “${name}” ya existe.`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    value: unknown,
  ): Promise<GraduateProgramCatalogItem> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (
      !program ||
      INTEGRATION_CATALOG_CREATORS.includes(program.createdBy || '')
    ) {
      throw new NotFoundException('Programa no encontrado.');
    }

    const { name, normalizedName } = this.validateName(value);
    const previousName = program.name;
    const previousNormalizedName = program.normalizedName;

    if (normalizedName !== previousNormalizedName) {
      const [existing, graduateNames] = await Promise.all([
        this.programRepository.findOne({ where: { normalizedName } }),
        this.getGraduateProgramNames(),
      ]);

      if (existing && existing.id !== program.id) {
        throw new ConflictException(
          `El programa “${existing.name}” ya existe.`,
        );
      }

      const existingGraduateProgram = graduateNames.get(normalizedName);
      if (existingGraduateProgram) {
        throw new ConflictException(
          `El programa “${existingGraduateProgram}” ya existe en los registros de graduados.`,
        );
      }
    }

    try {
      await this.programRepository.manager.transaction(async (manager) => {
        const graduateRepository = manager.getRepository(Graduate);
        const programRepository = manager.getRepository(GraduateProgram);

        if (previousName !== name) {
          await graduateRepository.update(
            { programName: previousName },
            { programName: name },
          );
          await graduateRepository.update(
            { degreeTitle: previousName },
            { degreeTitle: name },
          );
        }

        program.name = name;
        program.normalizedName = normalizedName;
        await programRepository.save(program);
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`El programa “${name}” ya existe.`);
      }
      throw error;
    }

    const usage = await this.getGraduateProgramUsage();
    const usageCount = usage.get(normalizedName) || 0;
    return {
      id: program.id,
      name,
      usageCount,
      canDelete: usageCount === 0,
      createdBy: program.createdBy,
      createdAt: program.createdAt,
    };
  }

  async remove(id: string): Promise<{ message: string; id: string }> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException('Programa no encontrado.');
    }

    if (INTEGRATION_CATALOG_CREATORS.includes(program.createdBy || '')) {
      throw new NotFoundException('Programa no encontrado.');
    }

    const usage = await this.getGraduateProgramUsage();
    const usageCount = usage.get(program.normalizedName) || 0;
    if (usageCount > 0) {
      throw new ConflictException(
        `No se puede eliminar “${program.name}” porque está asignado a ${usageCount} graduado${usageCount === 1 ? '' : 's'}.`,
      );
    }

    await this.programRepository.remove(program);
    return { message: 'Programa eliminado correctamente.', id };
  }
}
