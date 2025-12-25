import { Controller, Get, Post, Put, Body, Query, BadRequestException, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ExpedienteService } from '../services/expediente.service';
import { Expediente } from '../entities/expediente.entity';

@Controller('api/legal/expedientes')
export class ExpedienteController {
    constructor(private readonly expedienteService: ExpedienteService) { }

    @Get()
    async listar(
        @Query('estado') estado?: string,
        @Query('jurisdiccion') jurisdiccion?: string,
        @Query('search') search?: string,
    ): Promise<Expediente[]> {
        return this.expedienteService.listarExpedientes({ estado, jurisdiccion, search });
    }

    @Get(':id')
    async obtener(@Param('id') id: string): Promise<Expediente | null> {
        return this.expedienteService.findOne(id);
    }

    @Put(':id')
    async actualizar(@Param('id') id: string, @Body() data: Partial<Expediente>): Promise<Expediente> {
        return this.expedienteService.updateExpediente(id, data);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('files', 5, {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array.from(Array(32)).map(() => Math.round(Math.random() * 16).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    async crear(
        @Body() body: any, // Cuando se usa FormData, el body llega como objeto plano (strings), validamos manualmente
        @UploadedFiles() files: Array<any>
    ): Promise<Expediente> {
        // Parsear datos si vienen como strings (común en FormData)
        // Nota: NestJS con Express suele parsear el body automáticamente, pero los números pueden venir como strings.

        const data: Partial<Expediente> = { ...body };

        // Validaciones manuales básicas ya que el DTO validation pipes no siempre funciona igual con FormData sin configuración extra
        if (!data.radicado) {
            throw new BadRequestException('El radicado es obligatorio');
        }

        // Mapear archivos subidos
        if (files && files.length > 0) {
            data.documentosInicialesUrls = files.map(f => `/api/legal/files/${f.filename}`);
        }

        // Asegurar tipos numéricos
        if (data.cuantia) data.cuantia = Number(data.cuantia);
        if (data.terminoProcesalDias) data.terminoProcesalDias = Number(data.terminoProcesalDias);

        // Asignación Automática based on User Role
        // TODO: Validate these against a real Auth Token/Service in the future
        const userId = body.userId;
        const userRole = body.userRole;

        if (userId && userRole) {
            if (userRole === 'ABOGADO') {
                // Abogados solo pueden asignarse a sí mismos (o el sistema lo hace por defecto)
                data.abogadoSustanciador = userId;
            } else if (userRole === 'JEFE_OFICINA' || userRole === 'ADMIN') {
                // Jefes pueden asignar a cualquiera. Si viene en el body, se respeta.
                // Si no viene, queda sin asignar.
                if (body.abogadoId) {
                    data.abogadoSustanciador = body.abogadoId;
                }
            }
        } else {
            // Fallback legacy behavior: use abogadoId if provided directly
            if (body.abogadoId) {
                data.abogadoSustanciador = body.abogadoId;
            }
        }

        return this.expedienteService.crearExpediente(data);
    }
}
