import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { Settings, UpdateSettingsPayload } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  get(): Observable<ApiResponse<Settings>> {
    return this.http.get<ApiResponse<Settings>>(this.baseUrl);
  }

  update(dto: UpdateSettingsPayload): Observable<ApiResponse<Settings>> {
    return this.http.patch<ApiResponse<Settings>>(this.baseUrl, dto);
  }
}
