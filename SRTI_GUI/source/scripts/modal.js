// displaying modals and handling input logic in this modals


/*	DisplayOrClosePrompt()
	- General function to display a 'div' with grey overlay, to save code lines elsewhere.
*/
function DisplayOrClosePrompt(promptName, displayType) {
    // document.getElementById(promptName).style.display = displayType;
    if (displayType === 'block') {
        $('#' + promptName).modal('refresh').modal('show')
    }
}

/*	NewObjectPrompt()
	- Display prompt for "Add New Object" (choose sim, message, or 'import')
*/
function NewObjectPrompt() {
    DisplayOrClosePrompt("modalNewObject", "block");
    editExistingObject = null;
}

/*	CloseNewObjectPrompt()
	- Close "Add New Object" prompt (user chose to cancel).
*/
function CloseNewObjectPrompt() {
    DisplayOrClosePrompt("modalNewObject", "none");
}

/*	NewSimulatorObjectPrompt()
	- Display prompt to add details for "new simulator." Can add brand new sim, or edit existing sim in project.
*/

function NewSimulatorObjectPrompt() {
    DisplayOrClosePrompt("modalNewSim", "block");
    if (editExistingObject) {
        document.getElementsByName("NewSimName")[0].value = "";
        document.getElementsByName("NewSimRef")[0].value = "";
        document.getElementsByName("wrapperFileDirText")[0].innerHTML = "";
        document.getElementsByName("NewSimExecute")[0].value = "";
    } else {
        let simulator = simulators.get(editExistingObject)
        document.getElementsByName("NewSimName")[0].value = simulator.name;
        document.getElementsByName("NewSimRef")[0].value = simulator.refName;
        document.getElementsByName("wrapperFileDirText")[0].innerHTML = simulator.filePath;
        document.getElementsByName("NewSimExecute")[0].value = simulator.executeCommand;
    }
}

/*	CloseNewSimulatorObjectPrompt()
	- Close prompt to create/edit new simulator object to project.
*/
function CloseNewSimulatorObjectPrompt() {
    DisplayOrClosePrompt("modalNewSim", "none");
}

/*	NewSimulatorObjectPrompt2()
	- Open second "new simulator" prompt, to add extra details.
*/
function NewSimulatorObjectPrompt2() {
    DisplayOrClosePrompt("modalNewSim2", "block");
    if (editExistingObject) {
        // nothing, it already gets cleared in different location
        $('#modalNewSimulatorPanel1').hide()
        $('#modalNewSimulatorPanel2').hide()
    } else {
        let simulator = simulators.get(editExistingObject)
        simulatorFunctions = simulator.functions;
        variables = simulator.variables;
        UpdateObjectToSimulatorDef();
        UpdateFunctionToSimulatorDef();
    }
}

/*	CloseNewSimulatorObjectPrompt2()
	- Close second "new simulator" prompt.
*/
function CloseNewSimulatorObjectPrompt2() {
    DisplayOrClosePrompt("modalNewSim2", "none");

    variables = new Map();
    simulatorFunctions = new Map();
    $('#modalNewSimulatorPanel1').empty()
    $('#modalNewSimulatorPanel2').empty()
    editExistingObject = null;
}

/*	NewMessageObjectPrompt()
	- Open "new message" prompt to create/edit new message for project.
*/
function NewMessageObjectPrompt() {
    DisplayOrClosePrompt("modalNewMessage", "block");
    if (editExistingObject) {

    } else {
        variables = editExistingObject.variables;
        document.getElementsByName("NewMessageName")[0].value = editExistingObject.name;
        UpdateObjectToMessageDef();
    }
}

/*	CloseNewMessageObjectPrompt()
	- Close "new message" prompt.
*/
function CloseNewMessageObjectPrompt() {
    DisplayOrClosePrompt("modalNewMessage", "none");
    variables = new Map();
    document.getElementsByName("NewMessageName")[0].value = "";
    $('#modalNewMessagePanel1').empty()
    editExistingObject = null;
}

/*	NewPublishConnectionPrompt()
	- Open prompt to add details to a new "publish" connection (sim -> message).
*/
function NewPublishConnectionPrompt(msgObj, simObj) {
    DisplayOrClosePrompt("modalPublishDetails", "block");

    // TODO: pub has not been updated to the same style as sub!

    let messageName = msgObj.name;
    let simulatorName = simObj.name;

    let segment = $('#modalPublishDetailsSegment')
    segment.empty()

    let message = $('<div>').addClass('nine wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    segment.append(message)
    segment.append(simulator)

    let messageVar, label, simVar, dropdown, menu, item, newDropdown
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        varName: ""
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': "",
        text: "(DEFAULT)",
    })

    menu.append(item)

    let data_simulator = simulators.get(simObj.name)


    for (let [name, variable] of data_simulator.variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " (" + variable.valueType + ")",
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of messages.get(messageName).variables) {
        console.log("add variable to list here... " + name);
        messageVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " (" + variable.valueType + ")")

        messageVar.append(label)

        simVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('varName', name)

        simVar.append(newDropdown)

        segment.append(messageVar)
        segment.append(simVar)

        newDropdown.dropdown()
    }

    $('input[name="radioPublishInitial"][value="false"]').parent().checkbox('check')
    $('input[name="textPublishDelta"]').val("1")
}

