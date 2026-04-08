import {
  VideoCamera,
  Headphones,
  UsersFourIcon ,
  UsersThreeIcon ,
  UploadIcon ,
} from "@phosphor-icons/react";

/** Placeholder stats until a dashboard API exists */
export const DEFAULT_HOME_STAT_ITEMS = [
  { key: "videos", icon: VideoCamera, title: "Video sessions", value: "33", unit: "Video" },
  { key: "meetings", icon: Headphones, title: "Meetings", value: "7", unit: "meetings" },
  { key: "group", icon: UsersFourIcon , title: "Group", value: "33", unit: "Video" },
  { key: "chat", icon: UsersThreeIcon , title: "Group Chat", value: "123", unit: "Unread" },
  { key: "saved", icon: UploadIcon , title: "Saved", value: "14", unit: "Saved" },
];

/** Placeholder upcoming meetings until wired to calendar API */
export const DEFAULT_UPCOMING_MEETINGS = [
  {
    id: "1",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
  {
    id: "2",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
  {
    id: "3",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
  {
    id: "4",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
  {
    id: "5",
    groupLabel: "Group name",
    course: "OOP 1st semester",
    start: "Nov 28 2026, 3:30 pm",
    end: "Nov 28 2026, 7:30 pm",
  },
];
