import { useEffect, useState } from "react";
import api from "../lib/api";
import Card from "./Card";

function timeAgo(dt) {
  const d = new Date(dt);
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

export default function NotificationsCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/notifications");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/api/notifications/${id}/read`);
    await load();
  };

  const markAll = async () => {
    await api.post(`/api/notifications/read-all`);
    await load();
  };

  const unread = items.filter(i => !i.is_read).length;

  return (
    <Card
      title="Notifikasi"
      subtitle={unread ? `${unread} belum dibaca` : "Tidak ada notifikasi baru"}
      right={
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">
            Refresh
          </button>
          <button onClick={markAll} className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 text-sm">
            Tandai Semua
          </button>
        </div>
      }
    >
      {loading && <div className="text-sm text-slate-500">Memuat...</div>}
      {!loading && items.length === 0 && <div className="text-sm text-slate-500">Belum ada notifikasi.</div>}

      <div className="mt-2 space-y-2">
        {items.map(n => (
          <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? "bg-white" : "bg-slate-50"} flex items-start justify-between gap-3`}>
            <div>
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                {!n.is_read && <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />}
                {n.title}
              </div>
              <div className="text-sm text-slate-600 mt-1">{n.message}</div>
              <div className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
            </div>
            {!n.is_read && (
              <button onClick={() => markRead(n.id)} className="text-sm underline text-slate-700 whitespace-nowrap">
                Tandai dibaca
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
