'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/pricing';
import type { ProductListItemDTO } from '@/types';
import { useStore } from './Providers';

export default function ProductCard({ product, priority = false }: { product: ProductListItemDTO; priority?: boolean }) {
  const { addToCart, toggleWishlist, wishlistIds } = useStore();
  const liked = wishlistIds.includes(product.id);
  const outOfStock = product.stock <= 0;

  const quickAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (outOfStock || product.colors.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    await addToCart(
      {
        productId: product.id,
        packMode: 'assorted',
        colorName: product.colors[0].name,
        sizeLabel: 'جور سایز',
        packCount: 1,
      },
      product.image ? { image: product.image, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
    );
  };

  return (
    <motion.article className={`product-card ${outOfStock ? 'out-of-stock' : ''}`} whileHover={{ y: -7 }} transition={{ duration: 0.25 }}>
      <div className="product-media">
        <Link href={`/products/${product.slug}`} aria-label={product.name}>
          {product.image && (
            <Image src={product.image} alt={product.name} fill sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw" priority={priority} />
          )}
        </Link>
        <div className="product-badges">
          {product.isNew && <span className="new-badge">جدید</span>}
          {product.comparePrice && product.comparePrice > product.price && <span className="sale-badge">تخفیف</span>}
        </div>
        <button className={`wishlist-button ${liked ? 'liked' : ''}`} onClick={() => void toggleWishlist(product.id)} aria-label="افزودن به علاقه‌مندی">
          <Heart fill={liked ? 'currentColor' : 'none'} />
        </button>
        <span className="pack-badge">پک {product.packSize.toLocaleString('fa-IR')} عددی</span>
        {outOfStock ? (
          <span className="quick-add disabled">ناموجود</span>
        ) : (
          <button className="quick-add" onClick={quickAdd}><Plus /> <span>افزودن یک پک</span></button>
        )}
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.collection ?? product.category.name}</span>
          {outOfStock && <span className="stock-pill out">ناموجود</span>}
          {!outOfStock && product.stock <= 5 && <span className="stock-pill low">تنها {product.stock.toLocaleString('fa-IR')} پک</span>}
        </div>
        <Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
        <div className="product-bottom">
          <div className="price wholesale-price">
            <small>قیمت همکاری هر عدد</small>
            <strong>{formatPrice(product.price)}</strong>
            <span>تومان</span>
            {product.comparePrice && product.comparePrice > product.price && <del>{formatPrice(product.comparePrice)}</del>}
            <em>جمع پک: {formatPrice(product.price * product.packSize)} تومان</em>
          </div>
          <div className="swatches">
            {product.colors.slice(0, 3).map((color) => (
              <i key={color.name} title={color.name} style={{ backgroundColor: color.hex ?? '#ddd' }} />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
