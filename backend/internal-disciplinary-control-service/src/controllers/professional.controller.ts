import { Controller, Get, Post, Body, HttpException, HttpStatus, Delete, Param, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../services/storage.service';

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
        private readonly storageService: StorageService,
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
        // 1. Intentar obtener usuarios desde el Auth Service
        let usersFromAuth: any[] = [];
        try {
            const authServiceUrl = process.env.AUTH_SERVICE_URL || process.env.API_AUTH_SERVICE_URL || 'http://auth-service:3001';
            const base = authServiceUrl.replace(/\/+$/, '');
            const response = await firstValueFrom(
                this.httpService.get(`${base}/users?limit=1000`, { timeout: 3000 })
            );

            if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
                usersFromAuth = response.data.data.data;
            }
        } catch (error) {
            console.error('[ProfessionalController] No se pudo obtener usuarios de Auth Service. Usando locales.');
        }

        // 2. Filtrar solo usuarios que tengan los roles permitidos (Dinámico - Opción A)
        // Definir los roles válidos para disciplinario
        const validRoles = ['auditor', 'jefe_control_interno', 'profesional especializado', 'profesional universitario', 'operador disciplinario', 'sustanciador', 'admin', 'super_admin', 'profesional de control interno disciplinario'];
        const assignableUsers = usersFromAuth.filter(u => {
            if (!u.user || !u.user.is_active) return false;
            const userRoles = u.user.roles || [];
            return userRoles.some(r => validRoles.some(vr => (r.name || '').toLowerCase().includes(vr)));
        });

        const professionalsDB = await this.professionalRepository.find({
            order: { nombreCompleto: 'ASC' }
        });

        // 3. Cruzar los usuarios permitidos con la base local para mantener el conteo y capacidad (o agregar si no existen en BD local)
        const enrichedProfessionals = await Promise.all(
            assignableUsers.map(async (authU) => {
                const dbProf = professionalsDB.find(p => p.email.toLowerCase() === authU.email?.toLowerCase());

                const processCount = dbProf ? await this.processRepository
                    .createQueryBuilder('process')
                    .leftJoin('process.news', 'news')
                    .where('process.abogadoAsignadoId = :profId', { profId: dbProf.id })
                    .andWhere('process.estado != :processStatus', { processStatus: 'ARCHIVADO' })
                    .getCount() : 0;

                return {
                    id: dbProf ? dbProf.id : authU.user?.id_user || `auto-${authU.email}`,
                    nombreCompleto: authU.full_name || `${authU.first_name || ''} ${authU.last_name || ''}`.trim(),
                    email: authU.email,
                    cargo: dbProf?.cargo || (authU.user?.roles?.[0]?.name || 'Profesional'),
                    estado: dbProf?.estado || 'ACTIVO',
                    capacidadMaxima: dbProf?.capacidadMaxima || 10,
                    firmaUrl: dbProf?.firmaUrl || null,
                    tipoContrato: dbProf?.tipoContrato || 'Planta',
                    territorial: dbProf?.territorial || 'Sede Central',
                    procesosAsignados: processCount
                };
            })
        );

        // Si auth falló y no devolvió usuarios, devolvemos lo que hay en BD (fallback)
        if (enrichedProfessionals.length === 0 && professionalsDB.length > 0) {
            return Promise.all(professionalsDB.map(async prof => {
                const processCount = await this.processRepository
                    .createQueryBuilder('process')
                    .where('process.abogadoAsignadoId = :profId', { profId: prof.id })
                    .andWhere('process.estado != :processStatus', { processStatus: 'ARCHIVADO' })
                    .getCount();
                return { ...prof, procesosAsignados: processCount };
            }));
        }

        return enrichedProfessionals;
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

    @Post(':id/signature')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Subir firma digital (PDF) del profesional' })
    @ApiResponse({ status: 200, description: 'Firma subida exitosamente' })
    async uploadSignature(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File
    ): Promise<{ url: string }> {
        if (!file) {
            throw new HttpException('No se ha proporcionado ningún archivo', HttpStatus.BAD_REQUEST);
        }

        const professional = await this.professionalRepository.findOne({ where: { id } });
        if (!professional) {
            throw new HttpException('Profesional no encontrado', HttpStatus.NOT_FOUND);
        }

        try {
            // Guardar archivo usando StorageService
            // Usamos una carpeta especial 'signatures' y el ID del profesional
            const ruta = await this.storageService.saveFile(
                'signatures', // directorio base
                {
                    buffer: file.buffer,
                    originalname: `firma_${id}_${file.originalname}`
                },
                'FIRMA'
            );

            // Actualizar URL en la base de datos
            // La ruta retornada es relativa, ej: signatures/20231231_FIRMA.pdf
            professional.firmaUrl = ruta;
            await this.professionalRepository.save(professional);

            return { url: ruta };
        } catch (error) {
            console.error('Error uploading signature:', error);
            throw new HttpException('Error al subir la firma', HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

            // 2. Intentar llamar al servicio de autenticación
            let users: any[] = [];
            try {
                // Usa URL configurable y admite base relativa en entornos Docker/K8s
                const authServiceUrl = process.env.AUTH_SERVICE_URL || process.env.API_AUTH_SERVICE_URL || 'http://auth-service:3001';
                console.log(`Connecting to Auth Service at: ${authServiceUrl}`);

                const base = authServiceUrl.replace(/\/+$/, '');
                const response = await firstValueFrom(
                    this.httpService.get(`${base}/users?limit=1000`, { timeout: 5000 })
                );

                console.log('Auth service response status:', response.status);
                // Auth service wraps response: {success, data: {data: [...], meta}, timestamp}
                if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
                    users = response.data.data.data;
                } else {
                    console.warn('Invalid response structure from Auth Service, using fallback.');
                }

            } catch (authError) {
                console.error('Auth Service unreachable or error:', authError.message);
                console.warn('Using FALLBACK mock data for candidates.');

                // FALLBACK MOCK DATA for development/testing when Auth Service is down
                users = [
                    {
                        email: 'candidato1@esap.edu.co',
                        full_name: 'Ana Maria Candidata',
                        user: {
                            id_user: 'mock-1',
                            is_active: true,
                            roles: [{ name: 'Profesional Especializado' }]
                        },
                        phone: '3001112233'
                    },
                    {
                        email: 'pedro.postulante@esap.edu.co',
                        full_name: 'Pedro Postulante',
                        user: {
                            id_user: 'mock-2',
                            is_active: true,
                            roles: [{ name: 'Profesional Universitario' }]
                        },
                        phone: '3105556677'
                    },
                    {
                        email: 'luisa.abogada@esap.edu.co',
                        full_name: 'Luisa Abogada',
                        user: {
                            id_user: 'mock-3',
                            is_active: true,
                            roles: [{ name: 'Auxiliar Administrativo' }]
                        },
                        phone: '3209990000'
                    }
                ];
            }

            // 3. Filtrar usuarios que NO están asignados
            const candidates = users
                .filter((user: any) => {
                    const userEmail = user.email?.toLowerCase();
                    return userEmail && !assignedEmails.has(userEmail) && user.user?.is_active;
                })
                .map((user: any) => {
                    let cargo = 'Sin Cargo';
                    if (user.user && Array.isArray(user.user.roles) && user.user.roles.length > 0) {
                        cargo = user.user.roles[0].name;
                    } else if (user.cargo) {
                        cargo = user.cargo;
                    } else if (user.role) { // flatten backup
                        cargo = user.role;
                    }

                    return {
                        id: user.user?.id_user || `top-user-${Math.random()}`,
                        nombre: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                        cargo: cargo,
                        email: user.email,
                        telefono: user.phone || 'N/A'
                    };
                });

            return candidates;

        } catch (error) {
            console.error('Critical error in getCandidates:', error.message);
            throw new HttpException(
                `Error crítico al obtener candidatos: ${error.message}`,
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
