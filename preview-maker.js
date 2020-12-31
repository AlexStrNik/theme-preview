const Attheme = require(`attheme-js`);
const { TdesktopTheme } = require(`tdesktop-theme/node`);
const fs = require(`fs`);
const defaultVariablesValues = require(`./attheme-default-values`).default;
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const sizeOf = require(`image-size`);
const { serializeToString: serialize } = new XMLSerializer();
const Color = require(`@snejugal/color`);
const rgbToHsl = Color.rgbToHsl;
const puppeteer = require(`puppeteer`);

const browser = puppeteer.launch();

const variablesList = {
  dialogsBg: {
    historyPeer1UserpicBg: `historyPeerUserpicFg`,
    historyPeer2UserpicBg: `historyPeerUserpicFg`,
    historyPeer3UserpicBg: `historyPeerUserpicFg`,
    historyPeer4UserpicBg: `historyPeerUserpicFg`,
    historyPeer5UserpicBg: `historyPeerUserpicFg`,
    historyPeer6UserpicBg: `historyPeerUserpicFg`,
    historyPeer7UserpicBg: `historyPeerUserpicFg`,
    historyPeerSavedMessagesBg: `historyPeerUserpicFg`,
    dialogsUnreadBgMuted: `dialogsUnreadFg`,
    dialogsUnreadBg: `dialogsUnreadFg`,
  },
  titleBg: {
    titleButtonCloseBg: `titleButtonCloseFg`,
    titleButtonBg: `titleButtonFg`,
  },
  msgInBg: {
    msgFileInBg: `historyFileInIconFg`,
  },
  msgOutBg: {
    msgFileOutBg: `historyFileOutIconFg`,
  },
};
const userPicList = [
  `historyPeerSavedMessagesBg`,
  `historyPeer1UserpicBg`,
  `historyPeer2UserpicBg`,
  `historyPeer3UserpicBg`,
  `historyPeer4UserpicBg`,
  `historyPeer5UserpicBg`,
  `historyPeer6UserpicBg`,
  `historyPeer7UserpicBg`,
];

const RENDER_CONFIG = {
  density: 150,
};
const parser = new DOMParser();

const MINIMALISTIC_TEMPLATE = Symbol();
const REGULAR_TEMPLATE = Symbol();
const NEW_TEMPLATE = Symbol();
const DESKTOP_TEMPLATE = Symbol();

const templates = {
  [MINIMALISTIC_TEMPLATE]: fs.readFileSync(`./new-theme-preview.svg`, `utf8`),
  [REGULAR_TEMPLATE]: fs.readFileSync(`./theme-preview.svg`, `utf8`),
  [NEW_TEMPLATE]: fs.readFileSync(`./new-preview.svg`, `utf8`),
  [DESKTOP_TEMPLATE]: fs.readFileSync(`./tdesktop-preview.svg`, `utf8`),
};
const defaultThemeBuffer = fs.readFileSync(`./classic.tdesktop-theme`);
const defaultTheme = new TdesktopTheme(defaultThemeBuffer);

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
  ...get(node, className, `ellipse`),
];

const addWallpaper = async (elements, wallpaper) => {
  const result = await Promise.all(
    elements.map(async (element) => {
      let chatWidth = Number(element.getAttribute(`width`));
      let chatHeight = Number(element.getAttribute(`height`));
      let ratio = chatHeight / chatWidth;
      const imageBuffer = Buffer.from(wallpaper, `binary`);

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
    })
  );
  return result;
};

function calculateAccentColor(colors) {
  let colorsQuantity = new Map();
  let max = 0;
  let accentHue;

  for (const color of colors) {
    colorsQuantity.set(color, (colorsQuantity.get(color) ?? 0) + 1);

    if (colorsQuantity.get(color) > max) {
      accentHue = color;
      max = colorsQuantity.get(color);
    }
  }
  const colorsHue = colors.filter((color) => colorsQuantity.get(color) == max);
  colorsHue.sort((a, b) => a - b);

  if (colorsHue.length > 1) {
    let minDifference = 360;
    for (let i = 0; i < colorsHue.length - 1; i++) {
      const outerHue = colorsHue[i];
      const innerHue = colorsHue[i + 1];
      if (Math.abs(outerHue - innerHue) < minDifference) {
        minDifference = Math.abs(outerHue - innerHue);
        accentHue = (outerHue + innerHue) / 2;
      }
    }
  }

  return accentHue;
}
const rgbDifference = (color1, color2) => {
  const result = Math.hypot(
    color1.red - color2.red,
    color1.green - color2.green,
    color1.blue - color2.blue
  );
  return result;
};
const fill = (rootNode, color) => {
  const cssColor =
    `red` in color
      ? `rgba(${color.red}, ${color.green}, ${color.blue}, ${
          color.alpha / 255
        })`
      : `hsl(${color.hue}, ${color.saturation * 100}%, ${
          color.lightness * 100
        }%)`;

  const innerFill = (node) => {
    if (node.tagName === `stop`) {
      node.setAttribute(`stop-color`, cssColor);
    } else {
      node.setAttribute(`fill`, cssColor);
    }

    if (node.childNodes) {
      for (let child of Array.from(node.childNodes)) {
        if (child.setAttribute) {
          innerFill(child, cssColor);
        }
      }
    }
  };

  innerFill(rootNode);
};

