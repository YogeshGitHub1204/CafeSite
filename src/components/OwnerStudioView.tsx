import { useState } from 'react';
import { ArrowLeft, Check, Plus, RefreshCw } from 'lucide-react';
import type {
  AccentMetal,
  AtmospherePreset,
  CafeOrder,
  CafeTable,
  MaterialFinish,
  MenuCategory,
  MenuItem,
  OrderStatus,
  Reservation,
  ReservationStatus,
  StoreConfig,
  TableStatus,
} from '../types/cafe';
import { ATMOSPHERE_DETAILS, CATEGORY_LABELS, FINISH_DETAILS } from '../types/cafe';

interface OwnerStudioViewProps {
  config: StoreConfig;
  menu: MenuItem[];
  tables: CafeTable[];
  orders: CafeOrder[];
  reservations: Reservation[];
  onUpdateConfig: (partial: Partial<StoreConfig>) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onUpdateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  onUpdateReservationStatus: (resId: string, status: ReservationStatus) => Promise<void>;
  onUpdateMenuItem: (
    itemId: string,
    patch: { price?: number; stock?: number; available?: boolean }
  ) => Promise<void>;
  onCreateMenuItem: (payload: {
    name: string;
    category: MenuCategory;
    price: number;
    description: string;
    tastingNotes: string;
    originOrPrep: string;
    stock: number;
  }) => Promise<void>;
  onBackToStorefront: () => void;
}

type StudioTab = 'aesthetics' | 'orders' | 'floor' | 'inventory';

