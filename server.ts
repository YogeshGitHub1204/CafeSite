import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  AccentMetal,
  AtmospherePreset,
  CafeOrder,
  CafeState,
  CafeTable,
  MaterialFinish,
  MenuItem,
  OrderItem,
  OrderStatus,
  Reservation,
  ReservationStatus,
  TableStatus,
} from './src/types/cafe.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'cafe-store.json');

const IMAGE_ESPRESSO = '/src/assets/images/cafe_espresso_signature_1795355456144.jpg';
const IMAGE_POUROVER = '/src/assets/images/cafe_pourover_craft_1795355455436.jpg';
const IMAGE_PASTRY = '/src/assets/images/cafe_artisan_pastry_1795355455314.jpg';
const IMAGE_BEANS = '/src/assets/images/cafe_whole_beans_1795355455178.jpg';

function buildInitialState(): CafeState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    config: {
      cafeName: 'Aurora Roasters',
      tagline: 'Where tactile architecture meets small-batch roasting.',
      atmosphere: 'morning',
      surfaceFinish: 'limestone',
      accentMetal: 'brass',
      featuredItemId: 'item-cortado',
      activeRoastNote: 'Ethiopia Yirgacheffe · Lot #14 · Bergamot & White Peach',
      openHours: 'Daily 07:00 — 21:00',
      pickupLeadMinutes: 8,
    },
    menu: [
      {
        id: 'item-cortado',
        name: 'House Brass Cortado',
        category: 'espresso',
        price: 5.5,
        description:
          'Equal parts double ristretto pulled on our brass lever bar and silky micro-textured farm milk.',
        tastingNotes: 'Toasted hazelnut · Dark cacao · Brown sugar',
        originOrPrep: 'Espresso Bar · 4.5 oz Ceramic',
        image: IMAGE_ESPRESSO,
        stock: 42,
        available: true,
        customizable: true,
      },
      {
        id: 'item-honey-latte',
        name: 'Salted Wildflower Latte',
        category: 'espresso',
        price: 6.75,
        description:
          'Single-origin espresso layered with raw wildflower honey, flaky sea salt, and steamed oat or whole milk.',
        tastingNotes: 'Wildflower honey · Caramelized fig · Velvet crema',
        originOrPrep: 'Espresso Bar · 10 oz / 12 oz',
        image: IMAGE_ESPRESSO,
        stock: 34,
        available: true,
        customizable: true,
      },
      {
        id: 'item-v60-geisha',
        name: 'Yirgacheffe Halo V60',
        category: 'pourover',
        price: 7.5,
        description:
          'Hand-poured through a ribbed glass dripper at 93°C using our copper gooseneck kettle.',
        tastingNotes: 'Bergamot · Jasmine blossom · Meyer lemon',
        originOrPrep: 'Slow Bar · Washed Process · 300 ml',
        image: IMAGE_POUROVER,
        stock: 18,
        available: true,
        customizable: true,
      },
      {
        id: 'item-kalita-colombia',
        name: 'Huila Pink Bourbon Kalita',
        category: 'pourover',
        price: 7.0,
        description:
          'Flat-bottomed wave extraction highlighting crisp stone-fruit acidity and cane sweetness.',
        tastingNotes: 'Blood orange · Red plum · Raw panela',
        originOrPrep: 'Slow Bar · Honey Process · 300 ml',
        image: IMAGE_POUROVER,
        stock: 15,
        available: true,
        customizable: true,
      },
      {
        id: 'item-cardamom-knot',
        name: 'Laminated Cardamom Knot',
        category: 'bakery',
        price: 5.75,
        description:
          '27-layer cultured butter brioche twisted by hand with freshly cracked green cardamom and pearl sugar.',
        tastingNotes: 'Green cardamom · Cultured butter · Citrus zest',
        originOrPrep: 'Morning Bake · Warmed to Order',
        image: IMAGE_PASTRY,
        stock: 14,
        available: true,
        customizable: false,
      },
      {
        id: 'item-pain-chocolat',
        name: 'Valrhona Pain au Chocolat',
        category: 'bakery',
        price: 6.0,
        description:
          'Crisp honeycomb pastry folded around two batons of 70% dark Guayaquil chocolate.',
        tastingNotes: '70% dark cacao · Browned butter · Crisp flake',
        originOrPrep: 'Morning Bake · Small Batch',
        image: IMAGE_PASTRY,
        stock: 11,
        available: true,
        customizable: false,
      },
      {
        id: 'item-bean-obsidian',
        name: 'Aurora Obsidian Espresso',
        category: 'beans',
        price: 22.0,
        description:
          'Our flagship espresso blend roasted in small 12kg drum batches for syrupy body and chocolate depth.',
        tastingNotes: 'Bittersweet chocolate · Roasted almond · Black cherry',
        originOrPrep: 'Whole Bean / Custom Grind · 250g',
        image: IMAGE_BEANS,
        stock: 28,
        available: true,
        customizable: true,
        isBean: true,
      },
      {
        id: 'item-bean-linen',
        name: 'Aurora Linen Single Origin',
        category: 'beans',
        price: 25.0,
        description:
          'Light-medium roast Ethiopian heirloom lot crafted for pour-over clarity and floral aromatics.',
        tastingNotes: 'Jasmine tea · White peach · Meyer lemon',
        originOrPrep: 'Whole Bean / Custom Grind · 250g',
        image: IMAGE_BEANS,
        stock: 19,
        available: true,
        customizable: true,
        isBean: true,
      },
    ],
    tables: [
      {
        id: 'tbl-1',
        code: 'T1',
        label: 'Window Two-Top',
        zone: 'Facade Sunlight',
        seats: 2,
        status: 'available',
        x: -3.2,
        z: 2.4,
        shape: 'round',
      },
      {
        id: 'tbl-2',
        code: 'T2',
        label: 'Garden Alcove',
        zone: 'Facade Sunlight',
        seats: 2,
        status: 'reserved',
        x: -0.6,
        z: 2.6,
        shape: 'round',
      },
      {
        id: 'tbl-3',
        code: 'T3',
        label: 'Espresso Bar Bistro',
        zone: 'Main Floor',
        seats: 4,
        status: 'available',
        x: 2.4,
        z: 2.1,
        shape: 'round',
      },
      {
        id: 'tbl-4',
        code: 'T4',
        label: 'Lounge Timber Round',
        zone: 'Quiet Corner',
        seats: 4,
        status: 'occupied',
        x: -3.0,
        z: -0.3,
        shape: 'round',
      },
      {
        id: 'tbl-5',
        code: 'T5',
        label: 'Roastery Communal Oak',
        zone: 'Roastery View',
        seats: 6,
        status: 'available',
        x: 0.4,
        z: -0.2,
        shape: 'communal',
      },
    ],
    orders: [
      {
        id: 'ord-seed-1',
        orderNumber: 'AR-1041',
        customerName: 'Elena Vance',
        customerPhone: '555-0148',
        fulfillment: 'dine-in',
        tableCode: 'T4',
        items: [
          {
            menuItemId: 'item-cortado',
            name: 'House Brass Cortado',
            price: 5.5,
            quantity: 2,
            size: '4.5 oz',
            milk: 'Whole Milk',
          },
          {
            menuItemId: 'item-cardamom-knot',
            name: 'Laminated Cardamom Knot',
            price: 5.75,
            quantity: 1,
          },
        ],
        subtotal: 16.75,
        discount: 0,
        tip: 3.0,
        total: 19.75,
        status: 'preparing',
        createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
      },
      {
        id: 'ord-seed-2',
        orderNumber: 'AR-1042',
        customerName: 'Marcus Chen',
        customerPhone: '555-0192',
        fulfillment: 'pickup',
        items: [
          {
            menuItemId: 'item-v60-geisha',
            name: 'Yirgacheffe Halo V60',
            price: 7.5,
            quantity: 1,
            size: '300 ml',
          },
          {
            menuItemId: 'item-bean-linen',
            name: 'Aurora Linen Single Origin',
            price: 25.0,
            quantity: 1,
            grind: 'Pour-Over (Medium-Fine)',
          },
        ],
        subtotal: 32.5,
        discount: 0,
        tip: 4.0,
        total: 36.5,
        status: 'queued',
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
    ],
    reservations: [
      {
        id: 'res-seed-1',
        code: 'RES-208',
        tableId: 'tbl-2',
        tableCode: 'T2',
        tableLabel: 'Garden Alcove',
        customerName: 'Sora Takahashi',
        customerPhone: '555-0133',
        partySize: 2,
        date: today,
        timeSlot: '10:30',
        preOrderNotes: '2x Yirgacheffe Halo V60 on arrival',
        status: 'confirmed',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
    ],
  };
}

