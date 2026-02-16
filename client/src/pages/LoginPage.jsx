import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/login", form);
      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("Invalid login response from server.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const destination = user.role === "admin" ? "/admin" : "/dashboard";
      navigate(destination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-slate-100">
      <div className="relative grid min-h-screen w-full overflow-hidden bg-white md:grid-cols-[42%_58%]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 p-12 text-white md:flex md:flex-col md:justify-between">
          <div className="relative z-10 space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/85">SmartSpace</p>
            <h2 className="text-4xl font-bold leading-tight">Welcome back</h2>
            <p className="max-w-xs text-sm text-white/90">
              Reserve rooms faster, track approvals in real time, and manage schedules from one
              workspace.
            </p>
          </div>

          <div className="relative z-10 space-y-2 text-sm text-white/90">
            <p>Real-time room availability</p>
            <p>Priority-based booking workflow</p>
            <p>Centralized approvals and updates</p>
          </div>

          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute top-24 -right-16 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-24 -left-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-8 h-72 w-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-40 right-24 h-28 w-28 rounded-full bg-white/15" />
        </aside>

        <div className="pointer-events-none absolute inset-y-0 left-[42%] hidden w-0 md:block">
          <span className="absolute left-[-64px] top-[0%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[12.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[25%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[37.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[50%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[62.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[75%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[87.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />
          <span className="absolute left-[-64px] top-[100%] h-32 w-32 -translate-y-1/2 rounded-full bg-sky-300/60" />

          <span className="absolute left-[-55px] top-[0%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[12.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[25%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[37.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[50%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[62.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[75%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[87.5%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute left-[-55px] top-[100%] h-32 w-32 -translate-y-1/2 rounded-full bg-white" />
        </div>

        <div className="relative flex items-center justify-center bg-white px-6 py-10 sm:px-10 md:px-14 lg:px-20">
          <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-blue-100/60" />
          <div className="pointer-events-none absolute bottom-20 right-16 h-24 w-24 rounded-full bg-sky-100/70" />
          <div className="pointer-events-none absolute top-1/2 right-4 h-16 w-16 -translate-y-1/2 rounded-full bg-slate-100/90" />

          <div className="relative z-10 w-full max-w-md">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-900 md:text-[2.6rem]">Sign In</h1>
              <p className="mt-2 text-sm text-slate-500">Use your email and password to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                E-mail Address
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="you@company.com"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Enter your password"
                  required
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
