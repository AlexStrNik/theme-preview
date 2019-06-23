const Attheme = require(`attheme-js`);
const fs = require(`promise-fs`);
const defaultVariablesValues = require(`attheme-default-values`).default;
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();
const Color = require(`./color`).color;

const WALLPAPERS_AMOUNT = 32;

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
    const q = get(node, key, `tspan`);
    const s = get(node, key, `stop`);

    return x.concat(y, z, d, e, f, q, s);
};

const fill = function(node,color) {
  if(node.tagName===`stop`){
      node.setAttribute(`stop-color`, `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`);
  }
  else{
      node.setAttribute(`fill`, `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`);
  }
  if(node.childNodes){
    for (let child in node.childNodes) {
      child = node.childNodes[child];
      if (child.setAttribute) {
        fill(child,color);
      }
    }
  }
};

const makePrev = async function (themeBuffer,themeName,themeAuthor,tempPath){
    let theme;
    if(themeBuffer instanceof Buffer){
        theme = new Attheme(themeBuffer.toString(`binary`));
    }
    else {
        theme = themeBuffer;
    }
    const preview = await readXml(tempPath);

    if(Color.brightness(theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`])
      > Color.brightness(theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`])){
      theme['chat_{in/out}Bubble__darkest'] = theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`];
    }
    else {
      theme['chat_{in/out}Bubble__darkest'] = theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`];
    }

    for (const variable in defaultVariablesValues) {
        if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
            continue;
        }

        const elements = getElementsByClassName(preview, variable);
        const color = theme[variable] || defaultVariablesValues[variable];

        elements.forEach((element) => {
            fill(element,color)
        });
    }

    if (!theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
        const randomWallpaper = Math.floor(Math.random() * WALLPAPERS_AMOUNT);
        const image = await fs.readFile(
          `./wallpapers/${randomWallpaper}.jpg`,
          `binary`,
        );

        theme[Attheme.IMAGE_KEY] = image;
    }

    const elements = getElementsByClassName(preview, 'IMG');
    const imgs = elements.map((element) => {
        return async ()=>{
            let CHAT_WIDTH = Number(element.getAttribute('width'));
            let CHAT_HEIGHT = Number(element.getAttribute('height'));
            let CONTAINER_RATIO = CHAT_HEIGHT / CHAT_WIDTH;

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

                element.setAttribute(`xlink:href`,`data:image/png;base64,`+croppedImage.toString(`base64`));
            }
        }
    });
    await  Promise.all(imgs.map((f)=>f()));

    let byi = themeName.search(/ [bB]y @?[a-zA-Z0-9]/);
    if(themeAuthor===""&&byi!==-1){
        themeAuthor = themeName.slice(byi);
        themeName = themeName.slice(0,byi);
    }

    getElementsByClassName(preview,`theme_name`).forEach((element)=>{
        element.textContent = themeName;
    });
    getElementsByClassName(preview,`theme_author`).forEach((element)=>{
        element.textContent = `${themeAuthor}`;
    });

    const previewBuffer = Buffer.from(serialize(preview), `binary`);
    const renderedPreview = await sharp(previewBuffer,{density: 150}).png()
        .toBuffer();
    return renderedPreview;
};

module.exports = {
    readXml,
    makePrev,
};
