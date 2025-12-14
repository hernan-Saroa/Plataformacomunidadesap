/**
 * Submódulo: Aplicaciones a Convocatorias Docentes
 * 
 * Gestiona postulaciones recibidas (acceso abierto - no requiere registro previo)
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Mail,
  Phone,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Aplicacion {
  id: string;
  convocatoria: string;
  codigoConvocatoria: string;
  aspirante: {
    nombre: string;
    email: string;
    telefono: string;
    cedula: string;
    esUsuarioRegistrado: boolean; // Indica si es usuario de la plataforma o aplicación anónima
  };
  fechaAplicacion: string;
  estado: 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada' | 'Documentación Incompleta';
  documentosSubidos: number;
  documentosRequeridos: number;
  puntaje?: number;
}

export function TeacherCallsApplicationsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todas');
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<string>('todas');

  // Mock data - Aplicaciones abiertas (con y sin registro)
  const aplicaciones: Aplicacion[] = [
    {
      id: '1',
      convocatoria: 'Docente de Administración Pública',
      codigoConvocatoria: 'CONV-2024-001',
      aspirante: {
        nombre: 'María Fernanda López',
        email: 'mf.lopez@gmail.com',
        telefono: '310 456 7890',
        cedula: '1023456789',
        esUsuarioRegistrado: false // Aplicación abierta sin registro
      },
      fechaAplicacion: '2024-11-18',
      estado: 'Pendiente',
      documentosSubidos: 7,
      documentosRequeridos: 8
    },
    {
      id: '2',
      convocatoria: 'Docente de Administración Pública',
      codigoConvocatoria: 'CONV-2024-001',
      aspirante: {
        nombre: 'Carlos Alberto Ramírez',
        email: 'carlos.ramirez@esap.edu.co',
        telefono: '315 234 5678',
        cedula: '79456123',
        esUsuarioRegistrado: true // Usuario registrado en la plataforma
      },
      fechaAplicacion: '2024-11-17',
      estado: 'En Revisión',
      documentosSubidos: 8,
      documentosRequeridos: 8,
      puntaje: 85
    },
    {
      id: '3',
      convocatoria: 'Docente de Derecho Constitucional',
      codigoConvocatoria: 'CONV-2024-002',
      aspirante: {
        nombre: 'Ana Patricia Gómez',
        email: 'ap.gomez@outlook.com',
        telefono: '320 567 8901',
        cedula: '52789456',
        esUsuarioRegistrado: false
      },
      fechaAplicacion: '2024-11-16',
      estado: 'Aprobada',
      documentosSubidos: 6,
      documentosRequeridos: 6,
      puntaje: 92
    },
    {
      id: '4',
      convocatoria: 'Docente de Administración Pública',
      codigoConvocatoria: 'CONV-2024-001',
      aspirante: {
        nombre: 'Jorge Luis Martínez',
        email: 'jl.martinez@yahoo.com',
        telefono: '312 678 9012',
        cedula: '80123456',
        esUsuarioRegistrado: false
      },
      fechaAplicacion: '2024-11-15',
      estado: 'Documentación Incompleta',
      documentosSubidos: 5,
      documentosRequeridos: 8
    },
    {
      id: '5',
      convocatoria: 'Docente de Derecho Constitucional',
      codigoConvocatoria: 'CONV-2024-002',
      aspirante: {
        nombre: 'Sandra Milena Torres',
        email: 'sandra.torres@esap.edu.co',
        telefono: '318 789 0123',
        cedula: '63456789',
        esUsuarioRegistrado: true
      },
      fechaAplicacion: '2024-11-14',
      estado: 'En Revisión',
      documentosSubidos: 6,
      documentosRequeridos: 6,
      puntaje: 78
    },
  ];

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      'Pendiente': {
        className: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Clock className="w-3 h-3" />
      },
      'En Revisión': {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <AlertCircle className="w-3 h-3" />
      },
      'Aprobada': {
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />
      },
      'Rechazada': {
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="w-3 h-3" />
      },
      'Documentación Incompleta': {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: <AlertCircle className="w-3 h-3" />
      }
    };

    const variant = variants[estado] || variants['Pendiente'];
    return (
      <Badge className={`${variant.className} border flex items-center gap-1`}>
        {variant.icon}
        {estado}
      </Badge>
    );
  };

  const convocatorias = Array.from(new Set(aplicaciones.map(a => a.convocatoria)));

  const filteredAplicaciones = aplicaciones.filter(app => {
    const matchesSearch = 
      app.aspirante.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.aspirante.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.aspirante.cedula.includes(searchQuery) ||
      app.codigoConvocatoria.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = selectedEstado === 'todas' || app.estado === selectedEstado;
    const matchesConvocatoria = selectedConvocatoria === 'todas' || app.convocatoria === selectedConvocatoria;
    
    return matchesSearch && matchesEstado && matchesConvocatoria;
  });

  const stats = {
    total: aplicaciones.length,
    pendientes: aplicaciones.filter(a => a.estado === 'Pendiente').length,
    enRevision: aplicaciones.filter(a => a.estado === 'En Revisión').length,
    aprobadas: aplicaciones.filter(a => a.estado === 'Aprobada').length,
    usuariosRegistrados: aplicaciones.filter(a => a.aspirante.esUsuarioRegistrado).length,
    aplicacionesAbiertas: aplicaciones.filter(a => !a.aspirante.esUsuarioRegistrado).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            Aplicaciones Recibidas
          </h2>
          <p className="text-gray-600">
            Gestiona postulaciones abiertas al público (con y sin registro)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-700 font-medium">Total</span>
            <UserPlus className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-900">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-orange-700 font-medium">Pendientes</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-orange-900">{stats.pendientes}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-700 font-medium">En Revisión</span>
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-900">{stats.enRevision}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 font-medium">Aprobadas</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-900">{stats.aprobadas}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-indigo-700 font-medium">Registrados</span>
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-indigo-900">{stats.usuariosRegistrados}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border border-cyan-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cyan-700 font-medium">Abiertas</span>
            <ExternalLink className="w-5 h-5 text-cyan-600" />
          </div>
          <p className="text-3xl font-black text-cyan-900">{stats.aplicacionesAbiertas}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, cédula, email o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={selectedConvocatoria}
          onChange={(e) => setSelectedConvocatoria(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="todas">Todas las convocatorias</option>
          {convocatorias.map(conv => (
            <option key={conv} value={conv}>{conv}</option>
          ))}
        </select>

        <select
          value={selectedEstado}
          onChange={(e) => setSelectedEstado(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="todas">Todos los estados</option>
          <option value="Pendiente">Pendientes</option>
          <option value="En Revisión">En Revisión</option>
          <option value="Aprobada">Aprobadas</option>
          <option value="Rechazada">Rechazadas</option>
          <option value="Documentación Incompleta">Documentación Incompleta</option>
        </select>
      </div>

      {/* Aplicaciones List */}
      <div className="space-y-4">
        {filteredAplicaciones.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left Section */}
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    app.aspirante.esUsuarioRegistrado 
                      ? 'bg-indigo-100' 
                      : 'bg-cyan-100'
                  }`}>
                    {app.aspirante.esUsuarioRegistrado ? (
                      <User className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <ExternalLink className="w-5 h-5 text-cyan-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{app.aspirante.nombre}</h3>
                      {getEstadoBadge(app.estado)}
                      {!app.aspirante.esUsuarioRegistrado && (
                        <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 border">
                          Aplicación Abierta
                        </Badge>
                      )}
                      {app.puntaje && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                          {app.puntaje} puntos
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{app.codigoConvocatoria}</span> • {app.convocatoria}
                    </p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {app.aspirante.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-sm font-medium text-gray-900">{app.aspirante.telefono}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha Aplicación</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(app.fechaAplicacion).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Documentos</p>
                      <p className="text-sm font-medium text-gray-900">
                        {app.documentosSubidos}/{app.documentosRequeridos}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap lg:flex-col gap-2">
                <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalles
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 lg:flex-none text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Revisar Docs
                </Button>
                {app.estado === 'Pendiente' && (
                  <Button 
                    size="sm" 
                    className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Iniciar Revisión
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAplicaciones.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No se encontraron aplicaciones</h3>
          <p className="text-gray-600">
            {searchQuery 
              ? 'Intenta con otros términos de búsqueda' 
              : 'No hay aplicaciones disponibles para mostrar'}
          </p>
        </div>
      )}
    </div>
  );
}
