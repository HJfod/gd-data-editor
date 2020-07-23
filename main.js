const fs = require("fs");
const pako = require("pako");
const keys = require("./keys.json");
const { dialog } = require("electron").remote;
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
    if (x === "CCLocalLevels.dat" /* || x === "CCGameManager.dat" */ ) {
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
                                levelMenu(lvl);
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
            const e = document.querySelector("#value-editor");
            setKey(
                JSON.parse(e.getAttribute("data-super")).level,
                e.getAttribute("data-super").key,
                e.value
            );
            break;
        case "import-gmd":
            add(0, args.gmd.split("/").pop(), false, () => {
                levelMenu(fs.readFileSync(args.gmd).toString(), 1);
            }, null, null, args.gmd);
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

function levelMenu(lvl, pos = 2) {
    lvl.match(/<k>(.*?)<\/k>/g).forEach(key => {
        key = key.replace("<k>","").replace(/<\/k>+$/,"");
        
        if (keys.baseData[key]) {
            if (typeof keys.baseData[key] === "object") {
                add(pos, keys.baseData[key].use, false, () => {
                    const objs = pako.inflate(Buffer.from(getKey(lvl, key, "s"), 'base64'), { to:"string" } ).toString("utf8").split(";")
                    
                    add(pos+1, "StartData", false, () => {
                        objs.slice(0,1).forEach(obj => {
                            let keysv = [];
                            let d = obj.split(",");
                            for (let i = 0; i < d.length; i += 2) {
                                keysv.push({ k: d[i], v: d[i+1]});
                            }
                            keysv.forEach(k => {
                                if (typeof keys.baseData.k4.values[k.k] === "object") {
                                    const colors = k.v.split("|")
                                    colors.splice(-1,1);
                                    add(pos+2, `${keys.baseData.k4.values[k.k].use} (${colors.length})`, false, () => {
                                        colors.forEach(col => {
                                            let coloo = col.split("_");
                                            let colo = {};
                                            for (let i = 0; i < coloo.length; i += 2) {
                                                colo[coloo[i]] = coloo[i+1];
                                            }
                                            let coln = keys.baseData.k4.values.kS38.misc.ReservedIDs[colo["6"]];
                                            add(pos+3, coln ? coln : colo["6"], false, () => {
                                                Object.keys(colo).forEach(cc => {
                                                    let ck = keys.baseData.k4.values.kS38.values[cc];
                                                    add(pos+4, ck ? ck : cc, false, () => {
                                                        add(pos+5, colo[cc], true, null, "CKey Data");
                                                    }, "Color Key", "#0f0");
                                                });
                                                // add(6, col, true, null, "Color Data", null, );
                                            }, "Color");
                                        });
                                    }, "Start Keys");
                                } else {
                                    add(pos+2, keys.baseData.k4.values[k.k], false, () => {
                                        add(pos+3, k.v, true, null, "SKey Data");
                                    }, "Start Keys", "#0f0");
                                }
                            });
                        });
                    }, "Level Data");
                    
                    add(pos+1, `Objects (${objs.slice(1,objs.length-1).length})`, false, () => {
                        let ye = false;
                        if (objs.slice(1,objs.length-1).length > 10000) {
                            const d = dialog.showMessageBoxSync({
                                title: "Warning",
                                message: "There are a lot of objects in this level. Are you sure you want to do this?",
                                buttons: [ "Yes", "Cancel" ]
                            });
                            if (d === 0) ye = true;
                        } else {
                            ye = true;
                        }
                        if (ye) {
                            objs.slice(1,objs.length-1).forEach(obj => {
                                add(pos+2, obj, false, () => {
                                    let keysv = [];
                                    let d = obj.split(",");
                                    for (let i = 0; i < d.length; i += 2) {
                                        keysv.push({ k: d[i], v: d[i+1]});
                                    }
                                    keysv.forEach(k => {
                                        add(pos+3, keys.baseData.k4.values.objectsArray[k.k], false, () => {
                                            add(pos+4, k.v, true, null, "OKey Value");
                                        }, "Object Key", "#0f0");
                                    });
                                }, "Object");
                            });
                        }
                    }, "Level Data");
                });
            } else {
                add(pos, keys.baseData[key].replace(/\#/g,"").replace(/\&/g,""), false, () => {
                    let k = getKey(lvl, key, null)[0];
                    let t = k.substring(k.indexOf(">") + 1,k.lastIndexOf("<"));
                    if (keys.baseData[key].includes("#")) {
                        t = decodeBase64(t).toString("utf8");
                    }
                    if (keys.baseData[key].includes("&")) {
                        t = pako.inflate(Buffer.from(t, 'base64'), { to:"string" } ).toString("utf8");
                    }
                    add(pos+1, t, true, null, "Value", null, null, {
                        type: "lvlkey",
                        level: lvl,
                        key: key
                    });
                }, "Key", "#0f0", key);
            }
        }
    });
}