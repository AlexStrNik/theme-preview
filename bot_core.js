const token = process.env.TOKEN ? process.env.TOKEN : require(`./token2`).token;
const Telegraf = require(`telegraf`);
const bot = new Telegraf(token);
const request = require(`request-promise`);
const render = require(`./render-pool`);
const atthemeEditorApi = require(`attheme-editor-api`);
const { REGULAR_TEMPLATE, NEW_TEMPLATE } = require(`./preview-maker`);

const RESEND_ON_ERRORS = [`RequestError`, `FetchError`];

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

const handleStart = async (context) => {
    const id = context.message.text.slice(`/start `.length).trim();

    if (id.length === 0) {
        await context.reply(`Send me an .attheme file to create its preview`);
        return;
    }
    const { name, theme } = await atthemeEditorApi.downloadTheme(id);
    const preview = await render({
        theme,
        name,
        template: NEW_TEMPLATE,
    });

    const sendPreview = async () => {
        try {
            await context.replyWithPhoto(
                { source: preview },
                { // eslint-disable-next-line camelcase
                    reply_to_message_id: context.message.message_id,
                    caption: `${name}\nCreated by @ThemePreviewBot`,
                },
            );
        } catch(error) {
            if (RESEND_ON_ERRORS.includes(error)) {
                process.nextTick(sendPreview);
            } else {
                console.error(error);
            }
        }
    };

    sendPreview();
};

const handleDocument = async (context) => {
    const fileName = context.message.document.file_name;

    if (fileName && fileName.endsWith(`.attheme`)) {
        const theme = await context.downloadFile();
        const preview = await render({
            theme,
            name: fileName.replace(`.attheme`,``),
            template: REGULAR_TEMPLATE,
        });

        const sendPreview = async () => {
            try {
                await context.replyWithPhoto(
                    { source: preview },
                    { // eslint-disable-next-line camelcase
                        reply_to_message_id: context.message.message_id,
                        caption: `Created by @ThemePreviewBot`,
                    },
                );
            } catch(error) {
                if (RESEND_ON_ERRORS.includes(error.name)) {
                    process.nextTick(sendPreview);
                } else {
                    console.error(error);
                }
            }
        };

        sendPreview();
    }
};

bot.start((context) => {
    handleStart(context);
});

bot.help((context) => {
    context.reply(`Send me an .attheme file to create its preview`);
});

bot.on(`document`, (context) => {
    handleDocument(context);
});

bot.polling.offset = -100;
bot.startPolling();
