const token = require('./token2').token;
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const maker = require("./preview-maker");

let bot = new TelegramBot(token, {polling: true});

bot.on('message', function (msg) {
    let chatId = msg.chat.id;
    let now = new Date();
    now = now.getTime();
    if(msg.document){
        bot.downloadFile(msg.document.file_id, "./").then(function (path) {
            bot.sendMessage(chatId,"Making Preview...");
            maker.make_prev(chatId+now+msg.document.file_id,path).then(function (donepath) {
                bot.sendPhoto(chatId, donepath, {caption: 'Created by @ThemePreviewBot'}).then(
                    function (t) {
                        fs.unlink(path);
                        fs.unlink(donepath);
                        bot.sendMessage(chatId,"Done!!!");
                    }
                );
            })
        });
    }
});
