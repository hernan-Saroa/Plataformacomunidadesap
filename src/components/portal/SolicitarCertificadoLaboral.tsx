import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PublicNavbar } from './PublicNavbar';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  User,
  Shield,
  ArrowLeft,
  Loader2,
  QrCode,
  Mail,
  Lock,
  Send,
  Eye,
  Printer,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { simularEnvioCorreo } from '../../utils/emailTemplates';
import { certificadosService } from '../../services/api/certificados.service';
import { VisorPDFCertificado } from '../certificados-laborales/VisorPDFCertificado';
import { QRCodeCanvas } from 'qrcode.react';
import { getPublicBaseUrl } from '../../config/environment';
import { useIsMobile } from '../ui/use-mobile';
import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';

interface SolicitarCertificadoLaboralProps {
  onBack: () => void;
  onLoginClick: () => void;
}

interface EmpleadoData {
  tipo_documento: string;
  numero_documento: string;
  nombre_completo: string;
  tipo_vinculacion: string;
  cargo: string;
  dependencia: string;
  dependenciaPadre?: string;
  fecha_vinculacion: string;
  estado: 'Activo' | 'Retirado';
  correo_institucional: string;
  correo_personal: string;
  salario_actual: number;
  templateType?: 'docente' | 'administrador';
}

interface CertificadoGenerado {
  numero_radicado: string;
  tipo_certificado: string;
  fecha_generacion: string;
  cargo: string;
  dependencia: string;
  dependenciaPadre?: string;
  fecha_vinculacion: string;
  salario_actual: number;
  prima_tecnica?: number;
  incluyePrimaTecnica?: boolean;
  salario_original?: number;
  salario_texto_original?: string;
  incluyeSalario?: boolean;
  qr_code: string;
  nombre_completo: string;
  certificado_completo?: any; // Datos completos del certificado para el visor PDF
}

