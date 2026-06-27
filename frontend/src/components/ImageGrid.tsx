import React from 'react';
import { Trash2, Eye, Camera } from 'lucide-react';
import { ImageMetadata } from '../types';

interface ImageGridProps {
  images: ImageMetadata[];
  selectedImageId: number | null;
  onSelectImage: (image: ImageMetadata) => void;
  onDeleteImage: (id: number) => void;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onDeleteImage,
}) => {
  
  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this image and its metadata?")) {
      onDeleteImage(id);
    }
  };

  if (images.length === 0) {
    return (
      <div className="empty-state">
        <Eye className="empty-icon" size={48} />
        <h3>No images found</h3>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Upload new images or adjust your search filters to find them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid-container">
      <div className="grid-layout">
        {images.map((img) => {
          const hasGps = img.latitude != null && img.longitude != null;
          const formattedDate = img.date_taken 
            ? new Date(img.date_taken).toLocaleDateString()
            : 'Unknown date';
            
          return (
            <div 
              key={img.id}
              className={`image-card ${selectedImageId === img.id ? 'selected' : ''}`}
              onClick={() => onSelectImage(img)}
            >
              <div className="card-thumb">
                <img 
                  src={img.filepath} 
                  alt={img.filename} 
                  loading="lazy" 
                />
                
                {img.stego_status && img.stego_status !== 'clean' ? (
                  <div className="card-stego-badge threat" title={`Steganography Detected: ${img.stego_status.toUpperCase()}`}>
                    ⚠️
                  </div>
                ) : (
                  <div className="card-stego-badge clean" title="No Steganography Detected">
                    ✓
                  </div>
                )}
              </div>
              
              <div className="card-info">
                <div className="card-name" title={img.filename}>
                  {img.filename}
                </div>
                <div className="card-meta">
                  <span className="card-meta-tag" title={img.camera_model || 'Unknown Camera'}>
                    <Camera size={10} />
                    <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.camera_model || 'Unknown Camera'}
                    </span>
                  </span>
                  <span>•</span>
                  <span>{formattedDate}</span>
                  {hasGps && (
                    <div className="card-gps-dot" title="Contains GPS coordinates"></div>
                  )}
                </div>
              </div>

              <button
                className="card-delete-btn"
                onClick={(e) => handleDelete(e, img.id)}
                title="Delete Image"
                aria-label={`Delete ${img.filename}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
