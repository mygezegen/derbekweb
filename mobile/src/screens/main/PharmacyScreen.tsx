import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Pharmacy {
  pharmacyID: number;
  pharmacyName: string;
  address: string;
  city: string;
  district: string;
  town: string | null;
  directions: string;
  phone: string;
  phone2: string | null;
  pharmacyDutyStart: string | null;
  pharmacyDutyEnd: string | null;
  latitude: number | null;
  longitude: number | null;
}

const ISTANBUL_DISTRICTS = [
  'Tümü', 'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu',
];

const SUPABASE_URL = 'https://twktxzhsrobccqmheotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a3R4emhzcm9iY2NxbWhlb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MTgsImV4cCI6MjA4Njc1ODgxOH0.AIrHUSnZVumPIKAPJDS0Ou9_obUkMm2_a7-jX0EF99c';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/İ/g, 'i').replace(/Ğ/g, 'g').replace(/Ü/g, 'u')
    .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function PharmacyScreen() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Tümü');
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchPharmacies = useCallback(async (district?: string) => {
    setLoading(true);
    setError('');
    setApiKeyMissing(false);
    setQuotaExceeded(false);

    try {
      const params = new URLSearchParams({ city: 'istanbul' });
      if (district && district !== 'Tümü') {
        params.set('district', slugify(district));
      }

      const url = `${SUPABASE_URL}/functions/v1/pharmacy-duty?${params}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      let result: Record<string, unknown>;
      try {
        result = await res.json();
      } catch {
        throw new Error(`HTTP ${res.status} - JSON parse hatası`);
      }

      if (!res.ok) {
        if (result.code === 'API_KEY_MISSING') { setApiKeyMissing(true); return; }
        if (result.code === 'QUOTA_EXCEEDED') { setQuotaExceeded(true); return; }
        throw new Error((result.error as string) || `HTTP ${res.status} hatası`);
      }

      const pharmacyData = result.data as Pharmacy[] | undefined;
      if (!pharmacyData || !Array.isArray(pharmacyData)) {
        throw new Error('Sunucudan geçersiz yanıt formatı alındı');
      }
      setPharmacies(pharmacyData);
      if (result.lastUpdated) setLastUpdated(result.lastUpdated as string);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies(selectedDistrict !== 'Tümü' ? selectedDistrict : undefined);
  }, [fetchPharmacies, selectedDistrict]);

  const filtered = pharmacies.filter((p) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      p.pharmacyName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
    );
  });

  const openMap = (lat: number | null, lng: number | null, name: string) => {
    const url = lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' istanbul')}`;
    Linking.openURL(url);
  };

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const renderPharmacy = ({ item }: { item: Pharmacy }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pharmacyName}>{item.pharmacyName}</Text>
          {item.town && <Text style={styles.pharmacyTown}>{item.town}</Text>}
        </View>
        <View style={styles.districtBadge}>
          <Text style={styles.districtBadgeText}>{item.district}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color="#6b7280" />
          <Text style={styles.infoText}>{item.address}</Text>
        </View>

        {item.directions ? (
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={15} color="#6b7280" />
            <Text style={[styles.infoText, { fontStyle: 'italic' }]}>{item.directions}</Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={15} color="#d97706" />
          <Text style={styles.infoText}>
            {formatDate(item.pharmacyDutyStart)} – {formatDate(item.pharmacyDutyEnd)}
          </Text>
        </View>

        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.phoneBtn} onPress={() => callPhone(item.phone)}>
            <Ionicons name="call" size={15} color="#fff" />
            <Text style={styles.phoneBtnText}>{item.phone}</Text>
          </TouchableOpacity>
          {item.phone2 && (
            <TouchableOpacity style={[styles.phoneBtn, { backgroundColor: '#16a34a' }]} onPress={() => callPhone(item.phone2!)}>
              <Ionicons name="call" size={15} color="#fff" />
              <Text style={styles.phoneBtnText}>{item.phone2}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => openMap(item.latitude, item.longitude, item.pharmacyName)}
        >
          <Ionicons name="map-outline" size={15} color="#4b5563" />
          <Text style={styles.mapBtnText}>Haritada Göster</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterBox}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Eczane adı veya adres ara..."
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity
          style={styles.districtSelector}
          onPress={() => setShowDistrictPicker(!showDistrictPicker)}
        >
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.districtSelectorText}>{selectedDistrict}</Text>
          <Ionicons name={showDistrictPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {showDistrictPicker && (
        <View style={styles.pickerOverlay}>
          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator>
            {ISTANBUL_DISTRICTS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pickerItem, selectedDistrict === d && styles.pickerItemActive]}
                onPress={() => { setSelectedDistrict(d); setShowDistrictPicker(false); }}
              >
                <Text style={[styles.pickerItemText, selectedDistrict === d && styles.pickerItemTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {apiKeyMissing && (
        <View style={styles.alertBox}>
          <Ionicons name="key-outline" size={20} color="#d97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>API Anahtarı Gerekli</Text>
            <Text style={styles.alertText}>Nöbetçi eczane için nosyapi.com üzerinden ücretsiz API anahtarı alınması gerekmektedir.</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.nosyapi.com')}>
              <Text style={styles.alertLink}>nosyapi.com - Ücretsiz Kayıt</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {quotaExceeded && (
        <View style={[styles.alertBox, { borderColor: '#fed7aa' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#ea580c" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: '#c2410c' }]}>NosyAPI Kredisi Tükendi</Text>
            <Text style={styles.alertText}>Hesabınıza kredi eklemeniz gerekmektedir.</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.eczaneler.gen.tr/nobetci-istanbul')}>
              <Text style={styles.alertLink}>Alternatif liste için tıklayın</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error ? (
        <View style={[styles.alertBox, { borderColor: '#fecaca' }]}>
          <Ionicons name="warning-outline" size={20} color="#dc2626" />
          <Text style={[styles.alertText, { flex: 1, color: '#dc2626' }]}>{error}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Nöbetçi eczaneler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.pharmacyID)}
          renderItem={renderPharmacy}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPharmacies(selectedDistrict !== 'Tümü' ? selectedDistrict : undefined);
              }}
              tintColor="#16a34a"
            />
          }
          ListHeaderComponent={
            lastUpdated ? (
              <Text style={styles.lastUpdated}>Son güncelleme: {lastUpdated}</Text>
            ) : null
          }
          ListEmptyComponent={
            !apiKeyMissing ? (
              <View style={styles.empty}>
                <Ionicons name="medkit-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Nöbetçi eczane bulunamadı</Text>
                <Text style={styles.emptyText}>Seçili ilçe veya arama kriterine uygun eczane yok</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  districtSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  districtSelectorText: { flex: 1, fontSize: 14, color: '#374151' },
  pickerOverlay: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pickerList: { maxHeight: 200 },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemActive: { backgroundColor: '#dcfce7' },
  pickerItemText: { fontSize: 14, color: '#374151' },
  pickerItemTextActive: { color: '#16a34a', fontWeight: '700' },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    padding: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  alertText: { fontSize: 13, color: '#78350f', lineHeight: 18 },
  alertLink: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginTop: 6 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  list: { padding: 16, paddingBottom: 32 },
  lastUpdated: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  pharmacyName: { fontSize: 15, fontWeight: '700', color: '#fff', lineHeight: 20 },
  pharmacyTown: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  districtBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  districtBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  cardBody: { padding: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 19 },
  phoneRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phoneBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
  },
  mapBtnText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
