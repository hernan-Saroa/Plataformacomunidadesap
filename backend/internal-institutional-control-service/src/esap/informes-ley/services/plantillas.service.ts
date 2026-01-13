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
    const rutaCompleta = path.join(
      process.cwd(),
      'src',
      'esap',
      'informes-ley',
      plantilla.rutaPlantilla,
    );

    // Si no existe, intentar ruta alternativa
    if (!fs.existsSync(rutaCompleta)) {
      const rutaAlternativa = path.join(process.cwd(), plantilla.rutaPlantilla);
      if (fs.existsSync(rutaAlternativa)) {
        return fs.readFileSync(rutaAlternativa, 'utf-8');
      }
      throw new NotFoundException(`No se encontró el archivo de plantilla: ${plantilla.rutaPlantilla}`);
    }

    return fs.readFileSync(rutaCompleta, 'utf-8');
  }

  /**
   * Renderizar plantilla Handlebars con datos
   */
  async renderizarPlantilla(
    plantilla: PlantillaInformeLey,
    datos: Record<string, any>,
  ): Promise<string> {
    const contenido = await this.cargarContenidoPlantilla(plantilla);

    if (plantilla.tipoFormato === 'HTML' || plantilla.tipoFormato === 'PDF') {
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

    // Validar variables requeridas
    for (const variable of plantilla.variablesDisponibles) {
      if (!(variable in datos)) {
        errores.push(`Variable requerida faltante: ${variable}`);
      }
    }

    // Validar estructura de datos si está definida
    if (estructura && Object.keys(estructura).length > 0) {
      for (const [key, tipoEsperado] of Object.entries(estructura)) {
        if (key in datos) {
          const valor = datos[key];
          const tipoReal = Array.isArray(valor) ? 'array' : typeof valor;

          if (tipoEsperado === 'array' && !Array.isArray(valor)) {
            errores.push(`El campo ${key} debe ser un array`);
          } else if (tipoEsperado !== 'array' && tipoReal !== tipoEsperado) {
            errores.push(`El campo ${key} debe ser de tipo ${tipoEsperado}, pero es ${tipoReal}`);
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
