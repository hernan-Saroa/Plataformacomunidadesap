/**
 * Submódulo: Gestión de Convocatorias Docentes
 * 
 * Permite crear, editar y publicar convocatorias docentes
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Send
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Convocatoria {
  id: string;
  titulo: string;
  codigo: string;
  tipo: 'Cátedra' | 'Tiempo Completo' | 'Medio Tiempo';
  departamento: string;
  vacantes: number;
  fechaApertura: string;
  fechaCierre: string;
  estado: 'Borrador' | 'Publicada' | 'Cerrada' | 'En Evaluación';
  aplicaciones: number;
  requisitos: number;
}

export function TeacherCallsManagementContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todas');

  // Mock data
  const convocatorias: Convocatoria[] = [
    {
      id: '1',
      titulo: 'Docente de Administración Pública',
      codigo: 'CONV-2024-001',
      tipo: 'Tiempo Completo',
      departamento: 'Administración Pública',
      vacantes: 2,
      fechaApertura: '2024-11-01',
      fechaCierre: '2024-11-30',
      estado: 'Publicada',
      aplicaciones: 23,
      requisitos: 8
    },
    {
      id: '2',
      titulo: 'Docente de Derecho Constitucional',
      codigo: 'CONV-2024-002',
      tipo: 'Cátedra',
      departamento: 'Ciencias Jurídicas',
      vacantes: 1,
      fechaApertura: '2024-11-15',
      fechaCierre: '2024-12-15',
      estado: 'Publicada',
      aplicaciones: 12,
      requisitos: 6
    },
    {
      id: '3',
      titulo: 'Docente de Políticas Públicas',
      codigo: 'CONV-2024-003',
      tipo: 'Medio Tiempo',
      departamento: 'Gestión Pública',
      vacantes: 1,
      fechaApertura: '2024-12-01',
      fechaCierre: '2024-12-31',
      estado: 'Borrador',
      aplicaciones: 0,
      requisitos: 7
    },
    {
      id: '4',
      titulo: 'Docente de Investigación Social',
      codigo: 'CONV-2024-004',
      tipo: 'Tiempo Completo',
      departamento: 'Investigación',
      vacantes: 2,
      fechaApertura: '2024-10-01',
      fechaCierre: '2024-10-31',
      estado: 'Cerrada',
      aplicaciones: 34,
      requisitos: 9
    },
  ];

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      'Publicada': {
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />
      },
      'Borrador': {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: <Edit className="w-3 h-3" />
      },
      'Cerrada': {
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="w-3 h-3" />
      },
      'En Evaluación': {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <AlertCircle className="w-3 h-3" />
      }
    };

    const variant = variants[estado] || variants['Borrador'];
    return (
      <Badge className={`${variant.className} border flex items-center gap-1`}>
        {variant.icon}
        {estado}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'Tiempo Completo': 'bg-purple-100 text-purple-700 border-purple-200',
      'Medio Tiempo': 'bg-blue-100 text-blue-700 border-blue-200',
      'Cátedra': 'bg-amber-100 text-amber-700 border-amber-200'
    };

    return (
      <Badge className={`${colors[tipo] || 'bg-gray-100 text-gray-700'} border`}>
        {tipo}
      </Badge>
    );
  };

  const filteredConvocatorias = convocatorias.filter(conv => {
    const matchesSearch = conv.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.departamento.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = selectedEstado === 'todas' || conv.estado === selectedEstado;
    return matchesSearch && matchesEstado;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-xl">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            Gestión de Convocatorias
          </h2>
          <p className="text-gray-600">
            Crear, editar y publicar convocatorias docentes
          </p>
        </div>

        <Button 
          className="bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8f] hover:to-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Convocatoria
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 font-medium">Publicadas</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-900">2</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 font-medium">Borradores</span>
            <Edit className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-3xl font-black text-gray-900">1</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700 font-medium">Cerradas</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-900">1</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-700 font-medium">Total Aplicaciones</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-900">69</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por título, código o departamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={selectedEstado}
          onChange={(e) => setSelectedEstado(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent"
        >
          <option value="todas">Todos los estados</option>
          <option value="Publicada">Publicadas</option>
          <option value="Borrador">Borradores</option>
          <option value="Cerrada">Cerradas</option>
          <option value="En Evaluación">En Evaluación</option>
        </select>
      </div>

      {/* Convocatorias List */}
      <div className="space-y-4">
        {filteredConvocatorias.map((conv, index) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left Section */}
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">{conv.titulo}</h3>
                      {getEstadoBadge(conv.estado)}
                      {getTipoBadge(conv.tipo)}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{conv.codigo}</span> • {conv.departamento}
                    </p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Vacantes</p>
                      <p className="text-sm font-bold text-gray-900">{conv.vacantes}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Apertura</p>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(conv.fechaApertura).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Cierre</p>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(conv.fechaCierre).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Aplicaciones</p>
                      <p className="text-sm font-bold text-gray-900">{conv.aplicaciones}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap lg:flex-col gap-2">
                <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                {conv.estado === 'Borrador' && (
                  <Button 
                    size="sm" 
                    className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Publicar
                  </Button>
                )}
                {conv.estado === 'Publicada' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 lg:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cerrar
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredConvocatorias.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No se encontraron convocatorias</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Intenta con otros términos de búsqueda' 
              : 'Crea tu primera convocatoria docente'}
          </p>
          {!searchQuery && (
            <Button className="bg-gradient-to-r from-[#1e5da8] to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Convocatoria
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
