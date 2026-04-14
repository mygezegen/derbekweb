import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

interface ContactData {
  whatsapp_number?: string;
  phone?: string;
}

const QUICK_MESSAGES = [
  'Merhaba, bilgi almak istiyorum.',
  'Üyelik hakkında soru sormak istiyorum.',
  'Etkinlik hakkında bilgi alabilir miyim?',
  'Aidat ödemesi hakkında bilgi istiyorum.',
];

export default function WhatsAppScreen() {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    supabase
      .from('contact_info')
      .select('whatsapp_number, phone')
      .maybeSingle()
      .then(({ data }) => {
        setContact(data);
        setLoading(false);
      });
  }, []);

  const openWhatsApp = (message?: string) => {
    const number = contact?.whatsapp_number || contact?.phone;
    if (!number) return;
    const cleaned = number.replace(/\D/g, '');
    const fullNumber = cleaned.startsWith('0') ? `9${cleaned.slice(1)}` : cleaned.startsWith('90') ? cleaned : `90${cleaned}`;
    const encodedMsg = encodeURIComponent(message || 'Merhaba');
    Linking.openURL(`https://wa.me/${fullNumber}?text=${encodedMsg}`);
  };

  const openWhatsAppDirect = () => {
    const number = contact?.whatsapp_number || contact?.phone;
    if (!number) return;
    const cleaned = number.replace(/\D/g, '');
    const fullNumber = cleaned.startsWith('0') ? `9${cleaned.slice(1)}` : cleaned.startsWith('90') ? cleaned : `90${cleaned}`;
    Linking.openURL(`https://wa.me/${fullNumber}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const hasWhatsApp = !!(contact?.whatsapp_number || contact?.phone);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.hero}>
        <View style={styles.whatsappIcon}>
          <Ionicons name="logo-whatsapp" size={48} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>WhatsApp İletişim</Text>
        <Text style={styles.heroSubtitle}>Hızlı ve kolay mesaj gönderin</Text>
      </LinearGradient>

      {!hasWhatsApp ? (
        <View style={styles.noNumberBox}>
          <Ionicons name="warning-outline" size={36} color="#d97706" />
          <Text style={styles.noNumberTitle}>WhatsApp numarası bulunamadı</Text>
          <Text style={styles.noNumberText}>Yönetici panelinden iletişim bilgilerine WhatsApp numarası eklenmesi gerekmektedir.</Text>
        </View>
      ) : (
        <>
          <View style={styles.numberCard}>
            <Ionicons name="logo-whatsapp" size={24} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.numberLabel}>WhatsApp Numarası</Text>
              <Text style={styles.numberValue}>{contact?.whatsapp_number || contact?.phone}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.mainBtn} onPress={openWhatsAppDirect}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text style={styles.mainBtnText}>WhatsApp'ta Mesaj Gönder</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hızlı Mesajlar</Text>
            <Text style={styles.sectionSubtitle}>Hazır mesajlardan birini seçerek hızlıca gönderin</Text>
            {QUICK_MESSAGES.map((msg, i) => (
              <TouchableOpacity key={i} style={styles.quickMsg} onPress={() => openWhatsApp(msg)}>
                <Ionicons name="chatbubble-outline" size={16} color="#16a34a" />
                <Text style={styles.quickMsgText}>{msg}</Text>
                <Ionicons name="send" size={14} color="#16a34a" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özel Mesaj</Text>
            <Text style={styles.sectionSubtitle}>Kendi mesajınızı yazarak gönderin</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Mesajınızı buraya yazın..."
              placeholderTextColor="#9ca3af"
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !customMessage.trim() && styles.sendBtnDisabled]}
              onPress={() => {
                if (customMessage.trim()) {
                  openWhatsApp(customMessage.trim());
                  setCustomMessage('');
                }
              }}
              disabled={!customMessage.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Gönder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              Yukarıdaki butonlara tıkladığınızda WhatsApp uygulaması açılacaktır.
              WhatsApp uygulamasının telefonunuzda yüklü olması gerekmektedir.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    gap: 10,
  },
  whatsappIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  noNumberBox: {
    alignItems: 'center',
    margin: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  noNumberTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  noNumberText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  numberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  numberLabel: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  numberValue: { fontSize: 16, fontWeight: '700', color: '#15803d' },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 16,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  quickMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quickMsgText: { flex: 1, fontSize: 14, color: '#374151' },
  messageInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    minHeight: 100,
    marginBottom: 12,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
