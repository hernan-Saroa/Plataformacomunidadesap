/**
 * Exportador de Reportes - PDF y Excel
 * Sistema completo de generación y descarga de reportes
 */

import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Check,
  Loader2,
  Calendar,
  Filter,
  Settings,
  X,
  Eye,
  Printer,
  Share2,
  Mail,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface OpcionExportacion {
  id: string;
  nombre: string;
  descripcion: string;
  icon: any;
  formato: 'pdf' | 'excel' | 'csv';
  color: string;
  disponible: boolean;
}

interface ConfiguracionReporte {
  titulo: string;
  incluirGraficos: boolean;
  incluirTablas: boolean;
  incluirResumen: boolean;
  periodo: string;
  filtros: string[];
  orientacion: 'vertical' | 'horizontal';
  tamanoPagina: 'letter' | 'a4' | 'legal';
}

interface ExportadorReportesProps {
  /** Datos a exportar */
  datos?: any[];
  /** Tipo de reporte */
  tipoReporte: string;
  /** Título del reporte */
  titulo?: string;
  /** Mostrar modal */
  show: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al exportar */
  onExport?: (formato: string, config: ConfiguracionReporte) => void;
}

export function ExportadorReportes({
  datos = [],
  tipoReporte,
  titulo = 'Reporte ESAP',
  show,
  onClose,
  onExport
}: ExportadorReportesProps) {
  const [formatoSeleccionado, setFormatoSeleccionado] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const [configuracion, setConfiguracion] = useState<ConfiguracionReporte>({
    titulo: titulo,
    incluirGraficos: true,
    incluirTablas: true,
    incluirResumen: true,
    periodo: 'mes-actual',
    filtros: [],
    orientacion: 'vertical',
    tamanoPagina: 'letter'
  });

  const opcionesExportacion: OpcionExportacion[] = [
    {
      id: 'pdf',
      nombre: 'PDF',
      descripcion: 'Documento portable con gráficos y tablas',
      icon: FileText,
      formato: 'pdf',
      color: 'from-red-500 to-red-600',
      disponible: true
    },
    {
      id: 'excel',
      nombre: 'Excel',
      descripcion: 'Hoja de cálculo con datos procesables',
      icon: FileSpreadsheet,
      formato: 'excel',
      color: 'from-green-500 to-green-600',
      disponible: true
    },
    {
      id: 'csv',
      nombre: 'CSV',
      descripcion: 'Valores separados por comas (datos puros)',
      icon: FileText,
      formato: 'csv',
      color: 'from-blue-500 to-blue-600',
      disponible: true
    }
  ];

  const generarNombreArchivo = (): string => {
    const fecha = new Date().toISOString().split('T')[0];
    const extension = formatoSeleccionado === 'excel' ? 'xlsx' : formatoSeleccionado;
    return `${tipoReporte}_${fecha}.${extension}`;
  };

  const simularGeneracion = (): Promise<void> => {
    return new Promise((resolve) => {
      let progreso = 0;
      const interval = setInterval(() => {
        progreso += Math.random() * 25;
        
        if (progreso >= 100) {
          progreso = 100;
          clearInterval(interval);
          setProgreso(100);
          
          setTimeout(() => {
            resolve();
          }, 500);
        } else {
          setProgreso(progreso);
        }
      }, 300);
    });
  };

  const generarPDF = async () => {
    // Simulación de generación de PDF
    const contenido = `
===========================================
${configuracion.titulo.toUpperCase()}
===========================================

Fecha de generación: ${new Date().toLocaleDateString('es-CO')}
Tipo de reporte: ${tipoReporte}
Registros: ${datos.length}

-------------------------------------------
CONFIGURACIÓN
-------------------------------------------
- Gráficos: ${configuracion.incluirGraficos ? 'Sí' : 'No'}
- Tablas: ${configuracion.incluirTablas ? 'Sí' : 'No'}
- Resumen: ${configuracion.incluirResumen ? 'Sí' : 'No'}
- Período: ${configuracion.periodo}
- Orientación: ${configuracion.orientacion}
- Tamaño: ${configuracion.tamanoPagina}

-------------------------------------------
RESUMEN DE DATOS
-------------------------------------------
Total de registros procesados: ${datos.length}

${configuracion.incluirResumen ? `
Estadísticas principales:
• Promedio: [Calculado]
• Máximo: [Calculado]
• Mínimo: [Calculado]
` : ''}

-------------------------------------------
DATOS DETALLADOS
-------------------------------------------
${datos.slice(0, 10).map((item, idx) => `${idx + 1}. ${JSON.stringify(item)}`).join('\n')}
${datos.length > 10 ? `\n... y ${datos.length - 10} registros más` : ''}

-------------------------------------------
ESAP - Escuela Superior de Administración Pública
Generado por: Backoffice Administrativo
===========================================
    `;

    const blob = new Blob([contenido], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generarNombreArchivo();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generarExcel = async () => {
    // Simulación de generación de Excel (CSV compatible)
    let csv = '';
    
    // Header
    csv += `${configuracion.titulo}\n`;
    csv += `Fecha,${new Date().toLocaleDateString('es-CO')}\n`;
    csv += `Tipo,${tipoReporte}\n`;
    csv += `\n`;

    if (datos.length > 0) {
      // Columnas
      const columnas = Object.keys(datos[0]);
      csv += columnas.join(',') + '\n';
      
      // Datos
      datos.forEach(item => {
        const valores = columnas.map(col => {
          const valor = item[col];
          // Escapar comas y comillas
          if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
            return `"${valor.replace(/"/g, '""')}"`;
          }
          return valor;
        });
        csv += valores.join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generarNombreArchivo();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generarCSV = async () => {
    await generarExcel(); // CSV usa la misma lógica
  };

  const handleExportar = async () => {
    setGenerando(true);
    setProgreso(0);

    try {
      // Simular generación
      await simularGeneracion();

      // Generar archivo según formato
      if (formatoSeleccionado === 'pdf') {
        await generarPDF();
      } else if (formatoSeleccionado === 'excel') {
        await generarExcel();
      } else if (formatoSeleccionado === 'csv') {
        await generarCSV();
      }

      toast.success(`Reporte ${formatoSeleccionado.toUpperCase()} generado correctamente`);
      
      // Callback
      if (onExport) {
        onExport(formatoSeleccionado, configuracion);
      }

      // Cerrar después de un momento
      setTimeout(() => {
        onClose();
        setGenerando(false);
        setProgreso(0);
      }, 1000);

    } catch (error) {
      toast.error('Error al generar el reporte');
      setGenerando(false);
      setProgreso(0);
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-1">Exportar Reporte</h2>
                  <p className="text-blue-100">{titulo}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            {/* Selección de Formato */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4">Selecciona el formato</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {opcionesExportacion.map((opcion) => {
                  const Icon = opcion.icon;
                  const seleccionado = formatoSeleccionado === opcion.formato;

                  return (
                    <button
                      key={opcion.id}
                      onClick={() => setFormatoSeleccionado(opcion.formato)}
                      disabled={!opcion.disponible}
                      className={`relative p-5 rounded-xl border-2 transition-all ${
                        seleccionado
                          ? 'border-[#003DA5] bg-blue-50 shadow-lg scale-105'
                          : opcion.disponible
                          ? 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {seleccionado && (
                        <div className="absolute -top-2 -right-2 p-1.5 bg-green-500 rounded-full">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`inline-flex p-3 bg-gradient-to-br ${opcion.color} rounded-xl mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <h4 className="font-black text-gray-900 mb-1">{opcion.nombre}</h4>
                      <p className="text-sm text-gray-600">{opcion.descripcion}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opciones Avanzadas */}
            <div>
              <button
                onClick={() => setMostrarOpciones(!mostrarOpciones)}
                className="flex items-center gap-2 text-[#003DA5] font-bold hover:underline"
              >
                <Settings className="w-4 h-4" />
                {mostrarOpciones ? 'Ocultar' : 'Mostrar'} opciones avanzadas
              </button>

              <AnimatePresence>
                {mostrarOpciones && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-4"
                  >
                    {/* Título del Reporte */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Título del Reporte
                      </label>
                      <input
                        type="text"
                        value={configuracion.titulo}
                        onChange={(e) => setConfiguracion({ ...configuracion, titulo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      />
                    </div>

                    {/* Período */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Período
                      </label>
                      <select
                        value={configuracion.periodo}
                        onChange={(e) => setConfiguracion({ ...configuracion, periodo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      >
                        <option value="hoy">Hoy</option>
                        <option value="semana-actual">Esta Semana</option>
                        <option value="mes-actual">Este Mes</option>
                        <option value="trimestre-actual">Este Trimestre</option>
                        <option value="año-actual">Este Año</option>
                      </select>
                    </div>

                    {/* Opciones PDF */}
                    {formatoSeleccionado === 'pdf' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Orientación
                          </label>
                          <select
                            value={configuracion.orientacion}
                            onChange={(e) => setConfiguracion({ ...configuracion, orientacion: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                          >
                            <option value="vertical">Vertical</option>
                            <option value="horizontal">Horizontal</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Tamaño de Página
                          </label>
                          <select
                            value={configuracion.tamanoPagina}
                            onChange={(e) => setConfiguracion({ ...configuracion, tamanoPagina: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                          >
                            <option value="letter">Letter</option>
                            <option value="a4">A4</option>
                            <option value="legal">Legal</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Checkboxes */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configuracion.incluirGraficos}
                          onChange={(e) => setConfiguracion({ ...configuracion, incluirGraficos: e.target.checked })}
                          className="w-4 h-4 text-[#003DA5] rounded focus:ring-[#003DA5]"
                        />
                        <span className="text-sm font-semibold text-gray-700">Incluir gráficos y visualizaciones</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configuracion.incluirTablas}
                          onChange={(e) => setConfiguracion({ ...configuracion, incluirTablas: e.target.checked })}
                          className="w-4 h-4 text-[#003DA5] rounded focus:ring-[#003DA5]"
                        />
                        <span className="text-sm font-semibold text-gray-700">Incluir tablas de datos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configuracion.incluirResumen}
                          onChange={(e) => setConfiguracion({ ...configuracion, incluirResumen: e.target.checked })}
                          className="w-4 h-4 text-[#003DA5] rounded focus:ring-[#003DA5]"
                        />
                        <span className="text-sm font-semibold text-gray-700">Incluir resumen ejecutivo</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Información del Reporte */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-900 mb-3">Información del Reporte</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Formato:</span>
                  <span className="ml-2 font-bold text-gray-900">{formatoSeleccionado.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Registros:</span>
                  <span className="ml-2 font-bold text-gray-900">{datos.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fecha:</span>
                  <span className="ml-2 font-bold text-gray-900">{new Date().toLocaleDateString('es-CO')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Archivo:</span>
                  <span className="ml-2 font-bold text-gray-900 truncate">{generarNombreArchivo()}</span>
                </div>
              </div>
            </div>

            {/* Progreso */}
            {generando && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">Generando reporte...</span>
                  <span className="font-bold text-[#003DA5]">{Math.round(progreso)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-[#003DA5] to-[#0052CC] transition-all duration-300"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                disabled={generando}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportar}
                disabled={generando}
                className="px-6 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exportar {formatoSeleccionado.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
