/**
 * Get Monday–Sunday dates for the week containing the given date.
 */
export function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    week.push(dayDate);
  }
  return week;
}

export function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatDayShort(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase().slice(0, 3);
}

export function formatDayNum(date) {
  return date.getDate();
}

export function formatShortDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatTimeRange(start, end) {
  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${fmt(start)} to ${fmt(end)}`;
}

export function formatDateForOverlay(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Default events for the week (demo data). In real app, fetch from API.
 */
export function defaultCalendarEvents(weekDates) {
  const baseImage = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400";
  return [
    {
      id: "1",
      dayIndex: 0,
      start: new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate(), 19, 24),
      end: new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate(), 20, 30),
      title: "Meeting Title",
      description: "Description for the video.",
      groupName: "Group Section 1",
      imageUrl: baseImage,
      lockType: "red",
    },
    {
      id: "2",
      dayIndex: 1,
      start: new Date(weekDates[1].getFullYear(), weekDates[1].getMonth(), weekDates[1].getDate(), 19, 24),
      end: new Date(weekDates[1].getFullYear(), weekDates[1].getMonth(), weekDates[1].getDate(), 20, 30),
      title: "Meeting Title",
      description: "Description for the video.",
      groupName: "Group Section 1",
      imageUrl: baseImage,
      lockType: "blue",
    },
    {
      id: "3",
      dayIndex: 2,
      start: new Date(weekDates[2].getFullYear(), weekDates[2].getMonth(), weekDates[2].getDate(), 19, 24),
      end: new Date(weekDates[2].getFullYear(), weekDates[2].getMonth(), weekDates[2].getDate(), 20, 30),
      title: "Meeting Title",
      description: "Description for the video.",
      groupName: "Group Section 1",
      imageUrl: baseImage,
      lockType: "blue",
    },
  ];
}
