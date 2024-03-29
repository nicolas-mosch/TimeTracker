const { app, Menu, Tray, BrowserWindow, ipcMain, shell, screen, dialog } = require('electron')
// require('update-electron-app')()
const excelJS = require("exceljs");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs-electron');
const cron = require('node-cron');
const AutoLaunch = require('auto-launch');

const defaultConfig = {
    "reminderSchedule": "* * * * *",
    "window": {
        "width": 400,
        "height": 400
    },
    "launchOnStartup": true
}

const devMode = process.argv[2] == "dev";

const filepath = devMode ?
    path.join(__dirname, "data")
    : path.join(path.parse(app.getPath('documents')).dir, path.parse(app.getPath('documents')).base, "TimeTracker")

const configPath = path.join(filepath, "config.json")

if (!devMode && !fs.existsSync(filepath)){
    fs.mkdirSync(filepath);
}
if (!devMode && !fs.existsSync(configPath)){
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig))
}

const configuration = devMode ? defaultConfig : JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const iconPath = path.join(__dirname, 'resources/tray-icon.png')

require('update-electron-app')({
    repo: 'nicolas-mosch/TimeTracker',
    updateInterval: '1 hour'
  })

var tray, win

if (devMode) {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit',
        ignored: [/data|[/\\]\./]
    });
}else if(configuration.launchOnStartup){
    var autoLauncher = new AutoLaunch({
        name: 'TimeTracker'
    });
    autoLauncher.isEnabled().then(function(isEnabled) {
        if (isEnabled) return;
            autoLauncher.enable();
        }).catch(function (err) {
        throw err;
    });
}

const Datastore = require('nedb'), db = new Datastore({ 
    filename: path.join(filepath, '/history'),
    autoload: true 
});

