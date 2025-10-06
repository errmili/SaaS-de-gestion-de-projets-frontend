import { Component, Output, EventEmitter } from '@angular/core';
import { FileManagementService } from '../../../../services/files/services/file-management.service';
import { FileDto } from '../../../../services/files/models/file-dto';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  @Output() fileUploaded = new EventEmitter<FileDto>();

  selectedFile: File | null = null;
  isDragging = false;
  isUploading = false;
  uploadProgress = 0;

  constructor(
    private fileService: FileManagementService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('File selected:', this.selectedFile.name);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      console.log('File dropped:', this.selectedFile.name);
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Please select a file first', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const token = localStorage.getItem('access_token');
    if (!token) {
      this.snackBar.open('Authentication required', 'Close', { duration: 3000 });
      this.isUploading = false;
      return;
    }

    // Simuler progression
    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
      }
    }, 200);

    this.fileService.uploadFile({
      Authorization: `Bearer ${token}`,
      body: {
        file: this.selectedFile
      },
      isPublic: false,
      allowDuplicates: true
    }).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress = 100;

        console.log('Upload response:', response);

        if (response.success && response.data) {
          setTimeout(() => {
            this.fileUploaded.emit(response.data!);
            this.resetUpload();
          }, 500);
        } else {
          this.snackBar.open('Upload failed', 'Close', { duration: 3000 });
          this.isUploading = false;
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        console.error('Upload error:', error);
        this.snackBar.open('Error uploading file', 'Close', { duration: 3000 });
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    });
  }

  resetUpload(): void {
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
  }

  cancelUpload(): void {
    this.resetUpload();
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf': return 'picture_as_pdf';
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'table_chart';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      case 'mp4':
      case 'avi':
      case 'mov': return 'video_file';
      case 'mp3':
      case 'wav': return 'audio_file';
      case 'zip':
      case 'rar': return 'folder_zip';
      default: return 'insert_drive_file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
