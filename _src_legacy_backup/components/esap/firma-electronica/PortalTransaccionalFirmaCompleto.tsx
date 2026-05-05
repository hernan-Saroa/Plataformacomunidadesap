/**
 * PortalTransaccionalFirmaCompleto - Portal de Firma Individual
 * Vista personalizada para FIRMANTE INDIVIDUAL: solo documentos asignados a este usuario
 * El firmante solo ve documentos que le corresponden firmar, no todos los documentos del sistema
 * Para administración completa de documentos, usar el Módulo de Firma Electrónica en el Backoffice
 * 
 * DISEÑO: Coherente con Portal Transaccional - Estilo limpio y profesional
 */

import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  FileText, Clock, CheckCircle, Search, Download, X,
  Eye, XCircle, User, AlertCircle, Bell, MessageSquare,
  History, Calendar, Filter, ChevronDown, Info, FileCheck,
  AlertTriangle, PenTool, FileClock
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ModalAccesoCodigoDocumento } from './ModalAccesoCodigoDocumento';
import { VisorDocumentoFirmaOTP } from './VisorDocumentoFirmaOTP';
import { ModalDevolucionDocumento } from './ModalDevolucionDocumento';

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  remitente: string;
  cargoRemitente: string;
  fechaRecibido: string;
  fechaLimite?: string;
  fechaFirmado?: string;
  fechaDevuelto?: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'visto' | 'firmado' | 'devuelto' | 'en-proceso';
  requiereCodigoAcceso: boolean;
  codigoAcceso?: string;
  tamano: string;
  paginas: number;
  descripcion: string;
  // Para documentos con múltiples firmantes
  firmasRequeridas?: number;
  firmasCompletadas?: number;
  firmantes?: Array<{
    nombre: string;
    estado: 'pendiente' | 'firmado';
    fecha?: string;
  }>;
  // Para devueltos
  motivoDevolucion?: string;
  comentariosDevolucion?: string;
}

