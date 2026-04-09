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

/** Placeholder "Videos" row until wired to videos API */
export const DEFAULT_HOME_VIDEOS = [
  {
    id: "v1",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "v2",
    title: "How to live",
    status: "watching",
    progress: 38,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "v3",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "v4",
    title: "How to live",
    status: "watching",
    progress: 62,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
];

/** Placeholder "Saved Videos" row until wired to saved videos API */
export const DEFAULT_HOME_SAVED_VIDEOS = [
  {
    id: "sv1",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv2",
    title: "How to live",
    status: "watching",
    progress: 38,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv3",
    title: "How to live",
    status: "completed",
    progress: 100,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
  {
    id: "sv4",
    title: "How to live",
    status: "watching",
    progress: 62,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=60",
  },
];

/** Placeholder "People" row until wired to instructors/people API */
export const DEFAULT_HOME_PEOPLE = [
  {
    id: "p1",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=12",
  },
  {
    id: "p2",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=32",
  },
  {
    id: "p3",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=45",
  },
  {
    id: "p4",
    name: "Dr Ahmed Mohammed",
    role: "php doctor",
    avatarUrl: "https://i.pravatar.cc/160?img=56",
  },
];
