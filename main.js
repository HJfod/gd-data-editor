const fs = require("fs");
const pako = require("pako");
const keys = require("./keys.json");
const ipc = require("electron").ipcRenderer;

const global = {
    ccloc: ((process.env.HOME || process.env.USERPROFILE) + "/AppData/Local/GeometryDash").replace(/\\/g,"/"),
    saveData: null
}

function arr(list) {
    return Array.prototype.slice.call(list);
}

function getCSS(v) {
    let g = (getComputedStyle(html).getPropertyValue(v)).replace('px', '');
    if (g.indexOf("calc(") > -1) {
        g = g.split("*");
        for (let i in g) {
            g[i] = g[i].replace(/calc\(/g, "");
            g[i] = g[i].replace(/\)/, "");
            g[i] = g[i].trim();
            g[i] = Number(g[i]);
        }
        g = g[0] * g[1];
    }
    if (isNaN(g)) {
        return g;
    } else {
        return Number(g);
    }
}

let startFiles = [];
fs.readdirSync(global.ccloc).forEach(x => {
    if (x === "CCLocalLevels.dat" || x === "CCGameManager.dat") {
        startFiles.push(x);
    }
});

startFiles.forEach(f => {
    add(0, f, false, () => {
        if (f === "CCLocalLevels.dat") {
            try {

                status("decrypting...");
                global.saveData = fs.readFileSync(`${global.ccloc}/${f}`, "utf8");
            
                if (!global.saveData.startsWith('<?xml version="1.0"?>')){
                    try {
                        global.saveData = new TextDecoder("utf-8").decode(pako.inflate(Buffer.from(global.saveData.split("").map((str) => String.fromCharCode(11 ^ str.charCodeAt(0))).join("").replace(/-/g, "+").replace(/_/g, "/"), "base64")))
                    } catch(e) {
                        global.saveData = null;
                        console.error(e);
                        status("error, see console");
                    }
                }
                if (global.saveData) {
                    status("loading levels...");
                    
                    let reduce = global.saveData;
                    let found = true;
                    while (found) {
                        let lvl = reduce.match(/<k>k_\d+<\/k>.+?<\/d>\n? *<\/d>/);
                        if (lvl) {
                            lvl = lvl[0];
                            reduce = reduce.substring(reduce.indexOf(lvl) + lvl.length);
        
                            let n = lvl.split(`<k>k2</k><s>`).pop();
                            n = n.substring(0,n.indexOf("<")).replace(/'/g,'"');
                            
                            add(1, n, false, () => {
                                lvl.match(/<k>(.*?)<\/k>/g).forEach(key => {
                                    key = key.replace("<k>","").replace(/<\/k>+$/,"");
                                    
                                    if (keys.baseData[key]) {
                                        if (typeof keys.baseData[key] === "object") {
                                            add(2, keys.baseData[key].use, false, () => {
                                                const objs = pako.inflate(Buffer.from(getKey(lvl, key, "s"), 'base64'), { to:"string" } ).toString("utf8").split(";")
                                                
                                                add(3, "StartData", false, () => {
                                                    objs.slice(0,1).forEach(obj => {
                                                        let keysv = [];
                                                        let d = obj.split(",");
                                                        for (let i = 0; i < d.length; i += 2) {
                                                            keysv.push({ k: d[i], v: d[i+1]});
                                                        }
                                                        keysv.forEach(k => {
                                                            if (typeof keys.baseData.k4.values[k.k] === "object") {
                                                                add(4, keys.baseData.k4.values[k.k].use, false, () => {
                                                                    add(5, k.v);
                                                                }, "StartKeys");
                                                            } else {
                                                                add(4, keys.baseData.k4.values[k.k], false, () => {
                                                                    add(5, k.v, true, null, "SKey Data", true);
                                                                }, "StartKeys", "#0f0");
                                                            }
                                                        });
                                                    });
                                                }, "LevelData");

                                                add(3, `Objects (${objs.slice(1,objs.length-1).length})`, false, () => {
                                                    objs.slice(1,objs.length-1).forEach(obj => {
                                                        add(4, obj, false, () => {
                                                            add(5, obj, true, null, "Object Data");
                                                        }, "Object", "#0f0");
                                                    });
                                                }, "LevelData");
                                            });
                                        } else {
                                            add(2, keys.baseData[key].replace(/\#/g,"").replace(/\&/g,""), false, () => {
                                                let k = getKey(lvl, key, null)[0];
                                                let t = k.substring(k.indexOf(">") + 1,k.lastIndexOf("<"));
                                                if (keys.baseData[key].includes("#")) {
                                                    t = decodeBase64(t).toString("utf8");
                                                }
                                                if (keys.baseData[key].includes("&")) {
                                                    t = pako.inflate(Buffer.from(t, 'base64'), { to:"string" } ).toString("utf8");
                                                }
                                                add(3, t, true, null, "Value");
                                            }, "Key", "#0f0", key);
                                        }
                                    }
                                });
                            }, "Level", null, lvl);
                        } else {
                            found = false;
                        }
                    }
                    status();
                }
            } catch(e) {
                console.error(e);
                status("error, see console");
            }
        } else {
            add(1, "test", false, () => {
                add(2, "sss");
                add(2, "sss");
                add(2, "sss");
                add(2, "sss");
            });
            add(1, "test");
            add(1, "test");
            add(1, "test");
            add(1, "test");
        }
    });
});

ipc.on("main", (e, args) => {
    switch (args.action) {
        case "save-value":
            setKey(document.querySelector('.selected[data-row="Level"]').getAttribute("data-sub"),
            document.querySelector('.selected[data-row="Key"]').getAttribute("data-sub"),
            document.querySelector("#value-editor").value);
            break;
        case "update":
            update();
            break;
    }
});

function status(str = null) {
    str ? document.title = str : document.title = "gd data editor";
}

function add(row, content, input = false, open = null, rowname = "", color = null, subdata = null) {
    const ta = document.querySelector("table").children[0];
    const b = document.createElement(input ? "textarea" : "button");
    if (!input) b.addEventListener("click", () => {
        arr(ta.children[row].querySelectorAll(".selected")).forEach(x => x.classList.remove("selected"));

        b.classList.add("selected");

        const d = [];
        ta.childNodes.forEach((x, ix) => {
            if (ix > row) {
                d.push(x);
            }
        });
        d.forEach(x => {
            x.remove();
        });

        if (typeof open === "function") open();
    });
    input ? b.value = content : b.innerText = content;
    if (input) b.setAttribute("id","value-editor");
    if (color) b.style.color = color;
    if (subdata) b.setAttribute("data-sub", subdata);
    if (!ta.children[row]) {
        const d = document.createElement("tr");
        const e = document.createElement("th");
        e.innerHTML = rowname ? rowname : "key";
        d.appendChild(e);
        ta.appendChild(d);
    }
    const c = document.createElement("td");
    c.appendChild(b);
    ta.children[row].appendChild(c);
    b.setAttribute("data-row", b.parentNode.parentNode.children[0].innerHTML);
}

function decodeXor(dat, key) {
    /**
     * @author SMJS
     * @param {String} dat The data to decode
     * @param {Integrer} key The decoding key
     * @description Decode data as XOR
     * @returns {String} Decoded data
     */

    return dat.split("").map(str => String.fromCharCode(key ^ str.charCodeAt(0))).join("");
}

function decodeBase64(str) {
    /**
     * @author SMJS
     * @param {String} str The string to decode
     * @description Decode a Base64 string
     * @returns {String}
     */

    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function update() {
    document.querySelector("table").children[0].children[0].querySelector(".selected").click();
}

function getKey(lvl, key, type, legacy = false) {
    /**
     * @author HJfod
     * @param {String} lvl Level data
     * @param {String} key The key to get
     * @param {String} type The type of key to get
     * @description Get a value from level data
     * @returns {String}
     */

    if (type === null){
        return lvl.split(`<k>${key}</k>`).pop().match(/<(.*?)>(.*?)<\/(.*?)>/);
    }
    if (type){
        return lvl.split(`<k>${key}</k><${type}>`).pop().substring(0,lvl.split(`<k>${key}</k><${type}>`).pop().indexOf(legacy ? `<` : `</${type}>`));
    }else{
        return lvl.split(`<k>${key}</k>`).pop().substring(0,lvl.split(`<k>${key}</k>`).pop().indexOf('>')).includes("t");
    }
}

function setKey(lvl, key, val, isObj = false) {
    if (isObj) {

    } else {
        const rex = new RegExp(`<k>${key}<\/k><(.*?)>(.*?)<\/(.*?)>`);
        const m = lvl.match(rex)[0];
        const tag = m.substring(m.lastIndexOf("</")+2,m.lastIndexOf(">"));
        console.log(key);
        console.log(m);
        console.log(tag);
        console.log(`<k>${key}<\/k><${tag}>${val}<\/${tag}>`);
        
        const oldlvl = lvl;
        lvl = lvl.replace(rex, `<k>${key}<\/k><${tag}>${val}<\/${tag}>`);
    
        const ix = global.saveData.search(oldlvl);
    
        if (ix > -1) {
            let newData = global.saveData.substring(0, ix) + global.saveData.substring(ix).replace(oldlvl, lvl);
            fs.writeFileSync(`${global.ccloc}/CCLocalLevels.dat`, newData);
    
            status("updated value");
        
            update();
        } else {
            status("apparently the level doesn't exist??");
        }
    }
}