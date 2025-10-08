import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { SearchResult, SearchResults } from '../../../core/services/search.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent {
  @Input() results: SearchResults | null = null;
  @Input() isSearching = false;
  @Output() resultSelected = new EventEmitter<void>();

  constructor(private router: Router) {}

  onResultClick(result: SearchResult): void {
    this.router.navigate(result.route);
    this.resultSelected.emit();
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'task': return 'Tasks';
      case 'project': return 'Projects';
      case 'member': return 'Team Members';
      default: return '';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'task': return 'assignment';
      case 'project': return 'folder';
      case 'member': return 'people';
      default: return 'search';
    }
  }

  hasResults(): boolean {
    return this.results ? this.results.total > 0 : false;
  }
}
