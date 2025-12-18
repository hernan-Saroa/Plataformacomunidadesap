import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity({ name: 'role', schema: 'auth' })
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: 'Shield' })
    icon: string;

    @Column({ default: '#003DA5' })
    color: string;

    @Column({ default: 'personalizado' })
    type: 'sistema' | 'personalizado';

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    requires_2fa: boolean;

    @Column({ nullable: true })
    created_by: string;

    @Column({ nullable: true })
    updated_by: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToMany(() => User, user => user.roles)
    users: User[];

    @ManyToMany(() => Permission)
    @JoinTable({
        name: 'role_permissions',
        schema: 'auth',
        joinColumn: { name: 'id_rol', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'id_permission', referencedColumnName: 'id_permission' }
    })
    permissions: Permission[];
}