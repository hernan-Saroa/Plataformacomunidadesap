/**
 * ============================================
 * MODAL DE PREVISUALIZACIÓN DE PDF
 * ============================================
 * 
 * Permite previsualizar el PDF del Plan Anual antes de descargarlo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { 
  generarPDFPlanAnual, 
  validarDatosParaPDF 
} from '../services/pdfPlanAnual';
import {
  validarDecreto648,
  obtenerEstadisticasPlan,
  type PlanAnual
} from '../utils/validacionesDecreto648';

interface ModalPrevisualizarPDFProps {
  plan: PlanAnual;
  onCerrar: () => void;
}

export function ModalPrevisualizarPDF({ plan, onCerrar }: ModalPrevisualizarPDFProps) {
  const [generando, setGenerando] = useState(false);

  const validacion = validarDecreto648(plan);
  const validacionDatos = validarDatosParaPDF(plan);
  const stats = obtenerEstadisticasPlan(plan);

  const handleDescargar = async () => {
    if (!validacionDatos.valido) {
      toast.error('❌ No se puede generar el PDF', {
        description: validacionDatos.errores[0]
      });
      return;
    }

    setGenerando(true);

    try {
      await generarPDFPlanAnual(plan);
      
      toast.success('✅ PDF descargado', {
        description: `Plan Anual ${plan.año} descargado correctamente`
      });
      
      // Cerrar modal después de descargar
      setTimeout(() => {
        onCerrar();
      }, 1000);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('❌ Error al generar PDF', {
        description: 'Ocurrió un error. Intenta nuevamente.'
      });
    } finally {
      setGenerando(false);
    }
  };

  const handlePrevisualizar = () => {
    toast.info('🔍 Abriendo previsualización...', {
      description: 'El PDF se abrirá en una nueva pestaña'
    });
    
    // Por ahora, simplemente descargamos
    // En producción, se podría abrir en nueva pestaña con blob URL
    handleDescargar();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCerrar}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-3xl mx-4"
        >
          <Card className="p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-50">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Exportar Plan Anual
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Plan Anual de Auditoría - Vigencia {plan.año}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onCerrar}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Contenido */}
            <div className="space-y-6">
              {/* Estado del Plan */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-sm text-gray-900 mb-4">
                  Información del Documento
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Año:</span>
                    <span className="ml-2 font-semibold">{plan.año}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <Badge className="ml-2" variant="outline">
                      {plan.estado}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Versión:</span>
                    <span className="ml-2 font-semibold">v{plan.version}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Jefe OCI:</span>
                    <span className="ml-2 font-semibold">{plan.jefeOCI.nombre}</span>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.rolesConActividades}/5
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Roles</div>
                </Card>
                
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalActividades}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Actividades</div>
                </Card>
                
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.progresoGeneral}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Progreso</div>
                </Card>
                
                <Card className="p-4 text-center">
                  <div className={`text-2xl font-bold ${validacion.valido ? 'text-green-600' : 'text-red-600'}`}>
                    {validacion.valido ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Validación</div>
                </Card>
              </div>

              {/* Cumplimiento Decreto 648 */}
              <Card className={`p-4 border-2 ${validacion.valido ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center gap-3">
                  {validacion.valido ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h4 className={`font-bold ${validacion.valido ? 'text-green-900' : 'text-red-900'}`}>
                      {validacion.valido 
                        ? 'Cumple con Decreto 648/2017' 
                        : 'No cumple con Decreto 648/2017'}
                    </h4>
                    <p className={`text-sm ${validacion.valido ? 'text-green-700' : 'text-red-700'}`}>
                      {validacion.valido 
                        ? 'El plan está listo para ser exportado' 
                        : `${validacion.errores.length} error${validacion.errores.length !== 1 ? 'es' : ''} encontrado${validacion.errores.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Errores de validación de datos */}
              {!validacionDatos.valido && (
                <Card className="p-4 border-2 border-red-300 bg-red-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-900 mb-2">
                        Datos Incompletos
                      </h4>
                      <ul className="space-y-1 text-sm text-red-800">
                        {validacionDatos.errores.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Contenido del PDF */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-sm text-gray-900 mb-4">
                  El PDF incluirá:
                </h3>
                
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Header corporativo ESAP con logo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Información general del plan
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Badge de cumplimiento Decreto 648/2017
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Tabla de roles y actividades (5 roles obligatorios)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Estadísticas y progreso
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Marco normativo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Sección de firmas y aprobaciones
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Footer con paginación y fecha de generación
                  </li>
                </ul>
              </div>

              {/* Nombre del archivo */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">
                  Nombre del archivo:
                </p>
                <p className="font-mono text-sm font-semibold text-blue-900">
                  Plan_Anual_{plan.año}_{plan.estado.replace(/ /g, '_')}_v{plan.version}.pdf
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={onCerrar}
                className="flex-1"
                disabled={generando}
              >
                Cancelar
              </Button>

              {/* 
              <Button
                variant="outline"
                onClick={handlePrevisualizar}
                className="flex-1 gap-2"
                disabled={generando || !validacionDatos.valido}
              >
                <Eye className="w-4 h-4" />
                Previsualizar
              </Button>
              */}

              <Button
                onClick={handleDescargar}
                className="flex-1 gap-2"
                style={{ background: '#003DA5' }}
                disabled={generando || !validacionDatos.valido}
              >
                {generando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </>
                )}
              </Button>
            </div>

            {/* Nota */}
            <p className="text-xs text-gray-500 text-center mt-4">
              El documento PDF se generará con formato corporativo ESAP y cumplimiento del Decreto 648/2017
            </p>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
