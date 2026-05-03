import React, { useEffect, useMemo, useRef, useState } from "react";
import { categorizeResources } from "./utils";
import { getUserByEmail } from "../../../services/userService";
import { joinGroup, deleteMembership, getGroupMemberships, deleteResource, addResource, addLinkResource, addGroupAdmin, removeGroupAdminByEmail } from "../../Groups/services/groupsService";
import { smartToast } from "../../../API/toastManager";
import {
  buildPendingResourceUpload,
  revokePendingResourceBlobs,
} from "../../Meetings/utils/pendingResourceUpload";
import { parseEmailsInput } from "../../../utils/parseEmailsInput";
import { getEffectiveMemberRole } from "./MainChatExpandedSectionRoleUtils";
import MainChatExpandedSectionMembersView from "./MainChatExpandedSectionMembersView";
import MainChatExpandedSectionContentView from "./MainChatExpandedSectionContentView";
import { LegacyExpandedSection } from "./MainChatExpandedSectionResourceViews";

export default function MainChatExpandedSection({
  activeSection,
  expandedSection,
  groupMembers,
  groupInfo,
  mediaTabResources,
  mediaTab,
  setMediaTab,
  contentResources,
  contentTab,
  setContentTab,
  onMediaClick,
  groupId,
  userRole,
  currentUserEmail,
  contentName,
  onUpdateContentName,
  onRefreshGroupInfo,
}) {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [showDeleteResourceModal, setShowDeleteResourceModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const touchTimer = useRef(null);
  const fileInputRef = useRef(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [pendingResourceUploads, setPendingResourceUploads] = useState([]);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editVal, setEditVal] = useState("");
  const titleInputRef = useRef(null);
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [assignAdminForm, setAssignAdminForm] = useState({ emailsText: "", role: "" });
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);
  const [removeAdminEmail, setRemoveAdminEmail] = useState("");
  const [removeAdminEmailReadOnly, setRemoveAdminEmailReadOnly] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState(false);

  useEffect(() => {
    setEditVal(contentName || "");
  }, [contentName]);

  useEffect(() => {
    if (isEditingContent && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingContent]);

  const handleSaveContentName = () => {
    setIsEditingContent(false);
    if (editVal.trim() !== contentName && onUpdateContentName) {
      onUpdateContentName(editVal.trim());
    } else {
      setEditVal(contentName || "");
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveContentName();
    else if (e.key === "Escape") {
      setIsEditingContent(false);
      setEditVal(contentName || "");
    }
  };
  const meInMembers = (groupMembers || []).find((m) => {
    const memberEmail = String(m?.email || "").trim().toLowerCase();
    return memberEmail === String(currentUserEmail || "").trim().toLowerCase();
  });
  const currentMemberEffectiveRole = getEffectiveMemberRole(meInMembers, groupInfo);
  const isPrimaryAdmin = currentMemberEffectiveRole === "owner" || (
    groupInfo?.group?.administrator_email &&
    String(currentUserEmail || "").trim().toLowerCase() === String(groupInfo.group.administrator_email).trim().toLowerCase()
  );
  const normalizedUserRole = (userRole || "").toString().trim().toLowerCase();
  const isAdmin = ["administrator", "admin", "super_admin", "super-admin", "owner"].includes(normalizedUserRole) || currentMemberEffectiveRole === "admin" || isPrimaryAdmin;
  const isOwner = ["owner", "super_admin", "super-admin"].includes(normalizedUserRole) || currentMemberEffectiveRole === "owner" || isPrimaryAdmin;
  const groupLabelForModals = groupInfo?.group?.group_name || groupInfo?.group_name || groupInfo?.group?.name || "Group";

  const handleAssignGroupAdmin = async () => {
    const emails = parseEmailsInput(assignAdminForm.emailsText || "");
    if (!groupId || assigningAdmin) return;
    if (emails.length === 0) {
      smartToast.error("Please enter at least one email");
      return;
    }
    setAssigningAdmin(true);
    try {
      const payload =
        emails.length === 1
          ? { email: emails[0], role: "ADMIN" }
          : { emails, role: "ADMIN" };
      const { data: resBody } = await addGroupAdmin(groupId, payload);
      const results = Array.isArray(resBody?.data) ? resBody.data : [];
      const allOk = results.length > 0 && results.every((r) => r.success);
      const someOk = results.some((r) => r.success);

      if (allOk) {
        smartToast.success(resBody?.message || "Admin assigned successfully");
        setShowAssignAdminModal(false);
        setAssignAdminForm({ emailsText: "", role: "" });
        await onRefreshGroupInfo?.();
      } else if (someOk) {
        const failed = results
          .filter((r) => !r.success)
          .map((r) => `${r.email}: ${r.message || "failed"}`)
          .join(" · ");
        smartToast.warning(`${resBody?.message || "Some admins could not be added"}. ${failed}`);
        await onRefreshGroupInfo?.();
      } else {
        const failed = results.length
          ? results.map((r) => `${r.email}: ${r.message || "failed"}`).join(" · ")
          : resBody?.message || "Failed to assign admin";
        smartToast.error(failed);
      }
    } catch (error) {
      console.error("assign group admin:", error);
      smartToast.error(error?.response?.data?.message || error?.message || "Failed to assign admin");
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleRemoveGroupAdmin = async () => {
    const email = (removeAdminEmail || "").trim();
    if (!email || !groupId || removingAdmin) return;
    setRemovingAdmin(true);
    try {
      const { data: resBody } = await removeGroupAdminByEmail(groupId, email);
      const results = Array.isArray(resBody?.data) ? resBody.data : [];
      const allOk = results.length > 0 && results.every((r) => r.success);
      const someOk = results.some((r) => r.success);

      if (allOk) {
        smartToast.success(resBody?.message || "Admin removed");
        setShowRemoveAdminModal(false);
        setRemoveAdminEmail("");
        setRemoveAdminEmailReadOnly(false);
        await onRefreshGroupInfo?.();
      } else if (someOk) {
        const failed = results
          .filter((r) => !r.success)
          .map((r) => `${r.email}: ${r.message || "failed"}`)
          .join(" · ");
        smartToast.warning(`${resBody?.message || "Some removals failed"}. ${failed}`);
        await onRefreshGroupInfo?.();
      } else {
        const failed = results.length
          ? results.map((r) => `${r.email}: ${r.message || "failed"}`).join(" · ")
          : resBody?.message || "Failed to remove admin";
        smartToast.error(failed);
      }
    } catch (error) {
      console.error("remove group admin:", error);
      const resData = error?.response?.data;
      const errResults = Array.isArray(resData?.data) ? resData.data : [];
      if (errResults.length) {
        smartToast.error(errResults.map((r) => `${r.email}: ${r.message || "failed"}`).join(" · "));
      } else {
        smartToast.error(resData?.message || error?.message || "Failed to remove admin");
      }
    } finally {
      setRemovingAdmin(false);
    }
  };

  const openRemoveAdminModal = (member, { readOnlyEmail = true } = {}) => {
    setRemoveAdminEmail((member?.email || "").trim());
    setRemoveAdminEmailReadOnly(readOnlyEmail);
    setShowRemoveAdminModal(true);
  };

  const [membershipMap, setMembershipMap] = useState({});

  useEffect(() => {
    const fetchMembershipMap = async () => {
      if (isAdmin && activeSection === "members" && groupId) {
        try {
          const res = await getGroupMemberships();
          const allGroups = res.data?.data || res.data || [];
          if (Array.isArray(allGroups)) {
            const map = {};
            const currentGroupData = allGroups.find(g => String(g.group_id || g.id) === String(groupId));
            if (currentGroupData?.members && Array.isArray(currentGroupData.members)) {
              currentGroupData.members.forEach(m => {
                if (m.member_id && m.membership_id) {
                  map[String(m.member_id)] = String(m.membership_id);
                }
              });
              setMembershipMap(map);
            }
          }
        } catch (err) {
          console.error("Error fetching memberships mapping:", err);
        }
      }
    };
    fetchMembershipMap();
  }, [isAdmin, activeSection, groupId, groupMembers]);

  const handleDeleteMember = async () => {
    const mId = membershipMap[String(memberToDelete?.id)];
    if (!mId) {
      smartToast.error("This member cannot be removed (e.g., Administrator or ID not found)");
      return;
    }
    setIsDeletingMember(true);
    try {
      await deleteMembership(mId);
      smartToast.success("Member removed successfully");
      setShowDeleteModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove member:", error);
      smartToast.error(error.response?.data?.message || "Failed to remove member");
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleContextMenu = (e, item) => {
    if (!isAdmin) return;
    if (e.preventDefault) e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item });
  };

  const handleTouchStart = (e, item) => {
    if (!isAdmin) return;
    const touch = e.touches[0];
    const coords = { x: touch.clientX, y: touch.clientY };
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      handleContextMenu({ clientX: coords.x, clientY: coords.y }, item);
      touchTimer.current = null;
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleClick = () => {
    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
  };

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu.visible]);

  const handleDeleteResource = async () => {
    if (!resourceToDelete?.id || !groupInfo?.content?.id) {
      smartToast.error("Missing resource or content ID");
      return;
    }
    setIsDeletingResource(true);
    try {
      await deleteResource(groupInfo.content.id, resourceToDelete.id);
      smartToast.success("Resource deleted successfully");
      setShowDeleteResourceModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to delete resource:", error);
      smartToast.error(error.response?.data?.message || "Failed to delete resource");
    } finally {
      setIsDeletingResource(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      smartToast.error("Please enter an email address");
      return;
    }
    if (!groupId) {
      smartToast.error("Group ID is missing");
      return;
    }

    setIsAdding(true);
    try {
      const userRes = await getUserByEmail(newMemberEmail.trim());
      const userData = userRes?.data?.data || userRes?.data;
      if (!userData?.id) {
        smartToast.error("User with this email not found");
        setIsAdding(false);
        return;
      }
      await joinGroup(groupId, userData.id);
      smartToast.success("Member added successfully!");
      setShowAddMemberModal(false);
      setNewMemberEmail("");
      window.location.reload();
    } catch (error) {
      console.error("Failed to add member:", error);
      const errorMsg = error.response?.data?.message || "Failed to add member. Please check if the user is already in the group.";
      smartToast.error(errorMsg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const pendingUploadsRef = useRef([]);
  useEffect(() => {
    pendingUploadsRef.current = pendingResourceUploads;
  }, [pendingResourceUploads]);

  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach(revokePendingResourceBlobs);
    };
  }, []);

  const bucketForPendingItem = (item) => {
    if (item?.media_type === "audio") return "audio";
    const ft = String(item?.file_type || "").toLowerCase();
    if (ft.startsWith("image/") || ft.startsWith("video/")) return "photos";
    if (ft.startsWith("audio/")) return "audio";
    const name = String(item?.file_name || item?.fileName || "");
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    const videoExt = ["mp4", "mov", "webm", "mkv", "avi"];
    const audioExt = ["mp3", "wav", "aac", "m4a", "ogg"];
    if (videoExt.includes(ext)) return "photos";
    if (audioExt.includes(ext)) return "audio";
    return "documents";
  };

  const contentResourcesWithPending = useMemo(() => {
    const base = contentResources || {
      photos: [],
      links: [],
      documents: [],
      audio: [],
    };
    const photos = [...(base.photos || [])];
    const documents = [...(base.documents || [])];
    const audio = [...(base.audio || [])];
    const links = [...(base.links || [])];

    for (const p of pendingResourceUploads) {
      const b = bucketForPendingItem(p);
      if (b === "photos") photos.unshift(p);
      else if (b === "audio") audio.unshift(p);
      else documents.unshift(p);
    }

    return { ...base, photos, documents, audio, links };
  }, [contentResources, pendingResourceUploads]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!groupInfo?.content?.id) {
      smartToast.error("Group content ID not found");
      return;
    }

    const contentId = groupInfo.content.id;
    const uploadId = `resource-upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const previewUrl = URL.createObjectURL(file);
    const pending = buildPendingResourceUpload({
      uploadId,
      fileName: file.name,
      fileType: file.type,
      previewUrl,
    });
    const ft = (file.type || "").toLowerCase();
    const ext = file.name?.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "";
    const audioExt = ["mp3", "wav", "aac", "m4a", "ogg"];
    if (ft.startsWith("audio/") || audioExt.includes(ext)) {
      pending.media_type = "audio";
    }

    setPendingResourceUploads((prev) => [pending, ...prev]);

    try {
      await addResource(contentId, file);
      await onRefreshGroupInfo?.();
      smartToast.success("File uploaded successfully");
      setPendingResourceUploads((prev) => {
        const row = prev.find((p) => p.id === uploadId);
        if (row) revokePendingResourceBlobs(row);
        return prev.filter((p) => p.id !== uploadId);
      });
    } catch (error) {
      console.error("Failed to upload file:", error);
      smartToast.error(error.response?.data?.message || "Failed to upload file");
      setPendingResourceUploads((prev) => {
        const row = prev.find((p) => p.id === uploadId);
        if (row) revokePendingResourceBlobs(row);
        return prev.filter((p) => p.id !== uploadId);
      });
    }
  };

  const handleAddLinkResource = async () => {
    if (!newLinkUrl.trim()) {
      smartToast.error("Please enter a URL");
      return;
    }

    if (!groupInfo?.content?.id) {
      smartToast.error("Group content ID not found");
      return;
    }

    setIsSubmittingLink(true);
    try {
      await addLinkResource(groupInfo.content.id, newLinkUrl.trim());
      smartToast.success("Link added successfully");
      setShowAddLinkModal(false);
      setNewLinkUrl("");
      window.location.reload();
    } catch (error) {
      console.error("Failed to add link:", error);
      smartToast.error(error.response?.data?.message || "Failed to add link");
    } finally {
      setIsSubmittingLink(false);
    }
  };
  const members = Array.isArray(groupMembers) ? groupMembers : [];
  const { photos, links, documents } = groupInfo?.content?.resources ? categorizeResources(groupInfo.content.resources) : { photos: [], links: [], documents: [], audio: [] };

  if (activeSection === "members") {
    return (
      <MainChatExpandedSectionMembersView
        members={members}
        groupInfo={groupInfo}
        isOwner={isOwner}
        isAdmin={isAdmin}
        currentUserEmail={currentUserEmail}
        groupLabelForModals={groupLabelForModals}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        handleDeleteMember={handleDeleteMember}
        memberToDelete={memberToDelete}
        isDeletingMember={isDeletingMember}
        showAssignAdminModal={showAssignAdminModal}
        assignAdminForm={assignAdminForm}
        setAssignAdminForm={setAssignAdminForm}
        handleAssignGroupAdmin={handleAssignGroupAdmin}
        setShowAssignAdminModal={setShowAssignAdminModal}
        assigningAdmin={assigningAdmin}
        showRemoveAdminModal={showRemoveAdminModal}
        removeAdminEmail={removeAdminEmail}
        setRemoveAdminEmail={setRemoveAdminEmail}
        removeAdminEmailReadOnly={removeAdminEmailReadOnly}
        handleRemoveGroupAdmin={handleRemoveGroupAdmin}
        setShowRemoveAdminModal={setShowRemoveAdminModal}
        setRemoveAdminEmailReadOnly={setRemoveAdminEmailReadOnly}
        removingAdmin={removingAdmin}
        showAddMemberModal={showAddMemberModal}
        setShowAddMemberModal={setShowAddMemberModal}
        newMemberEmail={newMemberEmail}
        setNewMemberEmail={setNewMemberEmail}
        handleAddMember={handleAddMember}
        isAdding={isAdding}
        setMemberToDelete={setMemberToDelete}
        openRemoveAdminModal={openRemoveAdminModal}
      />
    );
  }

  if (activeSection) {
    return (
      <MainChatExpandedSectionContentView
        activeSection={activeSection}
        expandedSection={expandedSection}
        contentName={contentName}
        isEditingContent={isEditingContent}
        titleInputRef={titleInputRef}
        editVal={editVal}
        setEditVal={setEditVal}
        handleSaveContentName={handleSaveContentName}
        handleTitleKeyDown={handleTitleKeyDown}
        setIsEditingContent={setIsEditingContent}
        mediaTabResources={mediaTabResources}
        mediaTab={mediaTab}
        setMediaTab={setMediaTab}
        contentResources={contentResourcesWithPending}
        contentTab={contentTab}
        setContentTab={setContentTab}
        onMediaClick={onMediaClick}
        isAdmin={isAdmin}
        handleUploadClick={handleUploadClick}
        setShowAddLinkModal={setShowAddLinkModal}
        handleContextMenu={handleContextMenu}
        handleTouchStart={handleTouchStart}
        handleTouchEnd={handleTouchEnd}
        handleClick={handleClick}
        contextMenu={contextMenu}
        setResourceToDelete={setResourceToDelete}
        setShowDeleteResourceModal={setShowDeleteResourceModal}
        setContextMenu={setContextMenu}
        showDeleteResourceModal={showDeleteResourceModal}
        handleDeleteResource={handleDeleteResource}
        isDeletingResource={isDeletingResource}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        showAddLinkModal={showAddLinkModal}
        newLinkUrl={newLinkUrl}
        setNewLinkUrl={setNewLinkUrl}
        handleAddLinkResource={handleAddLinkResource}
        isSubmittingLink={isSubmittingLink}
      />
    );
  }

  if (!expandedSection) return null;
  return <LegacyExpandedSection expandedSection={expandedSection} photos={photos} links={links} documents={documents} onMediaClick={onMediaClick} />;
}
