export function toDayOfWeek1to7(dateStr) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr + "T00:00:00");
  const js = d.getDay(); // 0=Sun..6=Sat
  return js === 0 ? 7 : js; // 1=Mon..7=Sun
}

export function timeOverlap(startA, endA, startB, endB) {
  // string 'HH:MM:SS' or 'HH:MM'
  return (startA < endB) && (endA > startB);
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

// ISO week number
export function getISOWeek(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const weekNo = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
  return weekNo;
}

export function activeScheduleSet(dateStr) {
  const week = getISOWeek(dateStr);
  return (week % 2 === 1) ? "A" : "B"; // ganjil A, genap B
}
