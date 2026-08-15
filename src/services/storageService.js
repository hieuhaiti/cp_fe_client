import { mutater } from "@/services/apiClient/mutater";

const STORAGE_PATH = "/storage";

/**
 * Implements the storage flow from the Postman collection: obtain a presigned
 * URL, PUT the file bytes, then commit the resulting object.
 */
export async function uploadFile(file, category) {
  const presignResponse = await mutater(
    `${STORAGE_PATH}/uploads/presign`,
    "POST",
    {
      category,
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      expireSeconds: 900,
    },
  );
  const presign = presignResponse?.data || presignResponse;
  const { uploadUrl, id } = presign || {};

  if (!uploadUrl || id === undefined || id === null) {
    throw new Error("Máy chủ không trả về URL hoặc mã đối tượng để tải tệp lên.");
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: file.type ? { "Content-Type": file.type } : undefined,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Tải tệp lên thất bại (${response.status}).`);
  }

  await mutater(
    `${STORAGE_PATH}/uploads/${encodeURIComponent(String(id))}/commit`,
    "POST",
  );
  return id;
}
