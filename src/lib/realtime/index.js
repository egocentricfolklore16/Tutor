import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "../supabase";

const entries = new Map();
const statusSubscribers = new Set();
const retryDelays = [1000, 2000, 5000, 10000, 30000];
let nextEntryId = 0;
let debugSnapshot = [];
let authListener;

const isDevelopment = import.meta.env?.DEV === true;

function publishDebugSnapshot() {
  if (!isDevelopment) return;
  debugSnapshot = [...entries.values()]
    .filter((entry) => entry.listeners.size > 0)
    .map((entry) => ({
      name: entry.topic,
      table: entry.subscriptions.map((subscription) => subscription.table).join(", "),
      filter: entry.subscriptions.map((subscription) => subscription.filter).filter(Boolean).join("; ") || null,
      status: entry.status,
      lastEventAt: entry.lastEventAt,
    }));
  statusSubscribers.forEach((listener) => listener(debugSnapshot));
  console.debug("[realtime]", {
    activeChannels: debugSnapshot.length,
    channels: debugSnapshot,
  });
}

function ensureAuthRefreshListener() {
  if (authListener || typeof window === "undefined") return;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" && session?.access_token) {
      void supabase.realtime.setAuth(session.access_token);
    }
  });
  authListener = data.subscription;
}

function clearEntryTimers(entry) {
  if (entry.retryTimer) clearTimeout(entry.retryTimer);
  if (entry.pollTimer) clearInterval(entry.pollTimer);
  if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
  entry.retryTimer = null;
  entry.pollTimer = null;
  entry.cleanupTimer = null;
}

function setEntryStatus(entry, status) {
  const wasConnected = entry.status === "SUBSCRIBED";
  entry.status = status;
  entry.listeners.forEach((listener) => listener.setStatus?.(status));
  entry.listeners.forEach((listener) => listener.setStatus?.(status));
  if (status === "SUBSCRIBED") {
    if (wasConnected) return;
    if (entry.hasConnected) {
      entry.listeners.forEach((listener) => listener.onReconnect?.());
    }
    entry.hasConnected = true;
    entry.retryIndex = 0;
    if (entry.pollTimer) clearInterval(entry.pollTimer);
    entry.pollTimer = null;
  } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
    if (!entry.pollTimer && entry.listeners.size > 0) {
      entry.pollTimer = setInterval(() => {
        if (entry.status !== "SUBSCRIBED") {
          entry.listeners.forEach((listener) => listener.onRecover?.());
        }
      }, 30000);
    }
    if (status !== "CLOSED" || entry.listeners.size > 0) scheduleRetry(entry);
  }
  publishDebugSnapshot();
}

function scheduleRetry(entry) {
  if (entry.retryTimer || entry.listeners.size === 0) return;
  const delay = retryDelays[Math.min(entry.retryIndex, retryDelays.length - 1)];
  entry.retryIndex += 1;
  entry.retryTimer = setTimeout(() => {
    entry.retryTimer = null;
    restartEntry(entry);
  }, delay);
}

async function restartEntry(entry) {
  if (entry.listeners.size === 0) return;
  const previous = entry.channel;
  entry.channel = null;
  if (previous) await supabase.removeChannel(previous);
  if (entry.listeners.size > 0) openEntry(entry);
}

function openEntry(entry) {
  if (entry.listeners.size === 0 || entry.channel) return;
  const channel = supabase.channel(entry.topic);
  entry.subscriptions.forEach((subscription) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: subscription.table,
        ...(subscription.filter ? { filter: subscription.filter } : {}),
      },
      (payload) => {
        entry.lastEventAt = new Date().toISOString();
        entry.listeners.forEach((listener) => {
          if (listener.event === "*" || listener.event === payload.eventType) {
            listener.onChange?.(payload);
          }
        });
        publishDebugSnapshot();
      }
    );
  });
  entry.channel = channel;
  channel.subscribe((status) => {
    if (entry.channel !== channel) return;
    setEntryStatus(entry, status);
  });
}

