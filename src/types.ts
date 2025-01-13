import type {
  CompositeLayer, DeckProps, Layer, 
  FirstPersonView,
  _GlobeView as GlobeView,
  MapView,
  OrthographicView,
  OrbitView,
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
import type { PropsWithChildren, ReactNode } from "react";
import type { Store } from "./store";

export type Container = { store: Store };

export type HostContext = { store: Store };

export type Node = Layer | CompositeLayer | View;

export type Instance = { node: Node; children: Instance[] };

export type ChildSet = Instance[];

export type TimeoutHandle = number;

export type UpdatePayload = null;

export type CanvasElement = HTMLCanvasElement;

export type ViewOrViews = View | View[] | null;

export type DeckGLProps<ViewsT extends ViewOrViews = null> = PropsWithChildren<Omit<
  DeckProps<ViewsT>,
  "width" | "height" | "gl" | "parent" | "canvas" | "_customRender"
> & {
  width?: string | number;
  height?: string | number;
}>;

export type ReconcilerRoot = {
  render: (element: ReactNode) => void;
  configure: (props: DeckGLProps) => void;
  unmount: () => void;
};

export type ExtractLayerProps<T> = T extends Layer<infer P> ? P : never;

export type ExtractViewProps<T> = T extends View<any, infer P> ? P : never;

export type LayerFactoryProps<L extends Layer = Layer> = {
  layer: new (props: ExtractLayerProps<L>) => L;
  props: ExtractLayerProps<L>
}

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

  //
  layerFactory: LayerFactoryProps
}

export type Type = keyof DeckglElements;

export type Props = PropsWithChildren<DeckglElements[Type]>;

declare global {
  namespace React {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
      // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
      interface IntrinsicElements extends DeckglElements {}
    }
  }
}
