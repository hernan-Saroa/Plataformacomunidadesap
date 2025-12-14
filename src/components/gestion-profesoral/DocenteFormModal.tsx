import React, { useState } from 'react';
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
  FileText,
  Award,
  Check,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface DocenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  docente?: any; // Si viene docente, es edición; si no, es creación
  onSuccess: (docenteData: any) => void;
}

export function DocenteFormModal({ isOpen, onClose, docente, onSuccess }: DocenteFormModalProps) {
  const isEditing = !!docente;
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);

  // Form state - Info Personal
  const [formData, setFormData] = useState({
    // Personal
    nombres: docente?.nombres || '',
    apellidos: docente?.apellidos || '',
    tipo_documento: docente?.tipo_documento || 'CC',
    documento: docente?.documento || '',
    fecha_nacimiento: docente?.fecha_nacimiento || '',
    genero: docente?.genero || 'Masculino',
    estado_civil: docente?.estado_civil || 'Soltero',
    email: docente?.email || '',
    telefono: docente?.telefono || '',
    direccion: docente?.direccion || '',
    ciudad: docente?.ciudad || '',
    
    // Laboral
    territorial: docente?.territorial || 'Bogotá',
    departamento: docente?.departamento || 'Administración Pública',
    categoria_escalafon: docente?.categoria_escalafon || 'Asistente',
    tipo_vinculacion: docente?.tipo_vinculacion || 'Planta',
    dedicacion: docente?.dedicacion || 'Tiempo Completo',
    fecha_vinculacion: docente?.fecha_vinculacion || '',
    salario_basico: docente?.salario_basico || '',
    estado: docente?.estado || 'Activo',
    
    // Académico
    nivel_formacion_max: docente?.nivel_formacion_max || 'Maestría',
    experiencia_docente_anos: docente?.experiencia_docente_anos || '',
    experiencia_profesional_anos: docente?.experiencia_profesional_anos || '',
    areas_expertise: docente?.areas_expertise || [],
    idiomas: docente?.idiomas || []
  });

  const [formacionAcademica, setFormacionAcademica] = useState<any[]>(
    docente?.formacion_academica || []
  );
  const [nuevaFormacion, setNuevaFormacion] = useState({
    nivel: 'Pregrado',
    titulo: '',
    institucion: '',
    año_graduacion: '',
    area_conocimiento: ''
  });

  const [areaExpertise, setAreaExpertise] = useState('');
  const [idioma, setIdioma] = useState({ idioma: 'Inglés', nivel: 'Básico' });

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgregarFormacion = () => {
    if (nuevaFormacion.titulo && nuevaFormacion.institucion) {
      setFormacionAcademica(prev => [...prev, { ...nuevaFormacion, id: Date.now() }]);
      setNuevaFormacion({
        nivel: 'Pregrado',
        titulo: '',
        institucion: '',
        año_graduacion: '',
        area_conocimiento: ''
      });
      toast.success('Formación agregada');
    } else {
      toast.error('Completa los campos requeridos');
    }
  };

  const handleEliminarFormacion = (id: number) => {
    setFormacionAcademica(prev => prev.filter(f => f.id !== id));
    toast.success('Formación eliminada');
  };

  const handleAgregarArea = () => {
    if (areaExpertise.trim() && !formData.areas_expertise.includes(areaExpertise)) {
      setFormData(prev => ({
        ...prev,
        areas_expertise: [...prev.areas_expertise, areaExpertise]
      }));
      setAreaExpertise('');
      toast.success('Área agregada');
    }
  };

  const handleEliminarArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      areas_expertise: prev.areas_expertise.filter((a: string) => a !== area)
    }));
  };

  const handleAgregarIdioma = () => {
    if (idioma.idioma && !formData.idiomas.some((i: any) => i.idioma === idioma.idioma)) {
      setFormData(prev => ({
        ...prev,
        idiomas: [...prev.idiomas, idioma]
      }));
      setIdioma({ idioma: 'Inglés', nivel: 'Básico' });
      toast.success('Idioma agregado');
    }
  };

  const handleEliminarIdioma = (idiomaName: string) => {
    setFormData(prev => ({
      ...prev,
      idiomas: prev.idiomas.filter((i: any) => i.idioma !== idiomaName)
    }));
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.nombres || !formData.apellidos || !formData.documento || !formData.email) {
      toast.error('Completa los campos obligatorios');
      setActiveTab('personal');
      return;
    }

    setIsSaving(true);

    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1500));

    const docenteData = {
      ...formData,
      formacion_academica: formacionAcademica,
      id: isEditing ? docente.id : `DOC-${Date.now()}`,
      codigo_docente: isEditing ? docente.codigo_docente : `DOC-${Math.floor(Math.random() * 10000)}`,
      foto_url: docente?.foto_url || ''
    };

    onSuccess(docenteData);
    setIsSaving(false);
    toast.success(
      isEditing ? 'Docente actualizado exitosamente' : 'Docente creado exitosamente',
      { duration: 3000 }
    );
    onClose();
  };

  const territorialesESAP = [
    'Bogotá', 'Antioquia', 'Valle del Cauca', 'Atlántico', 'Santander', 
    'Bolívar', 'Cundinamarca', 'Boyacá', 'Nariño', 'Tolima'
  ];

  const departamentosAcademicos = [
    'Administración Pública',
    'Derecho Público',
    'Economía y Finanzas Públicas',
    'Ciencias Políticas',
    'Gestión Territorial',
    'Metodología de la Investigación'
  ];

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
            <div className="w-screen max-w-3xl">
              <div className="flex h-full flex-col bg-white shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl text-white">
                          {isEditing ? 'Editar Docente' : 'Nuevo Docente'}
                        </h2>
                        <p className="text-blue-100 text-sm">
                          {isEditing ? `${docente.codigo_docente}` : 'Registro de nuevo docente'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
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
                  </TabsList>

                  <div className="flex-1 overflow-y-auto p-6">
                    {/* TAB 1: INFORMACIÓN PERSONAL */}
                    <TabsContent value="personal" className="mt-0 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombres">Nombres *</Label>
                          <Input
                            id="nombres"
                            value={formData.nombres}
                            onChange={(e) => handleInputChange('nombres', e.target.value)}
                            placeholder="Ej: Juan Carlos"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellidos">Apellidos *</Label>
                          <Input
                            id="apellidos"
                            value={formData.apellidos}
                            onChange={(e) => handleInputChange('apellidos', e.target.value)}
                            placeholder="Ej: Rodríguez López"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_documento">Tipo Doc *</Label>
                          <select
                            id="tipo_documento"
                            value={formData.tipo_documento}
                            onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="CC">Cédula</option>
                            <option value="CE">Cédula Extranjería</option>
                            <option value="PA">Pasaporte</option>
                          </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="documento">Número Documento *</Label>
                          <Input
                            id="documento"
                            value={formData.documento}
                            onChange={(e) => handleInputChange('documento', e.target.value)}
                            placeholder="Ej: 1234567890"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fecha_nacimiento">Fecha Nacimiento</Label>
                          <Input
                            id="fecha_nacimiento"
                            type="date"
                            value={formData.fecha_nacimiento}
                            onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="genero">Género</Label>
                          <select
                            id="genero"
                            value={formData.genero}
                            onChange={(e) => handleInputChange('genero', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado_civil">Estado Civil</Label>
                          <select
                            id="estado_civil"
                            value={formData.estado_civil}
                            onChange={(e) => handleInputChange('estado_civil', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Soltero">Soltero(a)</option>
                            <option value="Casado">Casado(a)</option>
                            <option value="Unión Libre">Unión Libre</option>
                            <option value="Divorciado">Divorciado(a)</option>
                            <option value="Viudo">Viudo(a)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Institucional *</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="nombre@esap.edu.co"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="telefono"
                              value={formData.telefono}
                              onChange={(e) => handleInputChange('telefono', e.target.value)}
                              placeholder="Ej: 310 123 4567"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          value={formData.direccion}
                          onChange={(e) => handleInputChange('direccion', e.target.value)}
                          placeholder="Ej: Calle 45 # 23-10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Input
                          id="ciudad"
                          value={formData.ciudad}
                          onChange={(e) => handleInputChange('ciudad', e.target.value)}
                          placeholder="Ej: Bogotá D.C."
                        />
                      </div>
                    </TabsContent>

                    {/* TAB 2: INFORMACIÓN LABORAL */}
                    <TabsContent value="laboral" className="mt-0 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="territorial">Territorial *</Label>
                          <select
                            id="territorial"
                            value={formData.territorial}
                            onChange={(e) => handleInputChange('territorial', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {territorialesESAP.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="departamento">Departamento Académico *</Label>
                          <select
                            id="departamento"
                            value={formData.departamento}
                            onChange={(e) => handleInputChange('departamento', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {departamentosAcademicos.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoria_escalafon">Categoría Escalafón *</Label>
                          <select
                            id="categoria_escalafon"
                            value={formData.categoria_escalafon}
                            onChange={(e) => handleInputChange('categoria_escalafon', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Titular">Titular</option>
                            <option value="Asociado">Asociado</option>
                            <option value="Asistente">Asistente</option>
                            <option value="Auxiliar">Auxiliar</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tipo_vinculacion">Tipo Vinculación *</Label>
                          <select
                            id="tipo_vinculacion"
                            value={formData.tipo_vinculacion}
                            onChange={(e) => handleInputChange('tipo_vinculacion', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Planta">Planta</option>
                            <option value="Ocasional">Ocasional</option>
                            <option value="Cátedra">Cátedra</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dedicacion">Dedicación</Label>
                          <select
                            id="dedicacion"
                            value={formData.dedicacion}
                            onChange={(e) => handleInputChange('dedicacion', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Tiempo Completo">Tiempo Completo</option>
                            <option value="Medio Tiempo">Medio Tiempo</option>
                            <option value="Hora Cátedra">Hora Cátedra</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <select
                            id="estado"
                            value={formData.estado}
                            onChange={(e) => handleInputChange('estado', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Activo">Activo</option>
                            <option value="Licencia">Licencia</option>
                            <option value="Retirado">Retirado</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fecha_vinculacion">Fecha Vinculación</Label>
                          <Input
                            id="fecha_vinculacion"
                            type="date"
                            value={formData.fecha_vinculacion}
                            onChange={(e) => handleInputChange('fecha_vinculacion', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="salario_basico">Salario Básico (COP)</Label>
                          <Input
                            id="salario_basico"
                            type="number"
                            value={formData.salario_basico}
                            onChange={(e) => handleInputChange('salario_basico', e.target.value)}
                            placeholder="Ej: 5000000"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB 3: INFORMACIÓN ACADÉMICA */}
                    <TabsContent value="academico" className="mt-0 space-y-6">
                      {/* Nivel Máximo de Formación */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nivel_formacion_max">Nivel Máximo</Label>
                          <select
                            id="nivel_formacion_max"
                            value={formData.nivel_formacion_max}
                            onChange={(e) => handleInputChange('nivel_formacion_max', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="Pregrado">Pregrado</option>
                            <option value="Especialización">Especialización</option>
                            <option value="Maestría">Maestría</option>
                            <option value="Doctorado">Doctorado</option>
                            <option value="Postdoctorado">Postdoctorado</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exp_docente">Exp. Docente (años)</Label>
                          <Input
                            id="exp_docente"
                            type="number"
                            value={formData.experiencia_docente_anos}
                            onChange={(e) => handleInputChange('experiencia_docente_anos', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exp_profesional">Exp. Profesional (años)</Label>
                          <Input
                            id="exp_profesional"
                            type="number"
                            value={formData.experiencia_profesional_anos}
                            onChange={(e) => handleInputChange('experiencia_profesional_anos', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Formación Académica */}
                      <Card className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-[#1e5da8]" />
                          Formación Académica
                        </h4>

                        {/* Lista de Formaciones */}
                        {formacionAcademica.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {formacionAcademica.map((formacion) => (
                              <div key={formacion.id} className="bg-white p-3 rounded-lg border flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-[#1e5da8] text-white">{formacion.nivel}</Badge>
                                    <span className="text-sm font-medium text-gray-900">{formacion.titulo}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{formacion.institucion} - {formacion.año_graduacion}</p>
                                </div>
                                <button
                                  onClick={() => handleEliminarFormacion(formacion.id)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Agregar Nueva Formación */}
                        <div className="space-y-3 p-3 bg-white rounded-lg border">
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={nuevaFormacion.nivel}
                              onChange={(e) => setNuevaFormacion(prev => ({ ...prev, nivel: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="Pregrado">Pregrado</option>
                              <option value="Especialización">Especialización</option>
                              <option value="Maestría">Maestría</option>
                              <option value="Doctorado">Doctorado</option>
                              <option value="Postdoctorado">Postdoctorado</option>
                            </select>
                            <Input
                              placeholder="Año"
                              value={nuevaFormacion.año_graduacion}
                              onChange={(e) => setNuevaFormacion(prev => ({ ...prev, año_graduacion: e.target.value }))}
                              className="text-sm"
                            />
                          </div>
                          <Input
                            placeholder="Título obtenido"
                            value={nuevaFormacion.titulo}
                            onChange={(e) => setNuevaFormacion(prev => ({ ...prev, titulo: e.target.value }))}
                            className="text-sm"
                          />
                          <Input
                            placeholder="Institución"
                            value={nuevaFormacion.institucion}
                            onChange={(e) => setNuevaFormacion(prev => ({ ...prev, institucion: e.target.value }))}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAgregarFormacion}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Formación
                          </Button>
                        </div>
                      </Card>

                      {/* Áreas de Expertise */}
                      <Card className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-[#1e5da8]" />
                          Áreas de Expertise
                        </h4>

                        {formData.areas_expertise.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {formData.areas_expertise.map((area: string) => (
                              <Badge key={area} variant="secondary" className="flex items-center gap-1">
                                {area}
                                <button
                                  onClick={() => handleEliminarArea(area)}
                                  className="ml-1 hover:bg-gray-300 rounded-full"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            placeholder="Ej: Gestión Pública"
                            value={areaExpertise}
                            onChange={(e) => setAreaExpertise(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAgregarArea()}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAgregarArea}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>

                      {/* Idiomas */}
                      <Card className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-4">Idiomas</h4>

                        {formData.idiomas.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {formData.idiomas.map((idioma: any) => (
                              <div key={idioma.idioma} className="bg-white p-2 rounded flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{idioma.idioma}</span>
                                  <Badge variant="outline" className="text-xs">{idioma.nivel}</Badge>
                                </div>
                                <button
                                  onClick={() => handleEliminarIdioma(idioma.idioma)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <select
                            value={idioma.idioma}
                            onChange={(e) => setIdioma(prev => ({ ...prev, idioma: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="Inglés">Inglés</option>
                            <option value="Francés">Francés</option>
                            <option value="Portugués">Portugués</option>
                            <option value="Alemán">Alemán</option>
                            <option value="Italiano">Italiano</option>
                          </select>
                          <select
                            value={idioma.nivel}
                            onChange={(e) => setIdioma(prev => ({ ...prev, nivel: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="Básico">Básico</option>
                            <option value="Intermedio">Intermedio</option>
                            <option value="Avanzado">Avanzado</option>
                            <option value="Nativo">Nativo</option>
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAgregarIdioma}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>

                {/* Footer Actions */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      * Campos obligatorios
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="bg-[#1e5da8] hover:bg-[#1a4d8f] text-white"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {isEditing ? 'Guardar Cambios' : 'Crear Docente'}
                          </>
                        )}
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
