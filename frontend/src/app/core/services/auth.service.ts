import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  ResetPasswordPayload,
  UpdateProfilePayload,
} from '../models/auth.model';
import { AuthUser } from '../models/user.model';
import { PERMISSIONS } from '../constants/permissions';

const ACCESS_TOKEN_KEY = 'sc_access_token';
const REFRESH_TOKEN_KEY = 'sc_refresh_token';
const USER_KEY = 'sc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<AuthUser | null>(this.readCachedUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly permissions = computed(() => this.currentUser()?.role.permissions ?? []);

  hasPermission(...required: string[]): boolean {
    const perms = this.permissions();
    if (perms.includes(PERMISSIONS.WILDCARD)) return true;
    return required.some((permission) => perms.includes(permission));
  }

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  login(payload: LoginPayload): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, payload)
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  refresh(): Observable<ApiResponse<LoginResponse>> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.baseUrl}/refresh`, {
        refreshToken: this.refreshToken,
      })
      .pipe(tap((res) => this.persistSession(res.data)));
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/reset-password`, payload);
  }

  changePassword(
    payload: ChangePasswordPayload,
  ): Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.http
      .post<
        ApiResponse<{ accessToken: string; refreshToken: string }>
      >(`${this.baseUrl}/change-password`, payload)
      .pipe(
        tap((res) => {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, res.data.accessToken);
          sessionStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
        }),
      );
  }

  getProfile(): Observable<ApiResponse<AuthUser>> {
    return this.http
      .get<ApiResponse<AuthUser>>(`${this.baseUrl}/profile`)
      .pipe(tap((res) => this.setUser(res.data)));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<ApiResponse<AuthUser>> {
    return this.http
      .patch<ApiResponse<AuthUser>>(`${this.baseUrl}/profile`, payload)
      .pipe(tap((res) => this.setUser(res.data)));
  }

  clearSession(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  private persistSession(data: LoginResponse): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    this.setUser(data.user);
  }

  private setUser(user: AuthUser): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private readCachedUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
