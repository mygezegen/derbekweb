import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, RefreshCw, ScanLine, Users, QrCode, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { decodeQRToken } from '../lib/qrCode';
import { logAction } from '../lib/auditLog';
import { Member, Event } from '../types';

interface QRScannerPageProps {
  currentMember: Member;
}

type ScanStatus = 'idle' | 'success' | 'already_checked' | 'walk_in' | 'invalid' | 'not_found' | 'error';

interface ScanResult {
  status: ScanStatus;
  memberName?: string;
  eventTitle?: string;
  checkedInAt?: string;
  tcIdentityNo?: string;
  phone?: string;
  email?: string;
  message?: string;
}

interface CheckInStats {
  total: number;
  checkedIn: number;
  walkIns: number;
}

export function QRScannerPage({ currentMember }: QRScannerPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const detectorRef = useRef<unknown>(null);
  const animFrameRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    setHasBarcodeDetector('BarcodeDetector' in window);
    loadQREvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadStats(selectedEventId);
  }, [selectedEventId]);

  const loadQREvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, event_date, date')
      .eq('qr_checkin_enabled', true)
      .order('event_date', { ascending: false });
    if (data) {
      setEvents(data);
      if (data.length > 0) setSelectedEventId(data[0].id);
    }
  };

  const loadStats = async (eventId: string) => {
    const { data } = await supabase
      .from('event_participants')
      .select('checked_in, walk_in')
      .eq('event_id', eventId);
    if (data) {
      setStats({
        total: data.length,
        checkedIn: data.filter(p => p.checked_in).length,
        walkIns: data.filter(p => p.walk_in).length,
      });
    }
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      if (hasBarcodeDetector) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BarcodeDetectorAPI = (window as any).BarcodeDetector;
        detectorRef.current = new BarcodeDetectorAPI({ formats: ['qr_code'] });
        setScanning(true);
        scanFrame();
      }
    } catch {
      setCameraError('Kamera erişimi sağlanamadı. Lütfen kamera iznini kontrol edin.');
    }
  };

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !detectorRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (detectorRef.current as any).detect(videoRef.current).then((barcodes: any[]) => {
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue;
        const now = Date.now();
        if (raw !== lastScannedRef.current || now - lastScannedTimeRef.current > 3000) {
          lastScannedRef.current = raw;
          lastScannedTimeRef.current = now;
          processToken(raw);
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }).catch(() => {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (scanning) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [scanning, scanFrame]);

  const stopCamera = () => {
    cancelAnimationFrame(animFrameRef.current);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setScanning(false);
  };

  const processToken = async (raw: string) => {
    const payload = decodeQRToken(raw);
    if (!payload) {
      setScanResult({ status: 'invalid', message: 'Geçersiz QR kodu' });
      return;
    }

    const { data: memberData } = await supabase
      .from('members')
      .select('id, full_name, email, phone, tc_identity_no')
      .eq('id', payload.member_id)
      .maybeSingle();

    if (!memberData) {
      setScanResult({ status: 'not_found', message: 'Üye bulunamadı' });
      return;
    }

    const memberName = memberData.full_name || 'Bilinmiyor';
    const tcIdentityNo = memberData.tc_identity_no || undefined;
    const phone = memberData.phone || undefined;
    const email = memberData.email || undefined;

    const { data: eventData } = await supabase
      .from('events')
      .select('title')
      .eq('id', payload.event_id)
      .maybeSingle();

    const eventTitle = eventData?.title || 'Bilinmiyor';

    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, checked_in, checked_in_at')
      .eq('event_id', payload.event_id)
      .eq('member_id', payload.member_id)
      .maybeSingle();

    if (!participant) {
      const now = new Date().toISOString();
      const { data: newParticipant, error: insertError } = await supabase
        .from('event_participants')
        .insert({
          event_id: payload.event_id,
          member_id: payload.member_id,
          status: 'confirmed',
          checked_in: true,
          checked_in_at: now,
          checked_in_by: currentMember.id,
          walk_in: true,
        })
        .select('id')
        .single();

      if (insertError) {
        setScanResult({ status: 'error', message: insertError.message });
        return;
      }

      await logAction(
        currentMember.id,
        'create',
        'event_participants',
        newParticipant.id,
        undefined,
        {
          event_id: payload.event_id,
          member_id: payload.member_id,
          walk_in: true,
          checked_in: true,
          checked_in_at: now,
          member_name: memberName,
          tc_identity_no: tcIdentityNo,
          phone,
          email,
          event_title: eventTitle,
        }
      );

      setScanResult({ status: 'walk_in', memberName, eventTitle, tcIdentityNo, phone, email });
      if (selectedEventId === payload.event_id) loadStats(selectedEventId);
      return;
    }

    if (participant.checked_in) {
      setScanResult({
        status: 'already_checked',
        memberName,
        eventTitle,
        checkedInAt: participant.checked_in_at,
        tcIdentityNo,
        phone,
        email,
      });
      return;
    }

    const checkedInAt = new Date().toISOString();
    const { error } = await supabase
      .from('event_participants')
      .update({
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: currentMember.id,
      })
      .eq('id', participant.id);

    if (error) {
      setScanResult({ status: 'error', message: error.message });
      return;
    }

    await logAction(
      currentMember.id,
      'update',
      'event_participants',
      participant.id,
      { checked_in: false },
      {
        checked_in: true,
        checked_in_at: checkedInAt,
        checked_in_by: currentMember.id,
        member_name: memberName,
        tc_identity_no: tcIdentityNo,
        phone,
        email,
        event_title: eventTitle,
      }
    );

    setScanResult({ status: 'success', memberName, eventTitle, tcIdentityNo, phone, email });
    if (selectedEventId === payload.event_id) loadStats(selectedEventId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      processToken(manualToken.trim());
      setManualToken('');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    lastScannedRef.current = '';
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const eventDateLabel = selectedEvent?.event_date
    ? new Date(selectedEvent.event_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
    : selectedEvent?.date || '';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <QrCode size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">QR Kod Tarama</h2>
          <p className="text-sm text-gray-500">Etkinlik girişlerini QR kod ile takip edin</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Etkinlik Seçin</label>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 italic">QR giriş aktif etkinlik bulunamadı.</p>
        ) : (
          <select
            value={selectedEventId}
            onChange={e => { setSelectedEventId(e.target.value); resetScan(); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title} {ev.event_date ? `— ${new Date(ev.event_date).toLocaleDateString('tr-TR')}` : ''}
              </option>
            ))}
          </select>
        )}

        {stats && (
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <Users size={14} className="text-gray-400" />
              <span className="text-gray-600">Toplam: <strong className="text-gray-900">{stats.total}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={14} className="text-green-500" />
              <span className="text-gray-600">Giriş Yapan: <strong className="text-green-700">{stats.checkedIn}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={14} className="text-amber-500" />
              <span className="text-gray-600">Bekleyen: <strong className="text-amber-700">{stats.total - stats.checkedIn}</strong></span>
            </div>
            {stats.walkIns > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <UserPlus size={14} className="text-blue-500" />
                <span className="text-gray-600">Kapıdan Gelen: <strong className="text-blue-700">{stats.walkIns}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {hasBarcodeDetector ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-400 opacity-75 animate-pulse" style={{ transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}
            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900">
                <Camera size={48} className="text-gray-500" />
                <p className="text-gray-400 text-sm">Kamera başlatılmadı</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-700">{cameraError}</p>
            </div>
          )}

          <div className="p-4 flex gap-3">
            {!stream ? (
              <button
                onClick={startCamera}
                disabled={!selectedEventId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                <Camera size={16} />
                Kamerayı Başlat
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
              >
                <XCircle size={16} />
                Kamerayı Durdur
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <p className="font-medium mb-1">Tarayici kamera desteği bulunamadı</p>
          <p>Bu tarayici QR kod tarama API'sini desteklemiyor. Aşağıdaki manuel giriş alanını kullanabilirsiniz.</p>
        </div>
      )}

      {scanResult && (
        <div className={`rounded-xl border p-4 ${
          scanResult.status === 'success' ? 'bg-green-50 border-green-200' :
          scanResult.status === 'walk_in' ? 'bg-blue-50 border-blue-200' :
          scanResult.status === 'already_checked' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {scanResult.status === 'success' ? (
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              ) : scanResult.status === 'walk_in' ? (
                <UserPlus size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              ) : scanResult.status === 'already_checked' ? (
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                {scanResult.status === 'success' && (
                  <>
                    <p className="font-semibold text-green-800">Giriş Onaylandı</p>
                    <p className="text-sm text-green-700 mt-0.5">{scanResult.memberName}</p>
                    <p className="text-xs text-green-600 mt-0.5">{scanResult.eventTitle}</p>
                    <MemberDetails result={scanResult} colorClass="text-green-600" />
                  </>
                )}
                {scanResult.status === 'walk_in' && (
                  <>
                    <p className="font-semibold text-blue-800">Kapıdan Giriş — Listede Yoktu</p>
                    <p className="text-sm text-blue-700 mt-0.5">{scanResult.memberName}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{scanResult.eventTitle}</p>
                    <MemberDetails result={scanResult} colorClass="text-blue-600" />
                  </>
                )}
                {scanResult.status === 'already_checked' && (
                  <>
                    <p className="font-semibold text-amber-800">Daha Önce Giriş Yapılmış</p>
                    <p className="text-sm text-amber-700 mt-0.5">{scanResult.memberName}</p>
                    {scanResult.checkedInAt && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Giriş zamanı: {new Date(scanResult.checkedInAt).toLocaleString('tr-TR')}
                      </p>
                    )}
                    <MemberDetails result={scanResult} colorClass="text-amber-600" />
                  </>
                )}
                {(scanResult.status === 'invalid' || scanResult.status === 'not_found' || scanResult.status === 'error') && (
                  <>
                    <p className="font-semibold text-red-800">
                      {scanResult.status === 'invalid' ? 'Geçersiz QR Kodu' :
                       scanResult.status === 'not_found' ? 'Üye Bulunamadı' : 'Hata'}
                    </p>
                    {scanResult.message && <p className="text-sm text-red-700 mt-0.5">{scanResult.message}</p>}
                  </>
                )}
              </div>
            </div>
            <button onClick={resetScan} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine size={16} className="text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Manuel Token Girişi</h3>
        </div>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            placeholder="QR token yapıştırın veya yazın..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!manualToken.trim() || !selectedEventId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Doğrula
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Firefox ve eski Safari tarayıcıları için — QR kodu tarayıp kopyaladıktan sonra buraya yapıştırın.
        </p>
      </div>

      {selectedEvent && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-500 text-center">
          Aktif etkinlik: <strong className="text-gray-700">{selectedEvent.title}</strong>
          {eventDateLabel && <span> — {eventDateLabel}</span>}
        </div>
      )}
    </div>
  );
}

function MemberDetails({ result, colorClass }: { result: ScanResult; colorClass: string }) {
  if (!result.tcIdentityNo && !result.phone && !result.email) return null;
  return (
    <div className={`mt-2 space-y-0.5 text-xs ${colorClass} opacity-80`}>
      {result.tcIdentityNo && <p>TC: {result.tcIdentityNo}</p>}
      {result.phone && <p>GSM: {result.phone}</p>}
      {result.email && <p>E-posta: {result.email}</p>}
    </div>
  );
}
