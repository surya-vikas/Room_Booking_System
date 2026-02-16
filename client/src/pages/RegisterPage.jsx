import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

const roles = ["student", "department", "admin"];

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "student",
    department: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.post("/auth/register", form);
      setSuccess("Registration successful. Please login with your credentials.");
      setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || requestError.message || "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold text-slate-900">Sign Up</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create an account as Student, Department, or Admin.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Full Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Phone
          <input
            type="text"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="+919999999999"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Role
          <select
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Department
          <input
            type="text"
            value={form.department}
            onChange={(e) => updateField("department", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="CSE / Admin Office / etc."
          />
        </label>

        <div className="md:col-span-2">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default RegisterPage;
