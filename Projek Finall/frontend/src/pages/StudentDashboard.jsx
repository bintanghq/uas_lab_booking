import { useEffect, useMemo, useState, Fragment } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import Badge from "../components/Badge";
import api from "../lib/api";
import NotificationsCard from "../components/NotificationsCard";
import WeeklyCalendar from "../components/WeeklyCalendar";
import BookingTimeline from "../components/BookingTimeline";
import Modal from "../components/Modal";

function formatDow(n) {
  const map = {1:"Senin",2:"Selasa",3:"Rabu",4:"Kamis",5:"Jumat",6:"Sabtu",7:"Minggu"};
  return map[n] || "-";
}
function hhmm(t) { return String(t || "").slice(0,5); }
function ymd(x){ return String(x||"").slice(0,10); }

export default function StudentDashboard() {
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(today);

  const [calendar, setCalendar] = useState({ active_set: "-", day_of_week: 0, fixed: [], extra: [] });
  const [queue, setQueue] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({ start_time: "08:00", end_time: "09:00", purpose: "" });
  const [msg, setMsg] = useState("");

  const [actionModal, setActionModal] = useState({ open:false, type:null, booking:null });
  const [wizStep, setWizStep] = useState(1);
  const [wiz, setWiz] = useState({ note:"", start:"", end:"" });

  const [err, setErr] = useState("");

  const refresh = async () => {
    setMsg(""); setErr("");
    try {
      const rRooms = await api.get("/api/rooms");
      setRooms(rRooms.data);
      const defaultRoom = roomId || (rRooms.data[0]?.id ? String(rRooms.data[0].id) : "");
      if (!roomId && defaultRoom) setRoomId(defaultRoom);

      if (defaultRoom) {
        const [cal, q] = await Promise.all([
          api.get(`/api/rooms/${defaultRoom}/calendar?date=${date}`),
          api.get(`/api/rooms/${defaultRoom}/queue?date=${date}`)
        ]);
        setCalendar(cal.data);
        setQueue(q.data);
      }

      const my = await api.get("/api/bookings/my");
      setMyBookings(my.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Gagal memuat data");
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const [cal, q] = await Promise.all([
          api.get(`/api/rooms/${roomId}/calendar?date=${date}`),
          api.get(`/api/rooms/${roomId}/queue?date=${date}`)
        ]);
        setCalendar(cal.data);
        setQueue(q.data);
      } catch (e) {}
    })();
  }, [roomId, date]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.post("/api/bookings", {
        room_id: Number(roomId),
        booking_date: date,
        start_time: form.start_time,
        end_time: form.end_time,
        purpose: form.purpose
      });
      setMsg("Pengajuan booking berhasil (PENDING).");
      setForm({ ...form, purpose: "" });
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.message || "Gagal booking");
    }
  };

  const downloadLetter = async (bookingId, bookingCode) => {
    try {
      const res = await api.get(`/api/bookings/${bookingId}/letter`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Surat-Peminjaman-${bookingCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.message || "Gagal download surat");
    }
  };

  const cancelBooking = async (id) => {
    if (!confirm("Batalkan booking ini?")) return;
    try {
      await api.post(`/api/bookings/${id}/cancel`);
      await refresh();
    } catch (e) {
      alert(e?.response?.data?.message || "Gagal batal");
    }
  };

const closeModal = () => {
  setActionModal({ open:false, type:null, booking:null });
  setWizStep(1);
};

const openEditBooking = (b) => {
  setActionModal({ open:true, type:"EDIT_TIME", booking:b });
  setWizStep(1);
  setWiz({ note:"", start: hhmm(b.start_time), end: hhmm(b.end_time) });
};

const submitEditBooking = async () => {
  const b = actionModal.booking;
  if (!b) return;
  try {
    await api.patch(`/api/bookings/${b.id}`, { start_time: wiz.start, end_time: wiz.end });
    closeModal();
    await refresh();
  } catch (e) {
    alert(e?.response?.data?.message || "Gagal update");
  }
};

const openAcceptChange = (b) => {
  setActionModal({ open:true, type:"ACCEPT_CHANGE", booking:b });
  setWizStep(1);
  setWiz({ note:"Saya setuju dengan perubahan jadwal", start:"", end:"" });
};

const submitAcceptChange = async () => {
  const b = actionModal.booking;
  if (!b) return;
  try {
    await api.post(`/api/bookings/${b.id}/accept-change`, { note: wiz.note || null });
    closeModal();
    await refresh();
    setMsg("Perubahan diterima. Booking disetujui & surat tersedia.");
  } catch (e) {
    alert(e?.response?.data?.message || "Gagal menerima perubahan");
  }
};

const openDeclineChange = (b) => {
  setActionModal({ open:true, type:"DECLINE_CHANGE", booking:b });
  setWizStep(1);
  setWiz({ note:"Tidak bisa di jam tersebut", start:"", end:"" });
};

const submitDeclineChange = async () => {
  const b = actionModal.booking;
  if (!b) return;
  try {
    await api.post(`/api/bookings/${b.id}/decline-change`, { note: wiz.note || null });
    closeModal();
    await refresh();
    setMsg("Perubahan ditolak. Booking dinyatakan ditolak.");
  } catch (e) {
    alert(e?.response?.data?.message || "Gagal menolak perubahan");
  }
};


  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-700">{msg}</div>}

        <NotificationsCard />

<Modal
  open={actionModal.open}
  onClose={closeModal}
  title={
    actionModal.type==="EDIT_TIME" ? "Ubah Jam Pengajuan" :
    actionModal.type==="ACCEPT_CHANGE" ? "Terima Perubahan Jadwal" :
    actionModal.type==="DECLINE_CHANGE" ? "Tolak Perubahan Jadwal" :
    "Form"
  }
  subtitle={actionModal.booking ? `${actionModal.booking.booking_code} • ${actionModal.booking.room_code} - ${actionModal.booking.room_name}` : ""}
>
  {actionModal.type==="EDIT_TIME" && actionModal.booking && (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">Langkah {wizStep}/3</div>

      {wizStep===1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Jam mulai</label>
          <input
            type="time"
            className="w-full border rounded-xl p-3 text-sm"
            value={wiz.start}
            onChange={(e)=>setWiz(v=>({ ...v, start:e.target.value }))}
          />
        </div>
      )}

      {wizStep===2 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Jam selesai</label>
          <input
            type="time"
            className="w-full border rounded-xl p-3 text-sm"
            value={wiz.end}
            onChange={(e)=>setWiz(v=>({ ...v, end:e.target.value }))}
          />
        </div>
      )}

      {wizStep===3 && (
        <div className="rounded-xl border p-3 bg-slate-50 text-sm">
          <div className="font-semibold text-slate-900 mb-2">Konfirmasi Jam</div>
          <div><b>Tanggal:</b> {ymd(actionModal.booking.booking_date)}</div>
          <div><b>Jam:</b> {wiz.start || "-"} - {wiz.end || "-"}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button onClick={closeModal} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Batal</button>
        <div className="flex items-center gap-2">
          {wizStep>1 && (
            <button onClick={()=>setWizStep(s=>s-1)} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Kembali</button>
          )}
          {wizStep<3 ? (
            <button
              onClick={()=>setWizStep(s=>s+1)}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 text-sm"
              disabled={(wizStep===1 && !wiz.start) || (wizStep===2 && !wiz.end)}
            >
              Lanjut
            </button>
          ) : (
            <button onClick={submitEditBooking} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:opacity-95 text-sm">
              Simpan
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  {(actionModal.type==="ACCEPT_CHANGE" || actionModal.type==="DECLINE_CHANGE") && actionModal.booking && (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <div><b>Usulan Admin:</b> {ymd(actionModal.booking.proposed_date || actionModal.booking.booking_date)} • {hhmm(actionModal.booking.proposed_start_time)}-{hhmm(actionModal.booking.proposed_end_time)}</div>
        <div className="text-xs text-slate-500 mt-1">{actionModal.booking.proposed_note || actionModal.booking.admin_note || "-"}</div>
      </div>

      <div className="text-xs text-slate-500">Langkah {wizStep}/2</div>

      {wizStep===1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">
            {actionModal.type==="ACCEPT_CHANGE" ? "Catatan (opsional)" : "Alasan menolak (opsional)"}
          </label>
          <textarea
            className="w-full border rounded-xl p-3 text-sm"
            rows={4}
            value={wiz.note}
            onChange={(e)=>setWiz(v=>({ ...v, note:e.target.value }))}
            placeholder={actionModal.type==="ACCEPT_CHANGE" ? "Contoh: Saya setuju" : "Contoh: Tidak bisa di jam tersebut"}
          />
        </div>
      )}

      {wizStep===2 && (
        <div className="rounded-xl border p-3 bg-slate-50 text-sm">
          <div className="font-semibold text-slate-900 mb-2">Konfirmasi</div>
          <div><b>Catatan:</b> {wiz.note || "-"}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button onClick={closeModal} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Batal</button>
        <div className="flex items-center gap-2">
          {wizStep>1 && (
            <button onClick={()=>setWizStep(s=>s-1)} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Kembali</button>
          )}
          {wizStep<2 ? (
            <button
              onClick={()=>setWizStep(2)}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 text-sm"
            >
              Lanjut
            </button>
          ) : (
            actionModal.type==="ACCEPT_CHANGE" ? (
              <button onClick={submitAcceptChange} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:opacity-95 text-sm">
                Terima
              </button>
            ) : (
              <button onClick={submitDeclineChange} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-95 text-sm">
                Tolak
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )}
</Modal>


        <Card
          title="Jadwal Ruangan (Harian)"
          subtitle="Ditampilkan: Jadwal Baku (resmi) + Jadwal Tambahan (booking yang sudah disetujui)."
          right={
            <div className="flex flex-wrap gap-2">
              <select className="border rounded-lg px-3 py-2 text-sm" value={roomId} onChange={(e)=>setRoomId(e.target.value)}>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
              </select>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
          }
        >
          <div className="text-sm text-slate-600">
            Set aktif minggu ini: <b>{calendar.active_set}</b> • Hari: <b>{formatDow(calendar.day_of_week)}</b>
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2">Jenis</th>
                  <th>Jam</th>
                  <th>Kegiatan</th>
                  <th>Penanggung jawab</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {calendar.fixed.length === 0 && calendar.extra.length === 0 ? (
                  <tr><td className="py-3 text-slate-500" colSpan="5">Belum ada jadwal.</td></tr>
                ) : (
                  <>
                    {calendar.fixed.map(it => (
                      <tr className="border-b" key={"F"+it.id}>
                        <td className="py-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">BAKU</span>
                        </td>
                        <td>{hhmm(it.start_time)} - {hhmm(it.end_time)}</td>
                        <td>{it.course_name}</td>
                        <td>{it.lecturer_name} • {it.class_name || "-"}</td>
                        <td className="text-slate-500">Perkuliahan</td>
                      </tr>
                    ))}

                    {calendar.extra.map(it => (
                      <tr className="border-b" key={"E"+it.id}>
                        <td className="py-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">TAMBAHAN</span>
                        </td>
                        <td>{hhmm(it.start_time)} - {hhmm(it.end_time)}</td>
                        <td>{it.purpose}</td>
                        <td>{it.borrower_name} • {it.booking_code}</td>
                        <td className="text-slate-500">Booking disetujui</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Kalender Mingguan (Interaktif)"
          subtitle="Ringkasan 7 hari untuk ruangan terpilih. Klik item untuk detail."
        >
          <WeeklyCalendar roomId={roomId} date={date} onChangeDate={setDate} />
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Ajukan Peminjaman Ruangan" subtitle="Booking bisa diubah selama status masih PENDING.">
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="time" className="border rounded-lg px-3 py-2" value={form.start_time}
                  onChange={(e)=>setForm({...form, start_time:e.target.value})} />
                <input type="time" className="border rounded-lg px-3 py-2" value={form.end_time}
                  onChange={(e)=>setForm({...form, end_time:e.target.value})} />
              </div>
              <input className="border rounded-lg px-3 py-2" placeholder="Keperluan (contoh: Rapat HIMA)"
                value={form.purpose} onChange={(e)=>setForm({...form, purpose:e.target.value})} />
              <button className="bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">
                Kirim Pengajuan
              </button>
              <p className="text-xs text-slate-500">
                Sistem otomatis menolak jika bentrok dengan jadwal baku atau booking lain.
              </p>
            </form>
          </Card>

          <Card title="Antrian Peminjaman (Ruangan & Tanggal Dipilih)" subtitle="Menampilkan PENDING/COUNTERED/APPROVED, urut jam.">
            <div className="overflow-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2">Kode</th>
                    <th>Peminjam</th>
                    <th>Jam</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr><td className="py-3 text-slate-500" colSpan="4">Belum ada antrian.</td></tr>
                  ) : queue.map(q => (
                    <tr className="border-b" key={q.id}>
                      <td className="py-2">{q.booking_code}</td>
                      <td>{q.borrower_name}</td>
                      <td>{hhmm(q.start_time)} - {hhmm(q.end_time)}</td>
                      <td><Badge status={q.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card title="Booking Saya" subtitle="Timeline status + aksi. COUNTERED = admin mengusulkan perubahan, kamu bisa terima/tolak.">
          <div className="overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2">Kode</th>
                  <th>Ruangan</th>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Keperluan</th>
                  <th>Status</th>
                  <th>Info/Alasan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {myBookings.length === 0 ? (
                  <tr><td className="py-3 text-slate-500" colSpan="8">Belum ada booking.</td></tr>
                ) : myBookings.map(b => (
                  <Fragment key={b.id}>
                    <tr className="border-b">
                      <td className="py-2">{b.booking_code}</td>
                      <td>{b.room_code} - {b.room_name}</td>
                      <td>{ymd(b.booking_date)}</td>
                      <td>{hhmm(b.start_time)} - {hhmm(b.end_time)}</td>
                      <td>{b.purpose}</td>
                      <td><Badge status={b.status} /></td>
                      <td className="text-slate-600">
                        {b.status === "COUNTERED" && (
                          <div>
                            <div className="font-medium">Usulan Admin:</div>
                            <div>{ymd(b.proposed_date || b.booking_date)} {hhmm(b.proposed_start_time)}-{hhmm(b.proposed_end_time)}</div>
                            <div className="text-xs text-slate-500 mt-1">{b.proposed_note || b.admin_note || "-"}</div>
                          </div>
                        )}
                        {b.status === "REJECTED" && (
                          <div className="text-xs">
                            <div><b>Admin:</b> {b.admin_note || "-"}</div>
                            {b.user_note && <div><b>Kamu:</b> {b.user_note}</div>}
                          </div>
                        )}
                        {b.status === "APPROVED" && (
                          <div className="text-xs text-slate-500">Surat tersedia.</div>
                        )}
                        {(b.status === "PENDING" || b.status === "CANCELLED") && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {b.status === "PENDING" && (
                          <>
                            <button className="underline" onClick={()=>openEditBooking(b)}>Edit</button>
                            <button className="underline text-red-600" onClick={()=>cancelBooking(b.id)}>Batal</button>
                          </>
                        )}
                        {b.status === "COUNTERED" && (
                          <>
                            <button className="px-3 py-1 rounded-lg bg-green-600 text-white" onClick={()=>openAcceptChange(b)}>Terima</button>
                            <button className="px-3 py-1 rounded-lg bg-red-600 text-white" onClick={()=>openDeclineChange(b)}>Tolak</button>
                          </>
                        )}
                        {b.status === "APPROVED" && (
                          <button className="underline" onClick={()=>downloadLetter(b.id, b.booking_code)}>Download Surat</button>
                        )}

                        <button
                          className="underline text-slate-700"
                          onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                        >
                          {expandedId === b.id ? "Tutup Detail" : "Lihat Timeline"}
                        </button>
                      </td>
                    </tr>

                    {expandedId === b.id && (
                      <tr className="border-b" key={b.id + "-detail"}>
                        <td colSpan="8" className="py-3">
                          <div className="grid lg:grid-cols-2 gap-4">
                            <div className="rounded-2xl border bg-white p-4">
                              <div className="font-semibold text-slate-900 mb-2">Timeline Status</div>
                              <BookingTimeline booking={b} />
                            </div>

                            <div className="rounded-2xl border bg-white p-4">
                              <div className="font-semibold text-slate-900">Ringkasan</div>
                              <div className="text-sm text-slate-600 mt-2 space-y-1">
                                <div><b>Ruangan:</b> {b.room_code} - {b.room_name}</div>
                                <div><b>Jadwal awal:</b> {ymd(b.booking_date)} {hhmm(b.start_time)}-{hhmm(b.end_time)}</div>
                                {b.status === "COUNTERED" && (
                                  <div className="mt-2">
                                    <div className="font-semibold text-slate-900">Usulan admin</div>
                                    <div>{ymd(b.proposed_date || b.booking_date)} {hhmm(b.proposed_start_time)}-{hhmm(b.proposed_end_time)}</div>
                                    <div className="text-xs text-slate-500">{b.proposed_note || "-"}</div>
                                  </div>
                                )}
                                {b.status === "APPROVED" && (
                                  <div className="mt-3">
                                    <button className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95"
                                      onClick={()=>downloadLetter(b.id, b.booking_code)}>
                                      Download Surat Resmi
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
