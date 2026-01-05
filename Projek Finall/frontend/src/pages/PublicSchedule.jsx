import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import api from "../lib/api";

function pad2(n) { return String(n).padStart(2, "0"); }
function hhmm(t) { return String(t || "").slice(0, 5); }
function formatDow(i) {
  const map = { 1: "Sen", 2: "Sel", 3: "Rab", 4: "Kam", 5: "Jum", 6: "Sab", 7: "Min" };
  return map[i] || "";
}
function monthLabel(yyyy, mm) {
  const names = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${names[mm - 1]} ${yyyy}`;
}
function toMinutes(timeStr) {
  // supports HH:MM or HH:MM:SS
  const s = String(timeStr || "").slice(0, 8);
  const parts = s.split(":");
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return h * 60 + m;
}

function assignLanes(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laneEnd = [];
  const out = [];
  let maxLane = 0;

  for (const it of sorted) {
    let lane = laneEnd.findIndex((end) => it.startMin >= end);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(it.endMin);
    } else {
      laneEnd[lane] = it.endMin;
    }
    maxLane = Math.max(maxLane, lane + 1);
    out.push({ ...it, lane });
  }
  return { items: out, lanes: maxLane || 1 };
}

function Segment({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border bg-white p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-2 text-sm rounded-lg transition ${
              active ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="inline-flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded bg-blue-500" />
        <span className="text-slate-700">BAKU (Perkuliahan)</span>
      </div>
      <div className="inline-flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded bg-green-500" />
        <span className="text-slate-700">TAMBAHAN (Booking Approved)</span>
      </div>
    </div>
  );
}

export default function PublicSchedule() {
  const today = useMemo(() => {
    const d = new Date();
    return { yyyy: d.getFullYear(), mm: d.getMonth() + 1, dd: d.getDate() };
  }, []);

  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [yyyy, setYyyy] = useState(today.yyyy);
  const [mm, setMm] = useState(today.mm);

  const [cal, setCal] = useState({ month: "", days: [] });
  const [err, setErr] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const [filter, setFilter] = useState("ALL"); // ALL | BAKU | TAMBAHAN

  const monthStr = useMemo(() => `${yyyy}-${pad2(mm)}`, [yyyy, mm]);

  const loadRooms = async () => {
    const rRooms = await api.get("/api/rooms");
    setRooms(rRooms.data);
    const defaultRoom = roomId || (rRooms.data[0]?.id ? String(rRooms.data[0].id) : "");
    if (!roomId && defaultRoom) setRoomId(defaultRoom);
    return defaultRoom;
  };

  const load = async () => {
    setErr("");
    try {
      const defaultRoom = await loadRooms();
      if (defaultRoom) {
        const { data } = await api.get(`/api/rooms/${defaultRoom}/calendar-month?month=${monthStr}`);
        setCal(data);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Gagal memuat jadwal");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/rooms/${roomId}/calendar-month?month=${monthStr}`);
        setCal(data);
      } catch { /* ignore */ }
    })();
  }, [roomId, monthStr]);

  const prevMonth = () => {
    const d = new Date(yyyy, mm - 2, 1);
    setYyyy(d.getFullYear());
    setMm(d.getMonth() + 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    const d = new Date(yyyy, mm, 1);
    setYyyy(d.getFullYear());
    setMm(d.getMonth() + 1);
    setSelectedDay(null);
  };

  // Month grid (Mon..Sun)
  const gridCells = useMemo(() => {
    const first = new Date(yyyy, mm - 1, 1);
    const daysInMonth = new Date(yyyy, mm, 0).getDate();
    const firstDayMonIndex = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const cells = [];
    for (let i = 0; i < firstDayMonIndex; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${yyyy}-${pad2(mm)}-${pad2(d)}`;
      const dayObj = cal.days.find((x) => x.date === date) || { date, fixed: [], extra: [], active_set: "-", day_of_week: 0 };
      cells.push(dayObj);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cal.days, yyyy, mm]);

  const selected = useMemo(() => {
    if (!selectedDay) return null;
    return cal.days.find((d) => d.date === selectedDay) || null;
  }, [selectedDay, cal.days]);

  // Build time-grid events for selected day
  const timeGrid = useMemo(() => {
    if (!selected) return null;

    const fixed = (selected.fixed || []).map((it) => ({
      id: `F-${it.id}`,
      kind: "BAKU",
      title: it.course_name,
      subtitle: `${it.lecturer_name}${it.class_name ? " • " + it.class_name : ""}`,
      start: hhmm(it.start_time),
      end: hhmm(it.end_time),
      startMin: toMinutes(it.start_time),
      endMin: toMinutes(it.end_time),
    }));

    const extra = (selected.extra || []).map((it) => ({
      id: `E-${it.id}`,
      kind: "TAMBAHAN",
      title: it.purpose,
      subtitle: `${it.borrower_name} • ${it.booking_code}`,
      start: hhmm(it.start_time),
      end: hhmm(it.end_time),
      startMin: toMinutes(it.start_time),
      endMin: toMinutes(it.end_time),
    }));

    let events = [];
    if (filter === "ALL") events = [...fixed, ...extra];
    if (filter === "BAKU") events = [...fixed];
    if (filter === "TAMBAHAN") events = [...extra];

    // Grid range
    const startHour = 7;
    const endHour = 19; // exclusive end line at 19:00
    const rangeStart = startHour * 60;
    const rangeEnd = endHour * 60;

    // Clip events to range
    const clipped = events
      .map((e) => ({
        ...e,
        startMin: Math.max(e.startMin, rangeStart),
        endMin: Math.min(e.endMin, rangeEnd),
      }))
      .filter((e) => e.endMin > e.startMin);

    const { items, lanes } = assignLanes(clipped);

    return {
      rangeStart,
      rangeEnd,
      startHour,
      endHour,
      lanes,
      events: items,
    };
  }, [selected, filter]);

  const segOptions = [
    { value: "ALL", label: "Semua" },
    { value: "BAKU", label: "BAKU" },
    { value: "TAMBAHAN", label: "TAMBAHAN" },
  ];

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {err && <div className="text-sm text-red-600">{err}</div>}

        <Card
          title="Jadwal Ruangan"
          subtitle="Publik: bisa dilihat sebelum login. Klik tanggal untuk detail."
          right={
            <div className="flex flex-wrap items-center gap-2">
              <select className="border rounded-lg px-3 py-2 text-sm" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>

              <button onClick={prevMonth} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">◀</button>
              <div className="px-3 py-2 rounded-lg border bg-white text-sm font-medium">{monthLabel(yyyy, mm)}</div>
              <button onClick={nextMonth} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">▶</button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Legend />
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-slate-600">Filter:</div>
              <Segment value={filter} onChange={setFilter} options={segOptions} />
            </div>
          </div>

          {/* Month header */}
          <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 mt-4">
            <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div><div>Min</div>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-2 mt-2">
            {gridCells.map((cell, idx) => {
              if (!cell) return <div key={idx} className="h-28 rounded-xl border bg-white/50" />;

              const isToday = cell.date === `${today.yyyy}-${pad2(today.mm)}-${pad2(today.dd)}`;
              const fixedCount = cell.fixed?.length || 0;
              const extraCount = cell.extra?.length || 0;

              const showFixed = filter === "ALL" || filter === "BAKU";
              const showExtra = filter === "ALL" || filter === "TAMBAHAN";

              const anyShown =
                (showFixed && fixedCount > 0) ||
                (showExtra && extraCount > 0);

              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDay(cell.date)}
                  className={`h-28 rounded-xl border bg-white p-2 text-left hover:bg-slate-50 transition relative ${
                    selectedDay === cell.date ? "ring-2 ring-slate-900" : ""
                  }`}
                  title="Klik untuk detail"
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-slate-900"}`}>
                      {Number(cell.date.slice(8, 10))}
                    </div>
                    <div className="text-[11px] text-slate-500">Set {cell.active_set} • {formatDow(cell.day_of_week)}</div>
                  </div>

                  <div className="mt-2">
                    {!anyShown ? (
                      <div className="text-[11px] text-slate-400">Kosong</div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {showFixed && fixedCount > 0 && (
                          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
                            <span className="inline-block w-2 h-2 rounded bg-blue-500" />
                            BAKU <span className="opacity-70">({fixedCount})</span>
                          </div>
                        )}
                        {showExtra && extraCount > 0 && (
                          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                            <span className="inline-block w-2 h-2 rounded bg-green-500" />
                            TAMBAHAN <span className="opacity-70">({extraCount})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel with time-grid */}
          {selected && (
            <div className="mt-6 rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Detail {selected.date} <span className="text-slate-500 font-normal">• Set {selected.active_set} • {formatDow(selected.day_of_week)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Tampilan grid jam mirip kalender. Event yang melewati rentang jam akan dipotong otomatis.</div>
                </div>
                <button onClick={() => setSelectedDay(null)} className="text-sm underline text-slate-700">Tutup</button>
              </div>

              {/* Time grid */}
              <div className="mt-4 rounded-2xl border overflow-hidden">
                <div className="grid grid-cols-[80px_1fr]">
                  <div className="bg-slate-50 border-r">
                    {Array.from({ length: (timeGrid?.endHour || 19) - (timeGrid?.startHour || 7) + 1 }).map((_, i) => {
                      const hour = (timeGrid?.startHour || 7) + i;
                      return (
                        <div key={hour} className="h-16 flex items-start justify-end pr-2 pt-1 text-xs text-slate-500 border-b last:border-b-0">
                          {pad2(hour)}:00
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative">
                    {/* Horizontal lines */}
                    {Array.from({ length: (timeGrid?.endHour || 19) - (timeGrid?.startHour || 7) + 1 }).map((_, i) => (
                      <div key={i} className="h-16 border-b last:border-b-0" />
                    ))}

                    {/* Events overlay */}
                    {timeGrid?.events?.map((e) => {
                      const total = timeGrid.rangeEnd - timeGrid.rangeStart;
                      const top = ((e.startMin - timeGrid.rangeStart) / total) * 100;
                      const height = ((e.endMin - e.startMin) / total) * 100;

                      const width = 100 / (timeGrid.lanes || 1);
                      const left = e.lane * width;

                      const isBaku = e.kind === "BAKU";
                      const boxClass = isBaku
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-900"
                        : "bg-green-500/15 border-green-500/40 text-green-900";
                      const dotClass = isBaku ? "bg-blue-500" : "bg-green-500";

                      return (
                        <div
                          key={e.id}
                          className={`absolute rounded-xl border p-2 text-xs shadow-sm ${boxClass}`}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            left: `${left}%`,
                            width: `${width}%`,
                            marginLeft: "2px",
                            marginRight: "2px",
                          }}
                          title={`${e.title} (${e.start} - ${e.end})`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded ${dotClass}`} />
                            <div className="font-semibold leading-tight line-clamp-2">{e.title}</div>
                          </div>
                          <div className="mt-1 text-[11px] opacity-80 line-clamp-2">{e.subtitle}</div>
                          <div className="mt-1 text-[11px] font-medium">{e.start} - {e.end}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lists (for clarity) */}
              <div className="grid lg:grid-cols-2 gap-4 mt-5">
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">BAKU</span>
                    Jadwal Perkuliahan
                  </div>
                  <div className="mt-2 text-sm">
                    {(selected.fixed || []).length === 0 ? (
                      <div className="text-slate-500 text-sm">Tidak ada jadwal baku.</div>
                    ) : (
                      <div className="space-y-2">
                        {(selected.fixed || []).map((it) => (
                          <div key={it.id} className="p-2 rounded-xl bg-slate-50 border">
                            <div className="font-medium">{hhmm(it.start_time)} - {hhmm(it.end_time)} • {it.course_name}</div>
                            <div className="text-xs text-slate-600">{it.lecturer_name} • {it.class_name || "-"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">TAMBAHAN</span>
                    Booking Disetujui
                  </div>
                  <div className="mt-2 text-sm">
                    {(selected.extra || []).length === 0 ? (
                      <div className="text-slate-500 text-sm">Tidak ada booking disetujui.</div>
                    ) : (
                      <div className="space-y-2">
                        {(selected.extra || []).map((it) => (
                          <div key={it.id} className="p-2 rounded-xl bg-slate-50 border">
                            <div className="font-medium">{hhmm(it.start_time)} - {hhmm(it.end_time)} • {it.purpose}</div>
                            <div className="text-xs text-slate-600">{it.borrower_name} • {it.booking_code}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Tips: gunakan filter <b>BAKU</b> atau <b>TAMBAHAN</b> untuk fokus melihat jenis jadwal tertentu.
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
