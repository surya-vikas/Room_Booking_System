const styles = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  OVERRIDDEN: "bg-blue-100 text-blue-800",
};

function StatusBadge({ status = "APPROVED" }) {
  const key = String(status).toUpperCase();
  const className = styles[key] || "bg-slate-100 text-slate-800";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {key}
    </span>
  );
}

export default StatusBadge;
