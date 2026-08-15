import { fetcher } from "@/services/apiClient/fetcher";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const STATISTICS_PATH = "/statistics";

/** GET /statistics/sources */
export function getStatisticsSources() {
  return fetcher(`${STATISTICS_PATH}/sources`);
}

/** GET /statistics/areas?type=&year= */
export function getStatisticsAreas({ type, year } = {}) {
  return fetcher(withQuery(`${STATISTICS_PATH}/areas`, { type, year }));
}

export function useGetStatisticsAreasQuery(params = {}, options = {}) {
  return useApiQuery(
    ["statistics", "areas", params],
    withQuery(`${STATISTICS_PATH}/areas`, params),
    options,
  );
}

/** GET /statistics/compare?beforeSourceId=&afterSourceId= */
export function compareStatistics(beforeSourceId, afterSourceId) {
  return fetcher(
    withQuery(`${STATISTICS_PATH}/compare`, { beforeSourceId, afterSourceId }),
  );
}