/*	EditPublishConnectionPrompt()
	- Open prompt to edit existing details to a publish connection ("
*/
function EditPublishConnectionPrompt() {
    // TODO: extract the common logic of edit and new
    DisplayOrClosePrompt("modalPublishDetails", "block");

    let pub = editExistingObject.publishedMessages.get(editExistingObject2);
    let messageName = pub.name;
    let simulatorName = editExistingObject.name;
    let publishedDetail = pub.details;

    let segment = $('#modalPublishDetailsSegment')
    segment.empty()

    let message = $('<div>').addClass('nine wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    segment.append(message)
    segment.append(simulator)

    let messageVar, label, simVar, dropdown, menu, item, newDropdown, dropdowns = []
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        varName: ""
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': "",
        text: "(DEFAULT)",
    })

    menu.append(item)


    for (let [name, variable] of simulators.get(simulatorName).variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " (" + variable.valueType + ")",
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of messages.get(messageName).variables) {
        console.log("add variable to list here... " + name);
        messageVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " (" + variable.valueType + ")")

        messageVar.append(label)

        simVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('varName', name)

        simVar.append(newDropdown)

        segment.append(messageVar)
        segment.append(simVar)

        newDropdown.dropdown()
        dropdowns.push(newDropdown)

        let varName = publishedDetail.get(name).value
        newDropdown.dropdown('set selected', varName ? varName : "")
    }

    $(`input[name="radioPublishInitial"][value="${pub.initial}"]`).parent().checkbox('check')
    $('input[name="textPublishDelta"]').val(pub.timeDelta)
}

/*	SavePublishConnectionPrompt()
	- Save configuration details for publish connection (sim -> message)
*/
function SavePublishConnectionPrompt() {


    // dragItem is the reference to the Simulator
    let newDetails = new Map();
    // list of pairs: [index of message variable, index of simulator variable or -1 for default]
    $('#modalPublishDetailsSegment .dropdown').each(function () {

        let j = parseInt($(this).dropdown('get value'))
        newDetails.set($(this).attr('varName'), { name: $(this).attr('varName'), value: j ? null : j })
    })


    let initial = $('input[name=radioPublishInitial]:checked').val()
    let timeDelta = parseInt($('input[name=textPublishDelta]').val())

    let messageName = $('#modalPublishDetailsSegment .ui.blue.label').text()

    if (editExistingObject) {
        dragItem.publishedMessages.set(messageName, NewPublish(messageName, initial, parseInt(timeDelta), newDetails))
        // by happy accident, "publishedDetails" will contain an entry in the same order as "publishedMessages".
    } else {
        let pub = editExistingObject.publishedMessages.get(messageName)
        pub.details = newDetails;
        pub.initial = initial;
        pub.timeDelta = parseInt(timeDelta);
    }
    ClosePublishConnectionPrompt();
}

/*	ClosePublishConnectionPrompt()
	- Close prompt to add new/edit "publish connection" (sim -> message) 
*/
function ClosePublishConnectionPrompt() {
    DisplayOrClosePrompt("modalPublishDetails", "none");

    dragItem = null;
    editExistingObject = null;
    editExistingObject2 = null;
    var radioList = document.getElementsByName("radioPublishInitial");
    // TODO: use jquery to avoid loop
    for (let i = 0; i < radioList.length; i++) {
        if (radioList[i].checked) {
            radioList[i].checked = false;
        }
    }
    document.getElementsByName("textPublishDelta")[0].value = "";
}

/* 	NewSubscribeConnectionPrompt()
	- Open prompt to create new "subscribe" connection (message -> sim)	 
*/
function NewSubscribeConnectionPrompt(msgObj, simObj) {
    DisplayOrClosePrompt("modalSubscribeDetails", "block");

    let messageName = msgObj.name;
    let simulatorName = simObj.name;

    let segment = $('#modalSubscribeDetailsSegment')
    segment.empty()

    let simulator = $('<div>').addClass('nine wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    segment.append(simulator)
    segment.append(message)

    let messageVar, label, simVar, dropdown, menu, item, newDropdown
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        varName: "",
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': "",
        text: "(DEFAULT)",
    })

    menu.append(item)


    for (let [name, variable] of messages.get(messageName).variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " (" + variable.valueType + ")",
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of simulators.get(simObj.name).variables) {
        console.log("add variable to list here... " + name);
        simVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " (" + variable.valueType + ")")

        simVar.append(label)

        messageVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('varName', name)

        messageVar.append(newDropdown)

        segment.append(simVar)
        segment.append(messageVar)

        newDropdown.dropdown()
    }

    $('input[name="radioSubscribeInitial"][value="false"]').parent().checkbox('check')
    $('input[name="textSubscribeDelta"]').val("1")
    $('input[name="textSubscribeRelative"]').val("0")
    $('input[name="textSubscribeTimestep"]').val("0")
}

/*	EditSubscribeConnectionPrompt()
	- Open prompt to edit "subscribe" connection (message -> sim)
*/
function EditSubscribeConnectionPrompt() {
    // TODO: extract the common logic of edit and new
    DisplayOrClosePrompt("modalSubscribeDetails", "block");

    let sub = editExistingObject.subscribedMessages.get(editExistingObject2);
    let messageName = sub.name;
    let simulatorName = editExistingObject.name;
    let subscribedDetail = sub.details

    let segment = $('#modalSubscribeDetailsSegment')
    segment.empty()

    let simulator = $('<div>').addClass('nine wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    segment.append(simulator)
    segment.append(message)

    let messageVar, label, simVar, dropdown, menu, item, newDropdown, dropdowns = []
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        varName: ""
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': "",
        text: "(DEFAULT)",
    })

    menu.append(item)


    for (let [name, variable] of messages.get(messageName).variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " (" + variable.valueType + ")",
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of simulators.get(simulatorName).variables) {
        console.log("add variable to list here... " + name);
        simVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " (" + variable.valueType + ")")

        simVar.append(label)

        messageVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('varName', name)

        messageVar.append(newDropdown)

        segment.append(simVar)
        segment.append(messageVar)

        newDropdown.dropdown()
        dropdowns.push(newDropdown)

        let varName = subscribedDetail.get(name).value
        newDropdown.dropdown('set selected', varName ? varName : "")
    }


    $(`input[name="radioSubscribeInitial"][value="${sub.initial}"]`).parent().checkbox('check')
    $('input[name="textSubscribeDelta"]').val(sub.timeDelta)
    $('input[name="textSubscribeRelative"]').val(sub.relative)
    $('input[name="textSubscribeTimestep"]').val(sub.timestep)
}

