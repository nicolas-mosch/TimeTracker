const setButton = document.getElementById('add_entry_button')
const titleInput = document.getElementById('new_entry_title')
setButton.addEventListener('click', () => {
    const title = titleInput.value
    window.electronAPI.addEntry(title)
});

document.addEventListener('click', (e) => {
    if(e.target && e.target.className == 'add_button'){
        const entryInput = document.getElementById(e.target.value)
        const value = parseInt(entryInput.value)
        window.electronAPI.updateEntry(e.target.value, value+1)
    }
    
    if(e.target && e.target.className == 'sub_button'){
        const entryInput = document.getElementById(e.target.value)
        const value = parseInt(entryInput.value)
        window.electronAPI.updateEntry(e.target.value, value-1)
    }
});