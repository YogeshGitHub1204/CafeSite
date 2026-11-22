import { useState } from 'react';
import { CheckCircle2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type {
  CafeOrder,
  CafeTable,
  CartLine,
  FulfillmentMethod,
  OrderItem,
} from '../types/cafe';

interface BagDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  tables: CafeTable[];
  pickupLeadMinutes: number;
  recentOrders: CafeOrder[];
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveLine: (cartKey: string) => void;
  onPlaceOrder: (payload: {
    customerName: string;
    customerPhone: string;
    fulfillment: FulfillmentMethod;
    tableCode?: string;
    address?: string;
    items: OrderItem[];
    promoCode?: string;
    tip: number;
  }) => Promise<CafeOrder>;
  isEvening: boolean;
}

const TIP_PRESETS = [0, 2, 4, 6];

export default function BagDrawer({
  open,
  onClose,
  cart,
  tables,
  pickupLeadMinutes,
  recentOrders,
  onUpdateQty,
  onRemoveLine,
  onPlaceOrder,
  isEvening,
}: BagDrawerProps) {
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>('pickup');
  const [tableCode, setTableCode] = useState(tables[0]?.code ?? 'T1');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [tip, setTip] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  if (!open) return null;

  const subtotal =
    Math.round(cart.reduce((acc, l) => acc + l.price * l.quantity, 0) * 100) / 100;
  const promoApplied = promoCode.trim().toUpperCase() === 'ROAST10';
  const discount = promoApplied ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const total = Math.round((subtotal - discount + (cart.length > 0 ? tip : 0)) * 100) / 100;

  const trackedOrder = placedOrderId
    ? recentOrders.find((o) => o.id === placedOrderId) ?? null
    : null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await onPlaceOrder({
        customerName,
        customerPhone,
        fulfillment,
        tableCode: fulfillment === 'dine-in' ? tableCode : undefined,
        address: fulfillment === 'shipping' ? address : undefined,
        items: cart.map(({ cartKey: _ck, image: _img, ...rest }) => rest),
        promoCode: promoCode.trim() || undefined,
        tip,
      });
      setPlacedOrderId(order.id);
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setPromoCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const drawerBg = isEvening
    ? 'bg-stone-900 text-stone-100 border-stone-800'
    : 'bg-white text-stone-900 border-stone-200';
  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';
  const inputSurface = isEvening
    ? 'bg-stone-800 border-stone-700 text-stone-100'
    : 'bg-stone-50 border-stone-200 text-stone-900';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true">
      <div className={`w-full max-w-md h-full border-l flex flex-col shadow-2xl ${drawerBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-xl font-display font-semibold">Your Roastery Bag</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close bag drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Live Order Tracker when an order was placed */}
          {trackedOrder && (
            <div className="rounded-xl border border-emerald-600/35 bg-emerald-600/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Order {trackedOrder.orderNumber}
                </span>
                <span className="font-mono text-xs uppercase font-medium">
                  {trackedOrder.status}
                </span>
              </div>
              <p className="text-xs opacity-90">
                {trackedOrder.fulfillment === 'pickup' &&
                  `Counter pickup ready in ~${pickupLeadMinutes} min.`}
                {trackedOrder.fulfillment === 'dine-in' &&
                  `Delivering straight to Table ${trackedOrder.tableCode}.`}
                {trackedOrder.fulfillment === 'shipping' &&
                  `Fresh roast dispatching to ${trackedOrder.address}.`}
              </p>
              <div className="grid grid-cols-4 gap-1.5 pt-2">
                {(['queued', 'preparing', 'ready', 'completed'] as const).map((step, idx) => {
                  const steps = ['queued', 'preparing', 'ready', 'completed'];
                  const reached = steps.indexOf(trackedOrder.status) >= idx;
                  return (
                    <div key={step} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          reached ? 'bg-emerald-600' : 'bg-stone-300 dark:bg-stone-700'
                        }`}
                      />
                      <span className="block text-[10px] capitalize opacity-75">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-base font-medium">Your bag is currently empty</p>
              <p className={`text-xs ${mutedText}`}>
                Select espresso drinks, slow pour-overs, pastries, or whole bean bags from the bar menu.
              </p>
            </div>
          ) : (
            <>
              {/* Bag Items */}
              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {cart.map((line) => (
                  <div key={line.cartKey} className="py-4 first:pt-0 flex gap-3.5">
                    <img
                      src={line.image}
                      alt={line.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover bg-stone-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{line.name}</p>
                        <span className="font-mono text-sm tabular-nums shrink-0">
                          ${(line.price * line.quantity).toFixed(2)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs ${mutedText}`}>
                        {[line.size, line.milk, line.grind, line.extraShot ? 'Extra Shot' : null]
                          .filter(Boolean)
                          .join(' · ') || 'Standard preparation'}
                      </p>
                      {line.notes && (
                        <p className={`mt-0.5 text-xs italic ${mutedText}`}>“{line.notes}”</p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(line.cartKey, -1)}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-mono text-xs tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(line.cartKey, 1)}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveLine(line.cartKey)}
                          className={`p-1.5 rounded-lg hover:text-red-600 ${mutedText}`}
                          aria-label={`Remove ${line.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment & Checkout Form */}
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Fulfillment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['pickup', 'Pickup'],
                        ['dine-in', 'To Table'],
                        ['shipping', 'Ship Beans'],
                      ] as [FulfillmentMethod, string][]
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFulfillment(m)}
                        className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                          fulfillment === m
                            ? 'bg-amber-700 border-amber-700 text-white'
                            : 'border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {fulfillment === 'dine-in' && (
                  <div>
                    <label htmlFor="bag-table" className="block text-xs font-medium mb-1.5">
                      Deliver to Physical Table
                    </label>
                    <select
                      id="bag-table"
                      value={tableCode}
                      onChange={(e) => setTableCode(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.code} — {t.label} ({t.zone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {fulfillment === 'shipping' && (
                  <div>
                    <label htmlFor="bag-addr" className="block text-xs font-medium mb-1.5">
                      Delivery Address
                    </label>
                    <input
                      id="bag-addr"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="412 Mercer St, Apt 4B"
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bag-name" className="block text-xs font-medium mb-1.5">
                      Your Name
                    </label>
                    <input
                      id="bag-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Alex Rivera"
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="bag-phone" className="block text-xs font-medium mb-1.5">
                      Mobile
                    </label>
                    <input
                      id="bag-phone"
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="555-0124"
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label htmlFor="bag-promo" className="block text-xs font-medium mb-1.5">
                      Promo Code (try ROAST10)
                    </label>
                    <input
                      id="bag-promo"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="ROAST10"
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-mono uppercase ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Barista Tip</label>
                    <div className="grid grid-cols-4 gap-1">
                      {TIP_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTip(amt)}
                          className={`py-2 rounded-lg border font-mono text-xs tabular-nums ${
                            tip === amt
                              ? 'border-amber-700 bg-amber-700/15 text-amber-700 dark:text-amber-300 font-semibold'
                              : 'border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer Totals & Submit */}
        {cart.length > 0 && (
          <div className="px-6 py-5 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className={mutedText}>Subtotal</span>
                <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Promo (ROAST10 · 10% off)</span>
                  <span className="font-mono tabular-nums">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={mutedText}>Barista Tip</span>
                <span className="font-mono tabular-nums">${tip.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono tabular-nums">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full rounded-lg bg-amber-700 py-3 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending Order to Bar...' : `Place Order · $${total.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
