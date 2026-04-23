import { useState, useEffect } from 'react';

export interface CapacidadRol {
  rol: string;
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
}

export const CAPACIDADES_POR_DEFECTO: CapacidadRol[] = [
  { rol: 'Jefe OCI', capacidadMaximaAuditorias: 2, horasMensualesDisponibles: 80 },
  { rol: 'Auditor Sénior', capacidadMaximaAuditorias: 4, horasMensualesDisponibles: 150 },
  { rol: 'Auditor', capacidadMaximaAuditorias: 3, horasMensualesDisponibles: 120 },
  { rol: 'Auditor Júnior', capacidadMaximaAuditorias: 2, horasMensualesDisponibles: 100 },
  { rol: 'Apoyo Técnico', capacidadMaximaAuditorias: 1, horasMensualesDisponibles: 60 },
  { rol: 'Aprobador PAI', capacidadMaximaAuditorias: 0, horasMensualesDisponibles: 20 },
  { rol: 'Profesional OCI', capacidadMaximaAuditorias: 3, horasMensualesDisponibles: 120 },
];

const LOCAL_STORAGE_KEY = '@esap/control-interno/capacidades-roles';

export function useConfiguracionCapacidadesGlobales() {
  const [capacidadesRoles, setCapacidadesRoles] = useState<CapacidadRol[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setCapacidadesRoles(JSON.parse(stored));
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
    return capacidadesRoles.find(c => c.rol === rolName) || 
           CAPACIDADES_POR_DEFECTO.find(c => c.rol === 'Auditor')!;
  };

  return {
    capacidadesRoles,
    cargando,
    guardarCapacidades,
    getCapacidadPorRol,
  };
}
