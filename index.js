const { app, BrowserWindow, Menu, dialog } = require("electron");
const fs = require("fs");
const pako = require("pako");

let w;
app.on("ready", () => {
    w = new BrowserWindow({ webPreferences: { nodeIntegration: true, enableRemoteModule: true } });
    w.loadFile("index.html");
    Menu.setApplicationMenu(Menu.buildFromTemplate(temp))
    w.on("closed", () => { app.quit() });
});

const temp = [
    {
        label: "App",
        submenu: [
            {
                label: "Reload",
                accelerator: "ctrl+r",
                click: () => {
                    w.reload();
                }
            },
            {
                label: "Toggle dev tools",
                accelerator: "ctrl+shift+i",
                click: () => {
                    w.toggleDevTools();
                }
            },
            {
                type: "separator"
            },
            {
                label: "Quit",
                accelerator: "alt+f4",
                click: () => {
                    app.quit();
                }
            }
        ]
    },
    {
        label: "File",
        submenu: [
            {
                label: "Import .gmd file",
                accelerator: "ctrl+o",
                click: () => {
                    try {
                        const d = dialog.showOpenDialogSync()[0].replace(/\\/g,"/");
                        w.webContents.send("main", { action: "import-gmd", gmd: d });
                    } catch(e) {}
                }
            }
        ]
    },
    {
        label: "Cell",
        submenu: [
            {
                label: "Save value",
                accelerator: "ctrl+s",
                click: () => {
                    w.webContents.send("main", { action: "save-value" });
                }
            },
            {
                label: "Reload data",
                click: () => {
                    w.webContents.send("main", { action: "update" });
                }
            }
        ]
    }
]

/*

let lvl = fs.readFileSync("original.gmd", "utf8");
const data = pako.inflate(Buffer.from(getKey(lvl, "k4", "s"), 'base64'), { to:"string" } ).toString("utf8");
let obj = data.split(";");

fs.writeFileSync("edit.txt", obj.join("\n"));

let lvl = fs.readFileSync("edit.gmd", "utf8");
const data = fs.readFileSync("edit.txt", "utf8").split("\n").join(";");
fs.writeFileSync("result.gmd", lvl.replace("DATA-HERE", data), "utf8");

*/