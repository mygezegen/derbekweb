import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle, XCircle, Download, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BulkParticipantImportProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  tc: string;
  gsm: string;
  rawLine: string;
  lineNo: number;
}

interface MatchResult {
  row: ImportRow;
  status: 'matched' | 'already_added' | 'not_found' | 'error';
  memberId?: string;
  memberName?: string;
  errorMessage?: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

export function BulkParticipantImport({ eventId, eventTitle, onClose, onSuccess }: BulkParticipantImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [parseError, setParseError] = useState('');

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const parsed: ImportRow[] = [];

    let startIdx = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('tc') || firstLine.includes('gsm') || firstLine.includes('kimlik') || firstLine.includes('telefon')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const sep = line.includes(';') ? ';' : ',';
      const parts = line.split(sep).map(p => p.replace(/^["']|["']$/g, '').trim());

      const tc = (parts[0] || '').replace(/\s+/g, '');
      const gsm = (parts[1] || '').replace(/[\s\-().+]/g, '');

      if (!tc && !gsm) continue;

      parsed.push({ tc, gsm, rawLine: line, lineNo: i + 1 });
    }
    return parsed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setParseError('Dosyada geçerli satır bulunamadı. TC ve/veya GSM sütunları olmalıdır.');
          return;
        }
        setRows(parsed);
        setStep('preview');
      } catch {
        setParseError('Dosya okunamadı. Lütfen CSV formatını kontrol edin.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    setStep('importing');
    const resultList: MatchResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress(Math.round(((i + 1) / rows.length) * 100));

      try {
        let memberId: string | null = null;
        let memberName = '';

        if (row.tc) {
          const { data } = await supabase
            .from('members')
            .select('id, full_name')
            .eq('tc_identity_no', row.tc)
            .maybeSingle();
          if (data) { memberId = data.id; memberName = data.full_name; }
        }

        if (!memberId && row.gsm) {
          const normalized = row.gsm.startsWith('0') ? row.gsm : '0' + row.gsm;
          const normalized2 = row.gsm.startsWith('90') ? '0' + row.gsm.slice(2) : normalized;
          const { data } = await supabase
            .from('members')
            .select('id, full_name')
            .or(`phone.eq.${row.gsm},phone.eq.${normalized},phone.eq.${normalized2}`)
            .maybeSingle();
          if (data) { memberId = data.id; memberName = data.full_name; }
        }

        if (!memberId) {
          resultList.push({ row, status: 'not_found' });
          continue;
        }

        const { data: existing } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', eventId)
          .eq('member_id', memberId)
          .maybeSingle();

        if (existing) {
          resultList.push({ row, status: 'already_added', memberId, memberName });
          continue;
        }

        const { error } = await supabase
          .from('event_participants')
          .insert({ event_id: eventId, member_id: memberId, status: 'confirmed' });

        if (error) {
          resultList.push({ row, status: 'error', errorMessage: error.message });
        } else {
          resultList.push({ row, status: 'matched', memberId, memberName });
        }
      } catch (err) {
        resultList.push({ row, status: 'error', errorMessage: String(err) });
      }
    }

    setResults(resultList);
    setStep('done');
    onSuccess();
  };

  const downloadTemplate = () => {
    const csv = 'TC Kimlik No;GSM\n12345678901;05551234567\n98765432100;05559876543';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'katilimci-import-sablonu.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadReport = () => {
    const headers = ['Satır No', 'TC Kimlik', 'GSM', 'Durum', 'Üye Adı', 'Hata'];
    const statusLabel = { matched: 'Eklendi', already_added: 'Zaten Kayıtlı', not_found: 'Bulunamadı', error: 'Hata' };
    const rows2 = results.map(r => [
      r.row.lineNo,
      r.row.tc || '',
      r.row.gsm || '',
      statusLabel[r.status],
      r.memberName || '',
      r.errorMessage || '',
    ]);
    const csv = [headers, ...rows2].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `import-raporu-${eventTitle.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const matched = results.filter(r => r.status === 'matched').length;
  const alreadyAdded = results.filter(r => r.status === 'already_added').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const errors = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Toplu Katılımcı Ekle</h3>
              <p className="text-xs text-gray-500">{eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-medium mb-2">Dosya Formatı</p>
                <p className="text-blue-700">CSV dosyanız iki sütun içermelidir:</p>
                <ul className="mt-1 space-y-1 text-blue-700 list-disc list-inside">
                  <li><strong>1. Sütun:</strong> TC Kimlik No</li>
                  <li><strong>2. Sütun:</strong> GSM (telefon numarası)</li>
                </ul>
                <p className="mt-2 text-blue-600 text-xs">Ayırıcı olarak virgül (,) veya noktalı virgül (;) kullanılabilir. Her ikisi de dolu olmak zorunda değildir.</p>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} />
                Örnek Şablon İndir
              </button>

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="font-medium text-gray-700">CSV dosyası seçin</p>
                <p className="text-sm text-gray-400 mt-1">veya sürükleyip bırakın</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <Users size={16} className="text-gray-500" />
                <strong>{rows.length}</strong> satır okundu. İçe aktarmak için "Başlat" butonuna basın.
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Satır</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">TC Kimlik</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">GSM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 20).map((row) => (
                      <tr key={row.lineNo} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400 text-xs">{row.lineNo}</td>
                        <td className="px-4 py-2 font-mono text-gray-700">{row.tc || '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{row.gsm || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                    ve {rows.length - 20} satır daha...
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="p-6 flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p className="font-medium text-gray-700">İçe aktarılıyor...</p>
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>İlerleme</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{matched}</p>
                  <p className="text-xs text-green-600 mt-0.5">Eklendi</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{alreadyAdded}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Zaten Kayıtlı</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{notFound}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Bulunamadı</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{errors}</p>
                  <p className="text-xs text-red-600 mt-0.5">Hata</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">TC / GSM</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Üye</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-mono text-xs text-gray-600">{r.row.tc || '—'}</p>
                          <p className="text-xs text-gray-400">{r.row.gsm || '—'}</p>
                        </td>
                        <td className="px-4 py-2 text-gray-700 text-sm">
                          {r.memberName || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {r.status === 'matched' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle size={10} />Eklendi
                            </span>
                          )}
                          {r.status === 'already_added' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              <CheckCircle size={10} />Kayıtlı
                            </span>
                          )}
                          {r.status === 'not_found' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              <AlertCircle size={10} />Bulunamadı
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <XCircle size={10} />Hata
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-between items-center gap-3">
          {step === 'done' ? (
            <>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={14} />
                Raporu İndir
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
              >
                Kapat
              </button>
            </>
          ) : step === 'preview' ? (
            <>
              <button
                onClick={() => { setRows([]); setStep('upload'); if (fileRef.current) fileRef.current.value = ''; }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                Geri
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
              >
                <Upload size={14} />
                {rows.length} Satırı İçe Aktar
              </button>
            </>
          ) : step === 'upload' ? (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              Kapat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
