import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventData {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string;
}

interface SocialMediaConfig {
  platform: string;
  access_token: string;
  page_id: string;
  is_active: boolean;
  auto_post_events: boolean;
}

async function postToFacebook(
  config: SocialMediaConfig,
  event: EventData
): Promise<{ success: boolean; post_id?: string; post_url?: string; error?: string }> {
  try {
    const message = `${event.title}\n\n${event.description}\n\n📅 Tarih: ${new Date(event.event_date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n📍 Yer: ${event.location}`;

    let url = `https://graph.facebook.com/v18.0/${config.page_id}/feed`;
    const params: any = {
      message: message,
      access_token: config.access_token,
    };

    if (event.image_url) {
      url = `https://graph.facebook.com/v18.0/${config.page_id}/photos`;
      params.url = event.image_url;
      params.caption = message;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Facebook API error');
    }

    return {
      success: true,
      post_id: data.id,
      post_url: `https://facebook.com/${data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function postToInstagram(
  config: SocialMediaConfig,
  event: EventData
): Promise<{ success: boolean; post_id?: string; post_url?: string; error?: string }> {
  try {
    if (!event.image_url) {
      throw new Error('Instagram posts require an image');
    }

    const caption = `${event.title}\n\n${event.description}\n\n📅 ${new Date(event.event_date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n📍 ${event.location}`;

    const createMediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${config.page_id}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: event.image_url,
          caption: caption,
          access_token: config.access_token,
        }),
      }
    );

    const mediaData = await createMediaResponse.json();

    if (!createMediaResponse.ok) {
      throw new Error(mediaData.error?.message || 'Instagram media creation error');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${config.page_id}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: mediaData.id,
          access_token: config.access_token,
        }),
      }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      throw new Error(publishData.error?.message || 'Instagram publish error');
    }

    return {
      success: true,
      post_id: publishData.id,
      post_url: `https://instagram.com/p/${publishData.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_id, platforms } = await req.json();

    if (!event_id) {
      throw new Error('event_id is required');
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    const { data: configs, error: configError } = await supabase
      .from('social_media_config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw new Error('Failed to fetch social media configs');
    }

    const results = [];

    for (const config of configs || []) {
      if (platforms && !platforms.includes(config.platform)) {
        continue;
      }

      const { data: existingPost } = await supabase
        .from('event_social_posts')
        .select('id')
        .eq('event_id', event_id)
        .eq('platform', config.platform)
        .eq('status', 'published')
        .maybeSingle();

      if (existingPost) {
        results.push({
          platform: config.platform,
          status: 'skipped',
          message: 'Already posted to this platform',
        });
        continue;
      }

      const { data: postRecord } = await supabase
        .from('event_social_posts')
        .insert({
          event_id: event_id,
          platform: config.platform,
          status: 'pending',
        })
        .select()
        .single();

      let result;
      if (config.platform === 'facebook') {
        result = await postToFacebook(config, event);
      } else if (config.platform === 'instagram') {
        result = await postToInstagram(config, event);
      } else {
        result = { success: false, error: 'Unsupported platform' };
      }

      if (result.success && postRecord) {
        await supabase
          .from('event_social_posts')
          .update({
            status: 'published',
            post_id: result.post_id,
            post_url: result.post_url,
            posted_at: new Date().toISOString(),
          })
          .eq('id', postRecord.id);

        results.push({
          platform: config.platform,
          status: 'published',
          post_url: result.post_url,
        });
      } else if (postRecord) {
        await supabase
          .from('event_social_posts')
          .update({
            status: 'failed',
            error_message: result.error,
          })
          .eq('id', postRecord.id);

        results.push({
          platform: config.platform,
          status: 'failed',
          error: result.error,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