app.whenReady().then(() => {
    tray = new Tray(iconPath)
    win = new BrowserWindow({
        width: devMode ? 600 : configuration.window.width,
        height: devMode ? 600 : configuration.window.height,
        frame: false,
        resizable: devMode,
        titleBarStyle: 'hidden',
        show: false,
        transparent:true,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            preload: __dirname + '/preload.js'
        }
    });

    var dayEntries = null
    
    const reloadWindow = (opaque = false) => {
        var sum = 0
        for(key in dayEntries.entries){
            if(dayEntries.entries[key].type == '0') 
                sum += parseFloat(dayEntries.entries[key].value)
        }

        var allTitles = [];

        db.find({}, { entries: 1, _id: 0 }, function (err, docs) {
            for(i in docs){
                for(key in docs[i].entries){
                    if(!allTitles.includes(key)) allTitles.push(key);
                }
            }

            inputEntries = {}
            for(key in dayEntries.entries){
                if(dayEntries.entries[key].type != '1')
                    inputEntries[key] = dayEntries.entries[key]
            }

            booleanEntries = {}
            for(key in dayEntries.entries){
                if(dayEntries.entries[key].type == '1')
                    booleanEntries[key] = dayEntries.entries[key]
            }

            
            ejs.data('date', dayEntries.date);
            ejs.data('entries', inputEntries);
            ejs.data('booleans', booleanEntries);
            ejs.data('sum', sum);
            ejs.data('titles', allTitles);
            ejs.data('opaque', opaque);

            win.loadFile('index.ejs')
            win.reload();
        });
    };

    const showWindow = (showInactive = false) => {
        let bounds = screen.getPrimaryDisplay().bounds;
        win.setPosition(
            // tray.getBounds().x - (devMode ? 600 : configuration.window.width),
            // tray.getBounds().y - (devMode ? 600 : configuration.window.height)
            bounds.width - ((devMode ? 600 : configuration.window.width)),
            bounds.height - ((devMode ? 600 : configuration.window.width) + 50)
        )
        if(showInactive) win.showInactive()
        else win.show()
    }

    win.on('focus', () => {
        reloadWindow();
    });

    win.on('blur', () => {
        win.hide();
    });

    cron.schedule(configuration.reminderSchedule, () => {
        if(!win.isVisible()){
            reloadWindow(true);
            showWindow(true);
        }
    })

    const findOrInsertEntriesForDay = (date) => {
        db.find({date: {$lte: date}}).sort({ date: -1}).limit(1).exec(function(err, docs){
            if(err != null){console.error("error", err); return;}
            dayEntries = {date: date, entries: {}};
    
            if(docs.length > 0){
                if(docs[0].date != date){
                    Object.keys(docs[0].entries).forEach(key => {
                        dayEntries.entries[key] = docs[0].entries[key];
                        dayEntries.entries[key].value = 0;
                    });
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
    }

    findOrInsertEntriesForDay((new Date()).toISOString().substring(0, 10))

    /** Context Menu */
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Close', type: 'normal', role: 'quit' }
    ])
    tray.setToolTip('TimeTracker')
    tray.setContextMenu(contextMenu)
    tray.on('click', function(e){
        if(!win.isVisible()){
            showWindow();
            if(devMode) win.webContents.openDevTools()
        }else{
            win.hide();
        }
    });

    ipcMain.on('add-entry', (event, title, entry) => {
        if(entry == null){
            entry = {
                description: "",
                type: "1",
                value: 0,
            }
        }
        
        if(title.length == 0){
            console.error("Title must not be empty!");
        }else if(title in dayEntries.entries){
            console.error("Title already exists!");
        }else{
            dayEntries.entries[title] = entry
        }
        
        db.update({date: dayEntries.date}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {
            reloadWindow()
        })
    })

    ipcMain.on('remove-entry', (event, title) => {
        delete dayEntries.entries[title];
        db.update({date: dayEntries.date}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {
            reloadWindow()
        })
    })

    ipcMain.on('update-entry', (event, title, value) => {
        dayEntries.entries[title].value = value
        db.update({date: dayEntries.date}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {})
    })

    ipcMain.on('load-entries-for-day', (event, date) => {
        findOrInsertEntriesForDay(date);
    })

    ipcMain.on('open-config', (event) => {
        shell.openPath(configRootPath);
    })

    ipcMain.on('export', (event, from, to) => {
        
        let options = {
            //Placeholder 1
            title: "Save Exported Entries",
            
            //Placeholder 2
            defaultPath : path.join(path.parse(app.getPath('documents')).dir, path.parse(app.getPath('documents')).base, (from + "_" + to)),
            
            //Placeholder 4
            buttonLabel : "Save",
            
            //Placeholder 3
            filters :[
             {name: 'Excel Sheets', extensions: ['xlsx']}
            ]
           }
        let file = dialog.showSaveDialogSync(options)
           
        db.find({date: {$lte: to, $gte: from}}).exec(function(err, docs){
            if(err != null){console.error("error", err); return;}
            const workbook = new excelJS.Workbook();  // Create a new workbook
            const worksheet = workbook.addWorksheet("My Users"); // New Worksheet
            // Column for data in excel. key must match data key
            var columns = [
                { header: "Title", key: "title" }
            ];
            fromDate = new Date(from)
            toDate = new Date(to)
            counterDate = fromDate
            while(counterDate < toDate){
                columns.push({ header: counterDate.toISOString().substring(0, 10), key: counterDate.toISOString().substring(0, 10), width: 10})
                counterDate.setDate(counterDate.getDate() + 1)
            }

            worksheet.columns = columns

            titleRowMap = {}
            for(var i in docs){
                for(var title in docs[i].entries){
                    if(!(title in titleRowMap)) titleRowMap[title] = {}
                    titleRowMap[title][docs[i].date] = docs[i].entries[title].value
                }
            }

            for(title in titleRowMap){
                row = titleRowMap[title]
                row.title = title;
                worksheet.addRow(row)
            }

            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true };
            });
            
            try {
                workbook.xlsx.writeFile(file)
              } catch (err) {
                console.error(err)
            }
        });
    })
})