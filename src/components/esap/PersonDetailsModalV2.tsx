import { X, Mail, Phone, MapPin, Calendar, Award, FileText, Clock, Download, Edit, Trash2, User, GraduationCap, Briefcase, BookOpen, TrendingUp, Eye, IdCard, FileCheck, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadDocumentModal } from './UploadDocumentModal';

interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  programa: string;
  estado: 'Activo' | 'Inactivo' | 'Graduado';
  fechaIngreso: string;
  documento: string;
  direccion: string;
  ciudad: string;
  promedio?: number;
  semestre?: number;
  materiasActuales?: number;
  asignaturas?: string[];
  departamento?: string;
  cargo?: string;
}

interface PersonDetailsModalV2Props {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PersonDetailsModalV2({ person, isOpen, onClose }: PersonDetailsModalV2Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'documents' | 'history'>('general');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDocumentUpload = (data: any) => {
    console.log('Documento cargado:', data);
    // Aquí se integraría con la API para guardar el documento
  };

  if (!person || !isOpen) return null;

  const getRoleConfig = (rol: string) => {
    switch (rol) {
      case 'Estudiante':
        return { 
          bg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          icon: GraduationCap,
          color: '#1E40AF'
        };
      case 'Docente':
        return { 
          bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          icon: Award,
          color: '#065F46'
        };
      case 'Administrativo':
        return { 
          bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          icon: Briefcase,
          color: '#92400E'
        };
      case 'Graduado':
        return { 
          bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          icon: GraduationCap,
          color: '#5B21B6'
        };
      default:
        return { 
          bg: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
          icon: User,
          color: '#1F2937'
        };
    }
  };

  const roleConfig = getRoleConfig(person.rol);
  const RoleIcon = roleConfig.icon;

  // Mock academic data
  const mockMateriasActuales = [
    { nombre: 'Teoría Política Contemporánea', creditos: 4, progreso: 75 },
    { nombre: 'Gestión Pública y Gobierno', creditos: 3, progreso: 60 },
    { nombre: 'Estadística Aplicada', creditos: 3, progreso: 85 },
    { nombre: 'Derecho Administrativo', creditos: 4, progreso: 70 },
    { nombre: 'Economía del Sector Público', creditos: 3, progreso: 90 },
    { nombre: 'Investigación Cualitativa', creditos: 2, progreso: 55 }
  ];

  const mockDocumentos = [
    { nombre: 'Certificado de Notas - 2024-1', tipo: 'PDF', fecha: '2024-06-15', tamano: '245 KB' },
    { nombre: 'Comprobante de Matrícula', tipo: 'PDF', fecha: '2024-01-20', tamano: '189 KB' },
    { nombre: 'Documento de Identidad', tipo: 'PDF', fecha: '2023-02-15', tamano: '512 KB' },
    { nombre: 'Certificado Médico', tipo: 'PDF', fecha: '2023-02-10', tamano: '327 KB' }
  ];

  const mockHistorial = [
    { fecha: '2024-11-10', evento: 'Inscripción de materias', detalle: 'Semestre 2024-2' },
    { fecha: '2024-10-15', evento: 'Evaluación de desempeño', detalle: 'Promedio 4.5' },
    { fecha: '2024-08-20', evento: 'Finalización de semestre', detalle: 'Aprobó todas las materias' },
    { fecha: '2024-06-15', evento: 'Certificado de notas', detalle: 'Emitido' },
    { fecha: '2024-02-01', evento: 'Inicio de semestre', detalle: 'Semestre 2024-1' }
  ];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed left-0 right-0 top-0 bottom-0 z-[10000] flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none overflow-y-auto">
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl w-full max-w-5xl my-auto mx-auto pointer-events-auto flex flex-col"
              style={{ 
                boxShadow: 'var(--esap-shadow-2xl)',
                maxHeight: 'calc(95vh - 2rem)'
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header with gradient */}
              <div 
                className="h-24 sm:h-32 relative flex-shrink-0"
                style={{ background: roleConfig.bg }}
              >
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 text-white z-10"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
                </button>

                {/* Avatar */}
                <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white border-4 border-white flex items-center justify-center" style={{ boxShadow: 'var(--esap-shadow-xl)' }}>
                    <RoleIcon className="w-12 h-12 sm:w-16 sm:h-16" style={{ color: roleConfig.color }} strokeWidth={2} />
                  </div>
                </div>

                {/* Quick actions */}
                <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-8 flex gap-2">
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs sm:text-sm font-semibold hover:bg-white/30 transition-all flex items-center gap-1 sm:gap-2">
                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs sm:text-sm font-semibold hover:bg-white/30 transition-all flex items-center gap-1 sm:gap-2">
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>
                </div>
              </div>

              {/* Person info */}
              <div className="px-4 sm:px-8 pt-16 sm:pt-20 pb-4 sm:pb-6 border-b border-[--esap-gray-200] flex-shrink-0">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="w-full lg:w-auto">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[--esap-gray-900] mb-1">
                      {person.nombre} {person.apellido}
                    </h2>
                    <p className="text-sm sm:text-base text-[--esap-gray-600] mb-3">
                      {person.programa}
                    </p>
                    <div className="flex gap-2">
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
                        style={{ 
                          backgroundColor: person.rol === 'Estudiante' ? '#DBEAFE' : person.rol === 'Docente' ? '#D1FAE5' : person.rol === 'Administrativo' ? '#FEF3C7' : '#EDE9FE',
                          color: person.rol === 'Estudiante' ? '#1E40AF' : person.rol === 'Docente' ? '#065F46' : person.rol === 'Administrativo' ? '#92400E' : '#5B21B6'
                        }}
                      >
                        {person.rol}
                      </span>
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
                        style={{ 
                          backgroundColor: person.estado === 'Activo' ? '#D1FAE5' : person.estado === 'Inactivo' ? '#FEE2E2' : '#EDE9FE',
                          color: person.estado === 'Activo' ? '#065F46' : person.estado === 'Inactivo' ? '#991B1B' : '#5B21B6'
                        }}
                      >
                        {person.estado}
                      </span>
                    </div>
                  </div>

                  {/* Stats cards for students */}
                  {person.rol === 'Estudiante' && person.promedio && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 text-center border border-blue-200">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center mx-auto mb-2">
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" strokeWidth={2} />
                        </div>
                        <p className="text-[10px] sm:text-xs text-blue-700 font-semibold mb-1">Promedio</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-blue-900">{person.promedio}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 text-center border border-green-200">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center mx-auto mb-2">
                          <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" strokeWidth={2} />
                        </div>
                        <p className="text-[10px] sm:text-xs text-green-700 font-semibold mb-1">Semestre</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-green-900">{person.semestre}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 text-center border border-purple-200">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center mx-auto mb-2">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" strokeWidth={2} />
                        </div>
                        <p className="text-[10px] sm:text-xs text-purple-700 font-semibold mb-1">Materias</p>
                        <p className="text-xl sm:text-2xl font-extrabold text-purple-900">{person.materiasActuales}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 sm:px-8 border-b border-[--esap-gray-200] flex-shrink-0 overflow-x-auto">
                <div className="flex gap-4 sm:gap-6 min-w-max">
                  {[
                    { id: 'general', label: 'Información General' },
                    { id: 'academic', label: 'Académico' },
                    { id: 'documents', label: 'Documentos' },
                    { id: 'history', label: 'Historial' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-2 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === tab.id
                          ? 'border-[--esap-primary] text-[--esap-primary]'
                          : 'border-transparent text-[--esap-gray-600] hover:text-[--esap-gray-900] hover:border-[--esap-gray-300]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content - Con scroll vertical */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" style={{ minHeight: '300px' }}>
                <AnimatePresence mode="wait">
                  {activeTab === 'general' && (
                    <motion.div
                      key="general"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pb-4"
                    >
                      {/* Contact info */}
                      <div className="bg-[--esap-gray-50] rounded-xl p-6 border border-[--esap-gray-200]">
                        <h3 className="font-bold text-[--esap-gray-900] mb-4 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-[--esap-primary]" strokeWidth={2} />
                          Información de Contacto
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Email</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.email}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Teléfono</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.telefono}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Dirección</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.direccion}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Ciudad</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.ciudad}</p>
                          </div>
                        </div>
                      </div>

                      {/* Personal info */}
                      <div className="bg-[--esap-gray-50] rounded-xl p-6 border border-[--esap-gray-200]">
                        <h3 className="font-bold text-[--esap-gray-900] mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-[--esap-primary]" strokeWidth={2} />
                          Información Personal
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Documento</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.documento}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Fecha de Ingreso</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.fechaIngreso}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Programa</label>
                            <p className="text-sm text-[--esap-gray-900] font-medium">{person.programa}</p>
                          </div>
                          {person.cargo && (
                            <div>
                              <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Cargo</label>
                              <p className="text-sm text-[--esap-gray-900] font-medium">{person.cargo}</p>
                            </div>
                          )}
                          {person.departamento && (
                            <div>
                              <label className="text-xs font-semibold text-[--esap-gray-600] uppercase tracking-wide mb-1 block">Departamento</label>
                              <p className="text-sm text-[--esap-gray-900] font-medium">{person.departamento}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'academic' && (
                    <motion.div
                      key="academic"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="pb-4"
                    >
                      {person.rol === 'Estudiante' && (
                        <>
                          <h3 className="font-bold text-[--esap-gray-900] mb-4">Materias Actuales</h3>
                          <div className="space-y-3">
                            {mockMateriasActuales.map((materia, index) => (
                              <div key={index} className="bg-white rounded-xl p-4 border-2 border-[--esap-gray-200] hover:border-[--esap-primary]/40 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-[--esap-gray-900] text-sm mb-1">{materia.nombre}</h4>
                                    <p className="text-xs text-[--esap-gray-600]">{materia.creditos} créditos</p>
                                  </div>
                                  <span className="text-sm font-bold text-[--esap-primary]">{materia.progreso}%</span>
                                </div>
                                <div className="w-full bg-[--esap-gray-200] rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ 
                                      background: 'linear-gradient(90deg, #1e5da8 0%, #2a6dbd 100%)'
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${materia.progreso}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {person.rol === 'Docente' && person.asignaturas && (
                        <>
                          <h3 className="font-bold text-[--esap-gray-900] mb-4">Asignaturas que Dicta</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {person.asignaturas.map((asignatura, index) => (
                              <div key={index} className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-green-600" strokeWidth={2} />
                                  </div>
                                  <p className="font-bold text-green-900 text-sm">{asignatura}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'documents' && (
                    <motion.div
                      key="documents"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="pb-4 space-y-4"
                    >
                      {/* Grid de Cards Premium */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Card: Cédula de Ciudadanía */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-[#1e5da8] transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            {/* Header con gradiente */}
                            <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#1e5da8] opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-[#1e5da8] flex-shrink-0">
                                  <IdCard className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Cédula de Ciudadanía</h3>
                                  <p className="text-xs text-gray-600">Documento de identidad</p>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">2.4 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2023-01-15</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded border border-green-200">Verificado</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-[#1e5da8] text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card: Diploma de Maestría */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            <div className="relative p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-green-500 opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-green-500 flex-shrink-0">
                                  <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Diploma de Maestría</h3>
                                  <p className="text-xs text-gray-600">Título académico postgrado</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">3.2 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2020-12-15</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded border border-purple-200">Académico</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card: Diploma de Pregrado */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            <div className="relative p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-green-500 opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-green-500 flex-shrink-0">
                                  <Award className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Diploma de Pregrado</h3>
                                  <p className="text-xs text-gray-600">Título profesional</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">2.8 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2015-06-20</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded border border-purple-200">Académico</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card: Certificado Gestión Proyectos */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            <div className="relative p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-purple-500 opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-purple-500 flex-shrink-0">
                                  <FileCheck className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Certificado Gestión Proyectos</h3>
                                  <p className="text-xs text-gray-600">Certificación profesional</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">1.6 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2023-08-10</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded border border-orange-200">Certificación</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card: Certificado Liderazgo */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            <div className="relative p-4 bg-gradient-to-br from-purple-50 to-violet-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-purple-500 opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-purple-500 flex-shrink-0">
                                  <FileCheck className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Certificado Liderazgo</h3>
                                  <p className="text-xs text-gray-600">Certificación profesional</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">1.4 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2023-07-15</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded border border-orange-200">Certificación</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Card: Libreta Militar */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.35 }}
                          whileHover={{ y: -6 }}
                          className="group"
                        >
                          <div className="relative overflow-hidden border-2 border-gray-200 hover:border-[#1e5da8] transition-all duration-300 hover:shadow-xl bg-white rounded-xl">
                            <div className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                              <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#1e5da8] opacity-10 -mr-6 -mt-6" />
                              <div className="relative flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-[#1e5da8] flex-shrink-0">
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-0.5 text-sm">Libreta Militar</h3>
                                  <p className="text-xs text-gray-600">Documento personal</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Tamaño</div>
                                  <div className="font-bold text-gray-900 text-sm">1.8 MB</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                  <div className="text-[10px] text-gray-500 mb-0.5">Cargado</div>
                                  <div className="font-bold text-gray-900 text-sm">2023-01-15</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">PDF</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded border border-gray-200">Personal</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="flex-1 bg-[#1e5da8] text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all text-xs font-semibold flex items-center justify-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </button>
                                <button className="border-2 border-gray-200 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all">
                                  <Download className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Botón para Cargar Documentos */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <button 
                          onClick={() => setIsUploadModalOpen(true)}
                          className="w-full p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1e5da8] hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
                        >
                          <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#1e5da8]" />
                          <span className="font-semibold text-gray-600 group-hover:text-[#1e5da8]">Cargar Nuevo Documento</span>
                        </button>
                      </motion.div>
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="pb-4"
                    >
                      <h3 className="font-bold text-[--esap-gray-900] mb-4">Historial de Eventos</h3>
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[--esap-gray-200]" />
                        <div className="space-y-6">
                          {mockHistorial.map((item, index) => (
                            <div key={index} className="relative flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-white border-2 border-[--esap-primary] flex items-center justify-center z-10">
                                <Clock className="w-5 h-5 text-[--esap-primary]" strokeWidth={2} />
                              </div>
                              <div className="flex-1 bg-white rounded-xl p-4 border-2 border-[--esap-gray-200]">
                                <p className="font-bold text-[--esap-gray-900] text-sm mb-1">{item.evento}</p>
                                <p className="text-xs text-[--esap-gray-600] mb-2">{item.detalle}</p>
                                <div className="flex items-center gap-2 text-xs text-[--esap-gray-500]">
                                  <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                                  {item.fecha}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleDocumentUpload}
      />
    </>
  );
}
