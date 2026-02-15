import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Download, FileSpreadsheet, Users, DollarSign, Wallet } from 'lucide-react';

type OperationType = 'debt' | 'payment' | 'member' | 'export';

export function BulkOperations() {
  const [activeOperation, setActiveOperation] = useState<OperationType>('debt');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const downloadSampleTemplate = (type: 'debt' | 'payment' | 'member') => {
    let csv = '';
    let filename = '';

    if (type === 'debt') {
      csv = 'email,başlık,tutar,tarih,açıklama\n';
      csv += 'ornek@email.com,2025 Yıllık Aidat,500,2025-12-31,Yıllık aidat ödemesi\n';
      csv += 'uye2@email.com,Olağanüstü Aidat,200,2025-06-30,Onarım için ek aidat\n';
      filename = 'borç_yükleme_şablonu.csv';
    } else if (type === 'payment') {
      csv = 'email,tutar\n';
      csv += 'ornek@email.com,500\n';
      csv += 'uye2@email.com,200\n';
      filename = 'ödeme_şablonu.csv';
    } else if (type === 'member') {
      csv = 'ad,email,şifre,telefon,adres\n';
      csv += 'Ahmet Yılmaz,ahmet@email.com,Sifre123,05551234567,İstanbul Türkiye\n';
      csv += 'Ayşe Demir,ayse@email.com,Sifre456,05559876543,Ankara Türkiye\n';
      filename = 'üye_yükleme_şablonu.csv';
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleBulkDebtUpload = async () => {
    if (!file) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0];
      const data = rows.slice(1);

      const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-posta'));
      const titleIndex = headers.findIndex(h => h.toLowerCase().includes('başlık') || h.toLowerCase().includes('title'));
      const amountIndex = headers.findIndex(h => h.toLowerCase().includes('tutar') || h.toLowerCase().includes('amount'));
      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('tarih') || h.toLowerCase().includes('date'));

      if (emailIndex === -1 || titleIndex === -1 || amountIndex === -1) {
        throw new Error('CSV dosyasında gerekli sütunlar bulunamadı (email, başlık, tutar)');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { data: currentMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const email = row[emailIndex];
          const title = row[titleIndex];
          const amount = parseFloat(row[amountIndex]);
          const dueDate = dateIndex !== -1 ? row[dateIndex] : new Date().toISOString().split('T')[0];

          const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (!member) {
            errors.push(`${email} - Üye bulunamadı`);
            failCount++;
            continue;
          }

          const duesPayload = {
            title,
            amount,
            period_month: 1,
            period_year: new Date().getFullYear(),
            due_date: dueDate,
            created_by: currentMember?.id
          };

          const { data: newDues, error: duesError } = await supabase
            .from('dues')
            .insert(duesPayload)
            .select()
            .single();

          if (duesError) throw duesError;

          const { error: memberDuesError } = await supabase
            .from('member_dues')
            .insert({
              member_id: member.id,
              dues_id: newDues.id,
              status: 'pending',
              paid_amount: 0
            });

          if (memberDuesError) throw memberDuesError;

          successCount++;
        } catch (err) {
          failCount++;
          errors.push(`Satır hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(`${successCount} borç kaydı başarıyla eklendi. ${failCount} kayıt başarısız.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu borç yükleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPaymentUpload = async () => {
    if (!file) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0];
      const data = rows.slice(1);

      const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-posta'));
      const amountIndex = headers.findIndex(h => h.toLowerCase().includes('tutar') || h.toLowerCase().includes('amount'));
      const duesIdIndex = headers.findIndex(h => h.toLowerCase().includes('aidat') || h.toLowerCase().includes('dues'));

      if (emailIndex === -1 || amountIndex === -1) {
        throw new Error('CSV dosyasında gerekli sütunlar bulunamadı (email, tutar)');
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const email = row[emailIndex];
          const amount = parseFloat(row[amountIndex]);

          const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (!member) {
            errors.push(`${email} - Üye bulunamadı`);
            failCount++;
            continue;
          }

          const { data: memberDues } = await supabase
            .from('member_dues')
            .select('id, paid_amount, dues(amount)')
            .eq('member_id', member.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!memberDues) {
            errors.push(`${email} - Bekleyen borç bulunamadı`);
            failCount++;
            continue;
          }

          const dueAmount = (memberDues.dues as any)?.amount || 0;
          const newPaidAmount = (memberDues.paid_amount || 0) + amount;
          const newStatus = newPaidAmount >= dueAmount ? 'paid' : 'partial';

          const { error: updateError } = await supabase
            .from('member_dues')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null
            })
            .eq('id', memberDues.id);

          if (updateError) throw updateError;

          successCount++;
        } catch (err) {
          failCount++;
          errors.push(`Satır hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(`${successCount} ödeme kaydı başarıyla eklendi. ${failCount} kayıt başarısız.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu tahsilat başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMemberUpload = async () => {
    if (!file) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0];
      const data = rows.slice(1);

      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('ad') || h.toLowerCase().includes('name'));
      const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-posta'));
      const passwordIndex = headers.findIndex(h => h.toLowerCase().includes('şifre') || h.toLowerCase().includes('password'));
      const phoneIndex = headers.findIndex(h => h.toLowerCase().includes('telefon') || h.toLowerCase().includes('phone'));
      const addressIndex = headers.findIndex(h => h.toLowerCase().includes('adres') || h.toLowerCase().includes('address'));

      if (nameIndex === -1 || emailIndex === -1 || passwordIndex === -1) {
        throw new Error('CSV dosyasında gerekli sütunlar bulunamadı (ad, email, şifre)');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`;
      const { data: { session } } = await supabase.auth.getSession();

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const fullName = row[nameIndex];
          const email = row[emailIndex];
          const password = row[passwordIndex];
          const phone = phoneIndex !== -1 ? row[phoneIndex] : '';
          const address = addressIndex !== -1 ? row[addressIndex] : '';

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, full_name: fullName, phone, address }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Üye eklenemedi');
          }

          successCount++;
        } catch (err) {
          failCount++;
          errors.push(`${row[emailIndex]} - ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
        }
      }

      setResults({ successCount, failCount, errors });
      setSuccess(`${successCount} üye başarıyla eklendi. ${failCount} kayıt başarısız.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu üye yükleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDebtors = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: debtData } = await supabase
        .from('member_dues')
        .select('member_id, paid_amount, status, dues(id, title, amount, due_date), members(full_name, email, phone)')
        .neq('status', 'paid')
        .order('created_at', { ascending: false });

      if (!debtData || debtData.length === 0) {
        setError('Borçlu üye bulunamadı');
        return;
      }

      const csv = [
        ['Ad Soyad', 'E-posta', 'Telefon', 'Aidat Başlığı', 'Toplam Tutar', 'Ödenen', 'Kalan Borç', 'Son Ödeme Tarihi', 'Durum'].join(','),
        ...debtData.map(item => {
          const member = (item.members as any);
          const dues = (item.dues as any);
          const totalAmount = dues?.amount || 0;
          const paidAmount = item.paid_amount || 0;
          const remainingDebt = totalAmount - paidAmount;
          const status = item.status === 'pending' ? 'Ödenmedi' : 'Kısmi Ödendi';

          return [
            member?.full_name || '',
            member?.email || '',
            member?.phone || '',
            dues?.title || '',
            totalAmount,
            paidAmount,
            remainingDebt,
            dues?.due_date || '',
            status
          ].map(val => `"${val}"`).join(',');
        })
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `borclu_listesi_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      setSuccess('Borçlu listesi başarıyla indirildi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    switch (activeOperation) {
      case 'debt':
        await handleBulkDebtUpload();
        break;
      case 'payment':
        await handleBulkPaymentUpload();
        break;
      case 'member':
        await handleBulkMemberUpload();
        break;
      case 'export':
        await handleExportDebtors();
        break;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Toplu İşlemler</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveOperation('debt')}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeOperation === 'debt'
              ? 'border-red-600 bg-red-50 shadow-lg'
              : 'border-gray-200 hover:border-red-300 bg-white'
          }`}
        >
          <FileSpreadsheet className={`mx-auto mb-3 ${activeOperation === 'debt' ? 'text-red-600' : 'text-gray-400'}`} size={32} />
          <h3 className="font-semibold text-gray-800">Toplu Borç Yükleme</h3>
          <p className="text-sm text-gray-600 mt-2">CSV ile borç ekle</p>
        </button>

        <button
          onClick={() => setActiveOperation('payment')}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeOperation === 'payment'
              ? 'border-green-600 bg-green-50 shadow-lg'
              : 'border-gray-200 hover:border-green-300 bg-white'
          }`}
        >
          <Wallet className={`mx-auto mb-3 ${activeOperation === 'payment' ? 'text-green-600' : 'text-gray-400'}`} size={32} />
          <h3 className="font-semibold text-gray-800">Toplu Tahsilat</h3>
          <p className="text-sm text-gray-600 mt-2">CSV ile ödeme kaydet</p>
        </button>

        <button
          onClick={() => setActiveOperation('member')}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeOperation === 'member'
              ? 'border-blue-600 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-blue-300 bg-white'
          }`}
        >
          <Users className={`mx-auto mb-3 ${activeOperation === 'member' ? 'text-blue-600' : 'text-gray-400'}`} size={32} />
          <h3 className="font-semibold text-gray-800">Toplu Üye Yükleme</h3>
          <p className="text-sm text-gray-600 mt-2">CSV ile üye ekle</p>
        </button>

        <button
          onClick={() => setActiveOperation('export')}
          className={`p-6 rounded-lg border-2 transition-all ${
            activeOperation === 'export'
              ? 'border-purple-600 bg-purple-50 shadow-lg'
              : 'border-gray-200 hover:border-purple-300 bg-white'
          }`}
        >
          <Download className={`mx-auto mb-3 ${activeOperation === 'export' ? 'text-purple-600' : 'text-gray-400'}`} size={32} />
          <h3 className="font-semibold text-gray-800">Borçlu Listesi</h3>
          <p className="text-sm text-gray-600 mt-2">CSV olarak indir</p>
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-600">
        {activeOperation === 'export' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Download size={24} className="text-purple-600" />
              Borçlu Listesi İndir
            </h3>
            <p className="text-gray-600">
              Tüm borçlu üyelerin listesini CSV formatında indirebilirsiniz.
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors shadow-md font-medium"
            >
              <Download size={20} />
              {loading ? 'İndiriliyor...' : 'Listeyi İndir'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Upload size={24} className="text-red-600" />
              {activeOperation === 'debt' && 'Toplu Borç Yükleme'}
              {activeOperation === 'payment' && 'Toplu Tahsilat'}
              {activeOperation === 'member' && 'Toplu Üye Yükleme'}
            </h3>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800 mb-2">CSV Formatı</h4>
                  <p className="text-sm text-blue-700 mb-2">CSV dosyanız aşağıdaki sütunları içermelidir:</p>
                  {activeOperation === 'debt' && (
                    <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>email veya e-posta (zorunlu)</li>
                      <li>başlık veya title (zorunlu)</li>
                      <li>tutar veya amount (zorunlu)</li>
                      <li>tarih veya date (opsiyonel, format: YYYY-MM-DD)</li>
                      <li>açıklama (opsiyonel)</li>
                    </ul>
                  )}
                  {activeOperation === 'payment' && (
                    <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>email veya e-posta (zorunlu)</li>
                      <li>tutar veya amount (zorunlu)</li>
                    </ul>
                  )}
                  {activeOperation === 'member' && (
                    <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>ad veya name (zorunlu)</li>
                      <li>email veya e-posta (zorunlu)</li>
                      <li>şifre veya password (zorunlu)</li>
                      <li>telefon veya phone (opsiyonel)</li>
                      <li>adres veya address (opsiyonel)</li>
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate(activeOperation as 'debt' | 'payment' | 'member')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ml-4 whitespace-nowrap"
                >
                  <Download size={18} />
                  Örnek Şablon İndir
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV Dosyası Seçin
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              {file && <p className="mt-2 text-sm text-gray-600">Seçilen dosya: {file.name}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !file}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 transition-all shadow-md border-b-2 border-green-600 font-medium"
            >
              <Upload size={20} />
              {loading ? 'İşleniyor...' : 'Yükle'}
            </button>
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">İşlem Sonuçları</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-100 rounded p-3">
                  <p className="text-sm text-green-700">Başarılı</p>
                  <p className="text-2xl font-bold text-green-800">{results.successCount}</p>
                </div>
                <div className="bg-red-100 rounded p-3">
                  <p className="text-sm text-red-700">Başarısız</p>
                  <p className="text-2xl font-bold text-red-800">{results.failCount}</p>
                </div>
              </div>
              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50 rounded p-3 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-red-800 mb-2">Hatalar:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {results.errors.map((err: string, idx: number) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
