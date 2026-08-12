import { fetcher } from "@/services/apiClient/fetcher";
import { withQuery } from "@/services/apiClient/request";
import { useApiQuery } from "@/services/apiClient/useApi";

const REMOTE_SENSING_PATH = "/remote-sensing";
const IMAGES_PATH = `${REMOTE_SENSING_PATH}/images`;

/** GET /remote-sensing/images?page=&limit= */
export function getRemoteSensingImages({ page = 1, limit = 20 } = {}) {
  return fetcher(withQuery(IMAGES_PATH, { page, limit }));
}

export function useGetRemoteSensingImagesQuery(params = {}, options = {}) {
  const query = { page: 1, limit: 20, ...params };
  return useApiQuery(
    ["remote-sensing", "images", query],
    withQuery(IMAGES_PATH, query),
    options,
  );
}

/** GET /remote-sensing/images/:satelliteImageId */
export function getRemoteSensingImage(imageId) {
  return fetcher(`${IMAGES_PATH}/${encodeURIComponent(imageId)}`);
}

export function useGetRemoteSensingImageQuery(imageId, options = {}) {
  return useApiQuery(
    ["remote-sensing", "images", imageId],
    `${IMAGES_PATH}/${encodeURIComponent(imageId)}`,
    { enabled: Boolean(imageId), ...options },
  );
}

/** GET /remote-sensing/compare?beforeId=&afterId= */
export function compareRemoteSensingImages(beforeId, afterId) {
  return fetcher(
    withQuery(`${REMOTE_SENSING_PATH}/compare`, { beforeId, afterId }),
  );
}

/** GET /remote-sensing/images/:satelliteImageId/download-url?expireSeconds= */
export function getRemoteSensingDownloadUrl(imageId, expireSeconds = 300) {
  return fetcher(
    withQuery(`${IMAGES_PATH}/${encodeURIComponent(imageId)}/download-url`, {
      expireSeconds,
    }),
  );
}
