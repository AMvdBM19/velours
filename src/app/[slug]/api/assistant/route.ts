import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'AI Assistant is not yet implemented' },
    { status: 501 }
  );
}
