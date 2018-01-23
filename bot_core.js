const token = process.env.TOKEN;
const Telegraf = require('telegraf');
const TelegrafContext = require('./node_modules/telegraf/lib/core/context');
const bot = new Telegraf(token);
const fs = require('fs');
const request = require('request');
const request2 = require(`request-promise`);
const maker = require("./preview-maker");

//new update
TelegrafContext.prototype.downloadFile=function (file_id, dir) {
    let cr = this;
    return new Promise(function (run, err) {
        cr.telegram.getFile(file_id).then(function (filepath) {
            let file = fs.createWriteStream(dir+'/'+file_id+'.file');
            let response= request.get('http://api.telegram.org/file/bot'+token+'/'+filepath.file_path+'');
            response.pipe(file);
            file.on('finish', function() {
                file.close(function () {
                    run(dir + '/' + file_id + '.file');
                });
            });// close() is async, call cb after close completes.
        });
    });
};
bot.command('start',async function (msg) {
    let chatId = msg.chat.id;
    let now = new Date();
    now = now.getTime();
    if(msg.message.text.split('/start ').length===2){
        console.log('Send');
        let id = msg.message.text.split('/start ')[1];
        try{
            const result = await request2({
                uri: `https://snejugal.ru/attheme-editor/get-theme/?themeId=${id}`,
            });
            console.log(result);
            const { name, content } = JSON.parse(result);
            fs.writeFileSync('./'+chatId+now,Buffer.from(content, `base64`));
            maker.make_prev(chatId+now+msg.message.id,'./'+chatId+now).then(function (donepath) {
                msg.replyWithPhoto({source: donepath},{reply_to_message_id: msg.message.message_id,caption: name+'\nCreated by @ThemePreviewBot'}).then(
                    function (t) {
                        fs.unlink('./'+chatId+now);
                        fs.unlink(donepath);
                    }
                );
            })
        }
        catch (e){
            console.error(e);
        }
        finally {

        }
    }
    else {
        msg.reply("Send me an .attheme file to create its preview")
    }
});

bot.command('help',function (msg) {
    msg.reply("Send me an .attheme file to create its preview")
});

bot.on('message', function (msg) {
    let chatId = msg.chat.id;
    let now = new Date();
    now = now.getTime();
    if(msg.message.document&&(msg.message.document.file_name.endsWith('.attheme')||msg.message.document.file_name.endsWith('.xml'))){
        msg.downloadFile(msg.message.document.file_id, "./").then(function (path) {
            maker.make_prev(chatId+now+msg.message.document.file_id,path).then(function (donepath) {
                msg.replyWithPhoto({source: donepath},{reply_to_message_id: msg.message.message_id,caption: 'Created by @ThemePreviewBot'}).then(
                    function (t) {
                        fs.unlink(path);
                        fs.unlink(donepath);
                    }
                );
            })
        });
    }
});
bot.startPolling();
