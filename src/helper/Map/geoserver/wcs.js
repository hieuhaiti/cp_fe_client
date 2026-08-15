import { buildMapProxyWcsUrl } from "./mapProxy";

/**
 * WCS is served only through the application proxy. The current API exposes
 * the complete coverage; spatial subset parameters are intentionally ignored.
 */
export const buildWcsCoverageUrl = async (layer) => buildMapProxyWcsUrl(layer);
