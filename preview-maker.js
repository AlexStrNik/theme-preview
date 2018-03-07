"use strict";

const attheme = require("attheme-js");
const fs = require("promise-fs");
const defaultVariablesValues = require("attheme-default-values");
const { DOMParser, XMLSerializer } = require('xmldom');
const sharp = require(`sharp`);
const svg2png = require('svg2png');
const { promisify } = require(`util`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();

const CONTAINER_RATIO = 720 / 480;
const PREVIEW_WIDTH = 480 * 2;
const PREVIEW_HEIGHT = 782;

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
        const elements = getElementsByClassName(preview, variable);
        const { red, green, blue, alpha } = theme[variable] || defaultVariablesValues[variable];

        elements.forEach((element) => {
            element.setAttribute(
                `fill`,
                `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`,
            );
        });
    }

    if (theme[attheme.IMAGE_KEY]) {
        // using svg2png until we make sharp work with images
        const imageBuffer = Buffer.from(theme[attheme.IMAGE_KEY], `binary`);

        const { width, height } = sizeOf(imageBuffer);
        const imageRatio = height / width;

        let finalHeight;
        let finalWidth;

        if (CONTAINER_RATIO > imageRatio) {
            finalHeight = 720;
            finalWidth = 720 / imageRatio;
        } else {
            finalWidth = 480;
            finalHeight = 480 * imageRatio;
        }


        const encodedImage = Buffer.from(theme[attheme.IMAGE_KEY], `binary`).toString(`base64`);
        const [colorWallpaper] = getElementsByClassName(preview, `chat_wallpaper`);
        const [imageWallpaper] = getElementsByClassName(preview, `IMG`);

        colorWallpaper.setAttribute(`fill`, `rgba(0, 0, 0, 0)`);

        imageWallpaper.setAttribute('xlink:href', `data:image/jpg;base64,${encodedImage}`);
        imageWallpaper.setAttribute('width', finalWidth);
        imageWallpaper.setAttribute('height', finalHeight);
        imageWallpaper.setAttribute('y', 62 - (finalHeight - 720) / 2);
        imageWallpaper.setAttribute('x', -(finalWidth - 480) / 2);

        const previewBuffer = Buffer.from(serialize(preview), `binary`);
        const renderedPreview = await svg2png(previewBuffer);

        return renderedPreview;
    }

    const previewBuffer = Buffer.from(serialize(preview), `binary`);
    const renderedPreview = await sharp(previewBuffer).png().toBuffer();

    fs.writeFile(`./test.png`, renderedPreview);

    return renderedPreview;
}

module.exports={
    read_xml,
    create_attheme,
    make_prev,
};