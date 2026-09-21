import { apiRoute } from "@/lib/api/handler";
import { getStorage, MAX_UPLOAD_BYTES, sniffImage } from "@/lib/storage";
import { ApiError, unprocessable } from "@/lib/api/errors";

export const POST = apiRoute(
  { permission: ["menu:manage", "categories:manage", "settings:manage"], rateLimit: { key: "upload", limit: 60, windowMs: 60 * 60_000 } },
  async ({ req, user, audit }) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw unprocessable("Choose an image to upload.", { file: "No file received" });
    if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Images must be 5 MB or smaller.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buffer);
    if (!kind) throw unprocessable("Only JPEG, PNG or WebP images are supported.", { file: "Unsupported image type" });
    const stored = await getStorage().put({ buffer, extension: kind.extension });
    await audit({ action: "upload.created", entity: "File", entityId: stored.key, summary: `${user.name} uploaded an image.` });
    return { url: stored.url };
  },
);
