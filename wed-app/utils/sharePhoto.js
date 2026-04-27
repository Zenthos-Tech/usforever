import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function sharePhotoFromS3(url) {
  try {
    if (!url) return;

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      alert("Sharing not available on this device");
      return;
    }

    const fileName = `photo_${Date.now()}.jpg`;
    const localPath = FileSystem.cacheDirectory + fileName;

    // Remove old file if exists
    await FileSystem.deleteAsync(localPath, { idempotent: true });

    // Download from S3
    const { uri } = await FileSystem.downloadAsync(url, localPath);

    // Open share sheet
    await Sharing.shareAsync(uri, {
      mimeType: "image/jpeg",
      dialogTitle: "Share Photo",
      UTI: "public.jpeg",
    });

  } catch (error) {
    console.log("Share error:", error);
    alert("Error while sharing photo");
  }
}
