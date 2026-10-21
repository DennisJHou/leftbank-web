/** 臺灣學年度：8 月到隔年 1 月是上學期，2 月到 7 月是下學期（以臺灣時間計算） */
export function semesterOf(date: Date) {
  const tw = new Date(new Date(date).getTime() + 8 * 3600_000);
  const y = tw.getUTCFullYear();
  const m = tw.getUTCMonth() + 1;
  const year = m >= 8 ? y - 1911 : y - 1912;
  const term = m >= 8 || m === 1 ? 1 : 2;
  return { key: `${year}-${term}`, label: `${year} 學年度第 ${term} 學期` };
}

export function monthKey(date: Date) {
  const tw = new Date(new Date(date).getTime() + 8 * 3600_000);
  return `${tw.getUTCFullYear()}-${String(tw.getUTCMonth() + 1).padStart(2, "0")}`;
}
