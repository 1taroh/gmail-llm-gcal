(function() {
  console.log("gmail-llm-gcal: Initializing...");

  let isAiMode = false;
  const originalOpen = window.open;

  // window.openをラップしてURLを捕捉
  window.open = function(url, target, specs) {
    if (isAiMode && url && url.includes("calendar.google.com/calendar")) {
      isAiMode = false; // フラグをリセット
      
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      console.log("✅ [Captured for LLM]:", {
        title: params.get('text'),
        body: params.get('details'),
        dates: params.get('dates')
      });

      alert("URLをキャッチしました！コンソール(F12)を確認してください。\n次のステップでここからOllamaへ投げます。");
      
      // ここで return null; にすると、元のカレンダータブは開きません
      // 開発中は挙動確認のためにそのまま開く設定にします
      return originalOpen.apply(this, arguments);
    }
    return originalOpen.apply(this, arguments);
  };

  // Gmailのメニューにボタンを注入
  function injectButton() {
    const menu = document.querySelector('div[role="menu"]');
    if (menu && !document.getElementById('ai-gcal-btn')) {
      const items = Array.from(menu.querySelectorAll('div[role="menuitem"]'));
      const originalBtn = items.find(el => el.innerText.includes('予定を作成'));

      if (originalBtn) {
        const aiBtn = originalBtn.cloneNode(true);
        aiBtn.id = 'ai-gcal-btn';
        // テキストを書き換え（アイコンはGmailのものを流用）
        const label = aiBtn.querySelector('.J-N-JX') || aiBtn;
        label.innerText = '✨ AIで予定を生成';
        
        aiBtn.addEventListener('click', (e) => {
          console.log("AI Mode Activated");
          isAiMode = true;
          originalBtn.click(); // 本物のボタンをクリックさせてURLを生成させる
          e.stopPropagation();
        }, true);

        originalBtn.parentNode.insertBefore(aiBtn, originalBtn.nextSibling);
      }
    }
  }

  const observer = new MutationObserver(injectButton);
  observer.observe(document.body, { childList: true, subtree: true });
})();
