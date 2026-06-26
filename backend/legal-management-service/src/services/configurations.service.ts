import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfiguration } from '../entities/system-configuration.entity';

@Injectable()
export class ConfigurationsService {
    constructor(
        @InjectRepository(SystemConfiguration)
        private readonly configRepository: Repository<SystemConfiguration>
    ) { }

    async findByKey(key: string): Promise<SystemConfiguration | null> {
        return this.configRepository.findOne({ where: { key } });
    }

    async findAll(): Promise<SystemConfiguration[]> {
        return this.configRepository.find();
    }

    async saveConfiguration(key: string, data: any): Promise<SystemConfiguration> {
        let config = await this.findByKey(key);

        if (!config) {
            config = this.configRepository.create({
                key,
                module: data.module || 'general',
                value: data.value,
                description: data.description
            });
        } else {
            config.value = data.value;
            if (data.description) config.description = data.description;
        }

        return this.configRepository.save(config);
    }

    /**
     * Normaliza una clave de configuración igual que el frontend (ModalExpediente):
     * NFD sin acentos, minúsculas, espacios/underscores -> guion. Permite que
     * "Reparación Directa" case con el id de config "reparacion-directa".
     */
    normalizeKey(value?: string): string {
        return (value || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[_\s]+/g, '-')
            .trim();
    }

    /**
     * ¿Este estado/etapa corresponde al valor dado? Comparación TOLERANTE: casa por id O por
     * nombre normalizados (sin acentos, minúsculas, espacios/underscore -> guion), de modo que
     * sirve aunque el expediente haya guardado el id ("PROBATORIA") o el nombre ("Probatoria").
     */
    estadoMatches(estado: any, value?: string): boolean {
        if (!estado || !value) return false;
        const norm = this.normalizeKey(value);
        if (!norm) return false;
        return this.normalizeKey(estado.id) === norm || this.normalizeKey(estado.nombre || estado.name) === norm;
    }

    /** Busca un estado por id o nombre (tolerante). Devuelve el estado o undefined. */
    findEstado(estados: any[], value?: string): any {
        return (estados || []).find((e) => this.estadoMatches(e, value));
    }

    /** Índice de un estado por id o nombre (tolerante). Devuelve -1 si no existe. */
    findEstadoIndex(estados: any[], value?: string): number {
        return (estados || []).findIndex((e) => this.estadoMatches(e, value));
    }

    /**
     * Resuelve la lista de estados (etapas Kanban) aplicable a un expediente, replicando el
     * matching TOLERANTE del frontend: compara id Y nombre normalizados del tipoProceso contra
     * tipoProceso/tipo/tipoAccion del expediente. Si no hay match por tipo, cae al board por
     * defecto del módulo (config.value.estados).
     *
     * Esto corrige el mismatch histórico donde el expediente guarda el NOMBRE del tipo de
     * proceso ("Reparación Directa") y la config lo indexa por slug ("reparacion-directa"),
     * lo que impedía marcar actuaciones como PENDIENTE y, por tanto, notificar.
     */
    async getEstadosForExpediente(expediente: {
        tipoProceso?: string;
        tipo?: string;
        tipoAccion?: string;
        jurisdiccion?: string;
    }): Promise<any[]> {
        const esDisciplinario =
            expediente.jurisdiccion === 'DISCIPLINARIO' ||
            expediente.jurisdiccion === 'Disciplinaria' ||
            expediente.tipoProceso === 'DISCIPLINARIO' ||
            expediente.tipoProceso === 'Disciplinario';
        const configKey = esDisciplinario ? 'juzgamiento' : 'defensa-judicial';
        const config = await this.findByKey(configKey);
        if (!config || !config.value) return [];

        const candidatos = [expediente.tipoProceso, expediente.tipo, expediente.tipoAccion]
            .map((v) => this.normalizeKey(v))
            .filter(Boolean);

        const tipoProcesoConfig = config.value.tiposProcesos?.find((tp: any) => {
            const normId = this.normalizeKey(tp.id);
            const normName = this.normalizeKey(tp.nombre || tp.name);
            return candidatos.includes(normId) || candidatos.includes(normName);
        });

        if (tipoProcesoConfig && Array.isArray(tipoProcesoConfig.estados) && tipoProcesoConfig.estados.length > 0) {
            return tipoProcesoConfig.estados;
        }
        if (Array.isArray(config.value.estados)) {
            return config.value.estados;
        }
        return [];
    }
}
