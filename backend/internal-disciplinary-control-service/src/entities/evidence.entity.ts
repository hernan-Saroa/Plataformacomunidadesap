import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';

@Entity('evidence')
export class Evidence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    url: string;

    @Column({ nullable: true })
    filename: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    fileType: string;

    @Column({ nullable: true })
    fileSize: number;

    @Column({ name: 'nombreDocumento', nullable: true })
    nombreDocumento: string;

    @Column({ name: 'tipoDocumento', nullable: true })
    tipoDocumento: string;

    @Column({ nullable: true, type: 'varchar' })
    etapa: string | null;

    @Column({ name: 'usuarioCarga', nullable: true })
    usuarioCarga: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => DisciplinaryProcess, (process) => process.evidence, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'processId' })
    process: DisciplinaryProcess;

    @Column()
    processId: string;
}
