const ROLE_PRIORITY = {
  student: 1,
  club: 2,
  department: 3,
  admin: 4,
};

const normalizeRole = (role) => {
  const safeRole = String(role || "student").toLowerCase();
  return ROLE_PRIORITY[safeRole] ? safeRole : "student";
};

const getRoleCapabilities = (role) => {
  const normalizedRole = normalizeRole(role);
  const priority = ROLE_PRIORITY[normalizedRole];

  return {
    role: normalizedRole,
    priority,
    canBook: ["student", "club", "department", "admin"].includes(normalizedRole),
    canViewOwnBookings: ["student", "club", "department"].includes(normalizedRole),
    canViewAllBookings: normalizedRole === "admin",
    canManageRooms: normalizedRole === "admin",
    canOverrideStudents: ["club", "department", "admin"].includes(normalizedRole),
    canOverrideClubs: ["department", "admin"].includes(normalizedRole),
    canOverrideDepartments: normalizedRole === "admin",
  };
};

const canOverrideRole = (currentRole, targetRole) => {
  const currentPriority = ROLE_PRIORITY[normalizeRole(currentRole)] || 0;
  const targetPriority = ROLE_PRIORITY[normalizeRole(targetRole)] || 0;
  return currentPriority > targetPriority;
};

export { ROLE_PRIORITY, normalizeRole, getRoleCapabilities, canOverrideRole };
