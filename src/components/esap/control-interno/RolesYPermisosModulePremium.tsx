/**
 * ROLES Y PERMISOS - VERSIÓN PREMIUM
 * Sistema RBAC para Control Interno
 * VERSIÓN: 3.0 - PREMIUM
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Key, Lock, UserCheck, Settings, HelpCircle,
  Book, Mail, Phone, ExternalLink, Plus, Edit2, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from './HeaderModuloCIG';

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  usuariosCount: number;
  permisos: string[];
  nivel: 'ADMIN' | 'JEFE' | 'AUDITOR' | 'CONSULTA';
  activo: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  area: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimoAcceso: string;
}

type VistaActual = 'roles' | 'usuarios' | 'permisos' | 'soporte';

const ROLES_MOCK: Rol[] = [
  { id: 'r1', nombre: 'Jefe OCI', descripcion: 'Control total del sistema', usuariosCount: 1, permisos: ['*'], nivel: 'ADMIN', activo: true },
  { id: 'r2', nombre: 'Profesional Auditor', descripcion: 'Gestión de auditorías', usuariosCount: 3, permisos: ['auditorias:write', 'planes:write'], nivel: 'AUDITOR', activo: true },
  { id: 'r3', nombre: 'Consulta', descripcion: 'Solo lectura', usuariosCount: 12, permisos: ['read:all'], nivel: 'CONSULTA', activo: true }
];

const USUARIOS_MOCK: Usuario[] = [
  { id: 'u1', nombre: 'Fernando Ávila', email: 'favila@esap.edu.co', rol: 'Jefe OCI', area: 'Control Interno', estado: 'ACTIVO', ultimoAcceso: '2025-02-24' },
  { id: 'u2', nombre: 'María Rodríguez', email: 'mrodriguez@esap.edu.co', rol: 'Profesional Auditor', area: 'Control Interno', estado: 'ACTIVO', ultimoAcceso: '2025-02-23' },
  { id: 'u3', nombre: 'Carlos Gómez', email: 'cgomez@esap.edu.co', rol: 'Consulta', area: 'Talento Humano', estado: 'ACTIVO', ultimoAcceso: '2025-02-20' }
];

export function RolesYPermisosModulePremium() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('roles');

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG titulo="Roles y Permisos" subtitulo="Control Interno de Gestión" />

      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="mx-auto px-8 max-w-[1920px]">
          <div className="flex gap-1">
            <TabButton active={vistaActiva === 'roles'} onClick={() => setVistaActiva('roles')} icon={<Shield className="w-4 h-4" />} label="Roles" badge={ROLES_MOCK.length.toString()} />
            <TabButton active={vistaActiva === 'usuarios'} onClick={() => setVistaActiva('usuarios')} icon={<Users className="w-4 h-4" />} label="Usuarios" badge={USUARIOS_MOCK.length.toString()} />
            <TabButton active={vistaActiva === 'permisos'} onClick={() => setVistaActiva('permisos')} icon={<Key className="w-4 h-4" />} label="Permisos" />
            <TabButton active={vistaActiva === 'soporte'} onClick={() => setVistaActiva('soporte')} icon={<HelpCircle className="w-4 h-4" />} label="Soporte" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={vistaActiva} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {vistaActiva === 'roles' && <VistaRoles />}
          {vistaActiva === 'usuarios' && <VistaUsuarios />}
          {vistaActiva === 'permisos' && <VistaPermisos />}
          {vistaActiva === 'soporte' && <VistaSoporte />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: any) {
  return (
    <button onClick={onClick} className={`relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${active ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
      {icon}
      {label}
      {badge && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'}`}>{badge}</span>}
    </button>
  );
}

function VistaRoles() {
  const stats = useMemo(() => ({
    total: ROLES_MOCK.length,
    admin: ROLES_MOCK.filter(r => r.nivel === 'ADMIN').length,
    auditor: ROLES_MOCK.filter(r => r.nivel === 'AUDITOR').length,
    consulta: ROLES_MOCK.filter(r => r.nivel === 'CONSULTA').length
  }), []);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl text-gray-900 font-medium mb-1">Gestión de Roles</h2><p className="text-sm text-gray-600">Control de acceso basado en roles (RBAC)</p></div>
          <button className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"><Plus className="w-4 h-4" />Crear Rol</button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"><div className="text-xs text-blue-700 mb-1">Total Roles</div><div className="text-2xl font-semibold text-blue-900">{stats.total}</div></div>
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200"><div className="text-xs text-red-700 mb-1">Administradores</div><div className="text-2xl font-semibold text-red-900">{stats.admin}</div></div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200"><div className="text-xs text-green-700 mb-1">Auditores</div><div className="text-2xl font-semibold text-green-900">{stats.auditor}</div></div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200"><div className="text-xs text-gray-700 mb-1">Consulta</div><div className="text-2xl font-semibold text-gray-900">{stats.consulta}</div></div>
        </div>
      </div>

      <div className="space-y-4">
        {ROLES_MOCK.map(rol => (
          <div key={rol.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base text-gray-900 font-medium">{rol.nombre}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${rol.nivel === 'ADMIN' ? 'bg-red-100 text-red-700' : rol.nivel === 'AUDITOR' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{rol.nivel}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{rol.descripcion}</p>
                <div className="text-xs text-gray-600">Usuarios asignados: <span className="font-medium text-gray-900">{rol.usuariosCount}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"><Edit2 className="w-4 h-4" />Editar</button>
                <button className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"><Eye className="w-4 h-4" />Ver Detalle</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaUsuarios() {
  const stats = useMemo(() => ({
    total: USUARIOS_MOCK.length,
    activos: USUARIOS_MOCK.filter(u => u.estado === 'ACTIVO').length,
    inactivos: USUARIOS_MOCK.filter(u => u.estado === 'INACTIVO').length
  }), []);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl text-gray-900 font-medium mb-1">Gestión de Usuarios</h2><p className="text-sm text-gray-600">Administración de accesos al sistema</p></div>
          <button className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"><Plus className="w-4 h-4" />Crear Usuario</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"><div className="text-xs text-blue-700 mb-1">Total Usuarios</div><div className="text-2xl font-semibold text-blue-900">{stats.total}</div></div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200"><div className="text-xs text-green-700 mb-1">Activos</div><div className="text-2xl font-semibold text-green-900">{stats.activos}</div></div>
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200"><div className="text-xs text-red-700 mb-1">Inactivos</div><div className="text-2xl font-semibold text-red-900">{stats.inactivos}</div></div>
        </div>
      </div>

      <div className="space-y-4">
        {USUARIOS_MOCK.map(usuario => (
          <div key={usuario.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base text-gray-900 font-medium">{usuario.nombre}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${usuario.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{usuario.estado}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                  <div><span className="text-gray-600">Email:</span> <span className="ml-2 text-gray-900">{usuario.email}</span></div>
                  <div><span className="text-gray-600">Rol:</span> <span className="ml-2 text-gray-900">{usuario.rol}</span></div>
                  <div><span className="text-gray-600">Área:</span> <span className="ml-2 text-gray-900">{usuario.area}</span></div>
                </div>
                <div className="text-xs text-gray-600">Último acceso: {usuario.ultimoAcceso}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"><Edit2 className="w-4 h-4" />Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VistaPermisos() {
  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl text-gray-900 font-medium mb-6">Matriz de Permisos</h2>
        <div className="text-center py-12"><Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-base text-gray-900 mb-2">Matriz de Permisos</h3><p className="text-sm text-gray-600">Configuración detallada de permisos por módulo</p></div>
      </div>
    </div>
  );
}

function VistaSoporte() {
  return (
    <div className="mx-auto px-8 py-8 max-w-[1800px]">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Book className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Documentación</h3><p className="text-sm text-gray-600 mb-4">Guías de seguridad</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" />Descargar</button></div>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Correo</h3><p className="text-sm text-gray-600 mb-4">controlinterno@esap.edu.co</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" />Contactar</button></div>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200"><div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><Phone className="w-7 h-7 text-[#1e5da8]" /></div><h3 className="text-base text-gray-900 mb-2 font-medium">Teléfono</h3><p className="text-sm text-gray-600 mb-4">Ext. 2450 - 2451</p><button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"><Phone className="w-4 h-4" />Llamar</button></div>
      </div>
    </div>
  );
}
