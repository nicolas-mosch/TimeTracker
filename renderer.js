const dateFormat = "yy-mm-dd"
$( function() {
    $( "#date_input" ).datepicker({
        dateFormat: dateFormat
    })

    $( "#date_input" ).on("change", (e) => {
        console.log(e.target.value)
        window.electronAPI.loadEntriesForDay(e.target.value)
    })

    $( ".add_button" ).on("click", (e) => {
        const entryInput = document.getElementById(e.target.value)
        const value = parseInt(entryInput.value)
        window.electronAPI.updateEntry(e.target.value, value+1)
    })

    $( ".sub_button" ).on("click", (e) => {
        const entryInput = document.getElementById(e.target.value)
        const value = parseInt(entryInput.value)
        if(value >= 1) window.electronAPI.updateEntry(e.target.value, value-1)
    })

    $( "#new_entry_title" ).on("keypress", (e) => {
        if(e.key != "Enter") return;
        const title = $("#new_entry_title").val()
        window.electronAPI.addEntry(title)
    })
    
    $( ".del_button" ).on("click", (e) => {
        const title = e.target.value
        window.electronAPI.removeEntry(title)
    })

    $( "#export_button" ).on("click", () => {
        console.log("test");
        $("#export_from_date_input").datepicker("show")
    })

    $('#export_from_date_input').datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: dateFormat,
        onSelect: function(selectedDate) {
            $("#export_to_date_input").datepicker('option', 'minDate', selectedDate); // Set the minDate for the end date calendar
            setTimeout(function(){$("#export_to_date_input").datepicker('show');},10);
        }
    });
    
    $('#export_to_date_input').datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: dateFormat,
    });

    $('#export_to_date_input').on("change", (e) => {
        window.electronAPI.export($('#export_from_date_input').val(), e.target.value)
    })
});