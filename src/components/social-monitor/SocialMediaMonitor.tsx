import { useState } from 'react';
import { Hash, AtSign, TrendingUp, FileText, Cpu, Info } from 'lucide-react';
import { Member } from '../../types';
import { KeywordManager } from './KeywordManager';
import { AccountManager } from './AccountManager';
import { TrendAnalysisPanel } from './TrendAnalysisPanel';
import { AccountAnalysisPanel } from './AccountAnalysisPanel';
import { ReportsPanel } from './ReportsPanel';

interface Props {
  currentMember: Member;
}

type Tab = 'trends' | 'accounts-analysis' | 'keywords' | 'accounts' | 'reports';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'trends', label: 'Trend Analizi', icon: TrendingUp },
  { id: 'accounts-analysis', label: 'Hesap Analizi', icon: Cpu },
  { id: 'keywords', label: 'Anahtar Kelimeler', icon: Hash },
  { id: 'accounts', label: 'Hesaplar', icon: AtSign },
  { id: 'reports', label: 'Raporlar', icon: FileText },
];

export function SocialMediaMonitor({ currentMember }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('trends');

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sosyal Medya İzleme</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                YZ destekli trend analizi, hesap izleme ve otomatik raporlama
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Bu modül OpenAI YZ ile desteklenmektedir. Analizler gerçek zamanlı sosyal medya verisi yerine
              YZ'nin eğitim verileri ve genel bilgisine dayalı tahminler üretir.
              Gerçek sosyal medya API entegrasyonu için platforma özel API anahtarı gereklidir.
            </p>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === 'trends' && <TrendAnalysisPanel />}
          {activeTab === 'accounts-analysis' && <AccountAnalysisPanel />}
          {activeTab === 'keywords' && <KeywordManager currentMember={currentMember} />}
          {activeTab === 'accounts' && <AccountManager currentMember={currentMember} />}
          {activeTab === 'reports' && <ReportsPanel currentMember={currentMember} />}
        </div>
      </div>
    </div>
  );
}
