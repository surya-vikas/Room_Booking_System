import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { getCurrentUser } from "../../auth/currentUser";
import AdminTabs from "./AdminTabs";

const roleOptions = ["student", "club", "department", "admin"];

const initialCreateForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "student",
  department: "",
};

const getUserId = (user) => user?.id || user?._id || "";

function AdminUsersPage() {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser.id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [passwordForm, setPasswordForm] = useState({ userId: "", newPassword: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }

    try {
      const response = await apiClient.get("/admin/users");
      const list = response.data?.users || [];
      setUsers(list);
      setPasswordForm((previous) => {
        const existingSelection = list.find((user) => getUserId(user) === previous.userId);
        const nextUserId = existingSelection ? previous.userId : getUserId(list[0]);
        return {
          ...previous,
          userId: nextUserId || "",
        };
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load users.");
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const summary = useMemo(() => {
    const total = users.length;
    const paused = users.filter((user) => user.isPaused).length;
    const active = total - paused;
    const admins = users.filter((user) => user.role === "admin").length;
    return { total, active, paused, admins };
  }, [users]);

  const updateCreateForm = (field, value) => {
    setCreateForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setSubmittingCreate(true);
    setError("");
    setMessage("");

    try {
      await apiClient.post("/admin/users", createForm);
      setMessage("User account created successfully.");
      setCreateForm(initialCreateForm);
      await loadUsers({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create user.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handlePauseToggle = async (user) => {
    const userId = getUserId(user);
    if (!userId) return;

    setActionLoadingId(`pause-${userId}`);
    setError("");
    setMessage("");

    try {
      await apiClient.patch(`/admin/users/${userId}/pause`, { paused: !user.isPaused });
      setMessage(user.isPaused ? "User resumed." : "User paused.");
      await loadUsers({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update user status.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteUser = async (user) => {
    const userId = getUserId(user);
    if (!userId) return;

    const confirmed = window.confirm(`Delete user "${user.email}"? This action cannot be undone.`);
    if (!confirmed) return;

    setActionLoadingId(`delete-${userId}`);
    setError("");
    setMessage("");

    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setMessage("User deleted successfully.");
      await loadUsers({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete user.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!passwordForm.userId || !passwordForm.newPassword) return;

    setResettingPassword(true);
    setError("");
    setMessage("");

    try {
      await apiClient.patch(`/admin/users/${passwordForm.userId}/password`, {
        newPassword: passwordForm.newPassword,
      });
      setMessage("Password updated successfully.");
      setPasswordForm((previous) => ({ ...previous, newPassword: "" }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-sm text-slate-600">
              Create accounts and manage user access, status, and credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Total Users</p>
            <p className="text-xl font-semibold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-emerald-600">Active</p>
            <p className="text-xl font-semibold text-emerald-700">{summary.active}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-amber-600">Paused</p>
            <p className="text-xl font-semibold text-amber-700">{summary.paused}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-blue-600">Admins</p>
            <p className="text-xl font-semibold text-blue-700">{summary.admins}</p>
          </div>
        </div>
      </div>

      <AdminTabs />

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={handleCreateUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Account</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={createForm.name}
              onChange={(event) => updateCreateForm("name", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Full Name"
              required
            />
            <input
              type="email"
              value={createForm.email}
              onChange={(event) => updateCreateForm("email", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Email"
              required
            />
            <input
              value={createForm.phone}
              onChange={(event) => updateCreateForm("phone", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Phone"
              required
            />
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => updateCreateForm("password", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Password"
              required
            />
            <select
              value={createForm.role}
              onChange={(event) => updateCreateForm("role", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.toUpperCase()}
                </option>
              ))}
            </select>
            <input
              value={createForm.department}
              onChange={(event) => updateCreateForm("department", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="Department (optional)"
            />
          </div>
          <button
            type="submit"
            disabled={submittingCreate}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submittingCreate ? "Creating..." : "Create Account"}
          </button>
        </form>

        <form
          onSubmit={handleResetPassword}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Change User Password</h2>
          <div className="mt-3 space-y-3">
            <select
              value={passwordForm.userId}
              onChange={(event) =>
                setPasswordForm((previous) => ({ ...previous, userId: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              required
            >
              {users.map((user) => (
                <option key={getUserId(user)} value={getUserId(user)}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              placeholder="New password"
              minLength={6}
              required
            />
            <button
              type="submit"
              disabled={resettingPassword || users.length === 0}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {resettingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
        {loading ? <p className="mt-3 text-sm text-slate-600">Loading users...</p> : null}

        {!loading && users.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No users found.</p>
        ) : null}

        {!loading && users.length > 0 ? (
          <div className="mt-3 space-y-3">
            {users.map((user) => {
              const userId = getUserId(user);
              const isSelf = String(userId) === String(currentUserId);
              const pauseLoading = actionLoadingId === `pause-${userId}`;
              const deleteLoading = actionLoadingId === `delete-${userId}`;

              return (
                <div
                  key={userId}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="text-xs text-slate-500">
                        {user.phone} | {user.department || "No department"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                        {String(user.role).toUpperCase()}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          user.isPaused
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {user.isPaused ? "Paused" : "Active"}
                      </span>
                      {isSelf ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          You
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pauseLoading || isSelf}
                      onClick={() => handlePauseToggle(user)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {pauseLoading ? "Saving..." : user.isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      disabled={deleteLoading || isSelf}
                      onClick={() => handleDeleteUser(user)}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {deleteLoading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AdminUsersPage;
