import React, { useEffect, useRef, useState } from 'react';
import { CircleSlash, Eye, FilePlus2, History, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoRegistroActividad } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { Permitido } from '../shared/Permitido';
import { PERMISOS } from '../../auth/permisos';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  numeral: string;
  onCambio?: () => void;
  /**
   * Si la actividad tiene aprobadores configurados.
   *
   * Cambia el nombre del boton, no lo que hace: donde alguien revisa, el
   * registro deja la actividad esperando visto bueno en vez de cerrarla, y el
   * gestor tiene que saberlo antes de pulsar, no despues.
   */
  requiereAprobacion?: boolean;
  /**
   * Si quien la aprueba la devolvió para corregirla.
   *
   * El panel solo distinguía registrada de sin registrar, así que a una
   * actividad devuelta le mostraba «Registrada» y como única salida «Anular».
   * El aviso de arriba decía «vuelve a registrar la actividad» y aquí abajo no
   * había dónde: quien la trabajó se quedaba sin camino para corregirla.
   */
  devuelta?: boolean;
  /**
   * Cambia cuando el bloque de documentos carga o retira un adjunto.
   *
   * Donde el soporte lo recibe ese bloque, `exigeSoporte` deja de ser cierto en
   * cuanto el formato se entrega, y sin volver a leer el boton de registrar se
   * quedaba bloqueado pidiendo un documento que ya estaba cargado.
   */
  recargarToken?: number;
}

/**
 * Registro con soporte de las actividades que ninguna historia recogió.
 *
 * Un panel para las once —3.2 a 3.5, 5.9 a 5.11 y 6.7 a 6.10—, porque todas
 * ocurren por fuera de la plataforma y lo que el expediente necesita de todas
 * es lo mismo: cuándo pasó, qué pasó y con qué se respalda. La pantalla lo dice
 * en vez de aparentar que el dato viene de SECOP II o de Active Document.
 */
