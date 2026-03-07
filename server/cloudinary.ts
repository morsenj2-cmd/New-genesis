import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadBase64Image(
  base64DataUrl: string,
  folder: string,
  publicId?: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(base64DataUrl, {
    folder: `morse/${folder}`,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    transformation: [{ width: 256, height: 256, crop: "limit", quality: "auto" }],
  });
  return result.secure_url;
}

export async function uploadBase64Font(
  base64DataUrl: string,
  folder: string,
  publicId?: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(base64DataUrl, {
    folder: `morse/${folder}`,
    public_id: publicId,
    overwrite: true,
    resource_type: "raw",
  });
  return result.secure_url;
}

export async function deleteFile(publicId: string, resourceType: "image" | "raw" = "image"): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export { cloudinary };
