import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-red-700" />
            <h1 className="text-lg font-bold text-gray-900">Gizlilik Politikası</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">

          <div>
            <p className="text-sm text-gray-500">Son güncelleme: Nisan 2026</p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Bu Gizlilik Politikası, Dernek mobil uygulaması ve web portalı ("Uygulama") aracılığıyla
              toplanan kişisel verilerin nasıl işlendiğini açıklamaktadır. Uygulamayı kullanarak bu
              politikayı kabul etmiş sayılırsınız.
            </p>
          </div>

          <Section title="1. Toplanan Veriler">
            <p>Uygulama aşağıdaki kişisel verileri toplar ve işler:</p>
            <ul className="mt-3 space-y-2">
              <Li>Ad, soyad ve üyelik sicil numarası</Li>
              <Li>E-posta adresi ve telefon numarası</Li>
              <Li>T.C. kimlik numarası (yalnızca üye doğrulama amacıyla)</Li>
              <Li>Adres bilgileri (il, ilçe, açık adres)</Li>
              <Li>Meslek ve cinsiyet bilgisi</Li>
              <Li>Aidat ödeme geçmişi ve borç durumu</Li>
              <Li>Etkinliklere katılım kayıtları</Li>
              <Li>Uygulama içi bildirim tercihleriniz</Li>
            </ul>
          </Section>

          <Section title="2. Verilerin Kullanım Amacı">
            <p>Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılmaktadır:</p>
            <ul className="mt-3 space-y-2">
              <Li>Üyelik kaydı oluşturma ve yönetimi</Li>
              <Li>Aidat takibi ve ödeme bildirimlerinin iletilmesi</Li>
              <Li>Dernek duyurularının ve etkinlik bilgilerinin paylaşılması</Li>
              <Li>Üye dizininin yönetimi ve iletişim kolaylığı</Li>
              <Li>Uygulama güvenliği ve kimlik doğrulaması</Li>
            </ul>
          </Section>

          <Section title="3. Verilerin Saklanması ve Güvenliği">
            <p>
              Kişisel verileriniz, Supabase altyapısı üzerinde şifreli olarak saklanmaktadır.
              Verilerinize erişim yalnızca yetkili dernek yöneticileriyle sınırlıdır. Üçüncü
              taraf reklam ağlarıyla veya pazarlama şirketleriyle hiçbir kişisel veri paylaşılmamaktadır.
            </p>
          </Section>

          <Section title="4. Üçüncü Taraf Hizmetler">
            <p>Uygulama aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:</p>
            <ul className="mt-3 space-y-2">
              <Li><strong>Supabase:</strong> Veritabanı ve kimlik doğrulama altyapısı</Li>
              <Li><strong>Expo / Apple Push Notification Service:</strong> Bildirim gönderimi</Li>
            </ul>
            <p className="mt-3">
              Bu hizmetlerin gizlilik politikaları, kendi web siteleri üzerinden incelenebilir.
            </p>
          </Section>

          <Section title="5. Veri Saklama Süresi">
            <p>
              Kişisel verileriniz üyeliğiniz aktif olduğu sürece saklanır. Hesabınızı silmeniz
              durumunda verileriniz en geç 30 gün içinde sistemden kalıcı olarak silinir.
              Yasal yükümlülük gerektiren finansal kayıtlar (aidat ve bağış bilgileri) mevzuata
              uygun süre boyunca anonimleştirilerek saklanabilir.
            </p>
          </Section>

          <Section title="6. Haklarınız">
            <p>Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="mt-3 space-y-2">
              <Li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</Li>
              <Li>Verilerinize erişim talep etme</Li>
              <Li>Yanlış veya eksik bilgilerin düzeltilmesini isteme</Li>
              <Li>Verilerinizin silinmesini talep etme</Li>
              <Li>Verilerinizin işlenmesine itiraz etme</Li>
            </ul>
            <p className="mt-3">
              Bu haklarınızı kullanmak için uygulama içinden veya dernek iletişim kanallarından
              bizimle iletişime geçebilirsiniz.
            </p>
          </Section>

          <Section title="7. Çocukların Gizliliği">
            <p>
              Uygulama, 13 yaşın altındaki kişilerden bilerek kişisel veri toplamamaktadır.
              13 yaş altı bir bireyin verisinin sisteme girildiğini fark ederseniz lütfen
              dernek yönetimiyle iletişime geçiniz.
            </p>
          </Section>

          <Section title="8. İletişim">
            <p>
              Bu politikayla ilgili sorularınız için derneğin resmi iletişim kanallarını
              kullanabilir ya da uygulamadaki "İletişim" bölümünden bize ulaşabilirsiniz.
            </p>
          </Section>

        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 leading-relaxed text-sm">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-700 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}
