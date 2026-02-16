import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import AdminTabs from "./AdminTabs";

const toPriorityScore = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;

  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("high")) return 5;
  if (normalized.includes("medium")) return 3;
  if (normalized.includes("low")) return 1;
  return 0;
};

function AdminApprovalsPage() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoadingId, setReviewLoadingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadPending = async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const response = await apiClient.get("/bookings/pending");
      setPendingBookings(response.data?.bookings || []);
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadPending();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load pending bookings.");
      } finally {
        setLoading(false);
      }
    };

    load();

    const intervalId = setInterval(() => {
      loadPending({ silent: true }).catch(() => {});
    }, 8000);

    const onFocus = () => {
      loadPending({ silent: true }).catch(() => {});
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleRefresh = async () => {
    setError("");
    try {
      await loadPending();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to refresh pending bookings.");
      setRefreshing(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return pendingBookings.filter((booking) => {
      const roomText = `${booking.roomId?.name || ""} ${booking.roomId?.block || ""}`.toLowerCase();
      const userText = `${booking.userId?.name || ""} ${booking.userId?.email || ""}`.toLowerCase();
      const priorityScore = toPriorityScore(booking.priority);

      const queryMatch = !query || roomText.includes(query) || userText.includes(query);

      if (priorityFilter === "all") {
        return queryMatch;
      }

      if (priorityFilter === "high") {
        return queryMatch && priorityScore >= 4;
      }

      if (priorityFilter === "medium") {
        return queryMatch && priorityScore >= 2 && priorityScore < 4;
      }

      if (priorityFilter === "low") {
        return queryMatch && priorityScore < 2;
      }

      return queryMatch;
    });
  }, [pendingBookings, priorityFilter, searchText]);

  const highPriorityCount = useMemo(
    () => pendingBookings.filter((booking) => toPriorityScore(booking.priority) >= 4).length,
    [pendingBookings]
  );

  const reviewBooking = async (bookingId, action) => {
    setReviewLoadingId(bookingId);
    setError("");
    setMessage("");

    try {
      const payload =
        action === "reject"
          ? { action: "reject", reason: "Rejected by admin review" }
          : { action: "approve" };
      const response = await apiClient.patch(`/bookings/${bookingId}/review`, payload);
      setMessage(response.data?.message || "Booking reviewed.");
      await loadPending();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to review booking.");
    } finally {
      setReviewLoadingId("");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
            <p className="mt-1 text-sm text-slate-600">
              Review and finalize booking requests raised by users.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh Queue"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pending</p>
            <p className="text-xl font-semibold text-slate-900">{pendingBookings.length}</p>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-rose-600">High Priority</p>
            <p className="text-xl font-semibold text-rose-700">{highPriorityCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Filtered View</p>
            <p className="text-xl font-semibold text-slate-900">{filteredBookings.length}</p>
          </div>
        </div>
      </div>

      <AdminTabs />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by room, block, user name, or email"
            className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
          />
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
          >
            <option value="all">All Priority Levels</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading pending bookings...</p> : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {!loading && !error && pendingBookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No pending bookings.</p>
        ) : null}

        {!loading && !error && pendingBookings.length > 0 && filteredBookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No requests match your filters.</p>
        ) : null}

        {!loading && !error && filteredBookings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {booking.roomId?.name || "Room"} ({booking.roomId?.block || "--"})
                    </p>
                    <p className="text-sm text-slate-600">
                      Requested by {booking.userId?.name || booking.userId?.email || "Unknown user"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {new Date(booking.date).toLocaleDateString()} | {booking.startTime} -{" "}
                      {booking.endTime}
                    </p>
                    <p className="text-sm text-slate-600">
                      Purpose: {booking.bookingPurpose?.trim() || "Not provided"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      toPriorityScore(booking.priority) >= 4
                        ? "bg-rose-100 text-rose-700"
                        : toPriorityScore(booking.priority) >= 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    Priority {booking.priority}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reviewLoadingId === booking._id}
                    onClick={() => reviewBooking(booking._id, "approve")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewLoadingId === booking._id}
                    onClick={() => reviewBooking(booking._id, "reject")}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AdminApprovalsPage;
