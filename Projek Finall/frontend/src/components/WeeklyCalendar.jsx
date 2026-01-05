import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

function pad2(n){ return String(n).padStart(2,"0"); }
function addDays(dateStr, delta){
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function formatDow(n) {
  const map = {1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat",6:"Sabtu",7:"Minggu"};
  return map[n] || "-";
}
function hhmm(t){ return String(t||"").slice(0,5); }

export default function WeeklyCalendar({ roomId, date, onChangeDate }) {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState(null);
  const [selected, setSelected] = useState(null);

  const weekRange = useMemo(() => {
    if (!week?.days?.length) return null;
    const start = week.days[0]?.date;
    const end = week.days[6]?.date;
    return { start, end };
  }, [week]);

  useEffect(() => {
    if (!roomId || !date) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/rooms/${roomId}/calendar-week?date=${date}`);
        setWeek(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId, date]);

  const prevWeek = () => onChangeDate(addDays(date, -7));
  const nextWeek = () => onChangeDate(addDays(date, 7));

  const eventsOf = (day) => {
    const fixed = (day.fixed || []).map(f => ({
      kind: "BAKU",
      start: f.start_time,
      end: f.end_time,
      title: f.course_name,
      subtitle: `${f.lecturer_name}${f.class_name ? " • " + f.class_name : ""}`,
      raw: f
    }));
    const extra = (day.extra || []).map(e => ({
      kind: "TAMBAHAN",
      start: e.start_time,
      end: e.end_time,
      title: e.purpose,
      subtitle: `${e.borrower_name} • ${e.booking_code}`,
      raw: e
    }));
    return [...fixed, ...extra].sort((a,b)=> (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">
            {weekRange ? (
              <>Minggu: <b>{weekRange.start}</b> s/d <b>{weekRange.end}</b></>
            ) : (
              <>Minggu kalender</>
            )}
          </div>
          <div className="text-xs text-slate-400">Klik item untuk lihat detail. Jadwal baku mengikuti set A/B berdasarkan minggu (ganjil/genap).</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">
            ◀ Minggu Lalu
          </button>
          <button onClick={nextWeek} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">
            Minggu Depan ▶
          </button>
        </div>
      </div>

      {loading && <div className="mt-3 text-sm text-slate-500">Memuat kalender mingguan...</div>}

      {!loading && week?.days?.length ? (
        <>
          <div className="mt-4 overflow-auto">
            <div className="min-w-[1150px] grid grid-cols-7 gap-3">
              {week.days.map((day) => {
                const items = eventsOf(day);
                return (
                  <div key={day.date} className="rounded-2xl border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{formatDow(day.day_of_week)}</div>
                        <div className="text-xs text-slate-500">{day.date}</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">Set {day.active_set}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {items.length === 0 ? (
                        <div className="text-xs text-slate-400">Tidak ada jadwal.</div>
                      ) : items.map((it, idx) => (
                        <button
                          type="button"
                          key={it.kind + idx}
                          onClick={() => setSelected({ day, it })}
                          className={`w-full text-left p-2 rounded-xl border hover:opacity-95 transition
                            ${it.kind==="BAKU" ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">{it.kind}</span>
                            <span className="text-xs text-slate-600">{hhmm(it.start)}-{hhmm(it.end)}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">{it.title}</div>
                          <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{it.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-200">BAKU</span>
            <span className="px-2 py-1 rounded-full bg-green-50 border border-green-200">TAMBAHAN</span>
            <span className="text-slate-400">•</span>
            <span>Khusus “TAMBAHAN” hanya yang statusnya APPROVED.</span>
          </div>

          {selected && (
            <div className="mt-4 rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">Detail</div>
                  <div className="text-sm text-slate-600">
                    {formatDow(selected.day.day_of_week)}, {selected.day.date} • Set {selected.day.active_set}
                  </div>
                </div>
                <button className="px-3 py-2 rounded-lg border hover:bg-slate-50 text-sm" onClick={()=>setSelected(null)}>
                  Tutup
                </button>
              </div>

              <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border p-3 bg-slate-50">
                  <div className="text-xs text-slate-500">Jenis</div>
                  <div className="font-semibold">{selected.it.kind}</div>
                </div>
                <div className="rounded-xl border p-3 bg-slate-50">
                  <div className="text-xs text-slate-500">Waktu</div>
                  <div className="font-semibold">{hhmm(selected.it.start)} - {hhmm(selected.it.end)}</div>
                </div>
                <div className="rounded-xl border p-3 bg-slate-50 md:col-span-2">
                  <div className="text-xs text-slate-500">Keterangan</div>
                  <div className="font-semibold">{selected.it.title}</div>
                  <div className="text-slate-600">{selected.it.subtitle}</div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
