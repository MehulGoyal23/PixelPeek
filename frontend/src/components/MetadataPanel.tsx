import React, { useState, useEffect } from 'react';
import { 
  Camera, Calendar, Image as ImageIcon, MapPin, 
  Info, Maximize2, Compass, Cpu, X, Shield, ShieldAlert, ShieldCheck, Unlock, Loader2 
} from 'lucide-react';
import { ImageMetadata, StegoAnalysisResponse } from '../types';
import { formatFileSize } from './ImageGrid';

interface MetadataPanelProps {
  image: ImageMetadata | null;
  onClose: () => void;
  onOpenStego: (analysis: StegoAnalysisResponse) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ image, onClose, onOpenStego }) => {
  const [analysis, setAnalysis] = useState<StegoAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    if (!image) {
      setAnalysis(null);
      return;
    }
    
    setAnalysis(null);
    setAnalyzing(true);
    
    fetch(`/api/images/${image.id}/stego/analyze`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to analyze stego");
        return res.json();
      })
      .then(data => {
        setAnalysis(data);
      })
      .catch(err => {
        console.error("Stego analysis error:", err);
      })
      .finally(() => {
        setAnalyzing(false);
      });
  }, [image]);

  if (!image) {
    return (
      <div className="glass-panel meta-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', color: 'var(--text-muted)' }}>
        <Info size={36} style={{ marginBottom: '1rem' }} />
        <p style={{ fontSize: '0.95rem' }}>Select an image from the gallery to inspect EXIF metadata.</p>
      </div>
    );
  }

  const resolution = `${image.width} × ${image.height}`;
  const dateStr = image.date_taken 
    ? new Date(image.date_taken).toLocaleString(undefined, { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }) 
    : 'N/A';

  const metadataItems = [
    { 
      label: 'Camera Make', 
      value: image.camera_make || 'N/A', 
      icon: <Cpu size={16} /> 
    },
    { 
      label: 'Camera Model', 
      value: image.camera_model || 'N/A', 
      icon: <Camera size={16} /> 
    },
    { 
      label: 'Date Taken', 
      value: dateStr, 
      icon: <Calendar size={16} /> 
    },
    { 
      label: 'Resolution', 
      value: resolution, 
      icon: <Maximize2 size={16} /> 
    },
    { 
      label: 'ISO Speed', 
      value: image.iso ? `ISO ${image.iso}` : 'N/A', 
      icon: <Info size={16} /> 
    },
    { 
      label: 'Aperture', 
      value: image.aperture ? `f/${image.aperture}` : 'N/A', 
      icon: <Camera size={16} /> 
    },
    { 
      label: 'Shutter Speed', 
      value: image.shutter_speed || 'N/A', 
      icon: <Info size={16} /> 
    },
    { 
      label: 'Focal Length', 
      value: image.focal_length ? `${image.focal_length} mm` : 'N/A', 
      icon: <Camera size={16} /> 
    },
    { 
      label: 'Latitude', 
      value: image.latitude != null ? `${image.latitude.toFixed(6)}°` : 'N/A', 
      icon: <MapPin size={16} /> 
    },
    { 
      label: 'Longitude', 
      value: image.longitude != null ? `${image.longitude.toFixed(6)}°` : 'N/A', 
      icon: <MapPin size={16} /> 
    },
    { 
      label: 'Altitude', 
      value: image.altitude != null ? `${image.altitude.toFixed(1)} m` : 'N/A', 
      icon: <Compass size={16} /> 
    },
    { 
      label: 'File Size', 
      value: formatFileSize(image.file_size), 
      icon: <ImageIcon size={16} /> 
    }
  ];

  return (
    <div className="glass-panel meta-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="panel-title" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={image.filename}>
            {image.filename}
          </div>
          <div className="panel-subtitle">{image.file_type}</div>
        </div>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%'
          }}
          className="close-panel-btn"
          aria-label="Close details panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Steganography Scanner Card */}
      <div className="stego-scanner-card">
        {analyzing ? (
          <div className="stego-scanning-state">
            <Loader2 size={16} className="animate-spin text-cyan-400" />
            <span>Scanning for steganography...</span>
          </div>
        ) : analysis ? (
          <div className={`stego-status-banner ${analysis.status}`}>
            <div className="banner-icon">
              {analysis.status === 'clean' && <ShieldCheck size={20} className="text-green" />}
              {analysis.status === 'suspected' && <Shield size={20} className="text-orange" />}
              {analysis.status === 'detected' && <ShieldAlert size={20} className="text-red" />}
            </div>
            <div className="banner-details">
              <div className="banner-title">
                Steganography: {analysis.status.toUpperCase()}
              </div>
              <div className="banner-desc">
                {analysis.status === 'clean' && "No steganography signatures or anomalies detected."}
                {analysis.status === 'suspected' && "Abnormally high LSB entropy. Encrypted payload suspected."}
                {analysis.status === 'detected' && `Concatenated trailing data found after EOF (${analysis.trailing_data.length} bytes).`}
              </div>
            </div>
            {(analysis.status === 'suspected' || analysis.status === 'detected') && (
              <button 
                className="btn btn-secondary btn-sm btn-decrypt-shortcut"
                onClick={() => onOpenStego(analysis)}
              >
                <Unlock size={12} /> Decrypt
              </button>
            )}
          </div>
        ) : (
          <div className="stego-scanning-state">
            <span>Unable to run steganography check.</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="meta-grid">
        {metadataItems.map((item, idx) => (
          <div className="meta-item" key={idx}>
            <div className="meta-item-icon">
              {item.icon}
            </div>
            <div className="meta-item-details">
              <span className="meta-item-label">{item.label}</span>
              <span className="meta-item-value" title={item.value.toString()}>{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
