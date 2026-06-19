import React, { useState, useEffect, useCallback } from 'react';
import { BancoDocentesView } from './BancoDocentesView';
import { supabaseService } from '../../services/api/supabase.service';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';

export const BancoDocentesModulePremium: React.FC = () => {
  const [allPersonas, setAllPersonas] = useState<any[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDocente, setSelectedDocente] = useState<any | null>(null);

  const loadPersonas = useCallback(async () => {
    try {
      // Import apiClient directly in this file
      const { apiClient } = await import('../../services/api');
      const result = await apiClient.get<any>('/pta/api/v1/docentes-disponibles');
      if (result.success && Array.isArray(result.data)) {
        // Map backend Docente format to what BancoDocentesView expects for users
        const mappedUsers = result.data.map((d: any) => ({
          id: d.id,
          roles: [{ name: 'Docente' }],
          banco_docente: { orden_listado: d.ordenListado || 1 },
          docente: d,
          identificacion: d.persona?.identificacion || d.documentoIdentidad,
          nombre: d.persona ? `${d.persona.primer_nombre || ''} ${d.persona.primer_apellido || ''}`.trim() : 'Docente ' + d.id.substring(0,4),
          territorial: d.territorial,
          dedicacion: d.dedicacion,
          escalafon: d.escalafon || d.categoria,
          correo_institucional: d.correoInstitucional || d.persona?.usuario?.email,
          horas_programables: d.horasAsignables,
          status: d.estado || 'active'
        }));
        setAllPersonas(mappedUsers);
        return;
      }
      throw new Error('No fue posible cargar el Banco de Docentes desde la API.');
    } catch (err) {
      console.warn('[Banco Docentes] Error cargando personas:', err);
      // Fallback a arreglo vacío si falla
      setAllPersonas([]);
    }
  }, []);

  useEffect(() => {
    void loadPersonas().catch(() => {});
  }, [loadPersonas]);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 fade-in">
      <BancoDocentesView
        onBack={() => {}}
        allUsers={allPersonas}
        onReloadUsers={loadPersonas}
        hideBackBtn
        onEdit={(docente) => {
          setSelectedDocente(docente);
          setIsEditOpen(true);
        }}
      />

      <BancoDocenteEditModal
        isOpen={isEditOpen}
        docente={selectedDocente}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedDocente(null);
        }}
        onSaved={() => {
          setIsEditOpen(false);
          setSelectedDocente(null);
          void loadPersonas().catch(() => {});
        }}
      />
    </div>
  );
};
