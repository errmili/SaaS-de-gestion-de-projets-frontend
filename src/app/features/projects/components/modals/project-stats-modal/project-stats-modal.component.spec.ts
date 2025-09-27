import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectStatsModalComponent } from './project-stats-modal.component';

describe('ProjectStatsModalComponent', () => {
  let component: ProjectStatsModalComponent;
  let fixture: ComponentFixture<ProjectStatsModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProjectStatsModalComponent]
    });
    fixture = TestBed.createComponent(ProjectStatsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
