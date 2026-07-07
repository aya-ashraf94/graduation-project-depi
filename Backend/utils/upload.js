const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

const isCloudinaryConfigured = () => {
  return process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET;
};

const saveBase64ImageLocally = (base64Str, subfolder = "uploads") => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http") || base64Str.startsWith("/uploads")) return base64Str;

  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 image format");
  }

  const mimeType = matches[1].toLowerCase();
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("Disallowed file type: " + mimeType);
  }

  let extension = mimeType.split("/")[1];
  if (extension === "svg+xml") extension = "svg";

  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const uploadDir = path.join(__dirname, "../public", subfolder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);
  return `/${subfolder === "uploads" ? "uploads" : subfolder}/${fileName}`;
};

const uploadBase64ToCloudinary = async (base64Str, folder = "nafa3ni-products") => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http")) return base64Str;
  if (!isCloudinaryConfigured()) return saveBase64ImageLocally(base64Str, folder === "nafa3ni-avatars" ? "uploads" : "uploads");
  const result = await cloudinary.uploader.upload(base64Str, { folder });
  return result.secure_url;
};

module.exports = { uploadBase64ToCloudinary, saveBase64ImageLocally, isCloudinaryConfigured };
