import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { SharedModule } from '../shared/shared.module';
// import { MaterialModule } from '../material.module';
import { RouterModule } from '@angular/router';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { MaterialModule } from '../shared/material.module';
import { SharedModule } from '../shared/shared/shared.module';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    MainLayoutComponent,
    AuthLayoutComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    MaterialModule,
    RouterModule,
    ReactiveFormsModule
  ],
  exports: [
    MainLayoutComponent,
    AuthLayoutComponent
  ]
})
export class LayoutModule { }
