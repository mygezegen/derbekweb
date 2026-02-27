import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Phone, Mail, Upload, Loader } from 'lucide-react';

interface EmailVerificationFlowProps {
  memberId: string;
  memberEmail: string;
  memberPhone: string;
  memberName: string;
  tcIdentityNo: string;
  birthDate: string;
  whatsappUrl?: string;
}

export default function EmailVerificationFlow({
  memberId,
  memberEmail,
  memberPhone,
  memberName,
  tcIdentityNo,
  birthDate,
  whatsappUrl
}: EmailVerificationFlowProps) {
  const [step, setStep] = useState<'check' | 'sms' | 'identity' | 'email' | 'complete' | 'redirect'>('check');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [smsCode, setSmsCode] = useState('');
  const [sentCode, setSentCode] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState('');

  const [redirectCountdown, setRedirectCountdown] = useState(10);

  useEffect(() => {
    checkUserStatus();
  }, []);

  useEffect(() => {
    if (step === 'redirect' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'redirect' && redirectCountdown === 0) {
      window.location.href = whatsappUrl || 'https://wa.me/';
    }
  }, [step, redirectCountdown, whatsappUrl]);

  const checkUserStatus = async () => {
    const needsEmailUpdate = memberEmail.endsWith('@uye.local');
    const hasValidPhone = memberPhone && memberPhone.length >= 10;

    if (!needsEmailUpdate) {
      setStep('complete');
      setSuccess('E-posta adresiniz zaten güncellenmiş.');
      return;
    }

    if (!hasValidPhone) {
      setStep('redirect');
      return;
    }

    const { data: existingRequest } = await supabase
      .from('email_update_requests')
      .select('*, identity_verification_requests(*)')
      .eq('member_id', memberId)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingRequest) {
      setStep('complete');
      setSuccess('E-posta güncellemesi daha önce tamamlanmış.');
      return;
    }

    const { data: pendingRequest } = await supabase
      .from('email_update_requests')
      .select('*')
      .eq('member_id', memberId)
      .in('status', ['pending', 'sms_verified', 'identity_verified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequest) {
      if (pendingRequest.status === 'pending') {
        setStep('sms');
      } else if (pendingRequest.status === 'sms_verified') {
        setStep('identity');
      } else if (pendingRequest.status === 'identity_verified') {
        setStep('email');
      }
    } else {
      setStep('sms');
    }
  };

  const sendSMSCode = async () => {
    setLoading(true);
    setError('');

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: smsData, error: smsError } = await supabase
        .from('sms_verification_codes')
        .insert({
          member_id: memberId,
          phone_number: memberPhone,
          verification_code: code,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (smsError) throw smsError;

      setVerificationId(smsData.id);

      const { error: sendError } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: memberPhone,
          message: `Doğrulama kodunuz: ${code}\nBu kod 10 dakika geçerlidir.`
        }
      });

      if (sendError) throw sendError;

      setSentCode(true);
      setSuccess('Doğrulama kodu telefonunuza gönderildi.');
    } catch (err: any) {
      setError(err.message || 'SMS gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const verifySMSCode = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: verification, error: verifyError } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .eq('phone_number', memberPhone)
        .eq('verification_code', smsCode)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verifyError) throw verifyError;
      if (!verification) {
        setError('Geçersiz veya süresi dolmuş kod.');
        setLoading(false);
        return;
      }

      await supabase
        .from('sms_verification_codes')
        .update({ is_used: true, verified_at: new Date().toISOString() })
        .eq('id', verification.id);

      const { data: existingRequest } = await supabase
        .from('email_update_requests')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        await supabase
          .from('email_update_requests')
          .update({ sms_verified: true, status: 'sms_verified' })
          .eq('id', existingRequest.id);
      } else {
        await supabase
          .from('email_update_requests')
          .insert({
            member_id: memberId,
            old_email: memberEmail,
            new_email: '',
            sms_verified: true,
            status: 'sms_verified'
          });
      }

      setSuccess('Telefon numaranız doğrulandı!');
      setStep('identity');
    } catch (err: any) {
      setError(err.message || 'Doğrulama başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Sadece resim dosyaları yüklenebilir.');
        return;
      }
      setIdCardFile(file);
      setIdCardPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const uploadIdentityCard = async () => {
    if (!idCardFile) {
      setError('Lütfen kimlik kartınızın ön yüzünü yükleyin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');

      const fileExt = idCardFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(fileName, idCardFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('id-cards')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('identity_verification_requests')
        .insert({
          member_id: memberId,
          id_card_front_url: publicUrl,
          extracted_tc_identity_no: tcIdentityNo,
          extracted_birth_date: birthDate,
          verification_status: 'pending'
        });

      if (insertError) throw insertError;

      await supabase
        .from('email_update_requests')
        .update({
          identity_verified: true,
          status: 'identity_verified'
        })
        .eq('member_id', memberId)
        .eq('status', 'sms_verified');

      setSuccess('Kimlik doğrulama talebi gönderildi. Lütfen yeni e-posta adresinizi girin.');
      setStep('email');
    } catch (err: any) {
      setError(err.message || 'Yükleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail || !newEmail.includes('@') || newEmail.endsWith('@uye.local')) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('email', newEmail)
        .neq('id', memberId)
        .maybeSingle();

      if (existingMember) {
        setError('Bu e-posta adresi başka bir üye tarafından kullanılıyor.');
        setLoading(false);
        return;
      }

      await supabase
        .from('email_update_requests')
        .update({
          new_email: newEmail,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('member_id', memberId)
        .eq('status', 'identity_verified');

      await supabase
        .from('members')
        .update({ email: newEmail })
        .eq('id', memberId);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({ email: newEmail });
      }

      setSuccess('E-posta adresiniz başarıyla güncellendi!');
      setStep('complete');

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'E-posta güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4">İşlem Tamamlandı</h2>
        <p className="text-center text-gray-600">{success}</p>
      </div>
    );
  }

  if (step === 'redirect') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4">Yardıma İhtiyacınız Var</h2>
        <p className="text-center text-gray-600 mb-4">
          Sistemde kayıtlı geçerli bir telefon numaranız bulunmamaktadır.
          Lütfen WhatsApp üzerinden bizimle iletişime geçin.
        </p>
        <p className="text-center text-lg font-semibold text-emerald-600 mb-4">
          {redirectCountdown} saniye içinde WhatsApp'a yönlendirileceksiniz...
        </p>
        <button
          onClick={() => window.location.href = whatsappUrl || 'https://wa.me/'}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Şimdi WhatsApp'a Git
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">E-posta Adresi Güncelleme</h2>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center ${step === 'sms' ? 'text-emerald-600' : step === 'check' ? 'text-gray-400' : 'text-green-600'}`}>
            <Phone className="h-6 w-6 mr-2" />
            <span className="font-semibold">1. Telefon Doğrulama</span>
          </div>
          <div className={`flex items-center ${step === 'identity' ? 'text-emerald-600' : ['check', 'sms'].includes(step) ? 'text-gray-400' : 'text-green-600'}`}>
            <Upload className="h-6 w-6 mr-2" />
            <span className="font-semibold">2. Kimlik Doğrulama</span>
          </div>
          <div className={`flex items-center ${step === 'email' ? 'text-emerald-600' : ['check', 'sms', 'identity'].includes(step) ? 'text-gray-400' : 'text-green-600'}`}>
            <Mail className="h-6 w-6 mr-2" />
            <span className="font-semibold">3. E-posta Güncelleme</span>
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{
              width: step === 'sms' ? '33%' : step === 'identity' ? '66%' : step === 'email' ? '100%' : '0%'
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {step === 'sms' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Merhaba {memberName},</strong><br />
              E-posta adresinizi güncellemek için önce telefon numaranızı doğrulamamız gerekiyor.
              <br /><br />
              <strong>Telefon:</strong> {memberPhone}
            </p>
          </div>

          {!sentCode ? (
            <button
              onClick={sendSMSCode}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5 mr-2" />
                  SMS Doğrulama Kodu Gönder
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 haneli kod"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  maxLength={6}
                />
              </div>
              <button
                onClick={verifySMSCode}
                disabled={loading || smsCode.length !== 6}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
              </button>
              <button
                onClick={sendSMSCode}
                disabled={loading}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Yeni Kod Gönder
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'identity' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Kimlik Doğrulama</strong><br />
              Sistemdeki bilgilerinizle eşleştiğinden emin olmak için TC kimlik kartınızın ön yüzünü yükleyin.
              <br /><br />
              <strong>Sistemdeki Bilgiler:</strong><br />
              TC Kimlik No: {tcIdentityNo}<br />
              Doğum Tarihi: {new Date(birthDate).toLocaleDateString('tr-TR')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kimlik Kartı Ön Yüz Fotoğrafı
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maksimum dosya boyutu: 5MB. Kabul edilen formatlar: JPG, PNG
            </p>
          </div>

          {idCardPreview && (
            <div className="border border-gray-300 rounded-lg p-4">
              <img
                src={idCardPreview}
                alt="Kimlik Önizleme"
                className="max-w-full h-auto rounded"
              />
            </div>
          )}

          <button
            onClick={uploadIdentityCard}
            disabled={loading || !idCardFile}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Kimlik Kartını Yükle ve Devam Et
              </>
            )}
          </button>
        </div>
      )}

      {step === 'email' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <CheckCircle className="h-5 w-5 inline mr-2" />
              Telefon ve kimlik doğrulaması tamamlandı! Şimdi yeni e-posta adresinizi girebilirsiniz.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mevcut E-posta
            </label>
            <input
              type="text"
              value={memberEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni E-posta Adresi
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
              placeholder="ornek@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={updateEmail}
            disabled={loading || !newEmail}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Güncelleniyor...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 mr-2" />
                E-posta Adresini Güncelle
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}