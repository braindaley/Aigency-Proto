
'use client';

import { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  className?: string;
}

export function FileUpload({ onFilesChange, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = useCallback(
    (newFiles: FileList | null) => {
      if (newFiles) {
        const uniqueNewFiles = Array.from(newFiles).filter(
          (newFile) => !files.some((existingFile) => existingFile.name === newFile.name && existingFile.size === newFile.size)
        );
        const updatedFiles = [...files, ...uniqueNewFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
      }
    },
    [files, onFilesChange]
  );

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-accent' : 'border-input hover:border-primary/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload-input')?.click()}
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="mb-2 text-sm text-muted-foreground">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">Select multiple files to upload</p>
        <input
          id="file-upload-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files:</h4>
          <ul className="divide-y rounded-md border">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)} aria-label={`Remove ${file.name}`}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
