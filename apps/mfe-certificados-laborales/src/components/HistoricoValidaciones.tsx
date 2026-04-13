import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Globe,
  Eye,
  Download,
  Filter,
  Search,
  Clock,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Validacion {
  id: string;
  fechaHora: string;
  qrCode: string;
  resultado: 'VALIDO' | 'INVALIDO' | 'VENCIDO' | 'ANULADO';
  certificado?: {
    consecutivo: string;
    empleado: string;
    documento: string;
  };
  origen: {
    ip: string;
    ubicacion: string;
    dispositivo: string;
    navegador: string;
  };
  metodo: 'WEB' | 'API' | 'MOBILE' | 'QR_SCANNER';
  duracion: number; // ms
}

export function HistoricoValidaciones() {
  const [filtroResultado, setFiltroResultado] = useState<string>('TODOS');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaDetalle, setVistaDetalle] = useState<Validacion | null>(null);

  // Mock data
  const validaciones: Validacion[] = [
    {
      id: 'VAL-2025-001',
      fechaHora: '2025-11-25T14:30:25',
      qrCode: 'ESAP-CERT-2025-ABC123',
      resultado: 'VALIDO',
      certificado: {
        consecutivo: '001-2025-TH',
        empleado: 'María Fernanda Rodríguez López',
        documento: '52.345.678'
      },
      origen: {
        ip: '190.85.123.45',
        ubicacion: 'Bogotá, Colombia',
        dispositivo: 'Desktop',
        navegador: 'Chrome 120.0'
      },
      metodo: 'WEB',
      duracion: 245
    },
    {
      id: 'VAL-2025-002',
      fechaHora: '2025-11-25T14:15:10',
      qrCode: 'ESAP-CERT-2025-XYZ789',
      resultado: 'INVALIDO',
      origen: {
        ip: '186.28.45.102',
        ubicacion: 'Medellín, Colombia',
        dispositivo: 'Mobile',
        navegador: 'Safari iOS 17.0'
      },
      metodo: 'QR_SCANNER',
      duracion: 180
    },
    {
      id: 'VAL-2025-003',
      fechaHora: '2025-11-25T13:45:33',
      qrCode: 'ESAP-CERT-2024-DEF456',
      resultado: 'VENCIDO',
      certificado: {
        consecutivo: '045-2024-TH',
        empleado: 'Carlos Alberto Martínez Gómez',
        documento: '79.876.543'
      },
      origen: {
        ip: '201.234.56.78',
        ubicacion: 'Cali, Colombia',
        dispositivo: 'Desktop',
        navegador: 'Firefox 121.0'
      },
      metodo: 'API',
      duracion: 320
    },
    {
      id: 'VAL-2025-004',
      fechaHora: '2025-11-25T12:20:15',
      qrCode: 'ESAP-CERT-2025-GHI789',
      resultado: 'VALIDO',
      certificado: {
        consecutivo: '002-2025-TH',
        empleado: 'Laura Patricia Sánchez Cruz',
        documento: '39.654.321'
      },
      origen: {
        ip: '179.123.45.67',
        ubicacion: 'Barranquilla, Colombia',
        dispositivo: 'Mobile',
        navegador: 'Chrome Android 120.0'
      },
      metodo: 'MOBILE',
      duracion: 290
    },
    {
      id: 'VAL-2025-005',
      fechaHora: '2025-11-25T11:10:45',
      qrCode: 'ESAP-CERT-2025-ANULADO',
      resultado: 'ANULADO',
      certificado: {
        consecutivo: '099-2025-TH',
        empleado: 'Jorge Enrique Pérez Vargas',
        documento: '80.123.456'
      },
      origen: {
        ip: '190.100.20.30',
        ubicacion: 'Cartagena, Colombia',
        dispositivo: 'Desktop',
        navegador: 'Edge 120.0'
      },
      metodo: 'WEB',
      duracion: 210
    }
  ];

  // Estadísticas
  const stats = {
    total: validaciones.length,
    validos: validaciones.filter(v => v.resultado === 'VALIDO').length,
    invalidos: validaciones.filter(v => v.resultado === 'INVALIDO').length,
    vencidos: validaciones.filter(v => v.resultado === 'VENCIDO').length,
    anulados: validaciones.filter(v => v.resultado === 'ANULADO').length,
    duracionPromedio: Math.round(
      validaciones.reduce((acc, v) => acc + v.duracion, 0) / validaciones.length
    )
  };

  // Filtrado
  const validacionesFiltradas = validaciones.filter(v => {
    const matchResultado = filtroResultado === 'TODOS' || v.resultado === filtroResultado;
    const matchMetodo = filtroMetodo === 'TODOS' || v.metodo === filtroMetodo;
    const matchBusqueda = !busqueda || 
      v.qrCode.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.certificado?.consecutivo.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.certificado?.empleado.toLowerCase().includes(busqueda.toLowerCase());
    
    return matchResultado && matchMetodo && matchBusqueda;
  });

  const getResultadoBadge = (resultado: Validacion['resultado']) => {
    const configs = {
      VALIDO: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      INVALIDO: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      VENCIDO: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertCircle },
      ANULADO: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle }
    };

    const config = configs[resultado];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} font-semibold`}>
        <Icon className="w-3 h-3 mr-1" />
        {resultado}
      </Badge>
    );
  };

  const getMetodoIcon = (metodo: Validacion['metodo']) => {
    switch (metodo) {
      case 'WEB': return <Globe className="w-4 h-4" />;
      case 'API': return <Activity className="w-4 h-4" />;
      case 'MOBILE': return <Users className="w-4 h-4" />;
      case 'QR_SCANNER': return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
              }}
            >
              <History className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 
                className="font-bold"
                style={{
                  fontSize: '32px',
                  lineHeight: '40px',
                  color: '#1F2937'
                }}
              >
                Histórico de Validaciones
              </h1>
              <p 
                className="text-gray-600"
                style={{
                  fontSize: '16px',
                  lineHeight: '24px'
                }}
              >
                Registro completo de todas las validaciones de certificados realizadas
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <History className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.validos}</p>
                  <p className="text-xs text-gray-600">Válidos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.invalidos}</p>
                  <p className="text-xs text-gray-600">Inválidos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.vencidos}</p>
                  <p className="text-xs text-gray-600">Vencidos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.anulados}</p>
                  <p className="text-xs text-gray-600">Anulados</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.duracionPromedio}ms</p>
                  <p className="text-xs text-gray-600">Promedio</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Filtros y Búsqueda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 mb-6 border-2">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="QR, consecutivo, empleado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Resultado
                </label>
                <Select value={filtroResultado} onValueChange={setFiltroResultado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="VALIDO">Válidos</SelectItem>
                    <SelectItem value="INVALIDO">Inválidos</SelectItem>
                    <SelectItem value="VENCIDO">Vencidos</SelectItem>
                    <SelectItem value="ANULADO">Anulados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Método
                </label>
                <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="WEB">Web</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="MOBILE">Mobile</SelectItem>
                    <SelectItem value="QR_SCANNER">QR Scanner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFiltroResultado('TODOS');
                    setFiltroMetodo('TODOS');
                    setBusqueda('');
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabla de Validaciones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-2 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Código QR
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Origen
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tiempo
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {validacionesFiltradas.map((validacion) => (
                    <tr key={validacion.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-gray-900">
                              {new Date(validacion.fechaHora).toLocaleDateString('es-CO')}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {new Date(validacion.fechaHora).toLocaleTimeString('es-CO')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {validacion.qrCode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getResultadoBadge(validacion.resultado)}
                      </td>
                      <td className="px-6 py-4">
                        {validacion.certificado ? (
                          <div>
                            <p className="text-sm text-gray-900">{validacion.certificado.empleado}</p>
                            <p className="text-xs text-gray-500">CC {validacion.certificado.documento}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-900">{validacion.origen.ubicacion}</p>
                            <p className="text-xs text-gray-500">{validacion.origen.ip}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMetodoIcon(validacion.metodo)}
                          <span className="text-sm text-gray-700">{validacion.metodo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {validacion.duracion}ms
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setVistaDetalle(validacion)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validacionesFiltradas.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron validaciones</p>
                <p className="text-gray-500 text-sm mt-1">Intenta ajustar los filtros</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Botón de Exportar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 flex justify-end"
        >
          <Button className="bg-[#003DA5] hover:bg-[#002873]">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte (CSV)
          </Button>
        </motion.div>
      </div>
    </div>
  );
}