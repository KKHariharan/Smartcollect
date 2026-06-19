import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';
import { CreateRolePayload, Role, UpdateRolePayload } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesService extends CrudService<Role, CreateRolePayload, UpdateRolePayload> {
  protected readonly endpoint = '/roles';
}