const makePrevDesktop = async (themeBuffer) => {
  const originalTheme = new TdesktopTheme(themeBuffer);
  const theme = originalTheme.fallbackTo(defaultTheme);
  originalTheme.free();

  const preview = parser.parseFromString(templates[DESKTOP_TEMPLATE]);
  const variables = theme.variables();

  let colors = [];
  const dialogsBg = rgbToHsl(theme.resolveVariable(`dialogsBg`));
  for (const variable of variables) {
    const elements = getElementsByClassName(preview, variable);
    const color = theme.resolveVariable(variable);
    for (const element of elements) {
      fill(element, color);
    }
    const chooseHsl = rgbToHsl(color);
    let hueDifference = Math.abs(chooseHsl.hue - rgbToHsl(dialogsBg).hue);
    if (hueDifference > 180) {
      hueDifference = 360 - hueDifference;
    }
    let saturationDifference = Math.abs(
      chooseHsl.saturation - dialogsBg.saturation
    );
    if (
      hueDifference > 2 &&
      chooseHsl.saturation > 0.04 &&
      saturationDifference > 0.02
    ) {
      colors.push(Math.round(chooseHsl.hue));
    }
  }

  let accentHue;
  if (colors.length > 0) {
    accentHue = calculateAccentColor(colors);
  } else {
    accentHue = rgbToHsl(theme.resolveVariable(`windowActiveTextFg`)).hue;
  }

  for (const previewBack of getElementsByClassName(preview, `PreviewBack`)) {
    fill(previewBack, { hue: accentHue, saturation: 1, lightness: 0.9 });
  }
  for (const previewShadow of getElementsByClassName(
    preview,
    `PreviewShadow`
  )) {
    fill(previewShadow, { hue: accentHue, saturation: 1, lightness: 0.02 });
  }

  for (let background in variablesList) {
    for (let elementName in variablesList[background]) {
      const backgroundColor = theme.resolveVariable(background);
      const elementColor = theme.resolveVariable(elementName);
      const elementInnerColor = theme.resolveVariable(
        variablesList[background][elementName]
      );

      const difference = rgbDifference(backgroundColor, elementColor);
      const differenceInner = rgbDifference(backgroundColor, elementInnerColor);

      if (
        (difference < 25 && differenceInner > difference) ||
        elementColor.alpha === 0
      ) {
        const elements = getElementsByClassName(preview, elementName);
        for (const element of elements) {
          fill(element, elementInnerColor);
        }
      }
    }
  }

  for (const userPic of userPicList) {
    const userPicElement = getElementsByClassName(preview, userPic)[0];
    const userPicColor = userPicElement.getAttribute(`stop-color`);
    //rgba(255,255,255,255)
    const color = userPicColor.slice("rgba(".length, -")".length).split(`,`);
    const colorRgb = {
      red: parseInt(color[0]),
      green: parseInt(color[1]),
      blue: parseInt(color[2]),
      alpha: parseInt(color[3]),
    };
    const colorHsl = rgbToHsl(colorRgb);
    colorHsl.lightness -= 0.2;
    const userPicShadow = `${userPic}Shadow`;
    const elements = getElementsByClassName(preview, userPicShadow);
    for (const element of elements) {
      fill(element, colorHsl);
    }
  }

  const elements = getElementsByClassName(preview, `IMG`);

  const wallpaper = theme.wallpaper;
  const wallpaperBytes = wallpaper?.bytes.length > 0 ? wallpaper.bytes : defaultTheme.wallpaper.bytes;
  await addWallpaper(elements, Buffer.from(wallpaperBuffer));
  wallpaper?.free();
  theme.free();
  return preview;
};

