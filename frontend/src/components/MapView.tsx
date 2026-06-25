import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { ImageMetadata } from '../types';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDcxtO1P8d553SNPPPCQnl1uyGqJrtyYrU';

interface MapViewProps {
  images: ImageMetadata[];
  selectedImage: ImageMetadata | null;
  onSelectImage: (image: ImageMetadata) => void;
}

// Load Google Maps script once
let googleMapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;
  if (window.google?.maps) return Promise.resolve();

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// Dark mode map styles
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d1426' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1426' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6a8a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#3a4a6a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f1b33' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#13203d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#4a5a7a' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#0c1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#162040' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1a2d54' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f3460' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#162040' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#4a5a7a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080e1e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a3a5a' }] },
];

export const MapView: React.FC<MapViewProps> = ({
  images,
  selectedImage,
  onSelectImage,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const isInitializedRef = useRef(false);

  // Create a stable reference for onSelectImage
  const onSelectImageRef = useRef(onSelectImage);
  onSelectImageRef.current = onSelectImage;

  // Initialize Google Map
  useEffect(() => {
    if (isInitializedRef.current) return;

    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        backgroundColor: '#0d1426',
      });

      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      isInitializedRef.current = true;
    }).catch(err => {
      console.error('Google Maps failed to load:', err);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Update markers when images or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Filter images with GPS coordinates
    const gpsImages = images.filter(
      (img) => img.latitude != null && img.longitude != null
    ) as (ImageMetadata & { latitude: number; longitude: number })[];

    const bounds = new google.maps.LatLngBounds();

    gpsImages.forEach((img) => {
      const isSelected = selectedImage?.id === img.id;
      const position = { lat: img.latitude, lng: img.longitude };
      bounds.extend(position);

      // Create custom SVG marker icon
      const pinColor = isSelected ? '#7f00ff' : '#00f2fe';
      const pinScale = isSelected ? 1.3 : 1.0;

      const svgIcon = {
        path: 'M12 0C7.31 0 3.5 3.81 3.5 8.5C3.5 14.88 12 24 12 24S20.5 14.88 20.5 8.5C20.5 3.81 16.69 0 12 0ZM12 11.5C10.34 11.5 9 10.16 9 8.5S10.34 5.5 12 5.5S15 6.84 15 8.5S13.66 11.5 12 11.5Z',
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: pinScale,
        anchor: new google.maps.Point(12, 24),
      };

      const marker = new google.maps.Marker({
        position,
        map,
        icon: svgIcon,
        title: img.filename,
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
        zIndex: isSelected ? 1000 : 1,
      });

      // Stop bounce after 2 seconds for selected marker
      if (isSelected) {
        setTimeout(() => marker.setAnimation(null), 2100);
      }

      // Info window content
      const contentString = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; padding: 4px 2px; color: #e0e0e0; background: #0f1b33; min-width: 160px;">
          <strong style="display:block; margin-bottom: 4px; color: #ffffff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${img.filename}</strong>
          ${img.camera_model ? `<span style="color: #7eb8c9; display:block; margin-bottom: 2px;">📷 ${img.camera_model}</span>` : ''}
          ${img.date_taken ? `<span style="color: #5a6a8a; display:block; font-size: 12px;">📅 ${new Date(img.date_taken).toLocaleDateString()}</span>` : ''}
          <span style="color: #5a6a8a; display:block; font-size: 11px; margin-top: 3px;">📍 ${img.latitude.toFixed(5)}, ${img.longitude.toFixed(5)}</span>
        </div>
      `;

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(map, marker);
        }
        onSelectImageRef.current(img);
      });

      // Auto-open info window for selected image
      if (isSelected && infoWindowRef.current) {
        infoWindowRef.current.setContent(contentString);
        infoWindowRef.current.open(map, marker);
      }

      markersRef.current.push(marker);
    });

    // Adjust map view
    if (selectedImage && selectedImage.latitude != null && selectedImage.longitude != null) {
      map.panTo({ lat: selectedImage.latitude, lng: selectedImage.longitude });
      map.setZoom(12);
    } else if (gpsImages.length > 1) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else if (gpsImages.length === 1) {
      map.setCenter({ lat: gpsImages[0].latitude, lng: gpsImages[0].longitude });
      map.setZoom(10);
    } else {
      map.setCenter({ lat: 20, lng: 0 });
      map.setZoom(2);
    }
  }, [images, selectedImage]);

  const hasGpsData = images.some((img) => img.latitude != null && img.longitude != null);

  return (
    <div className="glass-panel map-panel">
      <h3 className="map-title">
        <MapPin size={18} style={{ color: 'var(--accent-cyan)' }} /> GPS Locations
      </h3>
      <div className="map-wrapper" ref={mapContainerRef}>
        {!hasGpsData && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 15, 29, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            zIndex: 1000,
            textAlign: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div>
              <MapPin size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No GPS coordinates available in the current images.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
