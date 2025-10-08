import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileDto } from '../../../../services/files/models/file-dto';
import { FileManagementService } from '../../../../services/files/services/file-management.service';

@Component({
  selector: 'app-files-page',
  templateUrl: './files-page.component.html',
  styleUrls: ['./files-page.component.css']
})
export class FilesPageComponent implements OnInit {
  Math = Math;
  uploadedFiles: FileDto[] = [];
  isLoading = false;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalFiles = 0;
  totalPages = 0;

  // Filtres et recherche
  searchQuery = '';
  selectedFileType: string = 'all';
  sortBy: 'uploadedAt' | 'originalName' | 'fileSize' = 'uploadedAt';
  sortDir: 'asc' | 'desc' = 'desc';

  fileTypes = [
    { value: 'all', label: 'All Files' },
    { value: 'image', label: 'Images' },
    { value: 'pdf', label: 'PDFs' },
    { value: 'document', label: 'Documents' },
    { value: 'video', label: 'Videos' }
  ];

  constructor(
    private snackBar: MatSnackBar,
    private fileService: FileManagementService
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    this.fileService.getFiles({
      Authorization: `Bearer ${token}`,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      search: this.searchQuery || undefined
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.uploadedFiles = this.filterFilesByType(response.data.content || []);
          this.totalFiles = response.data.totalElements || 0;
          this.totalPages = response.data.totalPages || 0;
          console.log(`Loaded ${this.uploadedFiles.length} files`);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading files:', error);
        this.snackBar.open('Error loading files', 'Close', { duration: 3000 });
      }
    });
  }

  filterFilesByType(files: FileDto[]): FileDto[] {
    if (this.selectedFileType === 'all') {
      return files;
    }

    switch (this.selectedFileType) {
      case 'image':
        return files.filter(f => f.isImage);
      case 'pdf':
        return files.filter(f => f.isPdf);
      case 'video':
        return files.filter(f => f.isVideo);
      case 'document':
        return files.filter(f =>
          ['doc', 'docx', 'xls', 'xlsx', 'txt'].includes(f.extension?.toLowerCase() || '')
        );
      default:
        return files;
    }
  }

  onSearch(): void {
  if (this.searchQuery) {
    this.selectedFileType = 'all';
  }
  this.currentPage = 0;
  this.loadFiles();
}

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 0;
    this.loadFiles();
  }

  onFileTypeChange(): void {
    this.currentPage = 0;
    this.loadFiles();
  }

  onSortChange(): void {
    this.currentPage = 0;
    this.loadFiles();
  }

  toggleSortDirection(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.loadFiles();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadFiles();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadFiles();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadFiles();
    }
  }

  refreshFiles(): void {
    this.currentPage = 0;
    this.loadFiles();
  }

  onFileUploaded(file: FileDto): void {
    console.log('File uploaded:', file);
    this.snackBar.open(`File "${file.originalName}" uploaded successfully`, 'Close', {
      duration: 3000
    });
    // Recharger la liste
    this.refreshFiles();
  }

  onFileDeleted(fileId: string): void {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
    this.totalFiles--;
    this.snackBar.open('File deleted successfully', 'Close', {
      duration: 3000
    });

    // Si la page est vide, revenir à la page précédente
    if (this.uploadedFiles.length === 0 && this.currentPage > 0) {
      this.currentPage--;
      this.loadFiles();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
