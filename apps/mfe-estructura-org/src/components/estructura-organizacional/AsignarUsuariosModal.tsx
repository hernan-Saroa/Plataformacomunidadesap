import { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Save, Loader2, Info } from 'lucide-react';
import { Button, Badge } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { estructuraService } from '../../services/estructuraService';

interface TerritorialOpcion {
  id: string;
  nombre: string;
  cetap: { id: string; nombre: string }[];
}

interface AsignarUsuariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  territoriales: TerritorialOpcion[];
}

export function AsignarUsuariosModal({ isOpen, onClose, onSuccess, territoriales }: AsignarUsuariosModalProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTerritorial, setSelectedTerritorial] = useState<string>('');
  const [selectedCetap, setSelectedCetap] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      cargarUsuariosSinAsignar();
      setSelectedIds(new Set());
      setSelectedTerritorial('');
      setSelectedCetap('');
    }
  }, [isOpen]);

  const cargarUsuariosSinAsignar = async () => {
    setLoading(true);
    try {
      const resp = await estructuraService.getUsuariosSinAsignar();
      if (resp.success) {
        setUsuarios(resp.data || []);
      } else {
        toast.error('Error al cargar la lista de usuarios sin asignación');
      }
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const currentTerritorial = territoriales.find(t => t.id === selectedTerritorial);

  const usuariosFiltrados = selectedTerritorial
    ? usuarios.filter(u => u.territorialId === selectedTerritorial || u.territorialNombre === currentTerritorial?.nombre)
    : usuarios;

  const toggleSelectAll = () => {
    if (selectedIds.size === usuariosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(usuariosFiltrados.map((u: any) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAsignar = async () => {
    if (selectedIds.size === 0) return toast.error('Debe seleccionar al menos un usuario');
    if (!selectedTerritorial) return toast.error('Debe seleccionar la Territorial de destino');
    if (!selectedCetap && currentTerritorial && currentTerritorial.cetap.length > 0) {
      return toast.error('Debe seleccionar el CETAP de destino');
    }

    setIsSaving(true);
    try {
      const result = await estructuraService.asignarSeleccionados(Array.from(selectedIds), selectedTerritorial, selectedCetap);
      if (result.success) {
        toast.success(`Se asignaron con éxito ${result.actualizados} usuarios.`);
        onSuccess();
        onClose();
      } else {
        toast.error('Ocurrió un error al asignar');
      }
    } catch {
      toast.error('Ocurrió un error al asignar');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Usuarios sin Asignación Territorial / CETAP
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona usuarios de la lista y asígnales una ubicación
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

          {/* Lista Principal */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
                <Loader2 className="w-8 h-8 text-[#003DA5] animate-spin mb-4" />
                <p className="text-gray-500 text-sm font-medium">Buscando usuarios...</p>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sin pendientes</h3>
                <p className="text-gray-500 text-sm text-center">No hay usuarios sin Territorial o CETAP asignado.</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#003DA5] transition-colors focus:outline-none"
                  >
                    {selectedIds.size === usuariosFiltrados.length && usuariosFiltrados.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-[#003DA5]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                    <span>
                      {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Seleccionar todos'}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    {selectedTerritorial && usuariosFiltrados.length !== usuarios.length && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        Filtrado: {usuariosFiltrados.length} de {usuarios.length}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-white">
                      Total: {usuariosFiltrados.length} pendientes
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-auto w-full">
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 32 }} />
                      <col style={{ width: 90 }} />
                      <col />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 100 }} />
                    </colgroup>
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                      <tr>
                        <th className="px-1 py-3 text-left"></th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Territorial</th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">CETAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usuariosFiltrados.map((u: any) => (
                        <tr
                          key={u.id}
                          onClick={() => toggleSelectUser(u.id)}
                          className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                            selectedIds.has(u.id) ? 'bg-blue-50/70 border-l-2 border-l-[#003DA5]' : 'border-l-2 border-l-transparent'
                          }`}
                        >
                          <td className="px-1 py-2 align-middle">
                            {selectedIds.has(u.id) ? (
                              <CheckSquare className="w-4 h-4 text-[#003DA5]" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300" />
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <span className="text-xs font-mono font-medium text-gray-900">{u.identificacion}</span>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="font-semibold text-sm text-gray-900 truncate">{u.nombre}</div>
                            <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            <div className="text-[11px] text-gray-400">{u.vinculacion}</div>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {u.sinTerritorial ? (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] px-1.5 py-0">Sin asignar</Badge>
                            ) : (
                              <span className="text-xs text-gray-700 truncate block">{u.territorialNombre || '—'}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0">Sin asignar</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Panel de Asignación */}
          <div className="w-full lg:w-[340px] bg-gray-50 p-5 flex flex-col justify-between" style={{ minWidth: '320px' }}>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                  Destino de Asignación
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Territorial Destino</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-1 focus:ring-[#003DA5]"
                      value={selectedTerritorial}
                      onChange={(e) => {
                        setSelectedTerritorial(e.target.value);
                        setSelectedCetap('');
                        setSelectedIds(new Set());
                      }}
                    >
                      <option value="">-- Seleccionar --</option>
                      {territoriales.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">CETAP Destino</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#003DA5] focus:outline-none focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:opacity-50"
                      value={selectedCetap}
                      onChange={(e) => setSelectedCetap(e.target.value)}
                      disabled={!selectedTerritorial || !currentTerritorial?.cetap.length}
                    >
                      <option value="">-- Seleccionar --</option>
                      {currentTerritorial?.cetap.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    {!selectedTerritorial && (
                      <p className="text-xs text-gray-500 mt-1">Selecciona una territorial primero</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-[#003DA5] shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#003DA5]">Resumen</h4>
                    <p className="text-sm text-blue-900/80 mt-1">
                      Se asignarán <strong>{selectedIds.size} usuarios</strong> a la ubicación especificada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-200">
              <Button
                className="w-full gap-2 bg-[#003DA5] hover:bg-[#002868] text-white"
                size="lg"
                disabled={selectedIds.size === 0 || !selectedTerritorial || isSaving}
                onClick={handleAsignar}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Asignar Usuarios</>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