function loadStore(): CafeState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initial = buildInitialState();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw) as CafeState;
  } catch {
    const initial = buildInitialState();
    return initial;
  }
}

function saveStore(state: CafeState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist cafe store:', err);
  }
}

let store: CafeState = loadStore();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Full store read
  app.get('/api/state', (_req, res) => {
    res.json(store);
  });

  // Update Cafe Aesthetics & Storefront Connectivity
  app.patch('/api/config', (req, res) => {
    const allowedAtmospheres: AtmospherePreset[] = ['morning', 'golden', 'evening'];
    const allowedFinishes: MaterialFinish[] = ['limestone', 'walnut', 'slate'];
    const allowedMetals: AccentMetal[] = ['brass', 'obsidian'];

    const {
      atmosphere,
      surfaceFinish,
      accentMetal,
      featuredItemId,
      tagline,
      activeRoastNote,
      pickupLeadMinutes,
      openHours,
    } = req.body ?? {};

    if (atmosphere && allowedAtmospheres.includes(atmosphere)) {
      store.config.atmosphere = atmosphere;
    }
    if (surfaceFinish && allowedFinishes.includes(surfaceFinish)) {
      store.config.surfaceFinish = surfaceFinish;
    }
    if (accentMetal && allowedMetals.includes(accentMetal)) {
      store.config.accentMetal = accentMetal;
    }
    if (typeof featuredItemId === 'string' && store.menu.some((m) => m.id === featuredItemId)) {
      store.config.featuredItemId = featuredItemId;
    }
    if (typeof tagline === 'string' && tagline.trim().length > 0) {
      store.config.tagline = tagline.trim().slice(0, 140);
    }
    if (typeof activeRoastNote === 'string' && activeRoastNote.trim().length > 0) {
      store.config.activeRoastNote = activeRoastNote.trim().slice(0, 120);
    }
    if (typeof openHours === 'string' && openHours.trim().length > 0) {
      store.config.openHours = openHours.trim().slice(0, 60);
    }
    if (typeof pickupLeadMinutes === 'number' && Number.isFinite(pickupLeadMinutes)) {
      store.config.pickupLeadMinutes = Math.max(3, Math.min(45, Math.round(pickupLeadMinutes)));
    }

    saveStore(store);
    res.json({ config: store.config });
  });

  // Owner: Add new menu item
  app.post('/api/menu', (req, res) => {
    const { name, category, price, description, tastingNotes, originOrPrep, stock } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }
    const validCategories = ['espresso', 'pourover', 'bakery', 'beans'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Price must be positive.' });
    }

    const imageByCategory: Record<string, string> = {
      espresso: IMAGE_ESPRESSO,
      pourover: IMAGE_POUROVER,
      bakery: IMAGE_PASTRY,
      beans: IMAGE_BEANS,
    };

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: name.trim().slice(0, 80),
      category,
      price: Math.round(numericPrice * 100) / 100,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim().slice(0, 260)
          : 'Small-batch seasonal release crafted in-house.',
      tastingNotes:
        typeof tastingNotes === 'string' && tastingNotes.trim()
          ? tastingNotes.trim().slice(0, 100)
          : 'Balanced sweetness · Clean finish',
      originOrPrep:
        typeof originOrPrep === 'string' && originOrPrep.trim()
          ? originOrPrep.trim().slice(0, 80)
          : 'Seasonal Special',
      image: imageByCategory[category],
      stock: Math.max(0, Math.round(Number(stock) || 12)),
      available: true,
      customizable: category !== 'bakery',
      isBean: category === 'beans',
    };

    store.menu.unshift(newItem);
    saveStore(store);
    res.status(201).json({ item: newItem, menu: store.menu });
  });

  // Owner: Update inventory / price / availability
  app.patch('/api/menu/:id', (req, res) => {
    const item = store.menu.find((m) => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    const { price, stock, available } = req.body ?? {};
    if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
      item.price = Math.round(price * 100) / 100;
    }
    if (typeof stock === 'number' && Number.isFinite(stock)) {
      item.stock = Math.max(0, Math.round(stock));
      if (item.stock === 0) {
        item.available = false;
      }
    }
    if (typeof available === 'boolean') {
      item.available = available;
    }
    saveStore(store);
    res.json({ item, menu: store.menu });
  });

  // Customer: Place Order (atomic stock validation & deduction)
  app.post('/api/orders', (req, res) => {
    const { customerName, customerPhone, fulfillment, tableCode, address, items, promoCode, tip } =
      req.body ?? {};

    if (typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a guest name.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your bag is empty.' });
    }
    if (!['pickup', 'dine-in', 'shipping'].includes(fulfillment)) {
      return res.status(400).json({ error: 'Invalid fulfillment method.' });
    }
    if (fulfillment === 'dine-in' && (!tableCode || typeof tableCode !== 'string')) {
      return res.status(400).json({ error: 'Please select a table for dine-in service.' });
    }
    if (fulfillment === 'shipping' && (!address || typeof address !== 'string' || address.trim().length < 5)) {
      return res.status(400).json({ error: 'Please enter a delivery address.' });
    }

    const validatedItems: OrderItem[] = [];
    let subtotal = 0;

    for (const line of items) {
      const qty = Math.round(Number(line.quantity));
      if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
        return res.status(400).json({ error: 'Invalid item quantity.' });
      }
      const catalogItem = store.menu.find((m) => m.id === line.menuItemId);
      if (!catalogItem) {
        return res.status(400).json({ error: `Unknown item: ${line.menuItemId}` });
      }
      if (!catalogItem.available || catalogItem.stock < qty) {
        return res.status(409).json({
          error: `Insufficient stock for ${catalogItem.name} (${catalogItem.stock} remaining).`,
        });
      }
      const extraShotCost = line.extraShot ? 1.5 : 0;
      const unitPrice = Math.round((catalogItem.price + extraShotCost) * 100) / 100;
      subtotal += unitPrice * qty;
      validatedItems.push({
        menuItemId: catalogItem.id,
        name: catalogItem.name,
        price: unitPrice,
        quantity: qty,
        size: typeof line.size === 'string' ? line.size : undefined,
        milk: typeof line.milk === 'string' ? line.milk : undefined,
        grind: typeof line.grind === 'string' ? line.grind : undefined,
        extraShot: Boolean(line.extraShot),
        notes: typeof line.notes === 'string' ? line.notes.slice(0, 120) : undefined,
      });
    }

    // Deduct stock atomically
    for (const line of validatedItems) {
      const catalogItem = store.menu.find((m) => m.id === line.menuItemId)!;
      catalogItem.stock = Math.max(0, catalogItem.stock - line.quantity);
      if (catalogItem.stock === 0) {
        catalogItem.available = false;
      }
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const normalizedPromo = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
    const discount = normalizedPromo === 'ROAST10' ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const tipAmount =
      typeof tip === 'number' && Number.isFinite(tip) && tip >= 0
        ? Math.round(Math.min(tip, 100) * 100) / 100
        : 0;
    const total = Math.round((subtotal - discount + tipAmount) * 100) / 100;

    const orderNum = `AR-${1043 + store.orders.length}`;
    const newOrder: CafeOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      customerName: customerName.trim().slice(0, 80),
      customerPhone: typeof customerPhone === 'string' ? customerPhone.trim().slice(0, 30) : '',
      fulfillment,
      tableCode: fulfillment === 'dine-in' ? tableCode : undefined,
      address: fulfillment === 'shipping' ? address.trim().slice(0, 200) : undefined,
      items: validatedItems,
      subtotal,
      discount,
      tip: tipAmount,
      total,
      promoCode: discount > 0 ? normalizedPromo : undefined,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    store.orders.unshift(newOrder);
    saveStore(store);
    res.status(201).json({ order: newOrder, menu: store.menu, orders: store.orders });
  });

  // Owner/Barista: Advance order status
  app.patch('/api/orders/:id', (req, res) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const validStatuses: OrderStatus[] = ['queued', 'preparing', 'ready', 'completed'];
    const { status } = req.body ?? {};
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }
    order.status = status;
    saveStore(store);
    res.json({ order, orders: store.orders });
  });

  // Customer: Reserve a physical table synced with 3D floorplan
  app.post('/api/reservations', (req, res) => {
    const { tableId, customerName, customerPhone, partySize, date, timeSlot, preOrderNotes } =
      req.body ?? {};

    const table = store.tables.find((t) => t.id === tableId);
    if (!table) {
      return res.status(404).json({ error: 'Selected table was not found.' });
    }
    if (typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ error: 'Guest name is required.' });
    }
    if (typeof date !== 'string' || !date) {
      return res.status(400).json({ error: 'Reservation date is required.' });
    }
    if (typeof timeSlot !== 'string' || !timeSlot) {
      return res.status(400).json({ error: 'Time slot is required.' });
    }
    const guests = Math.round(Number(partySize));
    if (!Number.isFinite(guests) || guests < 1 || guests > table.seats) {
      return res.status(400).json({
        error: `Table ${table.code} seats up to ${table.seats} guests.`,
      });
    }

    const conflict = store.reservations.some(
      (r) =>
        r.tableId === table.id &&
        r.date === date &&
        r.timeSlot === timeSlot &&
        r.status !== 'cancelled' &&
        r.status !== 'completed'
    );
    if (conflict) {
      return res.status(409).json({
        error: `Table ${table.code} is already booked on ${date} at ${timeSlot}. Please pick another slot or table.`,
      });
    }

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      code: `RES-${209 + store.reservations.length}`,
      tableId: table.id,
      tableCode: table.code,
      tableLabel: table.label,
      customerName: customerName.trim().slice(0, 80),
      customerPhone: typeof customerPhone === 'string' ? customerPhone.trim().slice(0, 30) : '',
      partySize: guests,
      date,
      timeSlot,
      preOrderNotes: typeof preOrderNotes === 'string' ? preOrderNotes.trim().slice(0, 160) : undefined,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const today = new Date().toISOString().slice(0, 10);
    if (date === today && table.status === 'available') {
      table.status = 'reserved';
    }

    store.reservations.unshift(newReservation);
    saveStore(store);
    res.status(201).json({
      reservation: newReservation,
      reservations: store.reservations,
      tables: store.tables,
    });
  });

  // Owner: Update reservation status
  app.patch('/api/reservations/:id', (req, res) => {
    const reservation = store.reservations.find((r) => r.id === req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    const validStatuses: ReservationStatus[] = ['confirmed', 'seated', 'completed', 'cancelled'];
    const { status } = req.body ?? {};
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid reservation status.' });
    }
    reservation.status = status;

    const table = store.tables.find((t) => t.id === reservation.tableId);
    if (table) {
      if (status === 'seated') table.status = 'occupied';
      else if (status === 'completed' || status === 'cancelled') table.status = 'available';
    }

    saveStore(store);
    res.json({ reservation, reservations: store.reservations, tables: store.tables });
  });

  // Owner: Directly update 3D physical table status
  app.patch('/api/tables/:id', (req, res) => {
    const table = store.tables.find((t) => t.id === req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found.' });
    }
    const validStatuses: TableStatus[] = ['available', 'reserved', 'occupied'];
    const { status } = req.body ?? {};
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid table status.' });
    }
    table.status = status;
    saveStore(store);
    res.json({ table, tables: store.tables });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Aurora Roasters server running on http://localhost:${port}`);
  });
}

startServer();
