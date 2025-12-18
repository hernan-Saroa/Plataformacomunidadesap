import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';
import { Module } from './module.entity';

@Entity({ name: 'permission', schema: 'auth' })
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id_permission: string;

    @Column({ unique: true, length: 100 })
    code: string;

    @Column({ length: 150 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'uuid' })
    id_module: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToMany(() => Role, role => role.permissions)
    roles: Role[];

    @ManyToOne(() => Module, module => module.permissions)
    @JoinColumn({ name: 'id_module' })
    module: Module;
}