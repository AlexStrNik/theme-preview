const fs = require(`fs`);
const preview = require(`./preview-maker`);

let make = async ()=>{
  fs.writeFileSync('./test/qQQ.png',await preview.makePrev(fs.readFileSync(`./test/test2.attheme`),'MyBestTheme','@alexstrnik','./test/new-preview.svg'));
};
make();