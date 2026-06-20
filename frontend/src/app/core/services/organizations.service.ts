import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';
import {
  CreateOrganizationPayload,
  Organization,
  UpdateOrganizationPayload,
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationsService extends CrudService<
  Organization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload
> {
  protected readonly endpoint = '/organizations';
}
