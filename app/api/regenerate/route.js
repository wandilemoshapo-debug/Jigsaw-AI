import { createClient } from '@supabase/supabase-js';
import { generateOutreachMessage } from '@/lib/ai/index.cjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { leadId } = await req.json();

    const { data: lead } = await supabase
      .from('discovered_leads')
      .select('*, website_reports(*)')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const report = lead.website_reports?.[0]?.report_json || null;
    const message = await generateOutreachMessage(lead, report);

    const { error } = await supabase
      .from('outreach_messages')
      .insert({
        lead_id: leadId,
        channel: 'email',
        message_body: message,
        status: 'draft'
      });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, message });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}