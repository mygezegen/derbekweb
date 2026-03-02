import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { batchSize = 20, offset = 0 } = await req.json().catch(() => ({}));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get total count first
    const { count: totalCount } = await supabaseClient
      .from('members')
      .select('*', { count: 'exact', head: true })
      .is('auth_id', null);

    // Get members without auth_id in batches
    const { data: membersWithoutAuth, error: membersError } = await supabaseClient
      .from('members')
      .select('id, email, full_name')
      .is('auth_id', null)
      .range(offset, offset + batchSize - 1);

    if (membersError) {
      throw new Error(`Üyeler alınamadı: ${membersError.message}`);
    }

    if (!membersWithoutAuth || membersWithoutAuth.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tüm üyelerin auth hesabı mevcut',
          synced: 0,
          failed: 0,
          total: totalCount || 0,
          remaining: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[],
    };

    // Process each member
    for (const member of membersWithoutAuth) {
      try {
        // Check if auth account already exists for this specific email
        const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
        const foundUser = existingUser?.users?.find(u => u.email === member.email);

        let authUserId: string;

        if (foundUser) {
          // Auth account exists, just link it
          authUserId = foundUser.id;
        } else {
          // Create new auth account
          const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}!`;

          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: member.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: member.full_name,
            },
          });

          if (authError || !authData.user) {
            throw new Error(`Auth hesabı oluşturulamadı: ${authError?.message || 'Bilinmeyen hata'}`);
          }

          authUserId = authData.user.id;
        }

        // Update member with auth_id
        const { error: updateError } = await supabaseClient
          .from('members')
          .update({ auth_id: authUserId })
          .eq('id', member.id);

        if (updateError) {
          throw new Error(`Member güncellenemedi: ${updateError.message}`);
        }

        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: member.email,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
        console.error(`Üye senkronizasyon hatası (${member.email}):`, error);
      }
    }

    const remaining = (totalCount || 0) - (offset + batchSize);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.synced} üye başarıyla senkronize edildi`,
        synced: results.synced,
        failed: results.failed,
        total: totalCount || 0,
        remaining: remaining > 0 ? remaining : 0,
        nextOffset: remaining > 0 ? offset + batchSize : null,
        errors: results.errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Senkronizasyon hatası:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
