import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Edit, Eye, Save, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { HTMLEditor } from './HTMLEditor';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  available_variables: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_key: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  sent_at: string;
}

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: templatesData } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: logsData } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (templatesData) setTemplates(templatesData);
      if (logsData) setEmailLogs(logsData);
    } catch (error) {
      console.error('Error loading email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      description: template.description || '',
      is_active: template.is_active,
    });
    setIsEditing(true);
    setIsPreviewing(false);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewing(true);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: formData.name,
          subject: formData.subject,
          html_content: formData.html_content,
          text_content: formData.text_content,
          description: formData.description,
          is_active: formData.is_active,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      setIsEditing(false);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Şablon kaydedilemedi!');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsPreviewing(false);
    setSelectedTemplate(null);
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    let previewHtml = selectedTemplate.html_content;
    if (selectedTemplate.available_variables && selectedTemplate.available_variables.length > 0) {
      selectedTemplate.available_variables.forEach(variable => {
        const regex = new RegExp(`{{${variable}}}`, 'g');
        previewHtml = previewHtml.replace(regex, `<span style="background-color: yellow; padding: 2px 4px;">[${variable}]</span>`);
      });
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Şablon Önizleme</h3>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2"><strong>Konu:</strong> {selectedTemplate.subject}</p>
          {selectedTemplate.available_variables && selectedTemplate.available_variables.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1"><strong>Kullanılabilir Değişkenler:</strong></p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.available_variables.map(variable => (
                  <span key={variable} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (isEditing && selectedTemplate) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Şablon Düzenle: {selectedTemplate.name}</h3>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şablon Adı
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-posta Konusu
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Değişkenler için {{variable_name}} kullanın"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML İçerik
            </label>
            <HTMLEditor
              value={formData.html_content}
              onChange={(value) => setFormData({ ...formData, html_content: value })}
              placeholder="E-posta içeriği buraya yazılacak..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Bu şablon ne için kullanılıyor?"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-emerald-600"
              />
              <span className="text-sm font-medium text-gray-700">Aktif</span>
            </label>
          </div>

          {selectedTemplate.available_variables && selectedTemplate.available_variables.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Kullanılabilir Değişkenler:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.available_variables.map(variable => (
                  <code key={variable} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {`{{${variable}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPreviewing && selectedTemplate) {
    return renderPreview();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="text-emerald-600" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">E-posta Şablonları</h2>
            <p className="text-gray-600">E-posta şablonlarını yönetin ve gönderim loglarını görüntüleyin</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Şablonlar ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Gönderim Logları ({emailLogs.length})
          </button>
        </div>

        {activeTab === 'templates' ? (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          Pasif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Anahtar:</strong> {template.template_key}
                    </p>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    )}
                    {template.available_variables && template.available_variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.available_variables.map(variable => (
                          <span key={variable} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Önizle"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Edit size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alıcı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Şablon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {log.status === 'sent' ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={18} />
                          <span className="text-sm">Gönderildi</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600" title={log.error_message || undefined}>
                          <XCircle size={18} />
                          <span className="text-sm">Başarısız</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{log.recipient_name || '-'}</p>
                        <p className="text-xs text-gray-500">{log.recipient_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{log.subject}</td>
                    <td className="px-4 py-3">
                      {log.template_key ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.template_key}</code>
                      ) : (
                        <span className="text-xs text-gray-500">Manuel</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(log.sent_at).toLocaleString('tr-TR')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {emailLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-30" />
                <p>Henüz e-posta gönderimi yapılmamış.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
