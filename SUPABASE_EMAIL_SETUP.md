# Supabase E-posta Yapılandırması

Bu dokümanda Supabase'de e-posta ayarlarını nasıl yapacağınız açıklanmaktadır.

## 1. Şifre Sıfırlama URL'ini Güncelleme

Supabase Dashboard'da:

1. **Project Settings** > **Authentication** > **URL Configuration** bölümüne gidin
2. **Site URL** ayarını güncelleyin:
   - Yerel geliştirme: `http://localhost:5173`
   - Canlı site: `https://sizin-domain.netlify.app` (veya kendi domain'iniz)
3. **Redirect URLs** bölümüne şu URL'leri ekleyin:
   - `http://localhost:5173/reset-password`
   - `https://sizin-domain.netlify.app/reset-password`

## 2. E-posta Şablonunu Güncelleme

Supabase Dashboard'da:

1. **Authentication** > **Email Templates** bölümüne gidin
2. **Reset Password** şablonunu seçin
3. Şablon içeriğini aşağıdaki gibi güncelleyin:

```html
<h2>Şifre Sıfırlama</h2>

<p>Merhaba,</p>

<p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>

<p><a href="{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery">Şifremi Sıfırla</a></p>

<p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>

<p>Bu link 1 saat geçerlidir.</p>

<p>Saygılarımızla,<br>
Çüngüş Çaybaşı Köyü Derneği</p>
```

## 3. SMTP Yapılandırması (info@caybasi.org için)

E-postaların info@caybasi.org adresinden gönderilmesi için:

### Adım 1: SMTP Bilgilerini Edinin

E-posta sağlayıcınızdan (örn. Google Workspace, Outlook, Yandex) SMTP bilgilerini alın:
- SMTP Host (örn: smtp.gmail.com)
- SMTP Port (genellikle 587)
- Kullanıcı adı (info@caybasi.org)
- Şifre veya App Password

### Adım 2: Supabase'de SMTP Ayarları

1. **Project Settings** > **Authentication** > **SMTP Settings** bölümüne gidin
2. **Enable Custom SMTP** seçeneğini aktif edin
3. Bilgileri girin:
   - **Sender Email**: `info@caybasi.org`
   - **Sender Name**: `Çüngüş Çaybaşı Köyü Derneği`
   - **Host**: SMTP host adresiniz
   - **Port**: SMTP port numaranız
   - **Username**: info@caybasi.org
   - **Password**: SMTP şifreniz
4. **Save** butonuna tıklayın

### Gmail Kullanıyorsanız

1. Google hesabınızda 2FA (İki Faktörlü Doğrulama) aktif olmalı
2. [App Passwords](https://myaccount.google.com/apppasswords) sayfasından uygulama şifresi oluşturun
3. Bu şifreyi Supabase SMTP ayarlarında kullanın

**Gmail SMTP Bilgileri:**
- Host: `smtp.gmail.com`
- Port: `587`
- Username: `info@caybasi.org`
- Password: Uygulama şifreniz

## 4. E-posta Şablonlarını Özelleştirme

Diğer e-posta şablonlarını da özelleştirebilirsiniz:

### Confirm Signup (Hesap Onaylama)
```html
<h2>Hoş Geldiniz!</h2>
<p>Hesabınızı onaylamak için aşağıdaki linke tıklayın:</p>
<p><a href="{{ .ConfirmationURL }}">Hesabımı Onayla</a></p>
```

### Magic Link (Sihirli Link)
```html
<h2>Giriş Linki</h2>
<p>Giriş yapmak için aşağıdaki linke tıklayın:</p>
<p><a href="{{ .ConfirmationURL }}">Giriş Yap</a></p>
```

## 5. Test Etme

1. Uygulamada "Şifremi Unuttum" butonuna tıklayın
2. E-posta adresinizi girin
3. Gelen e-postadaki linke tıklayın
4. Yeni şifrenizi girin

## Sorun Giderme

### E-posta gelmiyor
- Spam/Gereksiz klasörünü kontrol edin
- SMTP ayarlarının doğru olduğundan emin olun
- Supabase Dashboard'da Logs bölümünden hata mesajlarını kontrol edin

### Link çalışmıyor
- Site URL'nin doğru olduğundan emin olun
- Redirect URLs listesini kontrol edin
- Browser cache'i temizleyin

### SMTP bağlantı hatası
- Firewall ayarlarını kontrol edin
- SMTP port'unun doğru olduğundan emin olun (genellikle 587 veya 465)
- Username ve password'ün doğru olduğundan emin olun

## Önemli Notlar

- SMTP ayarları yapıldıktan sonra tüm e-postalar info@caybasi.org adresinden gönderilecektir
- Şifre sıfırlama linkleri 1 saat geçerlidir
- Güvenlik için mutlaka SSL/TLS kullanın (Port 587)
- SMTP şifrenizi kimseyle paylaşmayın
