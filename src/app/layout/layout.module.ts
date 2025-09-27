import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { SharedModule } from '../shared/shared.module'; // ✅ AJOUTER
// import { MaterialModule } from '../material.module'; // Si tu l'as
import { RouterModule } from '@angular/router'; // ✅ AJOUTER
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { MaterialModule } from '../shared/material.module';
import { SharedModule } from '../shared/shared/shared.module';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';

@NgModule({
  declarations: [
    MainLayoutComponent,
    AuthLayoutComponent
  ],
  imports: [
    CommonModule,
    SharedModule,     // ✅ AJOUTER
    MaterialModule,   // ✅ AJOUTER
    RouterModule      // ✅ AJOUTER
  ],
  exports: [
    MainLayoutComponent,
    AuthLayoutComponent
  ]
})
export class LayoutModule { }
