import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaAuto } from '../entities/plantilla-auto.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Plantillas de Autos')
@Controller('auto-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class AutoTemplatesController {
  constructor(
    @InjectRepository(PlantillaAuto)
    private plantillaAutoRepository: Repository<PlantillaAuto>,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Obtener configuración de plantillas de autos',
    description: 'Retorna la plantilla activa de autos desde la base de datos'
  })
  async getConfig() {
    // Buscar la plantilla activa
    let plantilla = await this.plantillaAutoRepository.findOne({
      where: { estado: 'activo' }
    });

    // Si no existe, crear una por defecto
    if (!plantilla) {
      plantilla = this.plantillaAutoRepository.create({
        htmlContent: `<p>En el proceso disciplinario [RADICADO], iniciado el [FECHA_QUEJA], se ha determinado lo siguiente:</p>

<p><strong>HECHOS:</strong></p>
<p>[HECHOS]</p>

<p><strong>DENUNCIANTE:</strong> [DENUNCIANTE_NOMBRE] - [DENUNCIANTE_DOCUMENTO]</p>
<p><strong>DISCIPLINABLE:</strong> [DISCIPLINABLE_NOMBRE] - [DISCIPLINABLE_DOCUMENTO] - [DISCIPLINABLE_CARGO]</p>

<p>Por lo anterior, se resuelve:</p>

<p>PRIMERO: Iniciar proceso disciplinario contra [DISCIPLINABLE_NOMBRE] por los hechos descritos.</p>

<p>SEGUNDO: Notificar al investigado de los cargos formulados.</p>

<p>TERCERO: Designar abogado instructor para el proceso.</p>

<p>Dado en Bogotá D.C., a los [FECHA_ACTUAL].</p>`,
        estado: 'activo',
        nombre: 'Plantilla General de Autos',
        descripcion: 'Plantilla por defecto para la generación de autos disciplinarios'
      });
      await this.plantillaAutoRepository.save(plantilla);
    }

    return {
      id: plantilla.id,
      htmlContent: plantilla.htmlContent,
      estado: plantilla.estado,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion
    };
  }

  @Put('config')
  @ApiOperation({
    summary: 'Actualizar plantilla de autos',
    description: 'Actualiza la plantilla activa de autos en la base de datos'
  })
  async updateConfig(@Body() newConfig: any) {
    // Buscar la plantilla activa
    let plantilla = await this.plantillaAutoRepository.findOne({
      where: { estado: 'activo' }
    });

    // Si no existe, crear una nueva
    if (!plantilla) {
      plantilla = this.plantillaAutoRepository.create({
        htmlContent: newConfig.htmlContent || '',
        estado: 'activo',
        nombre: newConfig.nombre || 'Plantilla General de Autos',
        descripcion: newConfig.descripcion || 'Plantilla para la generación de autos disciplinarios'
      });
    } else {
      // Actualizar la plantilla existente
      plantilla.htmlContent = newConfig.htmlContent || plantilla.htmlContent;
      plantilla.nombre = newConfig.nombre || plantilla.nombre;
      plantilla.descripcion = newConfig.descripcion || plantilla.descripcion;
    }

    await this.plantillaAutoRepository.save(plantilla);
    return {
      id: plantilla.id,
      htmlContent: plantilla.htmlContent,
      estado: plantilla.estado,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion
    };
  }
}
