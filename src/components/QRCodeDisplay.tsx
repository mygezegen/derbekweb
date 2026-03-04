import { useEffect, useRef, useState } from 'react';
import { X, Download, QrCode } from 'lucide-react';
import { encodeQRToken, drawQRCode, getQRCodeDataURL } from '../lib/qrCode';

interface QRCodeDisplayProps {
  eventId: string;
  memberId: string;
  memberName: string;
  eventTitle: string;
  onClose: () => void;
}

export function QRCodeDisplay({ eventId, memberId, memberName, eventTitle, onClose }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = encodeQRToken({ event_id: eventId, member_id: memberId, issued_at: Date.now() });
    setToken(t);

    if (canvasRef.current) {
      drawQRCode(canvasRef.current, t).then(() => setLoading(false));
    }
  }, [eventId, memberId]);

  const handleDownload = async () => {
    const dataUrl = await getQRCodeDataURL(token);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${memberName.replace(/\s+/g, '-')}-${eventTitle.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <QrCode size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Giriş QR Kodunuz</h3>
              <p className="text-xs text-gray-500">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl z-10">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="p-3 border-2 border-gray-100 rounded-xl bg-white shadow-sm">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-900">{memberName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{eventTitle}</p>
          </div>

          <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 text-center">
            Bu QR kodu etkinlik girişinde gösteriniz. Lütfen ekran görüntüsünü de indirebilirsiniz.
          </div>

          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            <Download size={16} />
            QR Kodu İndir
          </button>
        </div>
      </div>
    </div>
  );
}
