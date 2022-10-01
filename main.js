const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron')

const excelJS = require("exceljs");
const fs = require('fs');
const path = require('path');
const ejs = require('ejs-electron');
const cron = require('node-cron');

const devMode = process.argv[2] == "dev";

const Datastore = require('nedb'), db = new Datastore({ 
    filename: path.join(devMode ? __dirname : path.parse(app.getAppPath('userData')).dir, '/data/history'),
    autoload: true 
});

app.whenReady().then(() => {
  
    const win = new BrowserWindow({
        width: devMode ? 800 : 400,
        height: devMode ? 800 : 400,
        frame: false,
        titleBarStyle: 'hidden',
        show: false,
        webPreferences: {
            preload: __dirname + '/preload.js'
        }
    });

    var dayEntries = null
    
    const configRootPath = path.join(devMode ? __dirname : path.parse(app.getAppPath('userData')).dir, "/data/config.json");
    config = JSON.parse(fs.readFileSync(configRootPath, 'utf-8'));
    
    const reloadWindow = () => {
        ejs.data('date', dayEntries.date);
        ejs.data('entries', dayEntries.entries);
        win.loadFile('index.ejs')
        win.reload();
    };

    const findOrInsertEntriesForDay = (date) => {
        db.find({date: {$lte: date}}).sort({ date: -1}).limit(1).exec(function(err, docs){
            if(err != null){console.error("error", err); return;}
            dayEntries = {date: date, entries: {}};
    
            if(docs.length > 0){
                if(docs[0].date != date){
                    Object.keys(docs[0].entries).forEach(key => {
                        dayEntries.entries[key] = 0;
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

    const iconPath = path.join(__dirname, 'resources/tray-icon.png')
    tray = new Tray(iconPath)
    
    /** Context Menu */
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Close', type: 'normal', role: 'quit' }
    ])

    tray.setToolTip('TimeTracker')
    tray.setContextMenu(contextMenu)
    
    win.setPosition(
        tray.getBounds().x - (devMode ? 800 : 400),
        tray.getBounds().y - (devMode ? 800 : 400)
    )
    
    tray.on('click', function(e){
        if(!win.isVisible()){
            win.show()
            // win.webContents.openDevTools()
        }else{
            win.hide();
        }
    });
    
    
    cron.schedule(config.reminderSchedule, () => {
        win.show()
        mainWindow.setAlwaysOnTop(true, 'screen');
    })

    ipcMain.on('add-entry', (event, title) => {
        if(title.length == 0){
            console.error("Title must not be empty!");
        }else if(title in dayEntries.entries){
            console.error("Title already exists!");
        }else{
            dayEntries.entries[title] = 0
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
        dayEntries.entries[title] = value
        db.update({date: dayEntries.date}, { $set: { entries: dayEntries.entries }}, {}, (err, numReplaced) => {
            reloadWindow()
        })
    })

    ipcMain.on('load-entries-for-day', (event, date) => {
        findOrInsertEntriesForDay(date);
    })

    ipcMain.on('export', (event, from, to) => {
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
                    titleRowMap[title][docs[i].date] = docs[i].entries[title]
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
                workbook.xlsx.writeFile(
                    path.join(app.getPath('home'), "Downloads/export[" + from + "-" + to + "].xlsx")
                )
              } catch (err) {
                console.error(err)
            }
        });

    })
})