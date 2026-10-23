import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const TOKEN_STORAGE_KEY = "staff-push-token";
export const PAYSLIP_PUSH_CHANNEL_ID = "payslips";

/** Older APKs without the push plugin load the same website, so check the plugin, not just the platform. */
export function isStaffPushAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PushNotifications");
}

/**
 * Asks for notification permission, registers with Firebase and saves the device token.
 * Returns a cleanup that removes the listeners (the token stays registered).
 */
export async function initStaffPush(handlers: {
  onOpen: (url: string) => void;
  onReceivedInForeground: () => void;
}): Promise<() => void> {
  if (!isStaffPushAvailable()) return () => {};

  const { PushNotifications } = await import("@capacitor/push-notifications");
  const listeners: PluginListenerHandle[] = [];

  listeners.push(
    await PushNotifications.addListener("registration", ({ value }) => {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, value);
      } catch {
        // Only needed to unregister on sign-out.
      }
      void supabase
        .rpc("register_device_push_token", { p_token: value, p_platform: Capacitor.getPlatform() })
        .then(({ error }) => {
          if (error) logger.warn("Could not save push token:", error.message);
        });
    }),
    await PushNotifications.addListener("registrationError", (err) => {
      logger.warn("Push registration failed:", err.error);
    }),
    await PushNotifications.addListener("pushNotificationReceived", () => {
      handlers.onReceivedInForeground();
    }),
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string" && url.startsWith("/staff")) handlers.onOpen(url);
    })
  );

  try {
    await PushNotifications.createChannel({
      id: PAYSLIP_PUSH_CHANNEL_ID,
      name: "Payslips",
      description: "Alerts when a new payslip is ready",
      importance: 4,
      visibility: 0,
    });

    let { receive } = await PushNotifications.checkPermissions();
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      ({ receive } = await PushNotifications.requestPermissions());
    }
    if (receive === "granted") await PushNotifications.register();
  } catch (err) {
    logger.warn("Push setup failed:", err);
  }

  return () => {
    listeners.forEach((l) => void l.remove());
  };
}

/** Stop pushes to this phone for the account that is signing out. */
export async function unregisterStaffPush(): Promise<void> {
  if (!isStaffPushAvailable()) return;
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    return;
  }
  if (!token) return;
  const { error } = await supabase.rpc("unregister_device_push_token", { p_token: token });
  if (error) logger.warn("Could not remove push token:", error.message);
}
