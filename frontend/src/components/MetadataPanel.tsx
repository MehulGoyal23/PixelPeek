import React, { useState, useEffect } from 'react';
import { 
  Camera, Calendar, Image as ImageIcon, MapPin, 
  Info, Compass, Cpu, Shield, ShieldAlert, ShieldCheck, Unlock, Loader2, Sliders 
} from 'lucide-react';
import { ImageMetadata, StegoAnalysisResponse } from '../types';
import { formatFileSize } from './ImageGrid';

interface MetadataPanelProps {
  image: ImageMetadata | null;
  onOpenStego: (analysis: StegoAnalysisResponse) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ image, onOpenStego }) => {
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
      <div className="detail-empty">
        <Info size={48} />
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
          SELECT AN IMAGE FROM THE GALLERY TO INSPECT EXIF METADATA
        </p>
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

  return (
    <div className="detail-content animate-fade-in">
      {/* Image Preview */}
      <div className="detail-preview">
        <img src={image.filepath} alt={image.filename} />
        <div className="detail-preview-overlay">
          <div className="detail-filename" title={image.filename}>
            {image.filename}
          </div>
          <div className="detail-filetype">{image.file_type}</div>
        </div>
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
              {analysis.mitre_mappings && analysis.mitre_mappings.length > 0 && (
                <button 
                  className="banner-mitre-badge"
                  onClick={() => onOpenStego(analysis)}
                  style={{ border: 'none', cursor: 'pointer', textAlign: 'left', background: 'rgba(0, 255, 65, 0.12)' }}
                  title="View MITRE ATT&CK techniques mapping"
                >
                  <Shield size={11} />
                  <span>{analysis.mitre_mappings.length} ATT&CK technique{analysis.mitre_mappings.length !== 1 ? 's' : ''} mapped</span>
                </button>
              )}
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

      {/* 1. Camera Info */}
      <div className="meta-section">
        <h4 className="meta-section-title">
          <Cpu size={12} /> Camera Info
        </h4>
        <div className="meta-grid">
          <div className="meta-item">
            <Cpu className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Camera Make</span>
              <span className="meta-item-value" title={image.camera_make || 'N/A'}>
                {image.camera_make || 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Camera className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Camera Model</span>
              <span className="meta-item-value" title={image.camera_model || 'N/A'}>
                {image.camera_model || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Exposure Settings */}
      <div className="meta-section">
        <h4 className="meta-section-title">
          <Sliders size={12} /> Exposure Settings
        </h4>
        <div className="meta-grid">
          <div className="meta-item">
            <Info className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">ISO Speed</span>
              <span className="meta-item-value" title={image.iso ? `ISO ${image.iso}` : 'N/A'}>
                {image.iso ? `ISO ${image.iso}` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Camera className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Aperture</span>
              <span className="meta-item-value" title={image.aperture ? `f/${image.aperture}` : 'N/A'}>
                {image.aperture ? `f/${image.aperture}` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Info className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Shutter Speed</span>
              <span className="meta-item-value" title={image.shutter_speed || 'N/A'}>
                {image.shutter_speed || 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Camera className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Focal Length</span>
              <span className="meta-item-value" title={image.focal_length ? `${image.focal_length} mm` : 'N/A'}>
                {image.focal_length ? `${image.focal_length} mm` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GPS Data */}
      <div className="meta-section">
        <h4 className="meta-section-title">
          <MapPin size={12} /> GPS Data
        </h4>
        <div className="meta-grid">
          <div className="meta-item">
            <MapPin className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Latitude</span>
              <span className="meta-item-value" title={image.latitude != null ? `${image.latitude.toFixed(6)}°` : 'N/A'}>
                {image.latitude != null ? `${image.latitude.toFixed(6)}°` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <MapPin className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Longitude</span>
              <span className="meta-item-value" title={image.longitude != null ? `${image.longitude.toFixed(6)}°` : 'N/A'}>
                {image.longitude != null ? `${image.longitude.toFixed(6)}°` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Compass className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Altitude</span>
              <span className="meta-item-value" title={image.altitude != null ? `${image.altitude.toFixed(1)} m` : 'N/A'}>
                {image.altitude != null ? `${image.altitude.toFixed(1)} m` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. File Info */}
      <div className="meta-section">
        <h4 className="meta-section-title">
          <ImageIcon size={12} /> File Info
        </h4>
        <div className="meta-grid">
          <div className="meta-item">
            <ImageIcon className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Resolution</span>
              <span className="meta-item-value" title={resolution}>
                {resolution}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <ImageIcon className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">File Size</span>
              <span className="meta-item-value" title={formatFileSize(image.file_size)}>
                {formatFileSize(image.file_size)}
              </span>
            </div>
          </div>
          <div className="meta-item">
            <Calendar className="meta-item-icon" size={14} />
            <div className="meta-item-details">
              <span className="meta-item-label">Date Taken</span>
              <span className="meta-item-value" title={dateStr}>
                {dateStr}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