/*	SaveSubscribeConnectionPrompt()
	- Save config of subscribe connection (message -> sim)
*/
function SaveSubscribeConnectionPrompt() {
    // dragItem is the reference to the Simulator
    console.log("saving subscribe data...");
    let newDetails = new Map();
    $('#modalSubscribeDetailsSegment .dropdown').each(function () {
        let j = parseInt($(this).dropdown('get value'))
        newDetails.set($(this).attr('varName'), { name: $(this).attr('varName'), value: j ? null : j })
    })

    let initial = $('input[name=radioSubscribeInitial]:checked').val()
    let timeDelta = parseInt($('input[name=textSubscribeDelta]').val())
    let relative = parseInt($('input[name=textSubscribeRelative]').val())
    let timestep = parseInt($('input[name=textSubscribeTimestep]').val())

    let messageName = $('#modalSubscribeDetailsSegment .ui.blue.label').text()

    if (editExistingObject) {
        dragItem.subscribedMessage.set(messageName, NewSubscribe(
            messageName, initial, parseInt(timeDelta), parseInt(relative), parseInt(timestep), newDetails))
    } else {
        let sub = editExistingObject.subscribedMessages.get(messageName)

        sub.details = newDetails;
        sub.initial = initial;
        sub.timeDelta = parseInt(timeDelta);
        sub.relative = parseInt(relative);
        sub.timestep = parseInt(timestep);
    }
    CloseSubscribeConnectionPrompt();
}

/*	CloseSubscribeConnectionPrompt()
	- Close subscribe-connection prompt (message -> sim)
*/
function CloseSubscribeConnectionPrompt() {
    DisplayOrClosePrompt("modalSubscribeDetails", "none");

    dragItem = null;
    editExistingObject = null;
    editExistingObject2 = null;
    var radioList = document.getElementsByName("radioSubscribeInitial");
    // TODO: use jquery
    for (let i = 0; i < radioList.length; i++) {
        if (radioList[i].checked) {
            radioList[i].checked = false;
        }
    }
    document.getElementsByName("textSubscribeDelta")[0].value = "";
    document.getElementsByName("textSubscribeRelative")[0].value = "";
    document.getElementsByName("textSubscribeTimestep")[0].value = "";
}

/*	ImportObjectPrompt()
	- Open prompt to import an existing object.
*/
function ImportObjectPrompt() {
    DisplayOrClosePrompt("modalImportObject", "block");
}


/*	ImportObject()
	- Import a object file (simulator or message).
*/
function ImportObject() {
    var content = "Hello world! \na simple test.";
    // 'fs' is for filesystem, comes with Electron (or, as included within it, Node.js)
    var fs = require('fs');
    try {
        if (importType > 0) {
            content = fs.readFileSync(importFilePath, 'utf-8');
        }
    } catch (e) {
        alert('failed to open project file!');
        return;
    }
    var obj = JSON.parse(content);
    if (importType == 1) {
        let simulator = ConvertSimulator(obj.simdef)
        simulators.set(obj.simdef.name, simulator);
        AppendObjectToSubPanel1(simulator)
    } else if (importType == 2) {
        let message = ConvertMessage(obj.mesdef)
        messages.set(obj.mesdef.name, message);
        AppendObjectToSubPanel2(message)
    }
    CloseImportObjectPrompt();
}

/*	CloseImportObjectPrompt()
	- Close import-object prompt.
*/
function CloseImportObjectPrompt() {
    DisplayOrClosePrompt("modalImportObject", "none");
}

/*	AddNewObject()
	- Make a decision to what type of "new" object to add (new sim, new message, import).
*/
function AddNewObject() {
    /* Does user want to add a new simulator, a new message, or import an existing external object? */
    console.log("User wants to add a new object of some kind...");
    var radioList = document.getElementsByName("NewObject");
    let i = 0;
    for (i = 0; i < radioList.length; i++) {
        if (radioList[i].checked) {
            newObjectSelection = radioList[i].value;
            radioList[i].checked = false;
            break;
        }
    }
    CloseNewObjectPrompt();
    if (newObjectSelection == "Simulator") {
        NewSimulatorObjectPrompt();
    }
    if (newObjectSelection == "MessageDefinition") {
        NewMessageObjectPrompt();
    }
    if (newObjectSelection == "Import") {
        ImportObjectPrompt();
    }
}

/*	AddNewObjectSimulator()
	- Add new simulator to project (prompt).
*/
function AddNewObjectSimulator() {
    console.log("User wants to add a new simulator.");
    CloseNewSimulatorObjectPrompt();
    NewSimulatorObjectPrompt2();
}

/*	AddNewObjectSimulator2()
	- Finish adding simulator object to project, close prompt.
*/
function AddNewObjectSimulator2() {
    console.log("User finished providing extra details about simulator. Add it now.");
    var newSimName = document.getElementsByName("NewSimName")[0].value;
    var newRefName = document.getElementsByName("NewSimRef")[0].value;
    var newFilePath = document.getElementsByName("wrapperFileDirText")[0].innerHTML;
    var newExecute = document.getElementsByName("NewSimExecute")[0].value;
    if (editExistingObject) {
        simulators.set(newSimName, NewSimulator(
            newSimName,
            newRefName, newFilePath, newExecute,
            simulatorFunctions, variables
        ));
    } else {
        let simulator = editExistingObject
        simulator.name = newSimName;
        simulator.refName = newRefName;
        simulator.filePath = newFilePath;
        simulator.executeCommand = newExecute;
        simulator.functions = simulatorFunctions;
        simulator.variables = variables;
        for (let simObj of simulator.objects) {
            simObj.name = newSimName;
            simObj.objectRef.innerHTML = newSimName;
        }

    }

    ResetObjectSubPanel1()
    if (selectState == 0) {
        DisableCertainObjectButtons();
    }
    CloseNewSimulatorObjectPrompt2();
}

