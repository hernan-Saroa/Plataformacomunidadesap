/**
 * SISTEMA DE EXPORTACIÓN
 * Módulo unificado para exportar datos a múltiples formatos
 * 
 * Formatos soportados:
 * - PDF (Informes, reportes, certificaciones)
 * - Excel (Datos tabulares, reportes, matrices)
 * - CSV (Datos para análisis externo)
 * - JSON (Backup y migración de datos)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, FileText, Table, File, Database, CheckCircle,
  Settings, Filter, Calendar, Eye, X, Loader2, AlertCircle,
  FileSpreadsheet, FileCog, FileJson, Package
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

type FormatoExportacion = 'pdf' | 'excel' | 'csv' | 'json';
type TipoDocumento = 
  | 'informe-pormenorizado'
  | 'informe-auditoria'
  | 'plan-mejoramiento'
  | 'hallazgos'
  | 'matriz-riesgos'
  | 'programa-anual'
  | 'reporte-custom';

interface ConfiguracionExportacion {
  formato: FormatoExportacion;
  tipoDocumento: TipoDocumento;
  incluirPortada: boolean;
  incluirIndice: boolean;
  incluirGraficos: boolean;
  incluirAnexos: boolean;
  orientacion: 'vertical' | 'horizontal';
  tamanoPagina: 'carta' | 'oficio' | 'a4';
  incluirFirmas: boolean;
  incluirMarcaAgua: boolean;
  rangoFechas?: {
    inicio: string;
    fin: string;
  };
  filtros?: Record<string, any>;
}

interface PlantillaExportacion {
  id: string;
  nombre: string;
  descripcion: string;
  formato: FormatoExportacion;
  tipoDocumento: TipoDocumento;
  icono: any;
  color: string;
  configuracionDefault: Partial<ConfiguracionExportacion>;
  popular: boolean;
}

// ============ PLANTILLAS PREDEFINIDAS ============

const PLANTILLAS_EXPORTACION: PlantillaExportacion[] = [
  {
    id: 'plantilla-1',
    nombre: 'Informe Pormenorizado PDF',
    descripcion: 'Formato oficial DAFP con portada, índice y firmas',
    formato: 'pdf',
    tipoDocumento: 'informe-pormenorizado',
    icono: FileText,
    color: '#8B5CF6',
    popular: true,
    configuracionDefault: {
      incluirPortada: true,
      incluirIndice: true,
      incluirGraficos: true,
      incluirFirmas: true,
      incluirMarcaAgua: true,
      orientacion: 'vertical',
      tamanoPagina: 'carta'
    }
  },
  {
    id: 'plantilla-2',
    nombre: 'Informe de Auditoría PDF',
    descripcion: 'Informe completo de auditoría con hallazgos y evidencias',
    formato: 'pdf',
    tipoDocumento: 'informe-auditoria',
    icono: FileText,
    color: '#3B82F6',
    popular: true,
    configuracionDefault: {
      incluirPortada: true,
      incluirIndice: true,
      incluirGraficos: true,
      incluirAnexos: true,
      incluirFirmas: true,
      orientacion: 'vertical',
      tamanoPagina: 'oficio'
    }
  },
  {
    id: 'plantilla-3',
    nombre: 'Plan de Mejoramiento Excel',
    descripcion: 'Tabla detallada con acciones, responsables y fechas',
    formato: 'excel',
    tipoDocumento: 'plan-mejoramiento',
    icono: FileSpreadsheet,
    color: '#10B981',
    popular: true,
    configuracionDefault: {
      incluirGraficos: true
    }
  },
  {
    id: 'plantilla-4',
    nombre: 'Matriz de Hallazgos Excel',
    descripcion: 'Hallazgos con clasificación, estado y responsables',
    formato: 'excel',
    tipoDocumento: 'hallazgos',
    icono: Table,
    color: '#F59E0B',
    popular: false,
    configuracionDefault: {
      incluirGraficos: false
    }
  },
  {
    id: 'plantilla-5',
    nombre: 'Matriz de Riesgos Excel',
    descripcion: 'Matriz con valoración de riesgos y controles',
    formato: 'excel',
    tipoDocumento: 'matriz-riesgos',
    icono: Table,
    color: '#EF4444',
    popular: false,
    configuracionDefault: {
      incluirGraficos: true
    }
  },
  {
    id: 'plantilla-6',
    nombre: 'Programa Anual PDF',
    descripcion: 'Programa Anual de Auditoría con cronograma',
    formato: 'pdf',
    tipoDocumento: 'programa-anual',
    icono: Calendar,
    color: '#6366F1',
    popular: true,
    configuracionDefault: {
      incluirPortada: true,
      incluirIndice: false,
      incluirGraficos: true,
      incluirFirmas: true,
      orientacion: 'horizontal',
      tamanoPagina: 'oficio'
    }
  },
  {
    id: 'plantilla-7',
    nombre: 'Datos CSV para Análisis',
    descripcion: 'Exportación de datos en formato CSV',
    formato: 'csv',
    tipoDocumento: 'reporte-custom',
    icono: Database,
    color: '#6B7280',
    popular: false,
    configuracionDefault: {}
  },
  {
    id: 'plantilla-8',
    nombre: 'Backup JSON Completo',
    descripcion: 'Respaldo completo de datos en JSON',
    formato: 'json',
    tipoDocumento: 'reporte-custom',
    icono: FileJson,
    color: '#EC4899',
    popular: false,
    configuracionDefault: {}
  }
];

// ============ COMPONENTES ============

function CardPlantilla({ 
  plantilla, 
  onSeleccionar 
}: { 
  plantilla: PlantillaExportacion;
  onSeleccionar: (plantilla: PlantillaExportacion) => void;
}) {
  const Icon = plantilla.icono;

  const getFormatoLabel = (formato: FormatoExportacion) => {
    const labels = {
      pdf: 'PDF',
      excel: 'Excel',
      csv: 'CSV',
      json: 'JSON'
    };
    return labels[formato];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-gray-200 hover:border-blue-500">
        <div className="flex items-start justify-between mb-3">
          <div 
            className="p-3 rounded-lg"
            style={{ background: `${plantilla.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: plantilla.color }} />
          </div>
          {plantilla.popular && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Popular
            </Badge>
          )}
        </div>

        <h4 className="font-black text-gray-900 mb-1">{plantilla.nombre}</h4>
        <p className="text-sm text-gray-600 mb-3">{plantilla.descripcion}</p>

        <div className="flex items-center justify-between">
          <Badge 
            variant="outline"
            style={{ 
              borderColor: plantilla.color,
              color: plantilla.color,
              background: `${plantilla.color}10`
            }}
          >
            {getFormatoLabel(plantilla.formato)}
          </Badge>

          <Button
            size="sm"
            onClick={() => onSeleccionar(plantilla)}
            style={{ background: plantilla.color }}
          >
            <Download className="w-3 h-3 mr-1" />
            Exportar
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function ModalConfiguracionExportacion({
  plantilla,
  onCerrar,
  onExportar
}: {
  plantilla: PlantillaExportacion;
  onCerrar: () => void;
  onExportar: (config: ConfiguracionExportacion) => void;
}) {
  const [config, setConfig] = useState<ConfiguracionExportacion>({
    formato: plantilla.formato,
    tipoDocumento: plantilla.tipoDocumento,
    incluirPortada: plantilla.configuracionDefault.incluirPortada ?? false,
    incluirIndice: plantilla.configuracionDefault.incluirIndice ?? false,
    incluirGraficos: plantilla.configuracionDefault.incluirGraficos ?? false,
    incluirAnexos: plantilla.configuracionDefault.incluirAnexos ?? false,
    incluirFirmas: plantilla.configuracionDefault.incluirFirmas ?? false,
    incluirMarcaAgua: plantilla.configuracionDefault.incluirMarcaAgua ?? false,
    orientacion: plantilla.configuracionDefault.orientacion ?? 'vertical',
    tamanoPagina: plantilla.configuracionDefault.tamanoPagina ?? 'carta'
  });

  const handleExportar = () => {
    onExportar(config);
  };

  const esPDF = plantilla.formato === 'pdf';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-lg"
              style={{ background: `${plantilla.color}20` }}
            >
              <Settings className="w-6 h-6" style={{ color: plantilla.color }} />
            </div>
            <div>
              <h3 className="font-black text-gray-900">{plantilla.nombre}</h3>
              <p className="text-sm text-gray-600">Configurar opciones de exportación</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Rango de Fechas */}
          <div>
            <label className="block font-bold text-gray-900 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Rango de Fechas
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    rangoFechas: { ...prev.rangoFechas!, inicio: e.target.value }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    rangoFechas: { ...prev.rangoFechas!, fin: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Opciones PDF */}
          {esPDF && (
            <>
              <div>
                <label className="block font-bold text-gray-900 mb-3">
                  Contenido del Documento
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirPortada}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirPortada: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir portada oficial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirIndice}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirIndice: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir índice o tabla de contenidos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirGraficos}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirGraficos: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir gráficos y visualizaciones</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirAnexos}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirAnexos: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir anexos y documentos de soporte</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirFirmas}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirFirmas: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir espacios para firmas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirMarcaAgua}
                      onChange={(e) => setConfig(prev => ({ ...prev, incluirMarcaAgua: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Incluir marca de agua institucional</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-900 mb-2">
                    Orientación
                  </label>
                  <select
                    value={config.orientacion}
                    onChange={(e) => setConfig(prev => ({ ...prev, orientacion: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vertical">Vertical (Portrait)</option>
                    <option value="horizontal">Horizontal (Landscape)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-2">
                    Tamaño de Página
                  </label>
                  <select
                    value={config.tamanoPagina}
                    onChange={(e) => setConfig(prev => ({ ...prev, tamanoPagina: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="carta">Carta (8.5" x 11")</option>
                    <option value="oficio">Oficio (8.5" x 13")</option>
                    <option value="a4">A4 (210mm x 297mm)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Opciones Excel */}
          {plantilla.formato === 'excel' && (
            <div>
              <label className="block font-bold text-gray-900 mb-3">
                Opciones de Excel
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.incluirGraficos}
                    onChange={(e) => setConfig(prev => ({ ...prev, incluirGraficos: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Incluir gráficos y tablas dinámicas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Aplicar formato y estilos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Incluir filtros automáticos</span>
                </label>
              </div>
            </div>
          )}

          {/* Vista Previa de Configuración */}
          <Card className="p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-blue-900 mb-2">Vista Previa de Configuración</p>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Formato: <span className="font-bold">{plantilla.formato.toUpperCase()}</span></p>
                  <p>• Tipo: <span className="font-bold">{plantilla.tipoDocumento}</span></p>
                  {esPDF && (
                    <>
                      <p>• Orientación: <span className="font-bold">{config.orientacion}</span></p>
                      <p>• Tamaño: <span className="font-bold">{config.tamanoPagina}</span></p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={handleExportar}
            style={{ background: plantilla.color }}
          >
            <Download className="w-4 h-4 mr-1" />
            Exportar Ahora
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function SistemaExportacion() {
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaExportacion | null>(null);
  const [exportando, setExportando] = useState(false);
  const [filtroFormato, setFiltroFormato] = useState<FormatoExportacion | 'todos'>('todos');

  const plantillasFiltradas = PLANTILLAS_EXPORTACION.filter(p => 
    filtroFormato === 'todos' || p.formato === filtroFormato
  );

  const handleSeleccionarPlantilla = (plantilla: PlantillaExportacion) => {
    setPlantillaSeleccionada(plantilla);
  };

  const handleExportar = async (config: ConfiguracionExportacion) => {
    setExportando(true);
    setPlantillaSeleccionada(null);

    // Simular exportación
    await new Promise(resolve => setTimeout(resolve, 2000));

    setExportando(false);
    
    toast.success('Exportación completada', {
      description: `Documento ${config.formato.toUpperCase()} generado exitosamente`
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Sistema de Exportación
          </h2>
          <p className="text-gray-600">
            Exporta informes y datos en múltiples formatos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filtroFormato}
            onChange={(e) => setFiltroFormato(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          >
            <option value="todos">Todos los formatos</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <FileText className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-black text-purple-900">
            {PLANTILLAS_EXPORTACION.filter(p => p.formato === 'pdf').length}
          </p>
          <p className="text-sm text-purple-700">Plantillas PDF</p>
        </Card>

        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <FileSpreadsheet className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-black text-green-900">
            {PLANTILLAS_EXPORTACION.filter(p => p.formato === 'excel').length}
          </p>
          <p className="text-sm text-green-700">Plantillas Excel</p>
        </Card>

        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <Package className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-black text-blue-900">
            {PLANTILLAS_EXPORTACION.filter(p => p.popular).length}
          </p>
          <p className="text-sm text-blue-700">Más Populares</p>
        </Card>

        <Card className="p-4 border-2 border-gray-200 bg-gray-50">
          <Download className="w-6 h-6 text-gray-600 mb-2" />
          <p className="text-2xl font-black text-gray-900">324</p>
          <p className="text-sm text-gray-700">Exportaciones este mes</p>
        </Card>
      </div>

      {/* PLANTILLAS POPULARES */}
      <div>
        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          Plantillas Más Usadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANTILLAS_EXPORTACION.filter(p => p.popular).map(plantilla => (
            <CardPlantilla
              key={plantilla.id}
              plantilla={plantilla}
              onSeleccionar={handleSeleccionarPlantilla}
            />
          ))}
        </div>
      </div>

      {/* TODAS LAS PLANTILLAS */}
      <div>
        <h3 className="font-black text-gray-900 mb-4">
          Todas las Plantillas ({plantillasFiltradas.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillasFiltradas.map(plantilla => (
            <CardPlantilla
              key={plantilla.id}
              plantilla={plantilla}
              onSeleccionar={handleSeleccionarPlantilla}
            />
          ))}
        </div>
      </div>

      {/* MODAL DE CONFIGURACIÓN */}
      <AnimatePresence>
        {plantillaSeleccionada && (
          <ModalConfiguracionExportacion
            plantilla={plantillaSeleccionada}
            onCerrar={() => setPlantillaSeleccionada(null)}
            onExportar={handleExportar}
          />
        )}
      </AnimatePresence>

      {/* INDICADOR DE EXPORTACIÓN */}
      <AnimatePresence>
        {exportando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <Card className="p-8 max-w-md">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="font-black text-gray-900 mb-2">Generando documento...</h3>
                <p className="text-sm text-gray-600">
                  Por favor espera mientras se procesa la exportación
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SistemaExportacion;
