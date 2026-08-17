import { NextRequest, NextResponse } from 'next/server';
import { products } from '@/data/products';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  const category = request.nextUrl.searchParams.get('category');
  const result = products.filter((product) => (!query || [product.name, ...product.tags].join(' ').toLowerCase().includes(query)) && (!category || product.category === category));
  return NextResponse.json({ products: result, count: result.length });
}
