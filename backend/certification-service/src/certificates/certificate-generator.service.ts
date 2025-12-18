import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

@Injectable()
export class CertificateGeneratorService {
  /**
   * Genera un certificado DOCX usando la plantilla CERT_DOCENTE.docx
   * @param data Datos del certificado
   * @returns Buffer del documento generado
   */
  async generateCertificate(data: {
    consecutivo: string;
    nombreCompleto: string;
    numeroDocumento: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    categoria: string;
    ubicacion: string;
    salarioNumero: string;
    salarioTexto: string;
    fechaExpedicion: string;
    firmante: string;
  }): Promise<Buffer> {
    try {
      // Ruta a la plantilla DOCX
      const templatePath = path.join(
        __dirname,
        '../../plantillas/CERT_DOCENTE.docx',
      );

      // Leer el archivo de plantilla
      const content = fs.readFileSync(templatePath, 'binary');

      // Crear instancia de PizZip
      const zip = new PizZip(content);

      // Crear instancia de Docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Reemplazar las variables en la plantilla
      doc.setData({
        CONSECUTIVO: data.consecutivo,
        NOMBRE_COMPLETO: data.nombreCompleto,
        NUMERO_DOCUMENTO: data.numeroDocumento,
        TIPO_VINCULACION: data.tipoVinculacion,
        FECHA_VINCULACION: data.fechaVinculacion,
        CATEGORIA: data.categoria,
        UBICACION: data.ubicacion,
        SALARIO_NUMERO: data.salarioNumero,
        SALARIO_TEXTO: data.salarioTexto,
        FECHA_EXPEDICION: data.fechaExpedicion,
        FIRMANTE: data.firmante,
      });

      // Renderizar el documento
      doc.render();

      // Generar el buffer del documento
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return buffer;
    } catch (error) {
      console.error('Error al generar certificado:', error);
      throw new Error(`Error al generar certificado: ${error.message}`);
    }
  }

  /**
   * Formatea una fecha a texto en español
   * Ejemplo: "08 de julio de 2024"
   */
  formatFechaTexto(fecha: Date): string {
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();

    return `${dia} de ${mes} de ${anio}`;
  }

  /**
   * Convierte un número a texto en español (para salarios)
   * Ejemplo: 7413445 -> "siete millones cuatrocientos trece mil cuatrocientos cuarenta y cinco"
   */
  numeroATexto(numero: number): string {
    // Implementación básica - puedes mejorarla con una librería como 'numero-a-letras'
    // Por ahora devolvemos un placeholder
    return `${numero.toLocaleString('es-CO')} pesos m/cte`;
  }
}
