export type WholesaleOrderPayload = {
  customer: Record<string, FormDataEntryValue>;
  cart: unknown[];
  shipping: string;
  payment: string;
  total: number;
  totalPacks: number;
  totalPieces: number;
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function submitWholesaleOrder(payload: WholesaleOrderPayload) {
  await wait(650);
  const orderCode = `NBL-W-${Math.floor(100000 + Math.random() * 900000)}`;
  try {
    const previous = JSON.parse(localStorage.getItem('nobel-orders') || '[]');
    localStorage.setItem('nobel-orders', JSON.stringify([{ ...payload, orderCode, createdAt: new Date().toISOString() }, ...previous]));
  } catch { /* Storage may be unavailable in private browsing. */ }
  return { ok: true, orderCode };
}

export async function submitContactMessage(payload: Record<string, FormDataEntryValue>) {
  await wait(500);
  try {
    const previous = JSON.parse(localStorage.getItem('nobel-contact-messages') || '[]');
    localStorage.setItem('nobel-contact-messages', JSON.stringify([{ ...payload, createdAt: new Date().toISOString() }, ...previous]));
  } catch { /* Storage may be unavailable in private browsing. */ }
  return { ok: true };
}
