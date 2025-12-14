import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText,
  Award,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  X,
  Edit,
  Download,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface DocenteFichaProps {
  docente: any;
  onClose?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function DocenteFicha({ docente, onClose, onEdit, className = '' }: DocenteFichaProps) {
  const [activeTab, setActiveTab] = useState('general');

  const getInitials = (nombres: string, apellidos: string) => {
    return `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  const getEstadoBadgeColor = (estado: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-white/30">
                <AvatarImage src={docente.foto_url} alt={`${docente.nombres} ${docente.apellidos}`} />
                <AvatarFallback className="bg-white text-[#1e5da8] text-xl">
                  {getInitials(docente.nombres, docente.apellidos)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {docente.nombres} {docente.apellidos}
                </h2>
                <p className="text-white/80">CC: {docente.documento}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getEstadoBadgeColor(docente.estado)}>
                    {docente.estado}
                  </Badge>
                  <Badge className={getEscalafonColor(docente.categoria_escalafon)}>
                    {docente.categoria_escalafon}
                  </Badge>
                  {docente.rund_validado && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      RUND Validado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white/70 text-xs mb-1">Experiencia</p>
              <p className="text-xl font-bold">{docente.experiencia_docente_anos} años</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white/70 text-xs mb-1">Dedicación</p>
              <p className="text-xl font-bold">{docente.dedicacion_horas}h/sem</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white/70 text-xs mb-1">Escalafón</p>
              <p className="text-xl font-bold">{docente.puntos_escalafon} pts</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white/70 text-xs mb-1">Territorial</p>
              <p className="text-xl font-bold truncate">{docente.territorial}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 px-6 bg-gray-50 sticky top-0 z-10">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="general" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none px-4 py-3"
                >
                  <User className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger 
                  value="formacion"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none px-4 py-3"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Formación
                </TabsTrigger>
                <TabsTrigger 
                  value="vinculacion"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none px-4 py-3"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Vinculación
                </TabsTrigger>
                <TabsTrigger 
                  value="produccion"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none px-4 py-3"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Producción
                </TabsTrigger>
                <TabsTrigger 
                  value="documentos"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e5da8] rounded-none px-4 py-3"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documentos
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Tab: General */}
              <TabsContent value="general" className="mt-0 space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Información de Contacto</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Mail className="w-5 h-5 text-[#1e5da8]" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{docente.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Phone className="w-5 h-5 text-[#1e5da8]" />
                      <div>
                        <p className="text-xs text-gray-500">Teléfono</p>
                        <p className="font-medium text-gray-900">{docente.telefono}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-[#1e5da8]" />
                      <div>
                        <p className="text-xs text-gray-500">Territorial</p>
                        <p className="font-medium text-gray-900">{docente.territorial}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Building2 className="w-5 h-5 text-[#1e5da8]" />
                      <div>
                        <p className="text-xs text-gray-500">Departamento Académico</p>
                        <p className="font-medium text-gray-900">{docente.departamento_academico}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Áreas de Conocimiento</h3>
                  <div className="flex flex-wrap gap-2">
                    {docente.areas_conocimiento.map((area: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {docente.tarjeta_profesional && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Registro Profesional</h3>
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[#1e5da8]" />
                      <div>
                        <p className="text-xs text-gray-500">Tarjeta Profesional</p>
                        <p className="font-medium text-gray-900">{docente.tarjeta_profesional}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Formación */}
              <TabsContent value="formacion" className="mt-0 space-y-4">
                {docente.formacion_academica.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay formación académica registrada</p>
                  </div>
                ) : (
                  docente.formacion_academica.map((formacion: any, index: number) => (
                    <Card key={index} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <Badge className="bg-[#1e5da8] mb-2">{formacion.nivel}</Badge>
                          <h4 className="text-lg font-bold text-gray-900">{formacion.titulo}</h4>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span>{formacion.institucion}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{formacion.pais}</span>
                        </div>
                        {formacion.fecha_grado && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(formacion.fecha_grado)}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tab: Vinculación */}
              <TabsContent value="vinculacion" className="mt-0 space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Datos de Vinculación</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tipo de Vinculación</p>
                      <p className="font-medium text-gray-900">{docente.tipo_vinculacion}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Modalidad de Contrato</p>
                      <p className="font-medium text-gray-900">{docente.modalidad_contrato}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Dedicación</p>
                      <p className="font-medium text-gray-900">{docente.dedicacion_horas} horas/semana</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Fecha de Vinculación</p>
                      <p className="font-medium text-gray-900">{formatDate(docente.fecha_vinculacion)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Escalafón Docente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Categoría</p>
                      <Badge className={getEscalafonColor(docente.categoria_escalafon)}>
                        {docente.categoria_escalafon}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Puntos</p>
                      <p className="font-medium text-gray-900">{docente.puntos_escalafon}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Fecha de Categorización</p>
                      <p className="font-medium text-gray-900">{formatDate(docente.fecha_categorizacion)}</p>
                    </div>
                  </div>
                  {docente.resolucion_escalafon && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-1">Resolución</p>
                      <p className="font-medium text-gray-900">{docente.resolucion_escalafon}</p>
                    </div>
                  )}
                </Card>

                {docente.experiencia_investigativa && docente.experiencia_investigativa.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Experiencia Investigativa</h3>
                    <div className="space-y-4">
                      {docente.experiencia_investigativa.map((exp: any, index: number) => (
                        <div key={index} className="border-l-4 border-[#1e5da8] pl-4">
                          <h4 className="font-medium text-gray-900">{exp.proyecto}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {exp.rol} - {exp.institucion}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(exp.fecha_inicio)} - {exp.fecha_fin ? formatDate(exp.fecha_fin) : 'Actual'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Producción */}
              <TabsContent value="produccion" className="mt-0 space-y-4">
                {(!docente.publicaciones || docente.publicaciones.length === 0) ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay publicaciones registradas</p>
                  </div>
                ) : (
                  docente.publicaciones.map((pub: any, index: number) => (
                    <Card key={index} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="secondary">{pub.tipo}</Badge>
                        <span className="text-sm text-gray-600">{pub.año}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">{pub.titulo}</h4>
                      {pub.revista_editorial && (
                        <p className="text-sm text-gray-600 mb-1">{pub.revista_editorial}</p>
                      )}
                      {pub.issn_isbn && (
                        <p className="text-xs text-gray-500">{pub.issn_isbn}</p>
                      )}
                      {pub.url && (
                        <a 
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#1e5da8] hover:underline mt-2"
                        >
                          Ver publicación
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documentos" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Hoja de Vida</h4>
                        <p className="text-xs text-gray-500">Última actualización: hace 2 meses</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Documento de Identidad</h4>
                        <p className="text-xs text-gray-500">Verificado</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <Award className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Certificado Escalafón</h4>
                        <p className="text-xs text-gray-500">{docente.resolucion_escalafon}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Títulos Académicos</h4>
                        <p className="text-xs text-gray-500">{docente.formacion_academica.length} certificados</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Última actualización: {formatDate(new Date().toISOString())}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
