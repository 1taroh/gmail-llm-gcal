// 保存処理
document.getElementById("save").addEventListener("click", () => {
  const geminiKey = document.getElementById("gemini-key").value;
  const geminiModel = document.getElementById("gemini-model").value;
  const ollamaUrl = document.getElementById("ollama-url").value;
  const ollamaModel = document.getElementById("ollama-model").value;
  // ラジオボタンの選択値を取得
  const selectedModel = document.querySelector('input[name="mode"]:checked').value;

  // TODO: 外部モデルを使うときに，モデルやAPIが有効か確認する  
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
