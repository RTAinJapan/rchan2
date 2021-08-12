# Rちゃん

あるスプレッドシートに書いてあるDiscordID (hogehoge#1234)の一覧を元に、Discordサーバに入っている人に特定の権限を与える常駐型bot

## 下準備
1. Discord Developer Portalからアプリケーションを登録する
2. 常駐させたいDiscordサーバーにbotを追加する
3. Googleスプレッドシートを用意する(Google Formの回答シートなど)
4. Google APIのトークンを発行する

## config
`config/default.json`

```json
{
  "guildId": "サーバID",
  "roleId": "付与対象のロールID",
  "discordToken": "discord bot のトークン",
  "sheetId": "スプレッドシートのID",
  "sheetTitle": "シート名",
  "columnTitle": "DiscordIDが回答されているカラム名(1行目に入ってるであろう設問名)",
  "googleApiKey": "Google API",
  "checkInterval": チェック間隔(分)
}
```

## 実行
```
yarn start
```
