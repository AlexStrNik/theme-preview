const token = process.env.TOKEN ? process.env.TOKEN : require(`./token2`).token;
const Telegraf = require(`telegraf`);
const bot = new Telegraf(token);
const request = require(`request-promise`);
const maker = require(`./preview-maker`);
const atthemeEditorApi = require(`attheme-editor-api`);

bot.context.downloadFile = async function (fileId) {
    if (!fileId) {
        fileId = this.message.document.file_id;
    }

    const file = await bot.telegram.getFile(fileId);
    const fileContent = await request({
        encoding: null,
        uri: `http://api.telegram.org/file/bot${token}/${file.file_path}`,
    });
    return fileContent;
};

bot.command(`start`, async (msg) => {
    const chatId = msg.chat.id;

    const id = msg.message.text.slice(`/start `.length).trim();

    console.log(id);

    if (id.length === 0 || id.includes(` `)) {
        msg.reply(`Send me an .attheme file to create its preview`);
    } else {
        try {
            const { name, theme } = await atthemeEditorApi.downloadTheme(id);
            console.log(name);
            console.log(theme);
            const previewBuffer = await maker.makePrev(
                theme,
                name,
                ``,
                `./test/new-preview.svg`
            );

            await msg.replyWithPhoto(
                { source: previewBuffer },
                { // eslint-disable-next-line camelcase
                    reply_to_message_id: msg.message.message_id,
                    caption: `${name}\nCreated by @ThemePreviewBot`,
                },
            );
        } catch (e) {
            console.error(e);
        }
    }
});

bot.command(`help`, (msg) => {
    msg.reply(`Send me an .attheme file to create its preview`);
});

bot.on(`document`, async function handler (msg) {
    try {
        const chatId = msg.chat.id;

        if (
            msg.message.document.file_name &&
            msg.message.document.file_name.endsWith(`.attheme`)
        ) {
            const { message: { document } } = msg;
            const themeBuffer = await msg.downloadFile();
            const previewBuffer = await maker.makePrev(
                themeBuffer,
                msg.message.document.file_name.replace(`.attheme`,``),
                ``,
                `./theme-preview.svg`
            );

            await msg.replyWithPhoto(
                { source: previewBuffer },
                { // eslint-disable-next-line camelcase
                    reply_to_message_id: msg.message.message_id,
                    caption: `Created by @ThemePreviewBot`,
                },
            );
        }
    } catch (error) {
        if (error.name === `RequestError`) {
            process.nextTick(handler(msg));
        } else {
            console.log(error);
        }
    }
});

bot.startPolling();