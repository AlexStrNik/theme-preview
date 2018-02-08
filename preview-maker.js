"use strict";

const attheme = require("attheme-js");
const fs = require("fs");
const defaultVariablesValues = require("attheme-default-values");
const xmldom = require('xmldom');
const DOMParser = xmldom.DOMParser;
const XmlSerializer = xmldom.XMLSerializer;
const sizeOf = require('image-size');
const btoa = require('btoa');
const svg2png = require('svg2png');
const FileReader = require('filereader');

String.prototype.padStart = function padStart(targetLength,padString) {
    targetLength = targetLength>>0; //floor if number or convert non-number to 0;
    padString = String(padString || ' ');
    if (this.length > targetLength) {
        return String(this);
    }
    else {
        targetLength = targetLength-this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
        }
        return padString.slice(0,targetLength) + String(this);
    }
};

function create_attheme(path) {
    let contents = fs.readFileSync(path, 'utf8');
    return new attheme(contents,defaultVariablesValues);
}
function read_xml(path) {
    let contents = fs.readFileSync(path, 'utf8');
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
    return x.concat(y).concat(z).concat(d).concat(e).concat(f);
}
function read(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            const CHUNK_SIZE = 0x8000,
                chars = new Uint8Array(result),
                length = chars.length;

            let content = "";

            for (let i = 0; i < length; i += CHUNK_SIZE) {
                let slice = chars.subarray(i, Math.min(i + CHUNK_SIZE, length));
                content += String.fromCharCode.apply(null, slice);
            }
            resolve(content);
        });
    }
)}

function make_prev(sesId,path) {
    return new Promise((resolve, reject) => {
        read(path).then(function (content) {
            let prev = read_xml('./theme-preview.svg');
            let theme = new attheme(content,defaultVariablesValues);

            for(let key in defaultVariablesValues){
                let z = getElementsByClassName(prev,key);
                for(let node in z) {
                    let value = theme[key];
                    z[node].setAttribute('fill', `rgba(${value.red}, ${value.green}, ${value.blue}, ${value.alpha / 255})`);
                    for (let e in z[node].childNodes) {
                        if (z[node].childNodes[e].setAttribute) {
                            z[node].childNodes[e].setAttribute('fill', `rgba(${value.red}, ${value.green}, ${value.blue}, ${value.alpha / 255})`);
                        }
                    }
                }
            }

            if(theme[attheme.IMAGE_KEY]){
                fs.writeFileSync('./res'+sesId+'.jpg',new Buffer(btoa(theme[attheme.IMAGE_KEY]),'base64'));
                let dimensions = sizeOf('./res'+sesId+'.jpg');
                let imgRatio = (dimensions.height / dimensions.width) ;
                let containerRatio = (720 / 480);
                let finalHeight;
                let finalWidth;
                if (containerRatio > imgRatio)
                {
                    finalHeight = 720;
                    finalWidth = (720 /imgRatio);
                }
                else
                {
                    finalWidth = 480;
                    finalHeight = (480 * imgRatio);
                }// original img ratio
                let image = btoa(theme[attheme.IMAGE_KEY]);
                getElementsByClassName(prev,'chat_wallpaper')[0].setAttribute('fill','rgba(0,0,0,0)');
                let zq = getElementsByClassName(prev,"IMG")[0];
                zq.setAttribute('xlink:href',`data:image/jpg;base64,${image}`);
                zq.setAttribute('width',finalWidth);
                zq.setAttribute('height',finalHeight);
                zq.setAttribute('y',62-(finalHeight-720)/2);
                zq.setAttribute('x',-(finalWidth-480)/2);
                fs.unlinkSync('./res'+sesId+'.jpg');
            }
            let done = svg2png.sync(new XmlSerializer().serializeToString(prev), {});
            //fs.writeFileSync('./testdev.svg',new XmlSerializer().serializeToString(prev));
            fs.writeFileSync('./done'+sesId+'.png',done);
            resolve('./done'+sesId+'.png');
        });
    });
}

module.exports={
    'read_xml':read_xml,
    'create_attheme':create_attheme,
    'make_prev':make_prev,
};