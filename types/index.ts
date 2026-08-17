export type Product = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  gallery: string[];
  category: 'دخترانه' | 'پسرانه' | 'نوزادی' | 'اکسسوری';
  collection: string;
  gender: 'دخترانه' | 'پسرانه' | 'یونیسکس';
  colors: { name: string; hex: string }[];
  sizes: string[];
  material: string;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  rating: number;
  tags: string[];
};

export type CartItem = {
  productId: number;
  quantity: number;
  size: string;
  color: string;
};
