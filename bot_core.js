const token = process.env.TOKEN;

const Telegraf = require(`telegraf`);
const bot = new Telegraf(token);
const request = require(`request-promise`);
const render = require(`./render-pool`);
const atthemeEditorApi = require(`attheme-editor-api`);
const { MINIMALISTIC_TEMPLATE, REGULAR_TEMPLATE, NEW_TEMPLATE } = require(`./preview-maker`);
const RESEND_ON_ERRORS = [`RequestError`, `FetchError`];

bot.context.downloadFile = async function (fileId) {
    if (!fileId) {
        fileId = this.update.callback_query.message.reply_to_message.document.file_id;
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
const choose = async (context) => {
    const fileName = context.message.document.file_name;
    if (fileName && fileName.endsWith(`.attheme`)) {
        context.reply(
            'Select the style',{
                reply_markup:{
                    inline_keyboard:[[{
                        text:"Ordinary",
                        callback_data:"ordinary",
                        hide:false
                    },{
                        text:"Minimalistic",
                        callback_data:"minimalistic",
                        hide:false
                    }]]
                }, 
                reply_to_message_id: context.message.message_id
            }
            )
    }
}

const handleDocument = async (context) => {
    context.deleteMessage(context.update.callback_query.message.message_id)
    bot.telegram.sendChatAction(context.update.callback_query.message.chat.id, 'upload_photo')
    const fileName = context.update.callback_query.message.reply_to_message.document.file_name;
    const theme = await context.downloadFile();
    const sendPreview = async (preview) => {
        try {
            await context.replyWithPhoto(
                { source: preview },
                {
                    reply_to_message_id: context.update.callback_query.message.reply_to_message.message_id,
                    reply_markup:{
                        inline_keyboard:[[{
                            text: context.update.callback_query.data == 'ordinary' ? "Minimalistic" : "Ordinary",
                            callback_data: context.update.callback_query.data == 'ordinary' ? "minimalistic" : "ordinary",
                            hide:false
                        }]]
                    }, 
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
    if (context.update.callback_query.data == 'ordinary') {
        let preview = await render({
            theme,
            name: fileName.replace(`.attheme`,``),
            template: REGULAR_TEMPLATE,
        });
        sendPreview(preview);
    } else {
        let preview = await render({
            theme,
            name: fileName.replace(`.attheme`,``),
            template: MINIMALISTIC_TEMPLATE,
        });
        sendPreview(preview);
    }
};

bot.start((context) => {
    handleStart(context);
});

bot.help((context) => {
    context.reply(`Send me an .attheme file to create its preview`);
});

bot.on(`document`, (context) => {
    choose(context);
});

bot.action(['ordinary','minimalistic'], (context) => {handleDocument(context)})

bot.polling.offset = -100;
bot.startPolling();
