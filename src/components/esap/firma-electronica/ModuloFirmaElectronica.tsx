/**
 * ModuloFirmaElectronica - Módulo de Firma Electrónica de Documentos
 * Diseño corporativo ESAP premium con trazabilidad completa
 */

import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  FileText, Upload, Eye, Download, Share2, CheckCircle,
  Clock, AlertCircle, Users, Search, Filter, PenTool,
  History, X, ChevronRight, Calendar, User as UserIcon
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ModalSubirDocumento } from './ModalSubirDocumento';
import { VisorDocumentoFirma } from './VisorDocumentoFirma';
import { ModalCompartirFirma } from './ModalCompartirFirma';
import { ModalHistorialFirmas } from './ModalHistorialFirmas';
import { HistorialDocumentosCompletados } from './HistorialDocumentosCompletados';

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

export function ModuloFirmaElectronica() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModalSubir, setMostrarModalSubir] = useState(false);
  const [mostrarVisor, setMostrarVisor] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarHistorialCompletados, setMostrarHistorialCompletados] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);

  // Datos mock de documentos
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
        { nombre: 'María González', cargo: 'Directora Administrativa', estado: 'firmado', fechaFirma: '23/12/2024', horaFirma: '10:30 AM' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', estado: 'pendiente' },
        { nombre: 'Ana Martínez', cargo: 'Directora General', estado: 'pendiente' }
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
        { nombre: 'Pedro Ramírez', cargo: 'Secretario General', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '02:00 PM' },
        { nombre: 'María González', cargo: 'Directora Administrativa', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '02:30 PM' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '03:15 PM' },
        { nombre: 'Ana Martínez', cargo: 'Directora General', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '04:00 PM' },
        { nombre: 'Luis Hernández', cargo: 'Director Financiero', estado: 'firmado', fechaFirma: '20/12/2024', horaFirma: '04:30 PM' }
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
        { nombre: 'Ana Martínez', cargo: 'Directora General', estado: 'pendiente' },
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', estado: 'pendiente' }
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
        { nombre: 'Carlos Mendoza', cargo: 'Director Jurídico', estado: 'firmado', fechaFirma: '18/12/2024', horaFirma: '03:00 PM' },
        { nombre: 'María González', cargo: 'Directora Administrativa', estado: 'firmado', fechaFirma: '19/12/2024', horaFirma: '09:30 AM' },
        { nombre: 'Ana Martínez', cargo: 'Directora General ESAP', estado: 'pendiente' },
        { nombre: 'Dr. Roberto Silva', cargo: 'Rector Universidad Nacional', estado: 'pendiente' }
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
        { nombre: 'Usuario Actual', cargo: 'Cargo actual', estado: 'pendiente' }
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

  // Filtrar documentos
  const documentosFiltrados = documentos.filter(doc => {
    const matchBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.id.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || doc.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'firmado': return { bg: '#10B981', text: '#FFFFFF' };
      case 'en_proceso': return { bg: '#F59E0B', text: '#FFFFFF' };
      case 'pendiente': return { bg: '#EF4444', text: '#FFFFFF' };
      default: return { bg: '#6B7280', text: '#FFFFFF' };
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'firmado': return 'Firmado Completamente';
      case 'en_proceso': return 'En Proceso de Firma';
      case 'pendiente': return 'Pendiente de Firma';
      default: return estado;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      {/* Header Premium */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#1e5da8] shadow-lg">
            <PenTool className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#003DA5' }}>
              Firma Electrónica de Documentos
            </h1>
            <p className="text-gray-600">
              Gestión integral de documentos con firma digital y trazabilidad completa
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border-2 border-blue-200 bg-white hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Documentos</p>
              <p className="text-3xl font-black" style={{ color: '#003DA5' }}>
                {stats.total}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-2 border-red-200 bg-white hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pendientes</p>
              <p className="text-3xl font-black text-red-600">
                {stats.pendientes}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-2 border-orange-200 bg-white hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En Proceso</p>
              <p className="text-3xl font-black text-orange-600">
                {stats.enProceso}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-2 border-green-200 bg-white hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Firmados</p>
              <p className="text-3xl font-black text-green-600">
                {stats.firmados}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          {stats.firmados > 0 && (
            <Button
              size="sm"
              onClick={() => setMostrarHistorialCompletados(true)}
              className="w-full mt-3 font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              Ver Certificados con QR
            </Button>
          )}
        </Card>
      </div>

      {/* Barra de Acciones */}
      <Card className="p-4 mb-6 border-2 border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Búsqueda */}
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o ID del documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Filtros y Botón Subir */}
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border rounded-lg font-semibold text-sm bg-white"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_proceso">En Proceso</option>
              <option value="firmado">Firmados</option>
            </select>

            <Button
              onClick={() => setMostrarModalSubir(true)}
              className="font-bold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Documentos */}
      <div className="space-y-4">
        {documentosFiltrados.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed border-gray-300">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-black text-xl text-gray-600 mb-2">
              No hay documentos
            </h3>
            <p className="text-gray-500 mb-4">
              {busqueda || filtroEstado !== 'todos' 
                ? 'No se encontraron documentos con los filtros seleccionados'
                : 'Comienza subiendo tu primer documento para firma electrónica'
              }
            </p>
            {!busqueda && filtroEstado === 'todos' && (
              <Button
                onClick={() => setMostrarModalSubir(true)}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Primer Documento
              </Button>
            )}
          </Card>
        ) : (
          documentosFiltrados.map((doc) => {
            const estadoColor = getEstadoColor(doc.estado);
            const porcentajeFirmas = (doc.firmasCompletadas / doc.firmasRequeridas) * 100;

            return (
              <Card key={doc.id} className="p-6 border-2 border-gray-200 hover:shadow-xl transition-all">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Icono y Info Principal */}
                  <div className="flex gap-4 flex-1">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex-shrink-0">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <h3 className="font-black text-lg" style={{ color: '#003DA5' }}>
                          {doc.nombre}
                        </h3>
                        <Badge
                          className="font-bold"
                          style={{ background: estadoColor.bg, color: estadoColor.text }}
                        >
                          {getEstadoTexto(doc.estado)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">ID Documento</p>
                          <p className="font-bold text-gray-900">{doc.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Tipo</p>
                          <p className="font-bold text-gray-900">{doc.tipo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Cargado por</p>
                          <p className="font-bold text-gray-900">{doc.cargadoPor}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Última actividad</p>
                          <p className="font-bold text-gray-900">{doc.ultimaActividad}</p>
                        </div>
                      </div>

                      {/* Progreso de Firmas */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-gray-700">
                            Firmas: {doc.firmasCompletadas} de {doc.firmasRequeridas}
                          </p>
                          <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
                            {Math.round(porcentajeFirmas)}%
                          </p>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                            style={{ width: `${porcentajeFirmas}%` }}
                          />
                        </div>
                      </div>

                      {/* Firmantes */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="w-4 h-4 text-gray-500" />
                        <div className="flex gap-1 flex-wrap">
                          {doc.firmantes.map((firmante, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: firmante.estado === 'firmado' ? '#D1FAE5' : '#FEE2E2',
                                color: firmante.estado === 'firmado' ? '#065F46' : '#991B1B'
                              }}
                            >
                              {firmante.nombre.split(' ')[0]}
                              {firmante.estado === 'firmado' ? ' ✓' : ' ⏳'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 md:w-48">
                    <Button
                      size="sm"
                      onClick={() => handleVerDocumento(doc)}
                      className="font-semibold w-full"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Ver Documento
                    </Button>

                    {doc.estado !== 'firmado' && (
                      <Button
                        size="sm"
                        onClick={() => handleFirmarDocumento(doc)}
                        className="font-semibold w-full"
                        style={{ background: '#F57C00', color: '#FFFFFF' }}
                      >
                        <PenTool className="w-3.5 h-3.5 mr-1.5" />
                        Firmar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompartirDocumento(doc)}
                      className="font-semibold border-blue-300 text-blue-600 hover:bg-blue-50 w-full"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      Compartir
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerHistorial(doc)}
                      className="font-semibold border-gray-300 text-gray-600 hover:bg-gray-50 w-full"
                    >
                      <History className="w-3.5 h-3.5 mr-1.5" />
                      Historial
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modales */}
      <ModalSubirDocumento
        isOpen={mostrarModalSubir}
        onClose={() => setMostrarModalSubir(false)}
        onDocumentoSubido={handleDocumentoSubido}
      />

      {documentoSeleccionado && (
        <>
          <VisorDocumentoFirma
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

          <ModalHistorialFirmas
            isOpen={mostrarModalHistorial}
            onClose={() => {
              setMostrarModalHistorial(false);
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
    </div>
  );
}