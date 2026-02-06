/**
 * Modal para consultar el historial de certificados de un empleado
 * Incluye select para seleccionar empleado y tabla con el historial
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, FileText, Calendar, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useHistorialCertificados } from '../../hooks/useHistorialCertificados';

interface ModalHistorialCertificadosProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalHistorialCertificados({ isOpen, onClose }: ModalHistorialCertificadosProps) {
  const {
    empleados,
    empleadoSeleccionado,
    historial,
    isLoading,
    error,
    setEmpleadoSeleccionado,
    limpiarHistorial,
  } = useHistorialCertificados();

  const [busquedaEmpleado, setBusquedaEmpleado] = React.useState('');

  // Filtrar empleados por búsqueda
  const empleadosFiltrados = React.useMemo(() => {
    if (!busquedaEmpleado.trim()) {
      return empleados;
    }
    const termino = busquedaEmpleado.toLowerCase();
    return empleados.filter(
      (emp) =>
        emp.nombre.toLowerCase().includes(termino) ||
        emp.documento.includes(termino) ||
        emp.email.toLowerCase().includes(termino) ||
        (emp.cargo && emp.cargo.toLowerCase().includes(termino))
    );
  }, [empleados, busquedaEmpleado]);

  // Limpiar al cerrar el modal
  React.useEffect(() => {
    if (!isOpen) {
      limpiarHistorial();
      setBusquedaEmpleado('');
    }
  }, [isOpen, limpiarHistorial]);

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activo: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo', icon: CheckCircle },
      inactivo: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactivo', icon: Clock },
      revocado: { bg: 'bg-red-100', text: 'text-red-800', label: 'Revocado', icon: XCircle },
      expirado: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirado', icon: Clock },
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.activo;
    const Icon = estilo.icon;
    return (
      <Badge variant="outline" className={`${estilo.bg} ${estilo.text} border-0 text-xs px-2 py-0.5 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {estilo.label}
      </Badge>
    );
  };

  const empleadoSeleccionadoData = empleados.find(
    (emp) => emp.id === empleadoSeleccionado || emp.documento === empleadoSeleccionado
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      </AnimatePresence>

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#003DA5] px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-white text-xl font-semibold">Historial de Certificados</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Selector de Empleado */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seleccionar Empleado <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, documento o email..."
                    value={busquedaEmpleado}
                    onChange={(e) => setBusquedaEmpleado(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent text-sm"
                  />
                </div>

                {/* Lista de empleados filtrados */}
                {busquedaEmpleado && empleadosFiltrados.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                    {empleadosFiltrados.map((empleado) => (
                      <button
                        key={empleado.id}
                        onClick={() => {
                          setEmpleadoSeleccionado(empleado.id);
                          setBusquedaEmpleado('');
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          empleadoSeleccionado === empleado.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{empleado.nombre}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600">CC {empleado.documento}</span>
                              {empleado.cargo && (
                                <span className="text-sm text-gray-500">{empleado.cargo}</span>
                              )}
                            </div>
                          </div>
                          {empleadoSeleccionado === empleado.id && (
                            <CheckCircle className="w-5 h-5 text-[#003DA5]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empleado seleccionado */}
                {empleadoSeleccionadoData && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{empleadoSeleccionadoData.nombre}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">CC {empleadoSeleccionadoData.documento}</span>
                          {empleadoSeleccionadoData.cargo && (
                            <span className="text-sm text-gray-500">{empleadoSeleccionadoData.cargo}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setEmpleadoSeleccionado(null)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de Historial */}
              {empleadoSeleccionadoData && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#003DA5]" />
                      Historial de Certificados
                    </h3>
                    {historial.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {historial.length} certificado{historial.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#003DA5] animate-spin" />
                      <p className="text-gray-600">Cargando historial...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600 font-medium">{error}</p>
                    </div>
                  ) : historial.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No se encontraron certificados</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Este empleado no tiene certificados en el sistema
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Estado
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  N° Certificado
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Fecha Solicitud
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Fecha Generación
                                </span>
                              </th>
                              <th className="px-4 py-3 text-left">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Validaciones
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {historial.map((cert) => (
                              <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap">{getEstadoBadge(cert.estado)}</td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <p className="text-sm font-medium text-gray-900 font-mono">
                                    {cert.consecutivo}
                                  </p>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <p className="text-sm text-gray-900">
                                    {new Date(cert.fechaSolicitud).toLocaleDateString('es-CO', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(cert.fechaSolicitud).toLocaleTimeString('es-CO', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <p className="text-sm text-gray-900">
                                    {new Date(cert.fechaGeneracion).toLocaleDateString('es-CO', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(cert.fechaGeneracion).toLocaleTimeString('es-CO', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <p className="text-sm text-gray-900 font-medium">
                                    {cert.cantidadEscaneos}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje cuando no hay empleado seleccionado */}
              {!empleadoSeleccionadoData && (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-medium">Selecciona un empleado</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Busca y selecciona un empleado para ver su historial de certificados
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

