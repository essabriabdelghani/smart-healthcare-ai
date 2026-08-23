import api from "./api";
import type { AppNotification } from "../types/patient";

interface NotificationApiResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function toNotification(n: NotificationApiResponse): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<NotificationApiResponse[]>("/notifications");
  return data.map(toNotification);
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notifications/unread-count");
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}