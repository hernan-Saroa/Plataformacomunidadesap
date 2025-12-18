import { Controller, Get, Post, Body, HttpException, HttpStatus, Delete, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SystemConfiguration } from '../entities/system-configuration.entity';

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalController {
    constructor(
        @InjectRepository(DisciplinaryProfessional)
        private readonly professionalRepository: Repository<DisciplinaryProfessional>,
        @InjectRepository(DisciplinaryProcess)
        private readonly processRepository: Repository<DisciplinaryProcess>,
        @InjectRepository(SystemConfiguration)
        private readonly systemConfigRepository: Repository<SystemConfiguration>,
    ) { }

    @Get('workload')
    @ApiOperation({ summary: 'Obtener carga de trabajo por profesional' })
    async getWorkload() {
        // Obtener todos los profesionales activos
        const professionals = await this.professionalRepository.find({
            where: { estado: 'ACTIVO' }
        });

        // Por cada profesional, contar su número de procesos ACTIVOS (excluyendo DEVUELTA)
        const workload = await Promise.all(
            professionals.map(async (prof) => {
                // Contar solo procesos cuya noticia NO esté en estado DEVUELTA
                const processCount = await this.processRepository
                    .createQueryBuilder('process')
                    .leftJoin('process.news', 'news')
                    .where('process.abogadoAsignadoId = :profId', { profId: prof.id })
                    .andWhere('news.estado != :devuelta', { devuelta: 'DEVUELTA' })
                    .getCount();

                return {
                    id: prof.id,
                    nombre: prof.nombreCompleto,
                    procesosAsignados: processCount,
                    capacidadMaxima: prof.capacidadMaxima
                };
            })
        );

        return workload;
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los profesionales con conteo de carga' })
    async findAll(): Promise<any[]> {
        const professionals = await this.professionalRepository.find({
            order: { nombreCompleto: 'ASC' }
        });

        // Enriquecer con conteo de procesos
        const result = await Promise.all(
            professionals.map(async (prof) => {
                const processCount = await this.processRepository
                    .createQueryBuilder('process')
                    .leftJoin('process.news', 'news')
                    .where('process.abogadoAsignadoId = :profId', { profId: prof.id })
                    .andWhere('news.estado != :newsEstado', { newsEstado: 'DEVUELTA' })
                    .andWhere('process.estado != :processStatus', { processStatus: 'ARCHIVADO' })
                    .getCount();

                return {
                    ...prof,
                    procesosAsignados: processCount
                };
            })
        );

        return result;
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo profesional' })
    @ApiResponse({ status: 201, description: 'Profesional creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'Email ya existe' })
    async create(@Body() createDto: Partial<DisciplinaryProfessional>): Promise<DisciplinaryProfessional> {
        try {
            // Validar campos requeridos
            if (!createDto.nombreCompleto || !createDto.email || !createDto.cargo) {
                throw new HttpException(
                    'Los campos nombreCompleto, email y cargo son requeridos',
                    HttpStatus.BAD_REQUEST
                );
            }

            // Verificar si el email ya existe
            const existing = await this.professionalRepository.findOne({
                where: { email: createDto.email }
            });

            if (existing) {
                throw new HttpException(
                    'Ya existe un profesional con ese email',
                    HttpStatus.CONFLICT
                );
            }

            // --- CONFIGURACIÓN DE CAPACIDAD ---
            // Buscar configuración global
            const config = await this.systemConfigRepository.findOne({ where: {} });

            if (config && config.roleCapacities) {
                // Normalizar cargo (ej. 'Profesional Universitario' -> 'profesional universitario')
                const cargoInput = createDto.cargo.toLowerCase();

                // Buscar si alguna llave de la configuración está contenida en el cargo ingresado
                // Ej: "universitario" está en "profesional universitario" -> Match
                const matchedKey = Object.keys(config.roleCapacities).find(key =>
                    cargoInput.includes(key.toLowerCase())
                );

                if (matchedKey) {
                    const defaultCapacity = config.roleCapacities[matchedKey];

                    // Si el usuario intentó enviar una capacidad mayor a la configurada, se restringe.
                    // O si no envió nada, se usa el default.
                    if (!createDto.capacidadMaxima || createDto.capacidadMaxima > defaultCapacity) {
                        createDto.capacidadMaxima = defaultCapacity;
                    }
                }
            }

            // Crear y guardar el profesional
            const profesional = this.professionalRepository.create(createDto);
            return await this.professionalRepository.save(profesional);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                `Error al crear profesional: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un profesional' })
    @ApiResponse({ status: 200, description: 'Profesional eliminado exitosamente' })
    @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
    async delete(@Param('id') id: string): Promise<{ success: boolean; message?: string }> {
        const professional = await this.professionalRepository.findOne({ where: { id } });

        if (!professional) {
            // Idempotent: If not found, consider it deleted.
            return { success: true, message: 'Already deleted' };
        }

        // Verificar si tiene procesos asignados
        const processCount = await this.processRepository.count({ where: { abogadoAsignadoId: id } });

        if (processCount > 0) {
            throw new HttpException('No se puede eliminar el profesional porque tiene procesos asignados', HttpStatus.BAD_REQUEST);
        }

        await this.professionalRepository.remove(professional);
        return { success: true };
    }
}
