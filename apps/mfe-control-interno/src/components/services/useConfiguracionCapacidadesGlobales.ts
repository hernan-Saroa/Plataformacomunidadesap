import { useState, useEffect } from 'react';
import { normalizarRolOcigOperativo } from '../../config/roles-ocig-operativos';

export interface CapacidadRol {
  rol: string;
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
}

// Roles de Asignar Profesional (EFDS-2197). El Aprobador Plan Anual no audita: usa la del Auditor.
export const CAPACIDADES_POR_DEFECTO: CapacidadRol[] = [
  { rol: 'Jefe OCI', capacidadMaximaAuditorias: 2, horasMensualesDisponibles: 80 },
  { rol: 'Auditor', capacidadMaximaAuditorias: 3, horasMensualesDisponibles: 120 },
];

/**
 * Lo guardado en el navegador puede traer los nombres de rol anteriores
 * (Jefe OCIG, Auditor Líder…): se pasan al rol actual y queda uno por rol.
 */
function normalizarCapacidadesGuardadas(guardadas: CapacidadRol[]): CapacidadRol[] {
  const porRol = new Map<string, CapacidadRol>();
  for (const c of guardadas) {
    const rol = String(normalizarRolOcigOperativo(c.rol));
    if (!porRol.has(rol)) porRol.set(rol, { ...c, rol });
  }
  return [...porRol.values()];
}

const LOCAL_STORAGE_KEY = '@esap/control-interno/capacidades-roles';

export function useConfiguracionCapacidadesGlobales() {
  const [capacidadesRoles, setCapacidadesRoles] = useState<CapacidadRol[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: CapacidadRol[] = JSON.parse(stored);
        setCapacidadesRoles(normalizarCapacidadesGuardadas(parsed));
      } else {
        setCapacidadesRoles(CAPACIDADES_POR_DEFECTO);
      }
    } catch (e) {
      console.error('Error cargando capacidades de localStorage', e);
      setCapacidadesRoles(CAPACIDADES_POR_DEFECTO);
    } finally {
      setCargando(false);
    }
  }, []);

  const guardarCapacidades = async (nuevasCapacidades: CapacidadRol[]) => {
    try {
      setCapacidadesRoles(nuevasCapacidades);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nuevasCapacidades));
      return true;
    } catch (e) {
      console.error('Error guardando capacidades en localStorage', e);
      return false;
    }
  };

  const getCapacidadPorRol = (rolName: string): CapacidadRol => {
    const rol = String(normalizarRolOcigOperativo(rolName));
    return (
      capacidadesRoles.find((c) => c.rol === rol) ||
      CAPACIDADES_POR_DEFECTO.find((c) => c.rol === rol) ||
      CAPACIDADES_POR_DEFECTO.find((c) => c.rol === 'Auditor')!
    );
  };

  return {
    capacidadesRoles,
    cargando,
    guardarCapacidades,
    getCapacidadPorRol,
  };
}
