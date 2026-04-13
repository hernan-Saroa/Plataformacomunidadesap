/**
 * ProcesosCoactivosView - Vista completa del módulo de Procesos Coactivos
 * Incluye vista Kanban con todas las funcionalidades reales
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, DollarSign, Calendar, User, Eye, CreditCard, MessageSquare, Scale, Download, FileText, RefreshCw, Folder, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ModalVerExpedienteCoactivo } from './procesos-coactivos/ModalVerExpedienteCoactivo';
import { ModalGestionarPagos } from './procesos-coactivos/ModalGestionarPagos';
import { ModalGenerarActoAdministrativo } from './procesos-coactivos/ModalGenerarActoAdministrativo';
import { ModalCambiarEtapaCoactivo } from './procesos-coactivos/ModalCambiarEtapaCoactivo';
import { ModalCrearProcesoCoactivo } from './procesos-coactivos/ModalCrearProcesoCoactivo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@esap-mfe/shared-ui/dropdown-menu';

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
  etapa: 'PERSUASIVA' | 'COACTIVA' | 'MEDIDAS_CAUTELARES' | 'EXCEPCIONES' | 'LIQUIDACION';
  fechaInicio: Date;
  fechaLimite: Date;
  diasRestantes: number;
  capital: number;
  intereses: number;
  costas: number;
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
  fechaEjecutoria?: Date;
}

export function ProcesosCoactivosView() {
  const [busqueda, setBusqueda] = useState('');
  const [modalExpediente, setModalExpediente] = useState(false);
  const [modalPagos, setModalPagos] = useState(false);
  const [modalActo, setModalActo] = useState(false);
  const [modalCambiarEtapa, setModalCambiarEtapa] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoCoactivo | null>(null);

  // Datos de ejemplo - En producción vendrían de la API - REDUCIDO
  const [procesos, setProcesos] = useState<ProcesoCoactivo[]>([
    {
      id: 'PC-2025-001',
      deudor: {
        tipo: 'PERSONA',
        nombre: 'Juan Carlos Pérez Gómez',
        documento: '1234567890',
        correo: 'juan.perez@email.com',
        telefono: '3001234567',
        direccion: 'Calle 123 # 45-67, Bogotá'
      },
      responsable: 'Dra. Laura Sánchez',
      etapa: 'PERSUASIVA',
      fechaInicio: new Date('2025-01-15'),
      fechaLimite: new Date('2025-03-15'),
      diasRestantes: 45,
      capital: 5000000,
      intereses: 500000,
      costas: 550000,
      valorTotal: 6050000,
      valorPagado: 0,
      ultimaActuacion: 'Proceso en etapa PERSUASIVA',
      fechaUltimaActuacion: new Date('2025-01-15'),
      obligaciones: [
        { concepto: 'Matrícula 2024-2', valor: 3500000, periodo: '2024-2' }
      ],
      historialPagos: [],
      actuaciones: [
        {
          fecha: new Date('2025-01-15'),
          tipo: 'CREACIÓN',
          descripcion: 'Proceso coactivo iniciado',
          responsable: 'Sistema SIGL'
        }
      ],
      documentos: [
        {
          nombre: 'Título Ejecutivo.pdf',
          tipo: 'PDF',
          fecha: new Date('2025-01-15'),
          url: '#'
        }
      ],
      fechaEjecutoria: new Date('2021-05-15')
    }
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case 'PERSUASIVA': return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' };
      case 'COACTIVA': return { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' };
      case 'MEDIDAS_CAUTELARES': return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' };
      case 'EXCEPCIONES': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
      case 'LIQUIDACION': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
    }
  };

  const abrirExpediente = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalExpediente(true);
  };

  const abrirGestionPagos = (proceso: ProcesoCoactivo) => {
    setProcesoSeleccionado(proceso);
    setModalPagos(true);
  };

  const abrirComentarios = (proceso: ProcesoCoactivo) => {
    toast.info('💬 Módulo de comentarios en desarrollo');
  };

  const handleCrearProceso = (nuevoProceso: any) => {
    setProcesos([...procesos, nuevoProceso]);
    toast.success('Proceso creado y agregado a la lista');
  };

  const handleRegistrarPago = (pago: any) => {
    toast.success('Pago registrado en el sistema');
    // Actualizar el proceso con el nuevo pago
    if (procesoSeleccionado) {
      const procesosActualizados = procesos.map(p => {
        if (p.id === procesoSeleccionado.id) {
          return {
            ...p,
            valorPagado: p.valorPagado + pago.valor,
            historialPagos: [
              ...p.historialPagos,
              {
                fecha: pago.fecha,
                valor: pago.valor,
                concepto: pago.tipo === 'ACUERDO' ? 'Acuerdo de pago registrado' : 'Pago registrado',
                comprobante: pago.comprobante
              }
            ]
          };
        }
        return p;
      });
      setProcesos(procesosActualizados);
    }
    setModalPagos(false);
  };

  const handleGenerarActo = (acto: any) => {
    toast.success('Acto administrativo generado');
    setModalActo(false);
  };

  const handleCambiarEtapa = (nuevaEtapa: string, justificacion: string) => {
    if (procesoSeleccionado) {
      const procesosActualizados = procesos.map(p => {
        if (p.id === procesoSeleccionado.id) {
          return {
            ...p,
            etapa: nuevaEtapa as any,
            actuaciones: [
              ...p.actuaciones,
              {
                fecha: new Date(),
                tipo: 'CAMBIO_ETAPA',
                descripcion: `Cambio de etapa a ${nuevaEtapa}: ${justificacion}`,
                responsable: p.responsable
              }
            ]
          };
        }
        return p;
      });
      setProcesos(procesosActualizados);
    }
    setModalCambiarEtapa(false);
  };

  // Filtrar procesos por búsqueda
  const procesosFiltrados = procesos.filter(p =>
    p.id.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.deudor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.deudor.documento.includes(busqueda)
  );

  // Agrupar por etapa
  const procesosPorEtapa = {
    PERSUASIVA: procesosFiltrados.filter(p => p.etapa === 'PERSUASIVA'),
    COACTIVA: procesosFiltrados.filter(p => p.etapa === 'COACTIVA'),
    MEDIDAS_CAUTELARES: procesosFiltrados.filter(p => p.etapa === 'MEDIDAS_CAUTELARES'),
    EXCEPCIONES: procesosFiltrados.filter(p => p.etapa === 'EXCEPCIONES'),
    LIQUIDACION: procesosFiltrados.filter(p => p.etapa === 'LIQUIDACION')
  };

  const etapas = [
    { key: 'PERSUASIVA', label: 'Persuasiva', icon: '⚠️', count: procesosPorEtapa.PERSUASIVA.length },
    { key: 'COACTIVA', label: 'Coactiva', icon: '⚖️', count: procesosPorEtapa.COACTIVA.length },
    { key: 'MEDIDAS_CAUTELARES', label: 'Med. Cautelares', icon: '🔒', count: procesosPorEtapa.MEDIDAS_CAUTELARES.length },
    { key: 'EXCEPCIONES', label: 'Excepciones', icon: '🛡️', count: procesosPorEtapa.EXCEPCIONES.length },
    { key: 'LIQUIDACION', label: 'Liquidación', icon: '💰', count: procesosPorEtapa.LIQUIDACION.length }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-7 h-7 text-red-600" />
              Procesos Coactivos
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestión completa de procesos de cobro coactivo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => setModalCrear(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proceso
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por ID, nombre o documento del deudor..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-red-500 outline-none"
            />
          </div>
          <button className="px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Vista Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full">
          {etapas.map((etapa) => {
            const procesosEtapa = procesosPorEtapa[etapa.key as keyof typeof procesosPorEtapa];
            const colorEtapa = getEtapaColor(etapa.key);

            return (
              <div key={etapa.key} className="flex-shrink-0 w-80 flex flex-col">
                {/* Header de columna */}
                <div className={`${colorEtapa.bg} ${colorEtapa.border} border-2 rounded-t-lg px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{etapa.icon}</span>
                      <div>
                        <h3 className={`font-bold ${colorEtapa.text}`}>
                          {etapa.label}
                        </h3>
                        <p className="text-xs text-gray-600">{etapa.count} procesos</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de procesos */}
                <div className="flex-1 bg-gray-100 border-x-2 border-b-2 border-gray-300 rounded-b-lg p-3 overflow-y-auto space-y-3">
                  {procesosEtapa.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Sin procesos en esta etapa
                    </div>
                  ) : (
                    procesosEtapa.map((proceso) => {
                      const saldoPendiente = proceso.valorTotal - proceso.valorPagado;
                      const porcentajePagado = (proceso.valorPagado / proceso.valorTotal) * 100;

                      // Calculo de Prescripción (5 años = 1825 días)
                      const diasDesdeEjecutoria = proceso.fechaEjecutoria
                        ? Math.max(0, Math.floor((new Date().getTime() - proceso.fechaEjecutoria.getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;
                      const diasParaPrescripcion = 1825 - diasDesdeEjecutoria;
                      const prescripcionEnRiesgo = proceso.fechaEjecutoria && diasParaPrescripcion <= 180;

                      return (
                        <div
                          key={proceso.id}
                          className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer"
                        >
                          {/* Header de tarjeta */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold text-blue-600">
                                  {proceso.id}
                                </p>
                                {proceso.fechaEjecutoria && prescripcionEnRiesgo && (
                                  <span title={`Riesgo de prescripción: ${diasParaPrescripcion} días restantes`}>
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-bold text-gray-900">
                                {proceso.deudor.tipo === 'PERSONA' ? '👤' : '🏢'} {proceso.deudor.nombre}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                📄 {proceso.deudor.documento}
                              </p>
                            </div>

                            {/* Menú de tres puntos */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => abrirExpediente(proceso)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Expediente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  toast.info(`📁 ${proceso.documentos.length} documentos en el expediente`);
                                }}>
                                  <Folder className="w-4 h-4 mr-2" />
                                  Documentos ({proceso.documentos.length})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => abrirGestionPagos(proceso)}>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Registrar Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setProcesoSeleccionado(proceso);
                                  setModalCambiarEtapa(true);
                                }}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Cambiar Etapa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setProcesoSeleccionado(proceso);
                                  setModalActo(true);
                                }}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Generar Acto
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => abrirComentarios(proceso)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Comentarios
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Responsable */}
                          <div className="mb-3 pb-3 border-b">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <User className="w-3 h-3" />
                              <span>👤 {proceso.responsable}</span>
                            </div>
                          </div>

                          {/* Información financiera */}
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">💰 Valor Total:</span>
                              <span className="font-bold text-gray-900">
                                {formatCurrency(proceso.valorTotal)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">✅ Pagado:</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(proceso.valorPagado)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">⏳ Pendiente:</span>
                              <span className="font-bold text-orange-600">
                                {formatCurrency(saldoPendiente)}
                              </span>
                            </div>

                            {/* Barra de progreso */}
                            {proceso.valorPagado > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Progreso</span>
                                  <span className="text-xs font-bold text-blue-600">
                                    {porcentajePagado.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${porcentajePagado}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Última actuación */}
                          <div className={`px-3 py-2 rounded-lg text-xs mb-3 ${proceso.diasRestantes < 0
                            ? 'bg-red-50 border border-red-200 text-red-700'
                            : proceso.diasRestantes <= 10
                              ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                              : 'bg-green-50 border border-green-200 text-green-700'
                            }`}>
                            <p className="font-bold">• {proceso.ultimaActuacion}</p>
                            <p className="mt-1">
                              📅 {proceso.fechaUltimaActuacion.toLocaleDateString('es-CO')}
                            </p>
                          </div>

                          {/* Botón de acción principal */}
                          <button
                            onClick={() => abrirExpediente(proceso)}
                            className="w-full px-3 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Expediente Completo
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modales */}
      {procesoSeleccionado && (
        <>
          <ModalVerExpedienteCoactivo
            isOpen={modalExpediente}
            onClose={() => setModalExpediente(false)}
            proceso={procesoSeleccionado}
            onCambiarEtapa={() => {
              setModalExpediente(false);
              setModalCambiarEtapa(true);
            }}
            onRegistrarPago={() => {
              setModalExpediente(false);
              setModalPagos(true);
            }}
            onGenerarActo={() => {
              setModalExpediente(false);
              setModalActo(true);
            }}
          />

          <ModalGestionarPagos
            isOpen={modalPagos}
            onClose={() => setModalPagos(false)}
            proceso={{
              id: procesoSeleccionado.id,
              deudor: procesoSeleccionado.deudor.nombre,
              valorTotal: procesoSeleccionado.valorTotal,
              valorPagado: procesoSeleccionado.valorPagado
            }}
            onRegistrarPago={handleRegistrarPago}
          />

          <ModalGenerarActoAdministrativo
            isOpen={modalActo}
            onClose={() => setModalActo(false)}
            proceso={{
              id: procesoSeleccionado.id,
              deudor: procesoSeleccionado.deudor.nombre,
              capital: procesoSeleccionado.capital,
              intereses: procesoSeleccionado.intereses,
              costas: procesoSeleccionado.costas,
              valorTotal: procesoSeleccionado.valorTotal,
              etapa: procesoSeleccionado.etapa
            }}
            onGenerar={handleGenerarActo}
          />

          <ModalCambiarEtapaCoactivo
            isOpen={modalCambiarEtapa}
            onClose={() => setModalCambiarEtapa(false)}
            proceso={{
              id: procesoSeleccionado.id,
              deudor: procesoSeleccionado.deudor.nombre,
              etapaActual: procesoSeleccionado.etapa
            }}
            onCambiarEtapa={handleCambiarEtapa}
          />
        </>
      )}

      <ModalCrearProcesoCoactivo
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onCrear={handleCrearProceso}
      />
    </div>
  );
}