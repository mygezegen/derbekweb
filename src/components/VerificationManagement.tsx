import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle, XCircle, Clock, Eye, AlertCircle, User,
  Phone, Mail, Calendar, CreditCard, Loader, Trash2,
} from 'lucide-react';

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

interface DeletionRequest {
  id: string;
  member_id: string | null;
  lookup_value: string;
  lookup_type: 'email' | 'phone';
  status: 'pending_verification' | 'pending_admin' | 'approved' | 'rejected';
  admin_notes: string | null;
  code_verified: boolean;
  code_verified_at: string | null;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    tc_identity_no: string;
  } | null;
}

type ActiveTab = 'identity' | 'deletion';

export default function VerificationManagement() {
  const { session, member: currentMember } = useAuth();
  const isRoot = currentMember?.is_root ?? false;

  const [activeTab, setActiveTab] = useState<ActiveTab>('identity');

  // --- Identity verification state ---
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loadingVerif, setLoadingVerif] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // --- Deletion request state ---
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loadingDeletion, setLoadingDeletion] = useState(true);
  const [selectedDeletion, setSelectedDeletion] = useState<DeletionRequest | null>(null);
  const [deletionNotes, setDeletionNotes] = useState('');
  const [processingDeletion, setProcessingDeletion] = useState(false);
  const [deletionFilter, setDeletionFilter] = useState<'all' | 'pending_admin' | 'approved' | 'rejected'>('pending_admin');

  useEffect(() => {
    if (activeTab === 'identity') loadVerificationRequests();
    else loadDeletionRequests();
  }, [activeTab, filter, deletionFilter]);

  // =========================================================
  // Identity Verification
  // =========================================================
  const loadVerificationRequests = async () => {
    setLoadingVerif(true);
    try {
      let query = supabase
        .from('identity_verification_requests')
        .select(`
          *,
          member:members!identity_verification_requests_member_id_fkey (
            id, full_name, email, phone_number, tc_identity_no, birth_date
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') query = query.eq('verification_status', filter);

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
          return { ...request, email_update_request: emailRequest };
        })
      );
      setRequests(requestsWithEmails as VerificationRequest[]);
    } catch (error: any) {
      console.error('Error loading verification requests:', error);
    } finally {
      setLoadingVerif(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Bu kimlik doğrulama talebini onaylamak istediğinize emin misiniz?')) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');
      const { data: adminMember } = await supabase.from('members').select('id').eq('auth_id', user.id).single();
      if (!adminMember) throw new Error('Admin kaydı bulunamadı.');

      await supabase.from('identity_verification_requests').update({
        verification_status: 'approved',
        verified_by: adminMember.id,
        verified_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      }).eq('id', requestId);

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
    if (!adminNotes.trim()) { alert('Lütfen red nedeni belirtin.'); return; }
    if (!confirm('Bu kimlik doğrulama talebini reddetmek istediğinize emin misiniz?')) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı.');
      const { data: adminMember } = await supabase.from('members').select('id').eq('auth_id', user.id).single();
      if (!adminMember) throw new Error('Admin kaydı bulunamadı.');

      await supabase.from('identity_verification_requests').update({
        verification_status: 'rejected',
        verified_by: adminMember.id,
        verified_at: new Date().toISOString(),
        admin_notes: adminNotes,
      }).eq('id', requestId);

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

  // =========================================================
  // Deletion Requests (root-only)
  // =========================================================
  const loadDeletionRequests = async () => {
    setLoadingDeletion(true);
    try {
      let query = supabase
        .from('account_deletion_requests')
        .select(`
          *,
          member:members!account_deletion_requests_member_id_fkey (
            id, full_name, email, phone, tc_identity_no
          )
        `)
        .order('created_at', { ascending: false });

      if (deletionFilter !== 'all') query = query.eq('status', deletionFilter);

      const { data, error } = await query;
      if (error) throw error;
      setDeletionRequests((data || []) as DeletionRequest[]);
    } catch (error: any) {
      console.error('Error loading deletion requests:', error);
    } finally {
      setLoadingDeletion(false);
    }
  };

  const handleDeletionApprove = async (requestId: string) => {
    if (!confirm('Bu üyenin hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ.')) return;
    setProcessingDeletion(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/confirm-account-deletion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'admin_approve', request_id: requestId, admin_notes: deletionNotes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'İşlem başarısız');
      alert('Hesap başarıyla silindi.');
      setSelectedDeletion(null);
      setDeletionNotes('');
      loadDeletionRequests();
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setProcessingDeletion(false);
    }
  };

  const handleDeletionReject = async (requestId: string) => {
    if (!deletionNotes.trim()) { alert('Lütfen red nedeni belirtin.'); return; }
    if (!confirm('Bu hesap silme talebini reddetmek istediğinize emin misiniz?')) return;
    setProcessingDeletion(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/confirm-account-deletion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'admin_reject', request_id: requestId, admin_notes: deletionNotes }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'İşlem başarısız');
      alert('Talep reddedildi.');
      setSelectedDeletion(null);
      setDeletionNotes('');
      loadDeletionRequests();
    } catch (error: any) {
      alert('Hata: ' + error.message);
    } finally {
      setProcessingDeletion(false);
    }
  };

  // =========================================================
  // Shared helpers
  // =========================================================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-4 w-4 mr-1" />Beklemede
          </span>
        );
      case 'pending_admin':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <Clock className="h-4 w-4 mr-1" />Root Onayı Bekliyor
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" />Reddedildi
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <AlertCircle className="h-4 w-4 mr-1" />İnceleme Gerekli
          </span>
        );
      default:
        return null;
    }
  };

  const pendingDeletionCount = deletionRequests.filter(r => r.status === 'pending_admin').length;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'identity'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Kimlik Doğrulama
        </button>
        {isRoot && (
          <button
            onClick={() => setActiveTab('deletion')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'deletion'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            Hesap Silme Talepleri
            {pendingDeletionCount > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                {pendingDeletionCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ===== IDENTITY TAB ===== */}
      {activeTab === 'identity' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Kimlik Doğrulama Talepleri</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? `Tümü (${requests.length})` : f === 'pending' ? 'Bekleyen' : f === 'approved' ? 'Onaylı' : 'Reddedilen'}
                </button>
              ))}
            </div>
          </div>

          {loadingVerif ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Görüntülenecek talep bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-semibold">{request.member?.full_name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center"><Mail className="h-4 w-4 mr-2" />{request.member?.email}</div>
                        <div className="flex items-center"><Phone className="h-4 w-4 mr-2" />{request.member?.phone_number}</div>
                        <div className="flex items-center"><CreditCard className="h-4 w-4 mr-2" />TC: {request.member?.tc_identity_no}</div>
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
                          <p className="text-xs text-blue-600 mt-1">Durum: {request.email_update_request.status}</p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">{getStatusBadge(request.verification_status)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Talep Tarihi: {new Date(request.created_at).toLocaleString('tr-TR')}</p>
                    <button
                      onClick={() => { setSelectedRequest(request); setAdminNotes(request.admin_notes || ''); }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm transition-colors"
                    >
                      <Eye className="h-4 w-4" />İncele
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Identity Detail Modal */}
          {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Kimlik Doğrulama İnceleme</h3>
                    <button onClick={() => { setSelectedRequest(null); setAdminNotes(''); }} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold mb-3">Üye Bilgileri</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center"><User className="h-4 w-4 text-gray-400 mr-2" /><span className="font-medium mr-2">Ad Soyad:</span>{selectedRequest.member?.full_name}</div>
                        <div className="flex items-center"><Mail className="h-4 w-4 text-gray-400 mr-2" /><span className="font-medium mr-2">E-posta:</span>{selectedRequest.member?.email}</div>
                        <div className="flex items-center"><Phone className="h-4 w-4 text-gray-400 mr-2" /><span className="font-medium mr-2">Telefon:</span>{selectedRequest.member?.phone_number}</div>
                        <div className="flex items-center"><CreditCard className="h-4 w-4 text-gray-400 mr-2" /><span className="font-medium mr-2">TC Kimlik No:</span>{selectedRequest.member?.tc_identity_no}</div>
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
                        <div><span className="font-medium">Durum:</span> {getStatusBadge(selectedRequest.verification_status)}</div>
                        <div><span className="font-medium">Talep Tarihi:</span> {new Date(selectedRequest.created_at).toLocaleString('tr-TR')}</div>
                        <div><span className="font-medium">Güncelleme:</span> {new Date(selectedRequest.updated_at).toLocaleString('tr-TR')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Kimlik Kartı Görüntüsü</h4>
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <img src={selectedRequest.id_card_front_url} alt="Kimlik Kartı" className="max-w-full h-auto rounded" />
                    </div>
                  </div>
                  {selectedRequest.verification_status === 'pending' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Yönetici Notları</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Onay veya red nedenini buraya yazabilirsiniz..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      />
                    </div>
                  )}
                  {selectedRequest.admin_notes && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold mb-2">Yönetici Notları</h4>
                      <p className="text-sm text-gray-700">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                  {selectedRequest.verification_status === 'pending' && (
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
                      >
                        {processing ? <Loader className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                        Onayla
                      </button>
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
                      >
                        {processing ? <Loader className="animate-spin h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== DELETION TAB (root only) ===== */}
      {activeTab === 'deletion' && isRoot && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Hesap Silme Talepleri</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                Yalnızca Root
              </span>
            </div>
            <div className="flex gap-2">
              {(['all', 'pending_admin', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDeletionFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    deletionFilter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Tümü' : f === 'pending_admin' ? 'Onay Bekleyen' : f === 'approved' ? 'Silinen' : 'Reddedilen'}
                </button>
              ))}
            </div>
          </div>

          {loadingDeletion ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-red-600" />
            </div>
          ) : deletionRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Trash2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Görüntülenecek hesap silme talebi bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {deletionRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{req.member?.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">
                            {req.lookup_type === 'email' ? 'E-posta' : 'Telefon'} ile talep: {req.lookup_value}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 ml-13">
                        {req.member?.email && <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-gray-400" />{req.member.email}</div>}
                        {req.member?.phone && <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-400" />{req.member.phone}</div>}
                      </div>
                    </div>
                    <div className="ml-4">{getStatusBadge(req.status)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleString('tr-TR')}</p>
                    {req.status === 'pending_admin' && (
                      <button
                        onClick={() => { setSelectedDeletion(req); setDeletionNotes(''); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
                      >
                        <Eye className="h-4 w-4" />İncele & Onayla
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deletion Detail Modal */}
          {selectedDeletion && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Hesap Silme Onayı</h3>
                        <p className="text-xs text-red-600 font-semibold">Root yetki gerektiren işlem</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedDeletion(null); setDeletionNotes(''); }} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 font-medium">
                        Bu işlem geri alınamaz. Onaylarsanız üyenin hesabı ve tüm verileri kalıcı olarak silinir.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Üye Bilgileri</h4>
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Ad Soyad:</span><span className="font-medium">{selectedDeletion.member?.full_name || '—'}</span></div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><span className="text-gray-500">E-posta:</span><span className="font-medium">{selectedDeletion.member?.email || '—'}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Telefon:</span><span className="font-medium">{selectedDeletion.member?.phone || '—'}</span></div>
                    {selectedDeletion.member?.tc_identity_no && (
                      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-400" /><span className="text-gray-500">TC Kimlik:</span><span className="font-medium">{selectedDeletion.member.tc_identity_no}</span></div>
                    )}
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Talep:</span><span className="font-medium">{new Date(selectedDeletion.created_at).toLocaleString('tr-TR')}</span></div>
                    {selectedDeletion.code_verified_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-500">Üye onayı:</span>
                        <span className="text-green-600 font-medium">{new Date(selectedDeletion.code_verified_at).toLocaleString('tr-TR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yönetici Notu <span className="text-gray-400">(red için zorunlu)</span>
                    </label>
                    <textarea
                      value={deletionNotes}
                      onChange={(e) => setDeletionNotes(e.target.value)}
                      placeholder="İsteğe bağlı not ekleyin..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDeletionReject(selectedDeletion.id)}
                      disabled={processingDeletion}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                    >
                      {processingDeletion ? <Loader className="animate-spin h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      Reddet
                    </button>
                    <button
                      onClick={() => handleDeletionApprove(selectedDeletion.id)}
                      disabled={processingDeletion}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold shadow-sm"
                    >
                      {processingDeletion ? <Loader className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      Hesabı Kalıcı Sil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
