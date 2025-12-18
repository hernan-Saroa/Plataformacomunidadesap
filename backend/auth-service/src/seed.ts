import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { Repository } from 'typeorm';
import { Role } from './users/role.entity';
import { Permission } from './users/permission.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
  const permissionRepo = app.get<Repository<Permission>>(getRepositoryToken(Permission));

  // Crear permisos básicos
  const permissions = [
    { name: 'users.create', description: 'Crear usuarios' },
    { name: 'users.read', description: 'Ver usuarios' },
    { name: 'users.update', description: 'Actualizar usuarios' },
    { name: 'users.delete', description: 'Eliminar usuarios' },
    { name: 'roles.manage', description: 'Gestionar roles' },
    { name: 'permissions.manage', description: 'Gestionar permisos' },
  ];

  for (const perm of permissions) {
    const existing = await permissionRepo.findOne({ where: { name: perm.name } });
    if (!existing) {
      await permissionRepo.save(permissionRepo.create(perm));
      console.log(`Permiso creado: ${perm.name}`);
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