import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";

/**
 * 照片儲存
 * - 有 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY：上傳到 Supabase Storage（公開 bucket）
 * - 否則存在本機 .data/uploads，由 /media/... 提供
 */

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "public-media";
  return url && key ? { url, key, bucket } : null;
}

export class InvalidImageError extends Error {
  constructor() {
    super("不是有效的圖片檔。");
  }
}

export function validateImage(file: File | null): string | null {
  if (!file || file.size === 0) return "請選擇一張圖片。";
  if (!TYPES[file.type]) return "只接受 JPG、PNG 或 WebP 圖片。";
  if (file.size > MAX_IMAGE_BYTES) return "圖片太大了，請小於 5MB。";
  return null;
}

/** 依檔案開頭的位元組判斷真正的格式（不相信瀏覽器宣稱的 MIME type） */
function sniff(bytes: Buffer): keyof typeof TYPES | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function saveImage(file: File, folder: "photos" | "hero"): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new InvalidImageError();
  const ext = TYPES[type];
  const key = `${folder}/${Date.now()}-${randomToken(9)}.${ext}`;
  const sb = supabase();
  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sb.key}`,
        apikey: sb.key,
        "Content-Type": type,
        "Cache-Control": "31536000",
      },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Supabase Storage 上傳失敗：${res.status} ${await res.text()}`);
    return `${sb.url}/storage/v1/object/public/${sb.bucket}/${key}`;
  }
  const dest = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  return `/media/${key}`;
}

/** 盡力刪除舊圖，失敗不影響流程 */
export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  try {
    const sb = supabase();
    if (sb && url.startsWith(`${sb.url}/storage/v1/object/public/${sb.bucket}/`)) {
      const key = url.slice(`${sb.url}/storage/v1/object/public/${sb.bucket}/`.length);
      await fetch(`${sb.url}/storage/v1/object/${sb.bucket}/${key}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sb.key}`, apikey: sb.key },
      });
    } else if (url.startsWith("/media/")) {
      const file = path.join(LOCAL_UPLOAD_DIR, url.slice("/media/".length));
      if (file.startsWith(LOCAL_UPLOAD_DIR)) await fs.unlink(file);
    }
  } catch {
    // ignore
  }
}
