const Attheme = require(`attheme-js`);
const fs = require(`fs`);
const defaultVariablesValues = require(`attheme-default-values`).default;
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();
const Color = require(`@snejugal/color`);

const RENDER_CONFIG = {
    density: 150,
};

const parser = new DOMParser();

const REGULAR_TEMPLATE = Symbol();
const NEW_TEMPLATE = Symbol();

const templates = {
    [REGULAR_TEMPLATE]: fs.readFileSync(`./theme-preview.svg`, `utf8`),
    [NEW_TEMPLATE]: fs.readFileSync(`./new-preview.svg`, `utf8`),
};

const WALLPAPERS_AMOUNT = 32;
const wallpapers = [];

for (let index = 0; index < WALLPAPERS_AMOUNT; index++) {
    const wallpaper = fs.readFileSync(
        `./wallpapers/${index}.jpg`,
        `binary`,
    );

    wallpapers.push(wallpaper);
}

const get = (node, className, tag) => Array.from(node.getElementsByTagName(tag))
    .filter((element) => (
        element.getAttribute
        && element.getAttribute(`class`) === className
    ));

const getElementsByClassName = (node, className) => [
    ...get(node, className, `rect`),
    ...get(node, className, `circle`),
    ...get(node, className, `path`),
    ...get(node, className, `g`),
    ...get(node, className, `polygon`),
    ...get(node, className, `image`),
    ...get(node, className, `tspan`),
    ...get(node, className, `stop`),
];

