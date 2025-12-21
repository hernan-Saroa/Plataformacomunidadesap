import { useState, useEffect, useCallback } from 'react';
import { disciplinaryService } from '../services/api/disciplinary.service';
import { toast } from 'sonner@2.0.3';

export interface Etapa {
  id: string;
  nombre: string;
  dias: number;
  orden: number;
}

export interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  rolId?: string;
}

export const useConfiguration = () => {
    const [etapas, setEtapas] = useState<Etapa[]>([]);
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(true);
    const [notificaciones, setNotificaciones] = useState<Record<string, boolean>>({});
    const [alertas, setAlertas] = useState<Record<string, any>>({});

    const loadConfiguration = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [globalConfig, stagesConfig] = await Promise.all([
                disciplinaryService.getGlobalConfig(),
                disciplinaryService.getStageConfiguration()
            ]);

            // Mapear Global Config
            if (globalConfig) {
                // Capacidades
                if (globalConfig.roleCapacities) {
                    let entries: [string, any][] = [];
                    if (!Array.isArray(globalConfig.roleCapacities)) {
                         entries = Object.entries(globalConfig.roleCapacities);
                    }
                    
                    const loadedCargos = entries.map(([key, value], index) => {
                         const name = isNaN(Number(key)) ? key.replace(/_/g, ' ').toUpperCase() : `CARGO ${key}`;
                         return {
                             id: (index + 1).toString(),
                             nombre: name,
                             capacidad: Number(value),
                             rolId: key
                         };
                    });
                    setCargos(loadedCargos);
                }
                
                if (globalConfig.notificationSettings) setNotificaciones(globalConfig.notificationSettings);
                if (globalConfig.alertSettings) setAlertas(globalConfig.alertSettings);
            }

            // Mapear Stages
            if (stagesConfig && Array.isArray(stagesConfig) && stagesConfig.length > 0) {
                 const mappedStages = stagesConfig.map((s: any, index: number) => ({
                      id: s.id || (index + 1).toString(),
                      nombre: s.etapa,
                      dias: s.diasHabiles,
                      orden: index + 1
                 }));
                 setEtapas(mappedStages);
            } else {
                 setEtapas([
                      { id: '1', nombre: 'RECEPCIÓN', dias: 3, orden: 1 },
                      { id: '2', nombre: 'VALORACIÓN', dias: 10, orden: 2 },
                      { id: '3', nombre: 'INDAGACIÓN', dias: 40, orden: 3 },
                      { id: '4', nombre: 'INVESTIGACIÓN', dias: 60, orden: 4 },
                      { id: '5', nombre: 'JUZGAMIENTO', dias: 50, orden: 5 },
                      { id: '6', nombre: 'FALLO', dias: 10, orden: 6 }
                 ]);
            }

        } catch (error) {
            console.error('Error loading config:', error);
            if (!silent) toast.error('Error al cargar la configuración');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfiguration();
    }, [loadConfiguration]);

    const saveStages = async (newEtapas: Etapa[]) => {
        try {
             const stagesPayload = newEtapas.map(e => ({
                  id: e.id.toString().startsWith('temp') ? undefined : e.id,
                  etapa: e.nombre,
                  diasHabiles: e.dias,
                  descripcion: `Etapa de ${e.nombre}`,
                  activo: true
             }));
             await disciplinaryService.updateStageConfiguration(stagesPayload);
             setEtapas(newEtapas);
             return true;
        } catch (error) {
             console.error('Error saving stages:', error);
             throw error;
        }
    };

    const saveGlobal = async (newCargos: Cargo[], newNotificaciones: any, newAlertas: any) => {
         try {
              const roleCapacities: Record<string, number> = {};
              newCargos.forEach(c => {
                   const key = c.rolId || c.nombre.toLowerCase().replace(/ /g, '_');
                   roleCapacities[key] = c.capacidad;
              });

              const globalPayload = {
                   roleCapacities,
                   notificationSettings: newNotificaciones,
                   alertSettings: newAlertas,
                   securitySettings: { auditEnabled: true, digitalSignature: true, backupEnabled: true }
              };
              
              await disciplinaryService.updateGlobalConfig(globalPayload);
              setCargos(newCargos);
              setNotificaciones(newNotificaciones);
              setAlertas(newAlertas);
              return true;
         } catch (error) {
              console.error('Error saving global config:', error);
              throw error;
         }
    };

    return {
        etapas,
        cargos,
        notificaciones,
        alertas,
        loading,
        refreshConfiguration: () => loadConfiguration(true),
        saveStages,
        saveGlobal,
        setEtapas, // Expose setters for optimistic updates if needed
        setCargos,
        setNotificaciones,
        setAlertas
    };
};
