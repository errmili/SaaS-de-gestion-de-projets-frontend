import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskDistributionChartComponent } from './task-distribution-chart.component';

describe('TaskDistributionChartComponent', () => {
  let component: TaskDistributionChartComponent;
  let fixture: ComponentFixture<TaskDistributionChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TaskDistributionChartComponent]
    });
    fixture = TestBed.createComponent(TaskDistributionChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
