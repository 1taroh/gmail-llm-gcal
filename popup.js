document.getElementById('extractBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getMailDataFromDOM,
  });

  const mailData = results[0].result;
  if (!mailData) return;

  // --- LLMによる解析フェーズ ---
  console.log("LLM解析中...");
  const analysis = await analyzeMailWithGemini(mailData.subject, mailData.body);
  
  if (!analysis) {
    alert("解析に失敗しました。");
    return;
  }

  // --- URL生成と遷移 ---
  const calendarUrl = generateCalendarUrl(analysis);
  chrome.tabs.create({ url: calendarUrl });
});

// --- 補助関数 ---

function getMailDataFromDOM() {
  const subject = document.querySelector('h2.hP')?.innerText || "無題の予定";
  const body = document.querySelector('div.a3s.aiL')?.innerText || "";
  return { subject, body };
}

/**
 * 解析結果を元にURLを生成する
 */
function generateCalendarUrl(analysis) {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text: analysis.title,
    dates: `${analysis.start}/${analysis.end}`,
    details: analysis.details
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
