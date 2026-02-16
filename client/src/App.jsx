import { useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, getCurrentUser, isAuthenticated } from "./auth/currentUser";
import { getRoleCapabilities } from "./auth/rolePermissions";
import NotificationBell from "./components/NotificationBell";
import RoleBadge from "./components/RoleBadge";
import AdminPage from "./pages/AdminPage";
import AdminAddRoomPage from "./pages/admin/AdminAddRoomPage";
import AdminApprovalsPage from "./pages/admin/AdminApprovalsPage";
import AdminDeleteRoomPage from "./pages/admin/AdminDeleteRoomPage";
import AdminEditRoomPage from "./pages/admin/AdminEditRoomPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import BookingsPage from "./pages/BookingsPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SearchPage from "./pages/SearchPage";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", short: "DB" },
  { to: "/search", label: "Search", short: "SR" },
  { to: "/bookings", label: "Bookings", short: "BK", permission: "canViewOwnBookingsOrAll" },
  { to: "/admin", label: "Admin", short: "AD", permission: "canManageRooms" },
];

const routeMeta = [
  { match: "/admin/users", title: "User Administration", subtitle: "Manage access and credentials." },
  { match: "/admin/rooms/add", title: "Add Room", subtitle: "Create and configure room records." },
  { match: "/admin/rooms/edit", title: "Edit Room", subtitle: "Update room details and features." },
  { match: "/admin/rooms/delete", title: "Delete Room", subtitle: "Remove room records safely." },
  { match: "/admin/approvals", title: "Approvals", subtitle: "Review pending booking requests." },
  { match: "/admin", title: "Admin Command Center", subtitle: "Monitor occupancy, approvals, and operations." },
  { match: "/bookings", title: "Bookings", subtitle: "Track booking history and outcomes." },
  { match: "/search", title: "Floor Planner", subtitle: "Discover rooms and check availability." },
  { match: "/dashboard", title: "Workspace Dashboard", subtitle: "Overview of schedules and notices." },
];

const resolveRouteMeta = (pathname) => {
  const entry = routeMeta.find((item) => pathname.startsWith(item.match));
  return entry || { title: "Workspace", subtitle: "SmartSpace operations console." };
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const capabilities = getRoleCapabilities(user.role);
  const [profileOpen, setProfileOpen] = useState(false);

  const visibleLinks = navLinks.filter((link) => {
    if (!link.permission) return true;
    if (link.permission === "canManageRooms") return capabilities.canManageRooms;
    if (link.permission === "canViewOwnBookingsOrAll") {
      return capabilities.canViewOwnBookings || capabilities.canViewAllBookings;
    }
    return true;
  });

  const routeInfo = useMemo(() => resolveRouteMeta(location.pathname), [location.pathname]);

  const handleLogout = () => {
    clearAuth();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  if (!authenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#8fb5ea]">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(35deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:64px_64px,28px_28px]" />

        <div className="relative min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#8fb5ea]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(35deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:64px_64px,28px_28px]" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col justify-between bg-black text-white md:flex">
        <div className="p-3">
          <div className="flex h-14 items-center justify-center rounded-xl bg-white/10 text-sm font-bold tracking-[0.2em]">
            SS
          </div>

          <nav className="mt-4 space-y-1">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setProfileOpen(false)}
                className={({ isActive }) =>
                  `group flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-lime-300 text-black"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/30 text-[10px] font-bold">
                  {link.short}
                </span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-white/20 px-2 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col md:pl-20">
        <header className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6 md:py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{routeInfo.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{routeInfo.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-900 md:inline-flex">
                Live
              </span>
              <NotificationBell enabled role={capabilities.role} iconOnly />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-slate-700 shadow-sm transition hover:bg-slate-100"
                  aria-label="Profile"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
                  </svg>
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="text-sm font-semibold text-slate-900">{user.name || "User"}</p>
                    <p className="text-xs text-slate-500">{user.email || "-"}</p>
                    <div className="mt-2">
                      <RoleBadge role={capabilities.role} />
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:hidden">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setProfileOpen(false)}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive ? "bg-black text-white" : "border border-slate-300 text-slate-700"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-100/85 p-3 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/bookings"
              element={
                capabilities.canViewOwnBookings || capabilities.canViewAllBookings ? (
                  <BookingsPage />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/admin"
              element={capabilities.canManageRooms ? <AdminPage /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/admin/rooms/add"
              element={
                capabilities.canManageRooms ? <AdminAddRoomPage /> : <Navigate to="/dashboard" replace />
              }
            />
            <Route
              path="/admin/approvals"
              element={
                capabilities.canManageRooms ? <AdminApprovalsPage /> : <Navigate to="/dashboard" replace />
              }
            />
            <Route
              path="/admin/rooms/edit"
              element={
                capabilities.canManageRooms ? <AdminEditRoomPage /> : <Navigate to="/dashboard" replace />
              }
            />
            <Route
              path="/admin/rooms/delete"
              element={
                capabilities.canManageRooms ? <AdminDeleteRoomPage /> : <Navigate to="/dashboard" replace />
              }
            />
            <Route
              path="/admin/users"
              element={
                capabilities.canManageRooms ? <AdminUsersPage /> : <Navigate to="/dashboard" replace />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </main>
  );
}

export default App;
