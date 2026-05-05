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
      const result = await supabaseService.personas.getAll();
      if (result.success) {
        setAllPersonas(result.data || []);
        return;
      }

      throw new Error('No fue posible cargar el Banco de Docentes.');
    } catch (err) {
      console.warn('[Banco Docentes] Error cargando personas:', err);
      throw err;
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
