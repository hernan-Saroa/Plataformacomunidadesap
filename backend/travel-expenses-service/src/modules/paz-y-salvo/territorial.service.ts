import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export interface AmbitoFirma {
  territorialId: string;
  nombreFirmante: string;
  cargoFirmante: string;
}

@Injectable()
export class TerritorialPazYSalvoService {
  async emisor(m: EntityManager, usuarioId: string): Promise<AmbitoFirma> {
    const central = process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID;
    if (!central || !/^[1-9]\d*$/.test(central)) {
      throw new ServiceUnavailableException('Falta configurar la seccional de Sede Central para paz y salvo');
    }
    const rows = await m.query(`SELECT p.id_seccional::text AS territorial, p.nom_largo AS nombre, pe.code AS permiso
      FROM auth."user" u
      JOIN auth.personas p ON p.id_person=u.id_person
      JOIN auth.seccionales s ON s.id_seccional=p.id_seccional
      JOIN auth.user_roles ur ON ur.id_user=u.id_user AND ur.is_active
      JOIN auth.role r ON r.id=ur.id_rol AND r.is_active
      JOIN auth.role_permissions rp ON rp.id_rol=r.id AND rp.is_active
      JOIN auth.permission pe ON pe.id_permission=rp.id_permission AND pe.is_active
      WHERE u.id_user=$1 AND u.is_active AND pe.code = ANY($2::text[])
        AND EXISTS (SELECT 1 FROM auth.seccionales WHERE id_seccional=$3::bigint)`,
      [usuarioId, ['travel_expenses:paz_y_salvo.central', 'travel_expenses:paz_y_salvo.territorial'], central]);
    const autorizado = rows.find((r: any) => r.nombre?.trim() &&
      (r.territorial === central ? r.permiso === 'travel_expenses:paz_y_salvo.central'
        : r.permiso === 'travel_expenses:paz_y_salvo.territorial'));
    if (!autorizado) throw new ForbiddenException('No tiene un rol emisor activo para su territorial');
    return { territorialId: autorizado.territorial, nombreFirmante: autorizado.nombre,
      cargoFirmante: autorizado.territorial === central ? 'Coordinadora del Grupo de Comisiones y Viáticos' : 'Coordinador Administrativo y Financiero' };
  }

  async autorizar(m: EntityManager, usuarioId: string, comisionadoId: string, territorialDocumento?: string): Promise<AmbitoFirma> {
    const ambito = await this.emisor(m, usuarioId);
    // Cruce por identificador estructurado de documento, nunca por nombre/cargo.
    // Documentos duplicados en Personas se rechazan: no escoger arbitrariamente.
    const personas = await m.query(`SELECT p.id_seccional::text AS territorial
      FROM travel_expenses.comisionados c JOIN auth.personas p ON p.num_identificacion=c.numero_documento
      WHERE c.id=$1`, [comisionadoId]);
    if (personas.length !== 1 || personas[0].territorial !== ambito.territorialId ||
        (territorialDocumento !== undefined && territorialDocumento !== ambito.territorialId)) {
      throw new ForbiddenException('El comisionado o documento no pertenece a su territorial, o falta información territorial unívoca');
    }
    return ambito;
  }
}
