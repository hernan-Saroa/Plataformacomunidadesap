import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { EstadisticasService, FiltrosEstadisticas } from './estadisticas.service';
import { nombreDelArchivo, reporteCsv } from './reporte-csv';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';

/**
 * Lee la vigencia de la query.
 *
 * Sin `ParseIntPipe`: el filtro es opcional y el pipe rechazaría con 400 la
 * consulta sin vigencia, que es la más común —«toda la contratación»—. Un año
 * que no sea un número se trata como si no se hubiera pedido, no como un error:
 * el reporte más amplio nunca es una respuesta equivocada.
 */
function vigenciaPedida(crudo?: string): number | null {
  if (!crudo) return null;
  const anio = Number(crudo);
  return Number.isInteger(anio) && anio > 1990 && anio < 2200 ? anio : null;
}

/** Estadísticas y reportes de gestión — transversal (EFDS-1189, numeral 3.1.a). */
@ApiTags('Transversal · Estadísticas y reportes')
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly service: EstadisticasService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.reporte.view')
  @ApiOperation({
    summary: 'Indicadores de gestión de la contratación',
    description:
      'Contratos por estado del ciclo (suscritos, en ejecución, terminados, liquidados y ' +
      'cerrados), desglose por modalidad, tipología, tipo de persona y mes, principales ' +
      'contratistas, desenlace y embudo de los procesos de selección, ejecución ' +
      'presupuestal y cuentas de cobro, modificaciones, contratos que requieren atención, ' +
      'tiempos del ciclo y el listado de contratos del corte. Se calcula al consultar: no ' +
      'hay tabla de estadísticas que se pueda desincronizar del expediente.',
  })
  @ApiQuery({ name: 'vigencia', required: false, description: 'Año de suscripción' })
  @ApiQuery({ name: 'modalidad', required: false, description: 'Código de la modalidad' })
  @ApiQuery({ name: 'tipologia', required: false, description: 'Código de la tipología' })
  gestion(
    @Query('vigencia') vigencia?: string,
    @Query('modalidad') modalidad?: string,
    @Query('tipologia') tipologia?: string,
  ) {
    return this.service.gestion(this.filtros(vigencia, modalidad, tipologia));
  }

  /**
   * El mismo reporte, descargable.
   *
   * Ruta aparte y no un `?formato=csv` sobre la anterior: el navegador tiene
   * que poder abrirla directo para que la descarga funcione, y una ruta que a
   * veces devuelve JSON y a veces un archivo obliga a que quien la consuma
   * adivine cuál de las dos le tocó.
   */
  @Get('csv')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.reporte.view')
  @ApiOperation({
    summary: 'Descargar los indicadores de gestión en CSV',
    description:
      'Las mismas cifras de la consulta, en un archivo que se abre en Excel y se pega en ' +
      'el informe. Separado por punto y coma y con BOM, que es como Excel lo lee bien en ' +
      'configuración regional española.',
  })
  @ApiQuery({ name: 'vigencia', required: false, description: 'Año de suscripción' })
  @ApiQuery({ name: 'modalidad', required: false, description: 'Código de la modalidad' })
  @ApiQuery({ name: 'tipologia', required: false, description: 'Código de la tipología' })
  async csv(
    @Res() res: Response,
    @Query('vigencia') vigencia?: string,
    @Query('modalidad') modalidad?: string,
    @Query('tipologia') tipologia?: string,
  ) {
    const estadisticas = await this.service.gestion(this.filtros(vigencia, modalidad, tipologia));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreDelArchivo(estadisticas)}"`,
    );
    res.send(reporteCsv(estadisticas));
  }

  private filtros(vigencia?: string, modalidad?: string, tipologia?: string): FiltrosEstadisticas {
    return {
      vigencia: vigenciaPedida(vigencia),
      // Una modalidad vacía es «todas», no una modalidad llamada cadena vacía:
      // los selectores mandan `modalidad=` cuando el usuario limpia el filtro.
      modalidad: modalidad?.trim() || null,
      tipologia: tipologia?.trim() || null,
    };
  }
}