export function PortalTransaccionalFirmaCompleto() {
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'historial'>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [mostrarModalAcceso, setMostrarModalAcceso] = useState(false);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const [mostrarModalDevolucion, setMostrarModalDevolucion] = useState(false);
  const [accesoValidado, setAccesoValidado] = useState(false);
  const [detalleExpandido, setDetalleExpandido] = useState<string | null>(null);

  // Usuario actual
  const usuarioActual = {
    nombre: 'Juan Carlos Pérez',
    email: 'funcionario@esap.edu.co',
    cargo: 'Coordinador Académico',
    tipo: 'Administrativo'
  };

  // Base de datos completa de TODOS los documentos (simulada)
  const [todosLosDocumentos, setTodosLosDocumentos] = useState<Documento[]>([
    // 1 Pendiente
    {
      id: 'DOC-2024-001',
      nombre: 'Contrato de Prestación de Servicios 2024',
      tipo: 'Contrato',
      remitente: 'María González',
      cargoRemitente: 'Directora Administrativa',
      fechaRecibido: '23/12/2024',
      fechaLimite: '30/12/2024',
      prioridad: 'alta',
      estado: 'pendiente',
      requiereCodigoAcceso: true,
      codigoAcceso: '7483',
      tamano: '2.4 MB',
      paginas: 12,
      descripcion: 'Contrato para servicios profesionales del primer trimestre 2024.'
    },
    // 1 Visto
    {
      id: 'DOC-2024-002',
      nombre: 'Acta de Reunión Comité Académico',
      tipo: 'Acta',
      remitente: 'Carlos Mendoza',
      cargoRemitente: 'Secretario Académico',
      fechaRecibido: '20/12/2024',
      fechaLimite: '27/12/2024',
      prioridad: 'media',
      estado: 'visto',
      requiereCodigoAcceso: true,
      codigoAcceso: '3291',
      tamano: '1.2 MB',
      paginas: 8,
      descripcion: 'Acta de reunión del comité académico.'
    },
    // 1 Firmado
    {
      id: 'DOC-2024-015',
      nombre: 'Certificado de Asistencia Evento',
      tipo: 'Certificado',
      remitente: 'Ana Martínez',
      cargoRemitente: 'Directora General',
      fechaRecibido: '15/12/2024',
      fechaFirmado: '16/12/2024',
      prioridad: 'baja',
      estado: 'firmado',
      requiereCodigoAcceso: true,
      codigoAcceso: '1234',
      tamano: '0.8 MB',
      paginas: 2,
      descripcion: 'Certificado de asistencia al evento institucional.'
    },
    // 1 En Proceso
    {
      id: 'DOC-2024-010',
      nombre: 'Convenio Interinstitucional',
      tipo: 'Convenio',
      remitente: 'Luis Fernández',
      cargoRemitente: 'Director de Relaciones',
      fechaRecibido: '18/12/2024',
      fechaLimite: '28/12/2024',
      prioridad: 'alta',
      estado: 'en-proceso',
      requiereCodigoAcceso: true,
      codigoAcceso: '8765',
      tamano: '3.5 MB',
      paginas: 18,
      descripcion: 'Convenio de cooperación académica.',
      firmasRequeridas: 3,
      firmasCompletadas: 1,
      firmantes: [
        { nombre: 'Juan Carlos Pérez', estado: 'firmado', fecha: '19/12/2024' },
        { nombre: 'Ana Martínez', estado: 'pendiente' },
        { nombre: 'Carlos Mendoza', estado: 'pendiente' }
      ]
    },
    // 1 Devuelto
    {
      id: 'DOC-2024-005',
      nombre: 'Resolución de Presupuesto 2025',
      tipo: 'Resolución',
      remitente: 'Sandra López',
      cargoRemitente: 'Coordinadora Financiera',
      fechaRecibido: '12/12/2024',
      fechaDevuelto: '14/12/2024',
      prioridad: 'alta',
      estado: 'devuelto',
      requiereCodigoAcceso: true,
      tamano: '2.1 MB',
      paginas: 10,
      descripcion: 'Propuesta de resolución de presupuesto.',
      motivoDevolucion: 'Información incompleta',
      comentariosDevolucion: 'Faltan anexos y firmas previas requeridas.'
    }
  ]);

  // Calcular estadísticas
  const estadisticas = {
    total: todosLosDocumentos.length,
    pendientes: todosLosDocumentos.filter(d => d.estado === 'pendiente' || d.estado === 'visto').length,
    firmados: todosLosDocumentos.filter(d => d.estado === 'firmado').length,
    enProceso: todosLosDocumentos.filter(d => d.estado === 'en-proceso').length,
    devueltos: todosLosDocumentos.filter(d => d.estado === 'devuelto').length
  };

  // Filtrar por tab
  const documentosPorTab = tabActiva === 'pendientes'
    ? todosLosDocumentos.filter(d => d.estado === 'pendiente' || d.estado === 'visto')
    : todosLosDocumentos;

  // Aplicar filtros
  const documentosFiltrados = documentosPorTab.filter(doc => {
    const cumpleBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.id.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.remitente.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todos' || doc.estado === filtroEstado;
    const cumpleTipo = filtroTipo === 'todos' || doc.tipo === filtroTipo;
    
    return cumpleBusqueda && cumpleEstado && cumpleTipo;
  });

  // Handlers
  const handleAbrirDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    
    // Actualizar estado a "visto" si es la primera vez que se abre (solo pendientes)
    if (doc.estado === 'pendiente') {
      const docsActualizados = todosLosDocumentos.map(d =>
        d.id === doc.id ? { ...d, estado: 'visto' as const } : d
      );
      setTodosLosDocumentos(docsActualizados);
      setDocumentoSeleccionado({ ...doc, estado: 'visto' as const });
      
      toast.info('👁️ Documento marcado como visto', {
        description: 'El remitente será notificado',
        duration: 2000
      });
    }
    
    if (doc.estado === 'firmado') {
      // Solo ver, no firmar
      toast.info('✅ Documento firmado', {
        description: 'Este documento ya ha sido firmado por ti. Modo de solo lectura.',
        duration: 2500
      });
      setMostrarVisor(true);
    } else if (doc.estado === 'devuelto') {
      // Solo ver documento devuelto
      toast.info('↩️ Documento devuelto', {
        description: 'Este documento fue devuelto al remitente. Modo de solo lectura.',
        duration: 2500
      });
      setMostrarVisor(true);
    } else if (doc.estado === 'en-proceso') {
      // Documento en proceso de firmas múltiples
      toast.info('⏳ Documento en proceso', {
        description: 'Esperando firmas de otros firmantes. Puedes revisar el documento.',
        duration: 2500
      });
      setMostrarVisor(true);
    } else if (doc.requiereCodigoAcceso && !accesoValidado) {
      // Requiere código de acceso
      toast.info('🔒 Código de acceso requerido', {
        description: 'Este documento requiere un código de acceso para abrirlo',
        duration: 2000
      });
      setMostrarModalAcceso(true);
    } else {
      // Abrir para firmar
      setMostrarVisor(true);
    }
  };

  const handleVerDetalle = (docId: string) => {
    setDetalleExpandido(detalleExpandido === docId ? null : docId);
    
    // Feedback visual
    if (detalleExpandido !== docId) {
      toast.info('📋 Mostrando detalles', {
        description: 'Información completa del documento',
        duration: 1500
      });
    }
  };

  const handleDescargarCertificado = (doc: Documento) => {
    toast.success('📥 Descargando certificado', {
      description: `Certificado de firma: ${doc.id}`,
      duration: 3000
    });
    console.log('📥 Descargando certificado:', doc.id);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { text: 'Pendiente', color: 'bg-orange-100 text-orange-700', icon: Clock };
      case 'visto': return { text: 'Visto', color: 'bg-blue-100 text-blue-700', icon: Eye };
      case 'firmado': return { text: 'Firmado', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'devuelto': return { text: 'Devuelto', color: 'bg-purple-100 text-purple-700', icon: XCircle };
      case 'en-proceso': return { text: 'En Proceso', color: 'bg-cyan-100 text-cyan-700', icon: FileClock };
      default: return { text: estado, color: 'bg-gray-100 text-gray-700', icon: FileText };
    }
  };

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return { text: 'Alta', color: 'bg-red-50 text-red-700 border border-red-200' };
      case 'media': return { text: 'Media', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
      case 'baja': return { text: 'Baja', color: 'bg-green-50 text-green-700 border border-green-200' };
      default: return { text: prioridad, color: 'bg-gray-50 text-gray-700 border border-gray-200' };
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header con título y descripción */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Documentos por Firmar</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Firma electrónica de documentos institucionales</p>
        </div>
      </div>

      {/* Mensaje informativo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base font-semibold text-blue-900">Vista Individual de Firmante</p>
              <p className="text-xs md:text-sm text-blue-700 mt-1">
                Solo puedes ver los documentos que han sido asignados específicamente a ti para firma. 
                Para gestión completa de documentos y administración del flujo de firmas, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Diseño limpio y RESPONSIVE */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="border border-gray-200 hover:border-gray-300 transition-all cursor-pointer">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Asignados a mí</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setTabActiva('pendientes');
            setFiltroEstado('todos');
          }}
          className="border border-orange-200 hover:border-orange-300 transition-all cursor-pointer bg-orange-50/30"
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-orange-600 truncate">Por firmar</p>
                <p className="text-xl md:text-2xl font-bold text-orange-700">{estadisticas.pendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setTabActiva('historial');
            setFiltroEstado('firmado');
          }}
          className="border border-green-200 hover:border-green-300 transition-all cursor-pointer bg-green-50/30"
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-green-600 truncate">Firmados</p>
                <p className="text-xl md:text-2xl font-bold text-green-700">{estadisticas.firmados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setTabActiva('historial');
            setFiltroEstado('en-proceso');
          }}
          className="border border-cyan-200 hover:border-cyan-300 transition-all cursor-pointer bg-cyan-50/30"
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <FileClock className="w-4 h-4 md:w-5 md:h-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-cyan-600 truncate">En Proceso</p>
                <p className="text-xl md:text-2xl font-bold text-cyan-700">{estadisticas.enProceso}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setTabActiva('historial');
            setFiltroEstado('devuelto');
          }}
          className="border border-purple-200 hover:border-purple-300 transition-all cursor-pointer bg-purple-50/30 col-span-2 md:col-span-1"
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-purple-600 truncate">Devueltos</p>
                <p className="text-xl md:text-2xl font-bold text-purple-700">{estadisticas.devueltos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Diseño limpio y RESPONSIVE */}
      <div className="flex gap-1 md:gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setTabActiva('pendientes')}
          className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-semibold transition-all relative whitespace-nowrap ${ 
            tabActiva === 'pendientes'
              ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />
          <span className="hidden sm:inline">Mis Pendientes ({estadisticas.pendientes})</span>
          <span className="sm:hidden">Pendientes ({estadisticas.pendientes})</span>
        </button>
        <button
          onClick={() => setTabActiva('historial')}
          className={`px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-semibold transition-all relative whitespace-nowrap ${ 
            tabActiva === 'historial'
              ? 'text-[#1e5da8] border-b-2 border-[#1e5da8]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <History className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />
          <span className="hidden sm:inline">Mi Historial ({estadisticas.total})</span>
          <span className="sm:hidden">Historial ({estadisticas.total})</span>
        </button>
      </div>

      {/* Filtros y búsqueda - RESPONSIVE */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar documentos..."
            className="pl-9 md:pl-10 border-gray-300 text-sm md:text-base"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-sm md:text-base font-medium text-gray-700 bg-white hover:border-gray-400 transition-colors"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="visto">Vistos</option>
          <option value="firmado">Firmados</option>
          <option value="en-proceso">En Proceso</option>
          <option value="devuelto">Devueltos</option>
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-sm md:text-base font-medium text-gray-700 bg-white hover:border-gray-400 transition-colors"
        >
          <option value="todos">Todos los tipos</option>
          <option value="Contrato">Contratos</option>
          <option value="Acta">Actas</option>
          <option value="Resolución">Resoluciones</option>
          <option value="Convenio">Convenios</option>
          <option value="Certificado">Certificados</option>
          <option value="Plan">Planes</option>
        </select>
      </div>

      {/* Alerta Pendientes */}
      {tabActiva === 'pendientes' && estadisticas.pendientes > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900">
                  Tienes {estadisticas.pendientes} documento{estadisticas.pendientes !== 1 ? 's' : ''} asignado{estadisticas.pendientes !== 1 ? 's' : ''} a ti que requiere{estadisticas.pendientes !== 1 ? 'n' : ''} firma
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Por favor revisa y firma los documentos a la mayor brevedad posible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos - Diseño limpio estilo Portal */}
      <div className="space-y-3">
        {documentosFiltrados.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No se encontraron documentos</p>
              <p className="text-sm text-gray-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          documentosFiltrados.map((doc) => {
            const estadoBadge = getEstadoBadge(doc.estado);
            const prioridadBadge = getPrioridadBadge(doc.prioridad);
            const expandido = detalleExpandido === doc.id;
            const EstadoIcon = estadoBadge.icon;

            return (
              <Card
                key={doc.id}
                className="border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    {/* Icono del documento - Oculto en móvil muy pequeño */}
                    <div className="hidden sm:block flex-shrink-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                        doc.estado === 'firmado' ? 'bg-green-100' :
                        doc.estado === 'devuelto' ? 'bg-purple-100' :
                        doc.estado === 'en-proceso' ? 'bg-cyan-100' :
                        doc.estado === 'visto' ? 'bg-blue-100' :
                        'bg-orange-100'
                      }`}>
                        <FileText className={`w-5 h-5 md:w-6 md:h-6 ${
                          doc.estado === 'firmado' ? 'text-green-600' :
                          doc.estado === 'devuelto' ? 'text-purple-600' :
                          doc.estado === 'en-proceso' ? 'text-cyan-600' :
                          doc.estado === 'visto' ? 'text-blue-600' :
                          'text-orange-600'
                        }`} />
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 md:gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1 line-clamp-2">{doc.nombre}</h3>
                          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {doc.tipo}
                            </Badge>
                            <Badge className={`${estadoBadge.color} text-xs`}>
                              <EstadoIcon className="w-3 h-3 mr-1" />
                              {estadoBadge.text}
                            </Badge>
                            <Badge className={`${prioridadBadge.color} text-xs`}>
                              {prioridadBadge.text}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Metadatos - RESPONSIVE */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-1.5 md:gap-y-2 text-xs md:text-sm mb-3">
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-600">
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="font-medium">Remitente:</span>
                          <span className="truncate">{doc.remitente}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-600">
                          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="font-medium">Recibido:</span>
                          <span>{doc.fechaRecibido}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 text-gray-600">
                          <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="font-medium">ID:</span>
                          <span className="font-mono text-xs">{doc.id}</span>
                        </div>
                        {doc.fechaLimite && (
                          <div className="flex items-center gap-1.5 md:gap-2 text-orange-600">
                            <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="font-medium">Límite:</span>
                            <span className="font-semibold">{doc.fechaLimite}</span>
                          </div>
                        )}
                        {doc.fechaFirmado && (
                          <div className="flex items-center gap-1.5 md:gap-2 text-green-600">
                            <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="font-medium">Firmado:</span>
                            <span>{doc.fechaFirmado}</span>
                          </div>
                        )}
                      </div>

                      {/* Proceso de firmas múltiples */}
                      {doc.firmantes && doc.firmantes.length > 0 && (
                        <div className="mb-3 p-2.5 md:p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                          <p className="text-xs md:text-sm font-semibold text-cyan-900 mb-1.5 md:mb-2">
                            Proceso de firmas: {doc.firmasCompletadas}/{doc.firmasRequeridas} firmantes
                          </p>
                          <div className="space-y-1">
                            {doc.firmantes.map((firmante, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 md:gap-2 text-xs">
                                {firmante.estado === 'firmado' ? (
                                  <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Clock className="w-3 h-3 text-orange-600 flex-shrink-0" />
                                )}
                                <span className={`truncate ${firmante.estado === 'firmado' ? 'text-green-700' : 'text-orange-700'}`}>
                                  {firmante.nombre}
                                </span>
                                {firmante.fecha && (
                                  <span className="text-gray-500 flex-shrink-0">- {firmante.fecha}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documento devuelto */}
                      {doc.estado === 'devuelto' && doc.motivoDevolucion && (
                        <div className="mb-3 p-2.5 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs md:text-sm font-semibold text-purple-900 mb-1">
                            Motivo de devolución: {doc.motivoDevolucion}
                          </p>
                          {doc.comentariosDevolucion && (
                            <p className="text-xs text-purple-700 whitespace-pre-line">
                              {doc.comentariosDevolucion}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Acciones - RESPONSIVE */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {doc.estado === 'pendiente' || doc.estado === 'visto' ? (
                          <Button
                            onClick={() => handleAbrirDocumento(doc)}
                            className="bg-[#1e5da8] hover:bg-[#1557a0] text-white w-full sm:w-auto"
                            size="sm"
                          >
                            <PenTool className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Ver y Firmar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAbrirDocumento(doc)}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Ver Documento
                          </Button>
                        )}
                        
                        {doc.estado === 'firmado' && (
                          <Button
                            onClick={() => handleDescargarCertificado(doc)}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Certificado
                          </Button>
                        )}

                        <Button
                          onClick={() => handleVerDetalle(doc.id)}
                          variant="ghost"
                          size="sm"
                          className="w-full sm:w-auto text-xs md:text-sm"
                        >
                          {expandido ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
                              Menos detalles
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 rotate-180" />
                              Más detalles
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Detalles expandidos - RESPONSIVE */}
                      {expandido && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Descripción:</p>
                              <p className="text-gray-600">{doc.descripcion}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Información del archivo:</p>
                              <p className="text-gray-600">Tamaño: {doc.tamano}</p>
                              <p className="text-gray-600">Páginas: {doc.paginas}</p>
                              <p className="text-gray-600">Cargo remitente: {doc.cargoRemitente}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modales */}
      {mostrarModalAcceso && documentoSeleccionado && (
        <ModalAccesoCodigoDocumento
          isOpen={mostrarModalAcceso}
          documento={documentoSeleccionado}
          onClose={() => {
            setMostrarModalAcceso(false);
            setDocumentoSeleccionado(null);
          }}
          onCodigoValidado={() => {
            setMostrarModalAcceso(false);
            setAccesoValidado(true);
            setMostrarVisor(true);
          }}
        />
      )}

      {mostrarVisor && documentoSeleccionado && (
        <VisorDocumentoFirmaOTP
          isOpen={mostrarVisor}
          documento={{
            ...documentoSeleccionado,
            tamaño: documentoSeleccionado.tamano,
            fechaCarga: documentoSeleccionado.fechaRecibido,
            firmantes: [{
              nombre: usuarioActual.nombre,
              email: usuarioActual.email,
              cargo: usuarioActual.cargo
            }]
          }}
          onClose={() => {
            setMostrarVisor(false);
            setDocumentoSeleccionado(null);
            setAccesoValidado(false);
          }}
          onDocumentoFirmado={(docId) => {
            console.log('Firmando documento:', docId);
            // Aquí iría la lógica de firma
            const docsActualizados = todosLosDocumentos.map(d =>
              d.id === docId
                ? { ...d, estado: 'firmado' as const, fechaFirmado: new Date().toLocaleDateString('es-CO') }
                : d
            );
            setTodosLosDocumentos(docsActualizados);
            setMostrarVisor(false);
            setDocumentoSeleccionado(null);
            setAccesoValidado(false);
            toast.success('✅ Documento firmado exitosamente', {
              description: `${documentoSeleccionado.nombre} ha sido firmado correctamente`
            });
          }}
          onDevolver={() => {
            setMostrarVisor(false);
            setMostrarModalDevolucion(true);
          }}
          modoPortalTransaccional={true}
        />
      )}

      {mostrarModalDevolucion && documentoSeleccionado && (
        <ModalDevolucionDocumento
          documento={documentoSeleccionado}
          onClose={() => {
            setMostrarModalDevolucion(false);
            setDocumentoSeleccionado(null);
            setAccesoValidado(false);
          }}
          onDevolver={(motivo, comentarios) => {
            console.log('Devolviendo documento:', documentoSeleccionado.id, motivo, comentarios);
            const docsActualizados = todosLosDocumentos.map(d =>
              d.id === documentoSeleccionado.id
                ? { 
                    ...d, 
                    estado: 'devuelto' as const, 
                    fechaDevuelto: new Date().toLocaleDateString('es-CO'),
                    motivoDevolucion: motivo,
                    comentariosDevolucion: comentarios
                  }
                : d
            );
            setTodosLosDocumentos(docsActualizados);
            setMostrarModalDevolucion(false);
            setDocumentoSeleccionado(null);
            setAccesoValidado(false);
            toast.success('↩️ Documento devuelto', {
              description: `${documentoSeleccionado.nombre} ha sido devuelto al remitente`
            });
          }}
        />
      )}
    </div>
  );
}