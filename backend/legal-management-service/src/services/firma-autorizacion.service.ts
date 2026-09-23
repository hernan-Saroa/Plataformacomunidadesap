import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ConfigurationsService } from './configurations.service';
import type { LegalAccess } from '../auth/legal-access';

/**
 * Autorización de firma de documentos.
 *
 * El frontend ya oculta el botón de firmar a quien no es el aprobador configurado de la etapa
 * (Configuraciones SIGL → Estados → Aprobación), pero los endpoints que marcan un documento como
 * firmado no validaban nada: bastaba una llamada directa a la API para que cualquier usuario
 * autenticado (por ejemplo el rol Resuelve) marcara firmado un documento cuya etapa exige la
 * firma del Jefe. Este servicio cierra ese hueco con la MISMA regla parametrizable que usa la UI.
 *
 * Regla: si la etapa tiene aprobador configurado, sólo ese rol/usuario (o un SUPER_ADMIN) puede
 * marcar el documento como firmado. Si la etapa no está parametrizada no se valida nada, porque
 * esa etapa no exige firma en plataforma y el endpoint sigue sirviendo para cargar documentos
 * firmados por fuera ("Subir Firmado").
 */
@Injectable()
export class FirmaAutorizacionService {
    constructor(
        @InjectRepository(Expediente)
        private readonly expedienteRepository: Repository<Expediente>,
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepository: Repository<ConsultaJuridica>,
        private readonly configurationsService: ConfigurationsService
    ) { }

    /** Valida al aprobador contra la etapa; si la etapa no exige firma, deja pasar. */
    private validarEstado(estado: any, access: LegalAccess, etapa?: string): void {
        const tipo = estado?.aprobacionTipo;
        if (!estado || !tipo || tipo === 'ninguno') return;

        const roles = access?.roles || [];
        if (roles.includes('SUPER_ADMIN')) return;

        if (tipo === 'rol' && estado.aprobacionRol) {
            const rolRequerido = String(estado.aprobacionRol).toUpperCase();
            if (!roles.map((r) => String(r).toUpperCase()).includes(rolRequerido)) {
                throw new ForbiddenException(
                    `Se requiere el rol "${estado.aprobacionRol}" para firmar documentos en la etapa "${estado.nombre || etapa}"`
                );
            }
            return;
        }

        if (tipo === 'usuario' && estado.aprobacionUsuario) {
            if (!access?.userId || String(access.userId) !== String(estado.aprobacionUsuario)) {
                throw new ForbiddenException(
                    `Solo el usuario configurado como aprobador puede firmar documentos en la etapa "${estado.nombre || etapa}"`
                );
            }
        }
    }

    /**
     * Etapas aplicables al expediente, resueltas igual que la pantalla que muestra el botón de
     * firmar, para que la API no bloquee a quien la UI sí habilita:
     *  - Juzgamiento Disciplinario trabaja con el Kanban General del módulo, así que se leen
     *    directamente los estados de la configuración 'juzgamiento'.
     *  - Defensa Judicial usa el tablero del tipo de proceso cuando existe, y si no el general:
     *    ese es exactamente el matching de getEstadosForExpediente().
     */
    private async resolverEstados(expediente: Expediente): Promise<any[]> {
        const esDisciplinario = ['DISCIPLINARIO', 'DISCIPLINARIA'].includes(
            String(expediente.jurisdiccion || '').toUpperCase()
        );

        if (esDisciplinario) {
            const config = await this.configurationsService.findByKey('juzgamiento');
            return Array.isArray(config?.value?.estados) ? config.value.estados : [];
        }

        return this.configurationsService.getEstadosForExpediente(expediente);
    }

    /** Documentos de un expediente (Defensa Judicial y Juzgamiento Disciplinario). */
    async assertPuedeFirmarDocumentoExpediente(expedienteId: string, access: LegalAccess): Promise<void> {
        if (!expedienteId) return;

        const expediente = await this.expedienteRepository.findOne({ where: { id: expedienteId } });
        if (!expediente) return;

        const estados = await this.resolverEstados(expediente);
        const etapa = expediente.etapa || expediente.etapaProcesal || expediente.estado;
        const estado = this.configurationsService.findEstado(estados, etapa);

        this.validarEstado(estado, access, etapa);
    }

    /** Documentos de una consulta de Asesoría Jurídica. */
    async assertPuedeFirmarDocumentoConsulta(consultaId: string, access: LegalAccess): Promise<void> {
        if (!consultaId) return;

        const consulta = await this.consultaRepository.findOne({ where: { id: consultaId } });
        if (!consulta) return;

        const config = await this.configurationsService.findByKey('asesoria-juridica');
        const estados = Array.isArray(config?.value?.estados) ? config.value.estados : [];
        const estado = this.configurationsService.findEstado(estados, consulta.estado);

        this.validarEstado(estado, access, consulta.estado);
    }
}

/**
 * ¿Esta petición está marcando el documento como firmado? La firma en plataforma guarda el
 * certificado como JSON en `descripcion` (con `firmado: true`) y/o el flag `firmado`.
 */
export function solicitaMarcarFirmado(body: any): boolean {
    if (!body) return false;
    if (body.firmado === true || body.firmado === 'true' || body.firmado === '1') return true;
    if (typeof body.descripcion === 'string') {
        try {
            const data = JSON.parse(body.descripcion);
            return !!(data && data.firmado);
        } catch (e) {
            return false;
        }
    }
    return false;
}
