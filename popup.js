document.getElementById('extractBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // 1. Gmail側からデータを取得してくる
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getMailDataFromDOM, // 取得専用の関数
  });

  const mailData = results[0].result;
  if (!mailData) return;

  // 2. popup.js 側でURLを生成する
  const calendarUrl = generateCalendarUrl(mailData.subject, mailData.body);
  
  console.log("Generated URL:", calendarUrl);

  // 3. 拡張機能のAPIを使って新しいタブを開く (これが一番確実)
  chrome.tabs.create({ url: calendarUrl });
});

// --- 補助関数 ---

function getMailDataFromDOM() {
  const subject = document.querySelector('h2.hP')?.innerText || "無題の予定";
  const body = document.querySelector('div.a3s.aiL')?.innerText || "";
  return { subject, body };
}

function generateCalendarUrl(title, details) {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  
  // 本来はここをLLMで動的に生成する
  const startTime = "20260310T030000Z"; 
  const endTime = "20260310T040000Z";

  const params = new URLSearchParams({
    text: title,
    dates: `${startTime}/${endTime}`,
    details: details
  });

  return `${baseUrl}&${params.toString()}`;
}