export function PanelRegistroActividad({
  procesoId,
  numeral,
  onCambio,
  requiereAprobacion = false,
  devuelta = false,
  recargarToken,
}: Props) {
  const [estado, setEstado] = useState<EstadoRegistroActividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState(hoyEnBogota());
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState('');
  /** Corrigiendo lo devuelto: el formulario se abre con lo que ya había. */
  const [corrigiendo, setCorrigiendo] = useState(false);

  const leer = () =>
    contratacionService
      .registroActividad(procesoId, numeral)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId, numeral]);

  /*
   * Relectura cuando el bloque de documentos carga o retira un adjunto.
   *
   * Solo a los cambios del token y no tambien al montar, que es cuando el
   * efecto de arriba ya lee: sin el `ref` la pantalla pedia el estado dos veces
   * cada vez que se abria una actividad.
   *
   * Sin `setCargando`: el bloque ya se pinta a si mismo mientras carga, y
   * vaciar el formulario a cada adjunto perderia lo que el gestor lleva escrito
   * en la nota.
   */
  const tokenLeido = useRef(recargarToken);
  useEffect(() => {
    if (recargarToken === tokenLeido.current) return;
    tokenLeido.current = recargarToken;
    leer();
  }, [recargarToken]);

  const limpiar = () => {
    setFecha(hoyEnBogota());
    setNota('');
    setArchivo(null);
  };

  const registrar = async () => {
    setGuardando(true);
    try {
      await contratacionService.registrarActividad(procesoId, numeral, { fecha, nota }, archivo);
      toast.success(
        corrigiendo
          ? `Se corrigió la actividad ${numeral} y volvió a enviarse`
          : `Se registró la actividad ${numeral}`,
      );
      setCorrigiendo(false);
      limpiar();
      await leer();
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    setGuardando(true);
    try {
      await contratacionService.anularRegistroActividad(procesoId, numeral, motivo);
      toast.success('Se anuló el registro');
      setAnulando(false);
      setMotivo('');
      await leer();
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Abre el formulario con lo que ya se había registrado, para corregirlo.
   *
   * Corregir no es rehacer: a quien le devolvieron la actividad le señalaron
   * una cosa concreta —una fecha, una frase de la nota, un soporte que no
   * era—, y vaciarle el formulario le obliga a reescribir de memoria todo lo
   * demás, que estaba bien. El registro anterior se anula al guardar el nuevo,
   * igual que antes; lo que cambia es que parte de lo que había.
   */
  const corregir = () => {
    if (!estado?.registro) return;
    setFecha(estado.registro.fecha.slice(0, 10));
    setNota(estado.registro.nota ?? '');
    setArchivo(null);
    setCorrigiendo(true);
  };

  if (cargando) {
    return (
      <Marco>
        <Ayuda>Cargando el registro de la actividad…</Ayuda>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo consultar la actividad">
          {error ?? 'Sin respuesta del servicio.'}
        </Aviso>
      </Marco>
    );
  }

  // La modalidad manda: la subasta no aplica a la mínima cuantía, y la matriz
  // ya lo dice. Mostrar el formulario invitaría a registrar algo que no ocurre.
  if (!estado.aplica) {
    return (
      <Marco>
        <Aviso tono="aviso" titulo="Esta modalidad no adelanta la actividad">
          {estado.motivoNoAplica ?? 'La matriz de flujo la excluye para esta modalidad.'}
        </Aviso>
      </Marco>
    );
  }

  const registro = estado.registro;

  /*
   * Si todavia falta el documento que respalda la actividad.
   *
   * Donde lo recibe el bloque de documentos no hay archivo que mirar en el
   * formulario: lo que falta lo dice el propio `exigeSoporte`, que ya deja de
   * ser cierto en cuanto el formato se entrega alli.
   */
  const faltaSoporte = estado.tieneFormatos
    ? estado.exigeSoporte
    : estado.exigeSoporte && !archivo;

  return (
    <Marco>
      {/* El numeral y el nombre los pinta el contenedor, para las sesenta y
          tres actividades por igual: repetirlos aquí sería un título doble. */}
      {estado.notaFuente && <Ayuda>{estado.notaFuente}</Ayuda>}

      <Ayuda>
        Esta actividad se adelanta por fuera de la plataforma. Aquí se deja constancia de que
        ocurrió, con la fecha del hecho y el soporte que la respalda.
      </Ayuda>

      {estado.exigeSoporte && !estado.exigenciaConfirmada && (
        <Aviso tono="aviso" titulo="El soporte se exige por criterio del equipo">
          La matriz de flujo no lo pide expresamente para esta actividad. Está pendiente de que la
          Dirección de Contratación lo confirme.
        </Aviso>
      )}

      {/* Corrigiendo se baja al formulario aunque haya registro: es el mismo de
          abajo, ya cargado con lo anterior, y no una pantalla nueva. */}
      {registro && !corrigiendo ? (
        <>
          {/* Devuelta no es «registrada»: lo que hay es el intento anterior, y
              llamarlo registrado le decía al gestor que ya estaba hecho justo
              cuando le acaban de pedir que lo corrija. */}
          <Aviso
            tono={devuelta ? 'aviso' : 'ok'}
            titulo={
              devuelta
                ? `Lo que registraste el ${fechaLarga(registro.fecha)}`
                : `Registrada el ${fechaLarga(registro.fecha)}`
            }
          >
            {registro.nota}
          </Aviso>

          <Ayuda>
            La transcribió {registro.registradoPor ?? 'un usuario del sistema'} el{' '}
            {momento(registro.registradoAt)}.
          </Ayuda>

          {registro.soporte && (
            <BotonSecundario
              icono={<Eye className="w-3.5 h-3.5" />}
              onClick={() =>
                window.open(contratacionService.urlDescarga(registro.soporte!.url), '_blank')
              }
            >
              Ver el soporte
            </BotonSecundario>
          )}

          {anulando ? (
            <>
              <textarea
                className={campo}
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por qué se anula el registro"
              />
              <div className="flex gap-2">
                <Boton
                  icono={<CircleSlash className="w-3.5 h-3.5" />}
                  onClick={anular}
                  disabled={guardando || motivo.trim().length < 10}
                >
                  Anular el registro
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  onClick={() => setAnulando(false)}
                >
                  Volver
                </BotonSecundario>
              </div>
            </>
          ) : (
            /* Consultar el registro es de todos; rehacerlo, de quien lo
               trabaja. Sin `quien`: el bloque de arriba ya dice qué se
               registró y quién, así que un aviso más sobraría. */
            <Permitido permiso={PERMISOS.actividadEditar}>
              {/* Devuelta, corregir es la acción principal y no una salida de
                  emergencia: se la pidió quien la revisa. «Anular» describía
                  deshacer un error propio, que es otra cosa. */}
              {devuelta ? (
                <Boton icono={<FilePlus2 className="w-3.5 h-3.5" />} onClick={corregir}>
                  Corregir y volver a enviar
                </Boton>
              ) : (
                <BotonSecundario
                  icono={<CircleSlash className="w-3.5 h-3.5" />}
                  onClick={() => setAnulando(true)}
                >
                  Anular y registrar de nuevo
                </BotonSecundario>
              )}
            </Permitido>
          )}
        </>
      ) : (
        <>
          {corrigiendo && (
            <Ayuda>
              Estás corrigiendo lo que registraste. Cambia lo que te señalaron y vuelve a
              enviarlo; lo anterior queda en el historial.
            </Ayuda>
          )}

          <label className="block">
            <span className="text-[11.5px] text-slate-600">Fecha en que ocurrió</span>
            <input
              type="date"
              className={campo}
              value={fecha}
              max={hoyEnBogota()}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-[11.5px] text-slate-600">Nota de trazabilidad</span>
            <textarea
              className={campo}
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Qué se hizo, quién participó y qué resultó"
            />
          </label>

          {/* El soporte se pide una sola vez.

              Con formatos asignados lo recibe el bloque de documentos de abajo
              —los dos escriben el mismo adjunto desde que el soporte cumple el
              formato pendiente, así que ofrecer los dos era pedir el papel dos
              veces— y aquí solo se dice dónde está. El bloque además nombra el
              formato y presta la plantilla en blanco, que es lo que este
              selector genérico nunca pudo hacer. */}
          {estado.tieneFormatos ? (
            <Ayuda>
              {estado.exigeSoporte
                ? 'El soporte se carga abajo, en «Documentos de esta actividad»: ahí se dice qué formato es y se descarga la plantilla en blanco.'
                : 'El soporte ya está cargado en «Documentos de esta actividad», abajo.'}
            </Ayuda>
          ) : (
            <SelectorArchivo
              etiqueta="Soporte de la actividad"
              archivo={archivo}
              onElegir={setArchivo}
              obligatorio={estado.exigeSoporte}
              ayuda={
                estado.exigeSoporte
                  ? 'Obligatorio para esta actividad.'
                  : 'Opcional: adjúntalo si la actividad dejó un documento.'
              }
            />
          )}

          {/* Este boton es el unico punto que sabe si el trabajo esta hecho
              —comprueba la fecha, la nota y el soporte—, asi que es el que
              cierra la actividad o la manda a revision. Antes habia ademas un
              envio suelto arriba que no comprobaba nada: se podia mandar a
              aprobacion una actividad vacia, y las dos formas de cerrarla se
              ignoraban entre si. A la derecha porque es donde termina la
              lectura del formulario. */}
          <Permitido permiso={PERMISOS.actividadEditar} quien="el gestor de contratación">
            <div className="flex justify-end gap-2">
              {/* Salida sin guardar: quien entró a corregir y se arrepiente
                  volvería a ver el formulario vacío si no puede retroceder. */}
              {corrigiendo && (
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setCorrigiendo(false);
                    limpiar();
                  }}
                >
                  Dejarlo como estaba
                </BotonSecundario>
              )}
              <Boton
                icono={<FilePlus2 className="w-3.5 h-3.5" />}
                onClick={registrar}
                disabled={guardando || nota.trim().length < 10 || faltaSoporte}
              >
                {corrigiendo
                  ? 'Guardar y volver a enviar'
                  : requiereAprobacion
                    ? 'Registrar y enviar a aprobación'
                    : 'Registrar la actividad'}
              </Boton>
            </div>
          </Permitido>
        </>
      )}

      {estado.historial.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 pt-1">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <Titulo>Registros anulados</Titulo>
          </div>
          {estado.historial.map((anulado, i) => (
            <Ayuda key={i}>
              {fechaLarga(anulado.fecha)} — {anulado.nota} · Anulado por{' '}
              {anulado.anuladoPor ?? 'un usuario del sistema'}: {anulado.motivoAnulacion}
            </Ayuda>
          ))}
        </>
      )}
    </Marco>
  );
}
