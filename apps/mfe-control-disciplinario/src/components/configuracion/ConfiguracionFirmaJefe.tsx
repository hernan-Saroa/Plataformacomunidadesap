import { useState, useEffect, useRef } from 'react';
import { PenLine, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';

export function ConfiguracionFirmaJefe() {
  const [firmaExiste, setFirmaExiste] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [firmaActual, setFirmaActual] = useState<string | null>(null);
  const [previewNueva, setPreviewNueva] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    disciplinaryService.firmaJefeExiste()
      .then(({ existe }) => {
        setFirmaExiste(existe);
        if (existe) {
          disciplinaryService.getFirmaJefe()
            .then(url => setFirmaActual(url))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Solo se permiten imágenes PNG o JPG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }
    setPreviewNueva(URL.createObjectURL(file));
  };

  const handleGuardar = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setGuardando(true);
    try {
      await disciplinaryService.uploadFirmaJefe(file);
      setFirmaExiste(true);
      setFirmaActual(previewNueva);
      setPreviewNueva(null);
      if (inputRef.current) inputRef.current.value = '';
      toast.success('Firma guardada correctamente');
    } catch {
      toast.error('No se pudo guardar la firma');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarNueva = () => {
    setPreviewNueva(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const imagenVisible = previewNueva ?? firmaActual;

  return (
    <div className="px-8 py-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <PenLine className="w-5 h-5" style={{ color: '#1e5da8' }} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Firma del Jefe</h3>
          <p className="text-sm text-gray-500">Se incluirá automáticamente en el PDF al aprobar un auto</p>
        </div>
      </div>

      {/* Estado actual */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 ${firmaExiste ? 'bg-green-50' : 'bg-amber-50'}`}>
        {firmaExiste
          ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Firma configurada</span></>
          : <><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-sm text-amber-700 font-medium">Sin firma configurada — los autos aprobados no incluirán firma</span></>
        }
      </div>

      {/* Cuadro de firma */}
      <div
        className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4"
        style={{ borderColor: imagenVisible ? '#1e5da8' : '#D1D5DB' }}
        onClick={() => inputRef.current?.click()}
      >
        {imagenVisible ? (
          <div>
            <img src={imagenVisible} alt="Firma" className="max-h-16 mx-auto object-contain" />
            {!previewNueva && (
              <p className="text-xs text-gray-400 mt-2">Haga clic para cambiar la firma</p>
            )}
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Haga clic para seleccionar imagen</p>
            <p className="text-xs text-gray-400 mt-1">PNG o JPG, máximo 2MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewNueva && (
        <div className="flex gap-3">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#1e5da8' }}
          >
            {guardando ? 'Guardando...' : 'Guardar firma'}
          </button>
          <button
            onClick={handleCancelarNueva}
            className="py-2 px-3 rounded-lg border text-gray-600 hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
