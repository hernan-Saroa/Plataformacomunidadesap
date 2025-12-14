/**
 * Componente: Biblioteca de Conocimiento
 * Plantillas, guías y recursos de Arquitectura Empresarial
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Download,
  Eye,
  Search,
  Filter,
  Star,
  Clock,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';

interface BibliotecaConocimientoProps {
  canEdit?: boolean;
}

export function BibliotecaConocimiento({ canEdit = true }: BibliotecaConocimientoProps) {
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Categorías
  const categorias = [
    { id: 'todos', name: 'Todos los Recursos', count: 45 },
    { id: 'plantillas', name: 'Plantillas', count: 18 },
    { id: 'guias', name: 'Guías y Manuales', count: 12 },
    { id: 'casos', name: 'Casos de Uso', count: 8 },
    { id: 'normativa', name: 'Normativa', count: 7 }
  ];

  // Recursos de la biblioteca
  const recursos = [
    {
      id: 'rec-001',
      categoria: 'plantillas',
      tipo: 'Plantilla',
      titulo: 'Plantilla de Plan Estratégico de TI',
      descripcion: 'Formato estandarizado para documentar el plan estratégico de tecnología',
      autor: 'Dirección de Arquitectura',
      fecha: '2025-11-15',
      descargas: 145,
      valoracion: 4.8,
      formato: 'DOCX',
      tamaño: '2.4 MB',
      tags: ['Estrategia', 'Planificación', 'MRAE']
    },
    {
      id: 'rec-002',
      categoria: 'plantillas',
      tipo: 'Plantilla',
      titulo: 'Matriz de Arquitectura de Negocio',
      descripcion: 'Template para documentar procesos, capacidades y servicios de negocio',
      autor: 'Equipo AE',
      fecha: '2025-10-28',
      descargas: 98,
      valoracion: 4.6,
      formato: 'XLSX',
      tamaño: '1.8 MB',
      tags: ['Negocio', 'Procesos', 'Capacidades']
    },
    {
      id: 'rec-003',
      categoria: 'guias',
      tipo: 'Guía',
      titulo: 'Guía de Implementación MRAE MinTIC',
      descripcion: 'Guía paso a paso para implementar el Marco de Referencia de AE de MinTIC',
      autor: 'MinTIC Colombia',
      fecha: '2025-09-10',
      descargas: 312,
      valoracion: 4.9,
      formato: 'PDF',
      tamaño: '5.2 MB',
      tags: ['MinTIC', 'MRAE', 'Implementación']
    },
    {
      id: 'rec-004',
      categoria: 'guias',
      tipo: 'Guía',
      titulo: 'Manual de Gobierno de Datos',
      descripcion: 'Lineamientos para establecer un marco de gobierno de datos institucional',
      autor: 'CDO',
      fecha: '2025-11-05',
      descargas: 87,
      valoracion: 4.7,
      formato: 'PDF',
      tamaño: '3.6 MB',
      tags: ['Datos', 'Gobierno', 'Políticas']
    },
    {
      id: 'rec-005',
      categoria: 'casos',
      tipo: 'Caso de Uso',
      titulo: 'Caso de Éxito: Migración a Cloud',
      descripcion: 'Documentación del proceso de migración a infraestructura cloud híbrida',
      autor: 'Infraestructura',
      fecha: '2025-10-18',
      descargas: 124,
      valoracion: 4.5,
      formato: 'PDF',
      tamaño: '2.1 MB',
      tags: ['Cloud', 'Migración', 'Infraestructura']
    },
    {
      id: 'rec-006',
      categoria: 'plantillas',
      titulo: 'Template de Arquitectura de Aplicaciones',
      tipo: 'Plantilla',
      descripcion: 'Formato para documentar arquitectura y componentes de aplicaciones',
      autor: 'Desarrollo',
      fecha: '2025-11-20',
      descargas: 76,
      valoracion: 4.4,
      formato: 'DOCX',
      tamaño: '1.5 MB',
      tags: ['Aplicaciones', 'Arquitectura', 'Sistemas']
    },
    {
      id: 'rec-007',
      categoria: 'normativa',
      tipo: 'Normativa',
      titulo: 'Ley 1581 de 2012 - Protección de Datos',
      descripcion: 'Texto completo de la ley de protección de datos personales en Colombia',
      autor: 'Congreso de Colombia',
      fecha: '2012-10-17',
      descargas: 245,
      valoracion: 5.0,
      formato: 'PDF',
      tamaño: '0.8 MB',
      tags: ['Legal', 'Datos', 'Privacidad']
    },
    {
      id: 'rec-008',
      categoria: 'casos',
      tipo: 'Caso de Uso',
      titulo: 'Implementación de SOC Institucional',
      descripcion: 'Lecciones aprendidas en la implementación del Security Operations Center',
      autor: 'Seguridad TI',
      fecha: '2025-11-12',
      descargas: 92,
      valoracion: 4.6,
      formato: 'PDF',
      tamaño: '3.2 MB',
      tags: ['Seguridad', 'SOC', 'Ciberseguridad']
    },
    {
      id: 'rec-009',
      categoria: 'guias',
      tipo: 'Guía',
      titulo: 'Buenas Prácticas en DevOps',
      descripcion: 'Guía de implementación de prácticas DevOps en desarrollo de software',
      autor: 'Desarrollo',
      fecha: '2025-09-25',
      descargas: 156,
      valoracion: 4.7,
      formato: 'PDF',
      tamaño: '4.1 MB',
      tags: ['DevOps', 'Desarrollo', 'CI/CD']
    },
    {
      id: 'rec-010',
      categoria: 'plantillas',
      tipo: 'Plantilla',
      titulo: 'Matriz de Riesgos TI',
      descripcion: 'Template para registro y gestión de riesgos tecnológicos',
      autor: 'Gestión de Riesgos',
      fecha: '2025-10-30',
      descargas: 118,
      valoracion: 4.8,
      formato: 'XLSX',
      tamaño: '1.2 MB',
      tags: ['Riesgos', 'Gestión', 'Seguridad']
    },
    {
      id: 'rec-011',
      categoria: 'normativa',
      tipo: 'Normativa',
      titulo: 'Decreto 1078 de 2015 - Sector TIC',
      descripcion: 'Decreto único reglamentario del sector de Tecnologías de la Información',
      autor: 'MinTIC',
      fecha: '2015-05-26',
      descargas: 189,
      valoracion: 4.9,
      formato: 'PDF',
      tamaño: '1.5 MB',
      tags: ['Legal', 'MinTIC', 'Regulación']
    },
    {
      id: 'rec-012',
      categoria: 'casos',
      tipo: 'Caso de Uso',
      titulo: 'Transformación Digital en ESAP',
      descripcion: 'Historia del proceso de transformación digital institucional',
      autor: 'Transformación Digital',
      fecha: '2025-11-01',
      descargas: 203,
      valoracion: 4.9,
      formato: 'PDF',
      tamaño: '6.5 MB',
      tags: ['Transformación', 'Digital', 'Caso de Éxito']
    }
  ];

  const recursosFiltrados = recursos
    .filter(r => selectedCategoria === 'todos' || r.categoria === selectedCategoria)
    .filter(r => searchTerm === '' || 
      r.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Plantilla': return 'bg-blue-100 text-blue-700';
      case 'Guía': return 'bg-green-100 text-green-700';
      case 'Caso de Uso': return 'bg-purple-100 text-purple-700';
      case 'Normativa': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8" />
              <h2 className="text-2xl font-black">Biblioteca de Conocimiento</h2>
            </div>
            <p className="text-blue-100">
              Plantillas, guías, casos de uso y recursos de Arquitectura Empresarial
            </p>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros */}
      <div className="space-y-4">
        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar recursos, plantillas, guías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
          />
        </div>

        {/* Filtros por categoría */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Categoría:</span>
          </div>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoria(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedCategoria === cat.id
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat.name}
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recursosFiltrados.map((recurso, index) => (
          <motion.div
            key={recurso.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className={`px-2 py-1 text-xs font-bold rounded ${getTipoColor(recurso.tipo)}`}>
                  {recurso.tipo}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{recurso.valoracion}</span>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 mb-2">{recurso.titulo}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recurso.descripcion}</p>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {recurso.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{recurso.autor}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{recurso.fecha}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 mb-4">
              <span className="font-semibold">{recurso.formato}</span>
              <span>{recurso.tamaño}</span>
              <span>{recurso.descargas} descargas</span>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button className="flex-1 px-3 py-2 bg-[#003DA5] text-white rounded-lg text-sm font-semibold hover:bg-[#002d7a] transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Resumen */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Acerca de la Biblioteca
        </h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            La Biblioteca de Conocimiento de Arquitectura Empresarial ESAP cuenta con <strong>45 recursos</strong> 
            organizados en 4 categorías principales: plantillas, guías, casos de uso y normativa. Todos los materiales 
            están alineados con el <strong>Marco de Referencia MRAE de MinTIC</strong> y las mejores prácticas internacionales.
          </p>
          <p className="mt-3">
            Los recursos más descargados incluyen la <strong>Guía de Implementación MRAE</strong> (312 descargas) y 
            la documentación de <strong>Protección de Datos</strong> (245 descargas). Se actualizan periódicamente 
            con nuevas plantillas y casos de éxito institucionales.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
