import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Printer,
  CheckCircle,
  Shield,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { certificadosService } from '../../services/api/certificados.service';
import { buildServiceAssetUrl } from '../../config/environment';

interface VisorPDFCertificadoProps {
  isOpen: boolean;
  onClose: () => void;
  autoAction?: 'download' | 'print';
  hiddenMode?: boolean;
  onAutoActionComplete?: (action: 'download' | 'print', success: boolean) => void;
  certificado: {
    consecutivo: string;
    certificateHash?: string;
    qrCode?: string;
    incluyeSalario?: boolean;
    empleado: {
      nombre: string;
      documento: string;
      email: string;
      cargo: string;
      dependencia: string;
      tipoVinculacion: string;
      fechaVinculacion: string;
      grado: string;
      salario: number;
      salarioTexto?: string;
      salarioOriginal?: number;
      salarioTextoOriginal?: string;
    };
    fechaSolicitud: string;
    fechaGeneracion?: string;
    estado: string;
    firmante?: {
      nombre: string;
      cargo: string;
      dependencia: string;
    };
    // Campos adicionales del backend
    position_location?: string; // Ubicación del cargo
    department?: string; // Departamento
    campus?: string; // Sede
    signer_name?: string; // Nombre del firmante
    signer_position?: string; // Cargo del firmante
    signer_department?: string; // Dependencia del firmante
  };
}

