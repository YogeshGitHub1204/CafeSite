export type AtmospherePreset = 'morning' | 'golden' | 'evening';
export type MaterialFinish = 'limestone' | 'walnut' | 'slate';
export type AccentMetal = 'brass' | 'obsidian';

export type MenuCategory = 'espresso' | 'pourover' | 'bakery' | 'beans';
export type TableStatus = 'available' | 'reserved' | 'occupied';
export type OrderStatus = 'queued' | 'preparing' | 'ready' | 'completed';
export type FulfillmentMethod = 'pickup' | 'dine-in' | 'shipping';
export type ReservationStatus = 'confirmed' | 'seated' | 'completed' | 'cancelled';

export interface StoreConfig {
  cafeName: string;
  tagline: string;
  atmosphere: AtmospherePreset;
  surfaceFinish: MaterialFinish;
  accentMetal: AccentMetal;
  featuredItemId: string;
  activeRoastNote: string;
  openHours: string;
  pickupLeadMinutes: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  tastingNotes: string;
  originOrPrep: string;
  image: string;
  stock: number;
  available: boolean;
  customizable: boolean;
  isBean?: boolean;
}

export interface CafeTable {
  id: string;
  code: string;
  label: string;
  zone: string;
  seats: number;
  status: TableStatus;
  x: number;
  z: number;
  shape: 'round' | 'communal';
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  milk?: string;
  grind?: string;
  extraShot?: boolean;
  notes?: string;
}

export interface CafeOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  fulfillment: FulfillmentMethod;
  tableCode?: string;
  address?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tip: number;
  total: number;
  promoCode?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Reservation {
  id: string;
  code: string;
  tableId: string;
  tableCode: string;
  tableLabel: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  date: string;
  timeSlot: string;
  preOrderNotes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface CafeState {
  config: StoreConfig;
  menu: MenuItem[];
  tables: CafeTable[];
  orders: CafeOrder[];
  reservations: Reservation[];
}

export interface CartLine extends OrderItem {
  cartKey: string;
  image: string;
}

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  espresso: 'Espresso Bar',
  pourover: 'Pour-Overs',
  bakery: 'Artisan Bakery',
  beans: 'Whole Beans',
};

export const ATMOSPHERE_DETAILS: Record<
  AtmospherePreset,
  {
    label: string;
    hoursHint: string;
    editorialNote: string;
  }
> = {
  morning: {
    label: 'Morning Limestone',
    hoursHint: '07:00 — 12:00',
    editorialNote: 'Crisp morning daylight across honed travertine, single-origin filter brews, and warm cardamom pastries.',
  },
  golden: {
    label: 'Golden Hour',
    hoursHint: '12:00 — 17:30',
    editorialNote: 'Low amber sunbeams across smoked oak counters, velvety cortados, and slow communal pours.',
  },
  evening: {
    label: 'Evening Roastery',
    hoursHint: '17:30 — 22:00',
    editorialNote: 'Intimate pendant glow, brushed brass reflections, decaf tonics, and freshly roasted evening lots.',
  },
};

export const FINISH_DETAILS: Record<MaterialFinish, { label: string; materialNote: string }> = {
  limestone: { label: 'Honed Limestone', materialNote: 'Warm Roman travertine & natural ash' },
  walnut: { label: 'Smoked Walnut', materialNote: 'Oil-rubbed walnut & warm plaster' },
  slate: { label: 'Architectural Slate', materialNote: 'Charcoal honed stone & blackened steel' },
};
