import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { getCurrentUser } from "../auth/currentUser";
import RoleBadge from "../components/RoleBadge";
import StatsCard from "../components/StatsCard";

const toDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (dateValue, startTime, endTime) => {
  const dateLabel = new Date(dateValue).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateLabel} | ${startTime} - ${endTime}`;
};

const formatTimestamp = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isUpcoming = (booking) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  bookingDate.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

function DashboardPage() {
  const user = getCurrentUser();
  const [bookings, setBookings] = useState([]);
  const [noticeBoard, setNoticeBoard] = useState({
    content: "",
    updatedAt: null,
    updatedBy: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
      setError("");
    }

    const [historyResult, noticeResult] = await Promise.allSettled([
      apiClient.get("/bookings/history"),
      apiClient.get("/notice-board"),
    ]);

    let nextError = "";
    let hasSuccessfulData = false;

    if (historyResult.status === "fulfilled") {
      setBookings(historyResult.value.data?.bookings || []);
      hasSuccessfulData = true;
    } else if (!silent) {
      nextError =
        historyResult.reason?.response?.data?.message || "Failed to load booking history.";
    }

    if (noticeResult.status === "fulfilled") {
      const notice = noticeResult.value.data?.notice || {};
      setNoticeBoard({
        content: notice.content || "",
        updatedAt: notice.updatedAt || null,
        updatedBy: notice.updatedBy || null,
      });
      hasSuccessfulData = true;
    } else if (!silent) {
      const noticeError =
        noticeResult.reason?.response?.data?.message || "Failed to load notice board.";
      nextError = nextError ? `${nextError} ${noticeError}` : noticeError;
    }

    if (hasSuccessfulData) {
      setLastSyncedAt(new Date());
    }

    if (!silent) {
      setError(nextError);
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await loadDashboard();
    };

    init();

    const intervalId = setInterval(() => {
      if (mounted) {
        loadDashboard({ silent: true }).catch(() => {});
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((item) => item.status === "pending").length;
    const approved = bookings.filter((item) => item.status === "approved").length;
    const cancelled = bookings.filter((item) => item.status === "cancelled").length;
    const rejected = bookings.filter((item) => item.status === "rejected").length;
    return { total, pending, approved, cancelled, rejected };
  }, [bookings]);

  const upcomingApproved = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === "approved" && isUpcoming(booking))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bookings]
  );

  const upcomingPending = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === "pending" && isUpcoming(booking))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [bookings]
  );

  const nextBooking = upcomingApproved[0] || null;
  const upcomingTimeline = upcomingApproved.slice(0, 5);
  const recentBookings = useMemo(() => bookings.slice(0, 6), [bookings]);

  const todayStats = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const todayBookings = bookings.filter((booking) => toDateKey(booking.date) === todayKey);
    const approved = todayBookings.filter((booking) => booking.status === "approved").length;
    const pending = todayBookings.filter((booking) => booking.status === "pending").length;
    return {
      total: todayBookings.length,
      approved,
      pending,
    };
  }, [bookings]);

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const pendingRate = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const rejectionRate = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;

  const statusSummary = useMemo(
    () => [
      {
        key: "approved",
        label: "Approved",
        value: stats.approved,
        tone: "text-emerald-700",
        width: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      },
      {
        key: "pending",
        label: "Pending",
        value: stats.pending,
        tone: "text-amber-700",
        width: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
      },
      {
        key: "rejected",
        label: "Rejected",
        value: stats.rejected,
        tone: "text-rose-700",
        width: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
      },
      {
        key: "cancelled",
        label: "Cancelled",
        value: stats.cancelled,
        tone: "text-slate-700",
        width: stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0,
      },
    ],
    [stats]
  );

  const weeklySeries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return {
        dateKey: toDateKey(date),
        label: date.toLocaleDateString([], { weekday: "short" }),
        fullDate: date.toLocaleDateString([], { month: "short", day: "numeric" }),
        count: 0,
      };
    });

    const indexByDate = Object.fromEntries(
      nextSevenDays.map((item, index) => [item.dateKey, index])
    );

    const futureBookings = bookings.filter(
      (booking) => isUpcoming(booking) && ["approved", "pending"].includes(booking.status)
    );

    futureBookings.forEach((booking) => {
      const key = toDateKey(booking.date);
      const slot = indexByDate[key];
      if (slot !== undefined) {
        nextSevenDays[slot].count += 1;
      }
    });

    const maxCount = Math.max(...nextSevenDays.map((item) => item.count), 1);
    return nextSevenDays.map((item) => ({
      ...item,
      width: Math.round((item.count / maxCount) * 100),
    }));
  }, [bookings]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Workspace Overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Welcome {user.name || user.email || "User"}. Track bookings, check notices, and plan
              upcoming room usage.
            </p>
            <p className="mt-2 text-xs text-slate-500">Last synced: {formatTimestamp(lastSyncedAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={user.role} />
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={refreshing}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to="/search"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Find Room
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard title="Total Bookings" value={loading ? "-" : stats.total} tone="slate" icon="TOT" />
        <StatsCard title="Pending" value={loading ? "-" : stats.pending} tone="yellow" icon="PEN" />
        <StatsCard title="Approved" value={loading ? "-" : stats.approved} tone="green" icon="APR" />
        <StatsCard title="Cancelled" value={loading ? "-" : stats.cancelled} tone="red" icon="CAN" />
        <StatsCard title="Rejected" value={loading ? "-" : stats.rejected} tone="blue" icon="REJ" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Notice Board</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Admin announcements visible to all users.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Shared
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              {noticeBoard.content ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{noticeBoard.content}</p>
              ) : (
                <p className="text-sm text-slate-500">No notice published yet.</p>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Updated: {formatTimestamp(noticeBoard.updatedAt)}
              {noticeBoard.updatedBy
                ? ` by ${noticeBoard.updatedBy.name || noticeBoard.updatedBy.email}`
                : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
                <p className="mt-1 text-sm text-slate-500">Your next approved bookings and pipeline.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">
                  {upcomingApproved.length} approved
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                  {upcomingPending.length} pending
                </span>
              </div>
            </div>

            {loading ? <p className="mt-3 text-sm text-slate-500">Loading schedule...</p> : null}
            {!loading && !nextBooking ? (
              <p className="mt-3 text-sm text-slate-500">No upcoming approved booking.</p>
            ) : null}

            {!loading && nextBooking ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  Next: {nextBooking.roomId?.name || "Room"} ({nextBooking.roomId?.block || "-"})
                </p>
                <p>{formatDateTime(nextBooking.date, nextBooking.startTime, nextBooking.endTime)}</p>
              </div>
            ) : null}

            {!loading && upcomingTimeline.length > 0 ? (
              <div className="mt-3 space-y-2">
                {upcomingTimeline.map((booking) => (
                  <div
                    key={booking._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {booking.roomId?.name || "Room"} ({booking.roomId?.block || "-"})
                      </p>
                      <p className="text-slate-600">
                        {formatDateTime(booking.date, booking.startTime, booking.endTime)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      APPROVED
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            {loading ? <p className="mt-2 text-sm text-slate-600">Loading recent activity...</p> : null}
            {!loading && recentBookings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No booking activity yet.</p>
            ) : null}
            {!loading && recentBookings.length > 0 ? (
              <div className="mt-3 space-y-2">
                {recentBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {booking.roomId?.name || "Room"} ({booking.roomId?.block || "-"})
                      </p>
                      <p className="text-slate-600">
                        {formatDateTime(booking.date, booking.startTime, booking.endTime)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        booking.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : booking.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : booking.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {String(booking.status || "unknown").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Booking Health</h2>
            <div className="mt-3 grid gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Approval Rate</p>
                <p className="text-lg font-semibold text-emerald-700">{loading ? "-" : `${approvalRate}%`}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Pending Load</p>
                <p className="text-lg font-semibold text-amber-700">{loading ? "-" : `${pendingRate}%`}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Rejection Rate</p>
                <p className="text-lg font-semibold text-rose-700">{loading ? "-" : `${rejectionRate}%`}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Today Snapshot</h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Total Today</span>
                <span className="font-semibold text-slate-900">{loading ? "-" : todayStats.total}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Approved</span>
                <span className="font-semibold text-emerald-700">{loading ? "-" : todayStats.approved}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Pending</span>
                <span className="font-semibold text-amber-700">{loading ? "-" : todayStats.pending}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Status Mix</h2>
            <div className="mt-3 space-y-3">
              {statusSummary.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className={`font-semibold ${item.tone}`}>{loading ? "-" : item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${
                        item.key === "approved"
                          ? "bg-emerald-500"
                          : item.key === "pending"
                            ? "bg-amber-500"
                            : item.key === "rejected"
                              ? "bg-rose-500"
                              : "bg-slate-500"
                      }`}
                      style={{ width: `${loading ? 0 : item.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Next 7 Days Load</h2>
            <div className="mt-3 space-y-2">
              {weeklySeries.map((item) => (
                <div key={item.dateKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {item.label} ({item.fullDate})
                    </span>
                    <span className="font-semibold text-slate-700">{loading ? "-" : item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-slate-800"
                      style={{ width: `${loading ? 0 : item.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            <div className="mt-3 space-y-2">
              <Link
                to="/search"
                className="block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Search Rooms
              </Link>
              <Link
                to="/bookings"
                className="block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                View Bookings
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default DashboardPage;
