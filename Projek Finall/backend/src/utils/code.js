export function makeBookingCode(idLikeNumber) {
  const n = Number(idLikeNumber);
  return "BK-" + String(n).padStart(4, "0");
}

export function makeLetterNumber(seq, dateStr) {
  // contoh: 421.5/PK-RUANG/2025/12/0002
  const d = new Date(dateStr + "T00:00:00");
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const tail = String(seq).padStart(4, "0");
  return `421.5/PK-RUANG/${yyyy}/${mm}/${tail}`;
}
