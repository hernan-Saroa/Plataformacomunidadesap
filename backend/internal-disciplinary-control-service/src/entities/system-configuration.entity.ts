import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('system_configuration')
export class SystemConfiguration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // CAPACIDAD POR CARGO (JSON)
    // Ejemplo: { "profesional": 10, "especializado": 15 ... }
    @Column('jsonb', { default: {} })
    roleCapacities: Record<string, number>;

    // CONFIGURACIÓN DE NOTIFICACIONES (JSON)
    // Ejemplo: { "vencimiento7dias": true, "emailMasterSwitch": true ... }
    @Column('jsonb', { default: {} })
    notificationSettings: Record<string, boolean>;

    // CONFIGURACIÓN DE ALERTAS (JSON)
    // Ejemplo: { "porcentajeAmarillo": 85, "porcentajeRojo": 95 ... }
    @Column('jsonb', { default: {} })
    alertSettings: Record<string, number>;

    // SEGURIDAD Y AUDITORÍA (JSON)
    // Ejemplo: { "auditEnabled": true, "digitalSignature": false ... }
    @Column('jsonb', { default: {} })
    securitySettings: Record<string, boolean>;

    // PLANTILLAS DE DOCUMENTOS (JSON)
    // Ejemplo: { "oficios": [...], "autos": [...], "actas": [...] }
    @Column('jsonb', { default: {} })
    documentTemplates: Record<string, any>;
}
