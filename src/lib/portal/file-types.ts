/**
 * Upload allow-list. The stored MIME type always comes from this table
 * (by extension) — never from the browser — and uploaded bytes are checked
 * against the expected file signature before a document is created.
 */
export type FileKind = { ext: string; mime: string; label: string; magic?: number[][]; text?: boolean; previewable?: 'pdf' | 'image' };

export const FILE_TYPES: FileKind[] = [
  { ext: 'pdf', mime: 'application/pdf', label: 'PDF', magic: [[0x25, 0x50, 0x44, 0x46]], previewable: 'pdf' },
  { ext: 'doc', mime: 'application/msword', label: 'Word', magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  { ext: 'xls', mime: 'application/vnd.ms-excel', label: 'Excel', magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  { ext: 'csv', mime: 'text/csv', label: 'CSV', text: true },
  { ext: 'png', mime: 'image/png', label: 'Image', magic: [[0x89, 0x50, 0x4e, 0x47]], previewable: 'image' },
  { ext: 'jpg', mime: 'image/jpeg', label: 'Image', magic: [[0xff, 0xd8, 0xff]], previewable: 'image' },
  { ext: 'jpeg', mime: 'image/jpeg', label: 'Image', magic: [[0xff, 0xd8, 0xff]], previewable: 'image' },
  { ext: 'zip', mime: 'application/zip', label: 'ZIP', magic: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]] },
];

export const ACCEPT_ATTR = FILE_TYPES.map((t) => `.${t.ext}`).join(',');

export function fileKindFor(fileName: string): FileKind | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  return FILE_TYPES.find((t) => t.ext === ext) ?? null;
}

export function matchesSignature(kind: FileKind, head: Uint8Array): boolean {
  if (kind.text) {
    // Plain text: reject binary content (NUL bytes) in the sampled header.
    return !head.includes(0);
  }
  return (kind.magic ?? []).some((sig) => sig.every((b, i) => head[i] === b));
}

/** Filesystem/URL-safe version of a user-supplied file name (keeps the extension). */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .slice(-120);
  return cleaned || 'file';
}
