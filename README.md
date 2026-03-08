# gmail-llm-gcal
gmailのメールからgoogle カレンダーの予定を自動作成する

# 環境
- chrome
- ollama or google account

# setup
拡張機能をインストールする．

## gemini を使う
1. gemini の APIキーを取得する
2. chrome://extensions/ から `gmail-llm-gcal` の `詳細` > `拡張機能のオプション` で使用するAPIキーとモデルを入力する．

## ollama を使う
1. ollama のサーバーをたてる
2. chrome://extensions/ から `gmail-llm-gcal` の `詳細` > `拡張機能のオプション` で使用するサーバーのURLとモデルを入力する．

# 使い方
1. gmail を開く．
2. chrome の右上の拡張機能欄から gmail-llm-gcal のボタンをクリックし，`✨予定を生成` をクリックする．
3. 自動的に画面が遷移し，google カレンダーの予定作成欄が表示されるので，追加事項を記入し，予定を作成する．
