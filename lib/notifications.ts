// lib/notifications.ts
// Browser notification utilities

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationOptions {
  title: string;
  body: string;
  priority?: NotificationPriority;
  tag?: string; // Groups related notifications
  data?: any; // Custom data for click handling
  requireInteraction?: boolean; // Keep notification visible until clicked
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Browser doesn't support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Check if notifications are enabled
export function areNotificationsEnabled(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

// Play notification sound
function playNotificationSound(priority: NotificationPriority) {
  try {
    const audio = new Audio();
    
    // Different sounds for different priorities
    if (priority === "urgent") {
      // Higher pitch, more urgent
      audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvm==";
      audio.volume = 0.8;
    } else if (priority === "high") {
      audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvm==";
      audio.volume = 0.6;
    } else {
      audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dyvm==";
      audio.volume = 0.4;
    }
    
    audio.play().catch(err => console.warn("Could not play notification sound:", err));
  } catch (err) {
    console.warn("Error playing notification sound:", err);
  }
}

// Check if currently in quiet hours
function isQuietHours(): boolean {
  try {
    const quietStart = localStorage.getItem("quiet_hours_start");
    const quietEnd = localStorage.getItem("quiet_hours_end");
    
    if (!quietStart || !quietEnd) {
      return false; // No quiet hours set
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietStart.split(":").map(Number);
    const [endHour, endMin] = quietEnd.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle case where quiet hours span midnight
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
    
    return currentTime >= startMinutes && currentTime < endMinutes;
  } catch (err) {
    console.warn("Error checking quiet hours:", err);
    return false;
  }
}

// Show a browser notification
export function showNotification(options: NotificationOptions): Notification | null {
  if (!areNotificationsEnabled()) {
    console.warn("Notifications not enabled");
    return null;
  }

  // Check user preferences
  const notificationsEnabled = localStorage.getItem("notifications_enabled");
  if (notificationsEnabled === "false") {
    return null; // User has disabled notifications
  }

  // Check quiet hours
  if (isQuietHours() && options.priority !== "urgent") {
    console.log("Quiet hours active, skipping notification");
    return null;
  }

  const {
    title,
    body,
    priority = "normal",
    tag,
    data,
    requireInteraction = false,
  } = options;

  try {
    // Play sound based on priority
    if (priority === "high" || priority === "urgent") {
      playNotificationSound(priority);
    }

    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || `notification-${Date.now()}`,
      requireInteraction: requireInteraction || priority === "urgent",
      data,
    });

    // Auto-close non-urgent notifications after 10 seconds
    if (priority !== "urgent" && !requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  } catch (err) {
    console.error("Error showing notification:", err);
    return null;
  }
}

// Notification templates for common scenarios

export function notifyNewIncident(incident: {
  id: string;
  type: string;
  description: string;
  road?: string | null;
  city?: string | null;
}) {
  const location = incident.road || incident.city || "Unknown location";
  
  const notification = showNotification({
    title: `🚨 New ${incident.type.replace("_", " ").toUpperCase()}`,
    body: `${location}\n${incident.description || "No details"}`,
    priority: "high",
    tag: `incident-${incident.id}`,
    data: { type: "new_incident", incidentId: incident.id },
    requireInteraction: true,
  });

  if (notification) {
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

export function notifyJobAssigned(job: {
  id: string;
  description: string;
  road?: string | null;
  truckName?: string;
}) {
  const location = job.road || "Unknown location";
  
  const notification = showNotification({
    title: "📋 New Job Assigned",
    body: `${location}${job.truckName ? `\n🚛 ${job.truckName}` : ""}\n${job.description}`,
    priority: "urgent",
    tag: `job-${job.id}`,
    data: { type: "job_assigned", jobId: job.id },
    requireInteraction: true,
  });

  if (notification) {
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

export function notifyJobStatusChange(job: {
  id: string;
  status: string;
  driverName?: string;
  road?: string | null;
}) {
  const statusEmoji = 
    job.status === "en_route" ? "🚗" :
    job.status === "on_scene" ? "🔧" :
    job.status === "completed" ? "✅" : "📋";
    
  const statusText = job.status.replace("_", " ").toUpperCase();
  const location = job.road || "Unknown location";
  
  showNotification({
    title: `${statusEmoji} Job ${statusText}`,
    body: `${job.driverName || "Driver"} - ${location}`,
    priority: "normal",
    tag: `job-status-${job.id}`,
    data: { type: "job_status", jobId: job.id, status: job.status },
  });
}

export function notifyNearbyIncident(incident: {
  id: string;
  type: string;
  road?: string | null;
  distanceKm?: number;
}) {
  const location = incident.road || "Nearby";
  const distance = incident.distanceKm 
    ? `${incident.distanceKm.toFixed(1)}km away` 
    : "nearby";
  
  showNotification({
    title: `📍 Incident ${distance}`,
    body: `${incident.type.replace("_", " ").toUpperCase()} - ${location}`,
    priority: "normal",
    tag: `nearby-${incident.id}`,
    data: { type: "nearby_incident", incidentId: incident.id },
  });
}
