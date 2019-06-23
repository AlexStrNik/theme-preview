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

const makePrev = async (themeBuffer, themeName, themeAuthor, template) => {
    let theme;

    if (themeBuffer instanceof Buffer) {
        theme = new Attheme(themeBuffer.toString(`binary`));
    } else {
        theme = themeBuffer;
    }

    const preview = parser.parseFromString(templates[template]);

    const inBubble = (
        theme[`chat_inBubble`]
        || defaultVariablesValues[`chat_inBubble`]
    );
    const outBubble = (
        theme[`chat_outBubble`]
        || defaultVariablesValues[`chat_outBubble`]
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
                .crop()
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
