import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaInformeLey } from '../entities/plantilla-informe-ley.entity';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';

@Injectable()
export class PlantillasService {
  constructor(
    @InjectRepository(PlantillaInformeLey)
    private readonly plantillaRepository: Repository<PlantillaInformeLey>,
  ) {}

  /**
   * Obtener todas las plantillas activas
   */
  async findAll(): Promise<PlantillaInformeLey[]> {
    return this.plantillaRepository.find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Obtener plantilla por código
   */
  async findByCodigo(codigo: string): Promise<PlantillaInformeLey> {
    const plantilla = await this.plantillaRepository.findOne({
      where: { codigo, activa: true },
    });

    if (!plantilla) {
      throw new NotFoundException(`Plantilla con código ${codigo} no encontrada`);
    }

    return plantilla;
  }

  /**
   * Cargar contenido de la plantilla desde el sistema de archivos
   */
  async cargarContenidoPlantilla(plantilla: PlantillaInformeLey): Promise<string> {
    // La ruta en BD es: "templates/informes-ley/plantilla-pormenorizado-dafp.hbs"
    // El archivo está en: src/esap/informes-ley/templates/plantilla-pormenorizado-dafp.hbs
    // Necesitamos construir: process.cwd()/src/esap/informes-ley/templates/plantilla-pormenorizado-dafp.hbs
    
    let rutaPlantilla = plantilla.rutaPlantilla;
    
    // Si la ruta incluye "templates/informes-ley/", extraer solo el nombre del archivo
    // y construir la ruta correcta
    if (rutaPlantilla.includes('templates/informes-ley/')) {
      const nombreArchivo = path.basename(rutaPlantilla);
      rutaPlantilla = path.join('templates', nombreArchivo);
    } else if (rutaPlantilla.startsWith('templates/')) {
      // Ya tiene templates/, usar directamente
      // No hacer nada
    } else {
      // Asumir que es solo el nombre del archivo
      rutaPlantilla = path.join('templates', rutaPlantilla);
    }
    
    // Intentar múltiples rutas posibles
    const rutasIntentar = [
      // Desarrollo: desde process.cwd()/src/esap/informes-ley/
      path.join(process.cwd(), 'src', 'esap', 'informes-ley', rutaPlantilla),
      // Producción compilada: desde process.cwd()/dist/esap/informes-ley/
      path.join(process.cwd(), 'dist', 'esap', 'informes-ley', rutaPlantilla),
      // Desde __dirname (servicio compilado en dist/)
      path.join(__dirname, '..', rutaPlantilla),
      // Ruta absoluta desde process.cwd()
      path.join(process.cwd(), rutaPlantilla),
      // Ruta original de la BD
      path.join(process.cwd(), 'src', 'esap', 'informes-ley', plantilla.rutaPlantilla),
    ];

    for (const rutaCompleta of rutasIntentar) {
      if (fs.existsSync(rutaCompleta)) {
        return fs.readFileSync(rutaCompleta, 'utf-8');
      }
    }

    // Si el archivo no existe y es Excel, intentar buscar versión .hbs como fallback
    if (plantilla.tipoFormato === 'Excel' && rutaPlantilla.endsWith('.xlsx')) {
      const rutaHbs = rutaPlantilla.replace('.xlsx', '.hbs');
      const rutasHbsIntentar = [
        path.join(process.cwd(), 'src', 'esap', 'informes-ley', rutaHbs),
        path.join(process.cwd(), 'dist', 'esap', 'informes-ley', rutaHbs),
        path.join(__dirname, '..', rutaHbs),
        path.join(process.cwd(), rutaHbs),
        path.join(process.cwd(), 'src', 'esap', 'informes-ley', plantilla.rutaPlantilla.replace('.xlsx', '.hbs')),
      ];

      for (const rutaHbsCompleta of rutasHbsIntentar) {
        if (fs.existsSync(rutaHbsCompleta)) {
          console.warn(`Archivo Excel no encontrado, usando plantilla Handlebars: ${rutaHbsCompleta}`);
          return fs.readFileSync(rutaHbsCompleta, 'utf-8');
        }
      }
    }

    throw new NotFoundException(
      `No se encontró el archivo de plantilla: ${plantilla.rutaPlantilla}. ` +
      `Rutas intentadas: ${rutasIntentar.join(', ')}`
    );
  }

  /**
   * Renderizar plantilla Handlebars con datos
   */
  async renderizarPlantilla(
    plantilla: PlantillaInformeLey,
    datos: Record<string, any>,
  ): Promise<string> {
    const contenido = await this.cargarContenidoPlantilla(plantilla);

    // Si el contenido parece ser HTML (empieza con <!DOCTYPE o <html), renderizar con Handlebars
    // Esto permite usar plantillas .hbs incluso cuando el tipo está marcado como Excel
    const esHTML = contenido.trim().startsWith('<!DOCTYPE') || contenido.trim().startsWith('<html');

    if (plantilla.tipoFormato === 'HTML' || plantilla.tipoFormato === 'PDF' || esHTML) {
      // Usar Handlebars para renderizar
      const template = Handlebars.compile(contenido);
      return template(datos);
    }

    // Para otros formatos, retornar contenido sin procesar (se procesará después)
    return contenido;
  }

  /**
   * Validar que los datos proporcionados coincidan con la estructura esperada
   */
  validarEstructuraDatos(
    plantilla: PlantillaInformeLey,
    datos: Record<string, any>,
  ): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const estructura = plantilla.estructuraDatos;

    // Validar variables requeridas (solo las que no están marcadas como opcionales en estructura)
    for (const variable of plantilla.variablesDisponibles) {
      // Verificar si la variable es opcional en la estructura
      let esOpcional = false;
      if (estructura && estructura[variable]) {
        const configVar = estructura[variable];
        if (typeof configVar === 'object' && configVar !== null && 'requerido' in configVar) {
          esOpcional = configVar.requerido === false;
        }
      }
      
      // Si la variable no está en datos y no es opcional, es un error
      if (!(variable in datos) && !esOpcional) {
        errores.push(`Variable requerida faltante: ${variable}`);
      }
    }

    // Validar estructura de datos si está definida
    if (estructura && Object.keys(estructura).length > 0) {
      for (const [key, config] of Object.entries(estructura)) {
        // Solo validar si el campo está presente (los opcionales pueden no estar)
        if (key in datos) {
          const valor = datos[key];
          const tipoReal = Array.isArray(valor) ? 'array' : typeof valor;
          
          // Si la estructura define un tipo específico
          if (typeof config === 'object' && config !== null && 'tipo' in config) {
            const tipoEsperado = config.tipo;
            
            // Validar tipo de array
            if (tipoEsperado === 'array') {
              if (!Array.isArray(valor)) {
                errores.push(`El campo ${key} debe ser un array`);
              }
              // Si es array y tiene items definidos, validar estructura (opcional, para validación avanzada)
            } else if (tipoEsperado === 'object') {
              // Validar que sea un objeto (no array, no primitivo)
              if (Array.isArray(valor) || (tipoReal !== 'object')) {
                errores.push(`El campo ${key} debe ser un objeto`);
              }
            } else if (tipoEsperado === 'string' && tipoReal !== 'string') {
              errores.push(`El campo ${key} debe ser de tipo string, pero es ${tipoReal}`);
            } else if (tipoEsperado !== 'array' && tipoEsperado !== 'string' && tipoEsperado !== 'object' && tipoReal !== tipoEsperado) {
              errores.push(`El campo ${key} debe ser de tipo ${tipoEsperado}, pero es ${tipoReal}`);
            }
          } else if (typeof config === 'string') {
            // Compatibilidad con formato antiguo
            if (config === 'array' && !Array.isArray(valor)) {
              errores.push(`El campo ${key} debe ser un array`);
            } else if (config !== 'array' && tipoReal !== config) {
              errores.push(`El campo ${key} debe ser de tipo ${config}, pero es ${tipoReal}`);
            }
          }
        }
      }
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }
}
