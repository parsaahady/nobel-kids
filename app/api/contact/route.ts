import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.phone || !body.message) return NextResponse.json({ ok: false, message: 'اطلاعات فرم کامل نیست.' }, { status: 400 });
  return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() });
}
