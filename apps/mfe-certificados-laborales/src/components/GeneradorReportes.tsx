import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  Loader2,
  Eye,
  Settings,
  FileSpreadsheet,
  File,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  generarYDescargarReporte,
  descargarReporteCSV,
  generarReporteExcel,
  descargarPDF,
  generarVistaPreviaHTML,
  type DatosReporte,
  type ConfiguracionPDF
} from '@/lib/pdf/reportesPDF';

export function GeneradorReportes() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

  const [configuracion, setConfiguracion] = useState<Partial<ConfiguracionPDF>>({
    titulo: 'Reporte de Validaciones de Certificados Laborales',
    incluirPortada: true,
    incluirResumenEjecutivo: true,
    incluirTablaDetallada: true,
    incluirGraficas: true,
    incluirRecomendaciones: true,
    formato: 'A4',
    orientacion: 'portrait',
    logo: true
  });

  const [filtros, setFiltros] = useState({
    fechaInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    resultado: 'TODOS',
    metodo: 'TODOS',
    formato: 'PDF'
  });

  const handleGenerarReporte = async () => {
    setIsGenerating(true);

    try {
      // Simular obtención de datos
      const datosReporte: DatosReporte = {
        tipo: 'HISTORICO',
        periodo: {
          inicio: filtros.fechaInicio,
          fin: filtros.fechaFin
        },
        filtros: {
          resultado: filtros.resultado !== 'TODOS' ? filtros.resultado : undefined,
          metodo: filtros.metodo !== 'TODOS' ? filtros.metodo : undefined
        },
        estadisticas: {
          total: 392,
          validos: 327,
          invalidos: 35,
          vencidos: 20,
          anulados: 10,
          tiempoPromedio: 258
        },
        validaciones: [
          // Mock data
          {
            id: 'VAL-001',
            fechaHora: '2025-11-25T14:30:25',
            qrCode: 'ESAP-CERT-2025-ABC123',
            resultado: 'VALIDO',
            certificado: {
              consecutivo: '001-2025-TH',
              empleado: 'María Fernanda Rodríguez López',
              documento: '52.345.678'
            },
            origen: {
              ip: '190.85.123.45',
              ubicacion: 'Bogotá, Colombia',
              dispositivo: 'Desktop',
              navegador: 'Chrome 120.0'
            },
            metodo: 'WEB',
            duracion: 245
          }
        ],
        graficas: {
          incluirGraficaTendencias: configuracion.incluirGraficas || false,
          incluirGraficaDistribucion: configuracion.incluirGraficas || false,
          incluirGraficaUbicaciones: configuracion.incluirGraficas || false
        }
      };

      toast.loading('Generando reporte...', { id: 'gen-reporte' });

      switch (filtros.formato) {
        case 'PDF':
          await generarYDescargarReporte(datosReporte, configuracion);
          toast.success('Reporte PDF descargado exitosamente', { id: 'gen-reporte' });
          break;

        case 'CSV':
          descargarReporteCSV(datosReporte.validaciones || []);
          toast.success('Reporte CSV descargado exitosamente', { id: 'gen-reporte' });
          break;

        case 'EXCEL':
          const excelBlob = await generarReporteExcel(datosReporte.validaciones || []);
          descargarPDF(excelBlob, `Reporte_Validaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
          toast.success('Reporte Excel descargado exitosamente', { id: 'gen-reporte' });
          break;

        default:
          throw new Error('Formato no soportado');
      }

    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar el reporte', { id: 'gen-reporte' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVistaPrevia = () => {
    const datosReporte: DatosReporte = {
      tipo: 'HISTORICO',
      periodo: {
        inicio: filtros.fechaInicio,
        fin: filtros.fechaFin
      },
      estadisticas: {
        total: 392,
        validos: 327,
        invalidos: 35,
        vencidos: 20,
        anulados: 10,
        tiempoPromedio: 258
      }
    };

    const html = generarVistaPreviaHTML(datosReporte);
    setPreviewHTML(html);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6 md:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
              }}
            >
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                Generador de Reportes
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Crea reportes personalizados del histórico de validaciones
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Panel de Configuración */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="p-4 sm:p-6 border-2">
              <div className="space-y-4 sm:space-y-6">
                {/* Periodo */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#003DA5]" />
                    Período del Reporte
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="fechaInicio" className="text-xs sm:text-sm">Fecha Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={filtros.fechaInicio}
                        onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                        className="mt-2 min-h-[48px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaFin" className="text-xs sm:text-sm">Fecha Fin</Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={filtros.fechaFin}
                        onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                        className="mt-2 min-h-[48px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#003DA5]" />
                    Filtros
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="resultado">Resultado</Label>
                      <Select value={filtros.resultado} onValueChange={(value) => setFiltros({ ...filtros, resultado: value })}>
                        <SelectTrigger id="resultado" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODOS">Todos</SelectItem>
                          <SelectItem value="VALIDO">Válidos</SelectItem>
                          <SelectItem value="INVALIDO">Inválidos</SelectItem>
                          <SelectItem value="VENCIDO">Vencidos</SelectItem>
                          <SelectItem value="ANULADO">Anulados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="metodo">Método</Label>
                      <Select value={filtros.metodo} onValueChange={(value) => setFiltros({ ...filtros, metodo: value })}>
                        <SelectTrigger id="metodo" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODOS">Todos</SelectItem>
                          <SelectItem value="WEB">Web</SelectItem>
                          <SelectItem value="API">API</SelectItem>
                          <SelectItem value="MOBILE">Mobile</SelectItem>
                          <SelectItem value="QR_SCANNER">QR Scanner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Configuración */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#003DA5]" />
                    Configuración
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="portada"
                        checked={configuracion.incluirPortada}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, incluirPortada: checked as boolean })
                        }
                      />
                      <label htmlFor="portada" className="text-sm text-gray-700 cursor-pointer">
                        Incluir portada
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="resumen"
                        checked={configuracion.incluirResumenEjecutivo}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, incluirResumenEjecutivo: checked as boolean })
                        }
                      />
                      <label htmlFor="resumen" className="text-sm text-gray-700 cursor-pointer">
                        Incluir resumen ejecutivo
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tabla"
                        checked={configuracion.incluirTablaDetallada}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, incluirTablaDetallada: checked as boolean })
                        }
                      />
                      <label htmlFor="tabla" className="text-sm text-gray-700 cursor-pointer">
                        Incluir tabla detallada
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="graficas"
                        checked={configuracion.incluirGraficas}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, incluirGraficas: checked as boolean })
                        }
                      />
                      <label htmlFor="graficas" className="text-sm text-gray-700 cursor-pointer">
                        Incluir gráficas
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recomendaciones"
                        checked={configuracion.incluirRecomendaciones}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, incluirRecomendaciones: checked as boolean })
                        }
                      />
                      <label htmlFor="recomendaciones" className="text-sm text-gray-700 cursor-pointer">
                        Incluir recomendaciones
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="logo"
                        checked={configuracion.logo}
                        onCheckedChange={(checked) => 
                          setConfiguracion({ ...configuracion, logo: checked as boolean })
                        }
                      />
                      <label htmlFor="logo" className="text-sm text-gray-700 cursor-pointer">
                        Incluir logo ESAP
                      </label>
                    </div>
                  </div>
                </div>

                {/* Formato y Orientación */}
                <div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="formato-papel">Formato de Papel</Label>
                      <Select 
                        value={configuracion.formato} 
                        onValueChange={(value: any) => setConfiguracion({ ...configuracion, formato: value })}
                      >
                        <SelectTrigger id="formato-papel" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="LETTER">Letter</SelectItem>
                          <SelectItem value="LEGAL">Legal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="orientacion">Orientación</Label>
                      <Select 
                        value={configuracion.orientacion} 
                        onValueChange={(value: any) => setConfiguracion({ ...configuracion, orientacion: value })}
                      >
                        <SelectTrigger id="orientacion" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Vertical</SelectItem>
                          <SelectItem value="landscape">Horizontal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Panel de Acciones */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Formato de Salida */}
            <Card className="p-6 border-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Formato de Salida
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setFiltros({ ...filtros, formato: 'PDF' })}
                  className={`w-full p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                    filtros.formato === 'PDF'
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-300 hover:border-[#003DA5]'
                  }`}
                >
                  <File className={`w-6 h-6 ${filtros.formato === 'PDF' ? 'text-[#003DA5]' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">PDF</p>
                    <p className="text-xs text-gray-600">Reporte completo con gráficas</p>
                  </div>
                  {filtros.formato === 'PDF' && <CheckCircle className="w-5 h-5 text-[#003DA5] ml-auto" />}
                </button>

                <button
                  onClick={() => setFiltros({ ...filtros, formato: 'CSV' })}
                  className={`w-full p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                    filtros.formato === 'CSV'
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-300 hover:border-[#003DA5]'
                  }`}
                >
                  <FileText className={`w-6 h-6 ${filtros.formato === 'CSV' ? 'text-[#003DA5]' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">CSV</p>
                    <p className="text-xs text-gray-600">Tabla de datos para Excel</p>
                  </div>
                  {filtros.formato === 'CSV' && <CheckCircle className="w-5 h-5 text-[#003DA5] ml-auto" />}
                </button>

                <button
                  onClick={() => setFiltros({ ...filtros, formato: 'EXCEL' })}
                  className={`w-full p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                    filtros.formato === 'EXCEL'
                      ? 'border-[#003DA5] bg-blue-50'
                      : 'border-gray-300 hover:border-[#003DA5]'
                  }`}
                >
                  <FileSpreadsheet className={`w-6 h-6 ${filtros.formato === 'EXCEL' ? 'text-[#003DA5]' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Excel</p>
                    <p className="text-xs text-gray-600">Archivo XLSX con formato</p>
                  </div>
                  {filtros.formato === 'EXCEL' && <CheckCircle className="w-5 h-5 text-[#003DA5] ml-auto" />}
                </button>
              </div>
            </Card>

            {/* Acciones */}
            <Card className="p-6 border-2">
              <div className="space-y-3">
                <Button
                  onClick={handleVistaPrevia}
                  variant="outline"
                  className="w-full"
                  disabled={isGenerating}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>

                <Button
                  onClick={handleGenerarReporte}
                  disabled={isGenerating}
                  className="w-full bg-[#003DA5] hover:bg-[#002873]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar y Descargar
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Info */}
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> Los reportes PDF incluyen gráficas interactivas y análisis detallado. Para análisis de datos, usa formato CSV o Excel.
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Modal de Vista Previa */}
        <AnimatePresence>
          {showPreview && (
            <div className="fixed inset-0 z-[9999] overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowPreview(false)}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed inset-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="bg-[#003DA5] px-6 py-4 flex items-center justify-between">
                  <h2 className="text-white text-xl font-bold">Vista Previa del Reporte</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-white hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <iframe
                    srcDoc={previewHTML}
                    className="w-full h-full border-0"
                    title="Vista Previa del Reporte"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}