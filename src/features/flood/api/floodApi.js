import { fetcher } from "@/services/apiClient/fetcher";
import { withQuery } from "@/services/apiClient/request";
import { serviceFloodPath } from "@/constant/serviceData";

export function getFloodOverview(options = {}) {
  return fetcher(`${serviceFloodPath}/overview`, options);
}

export function getFloodLegends(options = {}) {
  return fetcher(`${serviceFloodPath}/legends`, options);
}

export function getFloodLayers(params = {}, options = {}) {
  return fetcher(withQuery(`${serviceFloodPath}/layers`, params), options);
}

export function getFloodRuns(params = {}, options = {}) {
  return fetcher(withQuery(`${serviceFloodPath}/runs`, params), options);
}
