import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Download, FileText, AlertCircle, CheckCircle2 
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
    // Use relative path — works in both dev (proxied) and Docker (nginx reverse proxy)
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
          <span className="brand-logo">📸</span>
          <h1 className="brand-title">EXIF Image Finder</h1>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleApiDocsClick}>
            <FileText size={16} /> API Docs
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleExportCsv}
            disabled={images.length === 0}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Dashboard Layout */}
      <div className="dashboard-grid">
        {/* Sidebar Controls */}
        <aside className="sidebar">
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
        </aside>

        {/* Main Work Area */}
        <main className="main-content">
          {/* Selected Details Section */}
          {selectedImage && (
            <div className="detail-panel-grid">
              {isStegoView ? (
                <StegoPanel 
                  image={selectedImage} 
                  analysis={stegoAnalysis} 
                  onClose={() => setIsStegoView(false)} 
                />
              ) : (
                <MetadataPanel 
                  image={selectedImage} 
                  onClose={() => setSelectedImage(null)} 
                  onOpenStego={handleOpenStego}
                />
              )}
              <MapView 
                images={images} 
                selectedImage={selectedImage} 
                onSelectImage={setSelectedImage} 
              />
            </div>
          )}

          {/* Gallery / Image Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="grid-header" style={{ marginBottom: '1.5rem' }}>
              <h2 className="grid-title">
                <Camera size={20} className="text-cyan-400" /> Image Gallery
              </h2>
              <span className="upload-subtitle" style={{ fontSize: '0.9rem' }}>
                Showing {images.length} image{images.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <ImageGrid 
              images={images} 
              selectedImageId={selectedImage?.id ?? null} 
              onSelectImage={setSelectedImage} 
              onDeleteImage={handleDeleteImage} 
            />
          </div>

          {/* Map view of all pins when nothing is selected */}
          {!selectedImage && images.some(img => img.latitude != null) && (
            <MapView 
              images={images} 
              selectedImage={null} 
              onSelectImage={setSelectedImage} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
