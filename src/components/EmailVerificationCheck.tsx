import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import EmailVerificationFlow from './EmailVerificationFlow';

interface EmailVerificationCheckProps {
  children: React.ReactNode;
}

export default function EmailVerificationCheck({ children }: EmailVerificationCheckProps) {
  const [needsVerification, setNeedsVerification] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!member) {
        setLoading(false);
        return;
      }

      setMemberData(member);

      const needsEmailUpdate = member.email.endsWith('@uye.local');

      if (!needsEmailUpdate) {
        setLoading(false);
        return;
      }

      const { data: existingRequest } = await supabase
        .from('email_update_requests')
        .select('*')
        .eq('member_id', member.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (existingRequest) {
        setLoading(false);
        return;
      }

      const { data: contact } = await supabase
        .from('contact_info')
        .select('whatsapp_number')
        .limit(1)
        .maybeSingle();

      setContactInfo(contact);
      setNeedsVerification(true);
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (needsVerification && memberData) {
    const whatsappUrl = contactInfo?.whatsapp_number
      ? `https://wa.me/${contactInfo.whatsapp_number.replace(/\D/g, '')}`
      : 'https://wa.me/';

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8 px-4">
        <EmailVerificationFlow
          memberId={memberData.id}
          memberEmail={memberData.email}
          memberPhone={memberData.phone_number}
          memberName={memberData.full_name}
          tcIdentityNo={memberData.tc_identity_no}
          birthDate={memberData.birth_date}
          whatsappUrl={whatsappUrl}
        />
      </div>
    );
  }

  return <>{children}</>;
}