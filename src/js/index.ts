import { zipObject } from 'lodash';
import Discord, { ClientOptions, GatewayIntentBits } from 'discord.js';
import { google } from 'googleapis';

let config: Config;

/**
 * 環境変数から設定値を取得
 * @returns config
 */
const getConfig = (): Config => {
  const data: Config = {
    guildId: process.env.DISCORD_GUILD_ID as string,
    roleId: process.env.DISCORD_ROLE_ID as string,
    discordToken: process.env.DISCORD_TOKEN as string,
    sheetId: process.env.GOOGLE_SPREADSHEET_ID as string,
    sheetTitle: process.env.GOOGLE_SPREADSHEET_SHEETNAME as string,
    columnTitle: process.env.GOOGLE_SPREADSHEET_COLUMNNAME as string,
    googleApiKey: process.env.GOOGLE_APIKEY as string,
    checkInterval: Number(process.env.CHECK_INTERVAL ?? 10 * 60 * 1000),
  };

  if (!data.guildId) {
    throw new Error('The environment variable DISCORD_GUILD_ID is not specified.');
  }

  if (!data.roleId) {
    throw new Error('The environment variable DISCORD_ROLE_ID is not specified.');
  }

  if (!data.discordToken) {
    throw new Error('The environment variable DISCORD_TOKEN is not specified.');
  }

  if (!data.sheetId) {
    throw new Error('The environment variable GOOGLE_SPREADSHEET_ID is not specified.');
  }

  if (!data.sheetTitle) {
    throw new Error('The environment variable GOOGLE_SPREADSHEET_SHEETNAME is not specified.');
  }

  if (!data.columnTitle) {
    throw new Error('The environment variable GOOGLE_SPREADSHEET_COLUMNNAME is not specified.');
  }

  if (!data.googleApiKey) {
    throw new Error('The environment variable GOOGLE_APIKEY is not specified.');
  }

  return data;
};

const main = async () => {
  try {
    config = getConfig();

    // Discordログイン
    const discordoptions: ClientOptions = {
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, 1099511627776],
    };
    /** DiscordのClientオブジェクト */
    const client = new Discord.Client(discordoptions);
    await client.login(config.discordToken);
    if (!client.user) throw new Error('ログインに失敗しました。');

    // 何か裏でいろいろしてるので準備完了を待つ
    await (async () => {
      return new Promise<void>((resolve, reject) => {
        client.once('ready', () => {
          console.log('Discord Ready!');
          resolve();
        });
      });
    })();

    // 定期実行
    checkAndAddRole(client);
    setInterval(() => {
      checkAndAddRole(client);
    }, config.checkInterval);
  } catch (error) {
    console.error('何かエラーがあった');
    console.error(error);
    process.exit();
  }
};

/**
 * Discordのメンバーに権限を付与する
 * @param client
 */
const checkAndAddRole = async (client: Discord.Client) => {
  console.log('処理開始');

  // 操作対象のサーバ取得
  const guild = await client.guilds.fetch(config.guildId);
  if (!guild || !guild.name) throw new Error(`操作対象のサーバ情報を取得できません。guildID=${config.guildId}`);
  console.log(`サーバ名: ${guild.name}`);

  // 付与する権限の表示名を取得
  const role = guild.roles.cache.get(config.roleId);
  if (!role || !role.name) throw new Error(`操作対象のサーバに指定した権限が存在しません。roleID=${config.roleId}`);
  const roleName = role.name;
  console.log(`権限： ${roleName}`);

  const sheetMembers = await getSheetDiscordIds();
  const discordMembers = await fetchDiscordMembers(guild);
  const filtered = filterDiscordMembers(discordMembers, sheetMembers);

  /** role付与済みのメンバー */
  const roleMembers = role.members;

  console.log('=============================');

  console.log('role付与済みのメンバーが以下');
  const attachedIds: string[] = [];
  for (const member of roleMembers) {
    const id = member[1].user.id;
    attachedIds.push(id);
    console.log(`${id} ${member[1].user.tag}`);
  }

  console.log('=============================');

  console.log('新たに付与するメンバーが以下');
  // リストに合致したメンバーに権限付与
  for (const member of filtered) {
    const id = member[1].id;
    if (attachedIds.includes(id)) continue; // 付与済みならスキップ

    console.log(`付与： ${id} ${member[1].user.tag}`);
    await member[1].roles.add(role);
  }
  console.log('=============================');

  const now = new Date();
  console.log(`処理完了：${now.toString()}`);
  now.setMilliseconds(now.getMilliseconds() + config.checkInterval);
  console.log(`次回処理：${now.toString()}`);
};

/**
 * スプレッドシートからDiscordIDのリストを取得
 * @returns DiscordID(xxxx#1234形式)のリスト
 */
const getSheetDiscordIds = async (): Promise<string[]> => {
  const sheetsApi = google.sheets({ version: 'v4', auth: config.googleApiKey });
  console.log('スプレッドシート取得完了');

  const res = await sheetsApi.spreadsheets.values.batchGet({
    spreadsheetId: config.sheetId,
    // 取得対象のシート名
    ranges: [config.sheetTitle],
  });

  const sheetValues = res.data.valueRanges;
  if (!sheetValues) return [];

  const labelledValues = sheetValues.map((sheet) => {
    if (!sheet.values) {
      return;
    }
    const [labels, ...contents] = sheet.values;
    return contents.map((content) => zipObject(labels, content));
  });
  // console.log(labelledValues[0]);
  const discordIds = labelledValues[0]?.map((item) => item[config.columnTitle]).filter((item) => item) ?? [];

  console.log(`解説のDiscordID\n${JSON.stringify(discordIds, null, '  ')}`);
  return discordIds;
};

/**
 * サーバの全メンバーを取得する
 * @param guild サーバオブジェクト
 * @returns メンバーのリスト
 */
const fetchDiscordMembers = async (guild: Discord.Guild): Promise<Discord.Collection<string, Discord.GuildMember>> => {
  console.log('サーバの全メンバーを取得');
  await guild.members.fetch();
  const guildFullMembers = guild.members.cache;

  return guildFullMembers;
};

/**
 * DiscordIdに合致するメンバーに絞り込む
 * @param guildFullMembers メンバーリスト
 * @param sheetDiscordIds DiscordID(xxxx#1234形式)のリスト
 * @returns 絞り込み後のメンバーリスト
 */
const filterDiscordMembers = (guildFullMembers: Discord.Collection<string, Discord.GuildMember>, sheetDiscordIds: string[]) => {
  console.log('付与対象のメンバーに絞り込み');
  // 付与対象に絞り込み
  const targetMember = guildFullMembers.filter((member) => {
    // #0の入力有無を吸収
    return sheetDiscordIds.includes(member.user.tag) || sheetDiscordIds.includes(`${member.user.tag}#0`);
  });

  // 操作対象として指定されているのにサーバにいない人をチェック
  const discordTags = guildFullMembers.map((mem) => mem.user.tag);
  for (const sheetDiscordId of sheetDiscordIds) {
    if (!discordTags.includes(sheetDiscordId) && !discordTags.includes(`${sheetDiscordId.replace(/#0$/, '')}`)) console.log('いない：' + sheetDiscordId);
  }

  return targetMember;
};

(() => {
  main();
})();
