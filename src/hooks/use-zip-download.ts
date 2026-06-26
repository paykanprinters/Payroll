"use client";

import JSZip from "jszip";
import { downloadBlob } from "@/lib/native-blob-download";

interface ZipFileEntry {
  filename: string;
  blob: Blob;
}

export const useZipDownload = () => {
  const downloadZip = async (files: ZipFileEntry[], zipName: string) => {
    const zip = new JSZip();
    files.forEach(({ filename, blob }) => {
      zip.file(filename, blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    await downloadBlob(zipBlob, zipName, "application/zip");
  };

  return { downloadZip };
};