import { create } from "zustand";
import { defaultStyle, stateTerrainRender } from "@/constant/mapData";

const SATELLITE_STYLE = import.meta.env.VITE_MAPBOX_STYLE_Satellite;

export const useMapStyleStore = create((set, get) => ({
  mapStyle: defaultStyle,
  terrainState: stateTerrainRender,
  terrainSupported: true,
  terrainLoading: false,
  clickedPointMode: false,
  previousStyle: null,
  previousTerrainSupported: null,

  setMapStyle: (style, { terrainSupported = true } = {}) => {
    const { clickedPointMode } = get();
    if (clickedPointMode) return;
    set({
      mapStyle: style,
      terrainSupported,
      terrainState: terrainSupported ? get().terrainState : false,
    });
  },
  setTerrainState: (style) => {
    if (!get().terrainSupported) return;
    const nextTerrainState = style === true;
    set({ terrainState: nextTerrainState });
  },
  setTerrainLoading: (loading) => set({ terrainLoading: loading === true }),

  // Toggle clickedPointMode - auto switch to Satellite style
  toggleClickedPointMode: () => {
    const { clickedPointMode, mapStyle, terrainSupported } = get();

    if (!clickedPointMode) {
      set({
        clickedPointMode: true,
        previousStyle: mapStyle,
        previousTerrainSupported: terrainSupported,
        mapStyle: SATELLITE_STYLE,
        terrainSupported: true,
      });
    } else {
      const { previousStyle, previousTerrainSupported } = get();
      set({
        clickedPointMode: false,
        mapStyle: previousStyle || defaultStyle,
        previousStyle: null,
        terrainSupported: previousTerrainSupported ?? true,
        previousTerrainSupported: null,
      });
    }
  },

  setClickedPointMode: (mode) => {
    const { mapStyle, terrainSupported } = get();
    if (mode) {
      set({
        clickedPointMode: true,
        previousStyle: mapStyle,
        previousTerrainSupported: terrainSupported,
        mapStyle: SATELLITE_STYLE,
        terrainSupported: true,
      });
    } else {
      const { previousStyle, previousTerrainSupported } = get();
      set({
        clickedPointMode: false,
        mapStyle: previousStyle || defaultStyle,
        previousStyle: null,
        terrainSupported: previousTerrainSupported ?? true,
        previousTerrainSupported: null,
      });
    }
  },
}));
