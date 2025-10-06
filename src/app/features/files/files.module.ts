import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FilesRoutingModule } from './files-routing.module';
import { MaterialModule } from '../../shared/material.module';
import { SharedModule } from '../../shared/shared/shared.module';

// Components
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileListComponent } from './components/file-list/file-list.component';
import { FilesPageComponent } from './components/files-page/files-page.component';

@NgModule({
  declarations: [
    FileUploadComponent,
    FileListComponent,
    FilesPageComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    SharedModule,
    FilesRoutingModule
  ]
})
export class FilesModule { }
