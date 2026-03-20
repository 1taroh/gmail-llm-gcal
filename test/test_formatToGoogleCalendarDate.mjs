import { formatToGoogleCalendarDate } from '../utils.mjs';

const testDates = [
  "2026/3/8 1:00",
  "2026/03/10T12:00Z",
  "20260310T120000Z",
  "20260310T120000",
];

for (let i = 0; i < testDates.length; i++) {
  const result = formatToGoogleCalendarDate(testDates[i]);
  console.log('結果:', result);
}
