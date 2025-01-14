import { BitmapLayer } from "@deck.gl/layers";
import { randomPoint } from "@turf/random";
import { StrictMode, useEffect, useRef, useState, memo } from "react";
import { createRoot } from "react-dom/client";
import { Map as MapLibre } from "maplibre-gl";
import { Deckgl } from "./src/index";

import "./global.css";
import "maplibre-gl/dist/maplibre-gl.css";

deck.log.enable();
deck.log.level = 0;

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
        {/* <Basemap /> */}
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
    <>
      <Deckgl
        getTooltip={getTooltip}
        initialViewState={INITIAL_VIEW_STATE}
        controller
        interleaved
        onConfigure={({ deckgl }) => {
          // NOTE: we can technically instantiate this outside of React as well
          const map = new MapLibre({
            container: "root",
            style:
              "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
            zoom: INITIAL_VIEW_STATE.zoom,
          });

          map.addControl(deckgl);
          // map.setProjection({ type: "globe" });
        }}
      >
        <Layers />
      </Deckgl>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
