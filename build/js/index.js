"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const discord_js_1 = __importDefault(require("discord.js"));
const config_1 = __importDefault(require("config"));
const googleapis_1 = require("googleapis");
const config = config_1.default.util.toObject(config_1.default);
console.log(config);
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //  Discordのトークン取得
        const token = config.discordToken ? config.discordToken : process.env.NODE_ENV_DISCORD_TOKEN;
        if (!token)
            throw new Error('Discord認証トークンが指定されていません。');
        // Discordログイン
        /** DiscordのClientオブジェクト */
        const client = new discord_js_1.default.Client();
        yield client.login(token);
        if (!client.user)
            throw new Error('ログインに失敗しました。');
        // 何か裏でいろいろしてるので準備完了を待つ
        yield (() => __awaiter(void 0, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                client.once('ready', () => {
                    console.log('Ready!');
                    resolve();
                });
            });
        }))();
        // 定期実行
        checkAndAddRole(client);
        setInterval(() => {
            checkAndAddRole(client);
        }, config.checkInterval * 60 * 1000);
    }
    catch (error) {
        console.error('何かエラーがあった');
        console.error(error);
        process.exit();
    }
});
(() => {
    main();
})();
/**
 * Discordのメンバーに権限を付与する
 * @param client
 */
const checkAndAddRole = (client) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('処理開始');
    // 操作対象のサーバ取得
    const guild = yield client.guilds.fetch(config.guildId);
    if (!guild)
        throw new Error('操作対象のサーバ情報を取得できません。');
    console.log(`サーバ名: ${guild.name}`);
    // 付与する権限の表示名を取得
    const role = guild.roles.cache.get(config.roleId);
    if (!role)
        throw new Error('操作対象のサーバに指定した権限が存在しません。');
    const roleName = role.name;
    console.log(`権限： ${roleName}`);
    const sheetMembers = yield getSheetDiscordIds();
    const discordMembers = yield fetchDiscordMembers(guild);
    const filtered = filterDiscordMembers(discordMembers, sheetMembers);
    /** role付与済みのメンバー */
    const roleMembers = role.members;
    console.log('=============================');
    console.log('role付与済みのメンバーが以下');
    const attachedIds = [];
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
        if (attachedIds.includes(id))
            continue; // 付与済みならスキップ
        console.log(`付与： ${id} ${member[1].user.tag}`);
        yield member[1].roles.add(role);
    }
    console.log('=============================');
    console.log('処理完了：' + new Date().toISOString());
});
/**
 * スプレッドシートからDiscordIDのリストを取得
 * @returns DiscordID(xxxx#1234形式)のリスト
 */
const getSheetDiscordIds = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const sheetsApi = googleapis_1.google.sheets({ version: 'v4', auth: config.googleApiKey });
    console.log('ログイン完了');
    const res = yield sheetsApi.spreadsheets.values.batchGet({
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
    const discordIds = (_b = (_a = labelledValues[0]) === null || _a === void 0 ? void 0 : _a.map((item) => item[config.columnTitle]).filter((item) => item)) !== null && _b !== void 0 ? _b : [];
    console.log(`解説のDiscordID\n${JSON.stringify(discordIds, null, '  ')}`);
    return discordIds;
});
/**
 * サーバの全メンバーを取得する
 * @param guild サーバオブジェクト
 * @returns メンバーのリスト
 */
const fetchDiscordMembers = (guild) => __awaiter(void 0, void 0, void 0, function* () {
    yield guild.members.fetch();
    const guildFullMembers = guild.members.cache;
    // 全メンバーを確認したい時は以下のコメントアウトを外す;
    // console.log('メンバーは以下');
    // for (const member of guildFullMembers) {
    //   console.log(`"${member[1].user.id}", "${member[1].user.tag}"`);
    // }
    return guildFullMembers;
});
/**
 * DiscordIdに合致するメンバーに絞り込む
 * @param guildFullMembers メンバーリスト
 * @param sheetDiscordIds DiscordID(xxxx#1234形式)のリスト
 * @returns 絞り込み後のメンバーリスト
 */
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