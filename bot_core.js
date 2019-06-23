const token = process.env.TOKEN ? process.env.TOKEN : require(`./token2`).token;
const Telegraf = require(`telegraf`);
const bot = new Telegraf(token);
const request = require(`request-promise`);
const render = require(`./render-pool`);
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

const handleStart = async (msg) => {
    const chatId = msg.chat.id;

    const id = msg.message.text.slice(`/start `.length).trim();

    console.log(id);

    if (id.length === 0 || id.includes(` `)) {
        msg.reply(`Send me an .attheme file to create its preview`);
    } else {
        const { name, theme } = await atthemeEditorApi.downloadTheme(id);
        const previewBuffer = await render({
            theme,
            name,
            template: `./new-preview.svg`,
        });
        const sendPreview = async () => {
            try {
                await msg.replyWithPhoto(
                    { source: previewBuffer },
                    { // eslint-disable-next-line camelcase
                        reply_to_message_id: msg.message.message_id,
                        caption: `${name}\nCreated by @ThemePreviewBot`,
                    },
                );
            } catch(error) {
                if (
                    error.name === `RequestError`
                    || error.name === `FetchError`
                ) {
                    process.nextTick(sendPreview);
                } else {
                    console.error(error);
                }
            }
        };

        sendPreview();
    }
};

bot.command(`start`, (context) => {
    handleStart(context);
});

bot.command(`help`, (msg) => {
    msg.reply(`Send me an .attheme file to create its preview`);
});

const handleDocument = async (msg) => {
    const chatId = msg.chat.id;

    if (
        msg.message.document.file_name &&
        msg.message.document.file_name.endsWith(`.attheme`)
    ) {
        const { message: { document } } = msg;
        const theme = await msg.downloadFile();
        const previewBuffer = await render({
            theme,
            name: msg.message.document.file_name.replace(`.attheme`,``),
            template: `./theme-preview.svg`,
        });

        const sendPreview = async () => {
            try {
                await msg.replyWithPhoto(
                    { source: previewBuffer },
                    { // eslint-disable-next-line camelcase
                        reply_to_message_id: msg.message.message_id,
                        caption: `Created by @ThemePreviewBot`,
                    },
                );
            } catch(error) {
                if (
                    error.name === `RequestError`
                    || error.name === `FetchError`
                ) {
                    process.nextTick(sendPreview);
                } else {
                    console.error(error);
                }
            }
        };

        sendPreview();
    }
};

bot.on(`document`, (context) => {
    handleDocument(context);
});

bot.polling.offset = -100;
bot.startPolling();