export default function OwnerStudioView({
  config,
  menu,
  tables,
  orders,
  reservations,
  onUpdateConfig,
  onUpdateOrderStatus,
  onUpdateTableStatus,
  onUpdateReservationStatus,
  onUpdateMenuItem,
  onCreateMenuItem,
  onBackToStorefront,
}: OwnerStudioViewProps) {
  const [tab, setTab] = useState<StudioTab>('aesthetics');
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const [tagline, setTagline] = useState(config.tagline);
  const [roastNote, setRoastNote] = useState(config.activeRoastNote);
  const [leadMinutes, setLeadMinutes] = useState(config.pickupLeadMinutes);

  // Add item form state
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<MenuCategory>('espresso');
  const [newPrice, setNewPrice] = useState('6.50');
  const [newStock, setNewStock] = useState('20');
  const [newNotes, setNewNotes] = useState('');

  const isEvening = config.atmosphere === 'evening';
  const cardSurface = isEvening
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900';
  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';
  const inputSurface = isEvening
    ? 'bg-stone-800 border-stone-700 text-stone-100'
    : 'bg-stone-50 border-stone-200 text-stone-900';

  const commitConfig = async (patch: Partial<StoreConfig>) => {
    setSavingConfig(true);
    try {
      await onUpdateConfig(patch);
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 1800);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateMenuItem({
      name: newName,
      category: newCat,
      price: Number(newPrice) || 6,
      description: 'Seasonal small-batch release added via Owner Studio.',
      tastingNotes: newNotes || 'Balanced sweetness · Clean finish',
      originOrPrep: CATEGORY_LABELS[newCat],
      stock: Number(newStock) || 15,
    });
    setNewName('');
    setNewNotes('');
  };

  const openTablesCount = tables.filter((t) => t.status === 'available').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'completed').length;
  const dailyRevenue = orders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div>
          <button
            type="button"
            onClick={onBackToStorefront}
            className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${mutedText}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to 3D Storefront</span>
          </button>
          <h1 className="mt-2 text-3xl md:text-4xl font-display font-semibold tracking-tight">
            Owner Operations &amp; Aesthetic Studio
          </h1>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Changes here sync live to both the 3D cafe diorama and the public commercial storefront.
          </p>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <p className={`text-xs ${mutedText}`}>Today Revenue</p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              ${dailyRevenue.toFixed(2)}
            </p>
          </div>
          <div>
            <p className={`text-xs ${mutedText}`}>Active Bar Queue</p>
            <p className="font-mono text-xl font-semibold tabular-nums">{activeOrdersCount}</p>
          </div>
          <div>
            <p className={`text-xs ${mutedText}`}>Open 3D Tables</p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {openTablesCount}/{tables.length}
            </p>
          </div>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div
        className={`inline-flex flex-wrap gap-1 p-1 rounded-xl border ${
          isEvening ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'
        }`}
      >
        {(
          [
            ['aesthetics', 'Aesthetic-to-Storefront Sync'],
            ['orders', `Barista Queue (${activeOrdersCount})`],
            ['floor', `3D Tables & Bookings (${reservations.length})`],
            ['inventory', `Menu & Stock (${menu.length})`],
          ] as [StudioTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === key
                ? isEvening
                  ? 'bg-amber-700 text-white'
                  : 'bg-white text-stone-900 shadow-sm'
                : isEvening
                ? 'text-stone-300 hover:text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Aesthetic Connectivity Studio */}
      {tab === 'aesthetics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-7 rounded-2xl border p-6 space-y-6 ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-semibold">
                  Physical Cafe Materials &amp; Lighting
                </h2>
                <p className={`text-xs ${mutedText}`}>
                  Controls the Three.js architectural finishes, sunlight angle, and website palette together.
                </p>
              </div>
              {savedFlag && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Synced Live
                </span>
              )}
            </div>

            {/* Atmosphere */}
            <div>
              <label className="block text-xs font-medium mb-2">Cafe Atmosphere &amp; Web Theme</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['morning', 'golden', 'evening'] as AtmospherePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => commitConfig({ atmosphere: preset })}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      config.atmosphere === preset
                        ? 'border-amber-700 bg-amber-700/10'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <p className="text-sm font-semibold">{ATMOSPHERE_DETAILS[preset].label}</p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      {ATMOSPHERE_DETAILS[preset].hoursHint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Counter & Floor Finish */}
            <div>
              <label className="block text-xs font-medium mb-2">
                Architectural Surface Material (3D Floor, Walls &amp; Bar Top)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['limestone', 'walnut', 'slate'] as MaterialFinish[]).map((fin) => (
                  <button
                    key={fin}
                    type="button"
                    onClick={() => commitConfig({ surfaceFinish: fin })}
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      config.surfaceFinish === fin
                        ? 'border-amber-700 bg-amber-700/10'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <p className="text-sm font-semibold">{FINISH_DETAILS[fin].label}</p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      {FINISH_DETAILS[fin].materialNote}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Espresso Machine & Pendant Metal */}
            <div>
              <label className="block text-xs font-medium mb-2">
                Espresso Hardware &amp; Pendant Trim
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['brass', 'Burnished Architectural Brass'],
                    ['obsidian', 'Matte Anodized Obsidian'],
                  ] as [AccentMetal, string][]
                ).map(([metal, label]) => (
                  <button
                    key={metal}
                    type="button"
                    onClick={() => commitConfig({ accentMetal: metal })}
                    className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                      config.accentMetal === metal
                        ? 'border-amber-700 bg-amber-700/10'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Editorial & Commercial Copy Sync */}
          <div className={`lg:col-span-5 rounded-2xl border p-6 space-y-5 ${cardSurface}`}>
            <h2 className="text-xl font-display font-semibold">
              Storefront &amp; 3D Menu Board Sync
            </h2>

            <div>
              <label htmlFor="cfg-featured" className="block text-xs font-medium mb-1.5">
                Featured Counter Spotlight Item
              </label>
              <select
                id="cfg-featured"
                value={config.featuredItemId}
                onChange={(e) => commitConfig({ featuredItemId: e.target.value })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              >
                {menu.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cfg-tagline" className="block text-xs font-medium mb-1.5">
                Storefront Editorial Tagline
              </label>
              <input
                id="cfg-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              />
            </div>

            <div>
              <label htmlFor="cfg-roast" className="block text-xs font-medium mb-1.5">
                3D Wall Board &amp; Roastery Lot Note
              </label>
              <input
                id="cfg-roast"
                type="text"
                value={roastNote}
                onChange={(e) => setRoastNote(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputSurface}`}
              />
            </div>

            <div>
              <label htmlFor="cfg-lead" className="block text-xs font-medium mb-1.5">
                Pickup Prep Lead Time (minutes)
              </label>
              <input
                id="cfg-lead"
                type="number"
                min={3}
                max={45}
                value={leadMinutes}
                onChange={(e) => setLeadMinutes(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-mono tabular-nums ${inputSurface}`}
              />
            </div>

            <button
              type="button"
              disabled={savingConfig}
              onClick={() =>
                commitConfig({
                  tagline,
                  activeRoastNote: roastNote,
                  pickupLeadMinutes: leadMinutes,
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{savingConfig ? 'Syncing...' : 'Publish Aesthetic & Copy Updates'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Live Order Queue (KDS) */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((order) => (
            <div key={order.id} className={`rounded-2xl border p-6 space-y-4 ${cardSurface}`}>
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {order.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{order.fulfillment}</span>
                    {order.tableCode && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Table {order.tableCode}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 text-base font-semibold">{order.customerName}</h3>
                </div>
                <span className="font-mono text-base font-medium tabular-nums">
                  ${order.total.toFixed(2)}
                </span>
              </div>

              <ul className="space-y-1.5 text-sm">
                {order.items.map((line, idx) => (
                  <li key={`${order.id}-${idx}`} className="flex justify-between gap-2">
                    <span>
                      <span className="font-mono tabular-nums">{line.quantity}x</span> {line.name}
                      {(line.size || line.milk || line.grind) && (
                        <span className={`block text-xs ${mutedText}`}>
                          {[line.size, line.milk, line.grind].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      ${(line.price * line.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium capitalize">Status: {order.status}</span>
                <div className="flex items-center gap-1.5">
                  {(['queued', 'preparing', 'ready', 'completed'] as OrderStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateOrderStatus(order.id, st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                        order.status === st
                          ? 'bg-amber-700 text-white'
                          : isEvening
                          ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: 3D Floor Tables & Reservations */}
      {tab === 'floor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-lg font-semibold">Live 3D Floor Tables</h2>
            {tables.map((tbl) => (
              <div
                key={tbl.id}
                className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${cardSurface}`}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {tbl.code} · {tbl.label}
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    {tbl.zone} · {tbl.seats} seats
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(['available', 'reserved', 'occupied'] as TableStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateTableStatus(tbl.id, st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                        tbl.status === st
                          ? 'bg-amber-700 text-white'
                          : isEvening
                          ? 'bg-stone-800 text-stone-300'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-lg font-semibold">Guest Reservations</h2>
            {reservations.map((res) => (
              <div
                key={res.id}
                className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {res.code}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {res.tableCode} ({res.tableLabel})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      {res.date} {res.timeSlot}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {res.customerName} ({res.partySize} guests)
                  </p>
                  {res.preOrderNotes && (
                    <p className={`mt-0.5 text-xs ${mutedText}`}>Note: {res.preOrderNotes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {(['confirmed', 'seated', 'completed', 'cancelled'] as ReservationStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateReservationStatus(res.id, st)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                          res.status === st
                            ? 'bg-amber-700 text-white'
                            : isEvening
                            ? 'bg-stone-800 text-stone-300'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Menu & Inventory Control */}
      {tab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-3">
            {menu.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${cardSurface}`}
              >
                <div className="min-w-0">
                  <p className={`text-xs ${mutedText}`}>{CATEGORY_LABELS[item.category]}</p>
                  <h3 className="text-sm font-semibold">{item.name}</h3>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm tabular-nums">${item.price.toFixed(2)}</span>

                  <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-700 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => onUpdateMenuItem(item.id, { stock: Math.max(0, item.stock - 1) })}
                      className="px-1.5 text-xs font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs w-8 text-center tabular-nums">
                      {item.stock}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMenuItem(item.id, { stock: item.stock + 5, available: true })
                      }
                      className="px-1.5 text-xs font-bold"
                    >
                      +5
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateMenuItem(item.id, { available: !item.available })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      item.available
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {item.available ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddMenu}
            className={`lg:col-span-4 rounded-2xl border p-6 space-y-4 h-fit ${cardSurface}`}
          >
            <h2 className="text-lg font-display font-semibold">Add Seasonal Release</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Item Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Smoked Maple Espresso Tonic"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as MenuCategory)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              >
                <option value="espresso">Espresso Bar</option>
                <option value="pourover">Pour-Overs</option>
                <option value="bakery">Artisan Bakery</option>
                <option value="beans">Whole Beans</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputSurface}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Initial Stock</label>
                <input
                  type="number"
                  min="1"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputSurface}`}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tasting Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Orange peel · Smoked maple · Bright crema"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-700 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publish to Menu</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
