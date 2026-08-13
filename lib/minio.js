import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

// Configuración del cliente S3 (MinIO compatible)
const s3Client = new S3Client({
  endpoint: `http${process.env.MINIO_USE_SSL === "true" ? "s" : ""}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  region: "us-east-1", // MinIO no usa regiones, pero el SDK lo requiere
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Necesario para MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "sizing-images";

/**
 * Verifica si el bucket existe, si no lo crea
 */
export async function ensureBucketExists() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Bucket ${BUCKET_NAME} existe`);
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      console.log(`Creando bucket ${BUCKET_NAME}...`);
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`Bucket ${BUCKET_NAME} creado exitosamente`);
    } else {
      throw error;
    }
  }
}

/**
 * Sube un archivo a MinIO
 * @param {Buffer} fileBuffer - El contenido del archivo
 * @param {string} filename - Nombre del archivo (con extensión)
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folder - Carpeta dentro del bucket (opcional)
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadFile(fileBuffer, filename, mimeType, folder = "categories") {
  await ensureBucketExists();

  // Generar nombre único para evitar colisiones
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = filename.split(".").pop();
  const key = `${folder}/${timestamp}-${randomStr}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Construir URL pública
  const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${key}`;

  return {
    url: publicUrl,
    key: key,
    filename: `${timestamp}-${randomStr}.${extension}`,
  };
}

/**
 * Elimina un archivo de MinIO
 * @param {string} key - La key del archivo (path dentro del bucket)
 */
export async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Extrae la key de una URL de MinIO
 * @param {string} url - URL completa del archivo
 * @returns {string} - Key del archivo
 */
export function getKeyFromUrl(url) {
  const bucketPath = `/${BUCKET_NAME}/`;
  const index = url.indexOf(bucketPath);
  if (index !== -1) {
    return url.substring(index + bucketPath.length);
  }
  return url;
}

export { s3Client, BUCKET_NAME };
