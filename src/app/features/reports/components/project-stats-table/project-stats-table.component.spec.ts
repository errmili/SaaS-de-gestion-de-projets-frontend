import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectStatsTableComponent } from './project-stats-table.component';

describe('ProjectStatsTableComponent', () => {
  let component: ProjectStatsTableComponent;
  let fixture: ComponentFixture<ProjectStatsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProjectStatsTableComponent]
    });
    fixture = TestBed.createComponent(ProjectStatsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
