import { zipObject } from 'lodash';
import Discord from 'discord.js';
import configModule from 'config';
import { google } from 'googleapis';

const config: Config = configModule.util.toObject(configModule);
console.log(config);

const main = async () => {
  try {
    //  Discordのトークン取得
    const token = config.discordToken ? config.discordToken : process.env.NODE_ENV_DISCORD_TOKEN;
    if (!token) throw new Error('Discord認証トークンが指定されていません。');

    // Discordログイン
    /** DiscordのClientオブジェクト */
    const client = new Discord.Client();
    await client.login(token);
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
    }, config.checkInterval * 60 * 1000);
  } catch (error) {
    console.error('何かエラーがあった');
    console.error(error);
    process.exit();
  }
};

(() => {
  main();
})();

/**
 * Discordのメンバーに権限を付与する
 * @param client
 */
const checkAndAddRole = async (client: Discord.Client) => {
  console.log('処理開始');

  // 操作対象のサーバ取得
  const guild = await client.guilds.fetch(config.guildId);
  if (!guild) throw new Error('操作対象のサーバ情報を取得できません。');
  console.log(`サーバ名: ${guild.name}`);

  // 付与する権限の表示名を取得
  const role = guild.roles.cache.get(config.roleId);
  if (!role) throw new Error('操作対象のサーバに指定した権限が存在しません。');
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

  console.log('処理完了：' + new Date().toISOString());
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
  await guild.members.fetch();
  const guildFullMembers = guild.members.cache;

  // 全メンバーを確認したい時は以下のコメントアウトを外す;
  // console.log('メンバーは以下');
  // for (const member of guildFullMembers) {
  //   console.log(`"${member[1].user.id}", "${member[1].user.tag}"`);
  // }

  return guildFullMembers;
};

/**
 * DiscordIdに合致するメンバーに絞り込む
 * @param guildFullMembers メンバーリスト
 * @param sheetDiscordIds DiscordID(xxxx#1234形式)のリスト
 * @returns 絞り込み後のメンバーリスト
 */
const filterDiscordMembers = (guildFullMembers: Discord.Collection<string, Discord.GuildMember>, sheetDiscordIds: string[]) => {
  // 付与対象に絞り込み
  const targetMember = guildFullMembers.filter((member) => {
    return sheetDiscordIds.includes(member.user.tag);
  });

  // 操作対象として指定されているのにサーバにいない人をチェック
  const discordTags = guildFullMembers.map((mem) => mem.user.tag);
  for (const sheetDiscordId of sheetDiscordIds) {
    if (!discordTags.includes(sheetDiscordId)) console.log('いない：' + sheetDiscordId);
  }

  return targetMember;
};
