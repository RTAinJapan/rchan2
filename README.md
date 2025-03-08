# Rちゃん2号

あるスプレッドシートに書いてあるDiscordID (hogehoge#1234)の一覧を元に、Discordサーバに入っている人に特定の権限を与える常駐型bot

## 下準備
1. Discord Developer Portalからアプリケーションを登録する
2. 常駐させたいDiscordサーバーにbotを追加する
3. Googleスプレッドシートを用意する(Google Formの回答シートなど)
4. Google APIのトークンを発行する

## Config
- 環境変数に以下を指定
  - .envではクオートで括る

```
DISCORD_GUILD_ID=サーバID
DISCORD_ROLE_ID=付与対象のロールID
DISCORD_TOKEN=Discord bot のトークン
GOOGLE_SPREADSHEET_ID=スプレッドシートのID
GOOGLE_SPREADSHEET_SHEETNAME=シート名
GOOGLE_SPREADSHEET_COLUMNNAME=DiscordIDが回答されているカラム名(1行目に入ってるであろう設問名)
GOOGLE_APIKEY=Google API
CHECK_INTERVAL=チェック間隔(ミリ秒)
```

## 実行
- 環境変数設定済みの場合

```bash
npm run start
```

- .envから環境変数を読み込んで実行する場合

```bash
npx dotenv -- npm run start
```
