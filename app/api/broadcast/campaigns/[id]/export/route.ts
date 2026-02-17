import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: recipients, error } = await supabase
      .from('broadcast_recipients')
      .select(`
        *,
        contact:contacts(name)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch recipients' },
        { status: 500 }
      );
    }

    // Generate CSV
    const headers = ['Nama', 'Nomor', 'Status', 'Terkirim', 'Delivered', 'Dibaca', 'Error'];
    const rows = recipients?.map(r => [
      r.contact?.name || '-',
      r.phone_number,
      r.status,
      r.sent_at || '-',
      r.delivered_at || '-',
      r.read_at || '-',
      r.error_message || '-'
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign-recipients-${id}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error in export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
