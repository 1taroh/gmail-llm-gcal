(function() {
  console.log("gmail-llm-gcal: Monitoring Gmail UI...");

  let isAiMode = false;
  const originalOpen = window.open;

  // URLインターセプト
  window.open = function(url, target, specs) {
    if (isAiMode && url && url.includes("calendar.google.com/calendar")) {
      isAiMode = false;
      const params = new URLSearchParams(new URL(url).search);
      console.log("🚀 [Captured]:", {
        title: params.get('text'),
        body: params.get('details')
      });
      alert("AI解析準備完了。コンソールを確認してください。");
      return null; // 解析のために一旦開くのを止める（開発用）
    }
    return originalOpen.apply(this, arguments);
  };

  function injectAiButton() {
    // Gmailの「三点リーダー」メニューは role="menu" を持つ
    const menus = document.querySelectorAll('div[role="menu"]');
    
    menus.forEach(menu => {
      if (menu.querySelector('#ai-gcal-btn')) return; // 既に挿入済みならスキップ

      const menuItems = Array.from(menu.querySelectorAll('div[role="menuitem"]'));
      const originalBtn = menuItems.find(el => el.innerText.includes('予定を作成'));

      if (originalBtn) {
        // 1. ボタンを複製
        const aiBtn = originalBtn.cloneNode(true);
        aiBtn.id = 'ai-gcal-btn';

        // 2. テキスト要素だけを探して書き換え（重なり防止）
        // Gmailのメニューテキストは通常このクラスに入っている
        const textElement = aiBtn.querySelector('.J-N-JX');
        if (textElement) {
          textElement.innerText = '✨ AIで予定を生成';
        } else {
          aiBtn.innerText = '✨ AIで予定を生成';
        }

        // 3. クリックイベント（バブリングを止めてAIモードをONに）
        aiBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          isAiMode = true;
          console.log("AI Mode: Intercepting next GCal URL...");
          originalBtn.click();
        }, true);

        // 4. 標準ボタンのすぐ下に挿入
        originalBtn.parentNode.insertBefore(aiBtn, originalBtn.nextSibling);
      }
    });
  }

  // 監視対象を document.body 全体にし、頻度を最適化
  const observer = new MutationObserver((mutations) => {
    // 変化があったときだけ実行
    for (let mutation of mutations) {
      if (mutation.addedNodes.length) {
        injectAiButton();
        break;
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
