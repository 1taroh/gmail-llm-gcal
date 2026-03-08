// 保存処理
document.getElementById("save").addEventListener("click", async () => {
  const geminiKey = document.getElementById("gemini-key").value;
  const geminiModel = document.getElementById("gemini-model").value;
  const ollamaUrl = document.getElementById("ollama-url").value;
  const ollamaModel = document.getElementById("ollama-model").value;
  // ラジオボタンの選択値を取得
  const selectedModel = document.querySelector('input[name="mode"]:checked').value;

  chrome.storage.sync.set({
    geminiKey: geminiKey,
    geminiModel: geminiModel,
    ollamaUrl: ollamaUrl,
    ollamaModel: ollamaModel,
    selectedModel: selectedModel
  }, () => {
    alert("設定を保存しました");
  });
});

// --- イベントリスナー ---

document.getElementById("gemini-validation").addEventListener("click", async () => {
  const geminiKey = document.getElementById("gemini-key").value;
  const geminiModel = document.getElementById("gemini-model").value;
  if (!geminiKey) {
    updateStatus("gemini-status", "APIキーを入力してください", true);
    return;
  }
  if (!geminiModel) {
    updateStatus("gemini-status", "モデル名を入力してください", true);
    return;
  }
  await validateGemini(geminiKey, geminiModel);
});

document.getElementById("ollama-validation").addEventListener("click", async () => {
  const ollamaUrl = document.getElementById("ollama-url").value;
  const ollamaModel = document.getElementById("ollama-model").value;
  if (!ollamaUrl) {
    updateStatus("ollama-status", "URLを入力してください", true);
    return;
  }
  if (!ollamaModel) {
    updateStatus("ollama-status", "モデル名を入力してください", true);
    return;
  }
  await validateOllama(ollamaUrl, ollamaModel);
});

// 読み込み処理
chrome.storage.sync.get(["geminiKey","geminiModel", "ollamaUrl", "ollamaModel", "selectedModel"], (data) => {
  if (data.geminiKey) document.getElementById("gemini-key").value = data.geminiKey;
  if (data.geminiModel) document.getElementById("gemini-model").value = data.geminiModel;
  if (data.ollamaUrl) document.getElementById("ollama-url").value = data.ollamaUrl;
  if (data.ollamaModel) document.getElementById("ollama-model").value = data.ollamaModel;
  
  // 保存されたモデルに応じてラジオボタンをチェック
  if (data.selectedModel === "ollama") {
    document.getElementById("use-ollama").checked = true;
  } else {
    // デフォルトは Gemini
    document.getElementById("use-gemini").checked = true;
  }
});

// --- 検証ロジック ---
async function validateGemini(key, model) {
  const statusId = "gemini-status";
  updateStatus(statusId, "確認中...");
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`);
    
    if (res.ok) {
      updateStatus(statusId, `成功 (HTTP ${res.status}): モデル "${model}" は有効です`);
    } else {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || "不明なエラー";
      updateStatus(statusId, `失敗 (HTTP ${res.status}): ${errorMsg}`, true);
    }
  } catch (err) {
    updateStatus(statusId, `接続エラー: ${err.message}`, true);
  }
}

async function validateOllama(url, model) {
  const statusId = "ollama-status";
  updateStatus(statusId, "確認中...");

  try {
    // Ollamaはモデル情報を取得するエンドポイントで検証
    const res = await fetch(`${url}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (res.ok) {
      updateStatus(statusId, `成功 (HTTP ${res.status}): "${model}" が見つかりました`);
    } else {
      // 404などはモデルが存在しない場合が多い
      updateStatus(statusId, `失敗 (HTTP ${res.status}): モデルが見つからないかサーバーエラーです`, true);
    }
  } catch (err) {
    updateStatus(statusId, `接続エラー: Ollamaが起動しているか確認してください (${err.message})`, true);
  }
}

// 結果を画面に表示するための共通関数
function updateStatus(elementId, message, isError = false) {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#d93025" : "#1e8e3e"; // 赤か緑
  }
}
