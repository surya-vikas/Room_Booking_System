import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { getCurrentUser } from "../auth/currentUser";
import { getRoleCapabilities } from "../auth/rolePermissions";
import StatusBadge from "../components/StatusBadge";

const statusOptions = ["all", "pending", "approved", "cancelled", "rejected", "overridden"];

const toDateKey = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function BookingsPage() {
  const capabilities = getRoleCapabilities(getCurrentUser().role);
  const title = capabilities.canViewAllBookings ? "All Bookings" : "My Bookings";
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterDate, setFilterDate] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await apiClient.get("/bookings/history");
        setBookings(response.data.bookings || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load booking history.");
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const priorityOptions = useMemo(() => {
    const set = new Set(bookings.map((item) => String(item.priority || "")));
    return ["all", ...Array.from(set).filter(Boolean).sort((a, b) => Number(a) - Number(b))];
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesDate = !filterDate || toDateKey(booking.date) === filterDate;
      const roomLabel = `${booking.roomId?.name || ""} ${booking.roomId?.block || ""}`.toLowerCase();
      const matchesRoom = !filterRoom || roomLabel.includes(filterRoom.trim().toLowerCase());
      const statusKey = String(booking.status || "").toLowerCase();
      const matchesStatus = filterStatus === "all" || statusKey === filterStatus;
      const matchesPriority = filterPriority === "all" || String(booking.priority) === filterPriority;
      return matchesDate && matchesRoom && matchesStatus && matchesPriority;
    });
  }, [bookings, filterDate, filterRoom, filterStatus, filterPriority]);

  return (
    <section className="space-y-4">
      <div className="sticky top-24 z-10 rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-lg backdrop-blur">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">Track booking lifecycle with filters and status indicators.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Date
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Room / Block
            <input
              type="text"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              placeholder="e.g. 1311 or Block 1"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Status
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Priority
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === "all" ? "All" : priority}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-slate-600">Loading bookings...</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!loading && !error && filteredBookings.length === 0 ? (
          <p className="text-sm text-slate-600">No bookings found for selected filters.</p>
        ) : null}

        {!loading && !error && filteredBookings.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-3">Room</th>
                  <th className="px-3 py-3">Block</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Start</th>
                  <th className="px-3 py-3">End</th>
                  <th className="px-3 py-3">Attendees</th>
                  <th className="px-3 py-3">Purpose</th>
                  <th className="px-3 py-3">Priority</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking, index) => (
                  <tr
                    key={booking._id}
                    className={`border-t border-slate-100 transition hover:bg-indigo-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-slate-800">{booking.roomId?.name || "Unknown Room"}</td>
                    <td className="px-3 py-2">{booking.roomId?.block || "-"}</td>
                    <td className="px-3 py-2">{new Date(booking.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{booking.startTime}</td>
                    <td className="px-3 py-2">{booking.endTime}</td>
                    <td className="px-3 py-2">{booking.attendees}</td>
                    <td className="px-3 py-2 max-w-56 text-xs text-slate-700">
                      {booking.bookingPurpose || "-"}
                    </td>
                    <td className="px-3 py-2">{booking.priority}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={booking.status?.toUpperCase()} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{booking.overrideReason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default BookingsPage;