const fill = (node, color) => {
    const { red, green, blue, alpha } = color;
    const rgba = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;

    if (node.tagName === `stop`) {
        node.setAttribute(`stop-color`, rgba);
    } else {
        node.setAttribute(`fill`, rgba);
    }

    if (node.childNodes) {
        for (let child of Array.from(node.childNodes)) {
            if (child.setAttribute) {
                fill(child, color);
            }
        }
    }
};
const fillHSL = (node, hsl) => {
    if (node.tagName === `stop`) {
        node.setAttribute(`stop-color`, hsl);
    } else {
        node.setAttribute(`fill`, hsl);
    }

    if (node.childNodes) {
        for (let child of Array.from(node.childNodes)) {
            if (child.setAttribute) {
                fillHSL(child, color, l);
            }
        }
    }
};
function RGBToHSL(rgbArr){
    var r1 = rgbArr.red / 255;
    var g1 = rgbArr.green / 255;
    var b1 = rgbArr.blue / 255;
 
    var maxColor = Math.max(r1,g1,b1);
    var minColor = Math.min(r1,g1,b1);
    var L = (maxColor + minColor) / 2 ;
    var S = 0;
    var H = 0;
    if(maxColor != minColor){
        if(L < 0.5){
            S = (maxColor - minColor) / (maxColor + minColor);
        }else{
            S = (maxColor - minColor) / (2.0 - maxColor - minColor);
        }
        if(r1 == maxColor){
            H = (g1-b1) / (maxColor - minColor);
        }else if(g1 == maxColor){
            H = 2.0 + (b1 - r1) / (maxColor - minColor);
        }else{
            H = 4.0 + (r1 - g1) / (maxColor - minColor);
        }
    }
    L = L * 100;
    S = S * 100;
    H = H * 60;
    L = Math.round(L);
    S = Math.round(S);
    H = Math.round(H);
    if(H<0){
        H += 360;
    }
    var result = [H, S, L];
    return result;
}
const makePrev = async (themeBuffer, themeName, themeAuthor, template) => {
    let theme, acientColor;

    if (themeBuffer instanceof Buffer) {
        theme = new Attheme(themeBuffer.toString(`binary`));
    } else {
        theme = themeBuffer;
    }

    const preview = parser.parseFromString(templates[template]);

    const acientAtributs = ['chats_actionBackground',"chats_onlineCircle",'chats_nameMessage','chat_messagePanelBackground','chats_secretIcon','chat_messagePanelSend']
    const avatars = ["avatar_backgroundRed","avatar_backgroundOrange","avatar_backgroundViolet","avatar_backgroundGreen","avatar_backgroundCyan","avatar_backgroundBlue"]
    const inBubble = (
        theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`]
    );
    const outBubble = (
        theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`]
    );
    if (Color.brightness(inBubble) > Color.brightness(outBubble)) {
        theme['chat_{in/out}Bubble__darkest'] = inBubble;
    } else {
        theme['chat_{in/out}Bubble__darkest'] = outBubble;
    }
    for (const variable in defaultVariablesValues) {
        if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
            continue;
        }
        const elements = getElementsByClassName(preview, variable);
        const color = theme[variable] || defaultVariablesValues[variable];
        for (const element of elements) {
            fill(element, color);
        }
    }
    let array = []
    for (const acientAtribut of acientAtributs) {
        const colorChoose = theme[acientAtribut] || defaultVariablesValues[acientAtribut]
        if (RGBToHSL(colorChoose)[2] < 80, RGBToHSL(colorChoose)[2] > 20, RGBToHSL(colorChoose)[1] > 20) {
            const red = colorChoose.red
            const green = colorChoose.green
            const blue = colorChoose.blue
            array[array.length] = `${red},${green},${blue}`
        }
    }
    Object.defineProperty(Array.prototype, 'max', {
        value () {
            return Array.from(
                this.reduce((map, value) => map.set(value, map.has(value) ? map.get(value) + 1 : 1),new Map()).entries())
            .reduce((max, entry) => entry[1] > max[1] ? entry : max).reduce((item, count) => ({ item, count }))
        },
        configurable: true,
        writable: true
    })
    const arraySplit = array.max().item.split(',')
    acientColor = {red: parseInt(arraySplit[0]), green: parseInt(arraySplit[1]), blue: parseInt(arraySplit[2])}
    for (const outBubbleGradientelement of getElementsByClassName(preview, "chat_outBubbleGradient")) {const chat_outBubble = theme[`chat_outBubble`] || defaultVariablesValues['chat_outBubble'];fill(outBubbleGradientelement, theme[`chat_outBubbleGradient`] || chat_outBubble);}
    for (const PreviewBack of getElementsByClassName(preview, "PreviewBack")) {fillHSL(PreviewBack, `hsl(${RGBToHSL(acientColor)[0]}, ${RGBToHSL(acientColor)[1]}%, 90%)`);}
    for (const ChatShadow of getElementsByClassName(preview, "ChatShadow")) {fillHSL(ChatShadow, `hsl(${RGBToHSL(acientColor)[0]}, ${RGBToHSL(acientColor)[1]}%, 2%)`);}
    for (const avatar of avatars){
        const windowBackgroundWhite = theme['windowBackgroundWhite'] || defaultVariablesValues['windowBackgroundWhite']
        if (Math.abs(theme[avatar].red - windowBackgroundWhite.red) + Math.abs(theme[avatar].green - windowBackgroundWhite.green) + Math.abs(theme[avatar].blue - windowBackgroundWhite.blue) < 15){
            for (const ava of getElementsByClassName(preview, avatar)){
                fill(ava, theme['avatar_text'] || defaultVariablesValues['avatar_text'])};
                for (const avashadow of getElementsByClassName(preview, `${avatar}Shadow`)) {
                    const choose = theme['avatar_text'] || defaultVariablesValues['avatar_text'];
                    fillHSL(avashadow,`hsl(${RGBToHSL(choose)[0]}, ${RGBToHSL(choose)[1]}%, ${RGBToHSL(choose)[2] - 20}%)`)
                }
            } else {
                    for (const avashadow of getElementsByClassName(preview, `${avatar}Shadow`)) {
                        const choose = theme[avatar] || defaultVariablesValues[avatar];
                        fillHSL(avashadow,`hsl(${RGBToHSL(choose)[0]}, ${RGBToHSL(choose)[1]}%, ${RGBToHSL(choose)[2] - 20}%)`);
                    }
                }
            }
    const chat_inLoader = theme['chat_inLoader'] || defaultVariablesValues['chat_inLoader'];
    const chat_inBubble = theme['chat_inBubble'] || defaultVariablesValues['chat_inBubble'];
    const chat_outLoader = theme['chat_outLoader'] || defaultVariablesValues['chat_outLoader'];
    const chat_outBubble = theme['chat_outBubble'] || defaultVariablesValues['chat_outBubble'];
    if (Math.abs(chat_inLoader.red - chat_inBubble.red) + Math.abs(chat_inLoader.green - chat_inBubble.green) + Math.abs(chat_inLoader.blue - chat_inBubble.blue) < 15) {for (const chat_inLoader of getElementsByClassName(preview, 'chat_inLoader')) {fill(chat_inLoader, theme['chat_inMediaIcon'] || defaultVariablesValues['chat_inMediaIcon'])};};
    if (Math.abs(chat_outLoader.red - chat_outBubble.red) + Math.abs(chat_outLoader.green - chat_outBubble.green) + Math.abs(chat_outLoader.blue - chat_outBubble.blue) < 15) {for (const chat_outLoader of getElementsByClassName(preview, 'chat_outLoader')) {fill(chat_outLoader, theme['chat_outMediaIcon'] || defaultVariablesValues['chat_outMediaIcon'])};}
    if (!theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
        const randomWallpaper = Math.floor(Math.random() * WALLPAPERS_AMOUNT);
        const image = wallpapers[randomWallpaper];

        theme[Attheme.IMAGE_KEY] = image;
    }

    const elements = getElementsByClassName(preview, 'IMG');

    await Promise.all(elements.map(async (element) => {
        let chatWidth = Number(element.getAttribute('width'));
        let chatHeight = Number(element.getAttribute('height'));
        let ratio = chatHeight / chatWidth;

        if (theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
            const imageBuffer = Buffer.from(theme[Attheme.IMAGE_KEY], `binary`);

            const { width, height } = sizeOf(imageBuffer);
            const imageRatio = height / width;

            let finalHeight;
            let finalWidth;

            if (ratio > imageRatio) {
                finalHeight = chatHeight;
                finalWidth = Math.round(chatHeight / imageRatio);
            } else {
                finalWidth = chatWidth;
                finalHeight = Math.round(chatWidth * imageRatio);
            }

            const resizedImage = await sharp(imageBuffer)
                .resize(finalWidth, finalHeight)
                .png()
                .toBuffer();

            const croppedImage = await sharp(resizedImage)
                .resize(chatWidth, chatHeight)
                .png()
                .toBuffer();

            element.setAttribute(
                `xlink:href`,
                `data:image/png;base64,${croppedImage.toString(`base64`)}`,
            );
        }
    }));

    const authorIndex = themeName.search(/ [bB]y @?[a-zA-Z0-9]/);

    if (themeAuthor === "" && authorIndex !== -1) {
        themeAuthor = themeName.slice(authorIndex);
        themeName = themeName.slice(0, authorIndex);
    }

    for (const element of getElementsByClassName(preview, `theme_name`)) {
        element.textContent = themeName;
    }

    for (const element of getElementsByClassName(preview, `theme_author`)) {
        element.textContent = themeAuthor;
    };

    const templateBuffer = Buffer.from(serialize(preview), `binary`);

    return sharp(templateBuffer, RENDER_CONFIG).png().toBuffer();
};

module.exports = {
    REGULAR_TEMPLATE,
    NEW_TEMPLATE,
    makePrev,
};