/*	AddNewObjectMessage()
	- Add new message object to project (close relative prompt).
*/
function AddNewObjectMessage() {
    console.log("User wants to add a new message.");
    var panel = document.getElementById("objects-subpanel2");
    while (panel.firstChild) {
        panel.removeChild(panel.firstChild);
    }
    var newMessageName = document.getElementsByName("NewMessageName")[0].value;
    if (editExistingObject) {
        messages.set(newMessageName, NewMessage(newMessageName, variables));
    } else {
        var originalName = editExistingObject.name;
        editExistingObject.name = newMessageName;
        editExistingObject.variables = variables;

        let msgObj = messageObjects.get(originalName)
        msgObj.name = newMessageName
        msgObj.objectRef.innerHTML = newMessageName
    }
    ResetObjectSubPanel2()
    if (selectState == 0) {
        DisableCertainObjectButtons();
    }
    CloseNewMessageObjectPrompt();
}

/*	AddObjectToMessageDef()
	- Add variable object to message (during defining a new message for the project).
*/
function AddObjectToMessageDef() {
    let newMessageVarName = $('[name="NewMessageObjectName"]').val()
    $('[name="NewMessageObjectName"]').val('')
    if (!variables.has(newMessageVarName)) {
        let newMessageVarType = $('.checked').find('input[name="NewMessageObject"]').attr('value')
        variables.set(newMessageVarName, NewVariable(newMessageVarName, newMessageVarType));
        let panel = $('#modalNewMessagePanel1')
        if (variables.size === 1) {
            panel.show()
        }

        let child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').html(`<code>${newMessageVarName}</code> (${newMessageVarType})`).attr('style', 'vertical-align:sub;'))
        var button = $('<button>', {
            class: "ui compact icon button right floated", name: newMessageVarName
        }).data('pointer', child).click(
            function () {
                RemoveObjectToMessageDef($(this).data('pointer'), $(this).attr('name'))
            }
        )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)
    }

    CheckEnableObjectToMessageDef();
    CheckEnableSubmitObject();
    // UpdateObjectToMessageDef();
}

/*	AddObjectToSimulatorDef()
	- Add variable object to message (during defining a new simulator for the project).
*/
function AddObjectToSimulatorDef() {
    let newVariableName = $('[name="NewSimulatorObjectName"]').val()
    $('[name="NewSimulatorObjectName"]').val('')
    if (!variables.has(newVariableName)) {
        let newVariableType = $('.checked').find('input[name="NewSimulatorObject"]').attr('value')
        variables.set(newVariableName, NewVariable(newVariableName, newVariableType));
        let panel = $('#modalNewSimulatorPanel1')
        if (variables.size >= 1) {
            panel.show()
        }

        let child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').html(`<code>${newVariableName}</code> (${newVariableType})`).attr('style', 'vertical-align:sub;'))
        var button = $('<button>', {
            class: "ui compact icon button right floated", name: newVariableName
        }).data('pointer', child).click(
            function () {
                RemoveObjectToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
            }
        )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)
    }


    CheckEnableObjectToSimulatorDef();
}

/*	UpdateObjectToSimulatorDef()
	- Update view of variable objects in simulator def (during defining a new simulator).
*/
function UpdateObjectToSimulatorDef() {
    let panel = $('#modalNewSimulatorPanel1')
    for (let [name, variable] of variables) {
        var child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').html(`<code>${name}</code> (${variable.valueType})`).attr('style', 'vertical-align:sub;'))
        var button = $('<button>').addClass('ui compact icon button right floated').attr('name', name).data('pointer', child).click(
            function () {
                RemoveObjectToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
            }
        )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)
    }

    if (variables.size > 0) {
        panel.show()
    } else {
        panel.hide()
    }

    CheckEnableObjectToMessageDef();
}

/*	UpdateObjectToMessageDef()
	- Update view of variable objects in message def (during defining a new message).
*/
function UpdateObjectToMessageDef() {
    let panel = $('#modalNewMessagePanel1')
    for (let [name, variable] of variables) {
        var child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').html(`<code>${name}</code> (${variable.valueType})`).attr('style', 'vertical-align:sub;'))
        var button = $('<button>').addClass('ui compact icon button right floated').attr('name', name).data('pointer', child).click(
            function () {
                RemoveObjectToMessageDef($(this).data('pointer'), $(this).attr('name'))
            }
        )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)
    }

    if (variables.size > 0) {
        panel.show()
    } else {
        panel.hide()
    }

    CheckEnableObjectToMessageDef();
    CheckEnableSubmitObject();
}

/*	RemoveObjectToMessageDef()
	- Remove variable object from message (when defining message for project).
*/
function RemoveObjectToMessageDef(child, btn_id) {
    console.log("Removing object from list.");
    variables.delete(btn_id)

    child.remove()

    if (variables.size === 0) {
        $('#modalNewMessagePanel1').hide()
    }

    // UpdateObjectToMessageDef();
}
/*	RemoveObjectToSimulatorDef()
	- Remove variable object from simulator (when defining simulator for project).
*/
function RemoveObjectToSimulatorDef(child, btn_id) {

    console.log("Removing object from list.");
    variables.delete(btn_id)

    child.remove()

    if (variables.size === 0) {
        $('#modalNewSimulatorPanel1').hide()
    }
}

/*	CheckEnableObjectToMessageDef()
	- In prompt to add new message, check when to make certain buttons active.
*/
function CheckEnableObjectToMessageDef() {
    var btnToEnable = document.getElementsByName("btnAddObjectToMessage")[0];

    var nameTextBox = document.getElementsByName("NewMessageObjectName")[0].value;

    btnToEnable.disabled = nameTextBox.length == 0
}

/*	CheckEnableObjectToSimulatorDef()
	- In prompt to add new simulator, check when to make certain buttons active.
*/
function CheckEnableObjectToSimulatorDef() {
    var btnToEnable = document.getElementsByName("btnAddObjectToSimulator")[0];

    var nameTextBox = document.getElementsByName("NewSimulatorObjectName")[0].value;

    console.log("Checking to enable it... length is = " + nameTextBox.length + ", text is = " + nameTextBox);
    btnToEnable.disabled = nameTextBox.length == 0

}

