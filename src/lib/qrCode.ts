import QRCode from 'qrcode';
import { QRTokenPayload } from '../types';

export function encodeQRToken(payload: QRTokenPayload): string {
  const json = JSON.stringify({ e: payload.event_id, m: payload.member_id, t: payload.issued_at });
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function decodeQRToken(token: string): QRTokenPayload | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4;
    const padded2 = pad ? padded + '==='.slice(0, 4 - pad) : padded;
    const json = atob(padded2);
    const obj = JSON.parse(json);
    if (!obj.e || !obj.m || !obj.t) return null;
    return { event_id: obj.e, member_id: obj.m, issued_at: obj.t };
  } catch {
    return null;
  }
}

export async function drawQRCode(canvas: HTMLCanvasElement, data: string): Promise<void> {
  await QRCode.toCanvas(canvas, data, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

export async function getQRCodeDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
