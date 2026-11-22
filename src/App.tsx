import { useCallback, useEffect, useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import CafeScene3D, { type CameraFocusKey } from './components/CafeScene3D';
import MenuCatalogSection from './components/MenuCatalogSection';
import ReservationSection from './components/ReservationSection';
import BagDrawer from './components/BagDrawer';
import OwnerStudioView from './components/OwnerStudioView';
import type {
  AtmospherePreset,
  CafeOrder,
  CafeState,
  CartLine,
  FulfillmentMethod,
  MenuCategory,
  OrderItem,
  OrderStatus,
  Reservation,
  ReservationStatus,
  StoreConfig,
  TableStatus,
} from './types/cafe';
import { ATMOSPHERE_DETAILS, FINISH_DETAILS } from './types/cafe';

export default function App() {
  const [state, setState] = useState<CafeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'storefront' | 'owner'>('storefront');
  const [activeFocus, setActiveFocus] = useState<CameraFocusKey>('overview');
  const [activeCategory, setActiveCategory] = useState<MenuCategory | 'all'>('all');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load cafe storefront data.');
      const data = (await res.json()) as CafeState;
      setState(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const handleUpdateConfig = async (partial: Partial<StoreConfig>) => {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error('Failed to update aesthetic configuration.');
    const data = (await res.json()) as { config: StoreConfig };
    setState((prev) => (prev ? { ...prev, config: data.config } : prev));
  };

  const handleSelectAtmosphere = (atmosphere: AtmospherePreset) => {
    setState((prev) =>
      prev ? { ...prev, config: { ...prev.config, atmosphere } } : prev
    );
    handleUpdateConfig({ atmosphere }).catch(() => undefined);
  };

  const handleHotspotOrderCategory = (category: MenuCategory) => {
    setActiveCategory(category);
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectTableFrom3D = (tableId: string) => {
    setSelectedTableId(tableId);
    const el = document.getElementById('reserve');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddToBag = (item: OrderItem, image: string) => {
    const cartKey = [
      item.menuItemId,
      item.size ?? '',
      item.milk ?? '',
      item.grind ?? '',
      item.extraShot ? 'shot' : '',
      item.notes ?? '',
    ].join('|');

    setCart((prev) => {
      const existing = prev.find((l) => l.cartKey === cartKey);
      if (existing) {
        return prev.map((l) =>
          l.cartKey === cartKey ? { ...l, quantity: l.quantity + item.quantity } : l
        );
      }
      return [...prev, { ...item, cartKey, image }];
    });
    showToast(`Added ${item.quantity}x ${item.name} to bag`);
  };

  const handleUpdateCartQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.cartKey === cartKey ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const handleRemoveCartLine = (cartKey: string) => {
    setCart((prev) => prev.filter((l) => l.cartKey !== cartKey));
  };

  const handlePlaceOrder = async (payload: {
    customerName: string;
    customerPhone: string;
    fulfillment: FulfillmentMethod;
    tableCode?: string;
    address?: string;
    items: OrderItem[];
    promoCode?: string;
    tip: number;
  }): Promise<CafeOrder> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not place order.');
    setState((prev) =>
      prev ? { ...prev, menu: data.menu, orders: data.orders } : prev
    );
    setCart([]);
    return data.order as CafeOrder;
  };

  const handleCreateReservation = async (payload: {
    tableId: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    date: string;
    timeSlot: string;
    preOrderNotes?: string;
  }): Promise<Reservation> => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Reservation failed.');
    setState((prev) =>
      prev
        ? { ...prev, reservations: data.reservations, tables: data.tables }
        : prev
    );
    return data.reservation as Reservation;
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState((prev) => (prev ? { ...prev, orders: data.orders } : prev));
  };

  const handleUpdateTableStatus = async (tableId: string, status: TableStatus) => {
    const res = await fetch(`/api/tables/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState((prev) => (prev ? { ...prev, tables: data.tables } : prev));
  };

  const handleUpdateReservationStatus = async (resId: string, status: ReservationStatus) => {
    const res = await fetch(`/api/reservations/${resId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState((prev) =>
      prev
        ? { ...prev, reservations: data.reservations, tables: data.tables }
        : prev
    );
  };

  const handleUpdateMenuItem = async (
    itemId: string,
    patch: { price?: number; stock?: number; available?: boolean }
  ) => {
    const res = await fetch(`/api/menu/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState((prev) => (prev ? { ...prev, menu: data.menu } : prev));
  };

  const handleCreateMenuItem = async (payload: {
    name: string;
    category: MenuCategory;
    price: number;
    description: string;
    tastingNotes: string;
    originOrPrep: string;
    stock: number;
  }) => {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState((prev) => (prev ? { ...prev, menu: data.menu } : prev));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-800">
        <p className="font-display text-2xl">Preparing Aurora Roasters...</p>
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-900 p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-display font-semibold">Unable to Load Cafe Storefront</h1>
          <p className="text-sm text-stone-600">{loadError}</p>
          <button
            type="button"
            onClick={fetchState}
            className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { config, menu, tables, orders, reservations } = state;
  const isEvening = config.atmosphere === 'evening';
  const totalBagItems = cart.reduce((sum, l) => sum + l.quantity, 0);
  const openTablesCount = tables.filter((t) => t.status === 'available').length;

  const pageThemeClass = isEvening
    ? 'bg-[#141210] text-stone-100'
    : config.atmosphere === 'golden'
    ? 'bg-[#f3ede3] text-stone-900'
    : 'bg-[#f6f3ee] text-stone-900';

  const headerThemeClass = isEvening
    ? 'bg-[#141210]/95 border-stone-800 text-stone-100'
    : 'bg-[#f6f3ee]/95 border-stone-200 text-stone-900';

  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageThemeClass}`}>
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between gap-8 ${headerThemeClass}`}
      >
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#cafe-3d"
          onClick={() => setViewMode('storefront')}
          className="font-display text-2xl font-semibold tracking-tight whitespace-nowrap shrink-0"
        >
          {config.cafeName}
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <a
            href="#cafe-3d"
            onClick={() => {
              setViewMode('storefront');
              setActiveFocus('overview');
            }}
            className={`hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${
              viewMode === 'storefront' ? '' : mutedText
            }`}
          >
            3D Cafe
          </a>
          <a
            href="#menu"
            onClick={() => setViewMode('storefront')}
            className={`hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${mutedText}`}
          >
            Menu &amp; Beans
          </a>
          <a
            href="#reserve"
            onClick={() => setViewMode('storefront')}
            className={`hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${mutedText}`}
          >
            Reserve Table
          </a>
          <button
            type="button"
            onClick={() => setViewMode('owner')}
            className={`hover:underline underline-offset-4 whitespace-nowrap shrink-0 ${
              viewMode === 'owner'
                ? 'text-amber-700 dark:text-amber-400 font-semibold'
                : mutedText
            }`}
          >
            Owner Studio
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setBagOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Bag ({totalBagItems})</span>
          </button>
        </div>
      </header>

      {/* Mobile quick nav row (keeps header 3-zone on desktop while giving phone users Owner Studio access) */}
      <div
        className={`md:hidden flex items-center justify-around border-b px-4 py-2 text-xs font-medium ${
          isEvening ? 'border-stone-800 text-stone-300' : 'border-stone-200 text-stone-700'
        }`}
      >
        <a href="#cafe-3d" onClick={() => setViewMode('storefront')}>
          3D Cafe
        </a>
        <a href="#menu" onClick={() => setViewMode('storefront')}>
          Menu
        </a>
        <a href="#reserve" onClick={() => setViewMode('storefront')}>
          Reserve
        </a>
        <button type="button" onClick={() => setViewMode('owner')}>
          Owner Studio
        </button>
      </div>

      {viewMode === 'owner' ? (
        <OwnerStudioView
          config={config}
          menu={menu}
          tables={tables}
          orders={orders}
          reservations={reservations}
          onUpdateConfig={handleUpdateConfig}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateTableStatus={handleUpdateTableStatus}
          onUpdateReservationStatus={handleUpdateReservationStatus}
          onUpdateMenuItem={handleUpdateMenuItem}
          onCreateMenuItem={handleCreateMenuItem}
          onBackToStorefront={() => setViewMode('storefront')}
        />
      ) : (
        <main>
          {/* Full-Viewport Interactive 3D Cafe */}
          <CafeScene3D
            config={config}
            tables={tables}
            selectedTableId={selectedTableId}
            activeFocus={activeFocus}
            onFocusChange={setActiveFocus}
            onSelectAtmosphere={handleSelectAtmosphere}
            onHotspotOrderCategory={handleHotspotOrderCategory}
            onSelectTableFrom3D={handleSelectTableFrom3D}
          />

          {/* 4-Column Aesthetic-to-Commerce Connectivity Strip */}
          <section
            className={`border-b ${
              isEvening ? 'bg-stone-900/70 border-stone-800' : 'bg-white/75 border-stone-200'
            }`}
          >
            <div className="max-w-7xl mx-auto px-6 py-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className={`text-xs ${mutedText}`}>01. Live Cafe Atmosphere</p>
                <p className="mt-1 text-base font-semibold">
                  {ATMOSPHERE_DETAILS[config.atmosphere].label}
                </p>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  {ATMOSPHERE_DETAILS[config.atmosphere].hoursHint}
                </p>
              </div>
              <div>
                <p className={`text-xs ${mutedText}`}>02. Spatial Materiality</p>
                <p className="mt-1 text-base font-semibold">
                  {FINISH_DETAILS[config.surfaceFinish].label}
                </p>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  {FINISH_DETAILS[config.surfaceFinish].materialNote}
                </p>
              </div>
              <div>
                <p className={`text-xs ${mutedText}`}>03. Live Floor Seating</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {openTablesCount} of {tables.length} Tables Open
                </p>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  Click any 3D table to reserve
                </p>
              </div>
              <div>
                <p className={`text-xs ${mutedText}`}>04. Espresso Bar Lead Time</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  ~{config.pickupLeadMinutes} min counter pickup
                </p>
                <p className={`mt-0.5 text-xs ${mutedText}`}>{config.openHours}</p>
              </div>
            </div>
          </section>

          {/* Editorial Brand Statement connected to Atmosphere */}
          <section className="max-w-7xl mx-auto px-6 pt-14 pb-2">
            <div className="max-w-3xl">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {config.activeRoastNote}
              </p>
              <h1 className="mt-3 text-4xl md:text-5xl font-display font-semibold tracking-tight leading-[1.1] text-balance">
                {config.tagline}
              </h1>
              <p className={`mt-4 text-base leading-relaxed max-w-2xl ${mutedText}`}>
                {ATMOSPHERE_DETAILS[config.atmosphere].editorialNote}
              </p>
            </div>
          </section>

          {/* Menu & Whole Bean Commerce */}
          <MenuCatalogSection
            menu={menu}
            config={config}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onAddToBag={handleAddToBag}
            isEvening={isEvening}
          />

          {/* 3D-Synced Physical Table Booking */}
          <ReservationSection
            tables={tables}
            selectedTableId={selectedTableId}
            onSelectTable={(id) => setSelectedTableId(id)}
            onCreateReservation={handleCreateReservation}
            isEvening={isEvening}
          />
        </main>
      )}

      {/* Clean Quiet Footer */}
      <footer
        className={`border-t px-6 py-10 mt-12 ${
          isEvening ? 'border-stone-800 text-stone-400' : 'border-stone-200 text-stone-600'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-display text-base font-semibold text-current">
              {config.cafeName}
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{config.openHours}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Promo code ROAST10 for 10% off</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#menu" onClick={() => setViewMode('storefront')} className="hover:underline">
              Order Menu
            </a>
            <a href="#reserve" onClick={() => setViewMode('storefront')} className="hover:underline">
              Book Table
            </a>
            <button
              type="button"
              onClick={() => {
                setViewMode('owner');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:underline"
            >
              Owner Operations Studio
            </button>
          </div>
        </div>
      </footer>

      {/* Cart & Checkout Drawer */}
      <BagDrawer
        open={bagOpen}
        onClose={() => setBagOpen(false)}
        cart={cart}
        tables={tables}
        pickupLeadMinutes={config.pickupLeadMinutes}
        recentOrders={orders}
        onUpdateQty={handleUpdateCartQty}
        onRemoveLine={handleRemoveCartLine}
        onPlaceOrder={handlePlaceOrder}
        isEvening={isEvening}
      />

      {/* Non-intrusive Add-to-Bag Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-stone-900 text-stone-50 border border-stone-700 px-4 py-3 text-xs font-medium shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null);
              setBagOpen(true);
            }}
            className="ml-2 underline text-amber-300"
          >
            View Bag
          </button>
        </div>
      )}
    </div>
  );
}
