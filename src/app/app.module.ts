// src/app/app.module.ts - VERSION CORRIGÉE
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// import { AppRoutingModule } from './app-routing.module';
// import { MaterialModule } from '../../material.module'; // ✅ CORRECTION - Chemin direct
// import { AppComponent } from './app.component';

// ✅ AJOUT IMPORTANT - Services notifications
import { WebSocketService } from './core/services/websocket.service';
import { NotificationService } from './core/services/notification.service';

// Modules existants
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { LayoutModule } from './layout/layout.module';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MaterialModule } from './shared/material.module';
import { SharedModule } from './shared/shared/shared.module';
// import { SharedModule } from './shared/shared.module'; // ✅ CORRECTION - Chemin corrigé

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MaterialModule,
    LayoutModule,
    SharedModule // ✅ CORRECTION - SharedModule corrigé
  ],
  providers: [
    // ✅ AJOUT IMPORTANT - Services notifications
    WebSocketService,
    NotificationService,

    // Interceptor existant
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
