'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Plus, Star } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice } from '@/data/products';
import { PACK_SIZE } from '@/data/wholesale';
import { useStore } from './Providers';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const liked = wishlist.includes(product.id);

  const quickAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    addToCart({ productId: product.id, quantity: 1, size: 'جور سایز', color: product.colors[0].name }, { image: product.image, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <motion.article className="product-card" whileHover={{ y: -7 }} transition={{ duration: .25 }}>
      <div className="product-media">
        <Link href={`/products/${product.slug}`} aria-label={product.name}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw" priority={priority} />
        </Link>
        <div className="product-badges">
          {product.isNew && <span className="new-badge">جدید</span>}
          {product.oldPrice && <span className="sale-badge">تخفیف</span>}
        </div>
        <button className={`wishlist-button ${liked ? 'liked' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label="افزودن به علاقه‌مندی"><Heart fill={liked ? 'currentColor' : 'none'} /></button>
        <span className="pack-badge">پک {PACK_SIZE.toLocaleString('fa-IR')} عددی</span>
        <button className="quick-add" onClick={quickAdd}><Plus /> <span>افزودن یک پک</span></button>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{product.collection}</span><span><Star size={13} fill="currentColor" />{product.rating.toLocaleString('fa-IR')}</span></div>
        <Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
        <div className="product-bottom"><div className="price wholesale-price"><small>قیمت همکاری هر عدد</small><strong>{formatPrice(product.price)}</strong><span>تومان</span>{product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}<em>جمع پک: {formatPrice(product.price * PACK_SIZE)} تومان</em></div><div className="swatches">{product.colors.slice(0, 3).map((color) => <i key={color.name} title={color.name} style={{ backgroundColor: color.hex }} />)}</div></div>
      </div>
    </motion.article>
  );
}
