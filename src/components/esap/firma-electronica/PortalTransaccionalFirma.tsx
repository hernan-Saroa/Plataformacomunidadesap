/**
 * PortalTransaccionalFirma - Portal de Usuario para Firma de Documentos
 * Vista para administrativos, docentes y estudiantes
 */

import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  FileText, Clock, CheckCircle, Search, Filter, Download,
  Eye, PenTool, XCircle, Calendar, User, AlertCircle, Bell,
  Mail, ArrowLeft, MessageSquare, Send, History, FileCheck,
  TrendingUp, BarChart3, Archive, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { ModalAccesoCodigoDocumento } from './ModalAccesoCodigoDocumento';
import { VisorDocumentoFirmaOTP } from './VisorDocumentoFirmaOTP';
import { ModalDevolucionDocumento } from './ModalDevolucionDocumento';
import { ModalHistorialDocumento } from './ModalHistorialDocumento';

interface DocumentoPendiente {
  id: string;
  nombre: string;
  tipo: string;
  remitente: string;
  cargoRemitente: string;
  fechaRecibido: string;
  fechaLimite: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'visto' | 'firmado' | 'devuelto';
  requiereCodigoAcceso: boolean;
  codigoAcceso?: string; // Simulado para desarrollo
  tamano: string;
  paginas: number;
  descripcion: string;
}