const formatearTiempo = (segundos: number): string => {
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${minutos}:${segs.toString().padStart(2, '0')}`;
};

function StepPresence({ shouldAnimate, children }: { shouldAnimate: boolean; children: ReactNode }) {
  return shouldAnimate ? <AnimatePresence mode="wait">{children}</AnimatePresence> : <>{children}</>;
}

function CodigoCountdown({
  isActive,
  durationSeconds = 300,
  onExpire,
}: {
  isActive: boolean;
  durationSeconds?: number;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    setTimeLeft(durationSeconds);
    expiredRef.current = false;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, durationSeconds, onExpire]);

  if (!isActive) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-gray-600" />
        <p className="text-sm text-gray-700">
          Código expira en: <strong>{formatearTiempo(timeLeft)}</strong>
        </p>
      </div>
    </div>
  );
}

// Función para enmascarar correo (Habeas Data)
// Muestra: 2 caracteres iniciales + asteriscos + 6 caracteres finales
const enmascararCorreo = (correo: string): string => {
  if (typeof correo !== 'string' || !correo || correo.length < 10) return correo || '';
  
  const [usuario, dominio] = correo.split('@');
  
  if (!usuario || !dominio) return correo;
  
  // Tomar 2 primeros caracteres del usuario
  const inicio = usuario.substring(0, 2);
  
  // Calcular cuántos asteriscos poner en el medio
  const cantidadAsteriscos = Math.max(usuario.length - 8, 3); // Mínimo 3 asteriscos
  const asteriscos = '*'.repeat(cantidadAsteriscos);
  
  // Tomar últimos 6 caracteres (del usuario + @ + parte del dominio)
  const final = correo.substring(correo.length - 6);
  
  return `${inicio}${asteriscos}${final}`;
};

// Mock de base de datos de empleados (Administrativos y Docentes)
const BASE_DATOS_EMPLEADOS: EmpleadoData[] = [
  {
    tipo_documento: 'CC',
    numero_documento: '1234567890',
    nombre_completo: 'Juan Carlos Pérez González',
    tipo_vinculacion: 'Administrativo',
    cargo: 'Coordinador de Talento Humano',
    dependencia: 'Dirección Nacional - Talento Humano',
    fecha_vinculacion: '2018-03-15',
    estado: 'Activo',
    correo_institucional: 'juan.perez@esap.edu.co',
    correo_personal: 'jcperez@gmail.com',
    salario_actual: 5800000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '9876543210',
    nombre_completo: 'Ana María López Rodríguez',
    tipo_vinculacion: 'Docente Planta',
    cargo: 'Docente Tiempo Completo',
    dependencia: 'Facultad de Pregrado - Administración Pública',
    fecha_vinculacion: '2015-02-01',
    estado: 'Activo',
    correo_institucional: 'ana.lopez@esap.edu.co',
    correo_personal: 'amlopez@hotmail.com',
    salario_actual: 6500000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '5555555555',
    nombre_completo: 'Carlos Andrés Martínez Díaz',
    tipo_vinculacion: 'Docente Cátedra',
    cargo: 'Docente Cátedra',
    dependencia: 'Facultad de Posgrados - Especialización en Gestión Pública',
    fecha_vinculacion: '2020-08-01',
    estado: 'Activo',
    correo_institucional: 'carlos.martinez@esap.edu.co',
    correo_personal: 'cmartinez@yahoo.com',
    salario_actual: 3200000
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1111111111',
    nombre_completo: 'María Fernanda Gómez Castro',
    tipo_vinculacion: 'Administrativo',
    cargo: 'Asistente Administrativo',
    dependencia: 'Territorial Antioquia - Sede Medellín',
    fecha_vinculacion: '2022-01-10',
    estado: 'Activo',
    correo_institucional: 'maria.gomez@esap.edu.co',
    correo_personal: 'mfgomez@outlook.com',
    salario_actual: 2800000
  }
];

type Paso = 'ingreso-documento' | 'validacion-codigo' | 'certificado-generado';

export function SolicitarCertificadoLaboral({ onBack, onLoginClick }: SolicitarCertificadoLaboralProps) {
  const resolverTemplateType = (data?: { position_category?: string; career_category?: string }) => {
    const baseTexto = String(data?.career_category ?? '').toLowerCase();
    const textoNormalizado = typeof baseTexto.normalize === 'function' ? baseTexto.normalize('NFD') : baseTexto;
    const texto = textoNormalizado
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!texto) {
      return 'administrador';
    }

    return /\bdocen\w*\b|\bdoc\b/.test(texto) ? 'docente' : 'administrador';
  };

  const parseDateOnly = (fechaStr?: string) => {
    if (!fechaStr) {
      return null;
    }
    const isoMatch = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day, 12, 0, 0);
    }
    const parsed = new Date(fechaStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const mapCertificadoExistente = (cert: any): CertificadoGenerado => {
    const templateType = resolverTemplateType(cert);
    const salarioBase = cert.monthly_salary || 0;
    const salarioTextoBase = cert.salary_text;
    const bonusBase = cert.technical_bonus ?? salarioBase * 0.2;
    return {
      numero_radicado: cert.certificate_number || cert.verification_code || `CERT-${Date.now()}`,
      tipo_certificado: 'Certificado Laboral General',
      fecha_generacion: cert.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      cargo: cert.career_category || 'N/A',
      dependencia: cert.department || 'N/A',
      dependenciaPadre: cert.department_parent || cert.departmentParent || 'Registro padre',
      fecha_vinculacion: cert.hiring_date?.split('T')[0] || 'N/A',
      salario_actual: salarioBase,
      prima_tecnica: bonusBase,
      salario_original: salarioBase,
      salario_texto_original: salarioTextoBase,
      incluyeSalario: true,
      incluyePrimaTecnica: false,
      qr_code: cert.verification_code || `QR-CERT-${cert.id}`,
      nombre_completo: cert.full_name || 'N/A',
      certificado_completo: {
        id: cert.id,
        consecutivo: cert.certificate_number || cert.verification_code,
        qrCode: cert.verification_code,
        cantidadEscaneos: 0,
        incluyeSalario: true,
        incluyePrimaTecnica: false,
        technical_bonus: bonusBase,
        empleado: {
          nombre: cert.full_name,
          documento: cert.id_number,
          email: cert.email || cert.certificate_email || 'N/A',
          cargo: cert.career_category,
          dependencia: cert.department || 'N/A',
          dependenciaPadre: cert.department_parent || cert.departmentParent || 'Registro padre',
          tipoVinculacion: cert.position_category || 'Administrativo',
          fechaVinculacion: cert.hiring_date,
          grado: cert.position_location || 'N/A',
          salario: salarioBase,
          salarioOriginal: salarioBase,
          salarioTexto: salarioTextoBase,
          salarioTextoOriginal: salarioTextoBase
        },
        estado: cert.status?.toLowerCase?.() || 'activo',
        tipoSolicitud: 'AUTOSERVICIO' as const,
        fechaSolicitud: cert.created_at || new Date().toISOString(),
        fechaGeneracion: cert.issue_date || new Date().toISOString(),
        solicitante: {
          nombre: cert.full_name,
          tipo: 'autoservicio' as const
        },
        position_location: cert.position_location,
        department: cert.department,
        campus: cert.campus,
        signer_name: cert.signer_name,
        signer_position: cert.signer_position,
        signer_department: cert.signer_department,
        templateType,
      },
    };
  };

  // Estados del flujo
  const [pasoActual, setPasoActual] = useState<Paso>('ingreso-documento');
  const [certificadoExistente, setCertificadoExistente] = useState(false);
  const [incluirSalario, setIncluirSalario] = useState(true);
  const incluirPrimaTecnica = false;
  const certificadoBaseRef = useRef<CertificadoGenerado | null>(null);
  
  // Paso 1: Ingreso de documento
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<EmpleadoData | null>(null);
  const numeroDocumentoRef = useRef('');
  const numeroDocumentoInputRef = useRef<HTMLInputElement | null>(null);
  
  // Paso 2: Validación de código (6 dígitos individuales)
  const [digitosCodigo, setDigitosCodigo] = useState<string[]>(['', '', '', '', '', '']);
  const [codigoEnviado, setCodigoEnviado] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [codigoExpirado, setCodigoExpirado] = useState(false);
  const [countdownSeed, setCountdownSeed] = useState(0);
  const codigoMobileRef = useRef('');
  const codigoMobileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Paso 3: Certificado generado
  const [certificadoGenerado, setCertificadoGenerado] = useState<CertificadoGenerado | null>(null);

  // Estados para el visor de PDF
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [autoPDFAction, setAutoPDFAction] = useState<'download' | 'print' | 'email' | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const emailDestinoRef = useRef<string | null>(null);
  const lastEmailSentRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    return coarsePointer || hasTouch;
  }, []);
  const useNativeInputs = isTouchDevice;

  const aplicarPreferenciasCertificado = (cert: CertificadoGenerado | null, incluir: boolean, incluirPrima: boolean): CertificadoGenerado | null => {
    if (!cert) return cert;

    const salarioBase = cert.salario_original ?? cert.salario_actual ?? 0;
    const salarioTextoBase =
      cert.salario_texto_original ||
      cert.certificado_completo?.empleado?.salarioTextoOriginal ||
      cert.certificado_completo?.empleado?.salarioTexto ||
      '';

    const empleadoCertificado = cert.certificado_completo?.empleado;

    const bonusBase = incluirPrima ? (cert.prima_tecnica ?? salarioBase * 0.2) : 0;

    const certificadoActualizado: CertificadoGenerado = {
      ...cert,
      salario_original: cert.salario_original ?? salarioBase,
      salario_texto_original: cert.salario_texto_original ?? salarioTextoBase,
      incluyeSalario: incluir,
      incluyePrimaTecnica: incluirPrima,
      salario_actual: incluir ? salarioBase : 0,
      prima_tecnica: bonusBase,
      certificado_completo: cert.certificado_completo
        ? {
            ...cert.certificado_completo,
            incluyeSalario: incluir,
            incluyePrimaTecnica: incluirPrima,
            technical_bonus: bonusBase,
            empleado: empleadoCertificado
              ? {
                  ...empleadoCertificado,
                  salario: incluir ? salarioBase : 0,
                  salarioTexto: incluir ? salarioTextoBase : '',
                  salarioOriginal: empleadoCertificado.salarioOriginal ?? empleadoCertificado.salario ?? salarioBase,
                  salarioTextoOriginal:
                    empleadoCertificado.salarioTextoOriginal ?? empleadoCertificado.salarioTexto ?? salarioTextoBase,
                }
              : empleadoCertificado,
          }
        : undefined,
    };

    return certificadoActualizado;
  };

  const registrarCertificado = (cert: CertificadoGenerado) => {
    certificadoBaseRef.current = cert;
    setCertificadoGenerado(aplicarPreferenciasCertificado(cert, incluirSalario, incluirPrimaTecnica));
  };

  const handleCodigoExpirado = useCallback(() => {
    setCodigoExpirado(true);
    toast.error('El código ha expirado', {
      description: 'Por favor solicita un nuevo código',
      duration: 5000,
    });
  }, []);

  // Handler para cambio de dígito individual
  const handleDigitoChange = (index: number, valor: string) => {
    // Solo permitir un dígito
    const nuevoValor = valor.replace(/\D/g, '').slice(0, 1);
    
    const nuevosDigitos = [...digitosCodigo];
    nuevosDigitos[index] = nuevoValor;
    setDigitosCodigo(nuevosDigitos);

    // Auto-focus al siguiente input si se ingresó un dígito
    if (nuevoValor && index < 5) {
      const siguienteInput = document.getElementById(`digito-${index + 1}`);
      if (siguienteInput) {
        (siguienteInput as HTMLInputElement).focus();
      }
    }
  };

  // Handler para tecla de retroceso
  const handleDigitoKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitosCodigo[index] && index > 0) {
      // Si el campo está vacío y presiona backspace, ir al anterior
      const anteriorInput = document.getElementById(`digito-${index - 1}`);
      if (anteriorInput) {
        (anteriorInput as HTMLInputElement).focus();
      }
    }
  };



  const handleCodigoCompletoChange = (valor: string) => {
    const limpio = valor.replace(/\D/g, '').slice(0, 6);
    const nuevosDigitos = Array.from({ length: 6 }, (_, index) => limpio[index] || '');
    setDigitosCodigo(nuevosDigitos);
  };

  // PASO 1: Buscar empleado y enviar código
  const handleBuscarEmpleado = async () => {
    // Validaciones
    if (buscandoEmpleado) return;

    const documentoIngresado = (numeroDocumentoRef.current || numeroDocumento).trim();

    if (!tipoDocumento) {
      toast.error('Por favor selecciona el tipo de documento');
      return;
    }
    if (!documentoIngresado) {
      toast.error('Por favor ingresa tu número de documento');
      return;
    }

    if (documentoIngresado.length < 6) {
      toast.error('El número de documento debe tener al menos 6 dígitos');
      return;
    }

    setNumeroDocumento(documentoIngresado);
    numeroDocumentoRef.current = documentoIngresado;
    setBuscandoEmpleado(true);

    try {
      // Verificar si existe, si ya tiene certificado activo y si es docente
      const verificacion = await certificadosService.autoservicio.verificarDocumento(documentoIngresado);
      if (!verificacion || typeof verificacion !== 'object' || !('existe' in verificacion)) {
        setBuscandoEmpleado(false);
        toast.error('No pudimos validar tu documento en este momento. Intenta nuevamente.');
        return;
      }

      if (!verificacion.existe) {
        setBuscandoEmpleado(false);
        toast.error('No encontramos tu documento en la base de datos de ESAP');
        return;
      }

      // Llamar al backend para verificar documento y generar código
      const response = await certificadosService.autoservicio.generarCodigoValidacion(documentoIngresado);
      if (!response || typeof response !== 'object') {
        setBuscandoEmpleado(false);
        toast.error('No pudimos generar el codigo en este momento. Intenta nuevamente.');
        return;
      }


      const emailDestino = typeof response.email === 'string' ? response.email.trim() : '';
      if (!emailDestino || emailDestino.toLowerCase() === 'n/a') {
        setBuscandoEmpleado(false);
        toast.error('El usuario no cuenta con correo registrado.', {
          description: 'Es necesario comunicarte con un administrador para validar la identidad.',
          duration: 7000
        });
        return;
      }

      // Si ya tiene certificado, el backend lanzará un error
      // Guardar el código enviado
      const codigo = response.codigoTest || '470547';
      setCodigoEnviado(codigo);

      // Crear objeto empleado desde la respuesta del backend
      const solicitud = response.solicitud && typeof response.solicitud === 'object' ? response.solicitud : {};
      const templateType = resolverTemplateType(solicitud);
      const cargoNormalizado = solicitud.position_category || solicitud.career_category || 'N/A';
      const vinculoNormalizado =
        solicitud.position_category ||
        solicitud.career_category ||
        (templateType === 'docente' ? 'Docente' : 'Administrativo');

      const empleado: EmpleadoData = {
        tipo_documento: tipoDocumento || 'CC',
        numero_documento: documentoIngresado,
        nombre_completo: solicitud.full_name || 'Empleado ESAP',
        tipo_vinculacion: vinculoNormalizado,
        cargo: cargoNormalizado,
        dependencia: solicitud.department || 'N/A',
        dependenciaPadre: solicitud.department_parent || solicitud.departmentParent || 'Registro padre',
        fecha_vinculacion: solicitud.hiring_date || new Date().toISOString(),
        estado: 'Activo',
        correo_institucional: emailDestino,
        correo_personal: '',
        salario_actual: solicitud.monthly_salary || 0,
        templateType,
      };

      setEmpleadoEncontrado(empleado);
      setBuscandoEmpleado(false);

      toast.success(`Código enviado a ${emailDestino}`, {
        description: `Por seguridad, revisa tu bandeja de entrada`,
        duration: 5000
      });

      // Mostrar el código en consola para pruebas
      console.log('🔐 CÓDIGO DE VALIDACIÓN:', codigo);
      console.log('📧 Enviado a:', emailDestino);

      // Avanzar al siguiente paso
      setCodigoExpirado(false);
      setCountdownSeed((prev) => prev + 1);
      setPasoActual('validacion-codigo');
    } catch (error: any) {
      setBuscandoEmpleado(false);
      console.error('Error al buscar empleado:', error);
      toast.error(error.response?.data?.message || error.message || 'No se encontró registro en la base de datos de ESAP');
    }
  };

  // PASO 2: Validar código y generar certificado
  const handleValidarCodigo = async () => {
    const codigoValidacion = (isMobile ? codigoMobileRef.current : digitosCodigo.join('')).trim();
    if (codigoValidacion.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    setValidandoCodigo(true);

    try {
      // Llamar al backend para validar código y generar certificado
      const response = await certificadosService.autoservicio.validarCodigoYGenerarCertificado(
        numeroDocumento,
        codigoValidacion
      );
      const cert = response?.certificado;
      if (!cert) {
        throw new Error(response?.mensaje || 'Código incorrecto. Verifica e intenta nuevamente.');
      }

      toast.success('¡Código validado correctamente!');

      const templateType = resolverTemplateType(cert);
      const salarioBase = cert.monthly_salary || empleadoEncontrado?.salario_actual || 0;
      const salarioTextoBase = cert.salary_text;
      const bonusBase = cert.technical_bonus ?? salarioBase * 0.2;

      // Construir objeto de certificado completo desde la respuesta del backend
      const certificado: CertificadoGenerado = {
        numero_radicado: cert.certificate_number || cert.verification_code || `CERT-${Date.now()}`,
        tipo_certificado: 'Certificado Laboral General',
        fecha_generacion: cert.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        cargo: cert.career_category || empleadoEncontrado?.cargo || 'N/A',
        dependencia: cert.department || empleadoEncontrado?.dependencia || 'N/A',
        dependenciaPadre: cert.department_parent || cert.departmentParent || empleadoEncontrado?.dependenciaPadre || 'Registro padre',
        fecha_vinculacion: cert.hiring_date?.split('T')[0] || empleadoEncontrado?.fecha_vinculacion || 'N/A',
        salario_actual: salarioBase,
        prima_tecnica: bonusBase,
        salario_original: salarioBase,
        salario_texto_original: salarioTextoBase,
        incluyeSalario: true,
        incluyePrimaTecnica: false,
        qr_code: cert.verification_code || `QR-CERT-${cert.id}`,
        nombre_completo: cert.full_name || empleadoEncontrado?.nombre_completo || 'N/A',
        // Datos completos del certificado para el visor
        certificado_completo: {
          id: cert.id,
          consecutivo: cert.certificate_number || cert.verification_code,
          qrCode: cert.verification_code,
          cantidadEscaneos: 0,
          incluyeSalario: true,
          incluyePrimaTecnica: false,
          technical_bonus: bonusBase,
          empleado: {
            nombre: cert.full_name,
            documento: cert.id_number,
            email: empleadoEncontrado?.correo_institucional || 'N/A',
            cargo: cert.career_category,
            dependencia: cert.department || 'N/A',
            dependenciaPadre: cert.department_parent || cert.departmentParent || 'Registro padre',
            tipoVinculacion: cert.position_category || 'Administrativo',
            fechaVinculacion: cert.hiring_date,
            grado: cert.position_location || 'N/A',
            salario: salarioBase,
            salarioOriginal: salarioBase,
            salarioTexto: salarioTextoBase,
            salarioTextoOriginal: salarioTextoBase
          },
          estado: 'activo' as const,
          tipoSolicitud: 'AUTOSERVICIO' as const,
          fechaSolicitud: cert.created_at || new Date().toISOString(),
          fechaGeneracion: cert.issue_date || new Date().toISOString(),
          solicitante: {
            nombre: cert.full_name,
            tipo: 'autoservicio' as const
          },
          position_location: cert.position_location,
          department: cert.department,
          campus: cert.campus,
          signer_name: cert.signer_name,
          signer_position: cert.signer_position,
          signer_department: cert.signer_department
          ,
          templateType,
        }
      };

      registrarCertificado(certificado);
      setCertificadoExistente(false);
      setValidandoCodigo(false);

      toast.success('¡Certificado generado exitosamente!', {
        description: 'Tu certificado está listo para descargar',
        duration: 5000
      });

      console.log('✅ Certificado generado:', certificado);

      // Avanzar al paso final
      setPasoActual('certificado-generado');
    } catch (error: any) {
      setValidandoCodigo(false);
      console.error('Error al validar código:', error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      const status = error.response?.status;

      if (status === 400) {
        toast.error(errorMessage || 'Código incorrecto o expirado.');
      } else if (errorMessage?.includes('incorrecto') || errorMessage?.includes('inválido')) {
        toast.error('Código incorrecto. Verifica e intenta nuevamente.');
      } else if (errorMessage?.includes('expirado')) {
        toast.error('El código ha expirado. Solicita uno nuevo.');
      } else {
        toast.error(errorMessage || 'Error al validar el código. Intenta nuevamente.');
      }
    }
  };

  // Reenviar código
  const handleReenviarCodigo = async () => {
    if (!empleadoEncontrado) return;

    setReenviandoCodigo(true);

    try {
      // Llamar al backend para generar y enviar nuevo código
      const response = await certificadosService.autoservicio.generarCodigoValidacion(numeroDocumento);

      const emailDestino = typeof response.email === 'string' ? response.email.trim() : '';
      if (!emailDestino || emailDestino.toLowerCase() === 'n/a') {
        setReenviandoCodigo(false);
        toast.error('El usuario no cuenta con correo registrado.', {
          description: 'Es necesario comunicarte con un administrador para validar la identidad.',
          duration: 7000
        });
        return;
      }

      const nuevoCodigo = response.codigoTest || '470547';
      setCodigoEnviado(nuevoCodigo);
      setReenviandoCodigo(false);

      // Reiniciar contador y estado de expiración
      setCodigoExpirado(false);
      setCountdownSeed((prev) => prev + 1);

      // Limpiar inputs de código
      setDigitosCodigo(['', '', '', '', '', '']);
      codigoMobileRef.current = '';
      if (codigoMobileInputRef.current) {
        codigoMobileInputRef.current.value = '';
      }

      toast.success('Código reenviado a tu correo', {
        description: emailDestino
      });

      console.log('🔐 NUEVO CÓDIGO:', nuevoCodigo);
      console.log('📧 Enviado a:', emailDestino);
    } catch (error: any) {
      setReenviandoCodigo(false);
      console.error('Error al reenviar código:', error);
      toast.error(error.response?.data?.message || error.message || 'Error al reenviar el código. Intenta nuevamente.');
    }
  };

  // Handlers de certificado generado
  const handleVerPDF = () => {
    if (!certificadoGenerado?.certificado_completo) {
      toast.error('No se puede mostrar el certificado. Faltan datos.');
      return;
    }
    setAutoPDFAction(null);
    setShowPDFViewer(true);
  };

  const handleDescargar = () => {
    if (!certificadoGenerado?.certificado_completo) {
      toast.error('No se puede descargar el certificado. Faltan datos.');
      return;
    }
    setAutoPDFAction('download');
    setShowPDFViewer(true);
  };

  const handleImprimir = () => {
    if (!certificadoGenerado?.certificado_completo) {
      toast.error('No se puede imprimir el certificado. Faltan datos.');
      return;
    }
    setAutoPDFAction('print');
    setShowPDFViewer(true);
  };

  const handleNuevaSolicitud = () => {
    // Reset todo
    setPasoActual('ingreso-documento');
    setTipoDocumento('');
    setNumeroDocumento('');
    setDigitosCodigo(['', '', '', '', '', '']);
    setCodigoEnviado('');
    setEmpleadoEncontrado(null);
    setCertificadoGenerado(null);
    setCertificadoExistente(false);
    certificadoBaseRef.current = null;
    emailDestinoRef.current = null;
    lastEmailSentRef.current = null;
    numeroDocumentoRef.current = '';
    if (numeroDocumentoInputRef.current) {
      numeroDocumentoInputRef.current.value = '';
    }
    codigoMobileRef.current = '';
    if (codigoMobileInputRef.current) {
      codigoMobileInputRef.current.value = '';
    }
  };

  const enviarCertificadoPorEmail = async (certificadoId: string) => {
    const destinatario = emailDestinoRef.current;
    if (!destinatario) {
      toast.error('No hay un correo registrado para este empleado');
      setIsSendingEmail(false);
      setAutoPDFAction(null);
      setShowPDFViewer(false);
      return;
    }

    try {
      const response = await certificadosService.laborales.reenviar(certificadoId, {
        includeSalary: incluirSalario,
        includeTechnicalBonus: false,
        templateType: certificadoGenerado?.certificado_completo?.templateType,
      });

      toast.success('Copia enviada al correo', {
        id: 'auto-email-cert',
        description: `Se envio a ${response?.email || destinatario}`,
        duration: 4000,
      });
    } catch (error: any) {
      toast.error('No se pudo enviar el certificado por correo', {
        id: 'auto-email-cert',
        description: error?.message || 'Intenta nuevamente',
        duration: 5000,
      });
    } finally {
      setIsSendingEmail(false);
      setAutoPDFAction(null);
      setShowPDFViewer(false);
    }
  };



  const handleAutoActionComplete = () => {
    setShowPDFViewer(false);
    setAutoPDFAction(null);
  };

  // Asegurar que el paso activo se mantenga en "certificado" cuando ya hay certificado listo
  useEffect(() => {
    if (certificadoGenerado && empleadoEncontrado && pasoActual !== 'certificado-generado') {
      setPasoActual('certificado-generado');
    }
  }, [certificadoGenerado, empleadoEncontrado, pasoActual]);

  useEffect(() => {
    const cert = certificadoGenerado;
    if (!cert?.certificado_completo) return;
    if (isSendingEmail) return;
    if (lastEmailSentRef.current === cert.numero_radicado) return;

    const destinatario =
      empleadoEncontrado?.correo_institucional ||
      cert.certificado_completo.empleado?.email ||
      cert.certificado_completo?.employee_email ||
      '';
    if (!destinatario) return;

    lastEmailSentRef.current = cert.numero_radicado;
    emailDestinoRef.current = destinatario;
    setIsSendingEmail(true);
    toast.loading('Enviando certificado a tu correo...', { id: 'auto-email-cert' });
    void enviarCertificadoPorEmail(cert.certificado_completo.id);
  }, [certificadoGenerado, empleadoEncontrado, isSendingEmail, incluirSalario]);

  // Si se marca certificado existente, asegura que el paso sea certificado
  useEffect(() => {
    if (certificadoExistente && pasoActual !== 'certificado-generado') {
      setPasoActual('certificado-generado');
    }
  }, [certificadoExistente, pasoActual]);

  useEffect(() => {
    if (certificadoBaseRef.current) {
      setCertificadoGenerado(aplicarPreferenciasCertificado(certificadoBaseRef.current, incluirSalario, incluirPrimaTecnica));
    }
  }, [incluirSalario]);

  // Paso visual para el stepper: si ya hay certificado, mostrar siempre el paso 3 activo
  const pasoActivoUI: Paso =
    certificadoGenerado || certificadoExistente ? 'certificado-generado' : pasoActual;

  const shouldAnimateSteps = !isMobile;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar Público Flotante */}
      <PublicNavbar onLoginClick={onLoginClick} onNavigateToHome={onBack} />
      {/* Header/Navbar espaciado */}
      <div className="h-20" />
      {/* Main Content */}
      <div className="pt-24 sm:pt-28 py-8 mb-16">
        {/* Botón Volver */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <motion.button
            onClick={onBack}
            initial={shouldAnimateSteps ? { opacity: 0, x: -20 } : false}
            animate={shouldAnimateSteps ? { opacity: 1, x: 0 } : undefined}
            whileHover={shouldAnimateSteps ? { scale: 1.02, x: -4 } : undefined}
            whileTap={shouldAnimateSteps ? { scale: 0.98 } : undefined}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#1e5da8] border-2 border-gray-200 hover:border-[#1e5da8] text-gray-700 hover:text-white transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Volver al Inicio</span>
          </motion.button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={shouldAnimateSteps ? { opacity: 0, y: 20 } : false}
            animate={shouldAnimateSteps ? { opacity: 1, y: 0 } : undefined}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              Servicio Público
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              Certificados Laborales
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Solicita tu certificado laboral de forma rápida y segura. 
              Validamos tu identidad mediante código enviado a tu correo registrado.
            </p>
          </motion.div>

          {/* Indicador de pasos */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4">
              {/* Paso 1 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActivoUI === 'ingreso-documento' 
                    ? 'bg-[#003DA5] text-white scale-110 shadow-lg' 
                    : 'bg-green-500 text-white'
                }`}>
                  {pasoActivoUI !== 'ingreso-documento' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActivoUI === 'ingreso-documento' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Documento
                </span>
              </div>

              <div className="w-12 sm:w-24 h-0.5 bg-gray-300" />

              {/* Paso 2 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActivoUI === 'validacion-codigo' 
                    ? 'bg-[#003DA5] text-white scale-110 shadow-lg' 
                    : pasoActivoUI === 'certificado-generado'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {pasoActivoUI === 'certificado-generado' ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActivoUI === 'validacion-codigo' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Validación
                </span>
              </div>

              <div className="w-12 sm:w-24 h-0.5 bg-gray-300" />

              {/* Paso 3 */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActivoUI === 'certificado-generado'
                    ? 'bg-green-500 text-white scale-110 shadow-lg'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {pasoActivoUI === 'certificado-generado' ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <span className={`ml-2 text-sm font-semibold hidden sm:inline ${
                  pasoActivoUI === 'certificado-generado' ? 'text-[#003DA5]' : 'text-gray-500'
                }`}>
                  Certificado
                </span>
              </div>
            </div>
          </div>

          {/* PASO 1: Ingreso de Documento */}
          <StepPresence shouldAnimate={shouldAnimateSteps}>
            {pasoActual === 'ingreso-documento' && (
              <motion.div
                key="paso1"
                initial={shouldAnimateSteps ? { opacity: 0, x: 20 } : false}
                animate={shouldAnimateSteps ? { opacity: 1, x: 0 } : undefined}
                exit={shouldAnimateSteps ? { opacity: 0, x: -20 } : undefined}
              >
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-xl flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">Paso 1: Identifícate</h2>
                        <p className="text-sm text-gray-600">Ingresa tu documento de identidad</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Tipo de Documento */}
                      <div>
                        <Label htmlFor="tipo-documento" className="text-sm font-semibold text-gray-700 mb-2 block">
                          Tipo de Documento *
                        </Label>
                        {useNativeInputs ? (
                          <select
                            id="tipo-documento"
                            name="tipo-documento"
                            value={tipoDocumento}
                            onChange={(event) => setTipoDocumento(event.target.value)}
                            className="h-12 w-full rounded-md border-2 border-input bg-input-background px-3 text-sm text-gray-700 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                          >
                            <option value="" disabled>
                              Selecciona el tipo de documento
                            </option>
                            <option value="CC">Cédula de Ciudadanía (CC)</option>
                            <option value="CE">Cédula de Extranjería (CE)</option>
                            <option value="TI">Tarjeta de Identidad (TI)</option>
                            <option value="PP">Pasaporte (PP)</option>
                          </select>
                        ) : (
                          <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                            <SelectTrigger id="tipo-documento" className="h-12 border-2">
                              <SelectValue placeholder="Selecciona el tipo de documento" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                              <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                              <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                              <SelectItem value="PP">Pasaporte (PP)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Número de Documento */}
                      <div>
                        <Label htmlFor="numero-documento" className="text-sm font-semibold text-gray-700 mb-2 block">
                          Número de Documento *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            ref={numeroDocumentoInputRef}
                            id="numero-documento"
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 1234567890"
                            defaultValue={numeroDocumento}
                            onInput={(e) => {
                              const target = e.currentTarget;
                              const limpio = target.value.replace(/\D/g, '');
                              if (target.value !== limpio) {
                                target.value = limpio;
                              }
                              numeroDocumentoRef.current = limpio;
                            }}
                            className="h-12 pl-10 border-2"
                            maxLength={15}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleBuscarEmpleado();
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Solo números, sin puntos ni espacios
                        </p>
                      </div>

                      {/* Preferencia de salario */}
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Checkbox
                          id="sin-salario"
                          checked={!incluirSalario}
                          onCheckedChange={(checked) => setIncluirSalario(!checked)}
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="sin-salario" className="text-sm font-semibold text-gray-800 cursor-pointer">
                            Solicitar certificado sin informacion salarial
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">
                            Oculta el salario en el PDF y en la vista previa. Puedes cambiarlo en cualquier momento.
                          </p>
                        </div>
                      </div>

                      {/* Botón Solicitar Certificado */}
                      <Button
                        onClick={handleBuscarEmpleado}
                        disabled={buscandoEmpleado}
                        className="w-full h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold text-base shadow-lg"
                      >
                        {buscandoEmpleado ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Buscando en base de datos...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Solicitar Certificado
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Información de ayuda */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">¿Quiénes pueden solicitar?</p>
                          <ul className="space-y-1 text-blue-700">
                            <li>• Personal administrativo activo de ESAP</li>
                            <li>• Docentes de planta, ocasionales y de cátedra</li>
                            <li>• Debes estar registrado en nuestra base de datos</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </motion.div>
            )}

            {/* PASO 2: Validación de Código */}
            {pasoActual === 'validacion-codigo' && empleadoEncontrado && (
              <motion.div
                key="paso2"
                initial={shouldAnimateSteps ? { opacity: 0, x: 20 } : false}
                animate={shouldAnimateSteps ? { opacity: 1, x: 0 } : undefined}
                exit={shouldAnimateSteps ? { opacity: 0, x: -20 } : undefined}
              >
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">Paso 2: Valida tu identidad</h2>
                        <p className="text-sm text-gray-600">Ingresa el código enviado a tu correo</p>
                      </div>
                    </div>

                    {/* Datos del empleado */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-green-900 mb-2">¡Registro encontrado!</p>
                          <div className="space-y-1 text-sm text-green-800">
                            <p className="break-words"><strong>Nombre:</strong> {empleadoEncontrado.nombre_completo}</p>
                            <p className="break-words"><strong>Cargo:</strong> {empleadoEncontrado.cargo}</p>
                            <p className="break-words"><strong>Tipo:</strong> {empleadoEncontrado.tipo_vinculacion}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info de código enviado */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 mb-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm flex-1 min-w-0">
                          <p className="font-semibold text-blue-900 mb-1">
                            Código enviado a tu correo
                          </p>
                          <div className="bg-white border border-blue-300 rounded-lg px-3 py-2 inline-flex items-center gap-2 max-w-full overflow-hidden">
                            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="font-mono text-blue-900 font-bold break-all">
                              {enmascararCorreo(empleadoEncontrado.correo_institucional)}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-3 break-words">
                            Revisa tu bandeja de entrada (o spam). El código tiene 6 dígitos.
                          </p>
                          <p className="text-xs text-gray-500 mt-1 break-words">
                            📧 Por protección de datos personales, solo mostramos parte de tu correo
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Input de código - 6 dígitos individuales */}
                    <div className="mb-6">
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Código de Validación *
                      </Label>
                        {useNativeInputs ? (
                          <div className="flex justify-center">
                            <Input
                              ref={codigoMobileInputRef}
                              id="codigo-validacion"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder="Ingresa el código"
                              onInput={(e) => {
                                const target = e.currentTarget;
                                const limpio = target.value.replace(/\D/g, '').slice(0, 6);
                                if (target.value !== limpio) {
                                  target.value = limpio;
                                }
                                codigoMobileRef.current = limpio;
                              }}
                              className="h-14 w-full max-w-[240px] border-2 text-center text-2xl font-bold focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
                              maxLength={6}
                            />
                          </div>
                        ) : (
                        <div className="flex gap-2 sm:gap-3 justify-center">
                          {digitosCodigo.map((digito, index) => (
                            <Input
                              key={index}
                              id={`digito-${index}`}
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={digito}
                              onChange={(e) => handleDigitoChange(index, e.target.value)}
                              onKeyDown={(e) => handleDigitoKeyDown(index, e)}
                              className="h-14 w-12 sm:h-16 sm:w-14 border-2 text-center text-2xl sm:text-3xl font-bold focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
                              maxLength={1}
                              autoFocus={index === 0}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Ingresa el código de 6 dígitos enviado a tu correo
                      </p>
                    </div>

                    {/* Botones */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleValidarCodigo}
                        disabled={validandoCodigo || (!useNativeInputs && digitosCodigo.some(digito => digito === '')) || codigoExpirado}
                        className="w-full h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validandoCodigo ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Validando y generando certificado...
                          </>
                        ) : codigoExpirado ? (
                          <>
                            <XCircle className="w-5 h-5 mr-2" />
                            Código Expirado
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Validar y Generar Certificado
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={handleReenviarCodigo}
                        disabled={reenviandoCodigo || !codigoExpirado}
                        variant="outline"
                        className="w-full h-10 border-2"
                      >
                        {reenviandoCodigo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reenviando...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            {codigoExpirado ? 'Solicitar Nuevo Código' : 'Reenviar Código'}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Código de prueba visible */}
                    {/* <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>🔐 Código de prueba:</strong> <span className="font-mono font-bold text-lg">{codigoEnviado}</span>
                        <br />
                        <span className="text-xs">(En producción, este código solo se enviaría al correo)</span>
                      </p>
                    </div> */}

                    {/* Contador regresivo */}
                    {!codigoExpirado && (
                      <CodigoCountdown
                        key={countdownSeed}
                        isActive={pasoActual === 'validacion-codigo'}
                        onExpire={handleCodigoExpirado}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* PASO 3: Certificado Generado */}
            {pasoActual === 'certificado-generado' && certificadoGenerado && empleadoEncontrado && (
              <motion.div
                key="paso3"
                initial={shouldAnimateSteps ? { opacity: 0, scale: 0.95 } : false}
                animate={shouldAnimateSteps ? { opacity: 1, scale: 1 } : undefined}
                exit={shouldAnimateSteps ? { opacity: 0, scale: 0.95 } : undefined}
                className="space-y-6"
              >
                {/* Mensaje de éxito */}
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        {(() => {
                          const correoDestino =
                            empleadoEncontrado.correo_institucional && empleadoEncontrado.correo_institucional !== 'N/A'
                              ? empleadoEncontrado.correo_institucional
                              : 'tu correo registrado';
                          const titulo = certificadoExistente
                            ? 'Ya tienes un certificado vigente'
                            : '¡Certificado Generado Exitosamente!';
                          const descripcion = certificadoExistente
                            ? `Este certificado ya estaba generado y se mantiene vigente. Puedes descargarlo, imprimirlo o compartirlo. También se encuentra disponible en ${correoDestino}.`
                            : `Tu certificado laboral ha sido generado y está listo para descargar. Se ha enviado una copia a ${correoDestino}.`;
                          return (
                            <>
                              <h3 className="text-xl font-bold text-green-900 mb-2">
                                {titulo}
                              </h3>
                              <p className="text-green-700 mb-3">
                                {descripcion}
                              </p>
                            </>
                          );
                        })()}
                        <div className="flex items-center gap-2 text-sm text-green-800">
                          <Calendar className="w-4 h-4" />
                          <span>Generado el {parseDateOnly(certificadoGenerado.fecha_generacion)?.toLocaleDateString('es-CO', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          }) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vista del certificado */}
                <Card className="border-2 border-gray-200 shadow-xl">
                  <CardContent className="p-8">
                    {/* Header del certificado */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">
                        CERTIFICADO LABORAL
                      </h3>
                      <p className="text-sm text-gray-600">
                        Escuela Superior de Administración Pública - ESAP
                      </p>
                    <div className="mt-4 inline-flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Firmado Digitalmente
                      </Badge>
                      <Badge variant="outline" className="border-blue-300 text-blue-700">
                        {certificadoGenerado.numero_radicado}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Checkbox
                      id="toggle-salario"
                      checked={!incluirSalario}
                      onCheckedChange={(checked) => setIncluirSalario(!checked)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="toggle-salario" className="text-sm font-semibold text-gray-800 cursor-pointer">
                        Ocultar salario en este certificado
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Si prefieres el certificado sin salario, marca esta opción. Se aplica también al PDF y a las impresiones.
                      </p>
                    </div>
                  </div>

                  {/* Contenido del certificado */}
                  <div className="space-y-6">
                      {/* Datos del empleado */}
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-[#003DA5]" />
                          Información del Empleado
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Nombre Completo</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.nombre_completo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Documento</p>
                            <p className="font-bold text-gray-900">
                              {empleadoEncontrado.tipo_documento} {empleadoEncontrado.numero_documento}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Cargo Actual</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.cargo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Tipo de Vinculación</p>
                            <p className="font-bold text-gray-900">{empleadoEncontrado.tipo_vinculacion}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Fecha de Vinculación</p>
                            <p className="font-bold text-gray-900">
                              {parseDateOnly(certificadoGenerado.fecha_vinculacion)?.toLocaleDateString('es-CO') || 'N/A'}
                            </p>
                          </div>
                          {incluirSalario ? (
                            <div className="sm:col-span-2">
                              <p className="text-gray-600 mb-1">Salario Actual</p>
                              <p className="font-bold text-gray-900">
                                ${certificadoGenerado.salario_actual.toLocaleString('es-CO')} COP
                              </p>
                            </div>
                          ) : (
                            <div className="sm:col-span-2">
                              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <Shield className="w-4 h-4" />
                                El certificado se generará sin información salarial.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Código QR y validación */}
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          {/* QR Code Real */}
                          <div className="bg-white rounded-lg p-3 border-2 border-blue-300 flex-shrink-0">
                            <QRCodeCanvas
                              value={`${getPublicBaseUrl()}/verificar-certificado/${certificadoGenerado.qr_code}`}
                              size={112}
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                          <div className="flex-1 text-center sm:text-left">
                            <h4 className="font-bold text-gray-900 mb-2">Código de Validación</h4>
                            <p className="text-sm text-gray-700 mb-3">
                              Este certificado cuenta con firma electrónica y código QR único para validación pública.
                            </p>
                            <p className="font-mono font-bold text-blue-700 break-all">{certificadoGenerado.qr_code}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Escanea el código QR para verificar la autenticidad del certificado
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Firma digital */}
                      <div className="text-center pt-6 border-t-2 border-gray-200">
                        <div className="inline-block">
                          <div className="w-48 h-1 bg-gray-900 mb-2 mx-auto"></div>
                          <p className="font-bold text-gray-900 text-sm">Dirección de Talento Humano</p>
                          <p className="text-xs text-gray-600">Escuela Superior de Administración Pública</p>
                          <p className="text-xs text-gray-500 mt-2">Firma Electrónica</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleVerPDF}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Ver PDF
                  </Button>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleDescargar}
                      className="flex-1 h-12 bg-gradient-to-r from-[#003DA5] to-[#1e5da8] hover:from-[#002d7a] hover:to-[#164a8f] text-white font-bold shadow-lg"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Descargar PDF
                    </Button>
                    <Button
                      onClick={handleImprimir}
                      variant="outline"
                      className="flex-1 h-12 border-2 font-bold"
                    >
                      <Printer className="w-5 h-5 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      onClick={handleNuevaSolicitud}
                      variant="outline"
                      className="flex-1 h-12 border-2 font-bold"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Nueva Solicitud
                    </Button>
                  </div>
                </div>

                {/* Info adicional */}
                <Card className="bg-gray-50 border-2 border-gray-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold mb-2">Validez del Certificado</p>
                        <ul className="space-y-1">
                          <li>✓ Este certificado tiene validez legal para trámites oficiales</li>
                          <li>✓ Código QR validable en cualquier momento</li>
                          <li>✓ Firma electrónica con trazabilidad completa</li>
                          <li>✓ Copia enviada a tu correo institucional registrado</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </StepPresence>
        </div>
      </div>

      {/* Visor de PDF Modal */}
      {certificadoGenerado?.certificado_completo && (
        <VisorPDFCertificado
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          autoAction={autoPDFAction || undefined}
          hiddenMode={!!autoPDFAction}
          onAutoActionComplete={handleAutoActionComplete}
          certificado={certificadoGenerado.certificado_completo}
        />
      )}
      {/* Footer Corporativo ESAP */}
      <footer className="bg-[#1e5da8] text-white py-12 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header del Footer */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-white/20">
            {/* Logo y Descripción */}
            <div className="mb-6 md:mb-0 flex items-start gap-4">
              <img src={esapLogoWhite} alt="ESAP" className="h-14" />
              <div>
                <h3 className="text-xl font-bold mb-1">Escuela Superior de Administración Pública</h3>
                <p className="text-sm text-blue-100 mb-2">Formando líderes de excelencia al servicio del Estado y la sociedad colombiana desde 1958.</p>
                <div className="flex gap-2 text-xs text-blue-100">
                  <span className="px-2 py-1 bg-white/10 rounded">Educación Pública de Calidad</span>
                  <span className="px-2 py-1 bg-white/10 rounded">Acreditación de Alta Calidad</span>
                  <span className="px-2 py-1 bg-white/10 rounded">Investigación e Innovación</span>
                </div>
              </div>
            </div>

            {/* Redes Sociales */}
            <div>
              <p className="text-sm font-semibold mb-3">Síguenos:</p>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>
                <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Columnas de Enlaces */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
            {/* INSTITUCIONAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">🏛��� Institucional</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Acerca de ESAP</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Misión y Visión</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Directivos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sedes y Regionales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trabaje con Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rendición de Cuentas</a></li>
              </ul>
            </div>

            {/* ACADÉMICO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">📚 Académico</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Programas de Pregrado</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas Pregrado</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Educación Continua</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biblioteca Virtual</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Calendario Académico</a></li>
              </ul>
            </div>

            {/* SERVICIOS */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">⚙️ Servicios</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Portal Transaccional</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Certificados</a></li>
                <li><a href="#" className="hover:text-white transition-colors">PQRS</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Notificaciones Judiciales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trámites y Servicios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
              </ul>
            </div>

            {/* LEGAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">⚖️ Legal</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><a href="#" className="hover:text-white transition-colors">Políticas de Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tratamiento de Datos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Transparencia</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mapa del Sitio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Accesibilidad</a></li>
              </ul>
            </div>

            {/* CONTACTO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">📞 Contacto</h4>
              <ul className="space-y-3 text-sm text-blue-100">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Sede Principal: Bogotá<br />Diagonal 40 No. 46A - 37<br />Bogotá D.C., Colombia</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>(601) 220 0700</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Línea Nacional gratuita:<br />01 8000 110 119</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>correspondencia@esap.edu.co</span>
                </li>
                <li>
                  <p className="text-xs mb-1">🕐 Lunes a Viernes</p>
                  <p className="text-xs">8:00 AM - 5:00 PM</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
            <p>© 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Última actualización: 13 de enero de 2025
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
