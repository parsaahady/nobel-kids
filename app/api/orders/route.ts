import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.cart?.length) return NextResponse.json({ ok: false, message: 'سبد خرید خالی است.' }, { status: 400 });
  const orderCode = `NBL-W-${Math.floor(100000 + Math.random() * 900000)}`;
  return NextResponse.json({ ok: true, orderCode, createdAt: new Date().toISOString() });
}
