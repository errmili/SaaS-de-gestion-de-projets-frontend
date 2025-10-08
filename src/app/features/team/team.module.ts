import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';


import { MaterialModule } from '../../shared/material.module';
import { SharedModule } from '../../shared/shared/shared.module';

// Components
import { TeamPageComponent } from './components/team-page/team-page.component';
import { TeamListComponent } from './components/team-list/team-list.component';
import { TeamMemberDetailComponent } from './components/team-member-detail/team-member-detail.component';
import { TeamRoutingModule } from './team-routing.module';

@NgModule({
  declarations: [
    TeamPageComponent,
    TeamListComponent,
    TeamMemberDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    SharedModule,
    TeamRoutingModule
  ]
})
export class TeamModule { }
