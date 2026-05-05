type AnyRecord = Record<string, any>;

function createChainable<T extends AnyRecord = AnyRecord>(extras: T = {} as T): T {
  const obj: AnyRecord = {
    addTo: () => obj,
    remove: () => undefined,
    removeFrom: () => obj,
    clearLayers: () => obj,
    eachLayer: () => obj,
    bringToFront: () => obj,
    setStyle: () => obj,
    bindTooltip: () => obj,
    openTooltip: () => obj,
    closeTooltip: () => obj,
    on: () => obj,
    off: () => obj,
    ...extras,
  };
  return obj as T;
}

const L = {
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: () => undefined,
    },
  },
  map: () =>
    createChainable({
      invalidateSize: () => undefined,
      fitBounds: () => undefined,
      setView: () => undefined,
      getZoom: () => 0,
      getCenter: () => ({ lat: 0, lng: 0 }),
    }),
  latLngBounds: () => ({}),
  control: {
    zoom: () => createChainable(),
  },
  tileLayer: () => createChainable(),
  layerGroup: () => createChainable(),
  geoJSON: () => createChainable(),
  circleMarker: () => createChainable(),
} as const;

export default L;

