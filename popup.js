import { formatToGoogleCalendarDate } from './utils.mjs';

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
  let analysis = null;

  const { selectedModel } = await chrome.storage.sync.get("selectedModel")
  if (selectedModel == "ollama") {
    analysis = await analyzeMailWithOllama(mailData.subject, mailData.body);
  } else if (selectedModel == "gemini") {
    analysis = await analyzeMailWithGemini(mailData.subject, mailData.body);
  }
  else {
    console.log("selectedModel が不正な値です．");
    console.log(selectedModel);
  }
  
  if (!analysis) {
    alert("解析に失敗しました。");
    return;
  }

  // --- URL生成と遷移 ---
    const calendarUrl = generateCalendarUrl(analysis);
    console.log(calendarUrl) // デバック時に使用
  // chrome.tabs.create({ url: calendarUrl }); // デバック時はコメントアウト
});

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
  const settings = await chrome.storage.sync.get(["geminiKey", "geminiModel"])
  const API_KEY = settings.geminiKey;
  const MODEL = settings.geminiModel;

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerText = "AI解析中... (十数秒かかります)";

  // 1. プロンプトの準備
  const prompt = getPrompt(subject, body)

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

async function analyzeMailWithOllama(subject, body) {
  const settings = await chrome.storage.sync.get(["ollamaUrl", "ollamaModel"])
  const OLLAMA_URL = settings.ollamaUrl + "/api/chat";
  const MODEL_NAME = settings.ollamaModel;

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerText = "ローカルLLMで解析中...";

  const prompt = getPrompt(subject, body)

try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
        think: false,
        stream: false,
        format: "json"
      })
    });

  if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);

  // 1. まずテキストとして一度だけ読み取る
  const rawText = await response.text();
  // console.log("Ollama Raw Response:", rawText);

  // 2. response.json() は呼ばず、この rawText をパースする
  const data = JSON.parse(rawText);
  console.log(data)

  // 3. Ollamaの構造 (message.content) から、さらに中のJSON文字列を取り出す
  let contentString = data.message?.content;
  if (!contentString) throw new Error("Content is empty");

  // 4. 最初に出現する '{' から最後に出現する '}' までを抽出する正規表現
  const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      
  if (jsonMatch) {
    contentString = jsonMatch[0];
  } else {
    throw new Error("有効なJSON構造が見つかりませんでした。");
  }
  console.log(contentString)

  // 5. content の中身もJSON形式の文字列なので、再度パースしてオブジェクトにする
  const result = JSON.parse(contentString);
  
  // 6. フォーマットの調整
  result.start = formatToGoogleCalendarDate(result.start);
  result.end = formatToGoogleCalendarDate(result.end);

  console.log("解析成功:", result);
  return result;

  } catch (e) {
    console.error("Ollama連携失敗:", e);
    return null;
  }
}

// --- 補助関数 ---

function getMailDataFromDOM() {
  const subject = document.querySelector('h2.hP')?.innerText || "無題の予定";
  const body = document.querySelector('div.a3s.aiL')?.innerText || "";
  return { subject, body };
}

function getPrompt(subject, body) {
  const now = new Date(); // 相対的な時間（明日、来週など）を解決するために現在時刻を渡すのが肝
  const prompt = `
  以下のメール内容から、Googleカレンダー用の情報をJSONで抽出してください。
  現在時刻: ${now.toLocaleString('ja-JP')}

  【件名】: ${subject}
  【本文】: ${body}

  出力は以下のJSONフォーマットのみとし、解説は不要です。
  {
    "title": "予定タイトル",
    "start": "YYYYMMDDTHHMMSS", 
    "end": "YYYYMMDDTHHMMSS",
    "details": "予定の説明（メールの要約と、必要に応じて場所やWeb会議URLを含める）"
  }
  ※不明な場合は現在時刻の1時間後をセットしてください。`;
  
  return prompt
}
