/**
 * ════════════════════════════════════════════════════════════════════════════
 * GESTIÓN DE USUARIOS - TRACKING DE CONTRASEÑAS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Módulo administrativo para monitorear el estado de contraseñas de usuarios.
 * Permite ver tiempo restante, enviar recordatorios y gestionar vencimientos.
 * 
 * POLÍTICA: Vigencia 180 días (6 meses)
 * ALERTAS: 30 días antes del vencimiento
 * VENCIMIENTO: Activa flujo de recuperación automático
 * 
 * FECHA: 29 Diciembre 2024
 */

import { useState, useMemo } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import {
  Search, Filter, Clock, AlertTriangle, CheckCircle, XCircle,
  Mail, RefreshCw, Download, Eye, Users, Calendar, Shield,
  TrendingDown, AlertCircle as AlertIcon, User, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  documento: string;
  fechaUltimoCambio: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'BLOQUEADA';
  ultimoAcceso?: Date;
  cambiosHistorico: number;
}

// Mock data de usuarios
const usuariosMock: Usuario[] = [
  {
    id: 'USR-001',
    nombre: 'María',
    apellido: 'Fernández',
    email: 'maria.fernandez@esap.edu.co',
    rol: 'Coordinadora Jurídica',
    documento: '52123456',
    fechaUltimoCambio: new Date('2024-12-01'),
    fechaVencimiento: new Date('2025-05-30'),
    diasRestantes: 152,
    estado: 'VIGENTE',
    ultimoAcceso: new Date('2024-12-28'),
    cambiosHistorico: 3
  },
  {
    id: 'USR-002',
    nombre: 'Carlos',
    apellido: 'Méndez',
    email: 'carlos.mendez@esap.edu.co',
    rol: 'Abogado Senior',
    documento: '79456789',
    fechaUltimoCambio: new Date('2024-07-15'),
    fechaVencimiento: new Date('2025-01-11'),
    diasRestantes: 13,
    estado: 'POR_VENCER',
    ultimoAcceso: new Date('2024-12-29'),
    cambiosHistorico: 5
  },
  {
    id: 'USR-003',
    nombre: 'Laura',
    apellido: 'González',
    email: 'laura.gonzalez@esap.edu.co',
    rol: 'Analista Jurídica',
    documento: '1023456789',
    fechaUltimoCambio: new Date('2024-06-10'),
    fechaVencimiento: new Date('2024-12-07'),
    diasRestantes: -22,
    estado: 'VENCIDA',
    ultimoAcceso: new Date('2024-12-15'),
    cambiosHistorico: 2
  },
  {
    id: 'USR-004',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@esap.edu.co',
    rol: 'Director Jurídico',
    documento: '80123456',
    fechaUltimoCambio: new Date('2024-11-20'),
    fechaVencimiento: new Date('2025-05-19'),
    diasRestantes: 141,
    estado: 'VIGENTE',
    ultimoAcceso: new Date('2024-12-29'),
    cambiosHistorico: 8
  },
  {
    id: 'USR-005',
    nombre: 'Ana',
    apellido: 'López',
    email: 'ana.lopez@esap.edu.co',
    rol: 'Auxiliar Jurídica',
    documento: '1012345678',
    fechaUltimoCambio: new Date('2024-08-01'),
    fechaVencimiento: new Date('2025-01-28'),
    diasRestantes: 30,
    estado: 'POR_VENCER',
    ultimoAcceso: new Date('2024-12-27'),
    cambiosHistorico: 1
  },
  {
    id: 'USR-006',
    nombre: 'Patricia',
    apellido: 'Silva',
    email: 'patricia.silva@esap.edu.co',
    rol: 'Abogada',
    documento: '52987654',
    fechaUltimoCambio: new Date('2024-05-20'),
    fechaVencimiento: new Date('2024-11-16'),
    diasRestantes: -43,
    estado: 'VENCIDA',
    ultimoAcceso: new Date('2024-11-10'),
    cambiosHistorico: 4
  },
  {
    id: 'USR-007',
    nombre: 'Roberto',
    apellido: 'García',
    email: 'roberto.garcia@esap.edu.co',
    rol: 'Coordinador Regional',
    documento: '79852147',
    fechaUltimoCambio: new Date('2024-10-15'),
    fechaVencimiento: new Date('2025-04-13'),
    diasRestantes: 105,
    estado: 'VIGENTE',
    ultimoAcceso: new Date('2024-12-29'),
    cambiosHistorico: 6
  }
];

