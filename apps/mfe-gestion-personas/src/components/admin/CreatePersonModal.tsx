import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, MapPin, Calendar, FileText, GraduationCap,
  Briefcase, Check, CheckCircle, Save, IdCard,
  Building2, Users as UsersIcon, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '../../hooks/useRoles';
import { TERRITORIALES_ESAP } from '../../data/territoriales-cetap-completo';
import { PROGRAMAS_ESAP } from '../../../../mfe-programas-academicos/src/data/oferta-academica-esap';
import { estructuraService } from '../../services/estructuraService';
import { dependenciasService } from '../../services/api/dependencias.service';
import type { Dependencia } from '../../services/api/dependencias.service';

// Reusable Modal Header from the platform
function ModalHeaderClean({ icono: Icon, titulo, subtitulo, onClose, colorIcono }: any) {
  return (
    <div className="px-6 py-5 bg-white border-b border-gray-100 flex items-start justify-between shrink-0">
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 leading-tight">{titulo}</h2>
          <p className="text-[13px] font-medium text-gray-500">{subtitulo}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// Reusable components
function InputLabel({ label, required }: any) {
  return (
    <label className="block text-xs font-bold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export function CreatePersonModal({ isOpen, onClose, onCreate, editMode = false, initialData = null }: any) {
  const { roles } = useRoles();
  const [pasoActual, setPasoActual] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', documentType: 'CC', documentNumber: '', birthDate: '', gender: '',
    email: '', phone: '', address: '', city: '',
    role: 'Estudiante', program: '',
    empresaContratista: '', dependenciaGrupoPrograma: '', cargoSemestre: '', contrato: '', enrollmentDate: '', fechaFinContrato: '', observaciones: '',
    tipoVinculacion: '', horasAsignables: '', pregradoDetalle: '', doctoradoDetalle: '', puntajeSalarial: '', territorial: '', cetap: '',
    status: 'active',
    asignacionesSedes: [] as any[],
    sedePrincipalId: undefined as string | undefined,
    idSeccional: undefined as number | undefined,
    idSede: undefined as number | undefined,
    idDependencia: undefined as number | null,
  });

  const [seccionales, setSeccionales] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [isLoadingEstructura, setIsLoadingEstructura] = useState(false);
  const [isLoadingDependencias, setIsLoadingDependencias] = useState(false);

  useEffect(() => {
    setIsLoadingEstructura(true);
    estructuraService.obtenerEstructura().then(res => {
      setSeccionales(res.data?.seccionales || []);
      setSedes(res.data?.sedes || []);
    }).catch(err => {
      console.error('Error cargando estructura organizacional:', err);
    }).finally(() => {
      setIsLoadingEstructura(false);
    });

    setIsLoadingDependencias(true);
    dependenciasService.listar().then(setDependencias).catch(err => {
      console.error('Error cargando dependencias:', err);
      setDependencias([]);
    }).finally(() => {
      setIsLoadingDependencias(false);
    });
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editMode && initialData && isOpen) {
      const nameParts = initialData.fullName?.split(' ') || ['', ''];
      
      const currentDate = new Date().toISOString().split('T')[0];
      const normalizedSedeId = initialData.idSede ? String(initialData.idSede) : undefined;
      const existingAsignaciones = initialData.asignacionesSedes || [];
      const hasAsignaciones = existingAsignaciones.length > 0;
    
      const asignacionesSedes = hasAsignaciones
        ? existingAsignaciones
        : normalizedSedeId
          ? [{
              unidadId: normalizedSedeId,
              ambitoAcceso: 'local',
              esPrincipal: true,
              fechaInicio: currentDate,
            }]
          : [];
    
      const sedePrincipalId =
        initialData.sedePrincipalId ||
        asignacionesSedes.find((a: any) => a.esPrincipal)?.unidadId ||
        normalizedSedeId;

      const idSede = initialData.idSede || (asignacionesSedes.find((a: any) => a.esPrincipal)?.unidadId) || undefined;
      const idSeccional = initialData.idSeccional || undefined;

      const person = initialData.person || {};
      const finalNameParts = (initialData.fullName || person.full_name)?.split(' ') || nameParts;

      console.log('🔍 [CREATE USER] INITIAL DATA:', initialData);

      setFormData({
        ...formData,
        firstName: initialData.firstName || person.first_name || finalNameParts[0] || '',
        lastName: initialData.lastName || person.last_name || finalNameParts.slice(1).join(' ') || '',
        documentType: initialData.documentType || person.identification_type || initialData.identificationType || 'CC',
        documentNumber: initialData.documentNumber || person.identification_number || initialData.document || initialData.identification_number || '',
        email: initialData.email || person.email || '',
        phone: initialData.phone || person.phone || '',
        gender: initialData.gender || person.gender || '',
        birthDate: (initialData.birthDate || person.birth_date || '')?.split('T')[0] || '',
        address: initialData.address || person.address || '',
        city: initialData.city || person.city || '',
        empresaContratista: initialData.empresaContratista || person.empresa_contratista || '',
        dependenciaGrupoPrograma: initialData.dependenciaGrupoPrograma || person.dependencia_grupo_programa || '',
        cargoSemestre: initialData.cargoSemestre || person.cargo_semestre || '',
        contrato: initialData.contrato || person.contrato || '',
        enrollmentDate: initialData.enrollmentDate || person.enrollment_date || '',
        fechaFinContrato: initialData.fechaFinContrato || person.fecha_fin_contrato || '',
        observaciones: initialData.observaciones || person.observaciones || '',
        tipoVinculacion: initialData.tipoVinculacion || person.tipo_vinculacion || '',
        horasAsignables: initialData.horasAsignables || person.horas_asignables || '',
        pregradoDetalle: initialData.pregradoDetalle || person.pregrado_detalle || '',
        doctoradoDetalle: initialData.doctoradoDetalle || person.doctorado_detalle || '',
        puntajeSalarial: initialData.puntajeSalarial || person.puntaje_salarial || '',
        role: initialData.role || (initialData.roles?.[0]?.name) || 'Estudiante',
        status: initialData.status || (initialData.is_active === false ? 'inactive' : 'active'),
        asignacionesSedes,
        sedePrincipalId,
        idSeccional: idSeccional ? Number(idSeccional) : undefined,
        idSede: idSede ? Number(idSede) : undefined,
        idDependencia: initialData.idDependencia || initialData.person?.idDependencia
          ? Number(initialData.idDependencia || initialData.person?.idDependencia)
          : null,
      });
      setPasoActual(1);
    }
  }, [editMode, initialData, isOpen]);

  const totalPasos = formData.role === 'Docente' ? 3 : 2;
  const porcentajeProgreso = (pasoActual / totalPasos) * 100;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const inputClass = (hasError: boolean) => 
    `w-full px-3 py-2 text-[13px] border rounded-xl outline-none transition-all shadow-sm ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`;

  const maxDateObj = new Date();
  maxDateObj.setFullYear(maxDateObj.getFullYear() - 14);
  const maxDateString = `${maxDateObj.getFullYear()}-${String(maxDateObj.getMonth() + 1).padStart(2, '0')}-${String(maxDateObj.getDate()).padStart(2, '0')}`;

  const validarPasoActual = () => {
    const newErrors: Record<string, string> = {};
    let errorMessage = 'Por favor, revise los campos marcados en rojo.';

    if (pasoActual === 1) {
      const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

      if (!formData.firstName) {
        newErrors.firstName = 'Requerido';
      } else if (!nameRegex.test(formData.firstName)) {
        newErrors.firstName = 'Solo letras';
        errorMessage = 'Los nombres no pueden contener números ni caracteres especiales.';
      }

      if (!formData.lastName) {
        newErrors.lastName = 'Requerido';
      } else if (!nameRegex.test(formData.lastName)) {
        newErrors.lastName = 'Solo letras';
        errorMessage = 'Los apellidos no pueden contener números ni caracteres especiales.';
      }

      if (!formData.documentNumber) {
        newErrors.documentNumber = 'Requerido';
      } else if (!/^[0-9]+$/.test(formData.documentNumber)) {
        newErrors.documentNumber = 'Solo números';
        errorMessage = 'El número de documento solo puede contener números.';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email) {
        newErrors.email = 'Requerido';
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Inválido';
        errorMessage = 'El correo electrónico ingresado no tiene un formato válido.';
      }

      if (formData.email.split('@')[1] !== 'esap.edu.co') {
        newErrors.email = 'Debe ser de la institución ESAP';
        errorMessage = 'El correo electrónico ingresado debe ser de la institución ESAP.';
      }

      if (!formData.phone) {
        newErrors.phone = 'Requerido';
      } else if (formData.phone.length !== 10 || !/^[0-9]+$/.test(formData.phone)) {
        newErrors.phone = 'Inválido';
        errorMessage = 'El teléfono debe contener exactamente 10 dígitos numéricos.';
      }

      // if (!formData.city) newErrors.city = 'Requerido';
      
      if (!formData.birthDate) {
        newErrors.birthDate = 'Requerido';
      } else {
        // Validación de 14 años
        const selectedDate = new Date(formData.birthDate);
        if (selectedDate > maxDateObj) {
          newErrors.birthDate = 'El usuario debe tener al menos 14 años';
          errorMessage = 'El usuario debe tener al menos 14 años para ser creado en la plataforma.';
        }
      }
    } else if (pasoActual === 2) {
      if (!formData.role) {
        newErrors.role = 'Requerido';
        errorMessage = 'Debe seleccionar un rol institucional.';
      }
      if (!formData.idSeccional && !formData.idSede) {
        newErrors.idSede = 'Requerido';
        errorMessage = 'Debe seleccionar al menos la territorial o sede.';
      }

      if (formData.role === 'Estudiante' && !formData.program) {
        newErrors.program = 'Requerido';
        errorMessage = 'Debe seleccionar un programa académico para el estudiante.';
      }
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Validación incorrecta', { description: errorMessage });
      return false;
    }
    return true;
  };

  const siguiente = () => {
    if (validarPasoActual()) setPasoActual(prev => Math.min(prev + 1, totalPasos));
  };
  const anterior = () => setPasoActual(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    if (!validarPasoActual()) return;
    setIsSubmitting(true);
    try {
      await onCreate(formData);
      toast.success(editMode ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al guardar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pasosConfig = [
    { num: 1, label: 'Datos Personales' },
    { num: 2, label: 'Info. Institucional' },
    ...(formData.role === 'Docente' ? [{ num: 3, label: 'Banco Docentes' }] : [])
  ];

  const subtituloHeader = 
    pasoActual === 1 ? 'Identificación y Contacto' :
    pasoActual === 2 ? 'Rol y vinculación con la institución' :
    'Información adicional del docente';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} hideCloseButton className="w-[95vw] max-w-[900px] lg:max-w-5xl max-h-[90vh] flex flex-col !p-0 border-0 bg-transparent overflow-hidden sm:!p-0 gap-0">
        
        {/* Fondo blanco real para todo el contenido dentro del dialog content que no tiene padding */}
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border-0">
          <DialogTitle className="sr-only">{editMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
          <DialogDescription className="sr-only">Wizard de usuario - Paso {pasoActual}</DialogDescription>

          <ModalHeaderClean
            icono={UsersIcon}
            titulo={editMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            subtitulo={subtituloHeader}
            colorIcono="blue"
            onClose={onClose}
          />

          {/* Progress Bar (Estilo World Class idéntico al de Nuevo Proceso) */}
          <div className="flex-shrink-0 px-6 pt-2 bg-white">
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${porcentajeProgreso}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-3 mb-2 text-xs">
              {pasosConfig.map((paso) => (
                <div key={paso.num} className="flex flex-col items-center relative z-10 w-24">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${pasoActual === paso.num
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : pasoActual > paso.num
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }`}>
                    {pasoActual > paso.num ? <Check className="w-4 h-4" strokeWidth={3} /> : paso.num}
                  </div>
                  <span className={`text-[10px] mt-1 text-center ${pasoActual === paso.num ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                    {paso.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BODY CONTENIDO */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
            <div className="w-full space-y-6">
              
              {pasoActual === 1 && (
                <div className="flex flex-col gap-6">
                  {/* Bloque Identificación */}
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-5">
                      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Identificación Personal</h3>
                        <p className="text-xs text-gray-600">Datos básicos de identidad del usuario</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-5 rounded-lg border border-blue-100 shadow-sm">
                      <div>
                        <InputLabel label="Nombres" required />
                        <input type="text" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''))} className={inputClass(!!errors.firstName)} placeholder="Ej: Juan Carlos" />
                      </div>
                      <div>
                        <InputLabel label="Apellidos" required />
                        <input type="text" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''))} className={inputClass(!!errors.lastName)} placeholder="Ej: Pérez" />
                      </div>
                      <div>
                        <InputLabel label="Tipo de Documento" required />
                        <select value={formData.documentType} onChange={(e) => handleChange('documentType', e.target.value)} className={inputClass(false)}>
                          <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="TI">Tarjeta de Identidad</option>
                        </select>
                      </div>
                      <div>
                        <InputLabel label="# Número de Documento" required />
                        <input type="text" value={formData.documentNumber} onChange={(e) => handleChange('documentNumber', e.target.value.replace(/\D/g, ''))} className={inputClass(!!errors.documentNumber)} placeholder="Solo números" />
                      </div>
                      <div>
                        <InputLabel label="Fecha de Nacimiento" required />
                        <input type="date" max={maxDateString} value={formData.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} className={inputClass(!!errors.birthDate)} />
                      </div>
                      <div>
                        <InputLabel label="Género" />
                        <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className={inputClass(false)}>
                          <option value="">Seleccionar</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bloque Contacto */}
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-5">
                      <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Contacto y Ubicación</h3>
                        <p className="text-xs text-gray-600">Información para notificaciones y residencia</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-5 rounded-lg border border-emerald-100 shadow-sm">
                      <div>
                        <InputLabel label="Correo Electrónico" required />
                        <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className={inputClass(!!errors.email)} placeholder="correo@esap.edu.co" />
                      </div>
                      <div>
                        <InputLabel label="Teléfono" required />
                        <input type="tel" maxLength={10} value={formData.phone} onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))} className={inputClass(!!errors.phone)} placeholder="10 dígitos" />
                      </div>
                      <div>
                        <InputLabel label="Ciudad" />
                        <input type="text" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} className={inputClass(!!errors.city)} placeholder="Ej: Bogotá D.C." />
                      </div>
                      <div className="md:col-span-3">
                        <InputLabel label="Dirección" />
                        <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={inputClass(false)} placeholder="Ej: Calle 123 #45-67" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pasoActual === 2 && (
                <div className="h-full flex flex-col gap-6">
                  {/* Rol */}
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-5">
                      <UserCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Rol Principal</h3>
                        <p className="text-xs text-gray-600">Perfil y asignación dentro de la institución</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-lg border border-amber-100 shadow-sm">
                      <div className={editMode ? "md:col-span-1" : "md:col-span-2"}>
                        <InputLabel label="Seleccione el Rol" required />
                        <select value={formData.role} onChange={(e) => handleChange('role', e.target.value)} className={inputClass(!!errors.role)}>
                          <option value="">Seleccione un rol...</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.nombre}>{r.nombre}</option>
                          ))}
                        </select>
                      </div>
                      
                      {editMode && (
                        <div className="md:col-span-1">
                          <InputLabel label="Estado" required />
                          <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass(false)}>
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                            <option value="blocked">Bloqueado</option>
                            <option value="pending">Pendiente</option>
                          </select>
                        </div>
                      )}

                      <div className="md:col-span-2" style={{ display: 'none' }}>
                        <InputLabel label="Programa Académico" />
                        <select value={formData.program} onChange={(e) => handleChange('program', e.target.value)} className={inputClass(!!errors.program)}>
                          <option value="">Seleccionar programa...</option>
                          {PROGRAMAS_ESAP.map(p => (
                            <option key={p.id} value={p.nombre}>{p.nombre} ({p.nivelFormacion})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                         <div className="border-t border-gray-200 pt-4 mt-2">
                           <h4 className="font-semibold text-gray-800 mb-3 text-sm">Asignación de Sede <span className="text-red-500">*</span></h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                               <InputLabel label="Territorial (Seccional)" required />
                               <select 
                                 value={formData.idSeccional || ''} 
                                 onChange={(e) => {
                                   handleChange('idSeccional', e.target.value ? Number(e.target.value) : undefined);
                                   // Resetear la sede al cambiar territorial
                                   handleChange('idSede', undefined);
                                 }} 
                                 className={inputClass(!!errors.idSede)}
                                 disabled={isLoadingEstructura}
                               >
                                 <option value="">Seleccionar territorial...</option>
                                 {seccionales.map(sec => (
                                   <option key={sec.idSeccional} value={sec.idSeccional}>{sec.nomSeccional}</option>
                                 ))}
                               </select>
                             </div>
                             <div>
                               <InputLabel label="CETAP (Sede)" />
                               <select 
                                 value={formData.idSede || ''} 
                                 onChange={(e) => handleChange('idSede', e.target.value ? Number(e.target.value) : undefined)} 
                                 className={inputClass(false)}
                                 disabled={isLoadingEstructura || !formData.idSeccional}
                               >
                                 <option value="">Seleccionar CETAP/Sede...</option>
                                 {sedes
                                  .filter(s => s.idSeccional == formData.idSeccional)
                                  .map(sede => (
                                   <option key={sede.idSede} value={sede.idSede}>{sede.nomSede}</option>
                                 ))}
                               </select>
                               {errors.idSede && <p className="mt-1 text-xs text-red-500">{errors.idSede}</p>}
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Datos Institucionales */}
                  <div className="p-5 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-5">
                      <Building2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Vinculación Institucional</h3>
                        <p className="text-xs text-gray-600">Información de la vinculación y contratación</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-5 rounded-lg border border-purple-100 shadow-sm">
                      <div><InputLabel label="Empresa Contratista" /><input type="text" value={formData.empresaContratista} onChange={(e) => handleChange('empresaContratista', e.target.value)} className={inputClass(false)} /></div>
                      <div>
                        <InputLabel label="Dependencia" />
                        <select
                          value={formData.idDependencia ?? ''}
                          onChange={(e) => handleChange('idDependencia', e.target.value ? Number(e.target.value) : null)}
                          className={inputClass(false)}
                          disabled={isLoadingDependencias}
                        >
                          <option value="">Seleccionar dependencia...</option>
                          {dependencias.map(dep => (
                            <option key={dep.idDependencia} value={dep.idDependencia}>
                              {dep.codDependencia} - {dep.nomDependencia}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div><InputLabel label="Cargo / Semestre" /><input type="text" value={formData.cargoSemestre} onChange={(e) => handleChange('cargoSemestre', e.target.value)} className={inputClass(false)} /></div>
                      <div><InputLabel label="Contrato" /><input type="text" value={formData.contrato} onChange={(e) => handleChange('contrato', e.target.value)} className={inputClass(false)} /></div>
                      <div><InputLabel label="Fecha Ingreso" /><input type="date" value={formData.enrollmentDate} onChange={(e) => handleChange('enrollmentDate', e.target.value)} className={inputClass(false)} /></div>
                      <div><InputLabel label="Fecha Fin Retiro" /><input type="date" value={formData.fechaFinContrato} onChange={(e) => handleChange('fechaFinContrato', e.target.value)} className={inputClass(false)} /></div>
                      <div className="md:col-span-3"><InputLabel label="Observaciones" /><textarea value={formData.observaciones} onChange={(e) => handleChange('observaciones', e.target.value)} rows={2} className={inputClass(false)} /></div>
                    </div>
                  </div>
                </div>
              )}

              {pasoActual === 3 && formData.role === 'Docente' && (
                <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-start gap-3 mb-5">
                    <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Banco de Docentes</h3>
                      <p className="text-xs text-gray-600">Información adicional extendida del docente</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-5 rounded-lg border border-indigo-100 shadow-sm">
                    <div>
                      <InputLabel label="Tipo Vinculación" />
                      <select value={formData.tipoVinculacion} onChange={(e) => handleChange('tipoVinculacion', e.target.value)} className={inputClass(false)}>
                        <option value="">Seleccionar...</option><option value="CARRERA">Carrera Docente</option><option value="OCASIONAL">Ocasional</option>
                      </select>
                    </div>
                    <div><InputLabel label="Horas Asignables" /><input type="number" value={formData.horasAsignables} onChange={(e) => handleChange('horasAsignables', e.target.value)} className={inputClass(false)} /></div>
                    <div>
                      <InputLabel label="Territorial" />
                      <select value={formData.territorial} onChange={(e) => handleChange('territorial', e.target.value)} className={inputClass(false)}>
                        <option value="">Seleccionar territorial...</option>
                        {TERRITORIALES_ESAP.map(t => <option key={t.codigo} value={t.nombre}>{t.nombre}</option>)}
                      </select>
                    </div>
                    <div><InputLabel label="Pregrado" /><input type="text" value={formData.pregradoDetalle} onChange={(e) => handleChange('pregradoDetalle', e.target.value)} className={inputClass(false)} /></div>
                    <div><InputLabel label="Doctorado" /><input type="text" value={formData.doctoradoDetalle} onChange={(e) => handleChange('doctoradoDetalle', e.target.value)} className={inputClass(false)} /></div>
                    <div><InputLabel label="Puntaje Salarial" /><input type="number" step="0.01" value={formData.puntajeSalarial} onChange={(e) => handleChange('puntajeSalarial', e.target.value)} className={inputClass(false)} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
            {pasoActual > 1 ? (
              <button onClick={anterior} disabled={isSubmitting} className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
                Anterior
              </button>
            ) : (
              <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
            )}

            {pasoActual < totalPasos ? (
              <button onClick={siguiente} disabled={isSubmitting} className="px-6 py-2 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">
                Siguiente
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 rounded-xl text-[13px] font-bold text-white bg-[#003DA5] hover:bg-[#002b75] transition-colors flex items-center gap-2 shadow-md shadow-blue-900/20 disabled:opacity-70">
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Guardando...' : (editMode ? 'Guardar Cambios' : 'Crear Usuario')}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}