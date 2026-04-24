export function normalizeMemberManagementRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "owner") return "owner";
  if (
    normalized === "admin" ||
    normalized === "administrator" ||
    normalized === "leader"
  ) {
    return "admin";
  }
  return normalized;
}

export function getMemberUserIdentifier(member) {
  return String(
    member?.user_id ??
      member?.userId ??
      member?.id ??
      member?.member_id ??
      member?.memberId ??
      ""
  ).trim();
}

export function findAdminEntryForMember(member, groupInfo) {
  const admins = Array.isArray(groupInfo?.group?.admins)
    ? groupInfo.group.admins
    : Array.isArray(groupInfo?.admins)
      ? groupInfo.admins
      : [];

  const memberId = getMemberUserIdentifier(member);
  const memberEmail = String(member?.email || "").trim().toLowerCase();

  return (
    admins.find((admin) => {
      const adminId = String(
        admin?.user_id ?? admin?.userId ?? admin?.id ?? ""
      ).trim();
      const adminEmail = String(admin?.email || "").trim().toLowerCase();
      return (
        (memberId && adminId && memberId === adminId) ||
        (memberEmail && adminEmail && memberEmail === adminEmail)
      );
    }) || null
  );
}

export function getEffectiveMemberRole(member, groupInfo) {
  const adminEntry = findAdminEntryForMember(member, groupInfo);
  const adminRole = normalizeMemberManagementRole(adminEntry?.role);
  if (adminRole === "owner" || adminRole === "admin") return adminRole;

  const ownerId = String(
    groupInfo?.group?.administrator_id || groupInfo?.administrator_id || ""
  ).trim();
  const memberId = getMemberUserIdentifier(member);
  if (ownerId && memberId && ownerId === memberId) return "owner";

  return normalizeMemberManagementRole(member?.role);
}
