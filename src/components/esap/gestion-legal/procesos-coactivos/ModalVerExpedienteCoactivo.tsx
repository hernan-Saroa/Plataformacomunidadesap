/**
 * ModalVerExpedienteCoactivo - Modal completo para ver expediente de proceso coactivo
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import {
  X, FileText, User, Calendar, DollarSign, Clock, Building2, AlertTriangle,
  CheckCircle, TrendingUp, History, Paperclip, Edit, Archive, RefreshCw,
  CreditCard, FileCheck, Scale, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';

interface ProcesoCoactivo {
  id: string;
  deudor: {
    tipo: 'PERSONA' | 'EMPRESA';
    nombre: string;
    documento: string;
    correo: string;
    telefono: string;
    direccion: string;
  };
  responsable: string;
  etapa: 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJUDICIAL' | 'MANDAMIENTO';
  fechaInicio: Date;
  fechaLimite: Date;
  diasRestantes: number;
  valorDeuda: number;
  valorTotal: number;
  valorPagado: number;
  ultimaActuacion: string;
  fechaUltimaActuacion: Date;
  obligaciones: {
    concepto: string;
    valor: number;
    periodo: string;
  }[];
  historialPagos: {
    fecha: Date;
    valor: number;
    concepto: string;
    comprobante: string;
  }[];
  actuaciones: {
    fecha: Date;
    tipo: string;
    descripcion: string;
    responsable: string;
  }[];
  documentos: {
    nombre: string;
    tipo: string;
    fecha: Date;
    url: string;
  }[];
}

interface ModalVerExpedienteCoactivoProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoCoactivo;
  onCambiarEtapa?: (nuevaEtapa: string) => void;
  onRegistrarPago?: () => void;
  onGenerarActo?: () => void;
}

export function ModalVerExpedienteCoactivo({
  isOpen,
  onClose,
  proceso,
  onCambiarEtapa,
  onRegistrarPago,
  onGenerarActo
}: ModalVerExpedienteCoactivoProps) {
  const [tabActiva, setTabActiva] = useState('general');

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case 'IDENTIFICADO': return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📋' };
      case 'PERSUASIVO': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' };
      case 'PREJUDICIAL': return { bg: 'bg-orange-100', text: 'text-orange-800', icon: '📢' };
      case 'MANDAMIENTO': return { bg: 'bg-red-100', text: 'text-red-800', icon: '⚖️' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📋' };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const porcentajePagado = (proceso.valorPagado / proceso.valorTotal) * 100;
  const saldoPendiente = proceso.valorTotal - proceso.valorPagado;
  const etapaInfo = getEtapaColor(proceso.etapa);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl bg-white rounded-2xl shadow-2xl z-[101] max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <ModalHeaderClean
              titulo={proceso.id}
              subtitulo={`Proceso Coactivo • ${proceso.deudor.nombre}`}
              icono={Scale}
              colorIcono="red"
              badgePrincipal={proceso.etapa}
              onClose={onClose}
            />

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">

              {/* Resumen Superior */}
              <div className="p-6 bg-gray-50 border-b">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                  {/* Etapa Actual */}
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                    <p className="text-xs text-gray-600 font-bold mb-2">Etapa Actual</p>
                    <div className={`${etapaInfo.bg} px-3 py-2 rounded-lg inline-flex items-center gap-2`}>
                      <span className="text-xl">{etapaInfo.icon}</span>
                      <span className={`text-sm font-bold ${etapaInfo.text}`}>
                        {proceso.etapa}
                      </span>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                    <p className="text-xs text-gray-600 font-bold mb-2">Valor Total</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(proceso.valorTotal)}
                    </p>
                  </div>

                  {/* Saldo Pendiente */}
                  <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                    <p className="text-xs text-gray-600 font-bold mb-2">Saldo Pendiente</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(saldoPendiente)}
                    </p>
                  </div>

                  {/* Días Restantes */}
                  <div className={`bg-white rounded-lg p-4 border-2 ${proceso.diasRestantes < 0 ? 'border-red-300' :
                      proceso.diasRestantes <= 10 ? 'border-yellow-300' :
                        'border-green-300'
                    }`}>
                    <p className="text-xs text-gray-600 font-bold mb-2">Plazo</p>
                    <p className={`text-xl font-bold ${proceso.diasRestantes < 0 ? 'text-red-600' :
                        proceso.diasRestantes <= 10 ? 'text-yellow-600' :
                          'text-green-600'
                      }`}>
                      {Math.abs(proceso.diasRestantes)} días
                    </p>
                    <p className="text-xs text-gray-500">
                      {proceso.diasRestantes < 0 ? 'Vencido' : 'Restantes'}
                    </p>
                  </div>
                </div>

                {/* Barra de Progreso de Pago */}
                <div className="mt-4 bg-white rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-900">Progreso de Pago</p>
                    <p className="text-sm font-bold text-blue-600">{porcentajePagado.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
                      style={{ width: `${porcentajePagado}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-green-600 font-bold">
                      Pagado: {formatCurrency(proceso.valorPagado)}
                    </span>
                    <span className="text-orange-600 font-bold">
                      Pendiente: {formatCurrency(saldoPendiente)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs de Información */}
              <div className="p-6">
                <Tabs value={tabActiva} onValueChange={setTabActiva}>
                  <TabsList className="grid grid-cols-5 w-full mb-6">
                    <TabsTrigger value="general">
                      <FileText className="w-4 h-4 mr-2" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="obligaciones">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Obligaciones
                    </TabsTrigger>
                    <TabsTrigger value="pagos">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagos ({proceso.historialPagos.length})
                    </TabsTrigger>
                    <TabsTrigger value="actuaciones">
                      <History className="w-4 h-4 mr-2" />
                      Actuaciones ({proceso.actuaciones.length})
                    </TabsTrigger>
                    <TabsTrigger value="documentos">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Documentos ({proceso.documentos.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB: General */}
                  <TabsContent value="general" className="space-y-6">

                    {/* Información del Deudor */}
                    <div className="bg-gray-50 rounded-lg p-5 border">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Información del Deudor
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Tipo</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {proceso.deudor.tipo === 'PERSONA' ? '👤 Persona Natural' : '🏢 Persona Jurídica'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Nombre/Razón Social</p>
                          <p className="text-sm text-gray-900 mt-1 font-semibold">{proceso.deudor.nombre}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">
                            {proceso.deudor.tipo === 'PERSONA' ? 'Cédula' : 'NIT'}
                          </p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">{proceso.deudor.documento}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Correo Electrónico</p>
                          <p className="text-sm text-blue-600 mt-1">{proceso.deudor.correo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Teléfono</p>
                          <p className="text-sm text-gray-900 mt-1">{proceso.deudor.telefono}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Dirección</p>
                          <p className="text-sm text-gray-900 mt-1">{proceso.deudor.direccion}</p>
                        </div>
                      </div>
                    </div>

                    {/* Información del Proceso */}
                    <div className="bg-gray-50 rounded-lg p-5 border">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-blue-600" />
                        Información del Proceso
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Código Proceso</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono font-bold">{proceso.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Responsable Asignado</p>
                          <p className="text-sm text-gray-900 mt-1">👤 {proceso.responsable}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Fecha Inicio</p>
                          <p className="text-sm text-gray-900 mt-1">
                            📅 {proceso.fechaInicio.toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Fecha Límite</p>
                          <p className="text-sm text-gray-900 mt-1">
                            📅 {proceso.fechaLimite.toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-600 font-bold">Última Actuación</p>
                          <p className="text-sm text-gray-900 mt-1">{proceso.ultimaActuacion}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {proceso.fechaUltimaActuacion.toLocaleDateString('es-CO')} a las {proceso.fechaUltimaActuacion.toLocaleTimeString('es-CO')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB: Obligaciones */}
                  <TabsContent value="obligaciones" className="space-y-4">
                    {proceso.obligaciones.map((obligacion, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border hover:border-blue-300 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{obligacion.concepto}</p>
                            <p className="text-xs text-gray-600 mt-1">Período: {obligacion.periodo}</p>
                          </div>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(obligacion.valor)}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-blue-900">Total Obligaciones</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(proceso.valorDeuda)}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB: Pagos */}
                  <TabsContent value="pagos" className="space-y-4">
                    {proceso.historialPagos.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border">
                        <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">No hay pagos registrados</p>
                      </div>
                    ) : (
                      proceso.historialPagos.map((pago, index) => (
                        <div key={index} className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">{pago.concepto}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                📅 {pago.fecha.toLocaleDateString('es-CO')} •
                                📄 Comprobante: {pago.comprobante}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(pago.valor)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* TAB: Actuaciones */}
                  <TabsContent value="actuaciones" className="space-y-3">
                    {proceso.actuaciones.map((actuacion, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border hover:border-blue-300 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold text-gray-900">{actuacion.tipo}</p>
                              <span className="text-xs text-gray-500">
                                {actuacion.fecha.toLocaleDateString('es-CO')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{actuacion.descripcion}</p>
                            <p className="text-xs text-gray-600 mt-2">
                              👤 {actuacion.responsable}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* TAB: Documentos */}
                  <TabsContent value="documentos" className="space-y-3">
                    {proceso.documentos.map((doc, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border hover:border-blue-300 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Paperclip className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{doc.nombre}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {doc.tipo} • {doc.fecha.toLocaleDateString('es-CO')}
                              </p>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
                            Descargar
                          </button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-white transition-all"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-2">

                <button
                  onClick={() => {
                    toast.info('Abriendo generador de actos administrativos...');
                    onGenerarActo?.();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Generar Acto
                </button>
                <button
                  onClick={() => {
                    toast.info('Abriendo cambio de etapa...');
                    onCambiarEtapa?.('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cambiar Etapa
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
