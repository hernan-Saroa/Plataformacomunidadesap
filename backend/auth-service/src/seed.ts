import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { Repository } from 'typeorm';
import { Role } from './users/role.entity';
import { Permission } from './users/permission.entity';
import { Module } from './users/module.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
  const permissionRepo = app.get<Repository<Permission>>(getRepositoryToken(Permission));
  const moduleRepo = app.get<Repository<Module>>(getRepositoryToken(Module));

  // Obtener o crear módulo "users" para los permisos
  let usersModule = await moduleRepo.findOne({ where: { code: 'users' } });
  if (!usersModule) {
    usersModule = moduleRepo.create({
      code: 'users',
      name: 'Usuarios y Personas',
      description: 'Gestión de usuarios, personas y vinculaciones del sistema',
      icon: 'Users',
      color: '#3b82f6',
      display_order: 1,
      category: 'backoffice',
    });
    usersModule = await moduleRepo.save(usersModule);
    console.log('Módulo "users" creado');
  }

  // Obtener o crear módulo "roles" para permisos de roles
  let rolesModule = await moduleRepo.findOne({ where: { code: 'roles' } });
  if (!rolesModule) {
    rolesModule = moduleRepo.create({
      code: 'roles',
      name: 'Roles y Permisos',
      description: 'Gestión de roles, permisos y control de acceso',
      icon: 'Lock',
      color: '#7c2d12',
      display_order: 18,
      category: 'backoffice',
    });
    rolesModule = await moduleRepo.save(rolesModule);
    console.log('Módulo "roles" creado');
  }

  // Crear permisos básicos con code e id_module
  const permissions = [
    { code: 'users.create', name: 'Crear usuarios', description: 'Permite crear nuevos usuarios', id_module: usersModule.id_module },
    { code: 'users.read', name: 'Ver usuarios', description: 'Permite ver la lista de usuarios', id_module: usersModule.id_module },
    { code: 'users.update', name: 'Actualizar usuarios', description: 'Permite actualizar información de usuarios', id_module: usersModule.id_module },
    { code: 'users.delete', name: 'Eliminar usuarios', description: 'Permite eliminar usuarios', id_module: usersModule.id_module },
    { code: 'roles.manage', name: 'Gestionar roles', description: 'Permite gestionar roles del sistema', id_module: rolesModule.id_module },
    { code: 'permissions.manage', name: 'Gestionar permisos', description: 'Permite gestionar permisos del sistema', id_module: rolesModule.id_module },
  ];

  for (const perm of permissions) {
    const existing = await permissionRepo.findOne({ where: { code: perm.code } });
    if (!existing) {
      await permissionRepo.save(permissionRepo.create(perm));
      console.log(`Permiso creado: ${perm.code} (${perm.name})`);
    } else {
      console.log(`Permiso ya existe: ${perm.code}`);
    }
  }

  // Crear roles básicos
  const adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    const adminRoleEntity = roleRepo.create({
      name: 'ADMIN',
      description: 'Administrador del sistema',
    });
    const savedAdminRole = await roleRepo.save(adminRoleEntity);

    // Asignar todos los permisos al rol ADMIN
    const allPermissions = await permissionRepo.find();
    savedAdminRole.permissions = allPermissions;
    await roleRepo.save(savedAdminRole);

    console.log('Rol ADMIN creado con todos los permisos');
  }

  const userRole = await roleRepo.findOne({ where: { name: 'USER' } });
  if (!userRole) {
    const userRoleEntity = roleRepo.create({
      name: 'USER',
      description: 'Usuario regular',
    });
    await roleRepo.save(userRoleEntity);
    console.log('Rol USER creado');
  }

  // Crear usuarios de prueba
  const testUsers = [
    {
      firstName: 'Admin',
      lastName: 'Sistema',
      documentNumber: '123456789',
      email: 'admin@esap.edu.co',
      phone: '1234567890',
      username: 'admin',
      password: '123456',
      roles: ['ADMIN'],
    },
    {
      firstName: 'Estudiante',
      lastName: 'Prueba',
      documentNumber: '123456790',
      email: 'estudiante@esap.edu.co',
      phone: '1234567891',
      username: 'estudiante',
      password: '123456',
      roles: ['USER'],
    },
    {
      firstName: 'Docente',
      lastName: 'Planta',
      documentNumber: '123456791',
      email: 'planta@esap.edu.co',
      phone: '1234567892',
      username: 'planta',
      password: '123456',
      roles: ['USER'],
    },
    {
      firstName: 'Docente',
      lastName: 'Cátedra',
      documentNumber: '123456792',
      email: 'catedra@esap.edu.co',
      phone: '1234567893',
      username: 'catedra',
      password: '123456',
      roles: ['USER'],
    },
    {
      firstName: 'Gestor',
      lastName: 'Certificados',
      documentNumber: '123456793',
      email: 'cerlaboral@esap.edu.co',
      phone: '1234567894',
      username: 'cerlaboral',
      password: '123456',
      roles: ['USER'],
    },
  ];

  for (const userData of testUsers) {
    const existingUser = await usersService.findByUsername(userData.username);
    if (!existingUser) {
      await usersService.createPersonAndUser(userData);
      console.log(`Usuario creado: ${userData.username} / ${userData.password} (${userData.email})`);
    }
  }

  await app.close();
  console.log('Seeding completado');
}

seed().catch(console.error);