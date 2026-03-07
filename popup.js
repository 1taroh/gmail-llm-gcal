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

/**
 * Gemini API を使ってメールを解析する
 *  TODO: local LLM にも将来的に対応する
 */
async function analyzeMailWithGemini(subject, body) {
  const API_KEY = 'YOUR_GEMINI_API_KEY'; // ここに取得したキーを入力
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const prompt = `
以下のメール内容から、Googleカレンダーに登録するための情報を抽出してJSON形式で出力してください。
現在の時刻は ${new Date().toLocaleString('ja-JP')} です。

【メール件名】: ${subject}
【メール本文】: ${body}

【出力フォーマット】:
{
  "title": "予定のタイトル",
  "start": "YYYYMMDDTHHMMSSZ", 
  "end": "YYYYMMDDTHHMMSSZ",
  "details": "予定の説明（要約）"
}
※日時は必ずUTC形式（末尾にZ）で出力してください。
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" } // JSONで返却を強制
      })
    });

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    console.error("Gemini API Error:", e);
    return null;
  }
}
