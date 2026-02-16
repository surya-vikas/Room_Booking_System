function StatsCard({ title, value, tone = "slate", icon = "TB" }) {
  const tones = {
    slate: "text-slate-900",
    green: "text-emerald-700",
    red: "text-rose-700",
    yellow: "text-amber-700",
    blue: "text-blue-700",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${tones[tone] || tones.slate}`}>{value}</p>
    </article>
  );
}

export default StatsCard;
