import { StrictMode, useEffect, useRef, useState, memo } from "react";
import { createRoot } from "react-dom/client";
import { randomPoint } from "@turf/random";
import { Deckgl } from "./src/index";
// import "./src/jsx";
import "./global.css";

import { BitmapLayer } from "@deck.gl/layers";

deck.log.enable();
deck.log.level = 0;

const URLS = [
  "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
];

export function Basemap() {
  return (
    <tileLayer
      id="basemap"
      data={URLS}
      renderSubLayers={(props) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile;

        return new BitmapLayer(props, {
          data: null,
          image: props.tile.data,
          bounds: [west, south, east, north],
        });
      }}
    />
  );
}

function Test({ children, id }) {
  return (
    <scatterplotLayer
      id={`test-${id}`}
      data={generateData()}
      getFillColor={[255, 0, 255, 255]}
      getPosition={(f) => f.geometry.coordinates}
      getRadius={4}
      radiusUnits="pixels"
      pickable
    >
      {children}
    </scatterplotLayer>
  );
}

function DeeplyNested() {
  return (
    <Test id="2">
      <Test id="3">
        <Test id="4">
          <scatterplotLayer
            id="deeply-nested"
            data={generateData()}
            getFillColor={[255, 255, 0, 255]}
            getPosition={(f) => f.geometry.coordinates}
            getRadius={4}
            radiusUnits="pixels"
            pickable
          />
        </Test>
      </Test>
    </Test>
  );
}

function generateData() {
  return randomPoint(1000).features;
}

function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const INITIAL_VIEW_STATE = {
  longitude: -77.0369,
  latitude: 38.9072,
  zoom: 4,
  minZoom: 1,
  maxZoom: 22,
  pitch: 0,
  bearing: 0,
};

const Layers = memo(() => {
  // Simulates polling data updates
  const [tick, setTick] = useState(0);

  useInterval(() => {
    setTick((prev) => prev + 1);
  }, 2000);

  // show/hide condition to check reconciler
  const shouldShow = tick % 3 === 0;

  return (
    <>
      <mapView id="main">
        <Basemap />
        <scatterplotLayer
          id="outer"
          data={generateData()}
          getFillColor={[255, 0, 0, 255]}
          getPosition={(f) => f.geometry.coordinates}
          getRadius={4}
          radiusUnits="pixels"
          visible={shouldShow}
          pickable
        />
        <Test id="1">
          {shouldShow && (
            <scatterplotLayer
              id="inner"
              data={generateData()}
              getFillColor={[255, 255, 0, 255]}
              getPosition={(f) => f.geometry.coordinates}
              getRadius={4}
              radiusUnits="pixels"
              pickable
            />
          )}
          <DeeplyNested />
        </Test>
      </mapView>
    </>
  );
});

function getTooltip({ object }) {
  return object && JSON.stringify(object, null, 2);
}

function App() {
  return (
    <Deckgl
      getTooltip={getTooltip}
      initialViewState={INITIAL_VIEW_STATE}
      controller
    >
      <Layers />
    </Deckgl>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
