import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

// Services existants
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// ✅ NOUVEAUX SERVICES - Notifications
import { WebSocketService } from './services/websocket.service';
import { NotificationService } from './services/notification.service';

// Configuration pour éviter les imports multiples
export function throwIfAlreadyLoaded(parentModule: any, moduleName: string) {
  if (parentModule) {
    throw new Error(`${moduleName} has already been loaded. Import ${moduleName} only once, in AppModule.`);
  }
}

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    // Services existants
    AuthService,
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    // ✅ NOUVEAUX SERVICES - Notifications
    WebSocketService,
    NotificationService,
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    throwIfAlreadyLoaded(parentModule, 'CoreModule');
  }
}
