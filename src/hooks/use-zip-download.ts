"use client";

import JSZip from "jszip";

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
    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = zipName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
  };

  return { downloadZip };
};