const makePrevAndroid = async (
  themeBuffer,
  themeName,
  themeAuthor,
  template
) => {
  let theme, accentHue;

  if (themeBuffer instanceof Buffer) {
    theme = new Attheme(themeBuffer.toString(`binary`));
  } else {
    theme = themeBuffer;
  }

  const preview = parser.parseFromString(templates[template]);
  const AVATAR_VARIABLES = [
    `avatar_backgroundRed`,
    `avatar_backgroundOrange`,
    `avatar_backgroundViolet`,
    `avatar_backgroundGreen`,
    `avatar_backgroundCyan`,
    `avatar_backgroundBlue`,
  ];
  const windowBackgroundWhite =
    theme[`windowBackgroundWhite`] ||
    defaultVariablesValues[`windowBackgroundWhite`];

  const inBubble =
    theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`];
  const outBubble =
    theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`];
  if (Color.brightness(inBubble) > Color.brightness(outBubble)) {
    theme[`chat_{in/out}Bubble__darkest`] = inBubble;
  } else {
    theme[`chat_{in/out}Bubble__darkest`] = outBubble;
  }
  let colors = [];
  for (const variable in defaultVariablesValues) {
    if (variable === `chat_wallpaper` && !theme.chat_wallpaper) {
      continue;
    }
    const elements = getElementsByClassName(preview, variable);
    const color = theme[variable] || defaultVariablesValues[variable];
    for (const element of elements) {
      fill(element, color);
    }
    const chooseHsl = rgbToHsl(color);
    let hueDifference = Math.abs(
      chooseHsl.hue - rgbToHsl(windowBackgroundWhite).hue
    );
    if (hueDifference > 180) {
      hueDifference = 360 - hueDifference;
    }
    let saturationDifference = Math.abs(
      chooseHsl.saturation - windowBackgroundWhite.saturation
    );
    if (
      hueDifference > 2 &&
      chooseHsl.saturation > 0.04 &&
      saturationDifference > 0.02
    ) {
      colors.push(Math.round(chooseHsl.hue));
    }
  }

  if (colors.length > 0) {
    accentHue = calculateAccentColor(colors);
  } else {
    accentHue = rgbToHsl(
      theme[`chats_actionBackground`] ||
        defaultVariablesValues[`chats_actionBackground`]
    ).hue;
  }

  for (const outBubbleGradientelement of getElementsByClassName(
    preview,
    `chat_outBubbleGradient`
  )) {
    const color =
      theme[`chat_outBubbleGradient`] ||
      theme[`chat_outBubble`] ||
      defaultVariablesValues[`chat_outBubble`];
    fill(outBubbleGradientelement, color);
  }
  for (const previewBackLinear of getElementsByClassName(
    preview,
    `PreviewBackLinear`
  )) {
    const chatOutBubble =
      theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`];
    fill(previewBackLinear, {
      hue: rgbToHsl(theme[`chat_outBubbleGradient`] || chatOutBubble).hue,
      saturation: 1,
      lightness: 0.9,
    });
  }
  for (const previewBackLinearShadow of getElementsByClassName(
    preview,
    `PreviewBackLinearShadow`
  )) {
    fill(previewBackLinearShadow, {
      hue: rgbToHsl(
        theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`]
      ).hue,
      saturation: 1,
      lightness: 0.9,
    });
  }
  for (const previewBack of getElementsByClassName(preview, `PreviewBack`)) {
    fill(previewBack, { hue: accentHue, saturation: 1, lightness: 0.9 });
  }
  for (const chatShadow of getElementsByClassName(preview, `ChatShadow`)) {
    fill(chatShadow, { hue: accentHue, saturation: 1, lightness: 0.02 });
  }
  if (`chat_outBubbleGradient` in theme) {
    for (const previewBack of getElementsByClassName(preview, `PreviewBack`)) {
      fill(previewBack, { red: 0, green: 0, blue: 0, alpha: 0 });
    }
  }

  const avatarTextColor =
    theme[`avatar_text`] || defaultVariablesValues[`avatar_text`];
  for (const avatarVariable of AVATAR_VARIABLES) {
    const avatarColor =
      theme[avatarVariable] || defaultVariablesValues[avatarVariable];
    const avatarAndBackgroundDifference = rgbDifference(
      avatarColor,
      windowBackgroundWhite
    );
    if (avatarAndBackgroundDifference < 25) {
      for (const avatar of getElementsByClassName(preview, avatarVariable)) {
        fill(avatar, avatarTextColor);
      }
      for (const avatarShadow of getElementsByClassName(
        preview,
        `${avatarVariable}Shadow`
      )) {
        let hslChoose = rgbToHsl(avatarTextColor);
        hslChoose.lightness += hslChoose.lightness < 0.25 ? 0.1 : -0.2;
        fill(avatarShadow, hslChoose);
      }
    } else {
      for (const avatarShadow of getElementsByClassName(
        preview,
        `${avatarVariable}Shadow`
      )) {
        const choose =
          theme[avatarVariable] || defaultVariablesValues[avatarVariable];
        const hslChoose = rgbToHsl(choose);
        hslChoose.lightness += hslChoose.lightness < 0.25 ? 0.1 : -0.2;
        fill(avatarShadow, hslChoose);
      }
    }
  }

  const chatInLoader =
    theme[`chat_inLoader`] || defaultVariablesValues[`chat_inLoader`];
  const chatInBubble =
    theme[`chat_inBubble`] || defaultVariablesValues[`chat_inBubble`];
  const chatOutLoader =
    theme[`chat_outLoader`] || defaultVariablesValues[`chat_outLoader`];
  const chatOutBubble =
    theme[`chat_outBubble`] || defaultVariablesValues[`chat_outBubble`];
  const inLoaderAndBubbleDifference = rgbDifference(chatInLoader, chatInBubble);
  const outLoaderAndBubbleDifference = rgbDifference(
    chatOutLoader,
    chatOutBubble
  );
  const chatInMediaIcon =
    theme[`chat_inMediaIcon`] || defaultVariablesValues[`chat_inMediaIcon`];
  const chatOutMediaIcon =
    theme[`chat_outMediaIcon`] || defaultVariablesValues[`chat_outMediaIcon`];

  if (inLoaderAndBubbleDifference < 25) {
    for (const chatInLoader of getElementsByClassName(
      preview,
      `chat_inLoader`
    )) {
      fill(chatInLoader, chatInMediaIcon);
    }
  }
  if (outLoaderAndBubbleDifference < 25) {
    for (const chatOutLoader of getElementsByClassName(
      preview,
      `chat_outLoader`
    )) {
      fill(chatOutLoader, chatOutMediaIcon);
    }
  }

  if (!theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
    const randomWallpaper = Math.floor(Math.random() * WALLPAPERS_AMOUNT);
    const image = wallpapers[randomWallpaper];

    theme[Attheme.IMAGE_KEY] = image;
  }

  const elements = getElementsByClassName(preview, `IMG`);

  if (theme[Attheme.IMAGE_KEY] && !theme.chat_wallpaper) {
    const imageBuffer = Buffer.from(theme[Attheme.IMAGE_KEY], `binary`);
    await addWallpaper(elements, imageBuffer);
  }

  const authorIndex = themeName.search(/ [bB]y @?[a-zA-Z0-9]/);

  if (themeAuthor === `` && authorIndex !== -1) {
    themeAuthor = themeName.slice(authorIndex);
    themeName = themeName.slice(0, authorIndex);
  }

  for (const element of getElementsByClassName(preview, `theme_name`)) {
    element.textContent = themeName;
  }

  for (const element of getElementsByClassName(preview, `theme_author`)) {
    element.textContent = themeAuthor;
  }
  return preview;
};

const makePrev = async (themeBuffer, themeName, themeAuthor, template) => {
  let preview;

  if (template == DESKTOP_TEMPLATE) {
    preview = await makePrevDesktop(themeBuffer);
  } else {
    preview = await makePrevAndroid(
      themeBuffer,
      themeName,
      themeAuthor,
      template
    );
  }

  const svg = preview.getElementsByTagName(`svg`)[0];
  const widthSvg = parseInt(svg.getAttribute(`width`));
  const heightSvg = parseInt(svg.getAttribute(`height`));

  const page = await browser.then((browser) => browser.newPage());
  await page.setViewport({
    width: widthSvg,
    height: heightSvg,
    deviceScaleFactor: 0,
  });
  await page.goto(`data:text/html,`);
  await page.setContent(`
    <style>
        * {
            margin: 0;
        }
    </style>
    ${serialize(preview)}
  `);
  const screen = await page.screenshot();
  await page.close();
  return screen;
};

module.exports = {
  MINIMALISTIC_TEMPLATE,
  REGULAR_TEMPLATE,
  NEW_TEMPLATE,
  DESKTOP_TEMPLATE,
  makePrev,
};
