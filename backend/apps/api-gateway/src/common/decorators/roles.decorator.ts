import { SetMetadata } from '@nestjs/common';
import { Role } from '@app/common';

export const ROLES_KEY = 'roles';

/** Routes without @Roles are open to any logged-in user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
