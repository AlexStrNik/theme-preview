const fs = require(`fs`);
const preview = require(`./preview-maker`);

let make = async ()=>{
  fs.writeFileSync('qQQ.png',await preview.makePrev(fs.readFileSync(`test2.attheme`),'MyBestTheme','@alexstrnik'));
};
make();