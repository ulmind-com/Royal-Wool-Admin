// All timestamps from the backend are stored in UTC. These helpers render them
// in India Standard Time (Asia/Kolkata) with Indian formatting, so times never
// show in the viewer's / server's local (e.g. US) timezone.
const TZ = "Asia/Kolkata";
const LOCALE = "en-IN";

type D = string | number | Date | null | undefined;

export const fmtDate = (d?: D) =>
  d ? new Date(d).toLocaleDateString(LOCALE, { timeZone: TZ }) : "—";

export const fmtDateTime = (d?: D) =>
  d ? new Date(d).toLocaleString(LOCALE, { timeZone: TZ }) : "—";

export const fmtTime = (d?: D) =>
  d ? new Date(d).toLocaleTimeString(LOCALE, { timeZone: TZ }) : "—";
