const setButton = document.getElementById('add_entry_button')
const titleInput = document.getElementById('new_entry_title')
setButton.addEventListener('click', () => {
    const title = titleInput.value
    window.electronAPI.addEntry(title)
});

document.addEventListener('click', (e) => {
    if(e.target && e.target.className == 'add_button'){
        const entryInput = document.getElementById(e.target.value)
        entryInput.value = parseInt(entryInput.value) + 1;
    }
});