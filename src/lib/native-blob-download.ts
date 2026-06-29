import { Capacitor } from "@capacitor/core";

export type BlobDownloadMethod = "native-share" | "web-share" | "web-anchor";

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
  return trimmed.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "_");
}

/**
 * The Web Share API is desirable on phones/tablets (it offers "Save to Files",
 * messaging apps, etc.), but on desktop browsers it pops the OS share sheet
 * instead of a plain download. We only opt into web-share on touch mobile
 * devices so desktop users get a straightforward file download.
 */
function shouldUseWebShare(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined" || !navigator.share) {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isMobileUa = /Android|iPhone|iPad|iPod/i.test(ua);
  // iPadOS reports as desktop Safari but exposes touch points.
  const isTouchTablet =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return isMobileUa || isTouchTablet;
}

/**
 * Save a blob on device. On Capacitor native shells, writes to cache and opens
 * the system share sheet (Save to Files / Drive / open in PDF viewer). On web,
 * uses the Web Share API when available, otherwise a download link.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<BlobDownloadMethod> {
  const safeName = sanitizeDownloadFilename(filename);

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    const base64 = await blobToBase64(blob);
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
    case "native-share":
    case "web-share":
      return `Choose where to save ${filename}.`;
    default:
      return `${filename} downloaded successfully!`;
  }
}
