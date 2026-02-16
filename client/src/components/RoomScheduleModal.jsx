import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

const parseTimeToMinutes = (time) => {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const toTimeLabel = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const toDateKey = (dateInput) => {
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getMonthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const buildCalendarCells = (monthDate) => {
  const start = getMonthStart(monthDate);
  const end = getMonthEnd(monthDate);

  const startWeekday = start.getDay();
  const daysInMonth = end.getDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const buildSlots = (dayBookings) => {
  const start = 8 * 60;
  const end = 20 * 60;
  const slots = [];

  for (let current = start; current < end; current += 60) {
    const slotStart = current;
    const slotEnd = current + 60;

    const booking = dayBookings.find((item) => {
      const bStart = parseTimeToMinutes(item.startTime);
      const bEnd = parseTimeToMinutes(item.endTime);
      return slotStart < bEnd && slotEnd > bStart;
    });

    slots.push({
      start: toTimeLabel(slotStart),
      end: toTimeLabel(slotEnd),
      booking: booking || null,
    });
  }

  return slots;
};

const getSlotStyle = (booking) => {
  if (!booking) {
    return {
      row: "bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700",
      label: "Free",
    };
  }

  const status = String(booking.status || "approved").toLowerCase();
  if (status === "pending") {
    return { row: "bg-amber-50", badge: "bg-amber-100 text-amber-700", label: "Pending" };
  }
  if (status === "cancelled" || status === "rejected") {
    return { row: "bg-rose-50", badge: "bg-rose-100 text-rose-700", label: "Cancelled" };
  }
  if (status === "overridden") {
    return { row: "bg-blue-50", badge: "bg-blue-100 text-blue-700", label: "Overridden" };
  }

  return { row: "bg-rose-50", badge: "bg-rose-100 text-rose-700", label: "Booked" };
};

function RoomScheduleModal({ open, room, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));

  useEffect(() => {
    if (!open || !room?._id) return;

    const loadSchedule = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get(`/rooms/${room._id}/schedule`);
        setBookings(response.data?.bookings || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load schedule.");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [open, room?._id]);

  useEffect(() => {
    if (!open) return;
    const todayKey = toDateKey(new Date());
    setSelectedDateKey(todayKey);
    setMonthDate(new Date());
  }, [open]);

  const bookingsByDate = useMemo(() => {
    const grouped = {};
    bookings.forEach((booking) => {
      const key = toDateKey(booking.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(booking);
    });
    return grouped;
  }, [bookings]);

  const monthCells = useMemo(() => buildCalendarCells(monthDate), [monthDate]);
  const slots = useMemo(
    () => buildSlots(bookingsByDate[selectedDateKey] || []),
    [bookingsByDate, selectedDateKey]
  );

  const monthLabel = monthDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  const moveMonth = (delta) => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  if (!open || !room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {room.name} ({room.block})
            </h3>
            <p className="text-sm text-slate-600">Capacity: {room.capacity}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Free</span>
            <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700">Booked</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">Overridden</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">Pending</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            Close
          </button>
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading schedule...</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                >
                  Prev
                </button>
                <p className="text-lg font-semibold text-slate-900">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} className="h-16 rounded-lg bg-slate-50" />;
                  const key = toDateKey(cell);
                  const dayBookings = bookingsByDate[key] || [];
                  const selected = selectedDateKey === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                    className={`h-16 rounded-lg border p-1 text-left ${
                        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-700">{cell.getDate()}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{dayBookings.length} booked</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-semibold text-slate-800">{selectedDateKey} Schedule</h4>
              <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-slate-100">
                {slots.map((slot) => {
                  const style = getSlotStyle(slot.booking);
                  return (
                    <div
                      key={`${slot.start}-${slot.end}`}
                      className={`flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 ${style.row}`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {slot.start} - {slot.end}
                        </p>
                        {slot.booking ? (
                          <p className="text-xs text-slate-700">
                            Booked by {slot.booking.userId?.name || slot.booking.userId?.email || "Unknown"} (
                            {slot.booking.userId?.role || "user"})
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-700">Empty slot</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default RoomScheduleModal;
