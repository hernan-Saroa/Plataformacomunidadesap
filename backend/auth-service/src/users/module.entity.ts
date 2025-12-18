import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';

@Entity({ name: 'module', schema: 'auth' })
export class Module {
    @PrimaryGeneratedColumn('uuid')
    id_module: string;

    @Column({ unique: true, length: 50 })
    code: string;

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 50, default: 'Shield' })
    icon: string;

    @Column({ length: 20, default: '#003DA5' })
    color: string;

    @Column({ default: 0 })
    display_order: number;

    @Column({ length: 30, default: 'backoffice' })
    category: 'backoffice' | 'portal';

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => Permission, permission => permission.module)
    permissions: Permission[];
}