export function VisorPDFCertificado({
  isOpen,
  onClose,
  certificado,
  autoAction,
  hiddenMode = false,
  onAutoActionComplete,
}: VisorPDFCertificadoProps) {
  const certificadoRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plantillaConfig, setPlantillaConfig] = useState<any>(null);
  const [templateType, setTemplateType] = useState<'docente' | 'administrador'>('docente');
  const [autoActionHandled, setAutoActionHandled] = useState(false);

  const resolverTipoPlantilla = (): 'docente' | 'administrador' => {
    const fromCert = (certificado as any)?.templateType;
    if (fromCert === 'docente' || fromCert === 'administrador') return fromCert;

    const cargoTexto = `${certificado.empleado.cargo || ''} ${certificado.empleado.tipoVinculacion || ''}`.toLowerCase();
    return cargoTexto.includes('docent') ? 'docente' : 'administrador';
  };

  // Cargar configuración de plantilla
  useEffect(() => {
    const cargarPlantilla = async () => {
      try {
        const tipoDetectado = resolverTipoPlantilla();
        setTemplateType(tipoDetectado);
        const config = await certificadosService.plantilla.obtenerConfiguracion(tipoDetectado);
        setPlantillaConfig(config);
      } catch (error) {
        console.error('Error al cargar configuración de plantilla:', error);
        // Si falla, usar valores por defecto
        setPlantillaConfig({
          typography: { font: 'Times New Roman' },
          cargoTitle: 'LA DIRECTORA TÉCNICA DE TALENTO HUMANO DE LA\nESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP',
          certificateContentHtml: '',
          logo: null,
          firmante: null
        });
      }
    };

    if (isOpen) {
      cargarPlantilla();
    }
  }, [isOpen, certificado?.empleado?.cargo, certificado?.empleado?.tipoVinculacion]);

  const incluirSalario = certificado?.incluyeSalario !== false;
  const salarioBase =
    (certificado.empleado as any)?.salarioOriginal ??
    certificado.empleado.salario ??
    0;
  const salarioTextoBase =
    (certificado.empleado as any)?.salarioTextoOriginal ??
    certificado.empleado.salarioTexto ??
    '';

  const limpiarSeccionesSalario = (html: string): string => {
    if (incluirSalario || !html) return html;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.body.querySelectorAll('p, div, li, span').forEach((node) => {
        const texto = (node.textContent || '').toLowerCase();
        if (texto.includes('salari') || texto.includes('asignaci')) {
          node.remove();
        }
      });
      return doc.body.innerHTML;
    } catch (error) {
      return html.replace(/<p[^>]*>[^<]*salari[^<]*<\/p>/gi, '');
    }
  };

  // Función para reemplazar variables en el contenido HTML Y LIMPIAR ESTILOS DE RESALTADO
  const reemplazarVariables = (html: string): string => {
    if (!html) return '';

    const tipoVinculacion = certificado.empleado.tipoVinculacion || '';
    const cargoTexto = certificado.empleado.cargo || '';
    const grado = certificado.empleado.grado || '';
    const dependencia = certificado.empleado.dependencia || certificado.department || '';
    const ubicacion = certificado.position_location || certificado.campus || dependencia || '';

    const cargoPlantilla =
      templateType === 'docente'
        ? (
            cargoTexto && tipoVinculacion &&
            cargoTexto.toLowerCase() === tipoVinculacion.toLowerCase()
              ? (grado || dependencia || cargoTexto)
              : (cargoTexto || grado || tipoVinculacion || dependencia || '')
          )
        : (cargoTexto || grado || tipoVinculacion || '');

    const dato6 =
      templateType === 'docente'
        ? ubicacion
        : (grado || ubicacion);

    const salarioEnLetras = incluirSalario && salarioBase ? numeroALetras(salarioBase) : '';
    const fechaExpedicionSource =
      certificado.fechaGeneracion ||
      certificado.fechaSolicitud ||
      new Date().toISOString();
    const fechaExpedicionCompleta = formatearFecha(fechaExpedicionSource);

    const reemplazos: Record<string, string> = {
      '[DATO1]': certificado.empleado.nombre || '',
      '[DATO2]': certificado.empleado.documento || '',
      '[DATO3]': tipoVinculacion,
      '[DATO4]': formatearFecha(certificado.empleado.fechaVinculacion),
      '[DATO5]': cargoPlantilla,
      '[DATO6]': dato6,
      '[DATO7]': dependencia,
      '[DATO8]': incluirSalario ? (salarioTextoBase || salarioEnLetras) : '',
      '[NOMBRE_EMPLEADO]': certificado.empleado.nombre || '',
      '[DOCUMENTO]': certificado.empleado.documento || '',
      '[CARGO]': cargoPlantilla,
      '[DEPENDENCIA]': dependencia,
      '[FECHA_INICIO]': formatearFecha(certificado.empleado.fechaVinculacion),
      '[FECHA_FIN]': 'la actualidad',
      '[SALARIO]': incluirSalario && salarioBase ? `($${salarioBase.toLocaleString('es-CO')})` : '',
      '[SALARIO_LETRAS]': incluirSalario ? salarioEnLetras : '',
      '[FECHA_EXPEDICION_COMPLETA]': fechaExpedicionCompleta,
      '[CIUDAD_EXPEDICION]': 'Bogotá D.C.',
    };

    let resultado = html;

    // PASO 1: Limpiar el resaltado amarillo manteniendo el estilo (negrita) y la estructura
    resultado = resultado.replace(/bg-yellow-200/g, '');
    resultado = resultado.replace(/\s*contenteditable="false"/g, '');
    resultado = resultado.replace(/\sclass=""/g, '');
    // Reemplazar &nbsp; por espacios normales
    resultado = resultado.replace(/&nbsp;/g, ' ');
    // PASO 1.1: Normalizar alineaciÇün/indentaciÇün que genera tabulaciones raras
    resultado = resultado.replace(/text-align\s*:\s*justify;?/gi, 'text-align: justify;');
    resultado = resultado.replace(/text-indent\s*:\s*[^;"']+;?/gi, 'text-indent: 0;');
    resultado = resultado.replace(/margin-(left|right)\s*:\s*[^;"']+;?/gi, '');
    resultado = resultado.replace(/padding-(left|right)\s*:\s*[^;"']+;?/gi, '');
    resultado = resultado.replace(/\sstyle="\s*"/gi, '');

    // PASO 2: Conservar negritas aplicadas por el usuario
    // Convertir spans con font-weight:bold o font-bold en <b>...</b>
    resultado = resultado.replace(
      /<span([^>]*?(font-weight\s*:\s*bold|font\s*:\s*[^;]*\s700|class="[^"]*font-bold[^"]*")[^>]*)>([\s\S]*?)<\/span>/gi,
      '<b>$3</b>'
    );

    // PASO 2.1: Normalizar spans de variables sin padding/margin para evitar espacios extra
    resultado = resultado.replace(
      /<span[^>]*(variable-token|px-2|py-1)[^>]*>([\s\S]*?)<\/span>/gi,
      '<span style="padding:0;margin:0;font-weight:inherit;">$2</span>'
    );

    // PASO 3: Limpiar spans que SOLO envuelven variables (sin clases útiles)
    // Excluir spans que indiquen estilo (font-weight, font-bold, variable-token)
    resultado = resultado.replace(
      /<span(?![^>]*(font-weight|font-bold|variable-token|underline|italic|text-))[^>]*>(\[[^\]]+\])<\/span>/gi,
      '$2'
    );

    // PASO 4: Limpiar spans vacíos
    resultado = resultado.replace(/<span[^>]*><\/span>/g, '');

    // PASO 5: Limpiar atributos contenteditable
    resultado = resultado.replace(/\s*contenteditable="[^"]*"/g, '');

    // PASO 6: AHORA reemplazar las variables con los valores reales
    Object.entries(reemplazos).forEach(([variable, valor]) => {
      const regex = new RegExp(variable.replace(/[[\]]/g, '\\$&'), 'g');
      resultado = resultado.replace(regex, valor);
    });

    // PASO 7: Normalizar espacios para evitar huecos raros sin eliminar los que separan palabras
    resultado = resultado.replace(/&nbsp;/g, ' ');
    // Insertar espacio si falta entre cierre/apertura de <b> y texto
    resultado = resultado.replace(/<\/b>(?=[A-Za-zÁÉÍÓÚÑáéíóúñ0-9])/g, '</b> ');
    resultado = resultado.replace(/([A-Za-zÁÉÍÓÚÑáéíóúñ0-9])<b>/g, '$1 <b>');
    // Colapsar espacios múltiples
    resultado = resultado.replace(/\s{2,}/g, ' ');
    // Eliminar espacio antes de signos de puntuación
    resultado = resultado.replace(/\s+([.,;:])/g, '$1');

    return resultado;
  };

  // Función para convertir números a palabras en español
  const numeroALetras = (num: number): string => {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (num === 0) return 'cero';
    if (num === 100) return 'cien';

    const convertirMenorMil = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 30) return n === 20 ? 'veinte' : 'veinti' + unidades[n - 20];
      if (n < 100) {
        const dec = Math.floor(n / 10);
        const uni = n % 10;
        return decenas[dec] + (uni > 0 ? ' y ' + unidades[uni] : '');
      }
      if (n === 100) return 'cien';
      if (n < 1000) {
        const cent = Math.floor(n / 100);
        const resto = n % 100;
        return centenas[cent] + (resto > 0 ? ' ' + convertirMenorMil(resto) : '');
      }
      return '';
    };

    let resultado = '';

    // Millones
    if (num >= 1000000) {
      const millones = Math.floor(num / 1000000);
      if (millones === 1) {
        resultado += 'un millón';
      } else {
        resultado += convertirMenorMil(millones) + ' millones';
      }
      num = num % 1000000;
      if (num > 0) resultado += ' ';
    }

    // Miles
    if (num >= 1000) {
      const miles = Math.floor(num / 1000);
      if (miles === 1) {
        resultado += 'mil';
      } else {
        resultado += convertirMenorMil(miles) + ' mil';
      }
      num = num % 1000;
      if (num > 0) resultado += ' ';
    }

    // Centenas, decenas y unidades
    if (num > 0) {
      resultado += convertirMenorMil(num);
    }

    return resultado.trim();
  };

  const handleDescargar = async () => {
    if (!certificadoRef.current) return;

    try {
      setIsGenerating(true);
      toast.loading('Generando PDF del certificado...', { id: 'generating-pdf' });

      // Esperar un momento para que todo se renderice correctamente
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capturar el contenido como imagen con html2canvas SIN estilos externos
      const canvas = await html2canvas(certificadoRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 816,
        windowHeight: 1056,
        imageTimeout: 0,
        ignoreElements: (element) => {
          // Ignorar elementos que no son parte del certificado
          const classList = element.classList;
          if (classList.contains('lucide') || classList.contains('lucide-download')) {
            return true;
          }
          if (element.tagName === 'BUTTON') {
            return true;
          }
          if (element.tagName === 'svg' && element.closest('button')) {
            return true;
          }
          return false;
        },
        onclone: (clonedDoc) => {
          // Eliminar hojas de estilo externas que contienen oklch
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());

          // Eliminar style tags que contengan oklch
          clonedDoc.querySelectorAll('style').forEach(style => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.remove();
            }
          });

          // Agregar un estilo mínimo que NO interfiera con los estilos inline
          const safeStyle = clonedDoc.createElement('style');
          safeStyle.textContent = `
            /* Solo resetear elementos sin estilo inline */
            body { margin: 0; padding: 0; }
            * { box-sizing: border-box; }
          `;
          clonedDoc.head.appendChild(safeStyle);
        }
      });

      // Dimensiones del PDF en formato Letter (8.5 x 11 pulgadas = 816 x 1056 px)
      const pdf = new jsPDF({
        unit: 'px',
        format: [816, 1056],
        orientation: 'portrait',
        compress: true
      });

      // Convertir canvas a imagen PNG de alta calidad
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Añadir la imagen al PDF (tamaño completo de la página)
      pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056, '', 'FAST');

      // Nombre del archivo dinámico según el certificado
      const fileName = `Certificado_Laboral_${certificado.empleado.nombre.replace(/\s+/g, '_')}_${certificado.consecutivo}.pdf`;

      // Descargar el PDF
      pdf.save(fileName);

      toast.success('¡Certificado descargado exitosamente!', {
        id: 'generating-pdf',
        description: `Certificado de ${certificado.empleado.nombre}`,
        duration: 3000
      });
      if (autoAction) {
        onAutoActionComplete?.('download', true);
      }
    } catch (error) {
      console.error('Error al descargar certificado:', error);
      toast.error('Error al generar el PDF', {
        id: 'generating-pdf',
        description: error instanceof Error ? error.message : 'Por favor, intente nuevamente',
        duration: 5000
      });
      if (autoAction) {
        onAutoActionComplete?.('download', false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprimir = () => {
    if (!certificadoRef.current) return;

    // Clonar el certificado y fijar medidas para evitar recortes en la impresión
    const contenido = certificadoRef.current.cloneNode(true) as HTMLElement;
    contenido.id = 'certificado-print';
    contenido.style.margin = '0 auto';
    contenido.style.boxShadow = 'none';
    contenido.style.backgroundColor = '#ffffff';

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;

    const printStyles = `
      @page { size: letter; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body {
        margin: 0;
        padding: 0;
        background: #e5e7eb;
        width: 100%;
        min-height: 100%;
      }
      body {
        font-family: Arial Narrow, Arial, sans-serif;
        display: flex;
        justify-content: center;
      }
      .print-wrapper {
        width: 816px;
        min-height: 1056px;
        padding: 0;
        display: flex;
        justify-content: center;
      }
      #certificado-print {
        width: 816px !important;
        min-height: 1056px !important;
        padding: 72px !important;
        margin: 0 auto !important;
        background: #ffffff !important;
      }
      img { max-width: 100%; }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Certificado Laboral - ${certificado.consecutivo}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="print-wrapper">${contenido.outerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const esperarAssets = () => {
      const images = Array.from(printWindow.document.images);
      const pendientes = images.filter(img => !img.complete);
      if (pendientes.length === 0) {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 150);
          if (autoAction) {
            onAutoActionComplete?.('print', true);
          }
        }, 200);
        return;
      }
      pendientes.forEach(img => {
        img.onload = esperarAssets;
        img.onerror = esperarAssets;
      });
    };

    esperarAssets();
    toast.info('Preparando documento para impresión...');
  };

  React.useEffect(() => {
    if (!isOpen || !autoAction) {
      setAutoActionHandled(false);
    }
  }, [isOpen, autoAction]);

  const parseDateOnly = (fechaStr: string) => {
    if (!fechaStr || fechaStr === 'N/A') {
      return null;
    }
    const isoMatch = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day, 12, 0, 0);
    }
    const parsed = new Date(fechaStr);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = parseDateOnly(fechaStr);
      if (!fecha) {
        return 'Fecha no disponible';
      }
      return fecha.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

    // Disparar acciones autom?ticas cuando se usa en modo oculto
  React.useEffect(() => {
    if (!isOpen || !autoAction) return;
    if (!plantillaConfig) return;
    if (autoActionHandled) return;
    if (!certificadoRef.current) return;

    if (autoAction === 'download') {
      void handleDescargar();
      setAutoActionHandled(true);
    } else if (autoAction === 'print') {
      handleImprimir();
      setAutoActionHandled(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoAction, plantillaConfig, autoActionHandled]);


  if (!isOpen) return null;

  // Mostrar loading mientras se carga la configuración
  if (!plantillaConfig) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003DA5] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración de plantilla...</p>
        </div>
      </div>
    );
  }

  const contenidoNormalizado = plantillaConfig.certificateContentHtml
    ? limpiarSeccionesSalario(reemplazarVariables(plantillaConfig.certificateContentHtml))
    : '';
  const salarioParaMostrar = incluirSalario ? salarioBase : 0;
  const salarioEnLetrasParaMostrar = incluirSalario && salarioBase ? numeroALetras(salarioBase) : '';

  return (
    <AnimatePresence>
      <div className={hiddenMode ? 'fixed inset-0 z-[9999] opacity-0 pointer-events-none' : 'fixed inset-0 z-[9999] overflow-hidden'}>
        {!hiddenMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
        )}

        {/* Modal */}
        <div className={hiddenMode ? 'fixed inset-0 p-0 m-0 opacity-0 pointer-events-none' : 'fixed inset-0 flex items-center justify-center p-2 sm:p-4 pt-16 sm:pt-4'}>
          <motion.div
            initial={hiddenMode ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={hiddenMode ? { opacity: 0, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={hiddenMode ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] sm:max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-semibold">Vista Previa - Certificado Laboral</h2>
                    <p className="text-blue-100 text-sm">N° {certificado.consecutivo}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Opciones:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleDescargar}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  size="sm"
                  disabled={isGenerating}
                  data-action="download-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generando...' : 'Descargar PDF'}
                </Button>
                <Button
                  onClick={handleImprimir}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* PDF Preview */}
            <div className="overflow-y-auto flex-1 bg-gray-100 p-4 sm:p-6 md:p-8">
              <style>
                {`
                  .certificate-content-block p {
                    margin: 0 0 12pt 0;
                    text-align: justify !important;
                    text-align-last: left !important;
                    text-indent: 0 !important;
                    letter-spacing: normal !important;
                  }
                  .certificate-content-block span {
                    letter-spacing: normal !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                `}
              </style>
              <div
                ref={certificadoRef}
                className="bg-white shadow-2xl mx-auto relative"
                style={{
                  width: '816px',
                  minHeight: '1056px',
                  fontFamily: 'Arial Narrow, Arial, sans-serif',
                  fontSize: '12pt',
                  padding: '72px 72px 72px 72px',
                  position: 'relative'
                }}
                data-template-type={templateType}
              >
                {/* Header - Logo ESAP (desde plantilla o por defecto) */}
                {plantillaConfig.logo?.url ? (
                          <img
                            src={buildServiceAssetUrl('certificados', plantillaConfig.logo.url || '')}
                    alt="Logo ESAP"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '0px',
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '300px',
                      maxHeight: '100px',
                      objectFit: 'contain'
                    }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <img
                    src="/certificados/header-esap.png"
                    alt="Header ESAP"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '0px',
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '300px',
                      maxHeight: '100px',
                      objectFit: 'contain'
                    }}
                    crossOrigin="anonymous"
                  />
                )}

                {/* Consecutivo - Alineado a la izquierda (más arriba) */}
                <div style={{
                  textAlign: 'left',
                  fontSize: '12pt',
                  marginBottom: '12pt',
                  marginTop: '50pt',
                  lineHeight: '1.15'
                }}>
                  {certificado.consecutivo}
                </div>

                {/* Espacios en blanco */}
                <div style={{ height: '24pt' }}></div>
                <div style={{ height: '12pt' }}></div>

                {/* Título del cargo - Centrado (desde plantilla) */}
                <div style={{ textAlign: 'center', marginBottom: '0pt', lineHeight: '1.15' }}>
                  {plantillaConfig.cargoTitle ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: plantillaConfig.cargoTitle.replace(/\n/g, '<br/>') }}
                      style={{ fontSize: '12pt', fontWeight: 'bold' }}
                    />
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>
                        {certificado.firmante?.cargo?.toUpperCase() || certificado.signer_position?.toUpperCase() || 'LA DIRECTORA TÉCNICA DE TALENTO HUMANO'} DE LA
                      </p>
                      <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>
                        ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA – ESAP
                      </p>
                    </>
                  )}
                </div>

                {/* Espacios */}
                <div style={{ height: '24pt' }}></div>
                <div style={{ height: '24pt' }}></div>

                {/* HACE CONSTAR - Centrado */}
                <div style={{ textAlign: 'center', marginBottom: '0pt', lineHeight: '1.15' }}>
                  <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>HACE CONSTAR</p>
                </div>

                {/* Espacio */}
                <div style={{ height: '12pt' }}></div>

                {/* Contenido del certificado (desde plantilla o por defecto) */}
                {plantillaConfig.certificateContentHtml ? (
                  <div
                    className="certificate-content-block"
                    dangerouslySetInnerHTML={{
                      __html: contenidoNormalizado
                    }}
                    style={{
                      textAlign: 'justify',
                      textAlignLast: 'left',
                      lineHeight: '1.5',
                      fontSize: '12pt',
                      whiteSpace: 'normal',
                      wordBreak: 'normal',
                      textIndent: '0',
                      letterSpacing: 'normal'
                    }}
                  />
                ) : (
                  <>
                    {/* Contenido por defecto si no hay plantilla */}
                    <p style={{
                      textAlign: 'justify',
                      lineHeight: '1.5',
                      fontSize: '12pt',
                      margin: '0 0 12pt 0'
                    }}>
                      Que {certificado.empleado.nombre} identificado(a) con cédula de ciudadanía No. {certificado.empleado.documento}, se encuentra vinculado(a) con la Escuela Superior de Administración Pública - ESAP mediante nombramiento {certificado.empleado.tipoVinculacion} desde el {formatearFecha(certificado.empleado.fechaVinculacion)}, en la categoría {certificado.empleado.grado} ubicado en {certificado.position_location || certificado.department || certificado.empleado.dependencia}.
                    </p>

                    {incluirSalario && (
                      <p style={{
                        textAlign: 'justify',
                        lineHeight: '1.5',
                        fontSize: '12pt',
                        margin: '0 0 12pt 0'
                      }}>
                        Que {certificado.empleado.nombre} percibe mensualmente una asignación salarial de <strong>
                          {salarioParaMostrar
                            ? `($${salarioParaMostrar.toLocaleString('es-CO')})`
                            : '(salario no disponible)'}
                        </strong> {salarioParaMostrar ? `${salarioEnLetrasParaMostrar} pesos m/cte` : 'pesos m/cte'}.
                      </p>
                    )}

                    <div style={{ height: '12pt' }}></div>

                    <p style={{
                      textAlign: 'justify',
                      lineHeight: '1.5',
                      fontSize: '12pt',
                      margin: '0 0 12pt 0'
                    }}>
                      Se expide en la ciudad de Bogotá D.C., a solicitud del interesado(a) a los {formatearFecha(certificado.fechaSolicitud)}.
                    </p>
                  </>
                )}

                {/* Espacios antes de firma */}
                <div style={{ height: '48pt' }}></div>

                {/* Sección de firma completa */}
                <div style={{ textAlign: 'center' }}>
                  {/* Firma digital (imagen de la firma) - SIEMPRE mostrar si existe */}
                  {plantillaConfig.firmante?.firmaDigitalUrl || plantillaConfig.firmante?.firmaUrl ? (
                    <div style={{ marginBottom: '12pt' }}>
                    <img
                      src={buildServiceAssetUrl('certificados', plantillaConfig.firmante.firmaDigitalUrl || plantillaConfig.firmante.firmaUrl || '')}
                        alt="Firma digital"
                        style={{
                          width: 'auto',
                          height: '60px',
                          maxWidth: '250px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto'
                        }}
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div style={{ height: '60pt' }}></div>
                  )}

                  {/* Nombre del firmante - Debajo de la firma */}
                  <p style={{
                    margin: 0,
                    fontSize: '12pt',
                    fontWeight: 'bold',
                    lineHeight: '1.15'
                  }}>
                    {plantillaConfig.firmante?.nombreCompleto || plantillaConfig.firmante?.nombre || certificado.firmante?.nombre || certificado.signer_name || 'ALBA LUCÍA MARÍN ZULUAGA'}
                  </p>
                </div>

                {/* Footer - Cuadro de texto con información de contacto */}
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '72px',
                  width: '250px',
                  fontSize: '7pt',
                  lineHeight: '1.3',
                  fontFamily: 'Arial, sans-serif',
                  color: '#000000'
                }}>
                  <p style={{ margin: '0 0 2px 0' }}>Sede principal</p>
                  <p style={{ margin: '0 0 2px 0' }}>Calle 44 # 53 - 37, CAN, Bogotá D.C.</p>
                  <p style={{ margin: '0 0 2px 0' }}>Código postal: 111321</p>
                  <p style={{ margin: '0 0 2px 0' }}>Línea conmutador PBX: 018000 423713</p>
                  <p style={{ margin: 0 }}>Línea nacional gratuita PBX: 018000 423713</p>
                </div>

                {/* Footer - Logo ESAP y URL a la DERECHA */}
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  right: '72px',
                  textAlign: 'right'
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '12pt',
                    color: '#0066cc',
                    fontFamily: 'Arial, sans-serif'
                  }}>
                    www.esap.edu.co
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-gray-200 px-4 sm:px-6 py-3 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs sm:text-sm">Documento verificable</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm">Firma electrónica válida</span>
                  </div>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  Generado: {new Date().toLocaleString('es-CO')}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
