import { AbsenMusyrif } from './types';

/**
 * Returns WIB (Asia/Jakarta) date string (YYYY-MM-DD), current hour (0-23), and minute (0-59).
 */
export const getWibInfo = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);

  const todayStr = `${year}-${month}-${day}`;
  return { todayStr, hour, minute };
};

/**
 * Checks if a Musyrif is automatically turned OFF (blocked from login / logging out)
 * because current WIB time is between 14:00 and 18:00 WIB and they haven't submitted attendance today.
 * The account opens again automatically at 18:00 WIB.
 */
export const isMusyrifAutoOff14 = (musyrifId: string, attendances: AbsenMusyrif[]): boolean => {
  const { todayStr, hour } = getWibInfo();
  
  // Auto-off window is 14:00 WIB to 17:59 WIB (hours 14, 15, 16, 17)
  if (hour < 14 || hour >= 18) {
    return false;
  }

  // Between 14:00 and 18:00 WIB, check if Musyrif has done attendance today
  const hasAbsenToday = attendances.some(
    a => a.musyrifId === musyrifId && a.tanggal === todayStr
  );

  return !hasAbsenToday;
};
