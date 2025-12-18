import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
} from 'typeorm';
import { LegalAuto } from './legal-auto.entity';

@Entity('auto_versions')
export class AutoVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => LegalAuto, (auto) => auto.versions)
    auto: LegalAuto;

    @Column({ type: 'text' })
    contenido: string;

    @Column({ type: 'int' })
    versionNumber: number;

    @Column({ type: 'uuid', nullable: true })
    createdBy: string;

    @Column({ type: 'text', nullable: true })
    changeReason: string;

    @CreateDateColumn()
    createdAt: Date;
}