function getEntry(subscriptions) {
  const normalized = subscriptions
    .map(({ table, filter }) => ({ table, filter: filter || "" }))
    .sort((left, right) => `${left.table}|${left.filter}`.localeCompare(`${right.table}|${right.filter}`));
  const key = JSON.stringify(normalized);
  let entry = entries.get(key);
  if (!entry) {
    const channelLabel = normalized
      .map(({ table, filter }) => `${table}_${filter || "all"}`)
      .join("_")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 100);
    entry = {
      key,
      subscriptions: normalized.map(({ table, filter }) => ({ table, filter: filter || undefined })),
      topic: `rt:${channelLabel}:${++nextEntryId}`,
      listeners: new Set(),
      channel: null,
      status: "CLOSED",
      hasConnected: false,
      retryIndex: 0,
      retryTimer: null,
      pollTimer: null,
      cleanupTimer: null,
      lastEventAt: null,
    };
    entries.set(key, entry);
  }
  return entry;
}

function acquireTables(subscriptions, listener) {
  ensureAuthRefreshListener();
  const entry = getEntry(subscriptions);
  entry.listeners.add(listener);
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }
  openEntry(entry);

  const recover = () => listener.onRecover?.();
  window.addEventListener("online", recover);
  const visibilityChange = () => {
    if (document.visibilityState === "visible") recover();
  };
  document.addEventListener("visibilitychange", visibilityChange);

  return () => {
    window.removeEventListener("online", recover);
    document.removeEventListener("visibilitychange", visibilityChange);
    entry.listeners.delete(listener);
    if (entry.listeners.size !== 0) {
      publishDebugSnapshot();
      return;
    }
    entry.cleanupTimer = setTimeout(async () => {
      if (entry.listeners.size !== 0) return;
      clearEntryTimers(entry);
      entries.delete(entry.key);
      const channel = entry.channel;
      entry.channel = null;
      entry.status = "CLOSED";
      if (channel) await supabase.removeChannel(channel);
      publishDebugSnapshot();
    }, 0);
    publishDebugSnapshot();
  };
}

function acquireTable(table, filter, listener) {
  return acquireTables([{ table, filter }], listener);
}

export function useRealtimeTable({
  table,
  filter,
  event = "*",
  onChange,
  onReconnect,
  onRecover,
  enabled = true,
}) {
  const callbacksRef = useRef({ onChange, onReconnect, onRecover });
  callbacksRef.current = { onChange, onReconnect, onRecover };
  const [status, setStatus] = useState("CLOSED");

  useEffect(() => {
    if (!enabled || !table) return undefined;
    const listener = {
      event,
      onChange: (payload) => callbacksRef.current.onChange?.(payload),
      onRecover: () => callbacksRef.current.onRecover?.(),
      onReconnect: () => callbacksRef.current.onReconnect?.(),
      setStatus: (nextStatus) => setStatus(nextStatus),
    };
    const entry = getEntry([{ table, filter }]);
    const unsubscribe = acquireTable(table, filter, listener);
    setStatus(entry.status);
    return unsubscribe;
  }, [table, filter, event, enabled]);

  return status;
}

export function useRealtimeTables({
  subscriptions,
  onChange,
  onReconnect,
  onRecover,
  enabled = true,
}) {
  const subscriptionsKey = JSON.stringify(
    (subscriptions || [])
      .map(({ table, filter }) => ({ table, filter: filter || "" }))
      .sort((left, right) => `${left.table}|${left.filter}`.localeCompare(`${right.table}|${right.filter}`))
  );
  const callbacksRef = useRef({ onChange, onReconnect, onRecover });
  callbacksRef.current = { onChange, onReconnect, onRecover };
  const [status, setStatus] = useState("CLOSED");

  useEffect(() => {
    const normalized = JSON.parse(subscriptionsKey);
    if (!enabled || normalized.length === 0) return undefined;
    const listener = {
      event: "*",
      onChange: (payload) => callbacksRef.current.onChange?.(payload),
      onRecover: () => callbacksRef.current.onRecover?.(),
      onReconnect: () => callbacksRef.current.onReconnect?.(),
      setStatus: (nextStatus) => setStatus(nextStatus),
    };
    const entry = getEntry(normalized);
    const unsubscribe = acquireTables(normalized, listener);
    setStatus(entry.status);
    return unsubscribe;
  }, [subscriptionsKey, enabled]);

  return status;
}

