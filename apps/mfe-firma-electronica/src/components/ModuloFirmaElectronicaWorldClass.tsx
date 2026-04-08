/**
 * ModuloFirmaElectronicaWorldClass - Módulo World-Class de Firma Electrónica
 * Diseño premium SAP Fiori/Microsoft Dynamics style
 */

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  FileText, Upload, Eye, Download, Share2, CheckCircle,
  Clock, AlertCircle, Users, Search, Filter, PenTool,
  History, X, ChevronRight, Calendar, User as UserIcon,
  MoreVertical, Star, Archive, Trash2, Shield, BarChart3, MapPin,
  ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModalSubirDocumento } from './ModalSubirDocumento';
import { VisorDocumentoFirmaOTP } from './VisorDocumentoFirmaOTP';
import { ModalCompartirFirma } from './ModalCompartirFirma';
import { ModalHistorialFirmasWorldClass } from './ModalHistorialFirmasWorldClass';
import { HistorialDocumentosCompletados } from './HistorialDocumentosCompletados';
import { FiltrosAvanzados } from './FiltrosAvanzados';
import { DashboardEstadisticas } from './DashboardEstadisticas';
import { TemplatesFirma } from './TemplatesFirma';
import { ModalTrazabilidadDocumento } from './ModalTrazabilidadDocumento';
import { TabsDocumentosConHistorial } from './TabsDocumentosConHistorial';

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  estado: 'pendiente' | 'firmado' | 'en_proceso' | 'compartido';
  fechaCarga: string;
  cargadoPor: string;
  firmasRequeridas: number;
  firmasCompletadas: number;
  ultimaActividad: string;
  firmantes: {
    nombre: string;
    cargo: string;
    email: string;
    estado: 'pendiente' | 'firmado' | 'rechazado';
    fechaFirma?: string;
    horaFirma?: string;
  }[];
  historial: {
    accion: string;
    usuario: string;
    fecha: string;
    hora: string;
  }[];
}

