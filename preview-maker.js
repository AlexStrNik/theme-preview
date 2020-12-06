const Attheme = require(`attheme-js`);
const fs = require(`fs`);
const defaultVariablesValues = require(`./attheme-default-values`).default;
const snejugalColor = require("@snejugal/color").rgbToHsl;
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();
const Color = require(`@snejugal/color`);

const RENDER_CONFIG = {
  density: 150,
};

const parser = new DOMParser();

const MINIMALISTIC_TEMPLATE = Symbol();
const REGULAR_TEMPLATE = Symbol();
const NEW_TEMPLATE = Symbol();

const templates = {
  [MINIMALISTIC_TEMPLATE]: fs.readFileSync(`./new-theme-preview.svg`, `utf8`),
  [REGULAR_TEMPLATE]: fs.readFileSync(`./theme-preview.svg`, `utf8`),
  [NEW_TEMPLATE]: fs.readFileSync(`./new-preview.svg`, `utf8`),
};

const WALLPAPERS_AMOUNT = 32;
const wallpapers = [];

for (let index = 0; index < WALLPAPERS_AMOUNT; index++) {
  const wallpaper = fs.readFileSync(`./wallpapers/${index}.jpg`, `binary`);

  wallpapers.push(wallpaper);
}

const get = (node, className, tag) =>
  Array.from(node.getElementsByTagName(tag)).filter(
    (element) =>
      element.getAttribute && element.getAttribute(`class`) === className
  );

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
function rgbToHsl(rgbArr) {
  const hsl = snejugalColor(rgbArr);
  const hslPreRound = {
    hue: hsl.hue,
    saturation: hsl.saturation * 100,
    lightness: hsl.lightness * 100,
    alpha: hsl.alpha,
  };
  const result = {
    hue: Math.round(hslPreRound.hue),
    saturation: Math.round(hslPreRound.saturation),
    lightness: Math.round(hslPreRound.lightness),
    alpha: hsl.alpha,
  };
  return result;
}
function findMostFrequentColors(colors) {
  var colorsQuantity = {};
  var max = 0;
  var accentHue;
  for (const colornow of colors) {
    if (colornow != 0) {
      if (colorsQuantity[colornow] == null) {
        colorsQuantity[colornow] = 0;
      }
      colorsQuantity[colornow] += 1;
      if (colorsQuantity[colornow] > max) {
        accentHue = colornow;
        max = colorsQuantity[colornow];
      }
    }
  }
  var colorsHue = [];
  for (colornow in colorsQuantity) {
    if (colorsQuantity[colornow] == max) {
      colorsHue.push(colornow);
    }
  }
  if (colorsHue.length > 1) {
    var minDifference = 360;
    for (var colorHue of colorsHue) {
      for (var hue of colorsHue) {
        if (hue != colorHue) {
          hue = Number(hue);
          colorHue = Number(colorHue);
          if (Math.abs(hue - colorHue) < minDifference) {
            minDifference = Math.abs(hue - colorHue);
            accentHue = (hue + colorHue) / 2;
          }
        }
      }
    }
  }
  return accentHue;
}
const fill = (node, color) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, color);
  } else {
    node.setAttribute(`fill`, color);
  }

  if (node.childNodes) {
    for (let child of Array.from(node.childNodes)) {
      if (child.setAttribute) {
        fill(child, color);
      }
    }
  }
};
const preFill = (node, color) => {
  if (color.hue == undefined) {
    fill(
      node,
      `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`
    );
  } else {
    fill(node, `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`);
  }
};
function rgbDifferent(color1, color2) {
  const result = Math.hypot(
    color1.red - color2.red,
    color1.green - color2.green,
    color1.blue - color2.blue
  );
  return result;
}
const makePrev = async (themeBuffer, themeName, themeAuthor, template) => {
  let theme, accentHue;

  if (themeBuffer instanceof Buffer) {
    theme = new Attheme(themeBuffer.toString(`binary`));
  } else {
    theme = themeBuffer;
  }

  const preview = parser.parseFromString(templates[template]);
  const avatars = [
    "avatar_backgroundRed",
    "avatar_backgroundOrange",
    "avatar_backgroundViolet",
    "avatar_backgroundGreen",
    "avatar_backgroundCyan",
    "avatar_backgroundBlue",
  ];
  const inBubble =
    theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`];
  const outBubble =
    theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`];
  if (Color.brightness(inBubble) > Color.brightness(outBubble)) {
    theme["chat_{in/out}Bubble__darkest"] = inBubble;
  } else {
    theme["chat_{in/out}Bubble__darkest"] = outBubble;
  }
  let colors = [];
  for (const variable in defaultVariablesValues) {
    if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
      continue;
    }
    const elements = getElementsByClassName(preview, variable);
    const color = theme[variable] || defaultVariablesValues[variable];
    for (const element of elements) {
      preFill(element, color);
    }
    const windowBackgroundWhite = rgbToHsl(
      theme["windowBackgroundWhite"] ||
        defaultVariablesValues["windowBackgroundWhite"]
    );
    const chooseHsl = rgbToHsl(color);
    if (
      Math.abs(chooseHsl.hue - windowBackgroundWhite.hue) > 6 &&
      chooseHsl.saturation > 8
    ) {
      colors.push(chooseHsl.hue);
    }
  }
  if (colors.length != 0) {
    accentHue = findMostFrequentColors(colors);
  } else {
    accentHue = rgbToHsl(
      theme["chats_actionBackground"] ||
        defaultVariablesValues["chats_actionBackground"]
    ).hue;
  }
  for (const outBubbleGradientelement of getElementsByClassName(
    preview,
    "chat_outBubbleGradient"
  )) {
    const color =
      theme[`chat_outBubbleGradient`] ||
      theme[`chat_outBubble`] ||
      defaultVariablesValues["chat_outBubble"];
    preFill(outBubbleGradientelement, color);
  }
  for (const PreviewBackLinear of getElementsByClassName(
    preview,
    "PreviewBackLinear"
  )) {
    const chatOutBubble =
      theme[`chat_outBubble`] || defaultVariablesValues["chat_outBubble"];
    preFill(PreviewBackLinear, {
      hue: rgbToHsl(theme[`chat_outBubbleGradient`] || chatOutBubble).hue,
      saturation: 100,
      lightness: 90,
    });
  }
  for (const PreviewBackLinearShadow of getElementsByClassName(
    preview,
    "PreviewBackLinearShadow"
  )) {
    preFill(PreviewBackLinearShadow, {
      hue: rgbToHsl(
        theme[`chat_outBubble`] || defaultVariablesValues["chat_outBubble"]
      ).hue,
      saturation: 100,
      lightness: 90,
    });
  }
  for (const PreviewBack of getElementsByClassName(preview, "PreviewBack")) {
    preFill(PreviewBack, { hue: accentHue, saturation: 100, lightness: 90 });
  }
  for (const ChatShadow of getElementsByClassName(preview, "ChatShadow")) {
    preFill(ChatShadow, { hue: accentHue, saturation: 100, lightness: 2 });
  }
  if (theme[`chat_outBubbleGradient`] != undefined) {
    for (const PreviewBack of getElementsByClassName(preview, "PreviewBack")) {
      preFill(PreviewBack, { red: 0, green: 0, blue: 0, alpha: 0 });
    }
  }
  for (const avatar of avatars) {
    const windowBackgroundWhite =
      theme["windowBackgroundWhite"] ||
      defaultVariablesValues["windowBackgroundWhite"];
    const avatarr = theme[avatar] || defaultVariablesValues[avatar];
    const avaAndBack = rgbDifferent(avatarr, windowBackgroundWhite);
    const avaTextColor =
      theme["avatar_text"] || defaultVariablesValues["avatar_text"];
    if (
      avaAndBack < 25 &&
      avaAndBack > rgbDifferent(avaTextColor, windowBackgroundWhite)
    ) {
      for (const ava of getElementsByClassName(preview, avatar)) {
        preFill(ava, avaTextColor);
      }
      for (const avashadow of getElementsByClassName(
        preview,
        `${avatar}Shadow`
      )) {
        const choose =
          theme["avatar_text"] || defaultVariablesValues["avatar_text"];
        let hslChoose = rgbToHsl(choose);
        hslChoose.lightness -= hslChoose.lightness - 20 < 5 ? -10 : 20;
        preFill(avashadow, hslChoose);
      }
    } else {
      for (const avashadow of getElementsByClassName(
        preview,
        `${avatar}Shadow`
      )) {
        const choose = theme[avatar] || defaultVariablesValues[avatar];
        const hslChoose = rgbToHsl(choose);
        hslChoose.lightness -= hslChoose.lightness - 20 < 5 ? -10 : 20;
        preFill(avashadow, hslChoose);
      }
    }
  }
  const chatInLoader =
    theme["chat_inLoader"] || defaultVariablesValues["chat_inLoader"];
  const chatInBubble =
    theme["chat_inBubble"] || defaultVariablesValues["chat_inBubble"];
  const chatOutLoader =
    theme["chat_outLoader"] || defaultVariablesValues["chat_outLoader"];
  const chatOutBubble =
    theme["chat_outBubble"] || defaultVariablesValues["chat_outBubble"];
  const inLoaderAndBubble = rgbDifferent(chatInLoader, chatInBubble);
  const outLoaderAndBubble = rgbDifferent(chatOutLoader, chatOutBubble);
  const chatInMediaIcon =
    theme["chat_inMediaIcon"] || defaultVariablesValues["chat_inMediaIcon"];
  const chatOutMediaIcon =
    theme["chat_outMediaIcon"] || defaultVariablesValues["chat_outMediaIcon"];
  if (
    inLoaderAndBubble < 25 &&
    inLoaderAndBubble > rgbDifferent(chatInMediaIcon, chatInBubble)
  ) {
    for (const chatInLoader of getElementsByClassName(
      preview,
      "chat_inLoader"
    )) {
      preFill(chatInLoader, chatInMediaIcon);
    }
  }
  if (
    outLoaderAndBubble < 25 &&
    outLoaderAndBubble > rgbDifferent(chatOutMediaIcon, chatOutBubble)
  ) {
    for (const chatOutLoader of getElementsByClassName(
      preview,
      "chat_outLoader"
    )) {
      preFill(chatOutLoader, chatOutMediaIcon);
    }
  }

  if (!theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
    const randomWallpaper = Math.floor(Math.random() * WALLPAPERS_AMOUNT);
    const image = wallpapers[randomWallpaper];

    theme[Attheme.IMAGE_KEY] = image;
  }

  const elements = getElementsByClassName(preview, "IMG");

  await Promise.all(
    elements.map(async (element) => {
      let chatWidth = Number(element.getAttribute("width"));
      let chatHeight = Number(element.getAttribute("height"));
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
          `data:image/png;base64,${croppedImage.toString(`base64`)}`
        );
      }
    })
  );

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
  }

  const templateBuffer = Buffer.from(serialize(preview), `binary`);

  return sharp(templateBuffer, RENDER_CONFIG).png().toBuffer();
};

module.exports = {
  MINIMALISTIC_TEMPLATE,
  REGULAR_TEMPLATE,
  NEW_TEMPLATE,
  makePrev,
};
