import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle, User, Phone, Mail, Calendar, CreditCard, Loader } from 'lucide-react';

interface VerificationRequest {
  id: string;
  member_id: string;
  id_card_front_url: string;
  extracted_tc_identity_no: string | null;
  extracted_birth_date: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    tc_identity_no: string;
    birth_date: string;
  };
  email_update_request?: {
    id: string;
    old_email: string;
    new_email: string;
    status: string;
  };
}

export default function VerificationManagement() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadVerificationRequests();
  }, [filter]);

  const loadVerificationRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('identity_verification_requests')
        .select(`
          *,
          member:members!identity_verification_requests_member_id_fkey (
            id,
            full_name,
            email,
            phone_number,
            tc_identity_no,
            birth_date
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('verification_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const requestsWithEmails = await Promise.all(
        (data || []).map(async (request) => {
          const { data: emailRequest } = await supabase
            .from('email_update_requests')
            .select('id, old_email, new_email, status')
            .eq('member_id', request.member_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...request,
            email_update_request: emailRequest
          };
        })
      );

      setRequests(requestsWithEmails as VerificationRequest[]);
    } catch (error: any) {
      console.error('Error loading verification requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Bu kimlik doğrulama talebini onaylamak istediğinize emin misiniz?')) {
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');

      const { data: adminMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!adminMember) throw new Error('Admin kaydı bulunamadı.');

      await supabase
        .from('identity_verification_requests')
        .update({
          verification_status: 'approved',
          verified_by: adminMember.id,
          verified_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', requestId);

      alert('Kimlik doğrulama onaylandı.');
      setSelectedRequest(null);
      setAdminNotes('');
      loadVerificationRequests();
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!adminNotes.trim()) {
      alert('Lütfen red nedeni belirtin.');
      return;
    }

    if (!confirm('Bu kimlik doğrulama talebini reddetmek istediğinize emin misiniz?')) {
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');

      const { data: adminMember } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!adminMember) throw new Error('Admin kaydı bulunamadı.');

      await supabase
        .from('identity_verification_requests')
        .update({
          verification_status: 'rejected',
          verified_by: adminMember.id,
          verified_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', requestId);

      alert('Kimlik doğrulama reddedildi.');
      setSelectedRequest(null);
      setAdminNotes('');
      loadVerificationRequests();
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-4 w-4 mr-1" />
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" />
            Reddedildi
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <AlertCircle className="h-4 w-4 mr-1" />
            İnceleme Gerekli
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kimlik Doğrulama Talepleri</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tümü ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Bekleyen
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Onaylı
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'rejected'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Reddedilen
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Görüntülenecek talep bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-semibold">{request.member?.full_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {request.member?.email}
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {request.member?.phone_number}
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      TC: {request.member?.tc_identity_no}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {request.member?.birth_date ? new Date(request.member.birth_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                    </div>
                  </div>
                  {request.email_update_request && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">E-posta Güncelleme Talebi:</p>
                      <p className="text-sm text-blue-700">
                        {request.email_update_request.old_email} → {request.email_update_request.new_email || 'Henüz girilmedi'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Durum: {request.email_update_request.status}
                      </p>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  {getStatusBadge(request.verification_status)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Talep Tarihi: {new Date(request.created_at).toLocaleString('tr-TR')}
                </p>
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setAdminNotes(request.admin_notes || '');
                  }}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  İncele
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Kimlik Doğrulama İnceleme</h3>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-3">Üye Bilgileri</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium mr-2">Ad Soyad:</span>
                      {selectedRequest.member?.full_name}
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium mr-2">E-posta:</span>
                      {selectedRequest.member?.email}
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium mr-2">Telefon:</span>
                      {selectedRequest.member?.phone_number}
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium mr-2">TC Kimlik No:</span>
                      {selectedRequest.member?.tc_identity_no}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium mr-2">Doğum Tarihi:</span>
                      {selectedRequest.member?.birth_date ? new Date(selectedRequest.member.birth_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Durum Bilgisi</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Durum:</span>{' '}
                      {getStatusBadge(selectedRequest.verification_status)}
                    </div>
                    <div>
                      <span className="font-medium">Talep Tarihi:</span>{' '}
                      {new Date(selectedRequest.created_at).toLocaleString('tr-TR')}
                    </div>
                    <div>
                      <span className="font-medium">Güncelleme:</span>{' '}
                      {new Date(selectedRequest.updated_at).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-3">Kimlik Kartı Görüntüsü</h4>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={selectedRequest.id_card_front_url}
                    alt="Kimlik Kartı"
                    className="max-w-full h-auto rounded"
                  />
                </div>
              </div>

              {selectedRequest.verification_status === 'pending' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yönetici Notları
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Onay veya red nedenini buraya yazabilirsiniz..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Yönetici Notları</h4>
                  <p className="text-sm text-gray-700">{selectedRequest.admin_notes}</p>
                </div>
              )}

              {selectedRequest.verification_status === 'pending' && (
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={processing}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                  >
                    {processing ? (
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                    ) : (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={processing}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                  >
                    {processing ? (
                      <Loader className="animate-spin h-5 w-5 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 mr-2" />
                    )}
                    Reddet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}