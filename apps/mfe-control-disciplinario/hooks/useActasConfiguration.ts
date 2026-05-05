import { useState, useCallback, useEffect } from 'react';
import disciplinaryService, { 
    ActaConfiguration, 
    CreateActaConfigurationDto, 
    UpdateActaConfigurationDto 
} from '../services/api/disciplinary.service';

interface UseActasConfigurationReturn {
    configurations: ActaConfiguration[];
    loading: boolean;
    error: string | null;
    fetchConfigurations: () => Promise<void>;
    fetchActiveConfigurations: () => Promise<ActaConfiguration[]>;
    fetchById: (id: string) => Promise<ActaConfiguration>;
    fetchByTipo: (tipo: string) => Promise<ActaConfiguration>;
    fetchByStage: (stage: string) => Promise<ActaConfiguration[]>;
    createConfiguration: (data: CreateActaConfigurationDto) => Promise<ActaConfiguration>;
    updateConfiguration: (id: string, data: UpdateActaConfigurationDto) => Promise<ActaConfiguration>;
    deleteConfiguration: (id: string) => Promise<void>;
    toggleEstado: (id: string) => Promise<ActaConfiguration>;
    uploadPlantilla: (
        id: string, 
        file: File,
        nombrePlantilla?: string,
        descripcionPlantilla?: string,
        versionPlantilla?: string,
        estadoPlantilla?: string
    ) => Promise<ActaConfiguration>;
}

export function useActasConfiguration(): UseActasConfigurationReturn {
    const [configurations, setConfigurations] = useState<ActaConfiguration[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getActasConfiguration();
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar configuraciones');
            console.error('Error fetching actas configuration:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchActiveConfigurations = useCallback(async (): Promise<ActaConfiguration[]> => {
        try {
            const data = await disciplinaryService.getActasConfigurationActive();
            return data;
        } catch (err: any) {
            console.error('Error fetching active actas configuration:', err);
            return [];
        }
    }, []);

    const fetchById = useCallback(async (id: string): Promise<ActaConfiguration> => {
        try {
            const data = await disciplinaryService.getActasConfigurationById(id);
            return data;
        } catch (err: any) {
            console.error('Error fetching acta configuration by id:', err);
            throw err;
        }
    }, []);

    const fetchByTipo = useCallback(async (tipo: string): Promise<ActaConfiguration> => {
        try {
            const data = await disciplinaryService.getActasConfigurationByTipo(tipo);
            return data;
        } catch (err: any) {
            console.error('Error fetching acta configuration by tipo:', err);
            throw err;
        }
    }, []);

    const fetchByStage = useCallback(async (stage: string): Promise<ActaConfiguration[]> => {
        try {
            const data = await disciplinaryService.getActasConfigurationByStage(stage);
            return data;
        } catch (err: any) {
            console.error('Error fetching acta configuration by stage:', err);
            return [];
        }
    }, []);

    const createConfiguration = useCallback(async (data: CreateActaConfigurationDto): Promise<ActaConfiguration> => {
        try {
            const newConfig = await disciplinaryService.createActaConfiguration(data);
            setConfigurations(prev => [...prev, newConfig]);
            return newConfig;
        } catch (err: any) {
            console.error('Error creating acta configuration:', err);
            throw err;
        }
    }, []);

    const updateConfiguration = useCallback(async (id: string, data: UpdateActaConfigurationDto): Promise<ActaConfiguration> => {
        try {
            const updatedConfig = await disciplinaryService.updateActaConfiguration(id, data);
            setConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c));
            return updatedConfig;
        } catch (err: any) {
            console.error('Error updating acta configuration:', err);
            throw err;
        }
    }, []);

    const deleteConfiguration = useCallback(async (id: string): Promise<void> => {
        try {
            await disciplinaryService.deleteActaConfiguration(id);
            setConfigurations(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Error deleting acta configuration:', err);
            throw err;
        }
    }, []);

    const toggleEstado = useCallback(async (id: string): Promise<ActaConfiguration> => {
        try {
            const toggledConfig = await disciplinaryService.toggleActaConfigurationEstado(id);
            setConfigurations(prev => prev.map(c => c.id === id ? toggledConfig : c));
            return toggledConfig;
        } catch (err: any) {
            console.error('Error toggling acta configuration estado:', err);
            throw err;
        }
    }, []);

    const uploadPlantilla = useCallback(async (
        id: string, 
        file: File,
        nombrePlantilla?: string,
        descripcionPlantilla?: string,
        versionPlantilla?: string,
        estadoPlantilla?: string
    ): Promise<ActaConfiguration> => {
        try {
            const updatedConfig = await disciplinaryService.uploadActaPlantilla(
                id, file, nombrePlantilla, descripcionPlantilla, versionPlantilla, estadoPlantilla
            );
            setConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c));
            return updatedConfig;
        } catch (err: any) {
            console.error('Error uploading acta plantilla:', err);
            throw err;
        }
    }, []);

    return {
        configurations,
        loading,
        error,
        fetchConfigurations,
        fetchActiveConfigurations,
        fetchById,
        fetchByTipo,
        fetchByStage,
        createConfiguration,
        updateConfiguration,
        deleteConfiguration,
        toggleEstado,
        uploadPlantilla,
    };
}

// Hook específico para obtener solo configuraciones activas
export function useActasConfigurationActive() {
    const [configurations, setConfigurations] = useState<ActaConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActive = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🔵 [useActasConfigurationActive] Fetching active configurations...');
            const data = await disciplinaryService.getActasConfigurationActive();
            console.log('✅ [useActasConfigurationActive] Data received:', data.length);
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar configuraciones activas');
            console.error('❌ [useActasConfigurationActive] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Efecto para cargar datos al montar el componente
    useEffect(() => {
        fetchActive();
    }, [fetchActive]);

    return {
        configurations,
        loading,
        error,
        refetch: fetchActive,
    };
}
