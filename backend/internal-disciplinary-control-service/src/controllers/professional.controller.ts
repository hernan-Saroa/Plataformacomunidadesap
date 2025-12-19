import { Controller, Get, Post, Body, HttpException, HttpStatus, Delete, Param, Patch } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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
        private readonly httpService: HttpService,
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
            createDto.capacidadMaxima = await this.validateAndGetCapacity(createDto.cargo, createDto.capacidadMaxima);

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

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un profesional' })
    @ApiResponse({ status: 200, description: 'Profesional actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
    async update(@Param('id') id: string, @Body() updateDto: Partial<DisciplinaryProfessional>): Promise<DisciplinaryProfessional> {
        const professional = await this.professionalRepository.findOne({ where: { id } });

        if (!professional) {
            throw new HttpException('Profesional no encontrado', HttpStatus.NOT_FOUND);
        }

        // Si se cambia el cargo, validar capacidad
        if (updateDto.cargo || updateDto.capacidadMaxima) {
            updateDto.capacidadMaxima = await this.validateAndGetCapacity(
                updateDto.cargo || professional.cargo,
                updateDto.capacidadMaxima || professional.capacidadMaxima
            );
        }

        // No permitir cambiar el email por este medio para evitar inconsistencias
        delete updateDto.email;

        Object.assign(professional, updateDto);
        return await this.professionalRepository.save(professional);
    }

    private async validateAndGetCapacity(cargo: string, requestedCapacity?: number): Promise<number> {
        // Buscar configuración global
        const config = await this.systemConfigRepository.findOne({ where: {} });
        let finalCapacity = requestedCapacity || 10;

        if (config && config.roleCapacities && cargo) {
            // Normalizar cargo
            const cargoInput = cargo.toLowerCase();

            // Buscar si alguna llave de la configuración está contenida en el cargo ingresado
            const matchedKey = Object.keys(config.roleCapacities).find(key =>
                cargoInput.includes(key.toLowerCase())
            );

            if (matchedKey) {
                const maxAllowed = config.roleCapacities[matchedKey];

                // Si no se envió nada, usar el default. Si se envió algo mayor al máximo, restringir.
                if (!requestedCapacity || requestedCapacity > maxAllowed) {
                    finalCapacity = maxAllowed;
                }
            }
        }
        return finalCapacity;
    }

    @Get('candidates')
    @ApiOperation({ summary: 'Obtener candidatos disponibles (usuarios no asignados al equipo)' })
    @ApiResponse({ status: 200, description: 'Lista de candidatos disponibles' })
    async getCandidates(): Promise<any[]> {
        try {
            // 1. Obtener profesionales ya asignados al equipo disciplinario
            const assignedProfessionals = await this.professionalRepository.find({
                select: ['email']
            });
            const assignedEmails = new Set(assignedProfessionals.map(p => p.email.toLowerCase()));

            // 2. Llamar al servicio de autenticación para obtener todos los usuarios
            const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
            const response = await firstValueFrom(
                this.httpService.get(`${authServiceUrl}/users?limit=1000`)
            );

            console.log('Auth service response structure:', JSON.stringify((response as any).data, null, 2));

            // Auth service wraps response: {success, data: {data: [...], meta}, timestamp}
            const users = (response as any).data.data.data || [];

            if (!Array.isArray(users)) {
                console.error('Users is not an array:', typeof users, users);
                throw new HttpException(
                    'Invalid response format from auth service',
                    HttpStatus.INTERNAL_SERVER_ERROR
                );
            }

            console.log(`Found ${users.length} total users from auth service`);

            // 3. Filtrar usuarios que NO están asignados
            const candidates = users
                .filter((user: any) => {
                    const userEmail = user.email?.toLowerCase();
                    return userEmail && !assignedEmails.has(userEmail) && user.user?.is_active;
                })
                .map((user: any) => ({
                    id: user.user?.id_user,
                    nombre: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                    cargo: 'Sin cargo asignado', // Auth service doesn't return cargo
                    email: user.email,
                    telefono: user.phone || 'N/A'
                }));

            return candidates;
        } catch (error) {
            console.error('Error fetching candidates:', error.message, error.response?.data);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                `Error al obtener candidatos: ${error.message}`,
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
