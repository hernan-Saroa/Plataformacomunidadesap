import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Printer,
  FileText,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

interface VisorPDFAutoProps {
  isOpen: boolean;
  onClose: () => void;
  autoAction?: 'download' | 'print';
  hiddenMode?: boolean;
  onAutoActionComplete?: (action: 'download' | 'print', success: boolean) => void;
  modoPlantilla?: boolean;
  auto?: {
    id: string;
    numero?: string;
    tipo: string;
    contenido: string;
    estado: string;
    createdAt: string;
    process?: {
      radicadoProceso: string;
      news?: {
        hechos: string;
        fechaQueja?: string;
        denunciante?: {
          nombre: string;
          email?: string;
          telefono?: string;
          direccion?: string;
          cargo?: string;
          cedula?: string;
          documento?: string;
          dependencia?: string;
          entidad?: string;
        };
        disciplinable?: {
          nombre: string;
          cargo: string;
          cedula?: string;
          documento?: string;
          email?: string;
          telefono?: string;
          dependencia?: string;
        };
      };
    };
  };
}

export function VisorPDFAuto({
  isOpen,
  onClose,
  autoAction,
  hiddenMode = false,
  onAutoActionComplete,
  modoPlantilla = false,
  auto,
}: VisorPDFAutoProps) {
  const autoRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plantillaConfig, setPlantillaConfig] = useState<any>(null);
  const [autoActionHandled, setAutoActionHandled] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar configuración de plantilla
  useEffect(() => {
    const cargarPlantilla = async () => {
      try {
        const config = await disciplinaryService.getConfiguracionPlantillaAuto();
        console.log('📋 Plantilla cargada:', config);
        setPlantillaConfig(config);
        setEditedContent(config.htmlContent || '');
      } catch (error) {
        console.error('Error al cargar configuración de plantilla:', error);
        // Usar valores por defecto
        const defaultConfig = {
          typography: { font: 'Times New Roman' },
          headerTitle: 'REPÚBLICA DE COLOMBIA\nCONTROL DISCIPLINARIO INTERNO',
          autoContentHtml: '<p>Plantilla por defecto - [RADICADO] - [FECHA_ACTUAL]</p>',
          logo: null,
          firmante: null
        };
        setPlantillaConfig(defaultConfig);
        setEditedContent(defaultConfig.autoContentHtml);
      }
    };

    if (isOpen) {
      cargarPlantilla();
      console.log('🔄 VisorPDFAuto abierto con auto:', auto);
    }
  }, [isOpen]);

  // Función para reemplazar variables en el contenido HTML
  const reemplazarVariables = (html: string): string => {
    if (!html) return '';

    if (!auto) return html;

    const proceso = auto.process;
    const hechos = proceso?.news?.hechos || '';
    const radicado = proceso?.radicadoProceso || '';
    const fechaQueja = proceso?.news?.fechaQueja || '';
    const denunciante = proceso?.news?.denunciante as { nombre?: string; cedula?: string; documento?: string } || {};
    const disciplinable = proceso?.news?.disciplinable as { nombre?: string; cargo?: string; cedula?: string; documento?: string } || {};

    console.log('🔍 Reemplazando variables en VisorPDFAuto:', {
      auto: auto,
      proceso: proceso,
      hechos: hechos,
      radicado: radicado,
      fechaQueja: fechaQueja,
      denunciante: denunciante,
      disciplinable: disciplinable
    });

    const reemplazos: Record<string, string> = {
      '[RADICADO]': radicado,
      '[FECHA_QUEJA]': fechaQueja ? new Date(fechaQueja).toLocaleDateString('es-CO') : '',
      '[HECHOS]': hechos,
      '[DENUNCIANTE_NOMBRE]': denunciante.nombre || '',
      '[DENUNCIANTE_DOCUMENTO]': denunciante.cedula || denunciante.documento || '',
      '[DISCIPLINABLE_NOMBRE]': disciplinable.nombre || '',
      '[DISCIPLINABLE_DOCUMENTO]': disciplinable.cedula || disciplinable.documento || '',
      '[DISCIPLINABLE_CARGO]': disciplinable.cargo || '',
      '[FECHA_ACTUAL]': new Date().toLocaleDateString('es-CO'),
      '[NUMERO_AUTO]': auto.numero || 'Sin Número',
      '[TIPO_AUTO]': auto.tipo || 'Auto Genérico',
    };

    console.log('📋 Reemplazos calculados:', reemplazos);

    let resultado = html;

    // Reemplazar las variables con los valores reales
    Object.entries(reemplazos).forEach(([variable, valor]) => {
      const regex = new RegExp(variable.replace(/[[\]]/g, '\\$&'), 'g');
      resultado = resultado.replace(regex, valor);
    });

    console.log('✅ HTML resultante:', resultado);
    return resultado;
  };

  const handleDescargar = async () => {
    if (modoPlantilla) return; // No descargar en modo plantilla
    if (!autoRef.current || !auto) return;

    try {
      setIsGenerating(true);
      if (autoAction !== 'print') {
        toast.loading('Generando PDF del auto...', { id: 'generating-pdf' });
      }

      // Esperar un momento para que todo se renderice correctamente
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capturar el contenido como imagen con html2canvas
      const canvas = await html2canvas(autoRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 816,
        windowHeight: 1056,
        imageTimeout: 0,
        ignoreElements: (element) => {
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
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());
          clonedDoc.querySelectorAll('style').forEach(style => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.remove();
            }
          });
          const safeStyle = clonedDoc.createElement('style');
          safeStyle.textContent = `
            body { margin: 0; padding: 0; }
            * { box-sizing: border-box; }
          `;
          clonedDoc.head.appendChild(safeStyle);
        }
      });

      // Dimensiones del PDF en formato Letter
      const pdf = new jsPDF({
        unit: 'px',
        format: [816, 1056],
        orientation: 'portrait',
        compress: true
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056, '', 'FAST');

      const fileName = `Auto_${auto.tipo}_${auto.numero || 'borrador'}.pdf`;

      pdf.save(fileName);
      toast.success('¡Auto descargado exitosamente!', {
        id: 'generating-pdf',
        description: `Auto ${auto.numero || 'borrador'}`,
        duration: 3000
      });

      if (autoAction) {
        onAutoActionComplete?.('download', true);
      }
    } catch (error) {
      console.error('Error al descargar auto:', error);
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

  const handleGuardarPlantilla = async () => {
    if (!plantillaConfig) return;

    try {
      setIsSaving(true);
      const updatedConfig = {
        ...plantillaConfig,
        htmlContent: editedContent
      };
      await disciplinaryService.updateConfiguracionPlantillaAuto(updatedConfig);
      setPlantillaConfig(updatedConfig);
      toast.success('Plantilla guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      toast.error('Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImprimir = () => {
    if (!autoRef.current) return;

    const contenido = autoRef.current.cloneNode(true) as HTMLElement;
    contenido.id = 'auto-print';
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
      #auto-print {
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
          <title>${modoPlantilla ? 'Plantilla de Auto' : `Auto ${auto?.numero || 'Borrador'}`}</title>
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

  // Disparar acciones automáticas
  React.useEffect(() => {
    if (!isOpen || !autoAction) return;
    if (!plantillaConfig) return;
    if (autoActionHandled) return;
    if (!autoRef.current) return;

    if (autoAction === 'download') {
      void handleDescargar();
      setAutoActionHandled(true);
    } else if (autoAction === 'print') {
      handleImprimir();
      setAutoActionHandled(true);
    }
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

  const contenidoNormalizado = plantillaConfig.htmlContent
    ? reemplazarVariables(plantillaConfig.htmlContent)
    : (auto?.contenido ? reemplazarVariables(auto.contenido) : '<p>Sin contenido disponible</p>');

  console.log('📄 Contenido normalizado:', {
    modoPlantilla,
    plantillaConfigHtml: plantillaConfig?.htmlContent,
    autoContenido: auto?.contenido,
    contenidoNormalizado
  });

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
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          />
        )}

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
                    <h2 className="text-white text-xl font-semibold">
                      {modoPlantilla ? 'Vista Previa - Plantilla de Auto' : 'Vista Previa - Auto Disciplinario'}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {modoPlantilla ? 'Plantilla ' : `${auto?.numero || 'Sin Número'} - ${auto?.tipo || 'Sin Tipo'}`}
                    </p>
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
            {!modoPlantilla && (
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
            )}

            {/* PDF Preview */}
            <div className="overflow-y-auto flex-1 bg-gray-100 p-2 sm:p-4 md:p-6">
              <div className="w-full max-w-full overflow-x-auto">
                <div
                  ref={autoRef}
                  className="bg-white shadow-2xl mx-auto relative"
                  style={{
                    width: '816px',
                    minHeight: '1056px',
                    maxWidth: '100%',
                    fontFamily: 'Times New Roman, serif',
                    fontSize: '12pt',
                    padding: '72px 72px 72px 72px',
                    position: 'relative',
                    transform: 'scale(1)',
                    transformOrigin: 'top center'
                  }}
                >
                {modoPlantilla ? (
                  /* Modo Plantilla - Solo mostrar el contenido HTML crudo */
                  <div>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '24pt',
                      fontSize: '16pt',
                      fontWeight: 'bold',
                      color: '#003DA5'
                    }}>
                      PLANTILLA DE AUTO
                    </div>
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '24pt',
                      fontSize: '12pt',
                      color: '#666'
                    }}>
                      Vista previa de la plantilla
                    </div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: contenidoNormalizado
                      }}
                      style={{
                        textAlign: 'justify',
                        lineHeight: '1.5',
                        fontSize: '12pt',
                        border: '1px dashed #ccc',
                        padding: '20px',
                        backgroundColor: '#f9f9f9'
                      }}
                    />
                  </div>
                ) : (
                  /* Modo Normal - Auto completo */
                  <>
                    {/* Header - Logo ESAP */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '24pt',
                      fontSize: '14pt',
                      fontWeight: 'bold'
                    }}>
                      REPÚBLICA DE COLOMBIA
                    </div>

                    <div style={{
                      textAlign: 'center',
                      marginBottom: '24pt',
                      fontSize: '12pt'
                    }}>
                      CONTROL DISCIPLINARIO INTERNO
                    </div>

                    {/* Número del Auto */}
                    <div style={{
                      textAlign: 'right',
                      marginBottom: '24pt',
                      fontSize: '12pt'
                    }}>
                      {auto?.numero || 'Auto Sin Número'}
                    </div>

                    {/* Título del Auto */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '24pt',
                      fontSize: '14pt',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {auto?.tipo || 'Auto Genérico'}
                    </div>

                    {/* Espacio */}
                    <div style={{ height: '24pt' }}></div>

                    {/* Contenido del Auto */}
                    {plantillaConfig.htmlContent ? (
                       <div
                         dangerouslySetInnerHTML={{
                           __html: contenidoNormalizado
                         }}
                         style={{
                           textAlign: 'justify',
                           lineHeight: '1.5',
                           fontSize: '12pt'
                         }}
                       />
                     ) : (
                       <div
                         dangerouslySetInnerHTML={{
                           __html: auto?.contenido || '<p>Sin contenido disponible</p>'
                         }}
                         style={{
                           textAlign: 'justify',
                           lineHeight: '1.5',
                           fontSize: '12pt'
                         }}
                       />
                     )}

                    {/* Espacio antes de firma */}
                    <div style={{ height: '48pt' }}></div>

                    {/* Sección de firma */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: '60pt' }}></div>
                      <p style={{
                        margin: 0,
                        fontSize: '12pt',
                        fontWeight: 'bold'
                      }}>
                        {plantillaConfig.firmante?.nombre || 'Director de Control Disciplinario'}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '10pt'
                      }}>
                        {plantillaConfig.firmante?.cargo || 'Cargo del Firmante'}
                      </p>
                    </div>
                  </>
                )}

                {/* Footer */}
                {!modoPlantilla && (
                  <div style={{
                    position: 'absolute',
                    bottom: '40px',
                    left: '72px',
                    width: '250px',
                    fontSize: '8pt',
                    lineHeight: '1.3'
                  }}>
                    <p style={{ margin: '0 0 2px 0' }}>ESAP - Control Disciplinario</p>
                    <p style={{ margin: '0 0 2px 0' }}>Fecha de generación: {new Date().toLocaleDateString('es-CO')}</p>
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-gray-200 px-4 sm:px-6 py-3 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm">
                      {modoPlantilla ? 'Vista previa de plantilla' : 'Vista previa del documento'}
                    </span>
                  </div>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  {modoPlantilla ? 'Plantilla cargada desde BD' : 'Generado'}: {new Date().toLocaleString('es-CO')}
                </div>
              </div>
            </div>
            </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}