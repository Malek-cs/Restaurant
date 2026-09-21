import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { getStorage, MIME_BY_EXT } from "@/lib/storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const key = segments.join("/");
  if (segments.some((s) => s === ".." || s.includes("\\") || s.startsWith("."))) return new NextResponse("Not found", { status: 404 });
  const ext = path.extname(key).slice(1).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });
  const buf = await getStorage().read(key);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
