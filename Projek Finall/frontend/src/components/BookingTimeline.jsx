function fmtDT(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID");
}

function dotClass(kind) {
  if (kind === "DONE") return "bg-green-600";
  if (kind === "ACTIVE") return "bg-blue-600";
  if (kind === "REJECT") return "bg-red-600";
  return "bg-slate-300";
}

export default function BookingTimeline({ booking }) {
  const status = booking?.status;

  const steps = [];

  steps.push({
    title: "Pengajuan dibuat",
    desc: `Booking ${booking.booking_code} dibuat oleh user.`,
    time: fmtDT(booking.requested_at),
    kind: "DONE"
  });

  // admin step
  let adminTitle = "Menunggu tindakan admin";
  let adminKind = "ACTIVE";
  if (booking.admin_action_at) {
    if (status === "COUNTERED") adminTitle = "Admin mengajukan perubahan jadwal";
    else if (status === "APPROVED" && !booking.user_decision_at) adminTitle = "Admin menyetujui booking";
    else if (status === "REJECTED" && !booking.user_decision_at) adminTitle = "Admin menolak booking";
    else adminTitle = "Admin memproses booking";
    adminKind = (status === "REJECTED" && !booking.user_decision_at) ? "REJECT" : "DONE";
  }
  steps.push({
    title: adminTitle,
    desc: booking.admin_note ? `Catatan admin: ${booking.admin_note}` : null,
    time: fmtDT(booking.admin_action_at),
    kind: booking.admin_action_at ? adminKind : "ACTIVE"
  });

  // user step (only meaningful if countered path exists)
  const hasCounter = (status === "COUNTERED") || (booking.user_decision_at != null);
  if (hasCounter) {
    let uTitle = "Menunggu respon user";
    let uKind = "ACTIVE";
    if (booking.user_decision_at) {
      if (status === "APPROVED") { uTitle = "User menerima perubahan"; uKind = "DONE"; }
      else if (status === "REJECTED") { uTitle = "User menolak perubahan"; uKind = "REJECT"; }
      else { uTitle = "User merespon usulan"; uKind = "DONE"; }
    }
    steps.push({
      title: uTitle,
      desc: booking.user_note ? `Catatan user: ${booking.user_note}` : null,
      time: fmtDT(booking.user_decision_at),
      kind: uKind
    });
  }

  // final
  let fTitle = "Belum ada keputusan akhir";
  let fKind = "ACTIVE";
  if (status === "APPROVED") { fTitle = "Disetujui final"; fKind = "DONE"; }
  else if (status === "REJECTED") { fTitle = "Ditolak final"; fKind = "REJECT"; }
  else if (status === "CANCELLED") { fTitle = "Dibatalkan user"; fKind = "REJECT"; }
  steps.push({
    title: fTitle,
    desc: booking.decision_at ? "Status final sudah ditetapkan." : null,
    time: fmtDT(booking.decision_at),
    kind: (booking.decision_at || status==="APPROVED" || status==="REJECTED" || status==="CANCELLED") ? fKind : "ACTIVE"
  });

  return (
    <div className="relative">
      <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-200" />
      <div className="space-y-4">
        {steps.map((s, idx) => (
          <div key={idx} className="flex gap-3">
            <div className={`mt-1 h-6 w-6 rounded-full ${dotClass(s.kind)} flex items-center justify-center text-white text-xs`}>
              {idx+1}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">{s.title}</div>
                <div className="text-xs text-slate-500">{s.time || "-"}</div>
              </div>
              {s.desc && <div className="text-sm text-slate-600 mt-1">{s.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
