import { useCallback, useEffect, useState } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { carpetaActiva, carpetasActivas, conCarpeta, filasConfiguracion, type RundConfigMatriz } from '../../../utils/rundCarpetasConfig';
import './RundConfiguracionCarpetas.css';

const URL = '/pta/api/v1/pta/banco-docentes/carpetas/configuracion';

/**
 * Configuración de carpetas: qué carpetas del expediente aplican a cada tipo de vinculación.
 * Una carpeta desactivada deja de mostrarse en la Validación Integral de los docentes de ese tipo.
 * Las obligatorias (las cuatro primeras y las que exige la activación del perfil) no se pueden desactivar.
 */
export function RundConfiguracionCarpetas() {
  const [matriz, setMatriz] = useState<RundConfigMatriz | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setMatriz(await apiClient.get<RundConfigMatriz>(URL));
    } catch (e: any) {
      setMatriz(null);
      setError(e?.message || 'No se pudo cargar la configuración de carpetas.');
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const cambiar = async (tipo: string, bloque: string, activo: boolean) => {
    if (!matriz || guardando) return;
    const anterior = matriz;
    const clave = `${tipo}:${bloque}`;
    setGuardando(clave);
    setMatriz(conCarpeta(matriz, tipo, bloque, activo));
    try {
      await apiClient.put(URL, { tipoVinculacion: tipo, bloque, activo });
      toast.success(activo ? 'Carpeta activada para este tipo de vinculación.' : 'Carpeta desactivada para este tipo de vinculación.');
    } catch (e: any) {
      setMatriz(anterior);
      toast.error(e?.message || 'No se pudo guardar el cambio.');
    } finally {
      setGuardando(null);
    }
  };

  if (error) {
    return <div role="alert" className="rund-config__estado">{error} <button type="button" onClick={cargar}>Reintentar</button></div>;
  }
  if (!matriz) return <div className="rund-config__estado" role="status">Cargando configuración de carpetas...</div>;

  const filas = filasConfiguracion(matriz);
  return (
    <section className="rund-config" aria-label="Configuración de carpetas por tipo de vinculación">
      <header className="rund-config__encabezado">
        <div>
          <h3>Configuración de carpetas</h3>
          <p>Define qué carpetas del expediente aplican a cada tipo de vinculación. Una carpeta desactivada no se muestra en la Validación Integral de los docentes de ese tipo.</p>
        </div>
        <button type="button" className="rund-config__actualizar" onClick={cargar} disabled={!!guardando}><RefreshCw size={14} aria-hidden="true" /> Actualizar</button>
      </header>
      <div className="rund-config__tabla-contenedor">
        <table className="rund-config__tabla">
          <thead>
            <tr>
              <th scope="col">Carpeta</th>
              {matriz.tipos.map(tipo => (
                <th scope="col" key={tipo.codigo}>
                  <span>{tipo.nombre}</span>
                  <small>{carpetasActivas(matriz, tipo.codigo)} de {matriz.carpetas.length} activas</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(carpeta => (
              <tr key={carpeta.bloque}>
                <th scope="row">
                  <span className="rund-config__codigo">{carpeta.codigo}</span>
                  <span>{carpeta.nombre}</span>
                  {carpeta.obligatoria && <small title="Obligatoria: no se puede desactivar"><Lock size={11} aria-hidden="true" /> Obligatoria</small>}
                </th>
                {matriz.tipos.map(tipo => {
                  const activa = carpetaActiva(matriz, tipo.codigo, carpeta.bloque);
                  const etiqueta = `${carpeta.codigo} ${carpeta.nombre} · ${tipo.nombre}`;
                  return (
                    <td key={tipo.codigo}>
                      <label className="rund-config__interruptor" title={carpeta.obligatoria ? 'Obligatoria: no se puede desactivar' : activa ? 'Aplica. Pulsa para desactivar' : 'No aplica. Pulsa para activar'}>
                        <input type="checkbox" role="switch" aria-label={etiqueta} checked={activa}
                          disabled={carpeta.obligatoria || !!guardando}
                          onChange={event => cambiar(tipo.codigo, carpeta.bloque, event.target.checked)} />
                        <span aria-hidden="true" />
                        <em>{activa ? 'Aplica' : 'No aplica'}</em>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
