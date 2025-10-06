import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FileDto } from '../../../../services/files/models/file-dto';
import { FileManagementService } from '../../../../services/files/services/file-management.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.css']
})
export class FileListComponent {
  @Input() files: FileDto[] = [];
  @Output() fileDeleted = new EventEmitter<string>();

  constructor(
    private fileService: FileManagementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  downloadFile(file: FileDto): void {
    if (!file.id) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      return;
    }

    this.fileService.downloadFile({
      fileId: file.id,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName || 'download';
        link.click();
        window.URL.revokeObjectURL(url);

        this.snackBar.open('File downloaded', 'Close', { duration: 2000 });
      },
      error: (error) => {
        console.error('Download error:', error);
        this.snackBar.open('Error downloading file', 'Close', { duration: 3000 });
      }
    });
  }

  deleteFile(file: FileDto): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete File',
        message: `Are you sure you want to delete "${file.originalName}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && file.id) {
        this.performDelete(file.id);
      }
    });
  }

  private performDelete(fileId: string): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    this.fileService.deleteFile({
      fileId: fileId,
      Authorization: `Bearer ${token}`
    }).subscribe({
      next: () => {
        this.fileDeleted.emit(fileId);
      },
      error: (error) => {
        console.error('Delete error:', error);
        this.snackBar.open('Error deleting file', 'Close', { duration: 3000 });
      }
    });
  }

  getFileIcon(file: FileDto): string {
    if (file.isImage) return 'image';
    if (file.isVideo) return 'video_file';
    if (file.isPdf) return 'picture_as_pdf';

    const extension = file.extension?.toLowerCase();
    switch (extension) {
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'table_chart';
      case 'zip':
      case 'rar': return 'folder_zip';
      default: return 'insert_drive_file';
    }
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
