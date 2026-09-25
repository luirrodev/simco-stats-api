export const PERMISSIONS = {
  PERMISSIONS: {
    READ: 'permissions:read',
    WRITE: 'permissions:write',
  },
  ROLES: {
    READ: 'roles:read',
    CREATE: 'roles:create',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
  },
  STAFF: {
    READ: 'staff:read',
    CREATE: 'staff:create',
    UPDATE: 'staff:update',
    DELETE: 'staff:delete',
  },
  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
} as const;

export interface PermissionSeed {
  name: string;
  description: string;
}

// Fuente de verdad para el seeder: agregar un permiso nuevo = agregar
// una key en PERMISSIONS y su entrada acá. Se propaga solo al próximo
// `pnpm run seed` (se le asigna automáticamente al rol SUPER_ADMIN).
export const PERMISSIONS_SEED: PermissionSeed[] = [
  { name: PERMISSIONS.PERMISSIONS.READ, description: 'Ver permisos' },
  { name: PERMISSIONS.PERMISSIONS.WRITE, description: 'Editar permisos' },
  { name: PERMISSIONS.ROLES.READ, description: 'Ver roles' },
  { name: PERMISSIONS.ROLES.CREATE, description: 'Crear roles' },
  { name: PERMISSIONS.ROLES.UPDATE, description: 'Editar roles' },
  { name: PERMISSIONS.ROLES.DELETE, description: 'Eliminar roles' },
  { name: PERMISSIONS.STAFF.READ, description: 'Ver staff' },
  { name: PERMISSIONS.STAFF.CREATE, description: 'Crear staff' },
  { name: PERMISSIONS.STAFF.UPDATE, description: 'Editar staff' },
  { name: PERMISSIONS.STAFF.DELETE, description: 'Eliminar staff' },
  { name: PERMISSIONS.USERS.READ, description: 'Ver usuarios' },
  { name: PERMISSIONS.USERS.CREATE, description: 'Crear usuarios' },
  { name: PERMISSIONS.USERS.UPDATE, description: 'Editar usuarios' },
  { name: PERMISSIONS.USERS.DELETE, description: 'Eliminar usuarios' },
];
