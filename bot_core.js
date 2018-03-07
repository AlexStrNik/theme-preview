const token = process.env.TOKEN?process.env.TOKEN:require('./token2').token;
const Telegraf = require('telegraf');
const bot = new Telegraf(token);
const fs = require('promise-fs');
const request = require(`request-promise`);
const maker = require("./preview-maker");

bot.context.downloadFile = async function (fileId) {
    const file = await bot.telegram.getFile(fileId);
    const fileContent = await request({
        encoding: null,
        uri: `http://api.telegram.org/file/bot${token}/${file.file_path}`,
    });

    return fileContent;
};

bot.command('start',async function (msg) {
    let chatId = msg.chat.id;
    if (!msg.message.text.slice('/start ').includes(` `)) {
        let id = msg.message.text.slice('/start '.length);
        try{
            const result = await request({
                uri: `https://snejugal.ru/attheme-editor/get-theme/?themeId=${id}`,
            });
            const { name, content } = JSON.parse(result);
            const previewBuffer = await maker.make_prev(chatId + msg.message.message_id, Buffer.from(content, `base64`));

            await msg.replyWithPhoto(
                {
                    source: previewBuffer,
                },
                {
                    reply_to_message_id: msg.message.message_id,
                    caption: `${name}\nCreated by @ThemePreviewBot`,
                },
            );
        }
        catch (e){
            console.error(e);
        }
    }
    else {
        msg.reply("Send me an .attheme file to create its preview")
    }
});

bot.command('help',function (msg) {
    msg.reply("Send me an .attheme file to create its preview")
});

bot.on('document', async function handler(msg) {
    try {
        const chatId = msg.chat.id;
        if (msg.message.document.file_name && msg.message.document.file_name.endsWith('.attheme')) {
            const themeBuffer = await msg.downloadFile(msg.message.document.file_id);
            const previewBuffer = await maker.make_prev(chatId + msg.message.document.file_id, themeBuffer);

            await msg.replyWithPhoto(
                {
                    source: previewBuffer,
                },
                {
                    reply_to_message_id: msg.message.message_id,
                    caption: 'Created by @ThemePreviewBot',
                },
            );
        }
    } catch (error) {
        if (error.name === `RequestError`) {
            process.nextTick(handler(msg));
        } else {
            throw error;
        }
    }
});
bot.startPolling();
