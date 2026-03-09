import * as Calendar from "expo-calendar";

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string; // "HH:MM AM/PM"
    endTime: string;
    startMinutes: number; // for sorting
}

const formatEventTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

const toMinutes = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
};

export const requestCalendarPermissions = async (): Promise<boolean> => {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        return status === "granted";
    } catch {
        return false;
    }
};

export const getTodaysCalendarEvents = async (): Promise<CalendarEvent[]> => {
    try {
        const hasPermission = await requestCalendarPermissions();
        if (!hasPermission) return [];

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const events = await Calendar.getEventsAsync(
            calendars.map((c) => c.id),
            startOfDay,
            endOfDay
        );

        return events
            .filter((e) => e.startDate && e.endDate)
            .map((e) => {
                const startDt = new Date(e.startDate);
                const endDt = new Date(e.endDate);
                return {
                    id: e.id,
                    title: e.title || "Untitled Event",
                    startTime: formatEventTime(startDt),
                    endTime: formatEventTime(endDt),
                    startMinutes: toMinutes(startDt),
                };
            })
            .sort((a, b) => a.startMinutes - b.startMinutes);
    } catch (e) {
        console.error("Failed to fetch calendar events", e);
        return [];
    }
};
