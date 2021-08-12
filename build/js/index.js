"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const discord_js_1 = tslib_1.__importDefault(require("discord.js"));
const config_1 = tslib_1.__importDefault(require("config"));
const googleapis_1 = require("googleapis");
const config = config_1.default.util.toObject(config_1.default);
console.log(config);
const main = async () => {
    try {
        //  Discordのトークン取得
        const token = config.discordToken ? config.discordToken : process.env.NODE_ENV_DISCORD_TOKEN;
        if (!token)
            throw new Error('Discord認証トークンが指定されていません。');
        // Discordログイン
        /** DiscordのClientオブジェクト */
        const client = new discord_js_1.default.Client();
        await client.login(token);
        if (!client.user)
            throw new Error('ログインに失敗しました。');
        // 何か裏でいろいろしてるので準備完了を待つ
        await (async () => {
            return new Promise((resolve, reject) => {
                client.once('ready', () => {
                    console.log('Ready!');
                    resolve();
                });
            });
        })();
        // 定期実行
        checkAndAddRole(client);
        setInterval(() => {
            checkAndAddRole(client);
        }, 30 * 60 * 1000);
    }
    catch (error) {
        console.error('何かエラーがあった');
        console.error(error);
        process.exit();
    }
};
(() => {
    main();
})();
const checkAndAddRole = async (client) => {
    console.log('処理開始');
    // 操作対象のサーバ取得
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild)
        throw new Error('操作対象のサーバ情報を取得できません。');
    console.log(`サーバ名: ${guild.name}`);
    // 付与する権限の表示名を取得
    const role = guild.roles.cache.get(config.roleId);
    if (!role)
        throw new Error('操作対象のサーバに指定した権限が存在しません。');
    const roleName = role.name;
    console.log(`権限： ${roleName}`);
    const sheetMembers = await getSheetDiscordIds();
    const discordMembers = await fetchDiscordMembers(guild);
    const filtered = filterDiscordMembers(discordMembers, sheetMembers);
    console.log('=============================');
    // リストに合致したメンバーに権限付与
    for (const member of filtered) {
        console.log(`付与： ${member[1].id} ${member[1].user.tag}`);
        await member[1].roles.add(role);
    }
    console.log('処理完了：' + new Date());
};
const getSheetDiscordIds = async () => {
    const sheetsApi = googleapis_1.google.sheets({ version: 'v4', auth: config.googleApiKey });
    console.log('ログイン完了');
    const res = await sheetsApi.spreadsheets.values.batchGet({
        spreadsheetId: config.sheetId,
        // 取得対象のシート名
        ranges: [config.sheetTitle],
    });
    const sheetValues = res.data.valueRanges;
    if (!sheetValues)
        return [];
    const labelledValues = sheetValues.map((sheet) => {
        if (!sheet.values) {
            return;
        }
        const [labels, ...contents] = sheet.values;
        return contents.map((content) => lodash_1.zipObject(labels, content));
    });
    // console.log(labelledValues[0]);
    const discordIds = labelledValues[0]?.map((item) => item['Discord ID']).filter((item) => item) ?? [];
    console.log(discordIds);
    return discordIds;
};
const fetchDiscordMembers = async (guild) => {
    // オフライン勢も含めてサーバの全メンバーを取得する
    await guild.members.fetch();
    const guildFullMembers = guild.members.cache;
    // 全メンバーを確認したい時は以下のコメントアウトを外す;
    // console.log('メンバーは以下');
    // for (const member of guildFullMembers) {
    //   console.log(`"${member[1].user.id}", "${member[1].user.tag}"`);
    // }
    return guildFullMembers;
};
const filterDiscordMembers = (guildFullMembers, sheetDiscordIds) => {
    // 付与対象に絞り込み
    const targetMember = guildFullMembers.filter((member) => {
        return sheetDiscordIds.includes(member.user.tag);
    });
    // 操作対象として指定されているのにサーバにいない人をチェック
    const discordTags = guildFullMembers.map((mem) => mem.user.tag);
    for (const sheetDiscordId of sheetDiscordIds) {
        if (!discordTags.includes(sheetDiscordId))
            console.warn('いない：' + sheetDiscordId);
    }
    return targetMember;
};
//# sourceMappingURL=index.js.map