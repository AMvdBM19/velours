import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'worker') {
      return NextResponse.json({ error: 'Only workers have first login flow' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('workers')
      .update({ first_login: false })
      .eq('id', user.workerId)
      .eq('tenant_id', user.tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
