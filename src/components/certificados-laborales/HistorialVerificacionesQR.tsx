import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Calendar,
  Clock,
  Globe,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
  TrendingUp,
  Eye,
  Activity,
  Shield
} from 'lucide-react';
import { Badge } from '../ui/badge';

interface VerificacionQR {
  id: string;
  timestamp: string;
  resultado: 'exitosa' | 'fallida' | 'sospechosa';
  dispositivo: {
    tipo: 'desktop' | 'mobile' | 'tablet';
    sistemaOperativo: string;
    navegador: string;
    version: string;
  };
  ubicacion: {
    ip: string;
    pais: string;
    ciudad: string;
    latitud?: number;
    longitud?: number;
    proveedor?: string;
  };
  detalles?: string;
}

interface HistorialVerificacionesQRProps {
  consecutivo: string;
  verificaciones: VerificacionQR[];
  totalVerificaciones: number;
}

export function HistorialVerificacionesQR({ 
  consecutivo, 
  verificaciones,
  totalVerificaciones 
}: HistorialVerificacionesQRProps) {
  const [filtroResultado, setFiltroResultado] = useState<string>('todos');
  const [filtroDispositivo, setFiltroDispositivo] = useState<string>('todos');

  // Filtrar verificaciones
  const verificacionesFiltradas = verificaciones.filter(v => {
    const matchResultado = filtroResultado === 'todos' || v.resultado === filtroResultado;
    const matchDispositivo = filtroDispositivo === 'todos' || v.dispositivo.tipo === filtroDispositivo;
    return matchResultado && matchDispositivo;
  });

  // Estadísticas
  const normalizarPais = (pais: string) => pais.trim().toUpperCase();
  const paisesDiferentes = new Set(
    verificaciones
      .map(v => v.ubicacion.pais || '')
      .map(normalizarPais)
      .filter(pais => pais && pais !== 'DESCONOCIDO' && pais !== 'N/A' && pais !== 'COLOMBIA')
  );
  const stats = {
    exitosas: verificaciones.filter(v => v.resultado === 'exitosa').length,
    fallidas: verificaciones.filter(v => v.resultado === 'fallida').length,
    sospechosas: verificaciones.filter(v => v.resultado === 'sospechosa').length,
    desktop: verificaciones.filter(v => v.dispositivo.tipo === 'desktop').length,
    mobile: verificaciones.filter(v => v.dispositivo.tipo === 'mobile').length,
    tablet: verificaciones.filter(v => v.dispositivo.tipo === 'tablet').length,
    paises: paisesDiferentes.size
  };

  const totalVerificacionesReales = totalVerificaciones > 0 ? totalVerificaciones : verificaciones.length;
  const tasaExito = totalVerificacionesReales > 0
    ? Math.round((stats.exitosas / totalVerificacionesReales) * 100)
    : 0;

  const getDispositivoIcon = (tipo: string) => {
    switch (tipo) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getResultadoBadge = (resultado: string) => {
    const estilos = {
      exitosa: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Exitosa' 
      },
      fallida: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        icon: <XCircle className="w-3 h-3" />,
        label: 'Fallida' 
      },
      sospechosa: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        icon: <AlertTriangle className="w-3 h-3" />,
        label: 'Sospechosa' 
      }
    };
    const estilo = estilos[resultado as keyof typeof estilos] || estilos.exitosa;
    return (
      <Badge variant="outline" className={`${estilo.bg} ${estilo.text} border-0 text-xs px-2 py-0.5 flex items-center gap-1`}>
        {estilo.icon}
        {estilo.label}
      </Badge>
    );
  };

  const getSOIcon = (so: string) => {
    const soLower = so.toLowerCase();
    if (soLower.includes('windows')) return '🪟';
    if (soLower.includes('mac') || soLower.includes('ios')) return '🍎';
    if (soLower.includes('android')) return '🤖';
    if (soLower.includes('linux')) return '🐧';
    return '💻';
  };

  const exportarHistorial = () => {
    // En produccion, esto generaria un CSV o Excel
    const delimiter = ';';
    const escapeCSV = (value: string) => {
      const raw = value ?? '';
      const needsQuotes = raw.includes('"') || raw.includes('\n') || raw.includes('\r') || raw.includes(delimiter);
      const escaped = raw.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const headers = [
      'Fecha y Hora',
      'Resultado',
      'Tipo Dispositivo',
      'Sistema Operativo',
      'Navegador',
      'IP',
      'Pa\u00eds',
      'Ciudad'
    ];

    const rows = verificaciones.map(v => [
      new Date(v.timestamp).toLocaleString('es-CO'),
      v.resultado,
      v.dispositivo.tipo,
      v.dispositivo.sistemaOperativo,
      v.dispositivo.navegador,
      v.ubicacion.ip,
      v.ubicacion.pais,
      v.ubicacion.ciudad
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(delimiter),
      ...rows.map(row => row.map(value => escapeCSV(String(value ?? ''))).join(delimiter))
    ].join('\r\n');

    // BOM para que Excel detecte UTF-8 (tildes y caracteres especiales)
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verificaciones-qr-${consecutivo}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  return (
    <div className="space-y-6">
      {/* Header con estadísticas generales */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Trazabilidad de Verificaciones</h3>
            <p className="text-sm text-gray-600">
              Certificado: <span className="font-mono font-semibold text-gray-900">{consecutivo}</span>
            </p>
          </div>
        </div>
        
        <button
          onClick={exportarHistorial}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Exportar Historial
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-1">{totalVerificacionesReales}</p>
          <p className="text-xs text-blue-700 font-medium">Total Verificaciones</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs font-semibold text-green-700">
              {tasaExito}%
            </span>
          </div>
          <p className="text-3xl font-bold text-green-900 mb-1">{stats.exitosas}</p>
          <p className="text-xs text-green-700 font-medium">Verificaciones Exitosas</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Smartphone className="w-5 h-5 text-purple-600" />
            <div className="flex gap-1">
              <Monitor className="w-3 h-3 text-purple-500" />
              <Tablet className="w-3 h-3 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-1">{stats.mobile}</p>
          <p className="text-xs text-purple-700 font-medium">Desde Móviles</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-orange-600" />
            <MapPin className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-900 mb-1">{stats.paises}</p>
          <p className="text-xs text-orange-700 font-medium">Países Diferentes</p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos los resultados</option>
            <option value="exitosa">Exitosas</option>
            <option value="fallida">Fallidas</option>
            <option value="sospechosa">Sospechosas</option>
          </select>

          <select
            value={filtroDispositivo}
            onChange={(e) => setFiltroDispositivo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos los dispositivos</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Móvil</option>
            <option value="tablet">Tablet</option>
          </select>

          {(filtroResultado !== 'todos' || filtroDispositivo !== 'todos') && (
            <button
              onClick={() => {
                setFiltroResultado('todos');
                setFiltroDispositivo('todos');
              }}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de verificaciones */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Fecha y Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Resultado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Dispositivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Sistema Operativo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Navegador
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  IP
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Ubicación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {verificacionesFiltradas.length > 0 ? (
                verificacionesFiltradas.map((verificacion, index) => (
                  <motion.tr
                    key={verificacion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Fecha y Hora */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(verificacion.timestamp).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(verificacion.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Resultado */}
                    <td className="px-4 py-4">
                      {getResultadoBadge(verificacion.resultado)}
                    </td>

                    {/* Dispositivo */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${
                          verificacion.dispositivo.tipo === 'mobile' ? 'bg-purple-100 text-purple-600' :
                          verificacion.dispositivo.tipo === 'tablet' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getDispositivoIcon(verificacion.dispositivo.tipo)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {verificacion.dispositivo.tipo}
                        </span>
                      </div>
                    </td>

                    {/* Sistema Operativo */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getSOIcon(verificacion.dispositivo.sistemaOperativo)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {verificacion.dispositivo.sistemaOperativo}
                          </p>
                          <p className="text-xs text-gray-500">
                            v{verificacion.dispositivo.version}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Navegador */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{verificacion.dispositivo.navegador}</span>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-gray-400" />
                          <code className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {verificacion.ubicacion.ip}
                          </code>
                        </div>
                        {verificacion.ubicacion.proveedor && (
                          <span className="text-xs text-gray-500">
                            {verificacion.ubicacion.proveedor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ubicación */}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {verificacion.ubicacion.ciudad}
                          </p>
                          <p className="text-xs text-gray-600">
                            {verificacion.ubicacion.pais}
                          </p>
                          {verificacion.ubicacion.latitud && verificacion.ubicacion.longitud && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {verificacion.ubicacion.latitud.toFixed(4)}, {verificacion.ubicacion.longitud.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="w-12 h-12 text-gray-300" />
                      <p className="text-sm text-gray-600">
                        No se encontraron verificaciones con los filtros seleccionados
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con información adicional */}
        {verificacionesFiltradas.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  <span><strong>{stats.exitosas}</strong> exitosas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span><strong>{stats.fallidas}</strong> fallidas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                  <span><strong>{stats.sospechosas}</strong> sospechosas</span>
                </span>
              </div>
              <span>
                Mostrando <strong>{verificacionesFiltradas.length}</strong> de <strong>{verificaciones.length}</strong> verificaciones
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
