import { Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity('system_configurations', { schema: 'legal_management' })
export class SystemConfiguration {
    @PrimaryColumn()
    key: string;

    @Column()
    module: string;

    @Column({ type: 'jsonb' })
    value: any;

    @Column({ nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
