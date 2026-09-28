import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { FirmaOtpDto } from './dto/firma-otp.dto';

export interface Aprobadores {
  roles: string[];
  personas: string[];
}

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
  /**
   * Quién aprueba esta actividad, o null si no requiere aprobación.
   *
   * Misma consulta que `AprobacionService.aprobadoresDe`: se repite porque
   * evita el ciclo de módulos, no porque la regla sea distinta.
   */
  async aprobadoresDe(
    em: EntityManager,
    numeral: string,
    modalidad: string | null,
  ): Promise<Aprobadores | null> {
    const reglas = await em.getRepository(ReglaActividad).find({
      where: [
        { numeral, tipo: 'EXIGE_APROBACION', modalidad: IsNull(), vigenteHasta: IsNull() },
        {
          numeral,
          tipo: 'EXIGE_APROBACION',
          modalidad: modalidad ?? undefined,
          vigenteHasta: IsNull(),
        },
      ],
    });

    if (!reglas.length) return null;

    const regla = reglas.find((r) => r.modalidad) ?? reglas[0];
    const config = (regla.config ?? {}) as Record<string, unknown>;
    const roles = Array.isArray(config.roles) ? (config.roles as string[]) : [];
    const personas = Array.isArray(config.personas) ? (config.personas as string[]) : [];

    if (!roles.length && !personas.length) return null;
    return { roles, personas };
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
   */
  async resolverCierre(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    modalidad: string | null,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ): Promise<{ estado: 'EN_REVISION' | 'APROBADO'; cierra: boolean }> {
    const revisan = await this.aprobadoresDe(em, numeral, modalidad);
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

    await em.save(ProcesoActividad, actividad);

    return { estado, cierra };
  }
}