/*	CheckEnableSubmitObject()
	- In prompt to add new message, check when to finish defining message.
*/
function CheckEnableSubmitObject() {
    var btnToEnable = document.getElementsByName("btn-new-message-confirm")[0];
    var nameEntered = false;
    var nameTextBox = document.getElementsByName("NewMessageName")[0].value;
    if (nameTextBox.length > 0) {
        nameEntered = true;
    }

    if (nameEntered == true) {
        btnToEnable.disabled = false;
    } else {
        btnToEnable.disabled = true;
    }
}

/*	CheckEnableFunctionToSimulatorDef()
	- Check whether to enable 'function' button to add to simulator definition.
*/
function CheckEnableFunctionToSimulatorDef() {
    var btnToEnable = document.getElementsByName("btnAddFunctionToSimulator")[0];
    var nameEntered = false;
    var nameTextBox = document.getElementsByName("NewSimulatorFunctionName")[0].value;
    if (nameTextBox.length > 0) {
        nameEntered = true;
    }
    if (nameEntered == true) {
        btnToEnable.disabled = false;
    } else {
        btnToEnable.disabled = true;
    }
}

/*	AddFunctionToSimulatorDef()
	- Add function to simulator definition, when describing new simulator for project.
*/
function AddFunctionToSimulatorDef() {
    let newMessageFunctionName = $('[name="NewSimulatorFunctionName"]').val()
    $('[name="NewSimulatorFunctionName"]').val("")
    if (!simulatorFunctions.has(newMessageFunctionName)) {
        simulatorFunctions.set(newMessageFunctionName, NewFunction(newMessageFunctionName));

        let panel = $('#modalNewSimulatorPanel2')
        if (simulatorFunctions.size === 1) {
            panel.show()
        }

        let child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').addClass('code').html(newMessageFunctionName).attr('style', 'vertical-align:sub;'))
        var button = $('<button>', {
            class: "ui compact icon button right floated", name: newMessageFunctionName
        }).data('pointer', child).click(
            function () {
                console.log("onclick at index = " + this.id);
                RemoveFunctionToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
            }
        )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)

    }
    CheckEnableObjectToSimulatorDef();
}

/*	UpdateFunctionToSimulatorDef()
	- Update view of function list in simulator-definition prompt.
*/
function UpdateFunctionToSimulatorDef() {
    let panel = $('#modalNewSimulatorPanel2')
    let key, value
    for ([key, value] of simulatorFunctions) {
        var child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').addClass('code').text(key).attr('style', 'vertical-align:sub;'))
        var button = $('<button>').addClass('ui compact icon button right floated').attr('name',
            key).data('pointer', child).click(
                function () {
                    console.log("onclick at index = " + this.name);
                    RemoveFunctionToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
                }
            )
        button.append($('<i>').addClass('times icon'))
        child.append(button)
        panel.append(child)
    }

    if (simulatorFunctions.size > 0) {
        panel.show()
    } else {
        panel.hide()
    }

    CheckEnableFunctionToSimulatorDef();
}

/*	RemoveFunctionToSimulatorDef()
	- Remove function from list on simulator definition prompt.
*/
function RemoveFunctionToSimulatorDef(child, btn_id) {
    simulatorFunctions.delete(btn_id)

    child.remove()

    if (simulatorFunctions.size === 0) {
        $('#modalNewSimulatorPanel2').hide()
    }
}

