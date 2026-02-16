import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin", label: "Overview", short: "OV" },
  { to: "/admin/approvals", label: "Approvals", short: "AP" },
  { to: "/admin/rooms/add", label: "Add Room", short: "AR" },
  { to: "/admin/rooms/edit", label: "Edit Room", short: "ER" },
  { to: "/admin/rooms/delete", label: "Delete Room", short: "DR" },
  { to: "/admin/users", label: "Users", short: "US" },
];

function AdminTabs() {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[10px] font-semibold">
            {tab.short}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}

export default AdminTabs;
