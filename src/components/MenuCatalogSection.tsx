import { useState } from 'react';
import { Box, Coffee, Minus, Plus, X } from 'lucide-react';
import type { MenuCategory, MenuItem, OrderItem, StoreConfig } from '../types/cafe';
import { CATEGORY_LABELS } from '../types/cafe';
import ProductShowcase3D from './ProductShowcase3D';

interface MenuCatalogSectionProps {
  menu: MenuItem[];
  config: StoreConfig;
  activeCategory: MenuCategory | 'all';
  onCategoryChange: (cat: MenuCategory | 'all') => void;
  onAddToBag: (item: OrderItem, image: string) => void;
  isEvening: boolean;
}

const MILK_OPTIONS = ['Whole Farm Milk', 'Barista Oat (+0)', 'Almond Milk'];
const SIZE_OPTIONS = ['8 oz Standard', '12 oz Large'];
const GRIND_OPTIONS = [
  'Whole Bean',
  'Espresso (Fine)',
  'Pour-Over (Medium-Fine)',
  'French Press (Coarse)',
];

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-200 dark:bg-stone-800 text-stone-500 p-4">
        <Coffee className="w-8 h-8 mb-2 opacity-60" />
        <span className="text-xs font-medium text-center">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
}

export default function MenuCatalogSection({
  menu,
  config,
  activeCategory,
  onCategoryChange,
  onAddToBag,
  isEvening,
}: MenuCatalogSectionProps) {
  const [inspectedItemId, setInspectedItemId] = useState<string>(config.featuredItemId);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [size, setSize] = useState(SIZE_OPTIONS[0]);
  const [milk, setMilk] = useState(MILK_OPTIONS[0]);
  const [grind, setGrind] = useState(GRIND_OPTIONS[0]);
  const [extraShot, setExtraShot] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const inspectedItem =
    menu.find((m) => m.id === inspectedItemId) ??
    menu.find((m) => m.id === config.featuredItemId) ??
    menu[0];
  const filteredMenu =
    activeCategory === 'all' ? menu : menu.filter((m) => m.category === activeCategory);

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setSize(item.category === 'pourover' ? '300 ml Carafe' : SIZE_OPTIONS[0]);
    setMilk(item.category === 'espresso' ? MILK_OPTIONS[0] : '');
    setGrind(item.isBean ? GRIND_OPTIONS[0] : '');
    setExtraShot(false);
    setQuantity(1);
    setNotes('');
  };

  const handleConfirmAdd = () => {
    if (!customizingItem) return;
    const extraPrice = extraShot ? 1.5 : 0;
    onAddToBag(
      {
        menuItemId: customizingItem.id,
        name: customizingItem.name,
        price: Math.round((customizingItem.price + extraPrice) * 100) / 100,
        quantity,
        size: customizingItem.customizable && !customizingItem.isBean ? size : undefined,
        milk: customizingItem.category === 'espresso' ? milk : undefined,
        grind: customizingItem.isBean ? grind : undefined,
        extraShot,
        notes: notes.trim() || undefined,
      },
      customizingItem.image
    );
    setCustomizingItem(null);
  };

  const quickAdd = (item: MenuItem) => {
    if (item.customizable) {
      openCustomizer(item);
      return;
    }
    onAddToBag(
      {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      },
      item.image
    );
  };

  const cardSurface = isEvening
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900';
  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';

  return (
    <section id="menu" className="max-w-7xl mx-auto px-6 py-16">
      {/* Section Header + Category Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-stone-200/80 dark:border-stone-800">
        <div className="max-w-xl">
          <p className={`text-xs font-medium tracking-wide ${mutedText}`}>
            01. Bar Menu &amp; Roastery Release
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-semibold tracking-tight text-balance">
            Crafted behind the brass bar, shipped to your cup
          </h2>
        </div>

        <div
          className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border ${
            isEvening ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'
          }`}
        >
          {(
            [
              ['all', 'All Offerings'],
              ['espresso', 'Espresso Bar'],
              ['pourover', 'Pour-Overs'],
              ['bakery', 'Artisan Bakery'],
              ['beans', 'Whole Beans'],
            ] as [MenuCategory | 'all', string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === key
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
      </div>

      {/* Interactive 3D Product Turntable & Live Customizer */}
      {inspectedItem && (
        <ProductShowcase3D
          item={inspectedItem}
          allItems={menu}
          config={config}
          onSelectItem={(id) => setInspectedItemId(id)}
          onAddToBag={onAddToBag}
        />
      )}

      {/* 3-Column Commercial Product Grid */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {filteredMenu.map((item) => {
          const soldOut = !item.available || item.stock <= 0;
          return (
            <article
              key={item.id}
              className={`group flex flex-col rounded-2xl border overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 ${cardSurface}`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
                <ProductImage src={item.image} alt={item.name} />
              </div>

              <div className="flex-1 p-6 flex flex-col justify-between gap-5">
                <div>
                  <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
                    <span>{CATEGORY_LABELS[item.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{item.originOrPrep}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug">{item.name}</h3>
                    <span className="font-mono text-base font-medium tabular-nums shrink-0">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm leading-relaxed line-clamp-2 ${mutedText}`}>
                    {item.description}
                  </p>
                  <p className={`mt-2.5 text-xs ${mutedText}`}>{item.tastingNotes}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-stone-200/70 dark:border-stone-800">
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      soldOut
                        ? 'text-red-600 dark:text-red-400'
                        : item.stock <= 5
                        ? 'text-amber-700 dark:text-amber-400'
                        : mutedText
                    }`}
                  >
                    {soldOut ? 'Sold out' : `${item.stock} in stock`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedItemId(item.id);
                        document
                          .getElementById('product-studio-3d')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        isEvening
                          ? 'border-stone-700 text-stone-200 hover:bg-stone-800'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>3D View</span>
                    </button>

                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => quickAdd(item)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        soldOut
                          ? 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed'
                          : isEvening
                          ? 'bg-stone-100 text-stone-900 hover:bg-white'
                          : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
                      }`}
                    >
                      {soldOut ? 'Unavailable' : item.customizable ? 'Customize' : 'Add to Bag'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Item Customization Modal */}
      {customizingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customizer-title"
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-xl ${
              isEvening
                ? 'bg-stone-900 border-stone-700 text-stone-100'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <p className={`text-xs ${mutedText}`}>{CATEGORY_LABELS[customizingItem.category]}</p>
                <h3 id="customizer-title" className="mt-1 text-2xl font-display font-semibold">
                  {customizingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                aria-label="Close customization dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {customizingItem.category === 'espresso' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2">Cup Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSize(opt)}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-colors ${
                            size === opt
                              ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                              : 'border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2">Milk Selection</label>
                    <div className="grid grid-cols-3 gap-2">
                      {MILK_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMilk(opt)}
                          className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            milk === opt
                              ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                              : 'border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3.5 py-2.5 cursor-pointer">
                    <span className="text-xs font-medium">Add Extra Single-Origin Espresso Shot</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs tabular-nums">+$1.50</span>
                      <input
                        type="checkbox"
                        checked={extraShot}
                        onChange={(e) => setExtraShot(e.target.checked)}
                        className="h-4 w-4 accent-amber-700"
                      />
                    </div>
                  </label>
                </>
              )}

              {customizingItem.isBean && (
                <div>
                  <label className="block text-xs font-medium mb-2">Grind Specification (250g Bag)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GRIND_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGrind(opt)}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-colors ${
                          grind === opt
                            ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                            : 'border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="item-notes" className="block text-xs font-medium mb-1.5">
                  Barista Notes (optional)
                </label>
                <input
                  id="item-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Extra hot, light foam, or roast date preference"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 ${
                    isEvening
                      ? 'bg-stone-800 border-stone-700 text-stone-100'
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
                <div className="inline-flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-700 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono text-sm tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(customizingItem.stock, q + 1))}
                    className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="px-5 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors tabular-nums"
                >
                  Add to Bag · $
                  {((customizingItem.price + (extraShot ? 1.5 : 0)) * quantity).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
