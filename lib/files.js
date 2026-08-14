export const MAX_INLINE_BYTES = 900 * 1024; // keep localStorage sane

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fileExt(name) {
  const m = name.split(".");
  return m.length > 1 ? m.at(-1).toUpperCase() : "FILE";
}

// Reads a FileList, calling addFile(meta) for each — either full metadata
// with a data URL, or a too-large stub with just a note.
export function ingestFiles(fileList, addFile, extraMeta = {}) {
  Array.from(fileList).forEach((file) => {
    if (file.size > MAX_INLINE_BYTES) {
      addFile({
        name: file.name,
        size: file.size,
        type: file.type || "unknown",
        note: "Too large to store in-browser — metadata only",
        ...extraMeta,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addFile({
        name: file.name,
        size: file.size,
        type: file.type || "unknown",
        dataUrl: reader.result,
        ...extraMeta,
      });
    };
    reader.readAsDataURL(file);
  });
}
