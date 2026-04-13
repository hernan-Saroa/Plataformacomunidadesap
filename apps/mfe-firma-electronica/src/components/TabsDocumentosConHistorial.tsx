/**
 * TabsDocumentosConHistorial - Sistema de TABS con vista de Tarjetas y Tabla Paginada
 * Pendientes = Tarjetas | Historial = Tabla con Paginación
 */

import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import {
  FileText, Upload, Eye, Download, Share2, CheckCircle,
  Clock, AlertCircle, History, PenTool, MapPin,
  MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

interface TabsDocumentosProps {
  documentos: Documento[];
  busqueda: string;
  filtroEstado: string;
  onVerDocumento: (doc: Documento) => void;
  onFirmarDocumento: (doc: Documento) => void;
  onCompartirDocumento: (doc: Documento) => void;
  onVerHistorial: (doc: Documento) => void;
  onVerTrazabilidad: (doc: Documento) => void;
  onSubirDocumento: () => void;
  getEstadoConfig: (estado: string) => any;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  statsPendientes: number;
  statsEnProceso: number;
  statsFirmados: number;
}

export function TabsDocumentosConHistorial({
  documentos,
  busqueda,
  filtroEstado,
  onVerDocumento,
  onFirmarDocumento,
  onCompartirDocumento,
  onVerHistorial,
  onVerTrazabilidad,
  onSubirDocumento,
  getEstadoConfig,
  getInitials,
  getAvatarColor,
  statsPendientes,
  statsEnProceso,
  statsFirmados
}: TabsDocumentosProps) {
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'historial'>('pendientes');
  const [paginaActual, setPaginaActual] = useState(1);
  const documentosPorPagina = 20;

  // Filtrar documentos según búsqueda
  const documentosFiltrados = documentos.filter(doc =>
    doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    doc.id.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Documentos pendientes (pendiente + en_proceso)
  const documentosPendientes = documentosFiltrados.filter(
    d => (d.estado === 'pendiente' || d.estado === 'en_proceso') &&
         (filtroEstado === 'todos' || d.estado === filtroEstado)
  );

  // Documentos firmados
  const documentosFirmados = documentosFiltrados.filter(d => d.estado === 'firmado');

  // Paginación para historial
  const totalPaginas = Math.ceil(documentosFirmados.length / documentosPorPagina);
  const inicio = (paginaActual - 1) * documentosPorPagina;
  const documentosPaginados = documentosFirmados.slice(inicio, inicio + documentosPorPagina);

  return (
    <>
      {/* 🆕 TABS: Pendientes vs Historial */}
      <div className="mb-6">
        <div className="border-b-2 border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => {
                setTabActiva('pendientes');
                setPaginaActual(1);
              }}
              className={`pb-3 px-2 font-semibold text-sm transition-all relative ${
                tabActiva === 'pendientes'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Documentos Pendientes</span>
                <Badge className="bg-red-100 text-red-700 font-bold">
                  {statsPendientes + statsEnProceso}
                </Badge>
              </div>
              {tabActiva === 'pendientes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>

            <button
              onClick={() => {
                setTabActiva('historial');
                setPaginaActual(1);
              }}
              className={`pb-3 px-2 font-semibold text-sm transition-all relative ${
                tabActiva === 'historial'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Historial de Firmados</span>
                <Badge className="bg-green-100 text-green-700 font-bold">
                  {statsFirmados}
                </Badge>
              </div>
              {tabActiva === 'historial' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según TAB activo */}
      {tabActiva === 'pendientes' ? (
        // 📋 VISTA DE TARJETAS para PENDIENTES
        <div className="space-y-3">
          {documentosPendientes.length === 0 ? (
            <Card className="p-16 text-center border-2 border-dashed border-gray-200 bg-gray-50">
              <div className="max-w-md mx-auto">
                <div className="p-4 rounded-full bg-gray-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  ¡Todo al día!
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  No tienes documentos pendientes de firma
                </p>
                <Button
                  onClick={onSubirDocumento}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Nuevo Documento
                </Button>
              </div>
            </Card>
          ) : (
            documentosPendientes.map((doc) => {
              const estadoConfig = getEstadoConfig(doc.estado);
              const EstadoIcon = estadoConfig.icon;
              const porcentajeFirmas = (doc.firmasCompletadas / doc.firmasRequeridas) * 100;

              return (
                <Card key={doc.id} className={`border-2 ${estadoConfig.border} hover:shadow-lg transition-all bg-white`}>
                  {/* Header con Badge de Estado */}
                  <div className={`px-5 py-3 ${estadoConfig.bg} border-b-2 ${estadoConfig.border} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white`}>
                        <EstadoIcon className={`w-4 h-4 ${estadoConfig.text}`} />
                      </div>
                      <div>
                        <Badge className={`${estadoConfig.badge} font-bold text-xs`}>
                          {estadoConfig.label.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">{doc.ultimaActividad}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{doc.id}</span>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Contenido Principal */}
                  <div className="p-5">
                    <div className="flex gap-5">
                      {/* Icono Grande del Documento */}
                      <div className="flex-shrink-0">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                          <FileText className="w-10 h-10 text-blue-600" />
                        </div>
                      </div>

                      {/* Info Principal */}
                      <div className="flex-1 min-w-0">
                        {/* Título */}
                        <h3 className="font-bold text-base text-gray-900 mb-3">
                          {doc.nombre}
                        </h3>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Tipo de documento</p>
                            <p className="text-sm font-semibold text-gray-900">{doc.tipo}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Tamaño</p>
                            <p className="text-sm font-semibold text-gray-900">{doc.tamaño}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Fecha de carga</p>
                            <p className="text-sm font-semibold text-gray-900">{doc.fechaCarga}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Cargado por</p>
                            <p className="text-sm font-semibold text-gray-900">{doc.cargadoPor}</p>
                          </div>
                        </div>

                        {/* Progreso de Firmas */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-700">
                              Progreso de firmas
                            </p>
                            <p className="text-xs font-bold text-blue-600">
                              {doc.firmasCompletadas} de {doc.firmasRequeridas} ({Math.round(porcentajeFirmas)}%)
                            </p>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                              style={{ width: `${porcentajeFirmas}%` }}
                            />
                          </div>
                        </div>

                        {/* Firmantes con Avatares */}
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-semibold text-gray-700">Firmantes:</p>
                          <div className="flex items-center">
                            {doc.firmantes.map((firmante, idx) => {
                              const initials = getInitials(firmante.nombre);
                              const avatarColor = getAvatarColor(firmante.nombre);
                              const isFirmado = firmante.estado === 'firmado';

                              return (
                                <div
                                  key={idx}
                                  className="relative group"
                                  style={{ marginLeft: idx > 0 ? '-8px' : '0' }}
                                  title={`${firmante.nombre} - ${firmante.cargo}`}
                                >
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 ${
                                      isFirmado ? 'border-white' : 'border-gray-300'
                                    } ${isFirmado ? '' : 'opacity-60'}`}
                                    style={{ backgroundColor: avatarColor }}
                                  >
                                    {initials}
                                  </div>
                                  {isFirmado && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                      <CheckCircle className="w-2.5 h-2.5 text-white" fill="currentColor" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Acciones - Vertical */}
                      <div className="flex flex-col gap-2 w-36">
                        <Button
                          size="sm"
                          onClick={() => onVerDocumento(doc)}
                          className="font-medium text-xs w-full justify-start"
                          variant="outline"
                        >
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          Ver
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => onFirmarDocumento(doc)}
                          className="font-medium text-xs w-full justify-start"
                          style={{ background: '#003DA5', color: '#FFFFFF' }}
                        >
                          <PenTool className="w-3.5 h-3.5 mr-2" />
                          Firmar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCompartirDocumento(doc)}
                          className="font-medium text-xs w-full justify-start"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-2" />
                          Compartir
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVerHistorial(doc)}
                          className="font-medium text-xs w-full justify-start"
                        >
                          <History className="w-3.5 h-3.5 mr-2" />
                          Historial
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVerTrazabilidad(doc)}
                          className="font-medium text-xs w-full justify-start"
                        >
                          <MapPin className="w-3.5 h-3.5 mr-2" />
                          Trazabilidad
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        // 📜 VISTA DE TABLA para HISTORIAL
        <>
          {documentosFirmados.length === 0 ? (
            <Card className="p-16 text-center border-2 border-dashed border-gray-200 bg-gray-50">
              <div className="max-w-md mx-auto">
                <div className="p-4 rounded-full bg-gray-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Sin documentos firmados
                </h3>
                <p className="text-sm text-gray-600">
                  Los documentos completamente firmados aparecerán aquí
                </p>
              </div>
            </Card>
          ) : (
            <>
              <Card className="border-2 border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Documento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Fecha Firma
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Firmantes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Cargado por
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentosPaginados.map((doc) => (
                        <tr key={doc.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-semibold text-blue-600">{doc.id}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 max-w-md truncate">
                                  {doc.nombre}
                                </p>
                                <p className="text-xs text-gray-500">{doc.tamaño}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {doc.tipo}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{doc.fechaCarga}</p>
                              <p className="text-xs text-gray-500">{doc.ultimaActividad}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {doc.firmantes.slice(0, 3).map((firmante, idx) => {
                                const initials = getInitials(firmante.nombre);
                                const avatarColor = getAvatarColor(firmante.nombre);
                                return (
                                  <div
                                    key={idx}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                                    style={{ backgroundColor: avatarColor, marginLeft: idx > 0 ? '-6px' : '0' }}
                                    title={firmante.nombre}
                                  >
                                    {initials}
                                  </div>
                                );
                              })}
                              {doc.firmantes.length > 3 && (
                                <div className="ml-1 text-xs font-semibold text-gray-600">
                                  +{doc.firmantes.length - 3}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-medium text-gray-900">{doc.cargadoPor}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onVerDocumento(doc)}
                                className="h-8 w-8 p-0"
                                title="Ver documento"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  toast.success('📥 Descargando documento con QR', {
                                    description: 'El documento firmado con código QR se está descargando',
                                    duration: 3000
                                  });
                                }}
                                className="h-8 w-8 p-0"
                                title="Descargar con QR"
                              >
                                <Download className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onVerHistorial(doc)}
                                className="h-8 w-8 p-0"
                                title="Ver historial"
                              >
                                <History className="w-4 h-4 text-gray-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onCompartirDocumento(doc)}
                                className="h-8 w-8 p-0"
                                title="Compartir"
                              >
                                <Share2 className="w-4 h-4 text-purple-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando <span className="font-semibold">{inicio + 1}</span> a{' '}
                    <span className="font-semibold">
                      {Math.min(inicio + documentosPorPagina, documentosFirmados.length)}
                    </span>{' '}
                    de <span className="font-semibold">{documentosFirmados.length}</span> documentos
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaginaActual(1)}
                      disabled={paginaActual === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                        .filter(page => {
                          // Mostrar siempre primera, última, actual y adyacentes
                          return (
                            page === 1 ||
                            page === totalPaginas ||
                            Math.abs(page - paginaActual) <= 1
                          );
                        })
                        .map((page, idx, arr) => {
                          // Agregar "..." si hay salto
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && page - prev > 1;

                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <Button
                                size="sm"
                                variant={paginaActual === page ? 'default' : 'outline'}
                                onClick={() => setPaginaActual(page)}
                                className="h-9 min-w-9 px-2"
                                style={
                                  paginaActual === page
                                    ? { background: '#003DA5', color: '#FFFFFF' }
                                    : {}
                                }
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaginaActual(totalPaginas)}
                      disabled={paginaActual === totalPaginas}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
