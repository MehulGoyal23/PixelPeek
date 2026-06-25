import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ImageMetadata } from '../types';

interface UploadZoneProps {
  onUploadSuccess: (image: ImageMetadata) => void;
  onError: (message: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.tiff', '.tif'];
    if (!allowed.includes(ext)) {
      onError(`Unsupported file format. Supported formats: JPG, PNG, TIFF`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 201) {
        try {
          const responseData = JSON.parse(xhr.responseText) as ImageMetadata;
          onUploadSuccess(responseData);
        } catch {
          onError("Failed to parse server response.");
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          onError(err.detail || "Failed to upload image");
        } catch {
          onError("Failed to upload image");
        }
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      onError("Network error during file upload.");
    };

    xhr.send(formData);
  };

  return (
    <div 
      className={`glass-panel upload-zone ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={uploading ? undefined : onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.tiff,.tif"
        onChange={handleChange}
        disabled={uploading}
      />
      
      {uploading ? (
        <>
          <Loader2 className="upload-icon animate-spin" />
          <div className="upload-title">Uploading image...</div>
          <div className="upload-subtitle">{progress}% completed</div>
          <div className="upload-progress-container">
            <div 
              className="upload-progress-bar" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </>
      ) : (
        <>
          <Upload className="upload-icon" />
          <div className="upload-title">Drag & drop your image here</div>
          <div className="upload-subtitle">Supports JPG, PNG, and TIFF up to 20MB</div>
          <div className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            <ImageIcon size={16} /> Choose File
          </div>
        </>
      )}
    </div>
  );
};
