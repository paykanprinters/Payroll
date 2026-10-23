import { Capacitor } from "@capacitor/core";

export type BlobDownloadMethod = "native-saved" | "native-share" | "web-share" | "web-anchor";

export const NATIVE_DOWNLOAD_FOLDER = "Kan Printers";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  csv: "text/csv",
  json: "application/json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function resolveMimeType(filename: string, mimeType: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? mimeType;
}

/**
 * Writes to the public Documents/Kan Printers folder so the file shows in the Files app.
 * Falls back to a timestamped name when an older copy exists that this install can't overwrite.
 */
async function saveToDocuments(safeName: string, base64: string): Promise<string> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");

  const perms = await Filesystem.checkPermissions();
  if (perms.publicStorage !== "granted") {
    const requested = await Filesystem.requestPermissions();
    if (requested.publicStorage !== "granted") throw new Error("Storage permission denied");
  }

  const write = (name: string) =>
    Filesystem.writeFile({
      path: `${NATIVE_DOWNLOAD_FOLDER}/${name}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

  try {
    return (await write(safeName)).uri;
  } catch {
    const dot = safeName.lastIndexOf(".");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fallbackName =
      dot > 0 ? `${safeName.slice(0, dot)}_${stamp}${safeName.slice(dot)}` : `${safeName}_${stamp}`;
    return (await write(fallbackName)).uri;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/** Safe filename for mobile filesystems and share intents. */
export function sanitizeDownloadFilename(filename: string): string {
  const trimmed = filename.trim() || "download";
  // Intentionally strips control characters (\u0000-\u001f) from filenames.
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "_");
}

/**
 * iOS Safari has no real downloads folder, so the share sheet ("Save to Files")
 * is the best option there. Android browsers and desktops download normally;
 * on Android the share sheet only offers messaging apps, not saving.
 */
function shouldUseWebShare(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined" || !navigator.share) {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isMobileUa = /iPhone|iPad|iPod/i.test(ua);
  // iPadOS reports as desktop Safari but exposes touch points.
  const isTouchTablet =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return isMobileUa || isTouchTablet;
}

/**
 * Save a blob on device. In the native app, saves to Documents/Kan Printers and
 * opens it in the phone's viewer (older APKs without the opener use the share
 * sheet). On web, iOS uses the Web Share API; everything else gets a download link.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<BlobDownloadMethod> {
  const safeName = sanitizeDownloadFilename(filename);

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);

    if (Capacitor.isPluginAvailable("FileOpener")) {
      const savedUri = await saveToDocuments(safeName, base64).catch(() => null);
      if (savedUri) {
        try {
          const { FileOpener } = await import("@capacitor-community/file-opener");
          await FileOpener.open({
            filePath: savedUri,
            contentType: resolveMimeType(safeName, mimeType),
            openWithDefault: true,
          });
        } catch {
          // No viewer for this file type; it is still saved in Documents.
        }
        return "native-saved";
      }
    }

    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const written = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: safeName,
      url: written.uri,
      dialogTitle: "Save payslip",
    });
    return "native-share";
  }

  if (shouldUseWebShare()) {
    try {
      const file = new File([blob], safeName, { type: mimeType });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: safeName });
        return "web-share";
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        throw err;
      }
      // Fall through to anchor download.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return "web-anchor";
}

export function downloadSuccessMessage(filename: string, method: BlobDownloadMethod): string {
  switch (method) {
    case "native-saved":
      return `${filename} saved to Documents/${NATIVE_DOWNLOAD_FOLDER}.`;
    case "native-share":
    case "web-share":
      return `Choose where to save ${filename}.`;
    default:
      return `${filename} downloaded successfully!`;
  }
}
