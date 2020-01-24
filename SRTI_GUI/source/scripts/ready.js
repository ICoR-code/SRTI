// actions to be executed when the document is ready
$(document).ready(() => {
    wrapperFileFolder.onchange = function () {
        var files = wrapperFileFolder.files;
        var totalText = "";
        totalText = totalText + files[0].path;
        wrapperFileFolderText.innerHTML = totalText;
    }

    saveAsFolder.onchange = function () {
        var files = saveAsFolder.files;
        var totalText = "";
        console.log("Listing folder...");
        console.log("value = " + saveAsFolder.value);
        let i = 0;
        for (i = 0; i < saveAsFolder.files.length; i++) {
            console.log("Folder: " + saveAsFolder.files[i].path);
            console.log("Webkit folder: " + saveAsFolder.files[i].webkitRelativePath);
        }

        totalText = totalText + files[0].path;
        saveAsFolderText.innerHTML = totalText;
    }

    importObjectFolder.onchange = function () {
        var files = importObjectFolder.files;

        var filename = "" + files[0].path;
        console.log("file name = " + filename);
        if (filename.includes(".simdef") == true) {
            importFilePath = filename;
            importType = 1;
            importObjectText.innerHTML = "Simulator object chosen!";
        } else if (filename.includes(".mesdef") == true) {
            importFilePath = filename;
            importType = 2;
            importObjectText.innerHTML = "Message object chosen!";
        } else {
            importType = 0;
            importObjectText.innerHTML = "... object type not recognized.";
            //TODO: importObjectPath is not defined. Is it really necessary?
            // importObjectPath = "";
        }
    }

    newServerFile.onchange = function () {
        var files = newServerFile.files;
        var filename = files[0].path.replace(/^.*[\\\/]/, '');
        //filename = filename.replace(".jar", '');
        var path = files[0].path.replace(filename, '');

        serverPath = path;
        serverFileName = filename;
    }

    // Initialize certain buttons and objects.
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-play").disabled = true;
    document.getElementById("btn-stop").disabled = true;
    document.getElementById("btn-pause").disabled = true;
    canvasContainer.addEventListener("mousedown", dragStart, false);
    canvasContainer.addEventListener("mouseup", dragEnd, false);
    canvasContainer.addEventListener("mousemove", drag, false);
    resizePanel(document.getElementById("separator"), "H");
    resizePanel(document.getElementById("separator2"), "H");

    // $('#buttons-simulation').css('left', Math.max(document.getElementById("object-panel").offsetWidth + 15, 176.86))

    UpdateCanvasGrid();
    UpdateSelectedStateButtons(selectState);
    AddProprietaryRTIMessage();

    $('.ui.modal').modal().modal(
        { closable: false, transition: 'fade', autofocus: false }
    )

    // This is a known bug for semantic modals. Deny buttons don't work so we need to explicitly attach events to them
    $('#modalNewObject').modal('attach events', '#modalNewObject .ui.button.deny')
    $('#modalNewSim').modal('attach events', '#modalNewSim .ui.button.deny')


    $('.ui.radio.checkbox').checkbox()
    $('.choose-file').change(function () {
        console.log($(this).val())
        let fileName = $(this).val().replace(/.*[\/\\]/, '')
        $(`span[for=${$(this).attr('id')}]`).text(fileName)
    })


    $('div.dropdown, select.dropdown').dropdown()


    // Form validation
    $('#modalNewSim .ui.form').form({
        fields: {
            NewSimName: 'empty'
            /*NewSimRef: 'empty',
            NewSimExecute: 'empty'*/
        },
        inline: true,
        on: 'blur'
    })
    /*$('#modalNewSim').modal({
        onApprove: function () {
			return false; 
		}
    })*/
	
	$('#modalAbout').modal({
        onApprove: function () { return false }
    })

    //TODO: set default values to time delta time multiplier etc

})