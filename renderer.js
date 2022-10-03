const dateFormat = "yy-mm-dd"
$( function() {
    $( "#date_input" ).datepicker({
        dateFormat: dateFormat
    })

    $( "#date_input" ).on("change", (e) => {
        console.log(e.target.value)
        window.electronAPI.loadEntriesForDay(e.target.value)
    })

    $( "#entries input, #entries select" ).on("change", (e) => {
        if(e.target.type == "checkbox"){
            value = $(e.target).is(":checked")
        }else{
            value = e.target.value
        }
        
        window.electronAPI.updateEntry($(e.target).closest(".input-group").attr('id'), value)
    })
    
    $( "#new_entry_title" ).on("keypress", (e) => {
        if(e.key != "Enter") return;
        const title = $("#new_entry_title").val()
        window.electronAPI.addEntry(title)
    })
    
    $( ".del_button" ).on("click", (e) => {
        window.electronAPI.removeEntry($(e.target).closest(".input-group").attr('id'))
    })

    $( "#export_button" ).on("click", () => {
        console.log("test");
        $("#export_from_date_input").datepicker("show")
    })

    $('#export_from_date_input').datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: dateFormat,
        firstDay: 1,
        onSelect: function(selectedDate) {
            $("#export_to_date_input").val($('#export_from_date_input').val());
            $("#export_to_date_input").datepicker('option', 'minDate', selectedDate); // Set the minDate for the end date calendar
            setTimeout(function(){$("#export_to_date_input").datepicker('show');},10);
        }
    });
    
    $('#export_to_date_input').datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: dateFormat,
        firstDay: 1
    });

    $('#export_to_date_input').on("change", (e) => {
        window.electronAPI.export($('#export_from_date_input').val(), e.target.value)
        $('#export_from_date_input').val("")
        $("#export_to_date_input").val("");
    })
    
    $('#new_entry_type').on("change", (e) => {
        if(e.target.value == "3"){
            for(i = 0; i < 3; ++i)
                $("#new_entry_select_options").prepend('<input type="text" class="new_entry_select_option" required>')
            $("#new_entry_select_options").show()
        }else{
            $("#new_entry_select_options").hide()
            $("#new_entry_select_options").html(
                '<button class="btn btn-secondary" type="button" id="new_entry_select_add_option" ><i class="bi bi-plus-square"></i></button>'
            )
        }
    })

    $('#new_entry_select_add_option').on("click", (e) => {
        $("#new_entry_select_options").prepend('<input type="text" class="new_entry_select_option" required>')
    })

    $('#advanced_new_entry_form').on('submit', (e) => {
        e.preventDefault();

        const entry = {
            description: $('#new_entry_description').val(),
            type: $('#new_entry_type').val(),
            value: ""
        };
        if(entry.type == "3"){
            entry.options = $(".new_entry_select_option").map(function() {
                return this.value
            }).get();
        }
        
        window.electronAPI.addEntry($('#new_entry_title_adv').val(), entry)
    })
});