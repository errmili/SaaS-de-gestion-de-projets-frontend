import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, throwError, of } from 'rxjs';
import { Router } from '@angular/router';

// 🎯 Imports corrects avec TES services générés
import { AuthControllerService } from '../../services/auth/services/auth-controller.service';
import { LoginRequest } from '../../services/auth/models/login-request';
import { RegisterRequest } from '../../services/auth/models/register-request';
import { UserDto } from '../../services/auth/models/user-dto';
import { LoginResponse } from '../../services/auth/models/login-response';
import { ApiResponseLoginResponse } from '../../services/auth/models/api-response-login-response';
import { ApiResponseUserDto } from '../../services/auth/models/api-response-user-dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserDto | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private authController: AuthControllerService,
    private router: Router
  ) {
    this.initAuth();
  }

  private initAuth(): void {
    const token = localStorage.getItem('access_token');
    console.log('🔐 AuthService.initAuth() - Token found:', !!token);

    if (token) {
      // ✅ CORRECTION - Ne pas charger l'utilisateur immédiatement
      // On laisse l'AuthGuard gérer l'authentification
      // this.loadCurrentUser(); ← COMMENTER CETTE LIGNE

      console.log('🔐 Token exists, but not loading user immediately to avoid logout loop');
    }
  }

  // 🎯 CORRIGÉ : Utilise la vraie signature générée
  login(credentials: LoginRequest): Observable<ApiResponseLoginResponse> {
    return this.authController.login({
      body: credentials
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleLoginSuccess(response.data);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  // 🎯 CORRIGÉ : Register avec la vraie signature
  register(userData: RegisterRequest): Observable<ApiResponseUserDto> {
    return this.authController.register({
      body: userData
    });
  }

  // 🎯 CORRIGÉ : Logout avec la vraie signature
  logout(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.authController.logout({
        Authorization: `Bearer ${token}`
      }).subscribe({
        complete: () => this.handleLogout()
      });
    } else {
      this.handleLogout();
    }
  }

  // ✅ CORRECTION TYPESCRIPT - Méthode simplifiée
  loadCurrentUserSafely(): void {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.log('🔐 No token for loading user');
      return;
    }

    console.log('🔐 Loading current user safely...');

    this.authController.getCurrentUser({
      Authorization: `Bearer ${token}`
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          console.log('✅ User loaded successfully');
          this.currentUserSubject.next(response.data);
        }
      }),
      catchError(error => {
        console.error('🚨 Error loading user:', error);

        // ✅ CORRECTION - Ne supprimer le token que pour certaines erreurs
        if (error.status === 401 || error.status === 403) {
          console.log('🔐 Token invalid (401/403), logging out');
          this.handleLogout();
        } else {
          console.log('🔐 Network/server error, keeping token');
          // Garder le token pour les erreurs réseau/serveur
        }

        return of(null);
      })
    ).subscribe();
  }

  // ✅ CORRECTION - Version originale mais moins agressive
  private loadCurrentUser(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.authController.getCurrentUser({
        Authorization: `Bearer ${token}`
      }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentUserSubject.next(response.data);
          }
        },
        error: (error) => {
          console.error('🚨 loadCurrentUser error:', error);

          // ✅ CORRECTION CRITIQUE - Être plus sélectif sur quand supprimer le token
          if (error.status === 401 || error.status === 403) {
            console.log('🔐 Token truly invalid, logging out');
            this.handleLogout();
          } else {
            console.log('🔐 Keeping token despite error (network/server issue)');
            // Pour les erreurs 500, timeout, network, etc. : GARDER le token
          }
        }
      });
    }
  }

  private handleLoginSuccess(loginResponse: LoginResponse): void {
    console.log('🔐 Handling login success...');

    if (loginResponse.accessToken) {
      localStorage.setItem('access_token', loginResponse.accessToken);
      console.log('✅ Token stored');
    }
    if (loginResponse.refreshToken) {
      localStorage.setItem('refresh_token', loginResponse.refreshToken);
    }
    if (loginResponse.user) {
      this.currentUserSubject.next(loginResponse.user);
    }
  }

  private handleLogout(): void {
    console.log('🔐 Handling logout - clearing tokens');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const isAuth = !!token;
    console.log('🔐 AuthService.isAuthenticated():', isAuth);
    return isAuth;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // ✅ CORRECTION TYPESCRIPT - Méthode simplifiée
  restoreUserFromToken(): void {
    const token = localStorage.getItem('access_token');
    if (token && !this.currentUserSubject.value) {
      console.log('🔧 Restoring user from token...');
      this.loadCurrentUserSafely();
    }
  }
}
