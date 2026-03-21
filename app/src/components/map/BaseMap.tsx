import { useRef, useCallback, type ReactNode } from "react";
import Map, {
  NavigationControl,
  ScaleControl,
  type MapRef,
  type ViewStateChangeEvent,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const DEFAULT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

const DEFAULT_VIEW: MapViewState = {
  longitude: 133.7751, // Australia center
  latitude: -25.2744,
  zoom: 4,
};

export interface BaseMapProps {
  /** Controlled view state — sets map position every render */
  viewState?: MapViewState;
  /** Uncontrolled initial view state — sets position only on mount */
  initialViewState?: MapViewState;
  onMove?: (viewState: MapViewState) => void;
  onClick?: (e: MapLayerMouseEvent) => void;
  onContextMenu?: (e: MapLayerMouseEvent) => void;
  styleUrl?: string;
  cursor?: string;
  children?: ReactNode;
}

export function BaseMap({
  viewState,
  initialViewState,
  onMove,
  onClick,
  onContextMenu,
  styleUrl = DEFAULT_STYLE,
  cursor = "crosshair",
  children,
}: BaseMapProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      onMove?.(e.viewState);
    },
    [onMove],
  );

  // Use controlled mode if viewState is provided, otherwise uncontrolled
  const viewProps = viewState
    ? viewState
    : { initialViewState: initialViewState ?? DEFAULT_VIEW };

  return (
    <Map
      ref={mapRef}
      {...viewProps}
      onMove={handleMove}
      onClick={onClick}
      onContextMenu={onContextMenu}
      mapStyle={styleUrl}
      cursor={cursor}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" />
      {children}
    </Map>
  );
}

export { type MapRef };
