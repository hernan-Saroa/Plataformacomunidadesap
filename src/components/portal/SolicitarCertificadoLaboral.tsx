import { useState, useEffect, useRef } from 'react';
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
  Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { simularEnvioCorreo } from '../../utils/emailTemplates';
import { certificadosService } from '../../services/api/certificados.service';
import { VisorPDFCertificado } from '../certificados-laborales/VisorPDFCertificado';
import { QRCodeCanvas } from 'qrcode.react';
import { getPublicBaseUrl } from '../../config/environment';

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
  fecha_vinculacion: string;
  salario_actual: number;
  salario_original?: number;
  salario_texto_original?: string;
  incluyeSalario?: boolean;
  qr_code: string;
  nombre_completo: string;
  certificado_completo?: any; // Datos completos del certificado para el visor PDF
}

// Función para enmascarar correo (Habeas Data)
// Muestra: 2 caracteres iniciales + asteriscos + 6 caracteres finales
const enmascararCorreo = (correo: string): string => {
  if (!correo || correo.length < 10) return correo;
  
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
    const texto = `${data?.position_category || ''} ${data?.career_category || ''}`.toLowerCase();
    return texto.includes('docent') ? 'docente' : 'administrador';
  };

  const mapCertificadoExistente = (cert: any): CertificadoGenerado => {
    const templateType = resolverTemplateType(cert);
    const salarioBase = cert.monthly_salary || 0;
    const salarioTextoBase = cert.salary_text;
    return {
      numero_radicado: cert.certificate_number || cert.verification_code || `CERT-${Date.now()}`,
      tipo_certificado: 'Certificado Laboral General',
      fecha_generacion: cert.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      cargo: cert.career_category || 'N/A',
      dependencia: cert.department || 'N/A',
      fecha_vinculacion: cert.hiring_date?.split('T')[0] || 'N/A',
      salario_actual: salarioBase,
      salario_original: salarioBase,
      salario_texto_original: salarioTextoBase,
      incluyeSalario: true,
      qr_code: cert.verification_code || `QR-CERT-${cert.id}`,
      nombre_completo: cert.full_name || 'N/A',
      certificado_completo: {
        id: cert.id,
        consecutivo: cert.certificate_number || cert.verification_code,
        qrCode: cert.verification_code,
        cantidadEscaneos: 0,
        incluyeSalario: true,
        empleado: {
          nombre: cert.full_name,
          documento: cert.id_number,
          email: cert.email || cert.certificate_email || 'N/A',
          cargo: cert.career_category,
          dependencia: cert.department || 'N/A',
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
  const certificadoBaseRef = useRef<CertificadoGenerado | null>(null);
  
  // Paso 1: Ingreso de documento
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<EmpleadoData | null>(null);
  
  // Paso 2: Validación de código (6 dígitos individuales)
  const [digitosCodigo, setDigitosCodigo] = useState<string[]>(['', '', '', '', '', '']);
  const [codigoEnviado, setCodigoEnviado] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState<number>(300); // 5 minutos = 300 segundos
  const [codigoExpirado, setCodigoExpirado] = useState(false);
  
  // Paso 3: Certificado generado
  const [certificadoGenerado, setCertificadoGenerado] = useState<CertificadoGenerado | null>(null);

  // Estados para el visor de PDF
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [autoPDFAction, setAutoPDFAction] = useState<'download' | 'print' | null>(null);

  const aplicarPreferenciaSalario = (cert: CertificadoGenerado | null, incluir: boolean): CertificadoGenerado | null => {
    if (!cert) return cert;

    const salarioBase = cert.salario_original ?? cert.salario_actual ?? 0;
    const salarioTextoBase =
      cert.salario_texto_original ||
      cert.certificado_completo?.empleado?.salarioTextoOriginal ||
      cert.certificado_completo?.empleado?.salarioTexto ||
      '';

    const empleadoCertificado = cert.certificado_completo?.empleado;

    const certificadoActualizado: CertificadoGenerado = {
      ...cert,
      salario_original: cert.salario_original ?? salarioBase,
      salario_texto_original: cert.salario_texto_original ?? salarioTextoBase,
      incluyeSalario: incluir,
      salario_actual: incluir ? salarioBase : 0,
      certificado_completo: cert.certificado_completo
        ? {
            ...cert.certificado_completo,
            incluyeSalario: incluir,
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
    setCertificadoGenerado(aplicarPreferenciaSalario(cert, incluirSalario));
  };

  // Efecto para el contador regresivo del código
  useEffect(() => {
    if (pasoActual !== 'validacion-codigo') return;
    
    const interval = setInterval(() => {
      setTiempoRestante((prevTiempo) => {
        if (prevTiempo <= 1) {
          setCodigoExpirado(true);
          toast.error('El código ha expirado', {
            description: 'Por favor solicita un nuevo código',
            duration: 5000
          });
          clearInterval(interval);
          return 0;
        }
        return prevTiempo - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pasoActual]);

  // Formatear tiempo restante (mm:ss)
  const formatearTiempo = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

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

  // PASO 1: Buscar empleado y enviar código
  const handleBuscarEmpleado = async () => {
    // Validaciones
    if (!numeroDocumento) {
      toast.error('Por favor ingresa tu número de documento');
      return;
    }

    if (numeroDocumento.length < 6) {
      toast.error('El número de documento debe tener al menos 6 dígitos');
      return;
    }

    setBuscandoEmpleado(true);

    try {
      // Verificar si existe, si ya tiene certificado activo y si es docente
      const verificacion = await certificadosService.autoservicio.verificarDocumento(numeroDocumento);
      if (!verificacion.existe) {
        setBuscandoEmpleado(false);
        toast.error('No encontramos tu documento en la base de datos de ESAP');
        return;
      }

      // Primero, bloquear si ya tiene certificado activo
      const tieneCertificadoActivo = Boolean(verificacion.tieneCertificado || verificacion.certificado);
      if (tieneCertificadoActivo && verificacion.certificado) {
        const certificado = mapCertificadoExistente(verificacion.certificado);
        const templateType = resolverTemplateType(verificacion.certificado);

        const empleado: EmpleadoData = {
          tipo_documento: tipoDocumento || 'CC',
          numero_documento: numeroDocumento,
          nombre_completo: verificacion.certificado.full_name || 'Empleado ESAP',
          tipo_vinculacion: verificacion.certificado.position_category || 'Administrativo',
          cargo: verificacion.certificado.career_category || 'N/A',
          dependencia: verificacion.certificado.department || 'N/A',
          fecha_vinculacion: verificacion.certificado.hiring_date || new Date().toISOString(),
          estado: 'Activo',
          correo_institucional: verificacion.certificado.email || 'N/A',
          correo_personal: '',
          salario_actual: verificacion.certificado.monthly_salary || 0,
          templateType,
        };

        setEmpleadoEncontrado(empleado);
        registrarCertificado(certificado);
        setCertificadoExistente(true);
        setPasoActual('certificado-generado');
        setBuscandoEmpleado(false);
        toast.info('Ya tienes un certificado generado', {
          description: 'Puedes visualizarlo, descargarlo o imprimirlo.',
        });
        return;
      }

      // Llamar al backend para verificar documento y generar código
      const response = await certificadosService.autoservicio.generarCodigoValidacion(numeroDocumento);

      // Si ya tiene certificado, el backend lanzará un error
      // Guardar el código enviado
      const codigo = response.codigoTest || '470547';
      setCodigoEnviado(codigo);

      // Crear objeto empleado desde la respuesta del backend
      const solicitud = response.solicitud || {};
      const templateType = resolverTemplateType(solicitud);
      const cargoNormalizado = solicitud.position_category || solicitud.career_category || 'N/A';
      const vinculoNormalizado =
        solicitud.position_category ||
        solicitud.career_category ||
        (templateType === 'docente' ? 'Docente' : 'Administrativo');

      const empleado: EmpleadoData = {
        tipo_documento: tipoDocumento || 'CC',
        numero_documento: numeroDocumento,
        nombre_completo: solicitud.full_name || 'Empleado ESAP',
        tipo_vinculacion: vinculoNormalizado,
        cargo: cargoNormalizado,
        dependencia: solicitud.department || 'N/A',
        fecha_vinculacion: solicitud.hiring_date || new Date().toISOString(),
        estado: 'Activo',
        correo_institucional: response.email,
        correo_personal: '',
        salario_actual: solicitud.monthly_salary || 0,
        templateType,
      };

      setEmpleadoEncontrado(empleado);
      setBuscandoEmpleado(false);

      toast.success(`Código enviado a ${response.email}`, {
        description: `Por seguridad, revisa tu bandeja de entrada`,
        duration: 5000
      });

      // Mostrar el código en consola para pruebas
      console.log('🔐 CÓDIGO DE VALIDACIÓN:', codigo);
      console.log('📧 Enviado a:', response.email);

      // Avanzar al siguiente paso
      setPasoActual('validacion-codigo');
    } catch (error: any) {
      setBuscandoEmpleado(false);
      console.error('Error al buscar empleado:', error);
      toast.error(error.response?.data?.message || error.message || 'No se encontró registro en la base de datos de ESAP');
    }
  };

  // PASO 2: Validar código y generar certificado
  const handleValidarCodigo = async () => {
    const codigoValidacion = digitosCodigo.join('');
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

      // Construir objeto de certificado completo desde la respuesta del backend
      const certificado: CertificadoGenerado = {
        numero_radicado: cert.certificate_number || cert.verification_code || `CERT-${Date.now()}`,
        tipo_certificado: 'Certificado Laboral General',
        fecha_generacion: cert.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        cargo: cert.career_category || empleadoEncontrado?.cargo || 'N/A',
        dependencia: cert.department || empleadoEncontrado?.dependencia || 'N/A',
        fecha_vinculacion: cert.hiring_date?.split('T')[0] || empleadoEncontrado?.fecha_vinculacion || 'N/A',
        salario_actual: salarioBase,
        salario_original: salarioBase,
        salario_texto_original: salarioTextoBase,
        incluyeSalario: true,
        qr_code: cert.verification_code || `QR-CERT-${cert.id}`,
        nombre_completo: cert.full_name || empleadoEncontrado?.nombre_completo || 'N/A',
        // Datos completos del certificado para el visor
        certificado_completo: {
          id: cert.id,
          consecutivo: cert.certificate_number || cert.verification_code,
          qrCode: cert.verification_code,
          cantidadEscaneos: 0,
          incluyeSalario: true,
          empleado: {
            nombre: cert.full_name,
            documento: cert.id_number,
            email: empleadoEncontrado?.correo_institucional || 'N/A',
            cargo: cert.career_category,
            dependencia: cert.department || 'N/A',
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
        description: 'Se ha enviado una copia a tu correo registrado',
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

      const nuevoCodigo = response.codigoTest || '470547';
      setCodigoEnviado(nuevoCodigo);
      setReenviandoCodigo(false);

      // Reiniciar contador y estado de expiración
      setTiempoRestante(300); // 5 minutos nuevamente
      setCodigoExpirado(false);

      // Limpiar inputs de código
      setDigitosCodigo(['', '', '', '', '', '']);

      toast.success('Código reenviado a tu correo', {
        description: response.email
      });

      console.log('🔐 NUEVO CÓDIGO:', nuevoCodigo);
      console.log('📧 Enviado a:', response.email);
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

    // Cerrar el visor después de que se ejecute la descarga
    setTimeout(() => {
      setShowPDFViewer(false);
      setAutoPDFAction(null);
    }, 1000);
  };

  const handleImprimir = () => {
    if (!certificadoGenerado?.certificado_completo) {
      toast.error('No se puede imprimir el certificado. Faltan datos.');
      return;
    }
    setAutoPDFAction('print');
    setShowPDFViewer(true);

    // Cerrar el visor después de que se ejecute la impresión
    setTimeout(() => {
      setShowPDFViewer(false);
      setAutoPDFAction(null);
    }, 1000);
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
  };

  // Asegurar que el paso activo se mantenga en "certificado" cuando ya hay certificado listo
  useEffect(() => {
    if (certificadoGenerado && empleadoEncontrado && pasoActual !== 'certificado-generado') {
      setPasoActual('certificado-generado');
    }
  }, [certificadoGenerado, empleadoEncontrado, pasoActual]);

  // Si se marca certificado existente, asegura que el paso sea certificado
  useEffect(() => {
    if (certificadoExistente && pasoActual !== 'certificado-generado') {
      setPasoActual('certificado-generado');
    }
  }, [certificadoExistente, pasoActual]);

  useEffect(() => {
    if (certificadoBaseRef.current) {
      setCertificadoGenerado(aplicarPreferenciaSalario(certificadoBaseRef.current, incluirSalario));
    }
  }, [incluirSalario]);

  // Paso visual para el stepper: si ya hay certificado, mostrar siempre el paso 3 activo
  const pasoActivoUI: Paso =
    certificadoGenerado || certificadoExistente ? 'certificado-generado' : pasoActual;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar Público Flotante */}
      <PublicNavbar onLoginClick={onLoginClick} onNavigateToHome={onBack} />

      {/* Main Content */}
      <div className="pt-24 sm:pt-28 py-8 mb-16">
        {/* Botón Volver */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <motion.button
            onClick={onBack}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#1e5da8] border-2 border-gray-200 hover:border-[#1e5da8] text-gray-700 hover:text-white transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Volver al Inicio</span>
          </motion.button>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
          <AnimatePresence mode="wait">
            {pasoActual === 'ingreso-documento' && (
              <motion.div
                key="paso1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
                        <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                          <SelectTrigger className="h-12 border-2">
                            <SelectValue placeholder="Selecciona el tipo de documento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                            <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                            <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
                            <SelectItem value="PP">Pasaporte (PP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Número de Documento */}
                      <div>
                        <Label htmlFor="numero-documento" className="text-sm font-semibold text-gray-700 mb-2 block">
                          Número de Documento *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="numero-documento"
                            type="text"
                            placeholder="Ej: 1234567890"
                            value={numeroDocumento}
                            onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))}
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

                      {/* Botón Continuar */}
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
                            Continuar
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

                {/* Datos de prueba */}
                <Card className="mt-6 bg-gray-50 border-2 border-gray-300">
                  <CardContent className="p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-gray-600" />
                      Datos de Prueba para Testing
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><strong>Administrativo:</strong> CC 1234567890</p>
                      <p><strong>Docente Planta:</strong> CC 9876543210</p>
                      <p><strong>Docente Cátedra:</strong> CC 5555555555</p>
                      <p><strong>Asistente:</strong> CC 1111111111</p>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 El código de validación se mostrará en la consola del navegador
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* PASO 2: Validación de Código */}
            {pasoActual === 'validacion-codigo' && empleadoEncontrado && (
              <motion.div
                key="paso2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
                        <div>
                          <p className="font-semibold text-green-900 mb-2">¡Registro encontrado!</p>
                          <div className="space-y-1 text-sm text-green-800">
                            <p><strong>Nombre:</strong> {empleadoEncontrado.nombre_completo}</p>
                            <p><strong>Cargo:</strong> {empleadoEncontrado.cargo}</p>
                            <p><strong>Tipo:</strong> {empleadoEncontrado.tipo_vinculacion}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info de código enviado */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-blue-900 mb-1">
                            Código enviado a tu correo
                          </p>
                          <div className="bg-white border border-blue-300 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="font-mono text-blue-900 font-bold">
                              {enmascararCorreo(empleadoEncontrado.correo_institucional)}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 mt-3">
                            Revisa tu bandeja de entrada (o spam). El código tiene 6 dígitos.
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
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
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Ingresa el código de 6 dígitos enviado a tu correo
                      </p>
                    </div>

                    {/* Botones */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleValidarCodigo}
                        disabled={validandoCodigo || digitosCodigo.some(digito => digito === '') || codigoExpirado}
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
                      <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-600" />
                          <p className="text-sm text-gray-700">
                            Código expira en: <strong>{formatearTiempo(tiempoRestante)}</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* PASO 3: Certificado Generado */}
            {pasoActual === 'certificado-generado' && certificadoGenerado && empleadoEncontrado && (
              <motion.div
                key="paso3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                          <span>Generado el {new Date(certificadoGenerado.fecha_generacion).toLocaleDateString('es-CO', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}</span>
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
                            <p className="text-gray-600 mb-1">Dependencia</p>
                            <p className="font-bold text-gray-900">{certificadoGenerado.dependencia}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Fecha de Vinculación</p>
                            <p className="font-bold text-gray-900">
                              {new Date(certificadoGenerado.fecha_vinculacion).toLocaleDateString('es-CO')}
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
          </AnimatePresence>
        </div>
      </div>

      {/* Visor de PDF Modal */}
      {certificadoGenerado?.certificado_completo && (
        <VisorPDFCertificado
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          autoAction={autoPDFAction || undefined}
          hiddenMode={!!autoPDFAction}
          certificado={certificadoGenerado.certificado_completo}
        />
      )}
    </div>
  );
}
