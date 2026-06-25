// Google Maps API type declarations
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latlng: LatLngLiteral): void;
      setZoom(zoom: number): void;
      panTo(latlng: LatLngLiteral): void;
      fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
      getZoom(): number;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setAnimation(animation: Animation | null): void;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      getPosition(): LatLng | null;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      setContent(content: string | Node): void;
      open(map?: Map, anchor?: Marker): void;
      close(): void;
    }

    class LatLngBounds {
      constructor(sw?: LatLngLiteral, ne?: LatLngLiteral);
      extend(point: LatLngLiteral): LatLngBounds;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
    }

    enum Animation {
      BOUNCE = 1,
      DROP = 2,
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      styles?: MapTypeStyle[];
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      backgroundColor?: string;
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      icon?: string | Icon | Symbol;
      title?: string;
      animation?: Animation;
      zIndex?: number;
    }

    interface InfoWindowOptions {
      content?: string | Node;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface Padding {
      top: number;
      bottom: number;
      left: number;
      right: number;
    }

    interface Icon {
      url: string;
      scaledSize?: Size;
      anchor?: Point;
    }

    interface Symbol {
      path: string;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
      scale?: number;
      anchor?: Point;
    }

    interface MapTypeStyle {
      elementType?: string;
      featureType?: string;
      stylers: MapTypeStyler[];
    }

    interface MapTypeStyler {
      color?: string;
      visibility?: string;
      weight?: number;
    }

    class Size {
      constructor(width: number, height: number);
      width: number;
      height: number;
    }

    interface MapsEventListener {
      remove(): void;
    }
  }
}

interface Window {
  google?: typeof google;
}
