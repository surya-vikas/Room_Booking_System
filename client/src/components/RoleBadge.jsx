const ROLE_STYLES = {
  student: "bg-slate-200 text-slate-700 border-slate-300",
  club: "bg-violet-100 text-violet-700 border-violet-300",
  department: "bg-blue-100 text-blue-700 border-blue-300",
  admin: "bg-rose-100 text-rose-700 border-rose-300",
  guest: "bg-slate-100 text-slate-600 border-slate-200",
};

function RoleBadge({ role = "guest" }) {
  const safeRole = String(role || "guest").toLowerCase();
  const style = ROLE_STYLES[safeRole] || ROLE_STYLES.guest;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
      {safeRole.toUpperCase()}
    </span>
  );
}

export default RoleBadge;

