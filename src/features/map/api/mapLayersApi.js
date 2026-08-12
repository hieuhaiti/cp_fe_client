// Compatibility entry point for feature code. Keep all Web Map requests in the
// shared service so they continue to follow the Postman collection contract.
export {
  getMapBasemaps,
  getMapFeature,
  getMapLayerLegend,
  getMapLayers,
  getMapTerrain,
  getMapTerrainUrl,
  searchMapFeatures,
  useGetMapBasemapsQuery,
  useGetMapLayersQuery,
  useSearchMapFeaturesQuery,
} from "@/services/mapLayersService";
