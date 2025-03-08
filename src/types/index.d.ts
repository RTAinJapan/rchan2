type Config = {
  /**
   * 操作対象のサーバID
   * @description サーバ名のところ右クリックしたらメニューが出てきて取得できる
   */
  guildId: string;
  /** 付与する権限のID */
  roleId: string;
  /**
   * DiscordのAPIトークン
   * @description Configに無ければ環境変数 NODE_ENV_DISCORD_TOKEN を使用する
   */
  discordToken: string;

  /** スプレッドシートのID */
  sheetId: string;
  /** シート名 */
  sheetTitle: string;
  /** カラム名 */
  columnTitle: string;
  /** Google API */
  googleApiKey: string;
  /** 権限のチェック間隔(ミリ秒) */
  checkInterval: number;
};
