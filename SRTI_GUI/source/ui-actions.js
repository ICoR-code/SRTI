
// $("[name='NewMessageObject']").click(() => { console.log('Here') })


$(document).ready(() => {
    $('.ui.radio.checkbox').checkbox()
    $('.choose-file').change(function () {
        console.log($(this).val())
        let fileName = $(this).val().replace(/.*[\/\\]/, '')
        $(`span[for=${$(this).attr('id')}]`).text(fileName)
    })


    $('div.dropdown, select.dropdown').dropdown()
})