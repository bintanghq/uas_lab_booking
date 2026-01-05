import { useEffect, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import Badge from "../components/Badge";
import api from "../lib/api";
import NotificationsCard from "../components/NotificationsCard";
import Modal from "../components/Modal";

function hhmm(t){ return String(t||"").slice(0,5); }
function ymd(x){ return String(x||"").slice(0,10); }

export default function AdminDashboard() {
  const [tab, setTab] = useState("approvals");
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [fixed, setFixed] = useState([]);

  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [bookings, setBookings] = useState([]);

  const [newDosen, setNewDosen] = useState({ name:"", username:"", email:"", password:"" });
  const [newRoom, setNewRoom] = useState({ code:"", name:"", type:"LAB", location:"", capacity:30, facilities:"" });
  const [newFixed, setNewFixed] = useState({ schedule_set:"A", day_of_week:1, start_time:"08:00", end_time:"10:00", course_name:"", lecturer_name:"", class_name:"" });

  const [actionModal, setActionModal] = useState({ open:false, type:null, booking:null });
  const [wizStep, setWizStep] = useState(1);
  const [wiz, setWiz] = useState({ note:"", date:"", start:"", end:"" });

  const load = async () => {
    const rRooms = await api.get("/api/admin/rooms");
    setRooms(rRooms.data);
    const roomId = selectedRoomId || (rRooms.data[0]?.id ? String(rRooms.data[0].id) : "");
    if (!selectedRoomId && roomId) setSelectedRoomId(roomId);

    const rBookings = await api.get(`/api/admin/bookings?status=${statusFilter}`);
    setBookings(rBookings.data);

    if (roomId) {
      const rFixed = await api.get(`/api/admin/rooms/${roomId}/fixed-schedules`);
      setFixed(rFixed.data);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [selectedRoomId, statusFilter]);

  const approve = async (id) => {
    await api.post(`/api/admin/bookings/${id}/approve`, { note: "Disetujui" });
    await load();
  };

const closeModal = () => {
  setActionModal({ open:false, type:null, booking:null });
  setWizStep(1);
};

const openReject = (b) => {
  setActionModal({ open:true, type:"REJECT", booking:b });
  setWizStep(1);
  setWiz({ note:"Jadwal tidak sesuai", date:"", start:"", end:"" });
};

const openPropose = (b) => {
  setActionModal({ open:true, type:"PROPOSE", booking:b });
  setWizStep(1);
  setWiz({
    date: ymd(b.booking_date),
    start: hhmm(b.start_time),
    end: hhmm(b.end_time),
    note: "Bentrok jadwal, mohon geser jam",
  });
};

const submitReject = async () => {
  const b = actionModal.booking;
  if (!b) return;
  await api.post(`/api/admin/bookings/${b.id}/reject`, { note: wiz.note || null });
  closeModal();
  await load();
};

const submitPropose = async () => {
  const b = actionModal.booking;
  if (!b) return;
  try {
    await api.post(`/api/admin/bookings/${b.id}/propose-change`, {
      proposed_date: wiz.date || null,
      proposed_start_time: wiz.start,
      proposed_end_time: wiz.end,
      note: wiz.note || null,
    });
    closeModal();
    alert("Usulan perubahan dikirim ke user (COUNTERED).");
    setStatusFilter("COUNTERED");
    await load();
  } catch (e) {
    alert(e?.response?.data?.message || "Gagal mengusulkan perubahan");
  }
};


  const createDosen = async (e) => {
    e.preventDefault();
    await api.post("/api/admin/users/dosen", newDosen);
    alert("Akun dosen dibuat!");
    setNewDosen({ name:"", username:"", email:"", password:"" });
  };

  const createRoom = async (e) => {
    e.preventDefault();
    await api.post("/api/admin/rooms", newRoom);
    alert("Ruangan ditambah!");
    setNewRoom({ code:"", name:"", type:"LAB", location:"", capacity:30, facilities:"" });
    await load();
  };

  const addFixed = async (e) => {
    e.preventDefault();
    await api.post(`/api/admin/rooms/${selectedRoomId}/fixed-schedules`, newFixed);
    setNewFixed({ schedule_set:"A", day_of_week:1, start_time:"08:00", end_time:"10:00", course_name:"", lecturer_name:"", class_name:"" });
    await load();
  };

  const delFixed = async (id) => {
    if (!confirm("Hapus jadwal baku ini?")) return;
    await api.delete(`/api/admin/fixed-schedules/${id}`);
    await load();
  };

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <NotificationsCard />

<Modal
  open={actionModal.open}
  onClose={closeModal}
  title={actionModal.type==="REJECT" ? "Reject Pengajuan" : "Ubah Jadwal Pengajuan"}
  subtitle={actionModal.booking ? `${actionModal.booking.booking_code} • ${actionModal.booking.room_code} - ${actionModal.booking.room_name}` : ""}
>
  {actionModal.type==="REJECT" && actionModal.booking && (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <div><b>Peminjam:</b> {actionModal.booking.borrower_name} ({actionModal.booking.borrower_role})</div>
        <div><b>Tanggal:</b> {ymd(actionModal.booking.booking_date)} • <b>Jam:</b> {hhmm(actionModal.booking.start_time)} - {hhmm(actionModal.booking.end_time)}</div>
      </div>

      <div className="text-xs text-slate-500">Langkah {wizStep}/2</div>

      {wizStep===1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Alasan penolakan</label>
          <textarea
            className="w-full border rounded-xl p-3 text-sm"
            rows={4}
            value={wiz.note}
            onChange={(e)=>setWiz(v=>({ ...v, note:e.target.value }))}
            placeholder="Contoh: Bentrok jadwal perkuliahan / ruangan sedang dipakai"
          />
        </div>
      )}

      {wizStep===2 && (
        <div className="rounded-xl border p-3 bg-slate-50 text-sm">
          <div className="font-semibold text-slate-900 mb-2">Konfirmasi Reject</div>
          <div><b>Alasan:</b> {wiz.note || "-"}</div>
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
              disabled={!wiz.note}
            >
              Lanjut
            </button>
          ) : (
            <button
              onClick={submitReject}
              className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-95 text-sm"
            >
              Kirim Reject
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  {actionModal.type==="PROPOSE" && actionModal.booking && (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <div><b>Asal:</b> {ymd(actionModal.booking.booking_date)} • {hhmm(actionModal.booking.start_time)}-{hhmm(actionModal.booking.end_time)}</div>
        <div><b>Tujuan:</b> atur ulang jadwal yang sesuai lalu kirim ke user (COUNTERED)</div>
      </div>

      <div className="text-xs text-slate-500">Langkah {wizStep}/4</div>

      {wizStep===1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Pilih tanggal baru</label>
          <input
            type="date"
            className="w-full border rounded-xl p-3 text-sm"
            value={wiz.date}
            onChange={(e)=>setWiz(v=>({ ...v, date:e.target.value }))}
          />
          <div className="text-xs text-slate-500">Boleh sama dengan tanggal asal, atau pilih tanggal lain.</div>
        </div>
      )}

      {wizStep===2 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Pilih jam baru</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-slate-600">Jam mulai</div>
              <input
                type="time"
                className="w-full border rounded-xl p-3 text-sm"
                value={wiz.start}
                onChange={(e)=>setWiz(v=>({ ...v, start:e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-600">Jam selesai</div>
              <input
                type="time"
                className="w-full border rounded-xl p-3 text-sm"
                value={wiz.end}
                onChange={(e)=>setWiz(v=>({ ...v, end:e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {wizStep===3 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Catatan / alasan perubahan</label>
          <textarea
            className="w-full border rounded-xl p-3 text-sm"
            rows={4}
            value={wiz.note}
            onChange={(e)=>setWiz(v=>({ ...v, note:e.target.value }))}
            placeholder="Contoh: Bentrok jadwal, mohon geser ke jam berikut"
          />
        </div>
      )}

      {wizStep===4 && (
        <div className="rounded-xl border p-3 bg-slate-50 text-sm">
          <div className="font-semibold text-slate-900 mb-2">Konfirmasi Usulan Jadwal</div>
          <div><b>Tanggal:</b> {wiz.date || "-"}</div>
          <div><b>Jam:</b> {wiz.start || "-"} - {wiz.end || "-"}</div>
          <div className="mt-2"><b>Catatan:</b> {wiz.note || "-"}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button onClick={closeModal} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Batal</button>

        <div className="flex items-center gap-2">
          {wizStep>1 && (
            <button onClick={()=>setWizStep(s=>s-1)} className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm">Kembali</button>
          )}

          {wizStep<4 ? (
            <button
              onClick={()=>setWizStep(s=>s+1)}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 text-sm"
              disabled={
                (wizStep===1 && !wiz.date) ||
                (wizStep===2 && (!wiz.start || !wiz.end)) ||
                (wizStep===3 && !wiz.note)
              }
            >
              Lanjut
            </button>
          ) : (
            <button
              onClick={submitPropose}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:opacity-95 text-sm"
            >
              Kirim Usulan
            </button>
          )}
        </div>
      </div>
    </div>
  )}
</Modal>


        <div className="flex flex-wrap gap-2">
          <button className={`px-3 py-2 rounded-lg border ${tab==="approvals"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("approvals")}>Persetujuan</button>
          <button className={`px-3 py-2 rounded-lg border ${tab==="fixed"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("fixed")}>Jadwal Baku</button>
          <button className={`px-3 py-2 rounded-lg border ${tab==="rooms"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("rooms")}>Ruangan</button>
          <button className={`px-3 py-2 rounded-lg border ${tab==="dosen"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("dosen")}>Tambah Dosen</button>
        </div>

        {tab==="approvals" && (
          <Card
            title="Manajemen Booking"
            subtitle="PENDING = menunggu admin. COUNTERED = menunggu persetujuan user."
            right={
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                <option value="PENDING">PENDING</option>
                <option value="COUNTERED">COUNTERED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            }
          >
            <div className="overflow-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2">Kode</th>
                    <th>Peminjam</th>
                    <th>Role</th>
                    <th>Ruangan</th>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Keperluan</th>
                    <th>Status</th>
                    <th>Info</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length===0 ? (
                    <tr><td className="py-3 text-slate-500" colSpan="10">Tidak ada data.</td></tr>
                  ) : bookings.map(b => (
                    <tr className="border-b" key={b.id}>
                      <td className="py-2">{b.booking_code}</td>
                      <td>{b.borrower_name}</td>
                      <td>{b.borrower_role}</td>
                      <td>{b.room_code} - {b.room_name}</td>
                      <td>{ymd(b.booking_date)}</td>
                      <td>{hhmm(b.start_time)} - {hhmm(b.end_time)}</td>
                      <td>{b.purpose}</td>
                      <td><Badge status={b.status} /></td>
                      <td className="text-xs text-slate-600">
                        {b.status === "COUNTERED" && (
                          <div>
                            <div><b>Usulan:</b> {ymd(b.proposed_date || b.booking_date)} {hhmm(b.proposed_start_time)}-{hhmm(b.proposed_end_time)}</div>
                            <div>{b.proposed_note || b.admin_note || "-"}</div>
                          </div>
                        )}
                        {b.status === "REJECTED" && (b.admin_note || "-")}
                        {b.status === "APPROVED" && "Final disetujui"}
                        {b.status === "PENDING" && "-"}
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {b.status === "PENDING" ? (
                          <>
                            <button className="px-3 py-1 rounded-lg bg-green-600 text-white" onClick={()=>approve(b.id)}>Approve</button>
                            <button className="px-3 py-1 rounded-lg bg-blue-600 text-white" onClick={()=>openPropose(b)}>Ubah Jadwal</button>
                            <button className="px-3 py-1 rounded-lg bg-red-600 text-white" onClick={()=>openReject(b)}>Reject</button>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab==="fixed" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card
              title="Daftar Jadwal Baku (A/B)"
              subtitle="Pilih ruangan, lalu kelola jadwal baku."
              right={
                <select className="border rounded-lg px-3 py-2 text-sm" value={selectedRoomId} onChange={(e)=>setSelectedRoomId(e.target.value)}>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.code} - {r.name}</option>)}
                </select>
              }
            >
              <div className="overflow-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600 border-b">
                      <th className="py-2">Set</th>
                      <th>Hari</th>
                      <th>Jam</th>
                      <th>Mata Kuliah</th>
                      <th>Dosen</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixed.length===0 ? (
                      <tr><td className="py-3 text-slate-500" colSpan="6">Belum ada jadwal baku.</td></tr>
                    ) : fixed.map(f => (
                      <tr className="border-b" key={f.id}>
                        <td className="py-2">{f.schedule_set}</td>
                        <td>{f.day_of_week}</td>
                        <td>{hhmm(f.start_time)} - {hhmm(f.end_time)}</td>
                        <td>{f.course_name}</td>
                        <td>{f.lecturer_name}</td>
                        <td><button className="underline text-red-600" onClick={()=>delFixed(f.id)}>Hapus</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Tambah Jadwal Baku" subtitle="Pastikan tidak bentrok dengan jadwal baku lain di ruangan yang sama.">
              <form onSubmit={addFixed} className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <select className="border rounded-lg px-3 py-2" value={newFixed.schedule_set}
                    onChange={(e)=>setNewFixed({...newFixed, schedule_set:e.target.value})}>
                    <option value="A">Set A</option>
                    <option value="B">Set B</option>
                  </select>
                  <select className="border rounded-lg px-3 py-2" value={newFixed.day_of_week}
                    onChange={(e)=>setNewFixed({...newFixed, day_of_week:Number(e.target.value)})}>
                    <option value={1}>1 (Senin)</option>
                    <option value={2}>2 (Selasa)</option>
                    <option value={3}>3 (Rabu)</option>
                    <option value={4}>4 (Kamis)</option>
                    <option value={5}>5 (Jumat)</option>
                    <option value={6}>6 (Sabtu)</option>
                    <option value={7}>7 (Minggu)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input type="time" className="border rounded-lg px-3 py-2" value={newFixed.start_time}
                    onChange={(e)=>setNewFixed({...newFixed, start_time:e.target.value})}/>
                  <input type="time" className="border rounded-lg px-3 py-2" value={newFixed.end_time}
                    onChange={(e)=>setNewFixed({...newFixed, end_time:e.target.value})}/>
                </div>

                <input className="border rounded-lg px-3 py-2" placeholder="Mata kuliah" value={newFixed.course_name}
                  onChange={(e)=>setNewFixed({...newFixed, course_name:e.target.value})}/>
                <input className="border rounded-lg px-3 py-2" placeholder="Nama dosen" value={newFixed.lecturer_name}
                  onChange={(e)=>setNewFixed({...newFixed, lecturer_name:e.target.value})}/>
                <input className="border rounded-lg px-3 py-2" placeholder="Kelas (opsional)" value={newFixed.class_name}
                  onChange={(e)=>setNewFixed({...newFixed, class_name:e.target.value})}/>

                <button className="bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">Simpan</button>
              </form>
            </Card>
          </div>
        )}

        {tab==="rooms" && (
          <Card title="Tambah Ruangan" subtitle="Admin dapat menambah ruangan yang bisa dipinjam.">
            <form onSubmit={createRoom} className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Kode (contoh: LAB-KOM3)" value={newRoom.code}
                onChange={(e)=>setNewRoom({...newRoom, code:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Nama ruangan" value={newRoom.name}
                onChange={(e)=>setNewRoom({...newRoom, name:e.target.value})}/>
              <select className="border rounded-lg px-3 py-2" value={newRoom.type}
                onChange={(e)=>setNewRoom({...newRoom, type:e.target.value})}>
                <option value="LAB">LAB</option>
                <option value="KELAS">KELAS</option>
                <option value="AULA">AULA</option>
              </select>
              <input className="border rounded-lg px-3 py-2" placeholder="Lokasi" value={newRoom.location}
                onChange={(e)=>setNewRoom({...newRoom, location:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Kapasitas" type="number" value={newRoom.capacity}
                onChange={(e)=>setNewRoom({...newRoom, capacity:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Fasilitas" value={newRoom.facilities}
                onChange={(e)=>setNewRoom({...newRoom, facilities:e.target.value})}/>
              <button className="md:col-span-2 bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">
                Tambah Ruangan
              </button>
            </form>
            <div className="mt-6 overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2">Kode</th><th>Nama</th><th>Tipe</th><th>Lokasi</th><th>Kapasitas</th><th>Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(r => (
                    <tr className="border-b" key={r.id}>
                      <td className="py-2">{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{r.location || "-"}</td>
                      <td>{r.capacity}</td>
                      <td>{r.is_active ? "Ya" : "Tidak"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab==="dosen" && (
          <Card title="Tambah Akun Dosen" subtitle="Admin membuat username dosen untuk login.">
            <form onSubmit={createDosen} className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Nama dosen" value={newDosen.name}
                onChange={(e)=>setNewDosen({...newDosen, name:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Username" value={newDosen.username}
                onChange={(e)=>setNewDosen({...newDosen, username:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Email (opsional)" value={newDosen.email}
                onChange={(e)=>setNewDosen({...newDosen, email:e.target.value})}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Password" type="password" value={newDosen.password}
                onChange={(e)=>setNewDosen({...newDosen, password:e.target.value})}/>
              <button className="md:col-span-2 bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">
                Buat Akun Dosen
              </button>
            </form>
          </Card>
        )}
      </main>
    </>
  );
}
