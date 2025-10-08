import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css']
})
export class SettingsPageComponent implements OnInit {
  selectedTabIndex = 0;

  ngOnInit(): void {
    console.log('Settings page initialized');
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }
}
