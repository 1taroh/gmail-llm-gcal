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

async function analyzeMailWithGemini(subject, body) {
// config.js から読み込んだ値を使用
  const API_KEY = CONFIG.GEMINI_API_KEY;
  const MODEL = CONFIG.MODEL_NAME;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerText = "AI解析中... (数秒かかります)";

  // 1. プロンプトの準備
  // 相対的な時間（明日、来週など）を解決するために現在時刻を渡すのが肝
  const now = new Date();
  const prompt = `
以下のメール内容から、Googleカレンダーの予定作成に必要な情報を抽出してJSON形式で出力してください。

【現在の時刻】: ${now.toLocaleString('ja-JP')} (日本標準時)
【メール件名】: ${subject}
【メール本文】: ${body}

【出力ルール】:
1. JSON形式のみを出力してください。
2. "start" と "end" は必ず Google カレンダーが解釈可能な ISO 8601 形式 (YYYYMMDDTHHMMSSZ) のUTC時間で出力してください。
   例: 日本時間 2026/03/10 12:00 なら 20260310T030000Z となります。
3. メールに終了時刻の記載がない場合は、開始時刻の1時間後を終了時刻に設定してください。

【出力フォーマット】:
{
  "title": "予定のタイトル",
  "start": "YYYYMMDDTHHMMSSZ", 
  "end": "YYYYMMDDTHHMMSSZ",
  "details": "予定の説明（メールの要約と、必要に応じて場所やWeb会議URLを含める）"
}
`;

  console.log("Gemini API リクエスト開始...");
  const startTime = Date.now();

  try {
    // 2. APIリクエスト
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          response_mime_type: "application/json",
          temperature: 0.1 // 決定論的な出力を得るために低めに設定
        }
      })
    });

    console.log("HTTPステータス:", response.status);

    if (!response.ok) {
      const errorDetail = await response.json();
      console.error("APIエラー詳細:", errorDetail);
      throw new Error(errorDetail.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Gemini API 応答受信 (所要時間: ${duration}秒)`);

    // 3. レスポンスの検証とパース
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error("レスポンス構造が不正です:", data);
      throw new Error("AIからの回答が空でした。");
    }

    const jsonString = data.candidates[0].content.parts[0].text;
    console.log("解析結果(JSON):", jsonString);

    if (statusEl) statusEl.innerText = "解析完了！";
    return JSON.parse(jsonString);

  } catch (e) {
    console.error("analyzeMailWithGemini でエラーが発生しました:", e);
    if (statusEl) statusEl.innerText = "エラー: " + e.message;
    alert("エラーが発生しました。コンソールを確認してください。");
    return null;
  }
}
