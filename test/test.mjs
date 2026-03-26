import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

console.time("LLMprocessing")

const FormattedMail = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  details: z.string(),
});

const response = await ollama.chat({
  model: 'qwen3.5:0.8b',
  messages: [{
    role: 'user',
    content: `
      以下のメール内容から、Googleカレンダー用の情報をJSONで抽出してください。
  現在時刻: 2026/3/26 17:43:05

  【件名】: 次回の会議日程
  【本文】: 鈴木様


お世話になっております．
田中です．


次回のミーティングは4/10の12:00-13:00でお願いします．
田中

  出力は以下のJSONフォーマットのみとし、解説は不要です。
  {
    "title": "予定タイトル",
    "start": "YYYYMMDDTHHMMSS", 
    "end": "YYYYMMDDTHHMMSS",
    "details": "予定の説明（メールの要約と、必要に応じて場所やWeb会議URLを含める）"
  }
  ※不明な場合は現在時刻の1時間後をセットしてください。
    `
  }],
  format: zodToJsonSchema(FormattedMail),
  // format: "json",
  think: false,
});
console.log(response.message.content);
// const formattedmail = FormattedMail.parse(JSON.parse(response.message.content))
// console.log(formattedmail)
console.timeEnd("LLMprocessing")
