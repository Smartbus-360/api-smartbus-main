import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// Convert DB UTC → IST string
export const toIST = (date) => {
  if (!date) return null;
  return dayjs.utc(date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
};
