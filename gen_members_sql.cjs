const fs = require('fs');
const csv = fs.readFileSync('/tmp/cc-agent/63741995/project/extracted_csv.csv', 'utf8').replace(/^\uFEFF/, '');
const lines = csv.split('\n').filter(l => l.trim());
const dataLines = lines.slice(1).filter(l => !l.startsWith('Uye_No,'));

function excelDateToISO(value) {
  if (!value || value.trim() === '') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  return null;
}

function normalizePhone(raw) {
  if (!raw || raw.trim() === '') return null;
  const val = raw.trim();
  if (val.toLowerCase().includes('e+') || val.toLowerCase().includes('e-')) {
    const num = Math.round(parseFloat(val));
    const s = num.toString();
    return s.length > 10 ? s.substring(0, 10) : s;
  }
  const digits = val.replace(/[^0-9]/g, '');
  if (digits.length === 0) return null;
  if (digits.length > 10) return digits.substring(0, 10);
  return digits;
}

function generateEmail(fullName, memberNo, tcNo) {
  const slug = fullName.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'.');
  const suffix = memberNo.replace(/[^a-z0-9]/gi,'').toLowerCase() || tcNo.slice(-4);
  return slug + '.' + suffix + '@uye.local';
}

function mapGender(val) {
  if (!val || val.trim() === '') return null;
  if (val.trim().toUpperCase() === 'ERKEK') return 'male';
  if (val.trim().toUpperCase() === 'KADIN') return 'female';
  return 'other';
}

function escSql(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

let validCount = 0;
let skipCount = 0;
const rows = [];

for (const line of dataLines) {
  const cols = line.split(',');
  const Uye_No = (cols[0] || '').trim();
  const TC_No = (cols[1] || '').trim();
  const Ad_Soyad = (cols[2] || '').trim();
  const Baba_Adi = (cols[3] || '').trim();
  const Ana_Adi = (cols[4] || '').trim();
  const Meslek = (cols[8] || '').trim();
  const Ogrenim_Durumu = (cols[9] || '').trim();
  const Cinsiyet = (cols[11] || '').trim();
  const Uyelik_Tarihi = (cols[13] || '').trim();
  const Il = (cols[14] || '').trim();
  const Ilce = (cols[15] || '').trim();
  const Adres = (cols[16] || '').trim();
  const E_Posta = (cols[17] || '').trim();
  const Telefon_No = (cols[18] || '').trim();
  const Uyelik_Durumu = (cols[19] || 'Aktif').trim();

  if (!TC_No || !/^\d{11}$/.test(TC_No)) { skipCount++; continue; }
  if (!Ad_Soyad) { skipCount++; continue; }

  const email = E_Posta || generateEmail(Ad_Soyad, Uye_No, TC_No);
  const rawPhone = normalizePhone(Telefon_No);
  const phone = rawPhone && rawPhone.length >= 10 ? rawPhone : '00000000000';
  const regDate = excelDateToISO(Uyelik_Tarihi);
  const gender = mapGender(Cinsiyet);
  const isActive = Uyelik_Durumu !== 'Pasif';

  validCount++;
  rows.push(
    "(gen_random_uuid(), " + escSql(Ad_Soyad) + ", " + escSql(email) + ", '" + phone + "', " +
    escSql(Adres) + ", " + isActive + ", " + escSql(regDate) + ", " + escSql(Uye_No) + ", '" +
    TC_No + "', " + escSql(gender) + ", " + escSql(Meslek) + ", " + escSql(Ogrenim_Durumu) + ", " +
    escSql(Il) + ", " + escSql(Ilce) + ", " + escSql(Baba_Adi) + ", " + escSql(Ana_Adi) + ")"
  );
}

process.stderr.write('Valid: ' + validCount + ' Skip: ' + skipCount + '\n');

const sql = "INSERT INTO members (id, full_name, email, phone, address, is_active, registration_date, registry_number, tc_identity_no, gender, profession, education_level, province, district, father_name, mother_name)\nVALUES\n" + rows.join(',\n') + "\nON CONFLICT (email) DO NOTHING;";

fs.writeFileSync('/tmp/cc-agent/63741995/project/members_insert.sql', sql);
process.stderr.write('SQL written\n');
process.stderr.write('SQL length: ' + sql.length + '\n');
process.stderr.write('Rows: ' + rows.length + '\n');
