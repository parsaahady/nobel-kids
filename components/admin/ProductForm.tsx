'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Box, Check, ImagePlus, Plus, Star, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { CategoryDTO, ProductDetailDTO } from '@/types';

type ColorRow = { name: string; hex: string };
type TierRow = { minPacks: number; percent: number };
type ImageRow = { url: string; alt: string; isPrimary: boolean };

type Props = {
  productId: string | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductForm({ productId, categories, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<ProductDetailDTO | null>(null);
  const [colors, setColors] = useState<ColorRow[]>([{ name: '', hex: '#dddddd' }]);
  const [sizes, setSizes] = useState<string[]>(['']);
  const [tiers, setTiers] = useState<TierRow[]>([{ minPacks: 3, percent: 4 }, { minPacks: 6, percent: 8 }]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!productId) return;
    api.get<{ product: ProductDetailDTO }>(`/api/admin/products/${productId}`)
      .then(({ product }) => {
        setDetail(product);
        setColors(product.colors.map((c) => ({ name: c.name, hex: c.hex ?? '#dddddd' })));
        setSizes(product.sizes.map((s) => s.label));
        setTiers(product.tiers.length ? product.tiers.map((t) => ({ minPacks: t.minPacks, percent: t.discountBps / 100 })) : tiers);
        setImages(product.gallery.map((img) => ({ url: img.url, alt: img.alt ?? product.name, isPrimary: img.isPrimary })));
        setTagsInput(product.tags.join('، '));
      })
      .catch(() => setError('دریافت محصول ممکن نشد'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const addImageFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append('files', file);
      form.append('folder', 'products');
      const stored = await api.upload<{ files: Array<{ url: string }> }>('/api/admin/upload', form);
      setImages((prev) => [
        ...prev,
        ...stored.files.map((file, index) => ({ url: file.url, alt: '', isPrimary: prev.length === 0 && index === 0 })),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'بارگذاری تصویر ممکن نشد');
    } finally {
      setUploading(false);
    }
  };

  const moveImage = (index: number, delta: number) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || '').trim() || null;
    const payload = {
      name: String(form.get('name') || '').trim(),
      slug: String(form.get('slug') || '').trim() || undefined,
      shortName: text('shortName'),
      sku: text('sku'),
      description: text('description'),
      shortDescription: text('shortDescription'),
      categoryId: String(form.get('categoryId')),
      price: Number(form.get('price')),
      comparePrice: form.get('comparePrice') ? Number(form.get('comparePrice')) : null,
      stock: Number(form.get('stock')),
      packSize: Number(form.get('packSize') || 5),
      status: String(form.get('status')) as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
      featured: form.get('featured') === 'on',
      isNew: form.get('isNew') === 'on',
      isBestSeller: form.get('isBestSeller') === 'on',
      gender: text('gender'),
      material: text('material'),
      collection: text('collection'),
      seoTitle: text('seoTitle'),
      seoDescription: text('seoDescription'),
      tags: tagsInput.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
      colors: colors.map((c) => ({ name: c.name.trim(), hex: c.hex })).filter((c) => c.name),
      sizes: sizes.map((s) => s.trim()).filter(Boolean),
      tiers: tiers.filter((t) => t.minPacks > 0 && t.percent > 0).map((t) => ({ minPacks: t.minPacks, discountBps: Math.round(t.percent * 100) })),
      images: images.map((img, index) => ({ url: img.url, alt: img.alt || String(form.get('name')), isPrimary: img.isPrimary, sortOrder: index })),
    };
    try {
      if (productId) await api.patch(`/api/admin/products/${productId}`, payload);
      else await api.post('/api/admin/products', payload);
      onSaved();
    } catch (err) {
      const details = err instanceof ApiError && Array.isArray(err.details)
        ? ` (${(err.details as Array<{ path: string }>).map((d) => d.path).join(', ')})`
        : '';
      setError((err instanceof ApiError ? err.message : 'ذخیره محصول ممکن نشد') + details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="modal-backdrop form-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="admin-product-modal wide" onSubmit={submit} initial={{ opacity: 0, y: 25, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><Box /><span><strong>{productId ? 'ویرایش محصول' : 'افزودن مدل عمده'}</strong><small>{productId ? detail?.name : 'اطلاعات کامل فروش عمده مدل'}</small></span></div>
          <button type="button" onClick={onClose} aria-label="بستن"><X /></button>
        </div>

        {loading ? <div className="admin-loading"><span className="custom-loader" /></div> : (
          <div className="product-form-body">
            {error && <small className="form-error-text block">{error}</small>}

            <div className="form-cols">
              <div className="form-col">
                <label className="stacked"><span>نام مدل *</span><input name="name" required defaultValue={detail?.name} placeholder="نام دقیق مدل" /></label>
                <div className="two"><label className="stacked"><span>نامک (slug)</span><input name="slug" defaultValue={detail?.slug} dir="ltr" placeholder="my-product-slug" /></label><label className="stacked"><span>نام کوتاه</span><input name="shortName" defaultValue={detail?.shortName ?? ''} /></label></div>
                <div className="two"><label className="stacked"><span>SKU</span><input name="sku" defaultValue={detail?.sku} dir="ltr" placeholder="NBL-..." /></label><label className="stacked"><span>دسته‌بندی *</span><select name="categoryId" defaultValue={detail?.category.id ?? categories[0]?.id}>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label></div>
                <div className="three">
                  <label className="stacked"><span>قیمت هر عدد (تومان) *</span><input name="price" type="number" min={1000} required defaultValue={detail?.price ?? 650000} /></label>
                  <label className="stacked"><span>قیمت قبل تخفیف</span><input name="comparePrice" type="number" defaultValue={detail?.comparePrice ?? ''} placeholder="—" /></label>
                  <label className="stacked"><span>موجودی (پک) *</span><input name="stock" type="number" min={0} required defaultValue={detail?.stock ?? 10} /></label>
                </div>
                <div className="three">
                  <label className="stacked"><span>تعداد هر پک</span><input name="packSize" type="number" min={1} defaultValue={detail?.packSize ?? 5} /></label>
                  <label className="stacked"><span>جنسیت</span><select name="gender" defaultValue={detail?.gender ?? 'دخترانه'}><option>دخترانه</option><option>پسرانه</option><option>یونیسکس</option><option>نوزادی</option></select></label>
                  <label className="stacked"><span>کالکشن</span><input name="collection" defaultValue={detail?.collection ?? ''} placeholder="ست راحتی" /></label>
                </div>
                <label className="stacked"><span>جنس پارچه</span><input name="material" defaultValue={detail?.material ?? ''} placeholder="دورس پنبه‌ای" /></label>
                <label className="stacked"><span>توضیح کوتاه</span><input name="shortDescription" defaultValue={detail?.shortDescription ?? ''} /></label>
                <label className="stacked"><span>توضیح کامل</span><textarea name="description" rows={4} defaultValue={detail?.description ?? ''} /></label>
                <label className="stacked"><span>برچسب‌ها (با ویرگول جدا کنید)</span><input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="دورس، گلدوزی، آزاد" /></label>
              </div>

              <div className="form-col">
                <div className="form-subcard">
                  <strong>وضعیت و نمایش</strong>
                  <label className="stacked"><span>وضعیت</span><select name="status" defaultValue={detail?.status ?? 'ACTIVE'}><option value="ACTIVE">فعال (نمایش در فروشگاه)</option><option value="DRAFT">پیش‌نویس</option><option value="ARCHIVED">بایگانی</option></select></label>
                  <label className="checkbox-row"><input type="checkbox" name="featured" defaultChecked={detail?.featured} /><span>منتخب صفحه اصلی</span></label>
                  <label className="checkbox-row"><input type="checkbox" name="isNew" defaultChecked={detail?.isNew ?? true} /><span>نشان «جدید»</span></label>
                  <label className="checkbox-row"><input type="checkbox" name="isBestSeller" defaultChecked={detail?.isBestSeller} /><span>نشان «پرفروش»</span></label>
                </div>

                <div className="form-subcard">
                  <strong>سئو</strong>
                  <label className="stacked"><span>عنوان سئو</span><input name="seoTitle" defaultValue={detail?.seoTitle ?? ''} /></label>
                  <label className="stacked"><span>توضیح سئو</span><textarea name="seoDescription" rows={2} defaultValue={detail?.seoDescription ?? ''} /></label>
                </div>

                <div className="form-subcard">
                  <strong>تصاویر محصول</strong>
                  <div className="image-uploader">
                    {images.map((img, index) => (
                      <div className={`image-thumb ${img.isPrimary ? 'primary' : ''}`} key={img.url + index}>
                        <Image src={img.url} alt={img.alt || 'تصویر محصول'} fill sizes="110px" />
                        <div className="thumb-actions">
                          <button type="button" onClick={() => moveImage(index, +1)} aria-label="جلو"><ArrowRight /></button>
                          <button type="button" onClick={() => moveImage(index, -1)} aria-label="عقب"><ArrowLeft /></button>
                          <button type="button" onClick={() => setImages((prev) => prev.map((row, i) => ({ ...row, isPrimary: i === index })))} className={img.isPrimary ? 'active' : ''} title="تصویر اصلی"><Star /></button>
                          <button type="button" onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))} title="حذف"><Trash2 /></button>
                        </div>
                        {img.isPrimary && <em>اصلی</em>}
                      </div>
                    ))}
                    <label className={`image-drop ${uploading ? 'busy' : ''}`}>
                      {uploading ? <span className="custom-loader" /> : <ImagePlus />}
                      <small>{uploading ? 'در حال بارگذاری…' : 'بارگذاری تصاویر'}</small>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => void addImageFiles(e.target.files).then(() => { e.target.value = ''; })} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-subcard">
              <strong>رنگ‌ها *</strong>
              <div className="color-rows">
                {colors.map((color, index) => (
                  <div className="color-row" key={index}>
                    <input type="color" value={color.hex.length === 4 || color.hex.length === 7 ? color.hex : '#dddddd'} onChange={(e) => setColors((prev) => prev.map((row, i) => i === index ? { ...row, hex: e.target.value } : row))} />
                    <input value={color.name} onChange={(e) => setColors((prev) => prev.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} placeholder="نام رنگ (مثلاً صورتی چرک)" />
                    <button type="button" onClick={() => setColors((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)} aria-label="حذف"><Trash2 /></button>
                  </div>
                ))}
                <button type="button" className="mini-add" onClick={() => setColors((prev) => [...prev, { name: '', hex: '#dddddd' }])}><Plus /> افزودن رنگ</button>
              </div>
            </div>

            <div className="form-subcard">
              <strong>سایزها *</strong>
              <div className="size-chip-editor">
                {sizes.map((size, index) => (
                  <span className="size-chip" key={index}>
                    <input value={size} onChange={(e) => setSizes((prev) => prev.map((row, i) => i === index ? e.target.value : row))} placeholder="۴–۵ سال" />
                    <button type="button" onClick={() => setSizes((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)} aria-label="حذف"><X /></button>
                  </span>
                ))}
                <button type="button" className="mini-add" onClick={() => setSizes((prev) => [...prev, ''])}><Plus /> افزودن سایز</button>
              </div>
            </div>

            <div className="form-subcard">
              <strong>تخفیف پلکانی</strong>
              <small className="hint">اگر سطری خالی بماند قیمت‌گذاری پیش‌فرض فروشگاه (۳ پک ۴٪ و ۶ پک ۸٪) اعمال می‌شود.</small>
              <div className="tier-rows">
                {tiers.map((tier, index) => (
                  <div className="tier-row" key={index}>
                    <span>از</span>
                    <input type="number" min={1} value={tier.minPacks} onChange={(e) => setTiers((prev) => prev.map((row, i) => i === index ? { ...row, minPacks: Number(e.target.value) } : row))} />
                    <span>پک</span>
                    <input type="number" min={0} max={90} step={0.5} value={tier.percent} onChange={(e) => setTiers((prev) => prev.map((row, i) => i === index ? { ...row, percent: Number(e.target.value) } : row))} />
                    <span>٪ تخفیف</span>
                    <button type="button" onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))} aria-label="حذف"><Trash2 /></button>
                  </div>
                ))}
                <button type="button" className="mini-add" onClick={() => setTiers((prev) => [...prev, { minPacks: 9, percent: 10 }])}><Plus /> افزودن پله</button>
              </div>
            </div>

            <div className="admin-modal-actions sticky-actions">
              <button type="button" className="secondary-button" onClick={onClose}>انصراف</button>
              <button className="primary-button" disabled={saving || uploading}>{saving ? <span className="custom-loader" /> : <>ذخیره مدل <Check /></>}</button>
            </div>
          </div>
        )}
      </motion.form>
    </motion.div>
  );
}
