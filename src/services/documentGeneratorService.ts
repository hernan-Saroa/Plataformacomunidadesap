/**
 * Servicio para generar documentos .docx usando la plantilla oficial de la ESAP
 * Reemplaza datos dinámicamente y quita resaltados amarillos
 */

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

interface CertificadoData {
  consecutivo: string;
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
    salario: number;
    email: string;
  };
  fechaSolicitud: string;
  fechaGeneracion: string;
}

/**
 * Formatear fecha a texto en español
 */
const formatearFecha = (fechaStr: string): string => {
  try {
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      return 'Fecha no disponible';
    }
    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Fecha no disponible';
  }
};

/**
 * Calcular tiempo de servicio
 */
const calcularTiempoServicio = (fechaVinculacion: string): string => {
  try {
    const fechaInicio = new Date(fechaVinculacion);
    const fechaActual = new Date();

    if (isNaN(fechaInicio.getTime())) {
      return '0 meses';
    }

    const diffTime = Math.abs(fechaActual.getTime() - fechaInicio.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30.44));

    if (diffYears > 0) {
      return `${diffYears} año${diffYears > 1 ? 's' : ''} y ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
    }
    return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
  } catch {
    return '0 meses';
  }
};

/**
 * Formatear salario
 */
const formatearSalario = (salario: number): string => {
  return `$${salario.toLocaleString('es-CO')} COP`;
};

/**
 * Función auxiliar para normalizar XML eliminando saltos de línea y espacios entre etiquetas
 * Esto es necesario porque Word puede dividir texto en múltiples runs (<w:r>)
 */
const normalizarTextoXML = (xml: string): string => {
  // Eliminar saltos de línea entre tags para que las búsquedas funcionen mejor
  return xml.replace(/>\s+</g, '><');
};

/**
 * Reemplaza un marcador en el XML de forma robusta
 * Maneja casos donde el texto puede estar dividido entre múltiples <w:t> tags
 */
const reemplazarMarcadorEnXML = (xml: string, marcador: string, valorReal: string): string => {
  // Escapar caracteres especiales para regex
  const marcadorEscapado = marcador.replace(/[()]/g, '\\$&');

  // Primero intentar reemplazo simple (caso ideal)
  let resultado = xml.replace(new RegExp(marcadorEscapado, 'g'), valorReal);

  // Si el reemplazo simple no funcionó, buscar el marcador dividido entre tags
  // Por ejemplo: <w:t>(</w:t></w:r><w:r><w:t>DATO2</w:t></w:r><w:r><w:t>)</w:t>
  const marcadorSinParentesis = marcador.replace(/[()]/g, '');

  // Patrón para encontrar el marcador dividido en múltiples <w:t> tags
  const patronDividido = new RegExp(
    `<w:t[^>]*>\\(</w:t>(?:</w:r>)?(?:<w:r[^>]*>)?(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>${marcadorSinParentesis}</w:t>(?:</w:r>)?(?:<w:r[^>]*>)?(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>\\)</w:t>`,
    'g'
  );

  resultado = resultado.replace(patronDividido, `<w:t>${valorReal}</w:t>`);

  // También intentar otro patrón común donde solo el nombre está en un tag separado
  const patronDividido2 = new RegExp(
    `\\(<w:t[^>]*>${marcadorSinParentesis}</w:t>\\)`,
    'g'
  );

  resultado = resultado.replace(patronDividido2, `<w:t>${valorReal}</w:t>`);

  return resultado;
};

/**
 * Formatear fecha de expedición en texto completo español
 * Ejemplo: "cinco (05) días del mes de diciembre del año dos mil veinticinco (2025)"
 */
const formatearFechaExpedicion = (fecha: Date): string => {
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-CO', { month: 'long' });
  const ano = fecha.getFullYear();

  const numerosTexto: { [key: number]: string } = {
    1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
    21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco',
    26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve', 30: 'treinta',
    31: 'treinta y uno'
  };

  const diaTexto = numerosTexto[dia] || dia.toString();
  const diaNumero = dia.toString().padStart(2, '0');

  // Convertir año a texto (solo para años 2020-2030)
  let anoTexto = '';
  if (ano >= 2020 && ano <= 2030) {
    const decada = Math.floor(ano / 10) * 10;
    const unidad = ano % 10;
    anoTexto = unidad === 0
      ? `dos mil ${numerosTexto[decada - 2000]}`
      : `dos mil veinti${numerosTexto[unidad]}`;
  } else {
    anoTexto = ano.toString();
  }

  return `${diaTexto} (${diaNumero}) días del mes de ${mes} del año ${anoTexto} (${ano})`;
};

/**
 * Limpiar el XML de la plantilla eliminando resaltados y texto de ejemplo
 */
const limpiarXMLPlantilla = (xmlContent: string): string => {
  let xml = xmlContent;

  // Quitar resaltados amarillos
  xml = xml.replace(/<w:highlight w:val="yellow"\/>/g, '');
  xml = xml.replace(/<w:shd[^>]*w:fill="FFFF00"[^>]*\/>/g, '');

  // Eliminar textos de ejemplo que están junto a los marcadores
  xml = xml.replace(/Juan Leonardo Santana Landaeta\s*/g, '');
  xml = xml.replace(/9\.431\.423\s*/g, '');
  xml = xml.replace(/Docente Carrera Administrativa\s*/g, '');
  xml = xml.replace(/08 de julio de 2024\s*/g, '');
  xml = xml.replace(/Doc\. TITULAR\s*/g, '');
  xml = xml.replace(/\$7\.413\.445\s*/g, '');
  xml = xml.replace(/siete millones cuatrocientos trece mil cuatrocientos cuarenta y cinco pesos m\/cte\.\s*/g, '');

  // Eliminar fecha de ejemplo
  xml = xml.replace(/cinco \(05\) días del mes de agosto del año dos mil veinticinco \(2025\)/g, '');

  return xml;
};

/**
 * Reemplazar un texto en XML de forma super agresiva
 * Busca el texto incluso si está fragmentado entre tags
 */
const reemplazarTextoEnXML = (xml: string, buscar: string, reemplazar: string): string => {
  // Estrategia 1: Reemplazo directo simple
  let resultado = xml.split(buscar).join(reemplazar);

  // Estrategia 2: Buscar el texto fragmentado entre tags <w:t>
  // Ejemplo: <w:t>(</w:t><w:t>DATO2</w:t><w:t>)</w:t>
  if (buscar.startsWith('(') && buscar.endsWith(')')) {
    const contenido = buscar.slice(1, -1); // Quitar paréntesis

    // Patrón para encontrar: (<w:t...>CONTENIDO</w:t...>)
    const patron1 = new RegExp(
      `<w:t[^>]*>\\(</w:t[^>]*>\\s*<w:t[^>]*>${contenido}</w:t[^>]*>\\s*<w:t[^>]*>\\)</w:t[^>]*>`,
      'gi'
    );
    resultado = resultado.replace(patron1, `<w:t>${reemplazar}</w:t>`);

    // Patrón alternativo con <w:r> tags
    const patron2 = new RegExp(
      `<w:t[^>]*>\\(</w:t></w:r>\\s*<w:r[^>]*><w:t[^>]*>${contenido}</w:t></w:r>\\s*<w:r[^>]*><w:t[^>]*>\\)</w:t>`,
      'gi'
    );
    resultado = resultado.replace(patron2, `<w:t>${reemplazar}</w:t>`);

    // Patrón alternativo más simple
    const patron3 = new RegExp(`\\(${contenido}\\)`, 'gi');
    resultado = resultado.replace(patron3, reemplazar);
  }

  return resultado;
};

/**
 * Genera un certificado laboral usando la plantilla oficial CERT_DOCENTE.docx
 * Reemplaza los datos dinámicamente y quita los resaltados amarillos
 */
export const generarCertificadoDocx = async (certificadoData: CertificadoData) => {
  try {
    console.log('🔄 Iniciando generación de certificado con datos:', certificadoData);

    // Cargar la plantilla desde public/templates
    const templateUrl = '/templates/CERT_DOCENTE.docx';
    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error('No se pudo cargar la plantilla del certificado');
    }

    const templateBlob = await response.blob();
    const arrayBuffer = await templateBlob.arrayBuffer();

    // Cargar el archivo .docx como ZIP
    const zip = new PizZip(arrayBuffer);

    // Obtener el documento XML
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new Error('No se pudo encontrar word/document.xml en la plantilla');
    }

    let xmlContent = documentXml.asText();
    console.log('📄 XML original tamaño:', xmlContent.length);

    // DEBUG: Ver estructura alrededor de DATO2
    const dato2Idx = xmlContent.indexOf('DATO2');
    if (dato2Idx !== -1) {
      console.log('🔍 XML cerca de DATO2:', xmlContent.substring(dato2Idx - 150, dato2Idx + 150));
    }

    // PASO 1: Limpiar resaltados y textos de ejemplo
    xmlContent = limpiarXMLPlantilla(xmlContent);
    console.log('✅ Plantilla limpiada');

    // PASO 2: Preparar datos
    const fechaVinculacionFormateada = formatearFecha(certificadoData.empleado.fechaVinculacion);
    const salarioFormateado = formatearSalario(certificadoData.empleado.salario);
    const fechaExpedicion = new Date(certificadoData.fechaGeneracion);
    const fechaExpedicionTexto = formatearFechaExpedicion(fechaExpedicion);

    console.log('📊 Datos:', {
      DATO1: certificadoData.empleado.nombre,
      DATO2: certificadoData.empleado.documento,
      DATO3: certificadoData.empleado.tipoVinculacion,
      DATO4: fechaVinculacionFormateada,
      DATO5: certificadoData.empleado.cargo,
      DATO6: 'Bogotá D.C.',
      DATO7: salarioFormateado,
      FECHA: fechaExpedicionTexto
    });

    // PASO 3: Reemplazar marcadores de forma agresiva
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO1)', certificadoData.empleado.nombre);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO2)', certificadoData.empleado.documento);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO3)', certificadoData.empleado.tipoVinculacion);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO4)', fechaVinculacionFormateada);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO5)', certificadoData.empleado.cargo);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO6)', 'Bogotá D.C.');
    xmlContent = reemplazarTextoEnXML(xmlContent, '(DATO7)', salarioFormateado);
    xmlContent = reemplazarTextoEnXML(xmlContent, '(FECHA_EXPEDICION)', fechaExpedicionTexto);

    console.log('✅ Marcadores reemplazados');

    // Verificar marcadores restantes
    const restantes = xmlContent.match(/\(DATO\d+\)/g);
    if (restantes && restantes.length > 0) {
      console.warn('⚠️ Aún quedan marcadores:', restantes);

      // ÚLTIMO INTENTO: reemplazo carácter por carácter
      for (let i = 1; i <= 7; i++) {
        const marcador = `DATO${i}`;
        if (xmlContent.includes(marcador)) {
          console.log(`🔧 Marcador ${marcador} aún presente, haciendo reemplazo forzado`);
          const valor = i === 1 ? certificadoData.empleado.nombre :
                       i === 2 ? certificadoData.empleado.documento :
                       i === 3 ? certificadoData.empleado.tipoVinculacion :
                       i === 4 ? fechaVinculacionFormateada :
                       i === 5 ? certificadoData.empleado.cargo :
                       i === 6 ? 'Bogotá D.C.' :
                       salarioFormateado;

          // Reemplazo ultra agresivo: encontrar DATO y reemplazar todo el contexto
          xmlContent = xmlContent.replace(new RegExp(`\\(${marcador}\\)`, 'g'), valor);
          xmlContent = xmlContent.replace(new RegExp(marcador, 'g'), valor);
        }
      }
    } else {
      console.log('✅ Todos los marcadores fueron reemplazados exitosamente');
    }

    // PASO 4: Actualizar el archivo ZIP con el XML modificado
    zip.file('word/document.xml', xmlContent);

    // PASO 5: Generar el archivo .docx
    const output = zip.generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // PASO 6: Descargar
    const fileName = `Certificado_Laboral_${certificadoData.empleado.nombre.replace(/\s+/g, '_')}.docx`;
    saveAs(output, fileName);

    console.log('✅ Certificado generado exitosamente:', fileName);
    return { success: true, fileName };
  } catch (error) {
    console.error('❌ Error al generar certificado:', error);
    throw error;
  }
};