// Función auxiliar para obtener iniciales
const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Función para obtener color del avatar basado en el nombre
const getAvatarColor = (name: string): string => {
  const colors = [
    '#003DA5', // Azul ESAP
    '#1e5da8', // Azul medio
    '#2a6dbd', // Azul claro
    '#F57C00', // Naranja
    '#10B981', // Verde
    '#8B5CF6', // Púrpura
    '#EC4899', // Rosa
    '#06B6D4', // Cyan
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ModuloFirmaElectronicaWorldClass() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModalSubir, setMostrarModalSubir] = useState(false);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarHistorialCompletados, setMostrarHistorialCompletados] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState<any>(null);
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [mostrarTrazabilidad, setMostrarTrazabilidad] = useState(false);
  
  const [documentos, setDocumentos] = useState<Documento[]>([
    {
      id: 'DOC-2024-001',
      nombre: 'Contrato de Prestación de Servicios Profesionales',
      tipo: 'Contrato',
      tamaño: '2.4 MB',
      estado: 'en_proceso',
      fechaCarga: '23/12/2024',
      cargadoPor: 'María González',
      firmasRequeridas: 3,
      firmasCompletadas: 1,
      ultimaActividad: 'Hace 2 horas',
      firmantes: [
        { nombre: 'María González', cargo: 'Directora Administrativa', email: 'maria.gonzalez@esap.edu.co', estado: 'firmado', fechaFirma: '23/12/2024', horaFirma: '10:30 AM' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', email: 'carlos.mendoza@esap.edu.co', estado: 'pendiente' },
        { nombre: 'Ana Martínez', cargo: 'Directora General', email: 'ana.martinez@esap.edu.co', estado: 'pendiente' }
      ],
      historial: [
        { accion: 'Documento compartido con Carlos Mendoza', usuario: 'María González', fecha: '23/12/2024', hora: '11:45 AM' },
        { accion: 'Documento firmado', usuario: 'María González', fecha: '23/12/2024', hora: '10:30 AM' },
        { accion: 'Documento cargado', usuario: 'María González', fecha: '23/12/2024', hora: '09:15 AM' }
      ]
    },
    {
      id: 'DOC-2024-002',
      nombre: 'Acta de Reunión Comité Directivo',
      tipo: 'Acta',
      tamaño: '1.8 MB',
      estado: 'firmado',
      fechaCarga: '20/12/2024',
      cargadoPor: 'Pedro Ramírez',
      firmasRequeridas: 5,
      firmasCompletadas: 5,
      ultimaActividad: 'Hace 3 días',
      firmantes: [
        { nombre: 'Pedro Ramírez', cargo: 'Secretario General', email: 'pedro.ramirez@esap.edu.co', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '02:00 PM' },
        { nombre: 'María González', cargo: 'Directora Administrativa', email: 'maria.gonzalez@esap.edu.co', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '02:30 PM' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', email: 'carlos.mendoza@esap.edu.co', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '03:15 PM' },
        { nombre: 'Ana Martínez', cargo: 'Directora General', email: 'ana.martinez@esap.edu.co', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '04:00 PM' },
        { nombre: 'Luis Hernández', cargo: 'Director Financiero', email: 'luis.hernandez@esap.edu.co', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '04:30 PM' }
      ],
      historial: [
        { accion: 'Documento completamente firmado', usuario: 'Sistema', fecha: '20/12/2024', hora: '04:30 PM' },
        { accion: 'Documento firmado', usuario: 'Luis Hernández', fecha: '20/12/2024', hora: '04:30 PM' },
        { accion: 'Documento firmado', usuario: 'Ana Martínez', fecha: '20/12/2024', hora: '04:00 PM' },
        { accion: 'Documento firmado', usuario: 'Carlos Mendoza', fecha: '20/12/2024', hora: '03:15 PM' },
        { accion: 'Documento firmado', usuario: 'María González', fecha: '20/12/2024', hora: '02:30 PM' },
        { accion: 'Documento firmado', usuario: 'Pedro Ramírez', fecha: '20/12/2024', hora: '02:00 PM' },
        { accion: 'Documento compartido con 4 firmantes', usuario: 'Pedro Ramírez', fecha: '20/12/2024', hora: '01:45 PM' },
        { accion: 'Documento cargado', usuario: 'Pedro Ramírez', fecha: '20/12/2024', hora: '01:30 PM' }
      ]
    },
    {
      id: 'DOC-2024-003',
      nombre: 'Resolución Administrativa No. 145',
      tipo: 'Resolución',
      tamaño: '3.2 MB',
      estado: 'pendiente',
      fechaCarga: '26/12/2024',
      cargadoPor: 'Ana Martínez',
      firmasRequeridas: 2,
      firmasCompletadas: 0,
      ultimaActividad: 'Hace 1 hora',
      firmantes: [
        { nombre: 'Ana Martínez', cargo: 'Directora General', email: 'ana.martinez@esap.edu.co', estado: 'pendiente' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', email: 'carlos.mendoza@esap.edu.co', estado: 'pendiente' }
      ],
      historial: [
        { accion: 'Documento cargado', usuario: 'Ana Martínez', fecha: '26/12/2024', hora: '08:15 AM' }
      ]
    },
    {
      id: 'DOC-2024-004',
      nombre: 'Convenio Interinstitucional Universidad Nacional',
      tipo: 'Convenio',
      tamaño: '4.5 MB',
      estado: 'en_proceso',
      fechaCarga: '18/12/2024',
      cargadoPor: 'Carlos Mendoza',
      firmasRequeridas: 4,
      firmasCompletadas: 2,
      ultimaActividad: 'Hace 5 días',
      firmantes: [
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', email: 'carlos.mendoza@esap.edu.co', estado: 'firmado', fechaFirma: '18/12/2024', horaFirma: '03:00 PM' },
        { nombre: 'María González', cargo: 'Directora Administrativa', email: 'maria.gonzalez@esap.edu.co', estado: 'firmado', fechaFirma: '19/12/2024', horaFirma: '09:30 AM' },
        { nombre: 'Ana Martínez', cargo: 'Directora General ESAP', email: 'ana.martinez@esap.edu.co', estado: 'pendiente' },
        { nombre: 'Dr. Roberto Silva', cargo: 'Rector Universidad Nacional', email: 'roberto.silva@unal.edu.co', estado: 'pendiente' }
      ],
      historial: [
        { accion: 'Documento compartido con Ana Martínez', usuario: 'María González', fecha: '19/12/2024', hora: '09:45 AM' },
        { accion: 'Documento firmado', usuario: 'María González', fecha: '19/12/2024', hora: '09:30 AM' },
        { accion: 'Documento compartido con María González', usuario: 'Carlos Mendoza', fecha: '18/12/2024', hora: '03:15 PM' },
        { accion: 'Documento firmado', usuario: 'Carlos Mendoza', fecha: '18/12/2024', hora: '03:00 PM' },
        { accion: 'Documento cargado', usuario: 'Carlos Mendoza', fecha: '18/12/2024', hora: '02:30 PM' }
      ]
    }
  ]);

  // Calcular estadísticas
  const stats = {
    total: documentos.length,
    pendientes: documentos.filter(d => d.estado === 'pendiente').length,
    enProceso: documentos.filter(d => d.estado === 'en_proceso').length,
    firmados: documentos.filter(d => d.estado === 'firmado').length
  };

  const handleVerDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setMostrarVisor(true);
  };

  const handleCompartirDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setMostrarModalCompartir(true);
  };

  const handleVerHistorial = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setMostrarModalHistorial(true);
  };

  const handleFirmarDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setMostrarVisor(true);
  };

  const handleDocumentoSubido = (nuevoDocumento: any) => {
    const docFormateado: Documento = {
      id: `DOC-2024-${String(documentos.length + 1).padStart(3, '0')}`,
      nombre: nuevoDocumento.nombre,
      tipo: nuevoDocumento.tipo,
      tamaño: nuevoDocumento.tamaño,
      estado: 'pendiente',
      fechaCarga: new Date().toLocaleDateString('es-CO'),
      cargadoPor: 'Usuario Actual',
      firmasRequeridas: 1,
      firmasCompletadas: 0,
      ultimaActividad: 'Hace unos segundos',
      firmantes: [
        { nombre: 'Usuario Actual', cargo: 'Cargo actual', email: 'usuario@esap.edu.co', estado: 'pendiente' }
      ],
      historial: [
        { 
          accion: 'Documento cargado', 
          usuario: 'Usuario Actual', 
          fecha: new Date().toLocaleDateString('es-CO'),
          hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      ]
    };

    setDocumentos([docFormateado, ...documentos]);
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'firmado':
        return { 
          bg: 'bg-green-50', 
          border: 'border-green-200', 
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-700',
          icon: CheckCircle,
          label: 'Firmado Completamente'
        };
      case 'en_proceso':
        return { 
          bg: 'bg-orange-50', 
          border: 'border-orange-200', 
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-700',
          icon: Clock,
          label: 'En Proceso de Firma'
        };
      case 'pendiente':
        return { 
          bg: 'bg-red-50', 
          border: 'border-red-200', 
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-700',
          icon: AlertCircle,
          label: 'Pendiente de Firma'
        };
      default:
        return { 
          bg: 'bg-gray-50', 
          border: 'border-gray-200', 
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700',
          icon: FileText,
          label: estado
        };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Premium World-Class */}
      <div className="bg-white border-b-2 border-gray-100 px-6 py-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <PenTool className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Firma Electrónica de Documentos
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión integral con firma digital y trazabilidad completa
                </p>
              </div>
            </div>

            <Button
              onClick={() => setMostrarModalSubir(true)}
              size="lg"
              className="font-semibold shadow-lg"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </div>

          {/* Stats Cards - Inline */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 border border-gray-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Documentos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-gray-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pendientes}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-gray-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">En Proceso</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.enProceso}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border border-gray-200 bg-white hover:shadow-md transition-all cursor-pointer"
              onClick={() => stats.firmados > 0 && setMostrarHistorialCompletados(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Firmados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.firmados}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              {stats.firmados > 0 && (
                <div className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                  Ver certificados <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Barra de Herramientas Premium - NUEVA */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setMostrarFiltrosAvanzados(true)}
            variant="outline"
            className="font-semibold border-2 hover:bg-blue-50 hover:border-blue-400"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
            {filtrosAplicados && (
              <Badge className="ml-2 bg-blue-100 text-blue-700 font-bold">
                Activos
              </Badge>
            )}
          </Button>
          
          <Button
            onClick={() => setMostrarTemplates(true)}
            variant="outline"
            className="font-semibold border-2 hover:bg-indigo-50 hover:border-indigo-400"
          >
            <PenTool className="w-4 h-4 mr-2" />
            Mis Firmas
          </Button>
        </div>

        {/* Barra de Búsqueda - World Class */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar documentos por nombre o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-gray-300 h-10"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm bg-white h-10 min-w-[180px]"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_proceso">En Proceso</option>
          </select>
        </div>

        {/* 🆕 NUEVO: Sistema de TABS con vista de Tarjetas y Tabla Paginada */}
        <TabsDocumentosConHistorial
          documentos={documentos}
          busqueda={busqueda}
          filtroEstado={filtroEstado}
          onVerDocumento={handleVerDocumento}
          onFirmarDocumento={handleFirmarDocumento}
          onCompartirDocumento={handleCompartirDocumento}
          onVerHistorial={handleVerHistorial}
          onVerTrazabilidad={(doc) => {
            setDocumentoSeleccionado(doc);
            setMostrarTrazabilidad(true);
          }}
          onSubirDocumento={() => setMostrarModalSubir(true)}
          getEstadoConfig={getEstadoConfig}
          getInitials={getInitials}
          getAvatarColor={getAvatarColor}
          statsPendientes={stats.pendientes}
          statsEnProceso={stats.enProceso}
          statsFirmados={stats.firmados}
        />
      </div>

      {/* Modales */}
      <ModalSubirDocumento
        isOpen={mostrarModalSubir}
        onClose={() => setMostrarModalSubir(false)}
        onDocumentoSubido={handleDocumentoSubido}
      />

      {documentoSeleccionado && (
        <>
          <VisorDocumentoFirmaOTP
            isOpen={mostrarVisor}
            onClose={() => {
              setMostrarVisor(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
            onDocumentoFirmado={(docId) => {
              // Actualizar documento como firmado
              setDocumentos(documentos.map(d => {
                if (d.id === docId) {
                  const firmasCompletadas = d.firmasCompletadas + 1;
                  return {
                    ...d,
                    firmasCompletadas,
                    estado: firmasCompletadas === d.firmasRequeridas ? 'firmado' : 'en_proceso',
                    firmantes: d.firmantes.map((f, idx) => 
                      idx === 0 ? { ...f, estado: 'firmado' as const, fechaFirma: new Date().toLocaleDateString('es-CO'), horaFirma: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) } : f
                    ),
                    historial: [
                      {
                        accion: 'Documento firmado',
                        usuario: 'Usuario Actual',
                        fecha: new Date().toLocaleDateString('es-CO'),
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
                      },
                      ...d.historial
                    ]
                  };
                }
                return d;
              }));
              setMostrarVisor(false);
            }}
          />

          <ModalCompartirFirma
            isOpen={mostrarModalCompartir}
            onClose={() => {
              setMostrarModalCompartir(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
            onCompartido={(docId, firmantes) => {
              // Actualizar documento con nuevos firmantes
              setDocumentos(documentos.map(d => {
                if (d.id === docId) {
                  return {
                    ...d,
                    firmasRequeridas: d.firmasRequeridas + firmantes.length,
                    firmantes: [...d.firmantes, ...firmantes],
                    estado: 'en_proceso',
                    historial: [
                      {
                        accion: `Documento compartido con ${firmantes.length} firmante(s)`,
                        usuario: 'Usuario Actual',
                        fecha: new Date().toLocaleDateString('es-CO'),
                        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
                      },
                      ...d.historial
                    ]
                  };
                }
                return d;
              }));
              setMostrarModalCompartir(false);
            }}
          />

          <ModalHistorialFirmasWorldClass
            isOpen={mostrarModalHistorial}
            onClose={() => {
              setMostrarModalHistorial(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
          />

          <ModalTrazabilidadDocumento
            isOpen={mostrarTrazabilidad}
            onClose={() => {
              setMostrarTrazabilidad(false);
              setDocumentoSeleccionado(null);
            }}
            documento={documentoSeleccionado}
          />
        </>
      )}

      {/* Historial de Documentos Completados */}
      <HistorialDocumentosCompletados
        isOpen={mostrarHistorialCompletados}
        onClose={() => setMostrarHistorialCompletados(false)}
        documentos={documentos.filter(d => d.estado === 'firmado')}
      />

      {/* Nuevos Modales Premium */}
      <FiltrosAvanzados
        isOpen={mostrarFiltrosAvanzados}
        onClose={() => setMostrarFiltrosAvanzados(false)}
        onAplicarFiltros={(filtros) => {
          setFiltrosAplicados(filtros);
          console.log('Filtros aplicados:', filtros);
          // Aquí se aplicarían los filtros avanzados a la lista de documentos
        }}
        firmantesDisponibles={Array.from(new Set(documentos.flatMap(d => d.firmantes.map(f => f.nombre))))}
        tiposDisponibles={Array.from(new Set(documentos.map(d => d.tipo)))}
      />

      <DashboardEstadisticas
        isOpen={mostrarDashboard}
        onClose={() => setMostrarDashboard(false)}
        documentos={documentos}
      />

      <TemplatesFirma
        isOpen={mostrarTemplates}
        onClose={() => setMostrarTemplates(false)}
        onSeleccionarTemplate={(imagenData) => {
          console.log('Template seleccionado:', imagenData);
          // Aquí se aplicaría el template de firma al visor
        }}
      />
    </div>
  );
}