/*	EditSimLocalTime()
	- Edit configuration element (show prompt) for simulator on canvas ('local time' relative to system time).
*/
function EditSimLocalTime() {
    DisplayOrClosePrompt("modalLocalTime", "block");


    $('input[name="newTimeDelta"]').val(editExistingObject.timeDelta)
    $('input[name="newTimeScale"]').val(editExistingObject.timeScale)

    let dropdown = $('#dropdownVar .menu')
    dropdown.empty()

    let item
    for (let [name, variable] of simulators.get(editExistingObject.name).variables) {
        item = $('<div>').addClass('item').html(
            `<code>${name}</code> (${variable.valueType})`
        )
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")

    dropdown.append(item)
    if (editExistingObject.timeVarDelta == "") {
        $('#dropdownVar').dropdown('set selected', "''")
    } else {
        $('#dropdownVar').dropdown('set selected', editExistingObject.timeVarDelta)
    }

}

/*	CloseEditSimLocalTime()
	- Close simulator configuration (local time) prompt.
*/
function CloseEditSimLocalTime() {
    DisplayOrClosePrompt("modalLocalTime", "none");
    editExistingObject = null;
}

/*	EditServer()
	- Edit configuration of Server (port number), open prompt.
*/
function EditServer() {
    DisplayOrClosePrompt("modalServer", "block");

    if (hostName == 'localhost') {
        $('input[name="HostNameObject"][value="localhost"]').parent().checkbox('check')
    } else {
        $('input[name="HostNameObject"][value="network"]').parent().checkbox('check')
    }

    $('input[name="PortNumberObject"]').val(portNumber)
}

function SaveEditServer() {
    hostName = $('input[name="HostNameObject"]:checked').val()
    if (hostName != 'localhost') {
        hostName = "123.456.78.9"
    }
    portNumber = $('input[name="PortNumberObject"]').val()

    CloseEditServer()
}

/*	CloseEditServer()
	- Close prompt to edit configuration of Server.
*/
function CloseEditServer() {
    DisplayOrClosePrompt("modalServer", "none");

    ConfigureClearInspectorPanel();

    let panel = $('#inspector-panel')
    let header = $('<div>').addClass('ui compact segment')
    header.append($('<h3>').text('RTI Server'))

    let content = $('<div>').addClass('ui compact segment')
    let button = $('<button>').addClass('ui blue basic button').text('Change Launch Parameters')
    button.click(() => {
        EditServer();
    })
    content.append($('<p>').text("Host Name: " + hostName))
    content.append($('<p>').text("Port Number: " + portNumber))
    content.append(button)

    panel.append(header)
    panel.append(content)
}

/*	EditSimulateFunctions()
	- Edit configuration (functions) for simulator on canvas (open prompt).
*/
function EditSimulateFunctions() {
    DisplayOrClosePrompt("modalSimulateFunctions", "block");

    console.log('index ' + editExistingObject)

    let dropdown = $('#dropdownInitializeFunction .menu')
    dropdown.empty()

    let item
    for (let [name, fn] of simulators.get(editExistingObject.name).functions) {
        item = $('<div>').addClass('item').append($('<code>').text(name))
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")

    dropdown.append(item)
    $('#dropdownInitializeFunction').dropdown().dropdown('set selected', editExistingObject.initialize)

    dropdown = $('#dropdownSimulateFunction .menu')
    dropdown.empty()
    for (let [name, fn] of simulators.get(editExistingObject.name).functions) {
        item = $('<div>').addClass('item').append($('<code>').text(name))
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")
    dropdown.append(item)

    $('#dropdownSimulateFunction').dropdown().dropdown('set selected', editExistingObject.simulate)

    $('input[name="SimulateFunctionTimestepDelta"]').val(editExistingObject.simulateTimeDelta)
}

/*	CloseSimulateFunctions()
	- Close prompt to edit configuration of simulator on canvas (functions).
*/
function CloseSimulateFunctions() {
    DisplayOrClosePrompt("modalSimulateFunctions", "none");
}

/*
	SaveSimulateFunctionTimeDelta()
	- Save configuration value (time delta) inside configuration prompt for simulator.
*/
function SaveSimulateFunction() {
    editExistingObject.initialize = $('#dropdownInitializeFunction').dropdown('get value')
    editExistingObject.simulate = $('#dropdownSimulateFunction').dropdown('get value')

    let newTimeDelta = $('input[name="SimulateFunctionTimestepDelta"]').val()
    editExistingObject.simulateTimeDelta = parseInt(newTimeDelta);
    CloseSimulateFunctions()
}

/*	EditStageConditions()
	- Edit configuration (show prompt) on simulator for when stage transition should occur.
*/
function EditStageConditions() {
    DisplayOrClosePrompt("modalStageConditions", "block");

    $('#dropdownStageConditionPickVar1 .menu, #dropdownStageConditionPickVar2 .menu').each(function (index) {
        let dropdown = $(this)
        dropdown.empty()

        let item
        for (let [name, variable] of simulators.get(editExistingObject.name).variables) {
            item = $('<div>').addClass('item').html('<code>' + name +
                "</code> (" + variable.valueType + ")")
            item.attr('data-value', name)
            dropdown.append(item)
        }

        dropdown.parent().dropdown({
            action: 'activate',
            onChange: function (value, text, $item) {
                if (value) {
                    $('#' + $(this).attr('for')).html('<code>' + value + '</code>')
                    $(`.dropdown[for="${$(this).attr('for')}"]`).not('#' + $(this).attr('id')).dropdown('clear')
                    $(`input[for="${$(this).attr('for')}"]`).val('').blur()
                    if ($(this).attr('for').endsWith('3')) {
                        stageConditionV3b = value
                        stageConditionV3a = ""
                    }

                }
            }
        }).dropdown('clear')
    })

    $('#dropdownStageConditionPickRTIVar1 .menu, #dropdownStageConditionPickRTIVar2 .menu').each(function (index) {
        let dropdown = $(this)
        dropdown.empty()

        let item
        for (let variable of ["RTI_vTimestep", "RTI_stage", "RTI_stageVTimestepMul", "RTI_stageVTimestep"]) {
            item = $('<div>').addClass('item').append($('<code>').text(variable))
            item.attr(variable)
            dropdown.append(item)
        }

        dropdown.parent().dropdown({
            action: 'activate',
            onChange: function (value, text, $item) {
                if (value) {
                    $('#' + $(this).attr('for')).html('<code>' + value + '</code>')
                    $(`.dropdown[for="${$(this).attr('for')}"]`).not('#' + $(this).attr('id')).dropdown('clear')
                    $(`input[for="${$(this).attr('for')}"]`).val('').blur()
                    if ($(this).attr('for').endsWith('3')) {
                        stageConditionV3b = value
                        stageConditionV3a = ""
                    }

                }
            }
        }).dropdown('clear')
    })

    let dropdown = $('#dropdownStageConditionCondition1 .menu')
    dropdown.empty()

    let item
    for (let variable of ["==", "!=", ">", "<", ">=", "<="]) {
        item = $('<div>').addClass('item').append($('<code>').text(variable))
        item.attr(variable)
        dropdown.append(item)
    }

    dropdown.parent().dropdown({
        action: 'activate',
        onChange: function (value, text, $item) {
            if (value) {
                $('#' + $(this).attr('for')).html(value)
            }
        }
    }).dropdown('clear')

    let input = $('input[name="TextStageConditionsPickValue2"]')
    input.keyup(function () {
        if ($(this).val()) {
            $('#' + $(this).attr('for')).text($(this).val())
            $(`.dropdown[for="${$(this).attr('for')}"]`).dropdown('clear')
            stageConditionV3a = $(this).val()
            stageConditionV3b = ""
        }
    }
    )
    input.val('').blur()

    stageConditionV1 = "";
    stageConditionV2 = "";
    stageConditionV3 = "";
    stageConditionV3a = "";
    stageConditionV3b = "";
    $('#stageCondition1, #stageCondition2, #stageCondition3').text('')

    ResetStageConditionPanel()
}

/*	CloseStageConditions()
	- Close prompt to configure stage conditions for simulator on canvas.
*/
function CloseStageConditions() {
    DisplayOrClosePrompt("modalStageConditions", "none");
}

/* EditEndConditions()
	- Prompt to edit configuration for simulator (define when to transition to end system execution).
*/
function EditEndConditions() {
    DisplayOrClosePrompt("modalEndConditions", "block");

    $('#dropdownEndConditionPickVar1 .menu, #dropdownEndConditionPickVar2 .menu').each(function (index) {
        let dropdown = $(this)
        dropdown.empty()

        let item
        for (let [name, variable] of simulators.get(editExistingObject.name).variables) {
            item = $('<div>').addClass('item').text(name +
                " (" + variable.valueType + ")")
            item.attr('data-value', name)
            dropdown.append(item)
        }

        dropdown.parent().dropdown({
            action: 'activate',
            onChange: function (value, text, $item) {
                if (value) {
                    $('#' + $(this).attr('for')).text(value)
                    $(`.dropdown[for="${$(this).attr('for')}"]`).not('#' + $(this).attr('id')).dropdown('clear')
                    $(`input[for="${$(this).attr('for')}"]`).val('').blur()
                    if ($(this).attr('for').endsWith('3')) {
                        stageConditionV3b = value
                        stageConditionV3a = ""
                    }

                }
            }
        }).dropdown('clear')
    })

    $('#dropdownEndConditionPickRTIVar1 .menu, #dropdownEndConditionPickRTIVar2 .menu').each(function (index) {
        let dropdown = $(this)
        dropdown.empty()

        let item
        for (let variable of ["RTI_vTimestep", "RTI_stage", "RTI_stageVTimestepMul", "RTI_stageVTimestep"]) {
            item = $('<div>').addClass('item').text(variable)
            item.attr(variable)
            dropdown.append(item)
        }

        dropdown.parent().dropdown({
            action: 'activate',
            onChange: function (value, text, $item) {
                if (value) {
                    $('#' + $(this).attr('for')).text(value)
                    $(`.dropdown[for="${$(this).attr('for')}"]`).not('#' + $(this).attr('id')).dropdown('clear')
                    $(`input[for="${$(this).attr('for')}"]`).val('').blur()
                    if ($(this).attr('for').endsWith('3')) {
                        stageConditionV3b = value
                        stageConditionV3a = ""
                    }

                }
            }
        }).dropdown('clear')
    })

    let dropdown = $('#dropdownEndConditionCondition1 .menu')
    dropdown.empty()

    let item
    for (let variable of ["==", "!=", ">", "<", ">=", "<="]) {
        item = $('<div>').addClass('item').text(variable)
        item.attr(variable)
        dropdown.append(item)
    }

    dropdown.parent().dropdown({
        action: 'activate',
        onChange: function (value, text, $item) {
            if (value) {
                $('#' + $(this).attr('for')).html(value)
            }
        }
    }).dropdown('clear')

    let input = $('input[name="TextEndConditionsPickValue2"]')
    input.keyup(function () {
        if ($(this).val()) {
            $('#' + $(this).attr('for')).text($(this).val())
            $(`.dropdown[for="${$(this).attr('for')}"]`).dropdown('clear')
            stageConditionV3a = $(this).val()
            stageConditionV3b = ""
        }
    }
    )
    input.val('').blur()

    stageConditionV1 = "";
    stageConditionV2 = "";
    stageConditionV3 = "";
    stageConditionV3a = "";
    stageConditionV3b = "";
    $('#endCondition1, #endCondition2, #endCondition3').text('')

    ResetEndConditionList();
}

/*	CloseEndConditions()
	- Close prompt to configure end conditions for simulator on canvas.
*/
function CloseEndConditions() {
    DisplayOrClosePrompt("modalEndConditions", "none");
}

function SaveSimLocalTime() {
    editExistingObject.timeDelta = parseInt($('input[name="newTimeDelta"]').val())
    editExistingObject.timeScale = parseInt($('input[name="newTimeScale"]').val())
    editExistingObject.timeVarDelta = $('#dropdownVar').dropdown('get value')

    CloseEditSimLocalTime()
}

/*	AddStageConditionToSubList()
	- In prompt, add 'completed' stage condition to list (where multiple AND conditions can be added before final submission).
*/
function AddStageConditionToSubList() {
    let conditions = NewCondition(
        $('#stageCondition1').text(),
        unescape($('#stageCondition2').text()),
        stageConditionV3a,
        stageConditionV3b
    )
    stageConditionSubSet.add(conditions);

    AppendStageConditionToSubPanel(conditions)
}

/*	RemoveStageConditionFromSubList()
	- In prompt, remove stage condition to list (where multiple AND conditions can be added before final submission).
*/
function RemoveStageConditionFromSubList(elem, condition) {
    stageConditionSubSet.delete(condition);

    elem.remove()

}

function AppendStageConditionToSubPanel(condition) {

    let subpanel = $("#modalStageConditionsSubPanel")
    let item, label, text, button, icon

    item = $('<div>').addClass('div-list-item')
    label = $('<div>').addClass('ui grey expanding middle aligned label')
    if (!condition.varName2) {
        text = "if [<code>" + condition.varName + " " +
            condition.condition + " " + condition.value + "</code>] AND ..."
    } else {
        text = "if [<code>" + condition.varName + " " +
            condition.condition + " " + condition.varName2 + "</code>] AND ..."
    }
    label.append($('<label>').html(text).css('max-width', '95%'))
    button = $('<a>').addClass('ui opaque right floated')
    icon = $('<i>').addClass('inverted delete icon').data('ref', item).data('data', condition).click(function () {
        RemoveStageConditionFromSubList($(this).data('ref'), $(this).data('condition'));
    }
    )

    button.append(icon)
    label.append(button)
    item.append(label)
    subpanel.append(item)
}

function ResetStageConditionSubPanel() {

    let subpanel = $("#modalStageConditionsSubPanel");
    subpanel.empty()

    for (let conditions of stageConditionSubSet) {
        AppendStageConditionToSubPanel(conditions)
    }
}

/*	AddStageConditionToList()
	- In prompt, add 'completed' stage condition set to final list.
*/
function AddStageConditionToList() {
    let newStage = document.getElementsByName("TextStageConditionsNewStage")[0].value;
    let conditions = NewStageConditions(stage, newStage, stageConditionSubSet)
    simulators.get(editExistingObject.name).stageConditions.add(conditions)


    AppendStageConditionToPanel(conditions)

    stageConditionSubSet = new Set();
    ResetStageConditionSubPanel()
}

/*	RemoveStageConditionFromList()
	- In prompt, remove stage condition set from final list.
*/
function RemoveStageConditionFromList(elem, conditions) {
    let simulator = simulators.get(editExistingObject.name);
    simulator.stageConditions.delete(conditions)

    elem.remove()

}

function AppendStageConditionToPanel(conditions) {
    let panel = $('#modalStageConditionsPanel')

    let item, label, sentence, button, icon
    item = $('<div>').addClass('div-list-item')
    label = $('<div>').addClass('ui grey expanding label')
    sentence = "in stage " + conditions.oldStage + ", ";
    let j = 0;
    for (let condition of conditions.conditions) {
        var tempVarName2 = condition.varName2;

        if (!tempVarName2) {
            sentence = sentence + "if [<code>" + condition.varName +
                " " + condition.condition + " " + condition.value + "</code>] ";
        } else {
            sentence = sentence + "if [<code>" + condition.varName +
                " " + condition.condition + " " + condition.varName2 + "</code>] ";
        }
        if (j < conditions.conditions.size - 1) {
            sentence = sentence + "AND ";
        }
        j += 1
    }
    sentence = sentence + "go to stage " + conditions.newStage;
    label.append($('<label>').text(sentence).css('max-width', '95%'))

    button = $('<a>').addClass('ui opaque right floated')
    icon = $('<i>').addClass('inverted delete icon').data('ref', item).data('data', conditions).click(function () {
        RemoveStageConditionFromList($(this).data('ref'), $(this).data('data'));
    }
    )

    button.append(icon)
    label.append(button)
    item.append(label)
    panel.append(item)

}

function ResetStageConditionPanel() {

    let panel = $('#modalStageConditionsPanel')
    panel.empty()

    var simulatorObjectName = editExistingObject.name;


    // TODO: this or the stageConditionSet?
    for (let conditions of simulators.get(simulatorObjectName).stageConditions) {
        AppendStageConditionToPanel(conditions)
    }
}

/*	AddEndConditionToSubList()
	- In prompt, add end condition to sublist (where AND conditions are collected).
*/
function AddEndConditionToSubList() {
    let condition = NewCondition(
        $('#endCondition1').text(),
        unescape($('#endCondition2').text()),
        stageConditionV3a,
        stageConditionV3b
    )
    stageConditionSubSet.add(condition);

    AppendEndConditionToSubPanel(condition)
}

/*	RemoveEndConditionFromSubList()
	- In prompt, remove end condition from sublist (where AND conditions are collected).
*/
function RemoveEndConditionFromSubList(elem, condition) {
    stageConditionSubSet.delete(condition);

    elem.remove()

}

function AppendEndConditionToSubPanel(condition) {
    let subpanel = $("#modalEndConditionsSubPanel");
    let item, label, text, button, icon;
    item = $('<div>').addClass('div-list-item')
    label = $('<div>').addClass('ui grey expanding middle aligned label')
    if (!condition.varName2) {
        text = "if [" + condition.varName + "] [" +
            condition.condition + "] [" + condition.value + "] AND ..."
    } else {
        text = "if [" + condition.varName + "] [" +
            condition.condition + "] [" + condition.varName2 + "] AND ..."
    }
    label.append($('<label>').text(text).css('max-width', '95%'))
    button = $('<a>').addClass('ui opaque right floated')
    icon = $('<i>').addClass('inverted  delete icon').data('ref', item).data('data', condition).click(function () {
        RemoveEndConditionFromSubList($(this).data('ref'), $(this).data('condition'));
    }
    )

    button.append(icon)
    label.append(button)
    item.append(label)
    subpanel.append(item)
}

function ResetEndConditionSubPanel() {
    let subpanel = $("#modalEndConditionsSubPanel");
    subpanel.empty()

    for (let condition of stageConditionSubSet) {
        AppendEndConditionToSubPanel(condition)
    }
}

/*	AddEndConditionToSubList()
	- In prompt, add end condition to list.
*/
function AddEndConditionToList() {
    let conditions = NewEndConditions(stageConditionSubSet)
    simulators.get(editExistingObject.name).endConditions.add(conditions)

    AppendEndConditionToPanel(conditions)

    stageConditionSubSet = new Set();
    ResetEndConditionSubPanel()

}

/*	RemoveEndConditionFromList()
	- In prompt, remove end condition from list.
*/
function RemoveEndConditionFromList(elem, conditions) {
    let simulator = simulators.get(editExistingObject.name);
    simulator.endConditions.delete(conditions)

    elem.remove()
}

function AppendEndConditionToPanel(conditions) {
    let panel = $('#modalEndConditionsPanel')
    let item, label, sentence, button, icon
    item = $('<div>').addClass('div-list-item')
    label = $('<div>').addClass('ui grey expanding label')
    sentence = "End system , ";
    let j = 0;
    for (let condition of conditions.conditions) {
        var tempVarName2 = condition.varName2;
        if (!tempVarName2) {
            sentence = sentence + "if [" + condition.varName +
                "] [" + condition.condition + "] [" + condition.value + "] ";
        } else {
            sentence = sentence + "if [" + condition.varName +
                "] [" + condition.condition + "] [" + condition.varName2 + "] ";
        }
        if (j < conditions.conditions.size - 1) {
            sentence = sentence + "AND ";
        }
    }
    sentence = sentence + "then end simulation system.";
    label.append($('<label>').text(sentence).css('max-width', '95%'))

    button = $('<a>').addClass('ui opaque right floated')
    icon = $('<i>').addClass('inverted  delete icon').data('ref', item).data('data', conditions).click(function () {
        RemoveEndConditionFromList($(this).data('ref'), $(this).data('data'));
    }
    )

    button.append(icon)
    label.append(button)
    item.append(label)
    panel.append(item)

}

function ResetEndConditionList() {
    let panel = $('#modalEndConditionsPanel')
    panel.empty()
    var simulatorObjectName = editExistingObject.name;

    for (let conditions of simulators.get(simulatorObjectName).endConditions) {
        AppendEndConditionToPanel(conditions)
    }
}