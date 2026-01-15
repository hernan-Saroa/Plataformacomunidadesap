import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ValidacionDAFResultado {
  valido: boolean;
  errores: string[];
  advertencias: string[];
  metadata?: {
    numeroHojas: number;
    nombresHojas: string[];
    totalFilas: number;
    columnasDetectadas: string[];
  };
}

/**
 * Servicio para validar archivos Excel según formato DAF (Dirección Administrativa y Financiera)
 * 
 * Valida:
 * - Estructura básica del archivo Excel
 * - Hojas requeridas según tipo de informe
 * - Columnas obligatorias
 * - Formato de datos básico
 * - Integridad de datos (no vacío)
 */
@Injectable()
export class DafValidatorService {
  /**
   * Valida un archivo Excel según el formato DAF requerido
   * @param archivo Buffer del archivo Excel
   * @param nombreArchivo Nombre del archivo (para identificar tipo si es necesario)
   * @param tipoInforme Tipo de informe (opcional, para validaciones específicas)
   * @returns Resultado de la validación con errores y advertencias
   */
  async validarFormatoDaf(
    archivo: Buffer,
    nombreArchivo: string,
    tipoInforme?: string,
  ): Promise<ValidacionDAFResultado> {
    const errores: string[] = [];
    const advertencias: string[] = [];
    let metadata: ValidacionDAFResultado['metadata'];

    try {
      // 1. Validar que el archivo sea un Excel válido
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(archivo, {
          type: 'buffer',
          cellDates: true,
          cellNF: false,
          cellText: false,
        });
      } catch (error) {
        throw new BadRequestException(
          `El archivo no es un Excel válido: ${error.message}`,
        );
      }

      // 2. Validar que tenga al menos una hoja
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        errores.push('El archivo Excel no contiene hojas');
        return {
          valido: false,
          errores,
          advertencias,
        };
      }

      // 3. Validar estructura básica
      const numeroHojas = workbook.SheetNames.length;
      const nombresHojas = workbook.SheetNames;
      let totalFilas = 0;
      const columnasDetectadas: Set<string> = new Set();

      // Validar cada hoja
      for (const nombreHoja of nombresHojas) {
        const worksheet = workbook.Sheets[nombreHoja];
        if (!worksheet) {
          errores.push(`La hoja "${nombreHoja}" no es accesible`);
          continue;
        }

        // Convertir hoja a JSON para análisis
        const datosJson = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (!datosJson || datosJson.length === 0) {
          advertencias.push(`La hoja "${nombreHoja}" está vacía`);
          continue;
        }

        // Detectar columnas (primera fila generalmente contiene headers)
        const primeraFila = datosJson[0] as any[];
        if (primeraFila && Array.isArray(primeraFila)) {
          primeraFila.forEach((columna, index) => {
            if (columna && String(columna).trim() !== '') {
              columnasDetectadas.add(String(columna).trim());
            }
          });
        }

        // Contar filas con datos (excluyendo filas completamente vacías)
        const filasConDatos = datosJson.filter((fila: any) => {
          if (!Array.isArray(fila)) return false;
          return fila.some((celda) => celda !== '' && celda !== null && celda !== undefined);
        }).length;

        totalFilas += filasConDatos;

        // Validar que haya al menos una fila de datos (más allá del header)
        if (filasConDatos <= 1) {
          advertencias.push(
            `La hoja "${nombreHoja}" solo contiene encabezados, no hay datos`,
          );
        }
      }

      metadata = {
        numeroHojas,
        nombresHojas,
        totalFilas,
        columnasDetectadas: Array.from(columnasDetectadas),
      };

      // 4. Validaciones específicas según tipo de informe
      if (tipoInforme) {
        const validacionesEspecificas = this.validarFormatoEspecifico(
          workbook,
          tipoInforme,
        );
        errores.push(...validacionesEspecificas.errores);
        advertencias.push(...validacionesEspecificas.advertencias);
      }

      // 5. Validaciones generales DAF
      this.validarReglasGeneralesDAF(workbook, errores, advertencias);