export function GestionUsuariosPasswordTracking() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [usuarios] = useState<Usuario[]>(usuariosMock);

  // Filtrar usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(usuario => {
      const cumpleBusqueda = 
        usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        usuario.documento.includes(busqueda);
      
      const cumpleEstado = filtroEstado === 'TODOS' || usuario.estado === filtroEstado;
      
      return cumpleBusqueda && cumpleEstado;
    });
  }, [usuarios, busqueda, filtroEstado]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: usuarios.length,
      vigentes: usuarios.filter(u => u.estado === 'VIGENTE').length,
      porVencer: usuarios.filter(u => u.estado === 'POR_VENCER').length,
      vencidas: usuarios.filter(u => u.estado === 'VENCIDA').length,
      bloqueadas: usuarios.filter(u => u.estado === 'BLOQUEADA').length
    };
  }, [usuarios]);

  const handleEnviarRecordatorio = (usuario: Usuario) => {
    toast.success('Recordatorio enviado', {
      description: `Email enviado a ${usuario.email}`,
      icon: <Mail className="w-4 h-4" />
    });
  };

  const handleEnviarRecordatorioMasivo = () => {
    const usuariosParaNotificar = usuarios.filter(u => 
      u.estado === 'POR_VENCER' || u.estado === 'VENCIDA'
    );
    
    toast.success('Recordatorios masivos enviados', {
      description: `${usuariosParaNotificar.length} notificaciones enviadas`,
      icon: <Send className="w-4 h-4" />
    });
  };

  const handleForzarCambio = (usuario: Usuario) => {
    toast.info('Cambio de contraseña forzado', {
      description: `${usuario.nombre} deberá cambiar su contraseña en el próximo inicio de sesión`,
      icon: <Shield className="w-4 h-4" />
    });
  };

  const handleExportar = () => {
    toast.success('Reporte exportado', {
      description: 'Estado de contraseñas descargado en Excel',
      icon: <Download className="w-4 h-4" />
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Shield className="w-6 h-6 text-[#003DA5]" />
            </div>
            Gestión de Contraseñas de Usuarios
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitoreo y control de vigencia de contraseñas • Política: 180 días
          </p>
        </div>
        <Button
          onClick={handleExportar}
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border-2 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-gray-600" />
            <Badge className="bg-gray-100 text-gray-700">Total</Badge>
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-600 mt-1">Usuarios registrados</p>
        </Card>

        <Card className="p-4 bg-green-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <Badge className="bg-green-100 text-green-700">Vigentes</Badge>
          </div>
          <p className="text-3xl font-black text-green-900">{stats.vigentes}</p>
          <p className="text-xs text-green-700 mt-1">Contraseñas activas</p>
        </Card>

        <Card className="p-4 bg-yellow-50 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <Badge className="bg-yellow-100 text-yellow-700">Alerta</Badge>
          </div>
          <p className="text-3xl font-black text-yellow-900">{stats.porVencer}</p>
          <p className="text-xs text-yellow-700 mt-1">Por vencer (≤30 días)</p>
        </Card>

        <Card className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <Badge className="bg-red-100 text-red-700">Vencidas</Badge>
          </div>
          <p className="text-3xl font-black text-red-900">{stats.vencidas}</p>
          <p className="text-xs text-red-700 mt-1">Requieren cambio</p>
        </Card>

        <Card className="p-4 bg-orange-50 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-5 h-5 text-orange-600" />
            <Badge className="bg-orange-100 text-orange-700">Bloqueadas</Badge>
          </div>
          <p className="text-3xl font-black text-orange-900">{stats.bloqueadas}</p>
          <p className="text-xs text-orange-700 mt-1">Acceso suspendido</p>
        </Card>
      </div>

      {/* Alerta de acciones requeridas */}
      {(stats.porVencer > 0 || stats.vencidas > 0) && (
        <Card className="p-4 bg-orange-50 border-2 border-orange-300">
          <div className="flex items-start gap-3">
            <AlertIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 mb-1">
                ⚠️ Acción Requerida: {stats.porVencer + stats.vencidas} usuarios necesitan atención
              </h3>
              <p className="text-sm text-orange-800 mb-3">
                {stats.vencidas > 0 && `${stats.vencidas} contraseñas vencidas deben ser restablecidas. `}
                {stats.porVencer > 0 && `${stats.porVencer} contraseñas vencerán en los próximos 30 días.`}
              </p>
              <Button
                onClick={handleEnviarRecordatorioMasivo}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Send className="w-3 h-3 mr-2" />
                Enviar Recordatorios Masivos
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros y búsqueda */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o documento..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroEstado === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('TODOS')}
            >
              Todos ({stats.total})
            </Button>
            <Button
              variant={filtroEstado === 'VIGENTE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('VIGENTE')}
              className={filtroEstado === 'VIGENTE' ? 'bg-green-600' : ''}
            >
              Vigentes ({stats.vigentes})
            </Button>
            <Button
              variant={filtroEstado === 'POR_VENCER' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('POR_VENCER')}
              className={filtroEstado === 'POR_VENCER' ? 'bg-yellow-600' : ''}
            >
              Por Vencer ({stats.porVencer})
            </Button>
            <Button
              variant={filtroEstado === 'VENCIDA' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado('VENCIDA')}
              className={filtroEstado === 'VENCIDA' ? 'bg-red-600' : ''}
            >
              Vencidas ({stats.vencidas})
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de usuarios */}
      <div className="space-y-3">
        {usuariosFiltrados.map((usuario) => (
          <TarjetaUsuario
            key={usuario.id}
            usuario={usuario}
            onEnviarRecordatorio={handleEnviarRecordatorio}
            onForzarCambio={handleForzarCambio}
          />
        ))}

        {usuariosFiltrados.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">No se encontraron usuarios</p>
            <p className="text-xs text-gray-500 mt-1">Intenta con otros criterios de búsqueda</p>
          </Card>
        )}
      </div>

      {/* Información de política */}
      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          📋 Política de Contraseñas ESAP 2025
        </h3>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Vigencia:</strong> 180 días (6 meses) desde el último cambio</li>
          <li><strong>Alerta temprana:</strong> Notificación automática 30 días antes del vencimiento</li>
          <li><strong>Vencimiento:</strong> Al vencer, se activa automáticamente el flujo "¿Olvidaste tu contraseña?"</li>
          <li><strong>Recordatorios:</strong> Emails a los 30, 15, 7 y 3 días antes del vencimiento</li>
          <li><strong>Bloqueo:</strong> Usuarios con contraseñas vencidas no pueden acceder hasta restablecer</li>
          <li><strong>Historial:</strong> No se permite reutilizar las últimas 3 contraseñas</li>
        </ul>
      </Card>
    </div>
  );
}

// Componente Tarjeta de Usuario
interface TarjetaUsuarioProps {
  usuario: Usuario;
  onEnviarRecordatorio: (usuario: Usuario) => void;
  onForzarCambio: (usuario: Usuario) => void;
}

function TarjetaUsuario({ usuario, onEnviarRecordatorio, onForzarCambio }: TarjetaUsuarioProps) {
  const getEstadoConfig = (estado: Usuario['estado']) => {
    switch (estado) {
      case 'VIGENTE':
        return {
          color: '#10B981',
          bg: 'bg-green-50',
          border: 'border-green-200',
          textColor: 'text-green-700',
          label: '✅ Vigente',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'POR_VENCER':
        return {
          color: '#F59E0B',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          textColor: 'text-yellow-700',
          label: '⚠️ Por Vencer',
          icon: <Clock className="w-4 h-4" />
        };
      case 'VENCIDA':
        return {
          color: '#DC2626',
          bg: 'bg-red-50',
          border: 'border-red-200',
          textColor: 'text-red-700',
          label: '🚨 Vencida',
          icon: <AlertTriangle className="w-4 h-4" />
        };
      case 'BLOQUEADA':
        return {
          color: '#EA580C',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          textColor: 'text-orange-700',
          label: '🔒 Bloqueada',
          icon: <XCircle className="w-4 h-4" />
        };
    }
  };

  const estadoConfig = getEstadoConfig(usuario.estado);
  const porcentajeVida = Math.min(100, Math.max(0, ((180 + usuario.diasRestantes) / 180) * 100));

  return (
    <Card className={`p-4 border-2 ${estadoConfig.border} ${estadoConfig.bg} hover:shadow-md transition-shadow`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Información del usuario */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-full border-2" style={{ borderColor: estadoConfig.color }}>
              <User className="w-5 h-5" style={{ color: estadoConfig.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate">
                {usuario.nombre} {usuario.apellido}
              </h3>
              <p className="text-xs text-gray-600 truncate">{usuario.rol}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-600">
              <strong>Email:</strong> {usuario.email}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Doc:</strong> {usuario.documento}
            </p>
          </div>
        </div>

        {/* Estado y progreso */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <Badge className={`${estadoConfig.textColor} flex items-center gap-1`}>
              {estadoConfig.icon}
              {estadoConfig.label}
            </Badge>
            <span className={`text-xs font-bold ${estadoConfig.textColor}`}>
              {usuario.diasRestantes >= 0 
                ? `${usuario.diasRestantes} días restantes`
                : `Vencida hace ${Math.abs(usuario.diasRestantes)} días`
              }
            </span>
          </div>
          
          <div className="space-y-1">
            <Progress 
              value={porcentajeVida} 
              className="h-3"
            />
            <style jsx>{`
              [role="progressbar"] > div {
                background-color: ${estadoConfig.color} !important;
              }
            `}</style>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Vida útil: {Math.round(porcentajeVida)}%</span>
              <span>180 días total</span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-white rounded border">
              <p className="text-gray-500">Último cambio:</p>
              <p className="font-bold text-gray-900">
                {usuario.fechaUltimoCambio.toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="p-2 bg-white rounded border">
              <p className="text-gray-500">Vencimiento:</p>
              <p className="font-bold text-gray-900">
                {usuario.fechaVencimiento.toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="lg:col-span-2">
          <div className="space-y-2">
            <div className="p-2 bg-white rounded border text-center">
              <Calendar className="w-4 h-4 text-gray-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Último acceso:</p>
              <p className="text-xs font-bold text-gray-900">
                {usuario.ultimoAcceso?.toLocaleDateString('es-CO') || 'Nunca'}
              </p>
            </div>
            <div className="p-2 bg-white rounded border text-center">
              <RefreshCw className="w-4 h-4 text-gray-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Cambios totales:</p>
              <p className="text-xs font-bold text-gray-900">{usuario.cambiosHistorico}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-2">
            {(usuario.estado === 'POR_VENCER' || usuario.estado === 'VENCIDA') && (
              <Button
                onClick={() => onEnviarRecordatorio(usuario)}
                size="sm"
                variant="outline"
                className="w-full justify-start"
              >
                <Mail className="w-3 h-3 mr-2" />
                Enviar Recordatorio
              </Button>
            )}
            
            <Button
              onClick={() => onForzarCambio(usuario)}
              size="sm"
              variant="outline"
              className="w-full justify-start"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Forzar Cambio
            </Button>

            <Button
              onClick={() => toast.info('Ver historial', { description: usuario.email })}
              size="sm"
              variant="outline"
              className="w-full justify-start"
            >
              <Eye className="w-3 h-3 mr-2" />
              Ver Historial
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
