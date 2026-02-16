import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { getCurrentUser } from "../auth/currentUser";
import { getRoleCapabilities } from "../auth/rolePermissions";
import AdminChatBot from "../components/admin/AdminChatBot";
import AdminTabs from "./admin/AdminTabs";

const formatDateValue = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPendingTone = (count) => {
  if (count >= 10) return "text-rose-700 bg-rose-50 border-rose-100";
  if (count >= 4) return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-emerald-700 bg-emerald-50 border-emerald-100";
};

function AdminPage() {
  const capabilities = getRoleCapabilities(getCurrentUser().role);
  const [analytics, setAnalytics] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }

    const [analyticsResult, pendingResult] = await Promise.allSettled([
      apiClient.get("/admin/analytics"),
      apiClient.get("/bookings/pending"),
    ]);

    let combinedError = "";

    if (analyticsResult.status === "fulfilled") {
      setAnalytics(analyticsResult.value.data);
    } else {
      combinedError =
        analyticsResult.reason?.response?.data?.message || "Failed to load analytics data.";
    }

    if (pendingResult.status === "fulfilled") {
      setPendingBookings(pendingResult.value.data?.bookings || []);
    } else {
      const pendingError =
        pendingResult.reason?.response?.data?.message || "Failed to load pending approvals.";
      combinedError = combinedError ? `${combinedError} ${pendingError}` : pendingError;
    }

    setError(combinedError);
    setLastUpdated(new Date());

    if (!silent) {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!capabilities.canManageRooms) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const init = async () => {
      try {
        await loadDashboard();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const intervalId = setInterval(() => {
      if (mounted) {
        loadDashboard({ silent: true }).catch(() => {});
      }
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [capabilities.canManageRooms, loadDashboard]);

  const summary = analytics?.summary;
  const utilization = useMemo(() => analytics?.utilization || [], [analytics]);
  const topRoom = utilization[0] || null;
  const pendingTone = getPendingTone(pendingBookings.length);

  const metricCards = useMemo(
    () => [
      {
        label: "Total Rooms",
        value: summary?.totalRooms ?? "-",
        tone: "text-slate-900",
      },
      {
        label: "Total Bookings",
        value: summary?.totalBookings ?? "-",
        tone: "text-slate-900",
      },
      {
        label: "Pending Reviews",
        value: summary?.pendingBookings ?? "-",
        tone: "text-amber-700",
      },
      {
        label: "Approved",
        value: summary?.approvedBookings ?? "-",
        tone: "text-emerald-700",
      },
      {
        label: "Rejected",
        value: summary?.rejectedBookings ?? "-",
        tone: "text-rose-700",
      },
      {
        label: "Cancelled",
        value: summary?.cancelledBookings ?? "-",
        tone: "text-slate-700",
      },
    ],
    [summary]
  );

  const utilizationMax = useMemo(() => {
    if (utilization.length === 0) return 1;
    return Math.max(...utilization.map((item) => Number(item.totalBookings || 0)), 1);
  }, [utilization]);

  if (!capabilities.canManageRooms) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-2 text-sm text-slate-600">Access denied for current role.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Operations Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Monitor booking flow, manage room inventory, and resolve pending requests from a
              single workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/approvals"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Review Approvals
            </Link>
            <Link
              to="/admin/rooms/add"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Add Room
            </Link>
            <Link
              to="/admin/users"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Manage Users
            </Link>
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={refreshing}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
            >
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${pendingTone}`}>
            {pendingBookings.length} pending approval(s)
          </span>
          <span>Last updated: {formatDateValue(lastUpdated)}</span>
        </div>
      </div>

      <AdminTabs />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.tone}`}>
              {loading ? "-" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pending Approval Queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Focus on time-sensitive requests first.
                </p>
              </div>
              <Link
                to="/admin/approvals"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open Approvals
              </Link>
            </div>

            <div className="space-y-3 p-5">
              {loading ? <p className="text-sm text-slate-500">Loading pending bookings...</p> : null}
              {!loading && pendingBookings.length === 0 ? (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  No pending approvals. Queue is clear.
                </p>
              ) : null}

              {!loading && pendingBookings.length > 0
                ? pendingBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking._id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {booking.roomId?.name || "Room"} ({booking.roomId?.block || "--"})
                      </p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Priority {booking.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {booking.userId?.email || "Unknown user"} |{" "}
                      {new Date(booking.date).toLocaleDateString()} {booking.startTime}-
                      {booking.endTime}
                    </p>
                  </div>
                ))
                : null}
          </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Room Utilization</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tracks usage so you can rebalance high-demand rooms.
              </p>
            </div>

            <div className="space-y-4 p-5">
              {topRoom ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Top Utilized
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {topRoom.roomName} ({topRoom.block})
                  </p>
                  <p className="text-sm text-slate-600">
                    {topRoom.totalBookings} total booking(s)
                  </p>
                </div>
              ) : null}

              {loading ? <p className="text-sm text-slate-500">Loading utilization...</p> : null}
              {!loading && utilization.length === 0 ? (
                <p className="text-sm text-slate-500">No utilization data available yet.</p>
              ) : null}

              {!loading && utilization.length > 0 ? (
                <div className="space-y-3">
                  {utilization.slice(0, 8).map((item) => {
                    const width = Math.round((Number(item.totalBookings || 0) / utilizationMax) * 100);
                    return (
                      <div key={item.roomId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span className="font-medium">
                            {item.roomName} ({item.block})
                          </span>
                          <span>{item.totalBookings} bookings</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-slate-800"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AdminChatBot analytics={analytics} pendingCount={pendingBookings.length} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Operational Checklist</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick admin status summary for daily operations.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">Pending queue healthy</span>
                <span className={pendingBookings.length < 4 ? "text-emerald-700" : "text-amber-700"}>
                  {pendingBookings.length < 4 ? "Yes" : "Needs review"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">Analytics available</span>
                <span className={analytics ? "text-emerald-700" : "text-rose-700"}>
                  {analytics ? "Ready" : "Unavailable"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">Most utilized room identified</span>
                <span className={topRoom ? "text-emerald-700" : "text-slate-500"}>
                  {topRoom ? "Yes" : "No data"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminPage;
