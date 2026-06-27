import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Download, FileText, AlertCircle, CheckCircle2,
  FolderOpen, MapPin, ShieldAlert, Crosshair, Terminal
} from 'lucide-react';
import { ImageMetadata, FilterParams, StegoAnalysisResponse } from './types';
import { UploadZone } from './components/UploadZone';
import { SearchFilters } from './components/SearchFilters';
import { ImageGrid } from './components/ImageGrid';
import { MetadataPanel } from './components/MetadataPanel';
import { MapView } from './components/MapView';
import { StegoPanel } from './components/StegoPanel';

const initialFilters: FilterParams = {
  q: '',
  cameraModel: '',
  hasGps: 'all',
  dateFrom: '',
  dateTo: '',
};

function App() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [cameraModels, setCameraModels] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterParams>(initialFilters);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isStegoView, setIsStegoView] = useState<boolean>(false);
  const [stegoAnalysis, setStegoAnalysis] = useState<StegoAnalysisResponse | null>(null);

  useEffect(() => {
    setIsStegoView(false);
    setStegoAnalysis(null);
  }, [selectedImage]);

  const handleOpenStego = (analysis: StegoAnalysisResponse) => {
    setStegoAnalysis(analysis);
    setIsStegoView(true);
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch images with filters
  const fetchImages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.cameraModel) params.append('camera_model', filters.cameraModel);
      if (filters.hasGps !== 'all') {
        params.append('has_gps', filters.hasGps === 'true' ? 'true' : 'false');
      }
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);

      const res = await fetch(`/api/images?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch images");
      
      const data = await res.json();
      setImages(data);
      
      // Update selected image reference if still in the list
      setSelectedImage(current => {
        if (!current) return null;
        const found = data.find((img: ImageMetadata) => img.id === current.id);
        return found || current;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load images";
      showToast(message, "error");
    }
  }, [filters, showToast]);

  // Fetch unique camera models
  const fetchCameraModels = useCallback(async () => {
    try {
      const res = await fetch('/api/camera-models');
      if (!res.ok) throw new Error("Failed to fetch camera models");
      const data = await res.json();
      setCameraModels(data);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  // Initialize: fetch images and camera models on mount and filter change
  useEffect(() => {
    fetchImages();
    fetchCameraModels();
  }, [filters, fetchImages, fetchCameraModels]);

  const handleUploadSuccess = (newImage: ImageMetadata) => {
    setImages(prev => [newImage, ...prev]);
    setSelectedImage(newImage);
    fetchCameraModels();
    showToast("Image uploaded and EXIF metadata extracted successfully!");
  };

  const handleDeleteImage = async (id: number) => {
    try {
      const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete image");
      
      setImages(prev => prev.filter(img => img.id !== id));
      if (selectedImage?.id === id) {
        setSelectedImage(null);
      }
      fetchCameraModels();
      showToast("Image deleted successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete image";
      showToast(message, "error");
    }
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.cameraModel) params.append('camera_model', filters.cameraModel);
    if (filters.hasGps !== 'all') {
      params.append('has_gps', filters.hasGps === 'true' ? 'true' : 'false');
    }
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);

    window.open(`/api/export?${params.toString()}`, '_blank');
    showToast("CSV export started — check your downloads.");
  };

  const handleApiDocsClick = () => {
    window.open('/docs', '_blank');
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo"><Terminal size={20} className="text-green animate-pulse" /></span>
          <h1 className="brand-title">PixelPeek</h1>
          <span className="brand-tagline">Image Forensics & Steganography Platform</span>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleApiDocsClick} title="API Documentation">
            <FileText size={16} /> API Docs
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleExportCsv}
            disabled={images.length === 0}
            title="Export metadata as CSV"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <FolderOpen size={14} />
          <span>ANALYZED:</span>
          <span className="stat-value">{images.length}</span>
        </div>
        <div className="stat-item">
          <MapPin size={14} />
          <span>GPS LOCATIONS:</span>
          <span className="stat-value">
            {images.filter(img => img.latitude !== null && img.longitude !== null).length}
          </span>
        </div>
        <div className="stat-item">
          <ShieldAlert size={14} />
          <span>THREATS DETECTED:</span>
          <span className="stat-value">
            {images.filter(img => img.stego_status === 'detected' || img.stego_status === 'suspected').length}
          </span>
        </div>
        <div className="stat-item">
          <Crosshair size={14} />
          <span>ATT&CK TECHNIQUES:</span>
          <span className="stat-value">
            {images.reduce((sum, img) => sum + (img.mitre_count || 0), 0)}
          </span>
        </div>
      </div>

      {/* Top Controls (Upload Zone + Inline Filters) */}
      <div className="top-controls">
        <UploadZone 
          onUploadSuccess={handleUploadSuccess} 
          onError={(msg) => showToast(msg, "error")} 
        />
        <SearchFilters 
          filters={filters} 
          setFilters={setFilters} 
          cameraModels={cameraModels} 
          onReset={handleResetFilters} 
        />
      </div>

      {/* Main 3-Column Work Area */}
      <div className="main-grid">
        {/* Column 1: Image Gallery */}
        <div className="column-gallery">
          <div className="column-header">
            <h2 className="column-title">
              <Camera size={14} /> Image Gallery
            </h2>
            <span className="column-badge">
              {images.length} items
            </span>
          </div>
          <div className="gallery-scroll">
            <ImageGrid 
              images={images} 
              selectedImageId={selectedImage?.id ?? null} 
              onSelectImage={setSelectedImage} 
              onDeleteImage={handleDeleteImage} 
            />
          </div>
        </div>

        {/* Column 2: Forensics Analysis Details */}
        <div className="column-detail">
          <div className="column-header">
            <h2 className="column-title">
              <Terminal size={14} /> Forensic Analysis
            </h2>
            {selectedImage && (
              <span className="column-badge" style={{ textTransform: 'none' }}>
                ID: #{selectedImage.id}
              </span>
            )}
          </div>
          
          {selectedImage ? (
            isStegoView ? (
              <StegoPanel 
                image={selectedImage} 
                analysis={stegoAnalysis} 
                onClose={() => setIsStegoView(false)} 
              />
            ) : (
              <MetadataPanel 
                image={selectedImage} 
                onOpenStego={handleOpenStego}
              />
            )
          ) : (
            <div className="detail-empty">
              <Terminal size={48} />
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6 }}>
                SELECT AN IMAGE FROM THE GALLERY TO RUN FORENSICS
              </p>
            </div>
          )}
        </div>

        {/* Column 3: Geospatial Mapping */}
        <div className="column-map">
          <div className="column-header">
            <h2 className="column-title">
              <MapPin size={14} /> Geospatial Mapping
            </h2>
            <span className="column-badge">
              {images.filter(img => img.latitude !== null).length} mapped
            </span>
          </div>
          
          <MapView 
            images={images} 
            selectedImage={selectedImage} 
            onSelectImage={setSelectedImage} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
