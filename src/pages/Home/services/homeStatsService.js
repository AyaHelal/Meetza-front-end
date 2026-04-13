import {
  VideoCamera,
  Headphones,
  UsersFourIcon,
  UsersThreeIcon,
  UploadIcon,
} from "@phosphor-icons/react";

/** Placeholder stats until a dashboard API exists */
export const DEFAULT_HOME_STAT_ITEMS = [
  { key: "videos", icon: VideoCamera, title: "Video sessions", value: "33", unit: "Video" },
  { key: "meetings", icon: Headphones, title: "Meetings", value: "7", unit: "meetings" },
  { key: "group", icon: UsersFourIcon, title: "Group", value: "33", unit: "Video" },
  { key: "chat", icon: UsersThreeIcon, title: "Group Chat", value: "123", unit: "Unread" },
  { key: "saved", icon: UploadIcon, title: "Saved", value: "14", unit: "Saved" },
];

