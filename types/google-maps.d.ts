declare global {
  interface Window {
    google: typeof google;
  }

  namespace google {
    namespace maps {
      class Map {
        constructor(mapDiv: Element | null, options: any);
        panTo(latLng: LatLng | LatLngLiteral): void;
        setZoom(zoom: number): void;
        setCenter(latlng: LatLng | LatLngLiteral): void;
        getZoom(): number;
        getCenter(): LatLng;
      }

      class Marker {
        constructor(options: any);
        setMap(map: Map | null): void;
        getPosition(): LatLng;
        addListener(eventName: string, handler: Function): void;
        setTitle(title: string): void;
        getTitle(): string;
      }

      class InfoWindow {
        constructor(options: any);
        open(map: Map, marker?: Marker): void;
        close(): void;
        setContent(content: string | Element): void;
      }

      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }

      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      interface Icon {
        url?: string;
        path?: any;
        fillColor?: string;
        fillOpacity?: number;
        strokeColor?: string;
        strokeWeight?: number;
        scale?: number;
        scaledSize?: Size;
        size?: Size;
        origin?: Point;
        anchor?: Point;
      }

      interface Point {
        x: number;
        y: number;
      }

      class Size {
        constructor(width: number, height: number);
      }

      namespace SymbolPath {
        const CIRCLE: any;
        const FORWARD_CLOSED_ARROW: any;
        const FORWARD_OPEN_ARROW: any;
        const BACKWARD_CLOSED_ARROW: any;
        const BACKWARD_OPEN_ARROW: any;
      }
    }
  }
}

export {};