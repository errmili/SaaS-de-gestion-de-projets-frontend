import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FilesPageComponent } from './components/files-page/files-page.component';

const routes: Routes = [
  {
    path: '',
    component: FilesPageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FilesRoutingModule { }
