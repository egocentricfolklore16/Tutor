import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellOff,
  MessageSquare,
  UserPlus,
  UserCheck,
  Eye,
  Clock,
  Send,
  Smartphone,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  HelpCircle,
  Users,
} from "lucide-react";
import supabase from "../../lib/supabase";
import { enablePush, disablePush, isPushSupported, isIosNeedingInstall } from "../../lib/push";
import { getNotificationPreferences, persistNotificationPreferences } from "../../lib/notifications";

export default function NotificationSettings({ userId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [pushSupported, setPushSupported] = useState(true);
  const [iosInstallNeeded, setIosInstallNeeded] = useState(false);

  const [prefs, setPrefs] = useState({
    push_enabled: true,
    push_messages: true,
    push_friend_requests: true,
    push_friend_accepts: true,
    show_message_preview: true,
    group_reminders_enabled: true,
    group_reminder_30m: true,
    group_reminder_15m: true,
    group_reminder_0m: true,
    quiet_hours_start: "",
    quiet_hours_end: "",
  });

  const [devices, setDevices] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadNotificationData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    setPushSupported(isPushSupported());
    setIosInstallNeeded(isIosNeedingInstall());

    try {
      const localPrefs = getNotificationPreferences();

      // 1. Fetch preferences
      const { data: prefData } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (prefData) {
        setPrefs({
          push_enabled: prefData.push_enabled ?? true,
          push_messages: prefData.push_messages ?? true,
          push_friend_requests: prefData.push_friend_requests ?? true,
          push_friend_accepts: prefData.push_friend_accepts ?? true,
          show_message_preview: prefData.show_message_preview ?? true,
          group_reminders_enabled: localPrefs.group_reminders_enabled ?? true,
          group_reminder_30m: localPrefs.group_reminder_30m ?? true,
          group_reminder_15m: localPrefs.group_reminder_15m ?? true,
          group_reminder_0m: localPrefs.group_reminder_0m ?? true,
          quiet_hours_start: prefData.quiet_hours_start || "",
          quiet_hours_end: prefData.quiet_hours_end || "",
        });
      } else {
        setPrefs((prev) => ({
          ...prev,
          group_reminders_enabled: localPrefs.group_reminders_enabled ?? true,
          group_reminder_30m: localPrefs.group_reminder_30m ?? true,
          group_reminder_15m: localPrefs.group_reminder_15m ?? true,
          group_reminder_0m: localPrefs.group_reminder_0m ?? true,
        }));
      }

      // 2. Fetch registered push subscription devices
      const { data: devData } = await supabase
        .from("push_subscriptions")
        .select("id, platform, user_agent, created_at, last_seen_at")
        .eq("user_id", userId)
        .order("last_seen_at", { ascending: false });

      setDevices(devData || []);
    } catch (err) {
      console.error("Failed to load notification settings:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotificationData();
  }, [loadNotificationData]);

  const handleToggleMasterPush = async (e) => {
    const nextVal = e.target.checked;
    setSaving(true);
    try {
      if (nextVal) {
        await enablePush(userId);
        showToast("Push notifications enabled!");
      } else {
        await disablePush(userId);
        showToast("Push notifications disabled.");
      }
      setPrefs((prev) => ({ ...prev, push_enabled: nextVal }));
      await loadNotificationData();
    } catch (err) {
      console.error("Error toggling push:", err);
      showToast(err.message || "Failed to update notification permission.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePref = async (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    setSaving(true);

    try {
      persistNotificationPreferences({
        group_reminders_enabled: updated.group_reminders_enabled,
        group_reminder_30m: updated.group_reminder_30m,
        group_reminder_15m: updated.group_reminder_15m,
        group_reminder_0m: updated.group_reminder_0m,
      });

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            ...updated,
            quiet_hours_start: updated.quiet_hours_start || null,
            quiet_hours_end: updated.quiet_hours_end || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      showToast("Notification preference updated.");
    } catch (err) {
      console.error("Error updating preference:", err);
      showToast("Failed to save preference.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    try {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      await supabase.from("push_subscriptions").delete().eq("id", deviceId);
      showToast("Registered device removed.");
    } catch (err) {
      console.error("Error removing device:", err);
      showToast("Unable to remove device.");
      loadNotificationData();
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTest(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Unauthenticated session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const resJson = await response.json();

      if (resJson.success) {
        showToast("Test notification sent! Check your phone/desktop.");
      } else {
        showToast(resJson.message || "Could not send test notification.");
      }
    } catch (err) {
      console.error("Error sending test notification:", err);
      showToast(err.message || "Failed to trigger test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="rounded-xl bg-emerald-600 p-3 text-xs font-bold text-white shadow-sm flex items-center justify-between">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* iOS Safari Installation Hint */}
      {iosInstallNeeded && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex gap-3">
            <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">iOS Push Notification Setup</p>
              <p className="mt-1">
                To receive notifications on iOS, tap the Share button in Safari and select <strong>"Add to Home Screen"</strong>, then open Hyper Tutor from your Home Screen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Master Enable Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#14171c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Push Notifications</h3>
              <p className="text-xs text-slate-500">Receive message and friend updates outside the app</p>
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={prefs.push_enabled}
              onChange={handleToggleMasterPush}
              disabled={saving || !pushSupported}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full dark:bg-slate-700" />
          </label>
        </div>
      </div>

      {/* Group Session Reminders Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#14171c] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-emerald-600" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Group Session Reminders</h4>
              <p className="text-[11px] text-slate-500">Configure default reminders for group study sessions you are attending</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.group_reminders_enabled}
            onChange={(e) => handleUpdatePref("group_reminders_enabled", e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded accent-emerald-600"
          />
        </div>

        {prefs.group_reminders_enabled && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">30 minutes before session</span>
              <input
                type="checkbox"
                checked={prefs.group_reminder_30m}
                onChange={(e) => handleUpdatePref("group_reminder_30m", e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded accent-emerald-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">15 minutes before session</span>
              <input
                type="checkbox"
                checked={prefs.group_reminder_15m}
                onChange={(e) => handleUpdatePref("group_reminder_15m", e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded accent-emerald-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">At session start time</span>
              <input
                type="checkbox"
                checked={prefs.group_reminder_0m}
                onChange={(e) => handleUpdatePref("group_reminder_0m", e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded accent-emerald-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Event Category Toggles */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#14171c] space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notification Types</h4>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* New Messages */}
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">New Messages</p>
                <p className="text-[11px] text-slate-500">Direct and group chat messages</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.push_messages}
              onChange={(e) => handleUpdatePref("push_messages", e.target.checked)}
              disabled={!prefs.push_enabled || saving}
              className="h-4 w-4 rounded accent-emerald-600"
            />
          </div>

          {/* Incoming Friend Requests */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Friend Requests</p>
                <p className="text-[11px] text-slate-500">When someone sends you a friend request</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.push_friend_requests}
              onChange={(e) => handleUpdatePref("push_friend_requests", e.target.checked)}
              disabled={!prefs.push_enabled || saving}
              className="h-4 w-4 rounded accent-emerald-600"
            />
          </div>

          {/* Accepted Friend Requests */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Friend Request Accepted</p>
                <p className="text-[11px] text-slate-500">When your friend request is accepted</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.push_friend_accepts}
              onChange={(e) => handleUpdatePref("push_friend_accepts", e.target.checked)}
              disabled={!prefs.push_enabled || saving}
              className="h-4 w-4 rounded accent-emerald-600"
            />
          </div>

          {/* Show Message Preview */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Show Message Previews</p>
                <p className="text-[11px] text-slate-500">Include text snippet in push notification body</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.show_message_preview}
              onChange={(e) => handleUpdatePref("show_message_preview", e.target.checked)}
              disabled={!prefs.push_enabled || saving}
              className="h-4 w-4 rounded accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#14171c]">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quiet Hours</h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Suppress phone notifications during specified hours. Notifications will still appear in your in-app inbox.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
            <input
              type="time"
              value={prefs.quiet_hours_start}
              onChange={(e) => handleUpdatePref("quiet_hours_start", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
            <input
              type="time"
              value={prefs.quiet_hours_end}
              onChange={(e) => handleUpdatePref("quiet_hours_end", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Test Notification & Device List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#14171c] space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Devices ({devices.length})</h4>
          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={sendingTest || !prefs.push_enabled}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Send Test Notification</span>
          </button>
        </div>

        {devices.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No active devices registered for push notifications.</p>
        ) : (
          <div className="space-y-2">
            {devices.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#18211f]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{dev.platform || "Web Device"}</p>
                    <p className="truncate text-[10px] text-slate-400">{dev.user_agent || "Unknown user agent"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDevice(dev.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Remove device"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
