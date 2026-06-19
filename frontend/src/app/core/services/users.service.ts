import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';
import { CreateUserPayload, UpdateUserPayload, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService extends CrudService<User, CreateUserPayload, UpdateUserPayload> {
  protected readonly endpoint = '/users';
}