function sorted(items, sort) {
  if (!sort) return items;
  const { field, ascending = true } =
    typeof sort === "string" ? { field: sort } : sort;
  return [...items].sort((a, b) => {
    const left = a?.[field];
    const right = b?.[field];
    if (left == null || right == null) {
      if (left == null && right == null) return 0;
      return (left == null ? -1 : 1) * (ascending ? 1 : -1);
    }
    const comparison =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return comparison * (ascending ? 1 : -1);
  });
}

export function useRealtimeList(
  queryFn,
  {
    table,
    filter,
    key = "id",
    sort,
    enabled = true,
    refetchOnChange = false,
    debounceMs = 300,
  } = {}
) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const queryRef = useRef(queryFn);
  const sortRef = useRef(sort);
  const debounceRef = useRef(null);
  queryRef.current = queryFn;
  sortRef.current = sort;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await queryRef.current();
      if (result?.error) throw result.error;
      const rows = Array.isArray(result) ? result : result?.data || [];
      setData(sorted(rows, sortRef.current));
      setError(null);
    } catch (nextError) {
      setError(nextError);
      console.error(`Realtime list query failed for ${table}:`, nextError);
    } finally {
      setLoading(false);
    }
  }, [enabled, table]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    void refetch();
    return undefined;
  }, [enabled, refetch]);

  const handleChange = useCallback(
    (payload) => {
      if (refetchOnChange) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(refetch, debounceMs);
        return;
      }

      const isDelete = payload.eventType === "DELETE";
      const row = isDelete ? payload.old : payload.new;
      const rowKey = row?.[key];
      if (rowKey == null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(refetch, debounceMs);
        return;
      }
      setData((current) => {
        const index = current.findIndex((item) => item?.[key] === rowKey);
        if (isDelete) {
          if (index < 0) return current;
          return current.filter((item) => item?.[key] !== rowKey);
        }
        const next =
          index < 0
            ? [...current, row]
            : current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...row } : item));
        return sorted(next, sortRef.current);
      });
    },
    [key, refetch, refetchOnChange, debounceMs]
  );

  const status = useRealtimeTable({
    table,
    filter,
    enabled: enabled && Boolean(table),
    onChange: handleChange,
    onReconnect: refetch,
    onRecover: refetch,
  });

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
    },
    []
  );

  return { data, setData, loading, error, refetch, status };
}

export function RealtimeDebug() {
  const [channels, setChannels] = useState(debugSnapshot);
  const enabled =
    isDevelopment &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("rtDebug") === "1";

  useEffect(() => {
    if (!isDevelopment) return undefined;
    statusSubscribers.add(setChannels);
    setChannels(debugSnapshot);
    return () => statusSubscribers.delete(setChannels);
  }, []);

  if (!enabled) return null;
  return (
    <aside
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 99999,
        maxWidth: 360,
        maxHeight: "45vh",
        overflow: "auto",
        padding: 10,
        color: "#fff",
        background: "rgba(15, 23, 42, .94)",
        borderRadius: 8,
        font: "12px/1.4 monospace",
      }}
    >
      <strong>Realtime: {channels.length} active channel(s)</strong>
      {channels.map((channel) => (
        <div key={channel.name}>
          {channel.name} — {channel.status}
          {channel.lastEventAt ? ` — ${channel.lastEventAt}` : ""}
        </div>
      ))}
    </aside>
  );
}