      return {
        valido: errores.length === 0,
        errores,
        advertencias,
        metadata,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      errores.push(`Error al validar el archivo: ${error.message}`);
      return {
        valido: false,
        errores,
        advertencias,
        metadata,
      };
    }
  }

  /**
   * Valida formato específico según el tipo de informe
   */
  private validarFormatoEspecifico(
    workbook: XLSX.WorkBook,
    tipoInforme: string,
  ): { errores: string[]; advertencias: string[] } {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // Mapeo de tipos de informe a validaciones específicas
    const validacionesPorTipo: Record<
      string,
      (wb: XLSX.WorkBook) => { errores: string[]; advertencias: string[] }
    > = {
      'INF-FUR': this.validarFormatoFUR.bind(this),
      'INF-TRIM-AUSTERIDAD': this.validarFormatoAusteridad.bind(this),
    };

    const validador = validacionesPorTipo[tipoInforme];
    if (validador) {
      const resultado = validador(workbook);
      errores.push(...resultado.errores);
      advertencias.push(...resultado.advertencias);
    } else {
      // Para tipos no especificados, solo validación básica
      advertencias.push(
        `No hay validaciones específicas configuradas para el tipo de informe "${tipoInforme}"`,
      );
    }

    return { errores, advertencias };
  }

  /**
   * Valida formato específico para Informe FUR DAFP
   */
  private validarFormatoFUR(
    workbook: XLSX.WorkBook,
  ): { errores: string[]; advertencias: string[] } {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // Hojas esperadas para FUR (pueden variar según formato DAFP)
    const hojasEsperadas = ['Datos FUR', 'Indicadores', 'FUR'];
    const hojasEncontradas = workbook.SheetNames.map((n) => n.trim());

    // Buscar al menos una hoja relacionada con FUR
    const tieneHojaFUR = hojasEsperadas.some((hoja) =>
      hojasEncontradas.some((h) =>
        h.toLowerCase().includes(hoja.toLowerCase()),
      ),
    );

    if (!tieneHojaFUR) {
      advertencias.push(
        `No se encontró una hoja específica de FUR. Hojas encontradas: ${hojasEncontradas.join(', ')}`,
      );
    }

    // Columnas esperadas para FUR (estructura básica)
    // Nota: Estas pueden ajustarse según el formato oficial DAFP
    const columnasEsperadas = [
      'periodo',
      'indicador',
      'valor',
      'meta',
      'cumplimiento',
    ];

    // Validar estructura en la primera hoja
    if (workbook.SheetNames.length > 0) {
      const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
      const datosJson = XLSX.utils.sheet_to_json(primeraHoja, {
        header: 1,
      });

      if (datosJson.length > 0) {
        const headers = datosJson[0] as any[];
        const headersLower = headers
          .map((h) => String(h || '').toLowerCase().trim())
          .filter((h) => h !== '');

        // Verificar que haya al menos algunas columnas relevantes
        const tieneColumnasRelevantes = columnasEsperadas.some((col) =>
          headersLower.some((h) => h.includes(col.toLowerCase())),
        );

        if (!tieneColumnasRelevantes && headersLower.length > 0) {
          advertencias.push(
            `Las columnas encontradas no coinciden con el formato esperado para FUR. Columnas: ${headersLower.join(', ')}`,
          );
        }
      }
    }

    return { errores, advertencias };
  }

  /**
   * Valida formato específico para Informe de Austeridad
   */
  private validarFormatoAusteridad(
    workbook: XLSX.WorkBook,
  ): { errores: string[]; advertencias: string[] } {
    const errores: string[] = [];
    const advertencias: string[] = [];

    // Columnas esperadas para Austeridad
    const columnasEsperadas = [
      'periodo',
      'trimestre',
      'concepto',
      'presupuesto',
      'ejecutado',
      'ahorro',
      'medida',
    ];

    if (workbook.SheetNames.length > 0) {
      const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
      const datosJson = XLSX.utils.sheet_to_json(primeraHoja, {
        header: 1,
      });

      if (datosJson.length > 0) {
        const headers = datosJson[0] as any[];
        const headersLower = headers
          .map((h) => String(h || '').toLowerCase().trim())
          .filter((h) => h !== '');

        // Verificar columnas financieras básicas
        const tieneDatosFinancieros =
          headersLower.some((h) => h.includes('presupuesto')) ||
          headersLower.some((h) => h.includes('ejecutado')) ||
          headersLower.some((h) => h.includes('gasto'));

        if (!tieneDatosFinancieros && headersLower.length > 0) {
          advertencias.push(
            `No se detectaron columnas de datos financieros. Columnas encontradas: ${headersLower.join(', ')}`,
          );
        }
      }
    }

    return { errores, advertencias };
  }

  /**
   * Valida reglas generales del formato DAF
   */
  private validarReglasGeneralesDAF(
    workbook: XLSX.WorkBook,
    errores: string[],
    advertencias: string[],
  ): void {
    // Validar que no haya hojas con nombres problemáticos
    const nombresInvalidos = ['Sheet1', 'Hoja1', 'Sheet'];
    workbook.SheetNames.forEach((nombre) => {
      if (nombresInvalidos.includes(nombre.trim())) {
        advertencias.push(
          `La hoja "${nombre}" tiene un nombre genérico. Se recomienda usar nombres descriptivos según formato DAF.`,
        );
      }
    });

    // Validar que haya datos en al menos una hoja
    let tieneDatos = false;
    for (const nombreHoja of workbook.SheetNames) {
      const worksheet = workbook.Sheets[nombreHoja];
      if (worksheet) {
        const datosJson = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });
        const filasConDatos = datosJson.filter((fila: any) => {
          if (!Array.isArray(fila)) return false;
          return fila.some(
            (celda) => celda !== '' && celda !== null && celda !== undefined,
          );
        }).length;

        if (filasConDatos > 1) {
          // Más de 1 porque cuenta el header
          tieneDatos = true;
          break;
        }
      }
    }

    if (!tieneDatos) {
      errores.push(
        'El archivo Excel no contiene datos. Debe tener al menos una fila de datos además de los encabezados.',
      );
    }
  }
}
