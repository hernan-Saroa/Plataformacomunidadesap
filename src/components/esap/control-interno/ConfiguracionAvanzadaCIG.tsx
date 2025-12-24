/**
 * ============================================
 * RF019: CONFIGURACIÓN AVANZADA CIG
 * ============================================
 * 
 * Módulo complementario de configuración avanzada:
 * - Gestión de Usuarios del Sistema CIG
 * - Configuración de Procesos Auditables
 * - Parámetros Generales del Sistema
 * - Gestión de Territoriales
 * - Backup y Restauración
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Settings, Database, MapPin, Shield, Download,
  Upload, Save, Edit, Trash2, Plus, Search, Filter,
  CheckCircle2, XCircle, AlertTriangle, Clock, Building2,
  FileText, Calendar, HardDrive, RefreshCw, Eye, EyeOff,
  Key, Mail, Phone, Briefcase, Award, Code, Zap
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface UsuarioSistemaCIG {
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  rolCIG: 'Jefe OCI' | 'Auditor Líder' | 'Auditor Operativo' | 'Consultor';
  estado: 'Activo' | 'Inactivo' | 'Suspendido';
  fechaIngreso: string;
  ultimoAcceso: string;
  permisos: string[];
  territoriales: string[];
}

interface ProcesoAuditable {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  nivel: 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación';
  criticidad: 'Alta' | 'Media' | 'Baja';
  frecuenciaAuditoria: 'Anual' | 'Bienal' | 'Trienal';
  ultimaAuditoria?: string;
  activo: boolean;
}

interface ParametroSistema {
  id: string;
  categoria: string;
  parametro: string;
  valor: string;
  tipo: 'Texto' | 'Número' | 'Booleano' | 'Fecha';
  descripcion: string;
  modificable: boolean;
}

interface TerritorialConfig {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  director: string;
  email: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  auditoriaAnual: boolean;
}

// ============ DATOS MOCK ============

const USUARIOS_SISTEMA: UsuarioSistemaCIG[] = [
  {
    id: 'usr-001',
    nombre: 'Fernando Ávila García',
    email: 'fernando.avila@esap.edu.co',
    cargo: 'Jefe Oficina de Control Interno',
    rolCIG: 'Jefe OCI',
    estado: 'Activo',
    fechaIngreso: '2020-01-15',
    ultimoAcceso: '2025-12-22 14:30',
    permisos: ['Ver todo', 'Editar todo', 'Aprobar', 'Configurar'],
    territoriales: ['Todas']
  },
  {
    id: 'usr-002',
    nombre: 'Lucila Villamil Pérez',
    email: 'lucila.villamil@esap.edu.co',
    cargo: 'Profesional Especializado',
    rolCIG: 'Auditor Líder',
    estado: 'Activo',
    fechaIngreso: '2021-03-10',
    ultimoAcceso: '2025-12-22 11:15',
    permisos: ['Ver todo', 'Editar auditorías', 'Crear planes'],
    territoriales: ['Bogotá', 'Cundinamarca', 'Meta']
  },
  {
    id: 'usr-003',
    nombre: 'Natalia Cañón Ruiz',
    email: 'natalia.canon@esap.edu.co',
    cargo: 'Profesional Universitario',
    rolCIG: 'Auditor Operativo',
    estado: 'Activo',
    fechaIngreso: '2022-07-01',
    ultimoAcceso: '2025-12-21 16:45',
    permisos: ['Ver asignadas', 'Editar asignadas', 'Cargar evidencias'],
    territoriales: ['Antioquia', 'Valle']
  },
  {
    id: 'usr-004',
    nombre: 'Catalina Rubio Sánchez',
    email: 'catalina.rubio@esap.edu.co',
    cargo: 'Profesional Universitario',
    rolCIG: 'Auditor Operativo',
    estado: 'Activo',
    fechaIngreso: '2022-08-15',
    ultimoAcceso: '2025-12-22 09:20',
    permisos: ['Ver asignadas', 'Editar asignadas', 'Cargar evidencias'],
    territoriales: ['Atlántico', 'Bolívar']
  },
  {
    id: 'usr-005',
    nombre: 'Carlos Mendoza (Contratista)',
    email: 'carlos.mendoza.ext@esap.edu.co',
    cargo: 'Consultor Externo',
    rolCIG: 'Consultor',
    estado: 'Inactivo',
    fechaIngreso: '2024-01-10',
    ultimoAcceso: '2025-09-30 18:00',
    permisos: ['Ver asignadas'],
    territoriales: []
  }
];

const PROCESOS_AUDITABLES: ProcesoAuditable[] = [
  {
    id: 'proc-001',
    codigo: 'PROC-GF',
    nombre: 'Gestión Financiera',
    descripcion: 'Planificación, ejecución y control del presupuesto institucional',
    responsable: 'Dirección Financiera',
    nivel: 'Apoyo',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-11-15',
    activo: true
  },
  {
    id: 'proc-002',
    codigo: 'PROC-GA',
    nombre: 'Gestión Administrativa',
    descripcion: 'Administración de recursos físicos y servicios generales',
    responsable: 'Dirección Administrativa',
    nivel: 'Apoyo',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-10-20',
    activo: true
  },
  {
    id: 'proc-003',
    codigo: 'PROC-FV',
    nombre: 'Formación para la Vida',
    descripcion: 'Procesos académicos y de formación continua',
    responsable: 'Vicerrectoría Académica',
    nivel: 'Misional',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-09-10',
    activo: true
  },
  {
    id: 'proc-004',
    codigo: 'PROC-AB',
    nombre: 'Adquisición de Bienes y Servicios',
    descripcion: 'Contratación y adquisiciones institucionales',
    responsable: 'Dirección Administrativa',
    nivel: 'Apoyo',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-08-05',
    activo: true
  },
  {
    id: 'proc-005',
    codigo: 'PROC-TH',
    nombre: 'Gestión de Talento Humano',
    descripcion: 'Selección, vinculación y desarrollo del talento humano',
    responsable: 'Dirección de Talento Humano',
    nivel: 'Apoyo',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-07-12',
    activo: true
  },
  {
    id: 'proc-006',
    codigo: 'PROC-EI',
    nombre: 'Efectividad Institucional',
    descripcion: 'Planeación estratégica y seguimiento institucional',
    responsable: 'Oficina de Planeación',
    nivel: 'Estratégico',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Bienal',
    ultimaAuditoria: '2023-12-01',
    activo: true
  },
  {
    id: 'proc-007',
    codigo: 'PROC-ECM',
    nombre: 'Evaluación, Control y Mejora',
    descripcion: 'Sistema de gestión de calidad y mejora continua',
    responsable: 'Oficina de Calidad',
    nivel: 'Evaluación',
    criticidad: 'Media',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-06-20',
    activo: true
  },
  {
    id: 'proc-008',
    codigo: 'PROC-MSP',
    nombre: 'Modelo de Seguridad y Privacidad',
    descripcion: 'Seguridad de la información y protección de datos',
    responsable: 'Dirección TI',
    nivel: 'Apoyo',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-05-10',
    activo: true
  },
  {
    id: 'proc-009',
    codigo: 'PROC-TD',
    nombre: 'Transformación Digital',
    descripcion: 'Gestión de tecnologías y transformación digital',
    responsable: 'Dirección TI',
    nivel: 'Estratégico',
    criticidad: 'Alta',
    frecuenciaAuditoria: 'Anual',
    ultimaAuditoria: '2024-11-30',
    activo: true
  }
];

const PARAMETROS_SISTEMA: ParametroSistema[] = [
  {
    id: 'param-001',
    categoria: 'Auditorías',
    parametro: 'Duración mínima planeación (días)',
    valor: '5',
    tipo: 'Número',
    descripcion: 'Días mínimos para la fase de planeación',
    modificable: true
  },
  {
    id: 'param-002',
    categoria: 'Auditorías',
    parametro: 'Duración máxima ejecución sede (días)',
    valor: '30',
    tipo: 'Número',
    descripcion: 'Días máximos para ejecutar auditoría en sede',
    modificable: true
  },
  {
    id: 'param-003',
    categoria: 'Auditorías',
    parametro: 'Duración fija territorial (días)',
    valor: '4',
    tipo: 'Número',
    descripcion: 'Días fijos para auditorías territoriales',
    modificable: false
  },
  {
    id: 'param-004',
    categoria: 'Planes de Mejoramiento',
    parametro: 'Cortes trimestrales',
    valor: 'Jul, Oct, Ene, Abr',
    tipo: 'Texto',
    descripcion: 'Meses de corte para seguimiento trimestral',
    modificable: false
  },
  {
    id: 'param-005',
    categoria: 'Notificaciones',
    parametro: 'Días anticipación vencimiento',
    valor: '7',
    tipo: 'Número',
    descripcion: 'Días de anticipación para recordatorios',
    modificable: true
  },
  {
    id: 'param-006',
    categoria: 'Notificaciones',
    parametro: 'Email Jefe OCI',
    valor: 'jefe.oci@esap.edu.co',
    tipo: 'Texto',
    descripcion: 'Correo principal de la oficina',
    modificable: true
  },
  {
    id: 'param-007',
    categoria: 'Sistema',
    parametro: 'Año fiscal activo',
    valor: '2025',
    tipo: 'Número',
    descripcion: 'Año fiscal en operación',
    modificable: true
  },
  {
    id: 'param-008',
    categoria: 'Sistema',
    parametro: 'Modo mantenimiento',
    valor: 'false',
    tipo: 'Booleano',
    descripcion: 'Activar/desactivar modo mantenimiento',
    modificable: true
  }
];

const TERRITORIALES: TerritorialConfig[] = [
  { id: 't-001', codigo: 'TERR-ANT', nombre: 'Antioquia', ciudad: 'Medellín', director: 'Carlos Gómez', email: 'antioquia@esap.edu.co', telefono: '604-1234567', estado: 'Activo', auditoriaAnual: true },
  { id: 't-002', codigo: 'TERR-ATL', nombre: 'Atlántico-Cesar', ciudad: 'Barranquilla', director: 'María Pérez', email: 'atlantico@esap.edu.co', telefono: '605-2345678', estado: 'Activo', auditoriaAnual: true },
  { id: 't-003', codigo: 'TERR-BOL', nombre: 'Bolívar-Córdoba', ciudad: 'Cartagena', director: 'Juan López', email: 'bolivar@esap.edu.co', telefono: '605-3456789', estado: 'Activo', auditoriaAnual: true },
  { id: 't-004', codigo: 'TERR-CAL', nombre: 'Caldas', ciudad: 'Manizales', director: 'Ana Martínez', email: 'caldas@esap.edu.co', telefono: '606-4567890', estado: 'Activo', auditoriaAnual: true },
  { id: 't-005', codigo: 'TERR-CUN', nombre: 'Cundinamarca', ciudad: 'Fusagasugá', director: 'Pedro Ramírez', email: 'cundinamarca@esap.edu.co', telefono: '601-5678901', estado: 'Activo', auditoriaAnual: true },
  { id: 't-006', codigo: 'TERR-NAR', nombre: 'Nariño-Putumayo', ciudad: 'Pasto', director: 'Laura Torres', email: 'narino@esap.edu.co', telefono: '602-6789012', estado: 'Activo', auditoriaAnual: true },
  { id: 't-007', codigo: 'TERR-HUI', nombre: 'Huila', ciudad: 'Neiva', director: 'Diego Castro', email: 'huila@esap.edu.co', telefono: '608-7890123', estado: 'Activo', auditoriaAnual: true },
  { id: 't-008', codigo: 'TERR-MET', nombre: 'Meta', ciudad: 'Villavicencio', director: 'Sofía Vargas', email: 'meta@esap.edu.co', telefono: '608-8901234', estado: 'Activo', auditoriaAnual: true }
];

// ============ COMPONENTES ============

type TabConfigAvanzada = 'usuarios' | 'procesos' | 'parametros' | 'territoriales' | 'backup';

export function ConfiguracionAvanzadaCIG() {
  const [tabActiva, setTabActiva] = useState<TabConfigAvanzada>('usuarios');

  const tabs = [
    { id: 'usuarios' as TabConfigAvanzada, label: 'Usuarios CIG', icon: Users, badge: USUARIOS_SISTEMA.length },
    { id: 'procesos' as TabConfigAvanzada, label: 'Procesos Auditables', icon: Settings, badge: PROCESOS_AUDITABLES.length },
    { id: 'parametros' as TabConfigAvanzada, label: 'Parámetros', icon: Code, badge: PARAMETROS_SISTEMA.length },
    { id: 'territoriales' as TabConfigAvanzada, label: 'Territoriales', icon: MapPin, badge: TERRITORIALES.length },
    { id: 'backup' as TabConfigAvanzada, label: 'Backup & Logs', icon: Database, badge: undefined }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <Card className="p-6 border-2" style={{ borderColor: '#003DA5' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: '#003DA5' }}
            >
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración Avanzada</h1>
              <p className="text-sm text-gray-500">Control Interno de Gestión - Parámetros del Sistema</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <Badge className={isActive ? 'bg-blue-700' : 'bg-gray-200 text-gray-700'}>
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {tabActiva === 'usuarios' && <SeccionUsuarios />}
            {tabActiva === 'procesos' && <SeccionProcesos />}
            {tabActiva === 'parametros' && <SeccionParametros />}
            {tabActiva === 'territoriales' && <SeccionTerritoriales />}
            {tabActiva === 'backup' && <SeccionBackup />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

// ============ SECCIONES ============

function SeccionUsuarios() {
  const [usuarios] = useState(USUARIOS_SISTEMA);
  const [busqueda, setBusqueda] = useState('');

  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Usuarios del Sistema CIG</h2>
          <p className="text-sm text-gray-500">Gestión de accesos y permisos</p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Usuario</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Rol CIG</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Estado</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Último Acceso</th>
              <th className="text-center p-3 text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((usuario) => (
              <tr key={usuario.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div>
                    <p className="font-medium text-gray-900">{usuario.nombre}</p>
                    <p className="text-sm text-gray-500">{usuario.email}</p>
                    <p className="text-xs text-gray-400">{usuario.cargo}</p>
                  </div>
                </td>
                <td className="p-3">
                  <Badge 
                    className={
                      usuario.rolCIG === 'Jefe OCI' ? 'bg-red-100 text-red-700' :
                      usuario.rolCIG === 'Auditor Líder' ? 'bg-blue-100 text-blue-700' :
                      usuario.rolCIG === 'Auditor Operativo' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }
                  >
                    {usuario.rolCIG}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge 
                    className={
                      usuario.estado === 'Activo' ? 'bg-green-100 text-green-700' :
                      usuario.estado === 'Suspendido' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }
                  >
                    {usuario.estado}
                  </Badge>
                </td>
                <td className="p-3">
                  <p className="text-sm text-gray-700">{usuario.ultimoAcceso}</p>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SeccionProcesos() {
  const [procesos] = useState(PROCESOS_AUDITABLES);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Procesos Auditables</h2>
          <p className="text-sm text-gray-500">9 procesos registrados en el universo de auditorías</p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Proceso
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {procesos.map((proceso) => (
          <Card key={proceso.id} className="p-4 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    {proceso.codigo}
                  </Badge>
                  <Badge 
                    className={`text-xs ${
                      proceso.criticidad === 'Alta' ? 'bg-red-100 text-red-700' :
                      proceso.criticidad === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}
                  >
                    {proceso.criticidad}
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{proceso.nombre}</h3>
                <p className="text-sm text-gray-600 mb-2">{proceso.descripcion}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{proceso.responsable}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{proceso.frecuenciaAuditoria}</span>
                  </div>
                </div>
                {proceso.ultimaAuditoria && (
                  <p className="text-xs text-gray-400 mt-1">
                    Última auditoría: {proceso.ultimaAuditoria}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm">
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

function SeccionParametros() {
  const [parametros] = useState(PARAMETROS_SISTEMA);

  const categorias = [...new Set(parametros.map(p => p.categoria))];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Parámetros del Sistema</h2>
          <p className="text-sm text-gray-500">Configuración general del módulo CIG</p>
        </div>
        <Button 
          onClick={() => toast.success('Parámetros guardados exitosamente')}
          style={{ background: '#10B981' }}
        >
          <Save className="w-4 h-4 mr-1" />
          Guardar Cambios
        </Button>
      </div>

      {categorias.map((categoria) => (
        <div key={categoria} className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b" style={{ borderColor: '#003DA5' }}>
            {categoria}
          </h3>
          <div className="space-y-3">
            {parametros
              .filter(p => p.categoria === categoria)
              .map((param) => (
                <div key={param.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{param.parametro}</p>
                    <p className="text-sm text-gray-500 mb-2">{param.descripcion}</p>
                    <input
                      type={param.tipo === 'Número' ? 'number' : 'text'}
                      defaultValue={param.valor}
                      disabled={!param.modificable}
                      className={`
                        px-3 py-1 border rounded text-sm
                        ${param.modificable 
                          ? 'border-gray-300 bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                        }
                      `}
                    />
                  </div>
                  {!param.modificable && (
                    <Badge className="bg-gray-200 text-gray-600 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Bloqueado
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

function SeccionTerritoriales() {
  const [territoriales] = useState(TERRITORIALES);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Territoriales ESAP</h2>
          <p className="text-sm text-gray-500">16 sedes territoriales activas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {territoriales.map((terr) => (
          <Card key={terr.id} className="p-4 border hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{terr.nombre}</h3>
                  <p className="text-xs text-gray-500">{terr.codigo}</p>
                </div>
              </div>
              <Badge className={terr.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                {terr.estado}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{terr.ciudad}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{terr.director}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-xs">{terr.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{terr.telefono}</span>
              </div>
            </div>
            {terr.auditoriaAnual && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Auditoría anual programada</span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
}

function SeccionBackup() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Backup y Logs del Sistema</h2>
        <p className="text-sm text-gray-500">Copias de seguridad y registros de auditoría</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup */}
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Backup de Datos</h3>
              <p className="text-sm text-gray-600">Última copia: Hoy 02:00 AM</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => toast.success('Generando backup completo...')}
              style={{ background: '#003DA5' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Generar Backup Completo
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => toast.info('Abriendo selector de archivo...')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Restaurar desde Backup
            </Button>
          </div>
          <div className="mt-4 p-3 bg-white rounded text-xs text-gray-600">
            <p className="font-semibold mb-1">Backups automáticos:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Diario: 02:00 AM</li>
              <li>Semanal: Domingo 03:00 AM</li>
              <li>Mensual: Primer día del mes</li>
            </ul>
          </div>
        </Card>

        {/* Logs */}
        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Logs de Auditoría</h3>
              <p className="text-sm text-gray-600">Registro de actividad del sistema</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => toast.info('Exportando logs de actividad...')}
              style={{ background: '#8B5CF6' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Logs (30 días)
            </Button>
            <Button className="w-full" variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Ver Logs en Tiempo Real
            </Button>
          </div>
          <div className="mt-4 p-3 bg-white rounded text-xs text-gray-600">
            <p className="font-semibold mb-2">Actividad reciente:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>• Login exitoso</span>
                <span className="text-gray-400">Hace 5 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Auditoría editada</span>
                <span className="text-gray-400">Hace 12 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Reporte generado</span>
                <span className="text-gray-400">Hace 1 hora</span>
              </div>
            </div>
          </div>
        </Card>

      </div>

      {/* Estadísticas */}
      <Card className="p-4 mt-6 bg-gray-50">
        <h3 className="font-bold text-gray-900 mb-4">Estadísticas del Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">5</p>
            <p className="text-sm text-gray-600">Usuarios Activos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">20</p>
            <p className="text-sm text-gray-600">Auditorías 2025</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">58</p>
            <p className="text-sm text-gray-600">Hallazgos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">12</p>
            <p className="text-sm text-gray-600">Planes Mejora</p>
          </div>
        </div>
      </Card>
    </Card>
  );
}
