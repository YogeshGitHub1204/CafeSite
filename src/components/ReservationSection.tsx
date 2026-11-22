import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, MapPin, Users } from 'lucide-react';
import type { CafeTable, Reservation } from '../types/cafe';

interface ReservationSectionProps {
  tables: CafeTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onCreateReservation: (payload: {
    tableId: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    date: string;
    timeSlot: string;
    preOrderNotes?: string;
  }) => Promise<Reservation>;
  isEvening: boolean;
}

const TIME_SLOTS = ['08:30', '10:00', '11:30', '13:00', '15:00', '17:30', '19:00'];

export default function ReservationSection({
  tables,
  selectedTableId,
  onSelectTable,
  onCreateReservation,
  isEvening,
}: ReservationSectionProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [tableId, setTableId] = useState<string>(selectedTableId ?? tables[0]?.id ?? '');
  const [date, setDate] = useState(today);
  const [timeSlot, setTimeSlot] = useState('10:00');
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preOrderNotes, setPreOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Reservation | null>(null);

  useEffect(() => {
    if (selectedTableId) {
      setTableId(selectedTableId);
      const t = tables.find((x) => x.id === selectedTableId);
      if (t && partySize > t.seats) {
        setPartySize(t.seats);
      }
    }
  }, [selectedTableId, tables, partySize]);

  const activeTable = tables.find((t) => t.id === tableId) ?? tables[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await onCreateReservation({
        tableId: activeTable.id,
        customerName,
        customerPhone,
        partySize,
        date,
        timeSlot,
        preOrderNotes,
      });
      setConfirmed(res);
      setCustomerName('');
      setCustomerPhone('');
      setPreOrderNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to book table.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardSurface = isEvening
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900';
  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';
  const inputSurface = isEvening
    ? 'bg-stone-800 border-stone-700 text-stone-100'
    : 'bg-stone-50 border-stone-200 text-stone-900';

  return (
    <section
      id="reserve"
      className="max-w-7xl mx-auto px-6 py-16 border-t border-stone-200/80 dark:border-stone-800"
    >
      <div className="max-w-2xl pb-8">
        <p className={`text-xs font-medium tracking-wide ${mutedText}`}>
          02. 3D-Synced Table Booking
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-display font-semibold tracking-tight text-balance">
          Choose your exact table inside the dining floor
        </h2>
        <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>
          Selecting a table card focuses the 3D cafe camera directly on that seat, and clicking any table inside the 3D viewport updates your booking form here.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Physical Table Selector */}
        <div className="lg:col-span-7 space-y-3">
          {tables.map((tbl) => {
            const isSelected = activeTable?.id === tbl.id;
            const statusText =
              tbl.status === 'available'
                ? 'Open Now'
                : tbl.status === 'reserved'
                ? 'Reserved'
                : 'Occupied';

            return (
              <button
                key={tbl.id}
                type="button"
                onClick={() => {
                  setTableId(tbl.id);
                  if (partySize > tbl.seats) setPartySize(tbl.seats);
                  onSelectTable(tbl.id);
                }}
                className={`w-full text-left rounded-xl border p-5 transition-colors flex flex-wrap items-center justify-between gap-4 ${
                  isSelected
                    ? isEvening
                      ? 'bg-stone-800/90 border-amber-600 text-stone-100'
                      : 'bg-amber-50/70 border-amber-700 text-stone-900'
                    : cardSurface
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium text-amber-700 dark:text-amber-400">
                      {tbl.code}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={mutedText}>{tbl.zone}</span>
                    <span aria-hidden="true">·</span>
                    <span className={mutedText}>{tbl.shape === 'communal' ? 'Communal Oak' : 'Bistro Round'}</span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold">{tbl.label}</h3>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <span className={`inline-flex items-center gap-1.5 tabular-nums ${mutedText}`}>
                    <Users className="w-3.5 h-3.5" />
                    Up to {tbl.seats}
                  </span>
                  <span
                    className={`font-medium ${
                      tbl.status === 'available'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : tbl.status === 'reserved'
                        ? 'text-amber-700 dark:text-amber-400'
                        : mutedText
                    }`}
                  >
                    {statusText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Reservation Form */}
        <div className={`lg:col-span-5 rounded-2xl border p-6 lg:p-7 ${cardSurface}`}>
          {confirmed && (
            <div className="mb-6 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Reservation Confirmed · {confirmed.code}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed opacity-90">
                Table {confirmed.tableCode} ({confirmed.tableLabel}) held for {confirmed.customerName} on{' '}
                <span className="font-mono">{confirmed.date}</span> at{' '}
                <span className="font-mono">{confirmed.timeSlot}</span> for {confirmed.partySize} guests.
              </p>
            </div>
          )}

          {activeTable && (
            <div className="pb-4 mb-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className={`text-xs ${mutedText}`}>Selected Floor Table</p>
                <p className="mt-0.5 text-lg font-display font-semibold">
                  {activeTable.code} — {activeTable.label}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs ${mutedText}`}>
                <MapPin className="w-3.5 h-3.5" />
                {activeTable.zone}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="res-date" className="block text-xs font-medium mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <input
                    id="res-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputSurface}`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="res-guests" className="block text-xs font-medium mb-1.5">
                  Guests (Max {activeTable?.seats ?? 4})
                </label>
                <select
                  id="res-guests"
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                >
                  {Array.from({ length: activeTable?.seats ?? 4 }, (_, idx) => idx + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Arrival Window</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`py-1.5 px-2 rounded-lg border font-mono text-xs tabular-nums transition-colors ${
                      timeSlot === slot
                        ? 'bg-amber-700 border-amber-700 text-white'
                        : isEvening
                        ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="res-name" className="block text-xs font-medium mb-1.5">
                  Guest Name
                </label>
                <input
                  id="res-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Claire Moreau"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                />
              </div>
              <div>
                <label htmlFor="res-phone" className="block text-xs font-medium mb-1.5">
                  Phone Number
                </label>
                <input
                  id="res-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="555-0194"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="res-notes" className="block text-xs font-medium mb-1.5">
                Pre-Order Drink or Seating Note (optional)
              </label>
              <input
                id="res-notes"
                type="text"
                value={preOrderNotes}
                onChange={(e) => setPreOrderNotes(e.target.value)}
                placeholder="e.g. 2x House Brass Cortado ready at arrival"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${inputSurface}`}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !activeTable}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-5 py-3 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>{submitting ? 'Confirming Table...' : `Confirm Table ${activeTable?.code ?? ''}`}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
