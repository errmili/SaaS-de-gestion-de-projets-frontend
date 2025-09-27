
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TasksRoutingModule } from './tasks-routing.module';
import { MyTasksComponent } from './components/my-tasks/my-tasks.component';
import { MaterialModule } from 'src/app/shared/material.module';

@NgModule({
  declarations: [
    MyTasksComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    TasksRoutingModule
  ]
})
export class TasksModule { }
