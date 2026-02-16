import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

const statusLabel = {
  approved: "Approved",
  cancelled: "Cancelled",
  rejected: "Rejected",
  pending: "Pending",
};

function NotificationBell({ enabled = false, role = "guest", iconOnly = true }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const loadNotifications = async () => {
      try {
        const historyRes = await apiClient.get("/bookings/history");
        const history = (historyRes.data?.bookings || []).slice(0, 5).map((item) => ({
          id: item._id,
          tone: item.status === "approved" ? "text-emerald-700" : item.status === "cancelled" ? "text-rose-700" : "text-amber-700",
          title: `${statusLabel[item.status] || "Updated"} - ${item.roomId?.name || "Room"}`,
          meta: `${new Date(item.date).toLocaleDateString()} ${item.startTime}-${item.endTime}`,
        }));

        let pendingMeta = [];
        if (["admin", "department"].includes(role)) {
          const pendingRes = await apiClient.get("/bookings/pending");
          const pendingCount = pendingRes.data?.bookings?.length || 0;
          pendingMeta = [
            {
              id: "pending-count",
              tone: "text-amber-700",
              title: `${pendingCount} request(s) waiting`,
              meta: "Open approvals to review",
            },
          ];
        }

        setNotifications([...pendingMeta, ...history].slice(0, 6));
      } catch {
        setNotifications([]);
      }
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 12000);
    return () => clearInterval(intervalId);
  }, [enabled, role]);

  const badgeCount = useMemo(() => notifications.length, [notifications.length]);

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
      >
        {iconOnly ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0" />
          </svg>
        ) : (
          <span className="text-xs font-semibold">Notifications</span>
        )}
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            {badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-slate-900">Notifications</p>
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                  <p className={`text-xs font-semibold ${item.tone}`}>{item.title}</p>
                  <p className="text-[11px] text-slate-600">{item.meta}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
