import { useState, useEffect, useCallback } from 'react';
import { correosJuridicosService, CorreoJuridico, CorreoFilters } from '../services/api/legal.service';
import { toast } from 'sonner';

export const useEmails = () => {
    const [emails, setEmails] = useState<CorreoJuridico[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEmails = useCallback(async (filters?: CorreoFilters) => {
        setLoading(true);
        setError(null);
        try {
            const data = await correosJuridicosService.getCorreos(filters);
            setEmails(data);
        } catch (err: any) {
            console.error('Error fetching emails:', err);
            setError(err.message || 'Error al cargar correos');
            toast.error('Error al cargar correos');
        } finally {
            setLoading(false);
        }
    }, []);

    const updateClassification = async (id: string, category: string) => {
        try {
            const updated = await correosJuridicosService.updateClasificacion(id, category);
            setEmails(prev => prev.map(e => e.id === id ? updated : e));
            toast.success('Clasificación actualizada y aprendida por AI');
            return updated;
        } catch (err: any) {
            console.error('Error updating classification:', err);
            toast.error('Error al actualizar clasificación');
            throw err;
        }
    };

    const linkProcess = async (id: string, expedienteId: string, targetModule?: string) => {
        try {
            const updated = await correosJuridicosService.vincularProceso(id, expedienteId, targetModule);
            setEmails(prev => prev.map(e => e.id === id ? updated : e));
            toast.success('Correo vinculado al proceso correctamente');
            return updated;
        } catch (err: any) {
            console.error('Error linking process:', err);
            toast.error('Error al vincular proceso');
            throw err;
        }
    };

    const sync = async () => {
        try {
            setLoading(true);
            const res = await correosJuridicosService.syncCorreos();
            if (res.synced > 0) {
                toast.success(`${res.synced} correos sincronizados`);
                fetchEmails(); // Refresh
            } else {
                toast.info('No hay correos nuevos');
            }
        } catch (err: any) {
            toast.error('Error sincronizando correos');
        } finally {
            setLoading(false);
        }
    };

    return {
        emails,
        loading,
        error,
        fetchEmails,
        updateClassification,
        linkProcess,
        sync
    };
};
