/**
 * 多様な日時形式を YYYYMMDDTHHMMSS に変換する
 * 対応例: 2026/3/8 1:00, 2026/03/10T12:00Z, 20260310T120000Z, etc.
 */
export function formatToGoogleCalendarDate(dateStr) {
  // 1. 数字以外の文字で分割して、数字の配列を作る
  // "2026/3/8 1:00" -> ["2026", "3", "8", "1", "00"]
  const parts = dateStr.match(/\d+/g);
  console.log(parts);
  
  if (!parts) {
    console.error("日時の解析に失敗しました:", dateStr);
    return dateStr;
  }

  // 2. パーツの処理
  // 場合 A: 1 つの塊 (例: "20260310T120000" -> ["20260310", "120000"])
  // 場合 B: 複数の塊 (例: "2026/3/8 1:00" -> ["2026", "3", "8", "1", "00"])
  
  let year, month, day, hour, min, sec;

  if (parts.length === 2) {
    // 場合 A: 1 つの塊 (年日付) と (時分秒) の場合
    const datePart = parts[0];
    const timePart = parts[1];

    // 年日付 (YYYYMMDD) の解析
    year = datePart.slice(0, 4);
    month = datePart.slice(4, 6).padStart(2, '0');
    day = datePart.slice(6, 8).padStart(2, '0');

    // 時分秒 (HHMMSS) の解析
    hour = timePart.slice(0, 2).padStart(2, '0');
    min = timePart.slice(2, 4).padStart(2, '0');
    sec = timePart.slice(4, 6).padStart(2, '0');
  } else if (parts.length >= 3) {
    // 場合 B: 複数の塊 (例: "2026/3/8 1:00")
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].padStart(2, '0');
    hour = (parts[3] || '00').padStart(2, '0');
    min = (parts[4] || '00').padStart(2, '0');
    sec = (parts[5] || '00').padStart(2, '0');
  } else {
    // 場合 C: 2 つの塊より少ない (例: "2026/3/8")
    // 時分秒が不足している場合は 00 で補完
    year = parts[0];
    month = parts[1].padStart(2, '0');
    day = parts[2].padStart(2, '0');
    hour = '00';
    min = '00';
    sec = '00';
  }

  // 3. Google形式 (YYYYMMDDTHHMMSS) に組み立て
  const formatted = `${year}${month}${day}T${hour}${min}${sec}`;
  
  console.log(`Date Conversion: [${dateStr}] -> [${formatted}]`);
  return formatted;
}
