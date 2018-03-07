"use strict";

const attheme = require("attheme-js");
const fs = require("promise-fs");
const defaultVariablesValues = require("attheme-default-values");
const { DOMParser, XMLSerializer } = require('xmldom');
const sharp = require(`sharp`);
const { promisify } = require(`util`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();

const CONTAINER_RATIO = 720 / 480;
const PREVIEW_WIDTH = 480 * 2;
const PREVIEW_HEIGHT = 782;
const CHAT_WIDTH = 480;
const CHAT_HEIGHT = 660;

async function create_attheme(path) {
    const contents = await fs.readFile(path, `binary`);

    return new attheme(contents, defaultVariablesValues);
}

async function read_xml(path) {
    const contents = await fs.readFile(path, 'utf8');

    return new DOMParser().parseFromString(contents);
}

function get(node, key,r) {
    let x = [];
    let e = node.getElementsByTagName(r);
    for (let h in e){
        if(e[h].getAttribute){
            if(e[h].getAttribute('class')===key){
                x.push(e[h])
            }
        }
    }
    return x;
}
function getElementsByClassName(node, key) {
    let x = get(node,key,'rect');
    let y = get(node,key,'circle');
    let z = get(node,key,'path');
    let d = get(node,key,'g');
    let e = get(node,key,'polygon');
    let f = get(node,key,'image');
    return x.concat(y, z, d, e, f);
}

async function make_prev(sesId, themeBuffer) {
    const theme = new attheme(themeBuffer.toString(`binary`));
    const preview = await read_xml(`./theme-preview.svg`);

    for (const variable in defaultVariablesValues) {
        if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
            continue;
        }

        const elements = getElementsByClassName(preview, variable);
        const { red, green, blue, alpha } = theme[variable] || defaultVariablesValues[variable];

        elements.forEach((element) => {
            element.setAttribute(
                `fill`,
                `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`,
            );
        });
    }

    if (theme[attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
        const previewBuffer = Buffer.from(serialize(preview), `binary`);
        const renderedPreview = await sharp(previewBuffer).png().toBuffer();

        const imageBuffer = Buffer.from(theme[attheme.IMAGE_KEY], `binary`);

        const { width, height } = sizeOf(imageBuffer);
        const imageRatio = height / width;

        let finalHeight;
        let finalWidth;

        if (CONTAINER_RATIO > imageRatio) {
            finalHeight = 720;
            finalWidth = Math.round(720 / imageRatio);
        } else {
            finalWidth = 480;
            finalHeight = Math.round(480 * imageRatio);
        }

        const topOffset = Math.round(62 - (finalHeight - 720) / 2);
        const leftOffset = Math.round(PREVIEW_WIDTH - finalWidth / 2);

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
    const renderedPreview = await sharp(previewBuffer).png().toBuffer();

    return renderedPreview;
}

module.exports={
    read_xml,
    create_attheme,
    make_prev,
};