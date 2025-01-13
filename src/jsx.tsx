import type {
  MapView,
  OrthographicView,
  OrbitView,
  FirstPersonView,
  _GlobeView as GlobeView,
  View,
} from "@deck.gl/core";
import type { DataFilterExtensionProps } from "@deck.gl/extensions";
import type {
  S2LayerProps,
  QuadkeyLayerProps,
  TileLayerProps,
  H3ClusterLayerProps,
  H3HexagonLayerProps,
  Tile3DLayerProps,
  TerrainLayerProps,
  MVTLayerProps,
  _Tile2DHeader,
} from "@deck.gl/geo-layers";
import type {
  ArcLayerProps,
  BitmapLayerProps,
  IconLayerProps,
  LineLayerProps,
  PointCloudLayerProps,
  ScatterplotLayerProps,
  ColumnLayerProps,
  GridCellLayerProps,
  PathLayerProps,
  PolygonLayerProps,
  GeoJsonLayerProps,
  TextLayerProps,
  SolidPolygonLayerProps,
} from "@deck.gl/layers";

type ExtractViewProps<T> = T extends View<any, infer P> ? P : never;

// TODO: allow for `children` type for React children
export interface DeckglElements {
  // @deck.gl/core
  mapView: ExtractViewProps<MapView>;
  orthographicView: ExtractViewProps<OrthographicView>;
  orbitView: ExtractViewProps<OrbitView>;
  firstPersonView: ExtractViewProps<FirstPersonView>;
  globeView: ExtractViewProps<GlobeView>;

  // @deck.gl/layers
  arcLayer: ArcLayerProps;
  bitmapLayer: BitmapLayerProps;
  iconLayer: IconLayerProps;
  lineLayer: LineLayerProps;
  pointCloudLayer: PointCloudLayerProps;
  scatterplotLayer: ScatterplotLayerProps;
  columnLayer: ColumnLayerProps;
  gridCellLayer: GridCellLayerProps;
  pathLayer: PathLayerProps;
  polygonLayer: PolygonLayerProps;
  geoJsonLayer: GeoJsonLayerProps;
  textLayer: TextLayerProps;
  solidPolygonLayer: SolidPolygonLayerProps;

  // @deck.gl/geo-layers
  s2Layer: S2LayerProps;
  quadkeyLayer: QuadkeyLayerProps;
  tileLayer: TileLayerProps;
  h3ClusterLayer: H3ClusterLayerProps;
  h3HexagonLayer: H3HexagonLayerProps;
  tile3DLayer: Tile3DLayerProps;
  terrainLayer: TerrainLayerProps;
  mVTLayer: MVTLayerProps & DataFilterExtensionProps;
}

declare global {
  namespace React {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
      // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
      interface IntrinsicElements extends DeckglElements {}
    }
  }
}
