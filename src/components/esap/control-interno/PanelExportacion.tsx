/**
 * PANEL DE EXPORTACIÓN DE DOCUMENTOS
 * Interfaz para generar y descargar documentos oficiales
 */

'use client';

import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FileBarChart,
  FileCheck,
  Printer,
  Share2,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';
import {
  exportarProgramaAnualExcel,
  exportarProgramaAnualPDF,
  exportarInformeAuditoriaPDF,
} from './utils/exportadores';

// ============ TIPOS ============

interface PanelExportacionProps {
  isOpen: boolean;
  onClose: () => void;
  programa: {
    añoFiscal: number;
    version: string;
    fechaCreacion: string;
    responsable: string;
    estado: string;
    auditorias: any[];
  };
  tipo?: 'programa' | 'informe' | 'reporte';
  datosInforme?: any;
}

type FormatoExportacion = 'pdf' | 'excel' | 'word';
type TipoDocumento = 'programa-completo' | 'programa-resumido' | 'cronograma' | 'estadisticas' | 'informe';

// ============ COMPONENTE PRINCIPAL ============

export function PanelExportacion({
  isOpen,
  onClose,
  programa,
  tipo = 'programa',
  datosInforme,
}: PanelExportacionProps) {
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<TipoDocumento>('programa-completo');
  const [formatoSeleccionado, setFormatoSeleccionado] = useState<FormatoExportacion>('pdf');
  const [exportando, setExportando] = useState(false);
  const [incluirEstadisticas, setIncluirEstadisticas] = useState(true);
  const [incluirCronograma, setIncluirCronograma] = useState(true);
  const [incluirFirmas, setIncluirFirmas] = useState(true);

  // ============ CONFIGURACIONES DE DOCUMENTOS ============

  const tiposDocumento = {
    'programa-completo': {
      titulo: 'Programa Anual Completo',
      descripcion: 'Documento oficial con todas las auditorías, cronogramas y estadísticas',
      icono: FileText,
      formatos: ['pdf', 'excel'],
      tamañoEstimado: '~250 KB',
      paginas: Math.ceil(programa.auditorias.length / 15) + 3,
    },
    'programa-resumido': {
      titulo: 'Programa Anual Resumido',
      descripcion: 'Vista ejecutiva con información consolidada y métricas principales',
      icono: FileBarChart,
      formatos: ['pdf'],
      tamañoEstimado: '~150 KB',
      paginas: 2,
    },
    'cronograma': {
      titulo: 'Cronograma de Auditorías',
      descripcion: 'Calendario detallado de todas las etapas por mes',
      icono: FileCheck,
      formatos: ['pdf', 'excel'],
      tamañoEstimado: '~100 KB',
      paginas: Math.ceil(programa.auditorias.length / 20) + 1,
    },
    'estadisticas': {
      titulo: 'Reporte Estadístico',
      descripcion: 'Análisis cuantitativo del programa con gráficos y métricas',
      icono: FileBarChart,
      formatos: ['pdf', 'excel'],
      tamañoEstimado: '~180 KB',
      paginas: 3,
    },
    'informe': {
      titulo: 'Informe de Auditoría',
      descripcion: 'Documento de resultados de una auditoría específica',
      icono: FileText,
      formatos: ['pdf'],
      tamañoEstimado: '~200 KB',
      paginas: 5,
    },
  };

  // ============ HANDLERS ============

  const handleExportar = async () => {
    setExportando(true);

    try {
      // Simular delay para mostrar loading
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (documentoSeleccionado === 'programa-completo') {
        if (formatoSeleccionado === 'pdf') {
          exportarProgramaAnualPDF(programa);
          toast.success('Programa Anual exportado a PDF correctamente');
        } else if (formatoSeleccionado === 'excel') {
          exportarProgramaAnualExcel(programa);
          toast.success('Programa Anual exportado a Excel correctamente');
        }
      } else if (documentoSeleccionado === 'cronograma') {
        if (formatoSeleccionado === 'pdf') {
          exportarProgramaAnualPDF(programa);
          toast.success('Cronograma exportado a PDF correctamente');
        } else if (formatoSeleccionado === 'excel') {
          exportarProgramaAnualExcel(programa);
          toast.success('Cronograma exportado a Excel correctamente');
        }
      } else if (documentoSeleccionado === 'estadisticas') {
        if (formatoSeleccionado === 'excel') {
          exportarProgramaAnualExcel(programa);
          toast.success('Estadísticas exportadas a Excel correctamente');
        } else {
          exportarProgramaAnualPDF(programa);
          toast.success('Reporte estadístico exportado a PDF correctamente');
        }
      } else if (documentoSeleccionado === 'informe' && datosInforme) {
        exportarInformeAuditoriaPDF(datosInforme);
        toast.success('Informe de auditoría exportado correctamente');
      } else {
        // Para opciones no implementadas aún
        toast.info('Esta opción estará disponible próximamente');
      }

      onClose();
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al generar el documento');
    } finally {
      setExportando(false);
    }
  };

  const docInfo = tiposDocumento[documentoSeleccionado];
  const Icon = docInfo.icono;

  // ============ RENDER ============

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Documentos Oficiales"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Información del Programa */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#003DA5] flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">
                Programa Anual de Auditorías {programa.añoFiscal}
              </h4>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Versión:</span> {programa.version}
                </div>
                <div>
                  <span className="font-medium">Auditorías:</span> {programa.auditorias.length}
                </div>
                <div>
                  <span className="font-medium">Estado:</span>{' '}
                  <Badge variant="outline" className="ml-1">
                    {programa.estado}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Responsable:</span> {programa.responsable.split(' ')[0]}...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Tipo de Documento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Documento
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(tiposDocumento).map(([key, doc]) => {
              const DocIcon = doc.icono;
              const isSelected = documentoSeleccionado === key;

              // Ocultar informe si no hay datos
              if (key === 'informe' && !datosInforme) return null;

              return (
                <button
                  key={key}
                  onClick={() => {
                    setDocumentoSeleccionado(key as TipoDocumento);
                    // Auto-seleccionar primer formato disponible
                    setFormatoSeleccionado(doc.formatos[0] as FormatoExportacion);
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#003DA5]' : 'bg-gray-100'
                      }`}
                    >
                      <DocIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 mb-1">{doc.titulo}</h5>
                      <p className="text-xs text-gray-600 line-clamp-2">{doc.descripcion}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{doc.paginas} págs</span>
                        <span>•</span>
                        <span>{doc.tamañoEstimado}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-[#003DA5] flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Formato de Exportación
          </label>
          <div className="flex flex-wrap gap-3">
            {docInfo.formatos.includes('pdf') && (
              <button
                onClick={() => setFormatoSeleccionado('pdf')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formatoSeleccionado === 'pdf'
                    ? 'border-[#003DA5] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">PDF</p>
                  <p className="text-xs text-gray-500">Documento portable</p>
                </div>
                {formatoSeleccionado === 'pdf' && (
                  <CheckCircle2 className="w-4 h-4 text-[#003DA5]" />
                )}
              </button>
            )}

            {docInfo.formatos.includes('excel') && (
              <button
                onClick={() => setFormatoSeleccionado('excel')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formatoSeleccionado === 'excel'
                    ? 'border-[#003DA5] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">Excel</p>
                  <p className="text-xs text-gray-500">Hoja de cálculo</p>
                </div>
                {formatoSeleccionado === 'excel' && (
                  <CheckCircle2 className="w-4 h-4 text-[#003DA5]" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Opciones de Personalización */}
        {documentoSeleccionado === 'programa-completo' && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3 text-sm">Opciones de Personalización</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirEstadisticas}
                  onChange={(e) => setIncluirEstadisticas(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                <span className="text-sm text-gray-700">Incluir estadísticas detalladas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirCronograma}
                  onChange={(e) => setIncluirCronograma(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                <span className="text-sm text-gray-700">Incluir cronograma mensual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirFirmas}
                  onChange={(e) => setIncluirFirmas(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
                <span className="text-sm text-gray-700">Incluir sección de firmas</span>
              </label>
            </div>
          </div>
        )}

        {/* Vista Previa de Contenido */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Icon className="w-6 h-6 text-[#003DA5] flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">{docInfo.titulo}</h4>
              <p className="text-sm text-gray-700 mb-3">{docInfo.descripcion}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/80 p-2 rounded">
                  <p className="text-gray-500">Páginas</p>
                  <p className="font-semibold text-gray-900">{docInfo.paginas}</p>
                </div>
                <div className="bg-white/80 p-2 rounded">
                  <p className="text-gray-500">Formato</p>
                  <p className="font-semibold text-gray-900">{formatoSeleccionado.toUpperCase()}</p>
                </div>
                <div className="bg-white/80 p-2 rounded">
                  <p className="text-gray-500">Tamaño</p>
                  <p className="font-semibold text-gray-900">{docInfo.tamañoEstimado}</p>
                </div>
                <div className="bg-white/80 p-2 rounded">
                  <p className="text-gray-500">Auditorías</p>
                  <p className="font-semibold text-gray-900">{programa.auditorias.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información Legal */}
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-gray-700">
          <p className="flex items-start gap-2">
            <span className="text-yellow-600 flex-shrink-0">⚠️</span>
            <span>
              <strong>Documento Oficial:</strong> Este documento será generado con formato institucional
              de la ESAP. Asegúrate de que toda la información sea correcta antes de exportar. Los
              documentos generados tienen validez oficial y deben ser archivados según normativa.
            </span>
          </p>
        </div>

        {/* Acciones */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={exportando}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Vista previa disponible próximamente');
              }}
              disabled={exportando}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Vista Previa
            </Button>
            <Button
              onClick={handleExportar}
              disabled={exportando}
              className="gap-2"
              style={{ backgroundColor: '#003DA5' }}
            >
              {exportando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar {formatoSeleccionado.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}

// Exportar también un botón rápido de exportación
interface BotonExportacionRapidaProps {
  programa: any;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BotonExportacionRapida({
  programa,
  variant = 'outline',
  size = 'sm',
  className = '',
}: BotonExportacionRapidaProps) {
  const [mostrarPanel, setMostrarPanel] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setMostrarPanel(true)}
        className={`gap-2 ${className}`}
      >
        <Download className="w-4 h-4" />
        Exportar
      </Button>

      <PanelExportacion
        isOpen={mostrarPanel}
        onClose={() => setMostrarPanel(false)}
        programa={programa}
      />
    </>
  );
}
