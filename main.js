const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron')
const ejs = require('ejs-electron');


app.whenReady().then(() => {
    
    entries = [];
    const win = new BrowserWindow({
        width: 400,
        height: 400,
        frame: false,
        titleBarStyle: 'hidden',
        show: false,
        webPreferences: {
            preload: __dirname + '/preload.js'
        }
    });
    
    const reloadWindow = () => {
        ejs.data('entries', entries);
        win.loadFile('index.ejs')
        win.reload();
    };
    
    reloadWindow();

    tray = new Tray('resources/tray-icon.png')
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Item1', type: 'radio' },
      { label: 'Item2', type: 'radio' },
      { label: 'Item3', type: 'radio', checked: true },
      { label: 'Item4', type: 'radio' }
    ])
    tray.setToolTip('This is my application.')
    tray.setContextMenu(contextMenu)
    
    win.setPosition(tray.getBounds().x - 400, tray.getBounds().y - 400)

    tray.on('click', function(e){
        if(!win.isVisible()){
            win.show()
            // win.webContents.openDevTools()
        }else{
            win.hide();
        }
    });

    ipcMain.on('add-entry', (event, title) => {
        console.log(title)
        entries.push({title: title, time: 0})
        reloadWindow();
    })
})