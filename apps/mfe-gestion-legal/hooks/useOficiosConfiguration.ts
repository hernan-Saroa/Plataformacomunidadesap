import { useState, useCallback, useEffect } from 'react';
import disciplinaryService, { 
    OficioConfiguration, 
    CreateOficioConfigurationDto, 
    UpdateOficioConfigurationDto 
} from '../services/api/disciplinary.service';

interface UseOficiosConfigurationReturn {
    configurations: OficioConfiguration[];
    loading: boolean;
    error: string | null;
    fetchConfigurations: () => Promise<void>;
    fetchActiveConfigurations: () => Promise<OficioConfiguration[]>;
    fetchById: (id: string) => Promise<OficioConfiguration>;
    fetchByTipo: (tipo: string) => Promise<OficioConfiguration>;
    fetchByStage: (stage: string) => Promise<OficioConfiguration[]>;
    createConfiguration: (data: CreateOficioConfigurationDto) => Promise<OficioConfiguration>;
    updateConfiguration: (id: string, data: UpdateOficioConfigurationDto) => Promise<OficioConfiguration>;
    deleteConfiguration: (id: string) => Promise<void>;
    toggleEstado: (id: string) => Promise<OficioConfiguration>;
    uploadPlantilla: (
        id: string, 
        file: File,
        nombrePlantilla?: string,
        descripcionPlantilla?: string,
        versionPlantilla?: string,
        estadoPlantilla?: string
    ) => Promise<OficioConfiguration>;
}

export function useOficiosConfiguration(): UseOficiosConfigurationReturn {
    const [configurations, setConfigurations] = useState<OficioConfiguration[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getOficiosConfiguration();
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar configuraciones');
            console.error('Error fetching oficios configuration:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchActiveConfigurations = useCallback(async (): Promise<OficioConfiguration[]> => {
        try {
            const data = await disciplinaryService.getOficiosConfigurationActive();
            return data;
        } catch (err: any) {
            console.error('Error fetching active oficios configuration:', err);
            return [];
        }
    }, []);

    const fetchById = useCallback(async (id: string): Promise<OficioConfiguration> => {
        try {
            const data = await disciplinaryService.getOficiosConfigurationById(id);
            return data;
        } catch (err: any) {
            console.error('Error fetching oficio configuration by id:', err);
            throw err;
        }
    }, []);

    const fetchByTipo = useCallback(async (tipo: string): Promise<OficioConfiguration> => {
        try {
            const data = await disciplinaryService.getOficiosConfigurationByTipo(tipo);
            return data;
        } catch (err: any) {
            console.error('Error fetching oficio configuration by tipo:', err);
            throw err;
        }
    }, []);

    const fetchByStage = useCallback(async (stage: string): Promise<OficioConfiguration[]> => {
        try {
            const data = await disciplinaryService.getOficiosConfigurationByStage(stage);
            return data;
        } catch (err: any) {
            console.error('Error fetching oficio configuration by stage:', err);
            return [];
        }
    }, []);

    const createConfiguration = useCallback(async (data: CreateOficioConfigurationDto): Promise<OficioConfiguration> => {
        try {
            const newConfig = await disciplinaryService.createOficioConfiguration(data);
            setConfigurations(prev => [...prev, newConfig]);
            return newConfig;
        } catch (err: any) {
            console.error('Error creating oficio configuration:', err);
            throw err;
        }
    }, []);

    const updateConfiguration = useCallback(async (id: string, data: UpdateOficioConfigurationDto): Promise<OficioConfiguration> => {
        try {
            const updatedConfig = await disciplinaryService.updateOficioConfiguration(id, data);
            setConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c));
            return updatedConfig;
        } catch (err: any) {
            console.error('Error updating oficio configuration:', err);
            throw err;
        }
    }, []);

    const deleteConfiguration = useCallback(async (id: string): Promise<void> => {
        try {
            await disciplinaryService.deleteOficioConfiguration(id);
            setConfigurations(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Error deleting oficio configuration:', err);
            throw err;
        }
    }, []);

    const toggleEstado = useCallback(async (id: string): Promise<OficioConfiguration> => {
        try {
            const toggledConfig = await disciplinaryService.toggleOficioConfigurationEstado(id);
            setConfigurations(prev => prev.map(c => c.id === id ? toggledConfig : c));
            return toggledConfig;
        } catch (err: any) {
            console.error('Error toggling oficio configuration estado:', err);
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
    ): Promise<OficioConfiguration> => {
        try {
            const updatedConfig = await disciplinaryService.uploadOficioPlantilla(
                id, file, nombrePlantilla, descripcionPlantilla, versionPlantilla, estadoPlantilla
            );
            setConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c));
            return updatedConfig;
        } catch (err: any) {
            console.error('Error uploading oficio plantilla:', err);
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
export function useOficiosConfigurationActive() {
    const [configurations, setConfigurations] = useState<OficioConfiguration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActive = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🔵 [useOficiosConfigurationActive] Fetching active configurations...');
            const data = await disciplinaryService.getOficiosConfigurationActive();
            console.log('✅ [useOficiosConfigurationActive] Data received:', data.length);
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar configuraciones activas');
            console.error('❌ [useOficiosConfigurationActive] Error:', err);
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
