import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    console.log('🔐 === ROBUST AUTHGUARD CHECK ===');

    // ✅ VÉRIFICATION DIRECTE du localStorage (plus fiable)
    const token = localStorage.getItem('access_token');

    console.log('🔐 AuthGuard check:');
    console.log('  - Token in localStorage:', !!token);
    console.log('  - Token length:', token?.length || 0);
    console.log('  - Current URL:', window.location.href);
    console.log('  - Router URL:', this.router.url);

    // ✅ VALIDATION TOKEN SIMPLE
    if (token && token.length > 10) { // Un token JWT valide fait plus de 10 caractères
      console.log('✅ AuthGuard - Valid token found, access granted');

      // ✅ OPTIONNEL - Restaurer l'utilisateur si pas encore chargé
      // Mais SANS risquer un logout automatique
      setTimeout(() => {
        if (this.authService.restoreUserFromToken) {
          this.authService.restoreUserFromToken();
        }
      }, 100);

      return true;
    }

    // ✅ FALLBACK - Vérifier via le service (si jamais...)
    if (this.authService.isAuthenticated()) {
      console.log('✅ AuthGuard - Service says authenticated, access granted');
      return true;
    }

    console.log('❌ AuthGuard - No valid authentication, redirecting to login');
    console.log('❌ Redirect reason: token=' + (token ? 'exists but invalid' : 'missing'));

    this.router.navigate(['/auth/login']);
    return false;
  }
}
