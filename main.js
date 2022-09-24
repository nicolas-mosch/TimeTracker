const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron')
const ejs = require('ejs-electron');

var Datastore = require('nedb'), db = new Datastore({ filename: 'data/history', autoload: true });

const getYearAndDay = () => {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);
    return {year: now.getFullYear(), day: day}
}

app.whenReady().then(() => {
    
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
        ejs.data('entries', dayEntries.entries);
        win.loadFile('index.ejs')
        win.reload();
    };


    var dayEntries = null
    db.find({}).sort({ year: -1, day: -1}).limit(1).exec(function(err, docs){
        if(err != null){console.error("error", err); return;}
        date = getYearAndDay();        
        dayEntries = {day: date.day, year: date.year, entries: {}};

        if(docs.length == 1){
            dayEntries.entries 
            if(dayEntries.year != date.year || dayEntries.day != date.day){
                dayEntries.entries = docs[0].entries
            }else{
                dayEntries = docs[0];
                reloadWindow()
                return;
            }
        }
        db.insert(
            [dayEntries],
            function(err, newDocs){
                if(err != null){console.error("error", err); return;}   
                dayEntries=newDocs[0]
                reloadWindow();
            }
        )
    })

    tray = new Tray('resources/tray-icon.png')
    
    /** Context Menu */
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
        if(title.length == 0){
            console.error("Title must not be empty!");
        }else if(title in dayEntries.entries){
            console.error("Title already exists!");
        }else{
            dayEntries.entries[title] = 0
        }
        
        db.update({_id: dayEntries._id}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {
            reloadWindow()}
        )
    })

    ipcMain.on('update-entry', (event, title, value) => {
        dayEntries.entries[title] = value
        db.update({_id: dayEntries._id}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {
            reloadWindow()}
        )
    })

})