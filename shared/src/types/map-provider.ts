export interface MapProvider {
  id: string;
  name: string;
  type: "raster" | "vector";
  attribution: string;
  layers: MapLayer[];
}

export interface MapLayer {
  id: string;
  name: string;
  category: "base" | "overlay";
  style: RasterTileSource | VectorTileSource | StyleURL;
  minZoom?: number;
  maxZoom?: number;
  offlineCapable: boolean;
}

export type RasterTileSource = {
  type: "raster";
  tileUrl: string;
  tileSize: 256 | 512;
};

export type VectorTileSource = {
  type: "vector";
  styleUrl: string;
};

export type StyleURL = {
  type: "style";
  url: string;
};
