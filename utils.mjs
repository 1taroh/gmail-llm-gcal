/**
 * 多様な日時形式を YYYYMMDDTHHMMSS に変換する
 * 対応例: 2026/3/8 1:00, 2026/03/10T12:00Z, 20260310T120000Z, etc.
 */
export function formatToGoogleCalendarDate(dateStr) {
  // 1. 数字以外の文字で分割して、数字の配列を作る
  // "2026/3/8 1:00" -> ["2026", "3", "8", "1", "00"]
  const parts = dateStr.match(/\d+/g);
  
  if (!parts || parts.length < 3) {
    console.error("日時の解析に失敗しました:", dateStr);
    return dateStr; // 解析不能な場合はそのまま返す（カレンダー側でエラーにさせる）
  }

  // 2. 各パーツの桁数を揃える (YYYY, MM, DD, HH, mm, ss)
  const year  = parts[0];
  const month = parts[1].padStart(2, '0');
  const day   = parts[2].padStart(2, '0');
  const hour  = (parts[3] || '00').padStart(2, '0');
  const min   = (parts[4] || '00').padStart(2, '0');
  const sec   = (parts[5] || '00').padStart(2, '0');

  // 3. Google形式 (YYYYMMDDTHHMMSSZ) に組み立て
  const formatted = `${year}${month}${day}T${hour}${min}${sec}`;
  
  console.log(`Date Conversion: [${dateStr}] -> [${formatted}]`);
  return formatted;
}
