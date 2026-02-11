/**
 * Hook personalizado para manejar la lógica del historial de certificados
 * Separación de lógica del componente siguiendo buenas prácticas
 */

import { useState, useEffect, useCallback } from 'react';
import { certificadosService } from '../services/api/certificados.service';
import { EMPLEADOS_ELEGIBLES } from '../data/empleadosElegiblesCertificados';
import { toast } from 'sonner';

export interface Empleado {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  cargo?: string;
}

export interface CertificadoHistorial {
  id: string;
  consecutivo: string;
  estado: 'activo' | 'inactivo' | 'revocado' | 'expirado';
  fechaSolicitud: string;
  fechaGeneracion: string;
  cantidadEscaneos: number;
  pdfUrl?: string;
  verificationCode?: string;
}

interface UseHistorialCertificadosReturn {
  empleados: Empleado[];
  empleadoSeleccionado: string | null;
  historial: CertificadoHistorial[];
  isLoading: boolean;
  error: string | null;
  setEmpleadoSeleccionado: (empleadoId: string | null) => void;
  cargarHistorial: () => Promise<void>;
  limpiarHistorial: () => void;
}

export function useHistorialCertificados(): UseHistorialCertificadosReturn {
  const normalizarFechaContrato = (value?: string | number | Date | null) => {
    if (!value) return null;
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const raw = String(value).trim();
    if (!raw) return null;
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day);
    }
    const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]) - 1;
      const year = Number(dmyMatch[3]);
      return new Date(year, month, day);
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const resolverEstadoLaboral = (
    hiringDate?: string | number | Date | null,
    endDate?: string | number | Date | null,
    statusRaw?: string | null,
  ): 'activo' | 'inactivo' => {
    const start = normalizarFechaContrato(hiringDate);
    const end = normalizarFechaContrato(endDate);
    const today = normalizarFechaContrato(new Date());

    if (start || end) {
      if (!start || !today) return 'inactivo';
      if (today < start) return 'inactivo';
      if (!end) return 'activo';
      return today <= end ? 'activo' : 'inactivo';
    }

    const statusUpper = String(statusRaw || '').trim().toUpperCase();
    if (statusUpper === 'INACTIVO') return 'inactivo';
    if (statusUpper === 'ACTIVO') return 'activo';
    return 'activo';
  };
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string | null>(null);
  const [historial, setHistorial] = useState<CertificadoHistorial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de empleados desde los certificados existentes
  // NOTA: Los empleados se obtienen de los certificados ya generados
  // Endpoint usado: GET /certificados/api/v1/certificates/certificados
  // Esto nos permite tener una lista de empleados que tienen certificados
  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        // Obtener todos los certificados para extraer los empleados únicos
        // Usamos un límite alto para obtener la mayor cantidad posible
        const response = await certificadosService.laborales.listar({
          page: 1,
          limit: 1000, // Obtener muchos para tener la lista completa
        });

        const items = Array.isArray(response) ? response : (response.items || []);
        
        // Crear un mapa de empleados únicos usando el documento como clave
        const empleadosMap = new Map<string, Empleado>();
        
        items.forEach((cert: any) => {
          const documento = cert.id_number || '';
          const nombre = cert.full_name || '';
          
          // Solo agregar si tiene documento y nombre válidos
          if (documento && nombre && !empleadosMap.has(documento)) {
            empleadosMap.set(documento, {
              id: cert.person_id || documento,
              nombre,
              documento,
              email: cert.email_solicitante || '',
              cargo: cert.position_category || '',
            });
          }
        });

        // Convertir el mapa a array y ordenar por nombre alfabéticamente
        const empleadosArray = Array.from(empleadosMap.values()).sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        );

        setEmpleados(empleadosArray);
      } catch (err: any) {
        console.error('Error al cargar empleados:', err);
        // Fallback a lista vacía en caso de error
        setEmpleados([]);
      }
    };

    cargarEmpleados();
  }, []);

  // Función para cargar el historial de un empleado
  const cargarHistorial = useCallback(async () => {
    if (!empleadoSeleccionado) {
      setHistorial([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar el empleado seleccionado
      const empleado = empleados.find(emp => emp.id === empleadoSeleccionado || emp.documento === empleadoSeleccionado);
      
      if (!empleado) {
        throw new Error('Empleado no encontrado');
      }

      // Obtener todos los certificados del empleado usando el parámetro search
      // Endpoint: GET /certificados/api/v1/certificates/certificados?search={documento}
      // El parámetro search busca por documento, nombre, etc.
      const response = await certificadosService.laborales.listar({
        search: empleado.documento, // Buscar por número de documento
        page: 1,
        limit: 100, // Obtener hasta 100 certificados del empleado
      });

      const items = Array.isArray(response) ? response : (response.items || []);
      
      // Transformar los datos al formato del historial
      const historialTransformado: CertificadoHistorial[] = items
        .map((cert: any) => {
          const employmentStatusRaw = String(
            cert.employment_status ||
            cert.request?.status ||
            cert.request_status ||
            ''
          ).trim().toUpperCase();
          const hiringDate =
            cert.request?.hiring_date ||
            cert.request?.hiringDate ||
            cert.hiring_date ||
            cert.hiringDate ||
            null;
          const endDate =
            cert.request?.request_date ||
            cert.request?.requestDate ||
            cert.request_date ||
            cert.requestDate ||
            null;
          const employmentEstado = resolverEstadoLaboral(hiringDate, endDate, employmentStatusRaw);
          const certificadoEstado =
            cert.status === 'REVOKED'
              ? 'revocado'
              : cert.status === 'EXPIRED'
                ? 'expirado'
                : employmentEstado;

          return {
            id: cert.id,
            consecutivo: cert.certificate_number || cert.id,
            estado: certificadoEstado,
            fechaSolicitud: cert.created_at,
            fechaGeneracion: cert.issuance_timestamp || cert.created_at,
            cantidadEscaneos: cert.validation_count || 0,
            pdfUrl: cert.pdf_url,
            verificationCode: cert.verification_code,
          };
        })
        .sort((a, b) => {
          // Ordenar por fecha de solicitud descendente (más recientes primero)
          return new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime();
        });

      setHistorial(historialTransformado);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      setError(err.message || 'Error al cargar el historial de certificados');
      toast.error('Error al cargar el historial', {
        description: err.message || 'No se pudo obtener el historial del empleado',
      });
      setHistorial([]);
    } finally {
      setIsLoading(false);
    }
  }, [empleadoSeleccionado, empleados]);

  // Cargar historial cuando cambia el empleado seleccionado
  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarHistorial();
    } else {
      setHistorial([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoSeleccionado]);

  const limpiarHistorial = useCallback(() => {
    setEmpleadoSeleccionado(null);
    setHistorial([]);
    setError(null);
  }, []);

  return {
    empleados,
    empleadoSeleccionado,
    historial,
    isLoading,
    error,
    setEmpleadoSeleccionado,
    cargarHistorial,
    limpiarHistorial,
  };
}

