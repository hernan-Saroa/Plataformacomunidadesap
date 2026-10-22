import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { CadenaResuelta } from '../cadena-aprobacion/cadena';
import { CadenaAprobacionService } from '../cadena-aprobacion/cadena-aprobacion.service';
import { FirmaOtpDto } from './dto/firma-otp.dto';

/** Cuánto se acepta entre que se verificó el OTP y se guardó el cierre. */
const VENTANA_FIRMA_MS = 15 * 60 * 1000;

/**
 * Si una actividad se cierra sola o queda pendiente de algo más, para los
 * paneles con trámite propio (EFDS-1183, EFDS-2070).
 *
 * `AprobacionService` ya resuelve esto para las once actividades genéricas y
 * para el estudio previo, pero vive junto al trámite de aprobar/devolver, que
 * depende del CDP (una aprobación puede cerrar la etapa 3 y radicarlo) —
 * depender de `AprobacionService` desde el CDP, las garantías o el comité
 * habría cerrado un ciclo entre módulos. Esto es la mitad sin trámite propio:
 * solo pregunta y guarda, así que cualquier panel puede importarlo sin
 * arrastrar nada más.
 */
@Injectable()
export class CierreActividadService {
  constructor(
    /**
     * Quién revisa y cómo se abre la ronda (migración 101). Antes aquí vivía
     * una copia de la consulta de `AprobacionService`; ahora las dos preguntan
     * al mismo sitio y no pueden discrepar.
     */
    private readonly cadenas: CadenaAprobacionService,
  ) {}

  /** La cadena que revisa esta actividad, o null si no requiere aprobación. */
  aprobadoresDe(
    em: EntityManager,
    numeral: string,
    modalidad: string | null,
    /** El proceso, para leer la versión del flujo con la que corre (111). */
    procesoId?: string | null,
  ): Promise<CadenaResuelta | null> {
    return this.cadenas.cadenaPara(numeral, modalidad, em, procesoId);
  }

  /** Si la actividad quedó configurada para exigir firma con el token institucional. */
  async exigeFirma(em: EntityManager, numeral: string): Promise<boolean> {
    const regla = await em.getRepository(ReglaActividad).findOne({
      where: { numeral, tipo: 'EXIGE_FIRMA', vigenteHasta: IsNull() },
    });
    return regla !== null;
  }

  /**
   * La evidencia debe existir y ser reciente.
   *
   * No hay como volver a validar el código OTP aquí —el auth-service ya lo
   * consumió al verificarlo—, así que lo único que se puede comprobar es que
   * la firma se hizo poco antes de cerrar la actividad. Sin la ventana, una
   * evidencia vieja copiada de otro cierre pasaría igual.
   */
  exigirFirmaValida(firma: FirmaOtpDto | undefined) {
    if (!firma) {
      throw new BadRequestException(
        'Esta actividad exige firmar con el token institucional antes de continuar',
      );
    }

    const momentoFirma = new Date(firma.fechaFirma).getTime();
    if (Number.isNaN(momentoFirma) || Date.now() - momentoFirma > VENTANA_FIRMA_MS) {
      throw new BadRequestException(
        'La firma con el token institucional expiró: vuelve a firmar antes de continuar',
      );
    }
  }

  /**
   * Decide en qué estado queda una actividad cuyo panel propio ya hizo su
   * trabajo —el CDP expidió, el comité decidió—, y lo guarda.
   *
   * Mismo criterio que el registro con soporte: si hay quien revise, queda
   * `EN_REVISION`; si no, se cierra en `APROBADO`. La firma se da por
   * comprobada por quien llama —con `exigirFirmaValida`, antes de que el
   * panel haga su propio trabajo— y aquí solo se guarda su evidencia.
   *
   * `aprobadaEnElPanel`: la aprobación configurada ya se dio dentro del panel,
   * elemento por elemento —el aval de cada cuenta de cobro en la 9.4—, y
   * abrir además una ronda sería pedir dos veces lo mismo.
   */
  async resolverCierre(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    modalidad: string | null,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
    { aprobadaEnElPanel = false }: { aprobadaEnElPanel?: boolean } = {},
  ): Promise<{ estado: 'EN_REVISION' | 'APROBADO'; cierra: boolean }> {
    const revisan = aprobadaEnElPanel ? null : await this.aprobadoresDe(em, numeral, modalidad, procesoId);
    const estado: 'EN_REVISION' | 'APROBADO' = revisan ? 'EN_REVISION' : 'APROBADO';
    const cierra = !revisan;

    const existente = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });
    const actividad =
      existente ?? em.create(ProcesoActividad, { procesoId, numeral, datos: {} });

    actividad.estado = estado;
    actividad.enviadoPor = acceso.userName;
    actividad.enviadoPorId = acceso.userId ?? null;
    actividad.enviadoAt = new Date();
    if (cierra) {
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = new Date();
    }
    if (firma) {
      actividad.datos = { ...(actividad.datos ?? {}), firma };
    }

    const guardada = await em.save(ProcesoActividad, actividad);

    // Con quien revise, el envío abre la ronda en su primer escalón; sin él,
    // cualquier ronda que quedara abierta de un envío anterior ya no aplica.
    if (revisan) {
      await this.cadenas.iniciar(em, guardada ?? actividad, revisan, acceso);
    } else if (actividad.id) {
      await this.cadenas.cancelarRonda(em, actividad.id, 'CANCELADA');
    }

    return { estado, cierra };
  }
}
