import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InformeLey } from '../entities/informe-ley.entity';
import { EntregaInformeLey } from '../entities/entrega-informe-ley.entity';
import { HistorialGeneracionInforme } from '../entities/historial-generacion-informe.entity';
import { PlantillasService } from './plantillas.service';
import { DatosAutomaticosService } from './datos-automaticos.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../../notificaciones/entities/notificacion.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Importar puppeteer de forma opcional (solo si está instalado)
let puppeteer: any;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('Puppeteer no está instalado. La generación de PDF no estará disponible hasta que se instale.');
}

@Injectable()
export class InformeGeneratorService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'informes-ley');

  constructor(
    @InjectRepository(InformeLey)
    private readonly informeRepository: Repository<InformeLey>,
    @InjectRepository(EntregaInformeLey)
    private readonly entregaRepository: Repository<EntregaInformeLey>,
    @InjectRepository(HistorialGeneracionInforme)
    private readonly historialRepository: Repository<HistorialGeneracionInforme>,
    private readonly plantillasService: PlantillasService,
    private readonly datosAutomaticosService: DatosAutomaticosService,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
  ) {
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generar informe automático
   * US-022: Generar Informes de Ley automáticos
   */
  async generarInformeAutomatico(
    informeId: string,
    periodo: string,
    datosAdicionales?: Record<string, any>,
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<EntregaInformeLey> {
    // 1. Validar que el informe exista y esté activo
    const informe = await this.informeRepository.findOne({
      where: { id: informeId, activo: true },
    });

    if (!informe) {
      throw new NotFoundException(`Informe con ID ${informeId} no encontrado o inactivo`);
    }

    // 2. Calcular fecha de vencimiento según periodicidad
    const fechaVencimiento = this.calcularFechaVencimiento(informe, periodo);

    // 3. Verificar si ya existe una entrega para este periodo
    const entregaExistente = await this.entregaRepository.findOne({
      where: {
        informeId,
        periodo,
      },
    });

    if (entregaExistente && entregaExistente.estado !== 'rechazado') {
      throw new BadRequestException(
        `Ya existe una entrega para el periodo ${periodo}. Use actualizar en lugar de crear.`,
      );
    }

    // 4. Crear registro de entrega
    const entrega = this.entregaRepository.create({
      informeId,
      periodo,
      fechaVencimiento,
      estado: 'en-proceso',
      estadoWorkflow: 'borrador',
      elaboradoPor: usuarioNombre || 'Sistema',
      fechaElaboracion: new Date(),
      datosAutomaticosPoblados: false, // Se actualizará después si se poblan datos
      observaciones: datosAdicionales?.observaciones || null,
    });

    await this.entregaRepository.save(entrega);

    // 5. Obtener datos automáticos si está configurado
    // Verificar si el informe tiene plantilla configurada (indica que puede tener datos automáticos)
    let datosCompletos: Record<string, any> = {
      nombreInforme: informe.nombre,
      codigoInforme: informe.codigo,
      periodo,
      fechaGeneracion: new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      baseNormativa: informe.normativa || '',
      responsable: informe.responsable || usuarioNombre || 'Sistema',
      // Incluir datos adicionales del usuario (como analisis, conclusiones, etc.)
      ...(datosAdicionales || {}),
    };

    if (informe.tienePlantilla) {
      const datosAutomaticos = await this.datosAutomaticosService.obtenerDatosAutomaticos(
        informe,
        periodo,
      );
      
      // Función helper para hacer merge profundo de objetos
      const deepMerge = (target: any, source: any): any => {
        const output = { ...target };
        if (source && typeof source === 'object') {
          Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              // Si es un objeto (como resumenEjecutivo, resultados), hacer merge profundo
              output[key] = deepMerge(target[key] || {}, source[key]);
            } else if (Array.isArray(source[key])) {
              // Si es un array (como actividades, logros), usar el del source si existe y no está vacío
              output[key] = source[key].length > 0 ? source[key] : (target[key] || []);
            } else {
              // Para valores primitivos, el source tiene prioridad solo si no es undefined/null
              output[key] = source[key] !== undefined && source[key] !== null ? source[key] : (target[key] || source[key]);
            }
          });
        }
        return output;
      };
      
      // Combinar datos automáticos con datos completos
      // Primero aplicar datos automáticos, luego hacer merge profundo con datosAdicionales
      datosCompletos = { 
        ...datosCompletos,
        ...datosAutomaticos,
      };
      
      // Hacer merge profundo con datosAdicionales para preservar estructuras anidadas
      if (datosAdicionales) {
        datosCompletos = deepMerge(datosCompletos, datosAdicionales);
      }

      // Guardar datos automáticos
      await this.datosAutomaticosService.guardarDatosAutomaticos(
        entrega.id,
        'datos_automaticos',
        datosAutomaticos,
      );

      // Actualizar flag de datos poblados
      entrega.datosAutomaticosPoblados = true;
      await this.entregaRepository.save(entrega);
    }

    // 6. Generar archivo si hay plantilla
    if (informe.tienePlantilla && informe.urlPlantilla) {
      try {
        const archivoGenerado = await this.generarArchivo(
          informe,
          entrega,
          datosCompletos,
        );

        entrega.archivoNombre = archivoGenerado.nombre;
        entrega.archivoUrl = archivoGenerado.url;
        entrega.archivoTamano = archivoGenerado.tamano;
        entrega.formatoArchivo = archivoGenerado.formato; // Usar el formato real generado (puede ser PDF aunque la plantilla diga Excel)
        entrega.plantillaUsada = informe.urlPlantilla;
        entrega.versionPlantilla = '1.0';
        entrega.fechaGeneracion = new Date();
        entrega.generadoPor = usuarioNombre || 'Sistema';

        await this.entregaRepository.save(entrega);
      } catch (error) {
        console.error('Error generando archivo:', error);
        // No fallar si hay error en generación, solo registrar en metadata
        // Preservar las observaciones originales del usuario
        entrega.metadataGeneracion = {
          ...(entrega.metadataGeneracion || {}),
          errorGeneracion: {
            mensaje: error.message,
            tipo: error.name || 'Error',
            fecha: new Date().toISOString(),
          },
        };
        await this.entregaRepository.save(entrega);
      }
    }

    // 7. Registrar en historial
    await this.registrarHistorial(entrega.id, 'generado', usuarioId, usuarioNombre, {
      periodo,
      datosAutomaticosPoblados: entrega.datosAutomaticosPoblados,
    });

    // 8. Crear notificaciones después de generar el informe
    try {
      await this.crearNotificacionesInformeGenerado(informe, entrega);
    } catch (notifError) {
      // No fallar la generación si las notificaciones fallan
      console.error('[InformeGeneratorService.generarInformeAutomatico] Error al crear notificaciones:', notifError);
    }

    return entrega;
  }

  /**
   * Generar archivo (PDF, Word, Excel) desde plantilla
   */
  private async generarArchivo(
    informe: InformeLey,
    entrega: EntregaInformeLey,
    datos: Record<string, any>,
  ): Promise<{ nombre: string; url: string; tamano: number; formato: 'PDF' | 'Word' | 'Excel' }> {
    // Obtener plantilla
    const codigoPlantilla = informe.urlPlantilla || informe.formatoTemplate || '';
    const plantilla = await this.plantillasService.findByCodigo(codigoPlantilla);

    // Validar estructura de datos
    const validacion = this.plantillasService.validarEstructuraDatos(plantilla, datos);
    if (!validacion.valido) {
      throw new BadRequestException(
        `Datos inválidos para la plantilla: ${validacion.errores.join(', ')}`,
      );
    }

    // Renderizar plantilla
    const contenidoRenderizado = await this.plantillasService.renderizarPlantilla(
      plantilla,
      datos,
    );

    // Generar archivo según formato
    const nombreArchivo = `${informe.codigo}_${entrega.periodo}_${uuidv4()}`;

    // Si el contenido renderizado es HTML pero el tipo es Excel, generar PDF como fallback
    const esHTML = contenidoRenderizado.trim().startsWith('<!DOCTYPE') || contenidoRenderizado.trim().startsWith('<html');
    let formatoFinal = plantilla.tipoFormato;
    
    if (plantilla.tipoFormato === 'Excel' && esHTML) {
      console.warn(`Plantilla marcada como Excel pero contenido es HTML, generando PDF como fallback`);
      formatoFinal = 'PDF';
    }

    switch (formatoFinal) {
      case 'PDF':
        return await this.generarPDF(contenidoRenderizado, nombreArchivo, informe, entrega);

      case 'Word':
        return await this.generarWord(contenidoRenderizado, nombreArchivo, informe, entrega);

      case 'Excel':
        return await this.generarExcel(contenidoRenderizado, nombreArchivo, informe, entrega);

      default:
        throw new BadRequestException(`Formato ${formatoFinal} no soportado`);
    }
  }

  /**
   * Generar PDF desde HTML usando Puppeteer
   */
  private async generarPDF(
    html: string,
    nombreBase: string,
    informe: InformeLey,
    entrega: EntregaInformeLey,
  ): Promise<{ nombre: string; url: string; tamano: number; formato: 'PDF' }> {
    if (!puppeteer) {
      throw new BadRequestException(
        'Puppeteer no está instalado. Por favor ejecuta: npm install puppeteer'
      );
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const nombreArchivo = `${nombreBase}.pdf`;
      const rutaArchivo = path.join(this.uploadsDir, nombreArchivo);

      await page.pdf({
        path: rutaArchivo,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      const stats = fs.statSync(rutaArchivo);

      return {
        nombre: nombreArchivo,
        url: `/uploads/informes-ley/${nombreArchivo}`,
        tamano: stats.size,
        formato: 'PDF',
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Generar Word (placeholder - requiere implementación con docxtemplater)
   */
  private async generarWord(
    contenido: string,
    nombreBase: string,
    informe: InformeLey,
    entrega: EntregaInformeLey,
  ): Promise<{ nombre: string; url: string; tamano: number; formato: 'Word' }> {
    // TODO: Implementar generación de Word usando docxtemplater
    throw new BadRequestException('Generación de Word aún no implementada');
  }

  /**
   * Generar Excel (placeholder - requiere implementación con exceljs)
   */
  private async generarExcel(
    contenido: string,
    nombreBase: string,
    informe: InformeLey,
    entrega: EntregaInformeLey,
  ): Promise<{ nombre: string; url: string; tamano: number; formato: 'Excel' }> {
    // TODO: Implementar generación de Excel usando exceljs
    throw new BadRequestException('Generación de Excel aún no implementada');
  }

  /**
   * Calcular fecha de vencimiento según periodicidad
   */
  private calcularFechaVencimiento(informe: InformeLey, periodo: string): Date {
    const hoy = new Date();
    let fechaVencimiento = new Date();

    switch (informe.periodicidad) {
      case 'mensual':
        // Último día del mes siguiente
        fechaVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
        break;

      case 'trimestral':
        // Último día del trimestre siguiente
        const trimestreActual = Math.floor(hoy.getMonth() / 3);
        fechaVencimiento = new Date(hoy.getFullYear(), (trimestreActual + 1) * 3 + 2, 0);
        break;

      case 'semestral':
        // Último día del semestre siguiente
        const semestreActual = hoy.getMonth() < 6 ? 0 : 1;
        fechaVencimiento = new Date(
          hoy.getFullYear(),
          (semestreActual + 1) * 6 + 2,
          0,
        );
        break;

      case 'anual':
        // Último día del año siguiente
        fechaVencimiento = new Date(hoy.getFullYear() + 1, 11, 31);
        break;

      default:
        // Por defecto, 30 días desde hoy
        fechaVencimiento = new Date(hoy);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
    }

    return fechaVencimiento;
  }

  /**
   * Registrar acción en historial
   */
  private async registrarHistorial(
    entregaId: string,
    accion: string,
    usuarioId?: string,
    usuarioNombre?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const historial = this.historialRepository.create({
      entregaId,
      accion,
      usuarioId,
      usuarioNombre,
      datosNuevos: metadata,
    });

    await this.historialRepository.save(historial);
  }

  /**
   * Crea notificaciones cuando se genera un informe de ley
   */
  private async crearNotificacionesInformeGenerado(informe: InformeLey, entrega: EntregaInformeLey): Promise<void> {
    console.log(`[InformeGeneratorService.crearNotificacionesInformeGenerado] Informe ${informe.codigo} generado para periodo ${entrega.periodo}`);
    
    const usuariosNotificar: string[] = [];

    // Buscar responsable del área
    if (informe.areaResponsable) {
      try {
        const responsable = await this.dataSource.query(
          `SELECT id_tercero FROM auth.personas WHERE nom_largo ILIKE $1 OR sig_tercero ILIKE $1 LIMIT 1`,
          [`%${informe.areaResponsable}%`]
        );
        if (responsable && responsable.length > 0) {
          usuariosNotificar.push(String(responsable[0].id_tercero));
        }
      } catch (error) {
        console.error(`[InformeGeneratorService.crearNotificacionesInformeGenerado] Error al buscar responsable:`, error);
      }
    }

    // Obtener Jefes de Control Interno
    try {
      const jefesOCI = await this.obtenerJefesControlInterno();
      usuariosNotificar.push(...jefesOCI);
    } catch (error) {
      console.error(`[InformeGeneratorService.crearNotificacionesInformeGenerado] Error al obtener Jefes:`, error);
    }

    const usuariosUnicos = [...new Set(usuariosNotificar)];

    for (const usuarioId of usuariosUnicos) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.RECEPCION_DOCUMENTO,
          titulo: `Informe de Ley Generado: ${informe.codigo}`,
          mensaje: `Se ha generado el informe "${informe.nombre}" (${informe.codigo}) para el periodo ${entrega.periodo}. Estado: ${entrega.estado}.`,
          prioridad: PrioridadNotificacion.ALTA,
          canal: CanalNotificacion.SISTEMA,
          metadata: {
            informeId: informe.id,
            codigoInforme: informe.codigo,
            nombreInforme: informe.nombre,
            entregaId: entrega.id,
            periodo: entrega.periodo,
            estado: entrega.estado,
          },
        });
      } catch (error) {
        console.error(`[InformeGeneratorService.crearNotificacionesInformeGenerado] Error al crear notificación:`, error);
      }
    }
  }

  /**
   * Obtiene los IDs de usuarios con rol JEFE_CONTROL_INTERNO
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_tercero
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = 'JEFE_CONTROL_INTERNO'
          AND ur.is_active = true
          AND u.is_active = true
      `);

      return result.map((row: any) => String(row.id_tercero));
    } catch (error) {
      console.error('[InformeGeneratorService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }
}
