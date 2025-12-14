import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
  FileText,
  Edit,
  Download,
  Building2,
  DollarSign,
  IdCard
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface DocenteFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  docente: any;
  onEdit: () => void;
}

export function DocenteFichaModal({ isOpen, onClose, docente, onEdit }: DocenteFichaModalProps) {
  if (!isOpen || !docente) return null;

  const getInitials = (nombres: string, apellidos: string) => {
    return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Licencia':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Retirado':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEscalafonColor = (categoria: string) => {
    switch (categoria) {
      case 'Titular':
        return 'bg-[#1e5da8] text-white';
      case 'Asociado':
        return 'bg-[#2a6dbd] text-white';
      case 'Asistente':
        return 'bg-[#4a8fd6] text-white';
      case 'Auxiliar':
        return 'bg-[#7ab3e8] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] overflow-hidden">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 flex max-w-full pl-10"
          >
            <div className="w-screen max-w-4xl">
              <div className="flex h-full flex-col bg-white shadow-xl overflow-hidden">
                {/* Header con Foto */}
                <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] px-6 py-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20 border-4 border-white/30">
                        <AvatarImage src={docente.foto_url} alt={`${docente.nombres} ${docente.apellidos}`} />
                        <AvatarFallback className="bg-white text-[#1e5da8] text-xl">
                          {getInitials(docente.nombres, docente.apellidos)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl text-white">
                          {docente.nombres} {docente.apellidos}
                        </h2>
                        <p className="text-blue-100 mt-1">{docente.codigo_docente}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getEstadoColor(docente.estado)}>
                            {docente.estado}
                          </Badge>
                          <Badge className={getEscalafonColor(docente.categoria_escalafon)}>
                            {docente.categoria_escalafon}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={onEdit}
                      size="sm"
                      className="bg-white text-[#1e5da8] hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Información
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar CV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver PTA
                    </Button>
                  </div>
                </div>

                {/* Content con Tabs */}
                <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full justify-start border-b px-6 pt-2 rounded-none h-auto bg-transparent">
                    <TabsTrigger value="personal" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none">
                      <User className="w-4 h-4 mr-2" />
                      Personal
                    </TabsTrigger>
                    <TabsTrigger value="laboral" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Laboral
                    </TabsTrigger>
                    <TabsTrigger value="academico" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Académico
                    </TabsTrigger>
                    <TabsTrigger value="asignaciones" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none">
                      <FileText className="w-4 h-4 mr-2" />
                      Asignaciones
                    </TabsTrigger>
                    <TabsTrigger value="evaluaciones" className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none">
                      <Award className="w-4 h-4 mr-2" />
                      Evaluaciones
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto p-6">
                    {/* TAB: INFORMACIÓN PERSONAL */}
                    <TabsContent value="personal" className="mt-0 space-y-6">
                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <IdCard className="w-5 h-5 text-[#1e5da8]" />
                          Información Personal
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Tipo Documento</p>
                            <p className="text-gray-900">{docente.tipo_documento}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Número Documento</p>
                            <p className="text-gray-900">{docente.documento}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha Nacimiento</p>
                            <p className="text-gray-900">{docente.fecha_nacimiento || 'No registrado'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Género</p>
                            <p className="text-gray-900">{docente.genero || 'No registrado'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Estado Civil</p>
                            <p className="text-gray-900">{docente.estado_civil || 'No registrado'}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Phone className="w-5 h-5 text-[#1e5da8]" />
                          Información de Contacto
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Email Institucional</p>
                              <p className="text-gray-900">{docente.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Teléfono</p>
                              <p className="text-gray-900">{docente.telefono}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Dirección</p>
                              <p className="text-gray-900">{docente.direccion || 'No registrada'}</p>
                              <p className="text-sm text-gray-500">{docente.ciudad || ''}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </TabsContent>

                    {/* TAB: INFORMACIÓN LABORAL */}
                    <TabsContent value="laboral" className="mt-0 space-y-6">
                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-[#1e5da8]" />
                          Información Laboral
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Territorial</p>
                            <p className="text-gray-900">{docente.territorial}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Departamento</p>
                            <p className="text-gray-900">{docente.departamento}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Categoría Escalafón</p>
                            <Badge className={getEscalafonColor(docente.categoria_escalafon)}>
                              {docente.categoria_escalafon}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tipo Vinculación</p>
                            <p className="text-gray-900">{docente.tipo_vinculacion}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dedicación</p>
                            <p className="text-gray-900">{docente.dedicacion}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Estado</p>
                            <Badge className={getEstadoColor(docente.estado)}>
                              {docente.estado}
                            </Badge>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#1e5da8]" />
                          Fechas Importantes
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Vinculación</p>
                            <p className="text-gray-900">{docente.fecha_vinculacion || 'No registrada'}</p>
                          </div>
                          {docente.fecha_ultimo_contrato && (
                            <div>
                              <p className="text-sm text-gray-600">Último Contrato</p>
                              <p className="text-gray-900">{docente.fecha_ultimo_contrato}</p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {docente.salario_basico && (
                        <Card className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-[#1e5da8]" />
                            Información Salarial
                          </h3>
                          <div>
                            <p className="text-sm text-gray-600">Salario Básico</p>
                            <p className="text-2xl text-gray-900">
                              ${Number(docente.salario_basico).toLocaleString('es-CO')} COP
                            </p>
                          </div>
                        </Card>
                      )}
                    </TabsContent>

                    {/* TAB: INFORMACIÓN ACADÉMICA */}
                    <TabsContent value="academico" className="mt-0 space-y-6">
                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-[#1e5da8]" />
                          Formación Académica
                        </h3>
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Nivel Máximo de Formación</p>
                          <p className="text-xl text-gray-900">{docente.nivel_formacion_max || docente.formacion_academica?.[docente.formacion_academica.length - 1]?.nivel || 'No registrado'}</p>
                        </div>
                        {docente.formacion_academica && docente.formacion_academica.length > 0 && (
                          <div className="space-y-3 mt-4">
                            {docente.formacion_academica.map((formacion: any, index: number) => (
                              <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge className="bg-[#1e5da8] text-white">{formacion.nivel}</Badge>
                                  {formacion.año_graduacion && (
                                    <span className="text-sm text-gray-500">{formacion.año_graduacion}</span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900">{formacion.titulo}</p>
                                <p className="text-sm text-gray-600 mt-1">{formacion.institucion}</p>
                                {formacion.area_conocimiento && (
                                  <p className="text-sm text-gray-500 mt-1">Área: {formacion.area_conocimiento}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>

                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-[#1e5da8]" />
                          Experiencia
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Experiencia Docente</p>
                            <p className="text-2xl text-gray-900">{docente.experiencia_docente_anos || 0} años</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Experiencia Profesional</p>
                            <p className="text-2xl text-gray-900">{docente.experiencia_profesional_anos || 0} años</p>
                          </div>
                        </div>
                      </Card>

                      {docente.areas_expertise && docente.areas_expertise.length > 0 && (
                        <Card className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-[#1e5da8]" />
                            Áreas de Expertise
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {docente.areas_expertise.map((area: string, index: number) => (
                              <Badge key={index} variant="secondary">{area}</Badge>
                            ))}
                          </div>
                        </Card>
                      )}

                      {docente.idiomas && docente.idiomas.length > 0 && (
                        <Card className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-4">Idiomas</h3>
                          <div className="space-y-2">
                            {docente.idiomas.map((idioma: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium text-gray-900">{idioma.idioma}</span>
                                <Badge variant="outline">{idioma.nivel}</Badge>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </TabsContent>

                    {/* TAB: ASIGNACIONES */}
                    <TabsContent value="asignaciones" className="mt-0">
                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#1e5da8]" />
                          Asignaciones Académicas
                        </h3>
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            No hay asignaciones registradas para el periodo actual
                          </p>
                          <Button variant="outline" size="sm" className="mt-4">
                            Asignar Materias
                          </Button>
                        </div>
                      </Card>
                    </TabsContent>

                    {/* TAB: EVALUACIONES */}
                    <TabsContent value="evaluaciones" className="mt-0">
                      <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-[#1e5da8]" />
                          Historial de Evaluaciones
                        </h3>
                        <div className="text-center py-12">
                          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            No hay evaluaciones registradas
                          </p>
                        </div>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Última actualización: {new Date().toLocaleDateString('es-CO')}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={onClose}>
                        Cerrar
                      </Button>
                      <Button
                        onClick={onEdit}
                        className="bg-[#1e5da8] hover:bg-[#1a4d8f] text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Docente
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
