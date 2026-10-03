import 'server-only';
import net from 'node:net';

/**
 * Malware scanning hook for uploads.
 *
 * With CLAMAV_HOST (and optional CLAMAV_PORT, default 3310) every upload is
 * streamed to a clamd daemon using the INSTREAM protocol before the document
 * is created; infected files are rejected and deleted. Without it, files are
 * recorded as "not_scanned" (the allow-list, size limit and signature check
 * still apply). Set CLAMAV_REQUIRED=1 to refuse uploads whenever the scanner
 * is unreachable. Serverless platforms can't run clamd themselves — point
 * CLAMAV_HOST at a small scanner service (e.g. a container on Fly/Render/EC2).
 */
export type ScanResult = { status: 'clean' | 'infected' | 'not_scanned' | 'error'; signature?: string };

export function scannerConfigured(): boolean {
  return Boolean(process.env.CLAMAV_HOST);
}

export async function scanBuffer(data: Buffer): Promise<ScanResult> {
  const host = process.env.CLAMAV_HOST;
  if (!host) return { status: 'not_scanned' };
  const port = Number(process.env.CLAMAV_PORT || 3310);
  return new Promise<ScanResult>((resolve) => {
    const socket = net.createConnection({ host, port });
    let reply = '';
    const done = (r: ScanResult) => {
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(30_000, () => done({ status: 'error', signature: 'timeout' }));
    socket.on('error', () => done({ status: 'error', signature: 'unreachable' }));
    socket.on('data', (d) => (reply += d.toString()));
    socket.on('end', () => {
      if (/OK\s*\0?$/.test(reply.trim())) done({ status: 'clean' });
      else if (/FOUND/.test(reply)) done({ status: 'infected', signature: reply.replace(/^stream:\s*/, '').replace(/\s*FOUND[\s\0]*$/, '') });
      else done({ status: 'error', signature: reply.slice(0, 120) });
    });
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let i = 0; i < data.length; i += 64 * 1024) {
        const chunk = data.subarray(i, i + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        socket.write(len);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk ends the stream
    });
  });
}
