

const Attheme = require(`attheme-js`);
const fs = require(`promise-fs`);
const defaultVariablesValues = require(`Attheme-default-values`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();

const CHAT_WIDTH = 480;
const CHAT_HEIGHT = 660;
const CONTAINER_RATIO = CHAT_HEIGHT / CHAT_WIDTH;
const PREVIEW_WIDTH = CHAT_WIDTH * 2;
const PREVIEW_HEIGHT = 782;

const readXml = async function (path) {
    const contents = await fs.readFile(path, `utf8`);

    return new DOMParser().parseFromString(contents);
};

const get = function (node, key, r) {
    const x = [];
    const e = node.getElementsByTagName(r);

    for (const h in e) {
        if (e[h].getAttribute) {
            if (e[h].getAttribute(`class`) === key) {
                x.push(e[h]);
            }
        }
    }

    return x;
};

const getElementsByClassName = function (node, key) {
    const x = get(node, key, `rect`);
    const y = get(node, key, `circle`);
    const z = get(node, key, `path`);
    const d = get(node, key, `g`);
    const e = get(node, key, `polygon`);
    const f = get(node, key, `image`);

    return x.concat(y, z, d, e, f);
};

const makePrev = async function (sesId, themeBuffer) {
    const theme = new Attheme(themeBuffer.toString(`binary`));
    const preview = await readXml(`./theme-preview.svg`);

    for (const variable in defaultVariablesValues) {
        if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
            continue;
        }

        const elements = getElementsByClassName(preview, variable);
        const color = theme[variable] || defaultVariablesValues[variable];
        const { red, green, blue, alpha } = color;

        elements.forEach((element) => {
            element.setAttribute(
                `fill`,
                `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`,
            );
        });
    }

    if (theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
        const previewBuffer = Buffer.from(serialize(preview), `binary`);
        const renderedPreview = await sharp(previewBuffer).png()
            .toBuffer();

        const imageBuffer = Buffer.from(theme[Attheme.IMAGE_KEY], `binary`);

        const { width, height } = sizeOf(imageBuffer);
        const imageRatio = height / width;

        let finalHeight;
        let finalWidth;

        if (CONTAINER_RATIO > imageRatio) {
            finalHeight = CHAT_HEIGHT;
            finalWidth = Math.round(CHAT_HEIGHT / imageRatio);
        } else {
            finalWidth = CHAT_WIDTH;
            finalHeight = Math.round(CHAT_WIDTH * imageRatio);
        }

        const resizedImage = await sharp(imageBuffer)
            .resize(finalWidth, finalHeight)
            .png()
            .toBuffer();

        const croppedImage = await sharp(resizedImage)
            .resize(CHAT_WIDTH, CHAT_HEIGHT)
            .crop()
            .png()
            .toBuffer();

        const backdrop = await sharp({
            create: {
                width: PREVIEW_WIDTH,
                height: PREVIEW_HEIGHT,
                channels: 3,
                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 255,
                },
            },
        })
            .overlayWith(croppedImage, {
                top: 122,
                left: 480,
            })
            .png()
            .toBuffer();

        const overlayed = await sharp(backdrop)
            .overlayWith(renderedPreview, {
                top: 0,
                left: 0,
            })
            .png()
            .toBuffer();

        return overlayed;
    }

    const previewBuffer = Buffer.from(serialize(preview), `binary`);
    const renderedPreview = await sharp(previewBuffer).png()
        .toBuffer();

    return renderedPreview;
};

module.exports = {
    readXml,
    makePrev,
};