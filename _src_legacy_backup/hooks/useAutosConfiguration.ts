import { useState, useEffect, useCallback } from 'react';
import disciplinaryService, {
    AutoConfiguration,
    CreateAutoConfigurationDto,
    UpdateAutoConfigurationDto
} from '../services/api/disciplinary.service';

interface UseAutosConfigurationReturn {
    configurations: AutoConfiguration[];
    activeConfigurations: AutoConfiguration[];
    loading: boolean;
    error: string | null;
    fetchConfigurations: () => Promise<void>;
    fetchActiveConfigurations: () => Promise<void>;
    fetchConfigurationById: (id: string) => Promise<AutoConfiguration | null>;
    fetchConfigurationByTipo: (tipo: string) => Promise<AutoConfiguration | null>;
    createConfiguration: (data: CreateAutoConfigurationDto) => Promise<AutoConfiguration | null>;
    updateConfiguration: (id: string, data: UpdateAutoConfigurationDto) => Promise<AutoConfiguration | null>;
    deleteConfiguration: (id: string) => Promise<boolean>;
    toggleEstado: (id: string) => Promise<AutoConfiguration | null>;
    getConfigurationByTipo: (tipo: string) => AutoConfiguration | undefined;
    getActiveConfigurationByTipo: (tipo: string) => AutoConfiguration | undefined;
    clearError: () => void;
}

export function useAutosConfiguration(): UseAutosConfigurationReturn {
    const [configurations, setConfigurations] = useState<AutoConfiguration[]>([]);
    const [activeConfigurations, setActiveConfigurations] = useState<AutoConfiguration[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getAutosConfiguration();
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al obtener las configuraciones');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchActiveConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getAutosConfigurationActive();
            setActiveConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al obtener las configuraciones activas');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConfigurationById = useCallback(async (id: string): Promise<AutoConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getAutosConfigurationById(id);
            return data;
        } catch (err: any) {
            setError(err.message || 'Error al obtener la configuración');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConfigurationByTipo = useCallback(async (tipo: string): Promise<AutoConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getAutosConfigurationByTipo(tipo);
            return data;
        } catch (err: any) {
            setError(err.message || 'Error al obtener la configuración por tipo');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createConfiguration = useCallback(async (data: CreateAutoConfigurationDto): Promise<AutoConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const newConfig = await disciplinaryService.createAutosConfiguration(data);
            setConfigurations(prev => [...prev, newConfig]);
            if (newConfig.estado === 'activo') {
                setActiveConfigurations(prev => [...prev, newConfig].sort((a, b) => a.orden - b.orden));
            }
            return newConfig;
        } catch (err: any) {
            setError(err.message || 'Error al crear la configuración');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateConfiguration = useCallback(async (id: string, data: UpdateAutoConfigurationDto): Promise<AutoConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const updatedConfig = await disciplinaryService.updateAutosConfiguration(id, data);
            setConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c));
            if (updatedConfig.estado === 'activo') {
                setActiveConfigurations(prev => prev.map(c => c.id === id ? updatedConfig : c)
                    .sort((a, b) => a.orden - b.orden));
            } else {
                setActiveConfigurations(prev => prev.filter(c => c.id !== id));
            }
            return updatedConfig;
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la configuración');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteConfiguration = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await disciplinaryService.deleteAutosConfiguration(id);
            setConfigurations(prev => prev.filter(c => c.id !== id));
            setActiveConfigurations(prev => prev.filter(c => c.id !== id));
            return true;
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la configuración');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleEstado = useCallback(async (id: string): Promise<AutoConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const toggledConfig = await disciplinaryService.toggleAutosConfigurationEstado(id);
            setConfigurations(prev => prev.map(c => c.id === id ? toggledConfig : c));
            if (toggledConfig.estado === 'activo') {
                setActiveConfigurations(prev => {
                    if (!prev.find(c => c.id === id)) {
                        return [...prev, toggledConfig].sort((a, b) => a.orden - b.orden);
                    }
                    return prev.map(c => c.id === id ? toggledConfig : c)
                        .sort((a, b) => a.orden - b.orden);
                });
            } else {
                setActiveConfigurations(prev => prev.filter(c => c.id !== id));
            }
            return toggledConfig;
        } catch (err: any) {
            setError(err.message || 'Error al cambiar el estado');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getConfigurationByTipo = useCallback((tipo: string): AutoConfiguration | undefined => {
        return configurations.find(c => c.tipo === tipo);
    }, [configurations]);

    const getActiveConfigurationByTipo = useCallback((tipo: string): AutoConfiguration | undefined => {
        return activeConfigurations.find(c => c.tipo === tipo);
    }, [activeConfigurations]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    useEffect(() => {
        fetchConfigurations();
        fetchActiveConfigurations();
    }, [fetchConfigurations, fetchActiveConfigurations]);

    return {
        configurations,
        activeConfigurations,
        loading,
        error,
        fetchConfigurations,
        fetchActiveConfigurations,
        fetchConfigurationById,
        fetchConfigurationByTipo,
        createConfiguration,
        updateConfiguration,
        deleteConfiguration,
        toggleEstado,
        getConfigurationByTipo,
        getActiveConfigurationByTipo,
        clearError,
    };
}

export function useAutosConfigurationActive() {
    const [configurations, setConfigurations] = useState<AutoConfiguration[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActiveConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplinaryService.getAutosConfigurationActive();
            setConfigurations(data);
        } catch (err: any) {
            setError(err.message || 'Error al obtener las configuraciones');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveConfigurations();
    }, [fetchActiveConfigurations]);

    return {
        configurations,
        loading,
        error,
        refetch: fetchActiveConfigurations,
        getByTipo: (tipo: string) => configurations.find(c => c.tipo === tipo),
    };
}
