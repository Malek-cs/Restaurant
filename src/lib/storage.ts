import { promises as fs } from "fs";
import path from "path";

// الحد الأقصى للصورة (5 ميجابايت)
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// دالة فحص الملف مطابقة لما يتوقعه route.ts (ترجع الامتداد)
export function sniffImage(buffer: Buffer): { extension: string } | null {
  const header = buffer.toString("hex", 0, 4);
  
  if (header.startsWith("89504e47")) return { extension: "png" };
  if (header.startsWith("ffd8ff")) return { extension: "jpg" };
  if (header.startsWith("47494638")) return { extension: "gif" };
  if (header.startsWith("52494646")) return { extension: "webp" };
   
  return null; // إذا لم تكن الصورة مدعومة
}

// دالة التخزين مطابقة لمتطلبات route.ts بوجود دالة put
export function getStorage() {
  return {
    async put({ buffer, extension }: { buffer: Buffer; extension: string }) {
      try {
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
        
        // مسار الحفظ النهائي في public/storage ليتمكن المتصفح من قراءتها
        const storageDir = path.join(process.cwd(), "public", "storage");
        
        // إنشاء المجلد إذا لم يكن موجوداً
        await fs.mkdir(storageDir, { recursive: true });
        
        // حفظ الصورة
        const filepath = path.join(storageDir, uniqueFilename);
        await fs.writeFile(filepath, buffer);
        
        // إرجاع الـ key والـ url كما يطلبها ملف route.ts تماماً
        return {
          key: uniqueFilename,
          url: `/storage/${uniqueFilename}`
        };
      } catch (error) {
        console.error("Error writing file in storage.ts:", error);
        throw new Error("Could not save the file locally.");
      }
    },
    
    async delete(key: string) {
      try {
        const filepath = path.join(process.cwd(), "public", "storage", key);
        await fs.unlink(filepath);
      } catch (e) {
        console.error("Error deleting file:", e);
      }
    }
  };
}