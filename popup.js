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
async function analyzeMailWithGemini(subject, body) {
// config.js から読み込んだ値を使用
  const API_KEY = CONFIG.GEMINI_API_KEY;
  const MODEL = CONFIG.MODEL_NAME;
    
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
※時刻はUTC形式。もし時間が不明な場合は、現在の時刻の1時間後をデフォルトにしてください。
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          response_mime_type: "application/json",
          temperature: 0.1 // 安定性を高めるために低めに設定
        }
      })
    });

    const data = await response.json();

    // API側からエラーが返ってきた場合
    if (data.error) {
      console.error("Gemini API Error Detail:", data.error.message);
      alert("APIエラー: " + data.error.message);
      return null;
    }

    // 回答がブロックされた、または空の場合
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      console.error("Gemini Response is empty or blocked:", data);
      alert("AIから回答が得られませんでした。安全フィルタに抵触した可能性があります。");
      return null;
    }

    // 正常なケース
    const jsonString = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonString);

  } catch (e) {
    console.error("Network or Parsing Error:", e);
    return null;
  }
}