export function PortalTransaccionalFirma() {
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'historial'>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoPendiente | null>(null);
  const [mostrarModalAcceso, setMostrarModalAcceso] = useState(false);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const [mostrarModalDevolucion, setMostrarModalDevolucion] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [accesoValidado, setAccesoValidado] = useState(false);

  // Usuario actual (simulado)
  const usuarioActual = {
    nombre: 'Juan Carlos Pérez',
    email: 'funcionario@esap.edu.co',
    cargo: 'Coordinador Académico',
    tipo: 'Administrativo',
    foto: null
  };

  // Documentos pendientes de firma (simulados)
  const [documentosPendientes, setDocumentosPendientes] = useState<DocumentoPendiente[]>([
    {
      id: 'DOC-2024-001',
      nombre: 'Contrato de Prestación de Servicios Profesionales 2024',
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
      descripcion: 'Contrato para servicios profesionales del primer trimestre 2024. Requiere revisión y firma urgente.'
    },
    {
      id: 'DOC-2024-002',
      nombre: 'Acta de Reunión Comité Académico - Noviembre 2024',
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
      descripcion: 'Acta de la última reunión del comité académico con decisiones importantes.'
    },
    {
      id: 'DOC-2024-003',
      nombre: 'Resolución de Aprobación Curricular 2025',
      tipo: 'Resolución',
      remitente: 'Ana Martínez',
      cargoRemitente: 'Directora General',
      fechaRecibido: '18/12/2024',
      fechaLimite: '31/12/2024',
      prioridad: 'media',
      estado: 'pendiente',
      requiereCodigoAcceso: true,
      codigoAcceso: '9156',
      tamano: '3.1 MB',
      paginas: 15,
      descripcion: 'Resolución para aprobación del nuevo plan curricular 2025.'
    }
  ]);

  // Estadísticas
  const estadisticas = {
    total: documentosPendientes.length,
    pendientes: documentosPendientes.filter(d => d.estado === 'pendiente').length,
    vistos: documentosPendientes.filter(d => d.estado === 'visto').length,
    firmados: documentosPendientes.filter(d => d.estado === 'firmado').length,
    devueltos: documentosPendientes.filter(d => d.estado === 'devuelto').length
  };

  // Filtrar documentos
  const documentosFiltrados = documentosPendientes.filter(doc => {
    const cumpleBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.id.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.remitente.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todos' || doc.estado === filtroEstado;
    
    return cumpleBusqueda && cumpleEstado;
  });

  // Handlers
  const handleAbrirDocumento = (doc: DocumentoPendiente) => {
    setDocumentoSeleccionado(doc);
    if (doc.requiereCodigoAcceso && !accesoValidado) {
      setMostrarModalAcceso(true);
    } else {
      setMostrarVisor(true);
    }
  };

  const handleCodigoValidado = () => {
    setAccesoValidado(true);
    setMostrarModalAcceso(false);
    setMostrarVisor(true);
  };

  const handleFirmar = () => {
    // Aquí se abre el visor en modo firma
    setMostrarVisor(true);
  };

  const handleDevolver = () => {
    setMostrarVisor(false);
    setMostrarModalDevolucion(true);
  };

  const handleDevolucionEnviada = (comentarios: string) => {
    if (documentoSeleccionado) {
      // Actualizar estado del documento
      setDocumentosPendientes(prev =>
        prev.map(d =>
          d.id === documentoSeleccionado.id
            ? { ...d, estado: 'devuelto' as const }
            : d
        )
      );
      setMostrarModalDevolucion(false);
      setDocumentoSeleccionado(null);
    }
  };

  const handleFirmaCompletada = () => {
    if (documentoSeleccionado) {
      // Actualizar estado del documento
      setDocumentosPendientes(prev =>
        prev.map(d =>
          d.id === documentoSeleccionado.id
            ? { ...d, estado: 'firmado' as const }
            : d
        )
      );
      setMostrarVisor(false);
      setDocumentoSeleccionado(null);
      setAccesoValidado(false);
    }
  };

  // Función auxiliar para obtener color de prioridad
  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-700 border-red-300';
      case 'media': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'baja': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Función auxiliar para obtener badge de estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { text: '⏰ Pendiente', color: 'bg-orange-100 text-orange-700' };
      case 'visto': return { text: '👁️ Visto', color: 'bg-blue-100 text-blue-700' };
      case 'firmado': return { text: '✅ Firmado', color: 'bg-green-100 text-green-700' };
      case 'devuelto': return { text: '↩️ Devuelto', color: 'bg-purple-100 text-purple-700' };
      default: return { text: estado, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Portal Transaccional</h1>
                <p className="text-blue-100 mt-1">Documentos Pendientes de Firma</p>
              </div>
            </div>

            {/* Perfil Usuario */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold">{usuarioActual.nombre}</p>
                <p className="text-sm text-blue-100">{usuarioActual.email}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-black">
                {usuarioActual.nombre.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{estadisticas.total}</p>
                  <p className="text-xs text-blue-100">Total</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/80">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{estadisticas.pendientes}</p>
                  <p className="text-xs text-blue-100">Pendientes</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/80">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{estadisticas.vistos}</p>
                  <p className="text-xs text-blue-100">Vistos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/80">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{estadisticas.firmados}</p>
                  <p className="text-xs text-blue-100">Firmados</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/80">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{estadisticas.devueltos}</p>
                  <p className="text-xs text-blue-100">Devueltos</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Barra de Búsqueda y Filtros */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por documento, ID o remitente..."
              className="pl-10 h-12 text-base border-2"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 h-12 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 bg-white"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="visto">Vistos</option>
            <option value="firmado">Firmados</option>
            <option value="devuelto">Devueltos</option>
          </select>
        </div>

        {/* Alertas */}
        {estadisticas.pendientes > 0 && (
          <Card className="p-4 mb-6 bg-orange-50 border-2 border-orange-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-bold text-orange-900">
                  Tienes {estadisticas.pendientes} documento{estadisticas.pendientes !== 1 ? 's' : ''} pendiente{estadisticas.pendientes !== 1 ? 's' : ''} de firma
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Por favor revisa y firma los documentos a la mayor brevedad posible.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Lista de Documentos */}
        <div className="space-y-4">
          {documentosFiltrados.map((doc) => {
            const estadoBadge = getEstadoBadge(doc.estado);
            const diasRestantes = Math.ceil((new Date(doc.fechaLimite.split('/').reverse().join('-')).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const urgente = diasRestantes <= 3 && doc.estado === 'pendiente';

            return (
              <Card
                key={doc.id}
                className={`p-5 border-2 transition-all hover:shadow-lg ${
                  urgente ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex gap-5">
                  {/* Icono */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center ${
                    doc.estado === 'firmado' ? 'bg-green-100' :
                    doc.estado === 'devuelto' ? 'bg-purple-100' :
                    doc.estado === 'visto' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <FileText className={`w-8 h-8 ${
                      doc.estado === 'firmado' ? 'text-green-600' :
                      doc.estado === 'devuelto' ? 'text-purple-600' :
                      doc.estado === 'visto' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-lg text-gray-900">{doc.nombre}</h3>
                          {urgente && (
                            <Badge className="bg-red-100 text-red-700 font-bold border border-red-300">
                              ⚠️ URGENTE
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{doc.descripcion}</p>
                      </div>
                      <Badge className={`${estadoBadge.color} font-bold ml-4`}>
                        {estadoBadge.text}
                      </Badge>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-5 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">ID Documento</p>
                        <p className="font-bold text-gray-900">{doc.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Tipo</p>
                        <p className="font-bold text-gray-900">{doc.tipo}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Remitente</p>
                        <p className="font-bold text-gray-900">{doc.remitente}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Recibido</p>
                        <p className="font-bold text-gray-900">{doc.fechaRecibido}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Límite</p>
                        <p className={`font-bold ${urgente ? 'text-red-600' : 'text-gray-900'}`}>
                          {doc.fechaLimite}
                          {urgente && ` (${diasRestantes}d)`}
                        </p>
                      </div>
                    </div>

                    {/* Información adicional */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{doc.cargoRemitente}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{doc.paginas} páginas • {doc.tamano}</span>
                      </div>
                      <Badge className={`${getPrioridadColor(doc.prioridad)} border text-xs`}>
                        Prioridad: {doc.prioridad.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Botones de Acción */}
                    {doc.estado !== 'firmado' && doc.estado !== 'devuelto' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAbrirDocumento(doc)}
                          className="font-semibold"
                          style={{ background: '#003DA5', color: '#FFFFFF' }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver y Firmar
                        </Button>
                        <Button
                          onClick={() => {
                            setDocumentoSeleccionado(doc);
                            handleDevolver();
                          }}
                          variant="outline"
                          className="font-semibold border-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Devolver con Comentarios
                        </Button>
                      </div>
                    )}

                    {doc.estado === 'firmado' && (
                      <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        <span>Documento firmado exitosamente</span>
                      </div>
                    )}

                    {doc.estado === 'devuelto' && (
                      <div className="flex items-center gap-2 text-purple-700 text-sm font-semibold">
                        <MessageSquare className="w-4 h-4" />
                        <span>Documento devuelto con comentarios</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {documentosFiltrados.length === 0 && (
          <Card className="p-12 text-center border-2 border-dashed border-gray-300">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <div>
                <h3 className="font-black text-xl text-gray-900 mb-2">
                  No se encontraron documentos
                </h3>
                <p className="text-gray-600">
                  {busqueda || filtroEstado !== 'todos'
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'No tienes documentos pendientes en este momento'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modales */}
      {documentoSeleccionado && (
        <>
          <ModalAccesoCodigoDocumento
            isOpen={mostrarModalAcceso}
            onClose={() => {
              setMostrarModalAcceso(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
            onCodigoValidado={handleCodigoValidado}
          />

          <VisorDocumentoFirmaOTP
            isOpen={mostrarVisor}
            onClose={() => {
              setMostrarVisor(false);
              setDocumentoSeleccionado(null);
              setAccesoValidado(false);
            }}
            documento={documentoSeleccionado}
            onFirmaCompletada={handleFirmaCompletada}
            onDevolver={handleDevolver}
            modoPortalTransaccional={true}
          />

          <ModalDevolucionDocumento
            isOpen={mostrarModalDevolucion}
            onClose={() => {
              setMostrarModalDevolucion(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
            onDevolucionEnviada={handleDevolucionEnviada}
          />

          <ModalHistorialDocumento
            isOpen={mostrarModalHistorial}
            onClose={() => {
              setMostrarModalHistorial(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
          />
        </>
      )}
    </div>
  );
}