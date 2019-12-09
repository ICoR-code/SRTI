// displaying modals and handling input logic in this modals


/*	DisplayOrClosePrompt()
	- General function to display a 'div' with grey overlay, to save code lines elsewhere.
*/
function DisplayOrClosePrompt(promptName, displayType) {
    // document.getElementById("greyoverlay").style.display = displayType;
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
    editExistingObject = -1;
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
    if (editExistingObject == -1) {
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
    if (editExistingObject == -1) {
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
    editExistingObject = -1;
}

/*	NewMessageObjectPrompt()
	- Open "new message" prompt to create/edit new message for project.
*/
function NewMessageObjectPrompt() {
    DisplayOrClosePrompt("modalNewMessage", "block");
    if (editExistingObject == -1) {

    } else {
        variables = listOfMessages[editExistingObject].variables;
        document.getElementsByName("NewMessageName")[0].value = listOfMessages[editExistingObject].name;
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
    editExistingObject = -1;
}

/*	NewPublishConnectionPrompt()
	- Open prompt to add details to a new "publish" connection (sim -> message).
*/
function NewPublishConnectionPrompt(message_id, simulator_id) {
    DisplayOrClosePrompt("modalPublishDetails", "block");

    let messageName = messageObjects[message_id].name;
    let simulatorName = simulatorObjects[simulator_id].name;

    let segment = $('#modalPublishDetailsSegment')
    segment.empty()

    let message = $('<div>').addClass('nine wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    segment.append(message)
    segment.append(simulator)

    let i, messageVar, label, simVar, dropdown, menu, j, item, newDropdown
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        originalObjectId: message_id,
        messageObjectId: -1,
        variableObjectId: -1,
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': -1,
        text: "(DEFAULT)",
        originalObjectId: simulator_id,
    })

    menu.append(item)

    let data_simulator = simulatorObjects[simulator_id].original


    // for (j = 0; j < simulatorObjects[simulator_id].original.variables.length; j++) {
    //     item = $('<div>', {
    //         class: 'item',
    //         'data-value': j,
    //         text: simulatorObjects[simulator_id].original.variables[j].name + " ("
    //             + simulatorObjects[simulator_id].original.variables[j].valueType + ")",
    //         originalObjectId: simulator_id,
    //     })

    //     menu.append(item)
    // }

    for (let [name, variable] of data_simulator.variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " ("
                + variable.valueType + ")",
            originalObjectId: simulator_id,
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of messageObjects[message_id].original.variables) {
        console.log("add variable to list here... " + name);
        messageVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " ("
            + variable.valueType + ")")

        messageVar.append(label)

        simVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('messageObjectId', i)

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

    let originalMessageId = simulatorObjects[editExistingObject].publishedMessages[editExistingObject2];
    let messageName = messageObjects[simulatorObjects[editExistingObject].publishedMessages[editExistingObject2]].name;
    let simulatorName = simulatorObjects[editExistingObject].name;
    let publishedDetail = simulatorObjects[editExistingObject].publishedDetails[editExistingObject2];

    let segment = $('#modalPublishDetailsSegment')
    segment.empty()

    let message = $('<div>').addClass('nine wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    segment.append(message)
    segment.append(simulator)

    let i, messageVar, label, simVar, dropdown, menu, j, item, newDropdown, dropdowns = []
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        originalObjectId: originalMessageId,
        messageObjectId: -1,
        variableObjectId: -1,
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': -1,
        text: "(DEFAULT)",
        originalObjectId: editExistingObject,
    })

    menu.append(item)


    for (let [name, variable] of simulatorObjects[editExistingObject].original.variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " ("
                + variable.valueType + ")",
            originalObjectId: editExistingObject,
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of messageObjects[originalMessageId].original.variables) {
        console.log("add variable to list here... " + name);
        messageVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " ("
            + variable.valueType + ")")

        messageVar.append(label)

        simVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('messageObjectId', i)

        simVar.append(newDropdown)

        segment.append(messageVar)
        segment.append(simVar)

        newDropdown.dropdown()
        dropdowns.push(newDropdown)
    }

    for (i = 0; i < publishedDetail.length; i++) {
        if (publishedDetail[i][1] >= -1) {
            // then "publishedDetail[j][1]" is the index of the simulator's variable that corresponds to it
            console.log(dropdowns[publishedDetail[i][0]])
            $(dropdowns[publishedDetail[i][0]]).dropdown('set selected', String(publishedDetail[i][1]))
        }
    }

    $(`input[name="radioPublishInitial"][value="${simulatorObjects[editExistingObject].publishedInitial[editExistingObject2]}"]`).parent().checkbox('check')
    $('input[name="textPublishDelta"]').val(simulatorObjects[editExistingObject].publishedTimeDelta[editExistingObject2])
}

/*	SavePublishConnectionPrompt()
	- Save configuration details for publish connection (sim -> message)
*/
function SavePublishConnectionPrompt() {


    // dragItem is the reference to the Simulator
    let newDetails = [];
    // list of pairs: [index of message variable, index of simulator variable or -1 for default]
    $('#modalPublishDetailsSegment .dropdown').each(function () {
        let j = parseInt($(this).dropdown('get value'))
        if (j != -1) {
            newDetails.push([parseInt($(this).attr('messageObjectId')), j]);
        }
    })

    let initial = $('input[name=radioPublishInitial]:checked').val()
    let timeDelta = parseInt($('input[name=textPublishDelta]').val())

    if (editExistingObject == -1) {
        dragItem.publishedDetails.push(newDetails);
        dragItem.publishedInitial.push(initial);
        dragItem.publishedTimeDelta.push(parseInt(timeDelta));
        // by happy accident, "publishedDetails" will contain an entry in the same order as "publishedMessages".
    } else {
        simulatorObjects[editExistingObject].publishedDetails[editExistingObject2] = newDetails;
        simulatorObjects[editExistingObject].publishedInitial[editExistingObject2] = initial;
        simulatorObjects[editExistingObject].publishedTimeDelta[editExistingObject2] = parseInt(timeDelta);
    }
    ClosePublishConnectionPrompt();
}

/*	ClosePublishConnectionPrompt()
	- Close prompt to add new/edit "publish connection" (sim -> message) 
*/
function ClosePublishConnectionPrompt() {
    DisplayOrClosePrompt("modalPublishDetails", "none");

    dragItem = null;
    editExistingObject = -1;
    editExistingObject2 = -1;
    var radioList = document.getElementsByName("radioPublishInitial");
    for (i = 0; i < radioList.length; i++) {
        if (radioList[i].checked) {
            radioList[i].checked = false;
        }
    }
    document.getElementsByName("textPublishDelta")[0].value = "";
}

/* 	NewSubscribeConnectionPrompt()
	- Open prompt to create new "subscribe" connection (message -> sim)	 
*/
function NewSubscribeConnectionPrompt(message_id, simulator_id) {
    DisplayOrClosePrompt("modalSubscribeDetails", "block");

    let messageName = messageObjects[message_id].name;
    let simulatorName = simulatorObjects[simulator_id].name;

    let segment = $('#modalSubscribeDetailsSegment')
    segment.empty()

    let simulator = $('<div>').addClass('nine wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    segment.append(simulator)
    segment.append(message)

    let i, messageVar, label, simVar, dropdown, menu, j, item, newDropdown
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        originalObjectId: message_id,
        simulatorObjectId: -1,
        variableObjectId: -1,
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': -1,
        text: "(DEFAULT)",
        originalObjectId: message_id,
    })

    menu.append(item)


    for (let [name, variable] of messageObjects[message_id].original.variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': name,
            text: name + " ("
                + variable.valueType + ")",
            originalObjectId: message_id,
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of simulatorObjects[simulator_id].original.variables) {
        console.log("add variable to list here... " + name);
        simVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " ("
            + variable.valueType + ")")

        simVar.append(label)

        messageVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('simulatorObjectId', i)

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

    let originalMessageId = simulatorObjects[editExistingObject].subscribedMessages[editExistingObject2];
    let messageName = messageObjects[originalMessageId].name;
    let simulatorName = simulatorObjects[editExistingObject].name;
    let subscribedDetail = simulatorObjects[editExistingObject].subscribedDetails[editExistingObject2];

    let segment = $('#modalSubscribeDetailsSegment')
    segment.empty()

    let simulator = $('<div>').addClass('nine wide middle aligned column').text('Simulator Name:')
    simulator.append($('<label>').addClass('ui green label').text(simulatorName))

    let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
    message.append($('<label>').addClass('ui blue label').text(messageName))

    segment.append(simulator)
    segment.append(message)

    let i, messageVar, label, simVar, dropdown, menu, j, item, newDropdown, dropdowns = []
    dropdown = $('<div>', {
        class: 'ui selection dropdown',
        originalObjectId: originalMessageId,
        simulatorObjectId: -1,
        variableObjectId: -1,
    })

    menu = $('<div>').addClass('menu')
    item = $('<div>', {
        class: 'item',
        'data-value': -1,
        text: "(DEFAULT)",
        originalObjectId: originalMessageId,
    })

    menu.append(item)


    for (let [name, variable] of messageObjects[originalMessageId].original.variables) {
        item = $('<div>', {
            class: 'item',
            'data-value': j,
            text: name + " ("
                + variable.valueType + ")",
            originalObjectId: originalMessageId,
        })

        menu.append(item)
    }

    dropdown.append($('<input>', { type: 'hidden' }))
    dropdown.append($('<i>', { class: 'dropdown icon' }))
    dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
    dropdown.append(menu)

    for (let [name, variable] of simulatorObjects[editExistingObject].original.variables) {
        console.log("add variable to list here... " + name);
        simVar = $('<div>').addClass('nine wide middle aligned continued column')
        label = $('<label>').text(name + " ("
            + variable.valueType + ")")

        simVar.append(label)

        messageVar = $('<div>').addClass('six wide middle aligned continued column')

        newDropdown = dropdown.clone().attr('simulatorObjectId', i)

        messageVar.append(newDropdown)

        segment.append(simVar)
        segment.append(messageVar)

        newDropdown.dropdown()
        dropdowns.push(newDropdown)
    }

    for (i = 0; i < subscribedDetail.length; i++) {
        if (subscribedDetail[i][1] >= -1) {
            // then "publishedDetail[j][1]" is the index of the simulator's variable that corresponds to it
            console.log(dropdowns[subscribedDetail[i][0]])
            $(dropdowns[subscribedDetail[i][0]]).dropdown('set selected', String(subscribedDetail[i][1]))
        }
    }

    $(`input[name="radioSubscribeInitial"][value="${simulatorObjects[editExistingObject].subscribedInitial[editExistingObject2]}"]`).parent().checkbox('check')
    $('input[name="textSubscribeDelta"]').val(simulatorObjects[editExistingObject].subscribedTimeDelta[editExistingObject2])
    $('input[name="textSubscribeRelative"]').val(simulatorObjects[editExistingObject].subscribedRelative[editExistingObject2])
    $('input[name="textSubscribeTimestep"]').val(simulatorObjects[editExistingObject].subscribedTimestep[editExistingObject2])
}

/*	SaveSubscribeConnectionPrompt()
	- Save config of subscribe connection (message -> sim)
*/
function SaveSubscribeConnectionPrompt() {
    // dragItem is the reference to the Simulator
    console.log("saving subscribe data...");
    let newDetails = [];
    $('#modalSubscribeDetailsSegment .dropdown').each(function () {
        let j = parseInt($(this).dropdown('get value'))
        if (j != -1) {
            newDetails.push([parseInt($(this).attr('simulatorObjectId')), j]);
        }
    })

    let initial = $('input[name=radioSubscribeInitial]:checked').val()
    let timeDelta = parseInt($('input[name=textSubscribeDelta]').val())
    let relative = parseInt($('input[name=textSubscribeRelative]').val())
    let timestep = parseInt($('input[name=textSubscribeTimestep]').val())

    if (editExistingObject == -1) {
        dragItem.subscribedDetails.push(newDetails);
        dragItem.subscribedInitial.push(initial);
        dragItem.subscribedTimeDelta.push(parseInt(timeDelta));
        dragItem.subscribedRelative.push(parseInt(relative));
        dragItem.subscribedTimestep.push(parseInt(timestep));
    } else {
        simulatorObjects[editExistingObject].subscribedDetails[editExistingObject2] = newDetails;
        simulatorObjects[editExistingObject].subscribedInitial[editExistingObject2] = initial;
        simulatorObjects[editExistingObject].subscribedTimeDelta[editExistingObject2] = parseInt(timeDelta);
        simulatorObjects[editExistingObject].subscribedRelative[editExistingObject2] = parseInt(relative);
        simulatorObjects[editExistingObject].subscribedTimestep[editExistingObject2] = parseInt(timestep);
    }
    CloseSubscribeConnectionPrompt();
}

/*	CloseSubscribeConnectionPrompt()
	- Close subscribe-connection prompt (message -> sim)
*/
function CloseSubscribeConnectionPrompt() {
    DisplayOrClosePrompt("modalSubscribeDetails", "none");

    dragItem = null;
    editExistingObject = -1;
    editExistingObject2 = -1;
    var radioList = document.getElementsByName("radioSubscribeInitial");
    for (i = 0; i < radioList.length; i++) {
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
        //TODO: transform
        simulators.set(obj.simdef.name, ConvertSimulatoro(obj.simdef));
        AppendObjectToSubPanel1()
    } else if (importType == 2) {
        listOfMessages.push(obj.mesdef);
        ResetObjectSubPanel2();
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
    if (editExistingObject == -1) {
        simulators.set(newSimName, NewSimulator(
            newSimName,
            newRefName, newFilePath, newExecute,
            simulatorFunctions, variables
        ));
    } else {
        let simulator = simulators.get(editExistingObject)
        var originalName = simulator.name;
        simulator.name = newSimName;
        simulator.refName = newRefName;
        simulator.filePath = newFilePath;
        simulator.executeCommand = newExecute;
        simulator.functions = simulatorFunctions;
        simulator.variables = variables;
        let i = 0;
        for (i = 0; i < simulatorObjects.length; i++) {
            if (simulatorObjects[i].name == originalName) {
                simulatorObjects[i].name = newSimName;
                simulatorObjects[i].objectRef.innerHTML = newSimName;
            }
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
    var panel = document.getElementById("objectsubpanel2");
    while (panel.firstChild) {
        panel.removeChild(panel.firstChild);
    }
    var newMessageName = document.getElementsByName("NewMessageName")[0].value;
    if (editExistingObject == -1) {
        listOfMessages.push({ name: newMessageName, variables: variables });
    } else {
        var originalName = listOfMessages[editExistingObject].name;
        listOfMessages[editExistingObject].name = newMessageName;
        listOfMessages[editExistingObject].variables = variables;
        let i = 0;
        for (i = 0; i < messageObjects.length; i++) {
            if (messageObjects[i].name == originalName) {
                messageObjects[i].name = newMessageName;
                messageObjects[i].original = listOfMessages[editExistingObject];
                messageObjects[i].objectRef.innerHTML = newMessageName;
            }
        }
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
        let newMessageObjectType = $('.checked').find('input[name="NewMessageObject"]').attr('value')
        variables.set(newMessageObjectName, NewVariable(newMessageObjectName, newMessageObjectType));
        let panel = $('#modalNewMessagePanel1')
        if (variables.size === 1) {
            panel.show()
        }

        let child = $('<div>').addClass('div-list-item ui compact segment')
        child.append($('<label>').html(`<code>${newMessageObjectName}</code> (${newMessageObjectType})`).attr('style', 'vertical-align:sub;'))
        var button = $('<button>', {
            class: "ui compact icon button right floated", name: newMessageObjectName
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
    var btnToEnable = document.getElementsByName("btn-newmessageconfirm")[0];
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


    $('input[name="newTimeDelta"]').val(simulatorObjects[editExistingObject].timeDelta)
    $('input[name="newTimeScale"]').val(simulatorObjects[editExistingObject].timeScale)

    let dropdown = $('#dropdownVar .menu')
    dropdown.empty()

    let item
    let i
    for (let [name, variable] of simulatorObjects[editExistingObject].original.variables) {
        item = $('<div>').addClass('item').html(
            `<code>${name}</code> (${variable.valueType})`
        )
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")

    dropdown.append(item)
    if (simulatorObjects[editExistingObject].timeVarDelta == "") {
        $('#dropdownVar').dropdown('set selected', "''")
    } else {
        $('#dropdownVar').dropdown('set selected', simulatorObjects[editExistingObject].timeVarDelta)
    }

}

/*	CloseEditSimLocalTime()
	- Close simulator configuration (local time) prompt.
*/
function CloseEditSimLocalTime() {
    DisplayOrClosePrompt("modalLocalTime", "none");
    editExistingObject = -1;
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

    let panel = $('#inspectorpanel')
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
    let i
    for (let [name, fn] of simulatorObjects[editExistingObject].original.functions) {
        item = $('<div>').addClass('item').append($('<code>').text(name))
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")

    dropdown.append(item)
    $('#dropdownInitializeFunction').dropdown().dropdown('set selected', simulatorObjects[editExistingObject].initialize)

    dropdown = $('#dropdownSimulateFunction .menu')
    dropdown.empty()
    for (let [name, fn] of simulatorObjects[editExistingObject].original.functions) {
        item = $('<div>').addClass('item').append($('<code>').text(name))
        item.attr('data-value', name)
        dropdown.append(item)
    }

    item = $('<div>').addClass('item').text("''")
    item.attr('data-value', "''")
    dropdown.append(item)

    $('#dropdownSimulateFunction').dropdown().dropdown('set selected', simulatorObjects[editExistingObject].simulate)

    $('input[name="SimulateFunctionTimestepDelta"]').val(simulatorObjects[editExistingObject].simulateTimeDelta)
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
    simulatorObjects[editExistingObject].initialize = $('#dropdownInitializeFunction').dropdown('get value')
    simulatorObjects[editExistingObject].simulate = $('#dropdownSimulateFunction').dropdown('get value')

    let newTimeDelta = $('input[name="SimulateFunctionTimestepDelta"]').val()
    simulatorObjects[editExistingObject].simulateTimeDelta = parseInt(newTimeDelta);
    CloseSimulateFunctions()
}

/*	EditStageConditions()
	- Edit configration (show prompt) on simulator for when stage transition should occur.
*/
function EditStageConditions() {
    DisplayOrClosePrompt("modalStageConditions", "block");

    $('#dropdownStageConditionPickVar1 .menu, #dropdownStageConditionPickVar2 .menu').each(function (index) {
        let dropdown = $(this)
        dropdown.empty()

        let item
        for (let [name, variable] of simulatorObjects[editExistingObject].original.variables) {
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
        for (variable of ["RTI_vTimestep", "RTI_stage", "RTI_stageVTimestepMul", "RTI_stageVTimestep"]) {
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
    for (variable of ["==", "!=", ">", "<", ">=", "<="]) {
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

    ResetStageConditionList()
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
        let i
        for (let [name, variable] of simulatorObjects[editExistingObject].original.variables) {
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
        for (variable of ["RTI_vTimestep", "RTI_stage", "RTI_stageVTimestepMul", "RTI_stageVTimestep"]) {
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
    for (variable of ["==", "!=", ">", "<", ">=", "<="]) {
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
    simulatorObjects[editExistingObject].timeDelta = parseInt($('input[name="newTimeDelta"]').val())
    simulatorObjects[editExistingObject].timeScale = parseInt($('input[name="newTimeScale"]').val())
    simulatorObjects[editExistingObject].timeVarDelta = $('#dropdownVar').dropdown('get value')

    CloseEditSimLocalTime()
}

/*	AddStageConditionToSubList()
	- In prompt, add 'completed' stage condition to list (where multiple AND conditions can be added before final submission).
*/
function AddStageConditionToSubList() {
    stageConditionSubSet.push({
        varName: $('#stageCondition1').text(),
        condition: unescape($('#stageCondition2').text()),
        value: stageConditionV3a,
        varName2: stageConditionV3b
    });


    ResetStageConditionSubList()
}

/*	RemoveStageConditionFromSubList()
	- In prompt, remove stage condition to list (where multiple AND conditions can be added before final submission).
*/
function RemoveStageConditionFromSubList(btn_id) {
    stageConditionSubSet.splice(btn_id, 1);

    ResetStageConditionSubList()

}

function ResetStageConditionSubList() {

    let subpanel = $("#modalStageConditionsSubPanel");
    subpanel.empty()

    let i = 0, item, label, text, tempVarName2, button, icon;
    for (i = 0; i < stageConditionSubSet.length; i++) {
        item = $('<div>').addClass('div-list-item')
        label = $('<div>').addClass('ui grey expanding middle aligned label')
        if (tempVarName2 == "") {
            text = "if [<code>" + stageConditionSubSet[i].varName + " "
                + stageConditionSubSet[i].condition + " " + stageConditionSubSet[i].value + "</code>] AND ..."
        } else {
            text = "if [<code>" + stageConditionSubSet[i].varName + " "
                + stageConditionSubSet[i].condition + " " + stageConditionSubSet[i].varName2 + "</code>] AND ..."
        }
        label.append($('<label>').html(text).css('max-width', '95%'))
        button = $('<a>').addClass('ui opaque right floated')
        icon = $('<i>').addClass('inverted delete icon').attr('name', i).click(function () {
            RemoveStageConditionFromSubList($(this).attr('name'));
        }
        )

        button.append(icon)
        label.append(button)
        item.append(label)
        subpanel.append(item)
    }
}

/*	AddStageConditionToList()
	- In prompt, add 'completed' stage condition set to final list.
*/
function AddStageConditionToList() {
    newStage = document.getElementsByName("TextStageConditionsNewStage")[0].value;
    simulatorObjects[editExistingObject].stageConditions.push({
        oldStage: stage,
        conditions: stageConditionSubSet,
        newStage: newStage
    });

    ResetStageConditionList()


    stageConditionSubSet = [];
    ResetStageConditionSubList()
}

/*	RemoveStageConditionFromList()
	- In prompt, remove stage condition set from final list.
*/
function RemoveStageConditionFromList(btn_name) {
    console.log('deleting' + btn_name)

    var indexCount = 0;
    var simulatorObjectName = simulatorObjects[editExistingObject].name;
    let k = 0;
    for (k = 0; k < simulatorObjects.length; k++) {
        if (simulatorObjects[k].name == simulatorObjectName) {
            let i = 0;
            for (i = 0; i < simulatorObjects[k].stageConditions.length; i++) {
                if (indexCount == btn_name) {
                    simulatorObjects[k].stageConditions.splice(i, 1);
                }
                indexCount++;
            }
        }
    }

    ResetStageConditionList()
}

function ResetStageConditionList() {

    let panel = $('#modalStageConditionsPanel')
    panel.empty()
    let indexCount = 0, item, label, sentence, button, icon
    var simulatorObjectName = simulatorObjects[editExistingObject].name;
    let k = 0;
    for (k = 0; k < simulatorObjects.length; k++) {
        if (simulatorObjects[k].name == simulatorObjectName) {
            for (i = 0; i < simulatorObjects[k].stageConditions.length; i++) {
                item = $('<div>').addClass('div-list-item')
                label = $('<div>').addClass('ui grey expanding label')
                sentence = "in stage " + simulatorObjects[k].stageConditions[i].oldStage + ", ";
                let j = 0;
                for (j = 0; j < simulatorObjects[k].stageConditions[i].conditions.length; j++) {
                    var tempVarName2 = simulatorObjects[k].stageConditions[i].conditions[j].varName2;

                    if (tempVarName2 == "") {
                        sentence = sentence + "if [<code>" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
                            + " " + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
                            + " " + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].value + "</code>] ";
                    } else {
                        sentence = sentence + "if [<code>" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
                            + " " + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
                            + " " + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2 + "</code>] ";
                    }
                    if (j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length - 1) {
                        sentence = sentence + "AND ";
                    }
                }
                sentence = sentence + "go to stage " + simulatorObjects[k].stageConditions[i].newStage;
                label.append($('<label>').text(sentence).css('max-width', '95%'))

                button = $('<a>').addClass('ui opaque right floated')
                icon = $('<i>').addClass('inverted delete icon').attr('name', indexCount).click(function () {
                    RemoveStageConditionFromList($(this).attr('name'));
                }
                )

                button.append(icon)
                label.append(button)
                item.append(label)
                panel.append(item)

                indexCount++;
            }
        }
    }
}

/*	AddEndConditionToSubList()
	- In prompt, add end condition to sublist (where AND conditions are collected).
*/
function AddEndConditionToSubList() {
    stageConditionSubSet.push({
        varName: $('#endCondition1').text(),
        condition: unescape($('#endCondition2').text()),
        value: stageConditionV3a,
        varName2: stageConditionV3b
    });

    ResetEndConditionSubList()



}

/*	RemoveEndConditionFromSubList()
	- In prompt, remove end condition from sublist (where AND conditions are collected).
*/
function RemoveEndConditionFromSubList(btn_id) {
    stageConditionSubSet.splice(btn_id, 1);

    ResetEndConditionSubList()

}

function ResetEndConditionSubList() {
    let subpanel = $("#modalEndConditionsSubPanel");
    subpanel.empty()

    let i = 0, item, label, text, tempVarName2, button, icon;
    for (i = 0; i < stageConditionSubSet.length; i++) {
        item = $('<div>').addClass('div-list-item')
        label = $('<div>').addClass('ui grey expanding middle aligned label')
        if (tempVarName2 == "") {
            text = "if [" + stageConditionSubSet[i].varName + "] ["
                + stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] AND ..."
        } else {
            text = "if [" + stageConditionSubSet[i].varName + "] ["
                + stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] AND ..."
        }
        label.append($('<label>').text(text).css('max-width', '95%'))
        button = $('<a>').addClass('ui opaque right floated')
        icon = $('<i>').addClass('inverted  delete icon').attr('name', i).click(function () {
            RemoveEndConditionFromSubList($(this).attr('name'));
        }
        )

        button.append(icon)
        label.append(button)
        item.append(label)
        subpanel.append(item)
    }
}

/*	AddEndConditionToSubList()
	- In prompt, add end condition to list.
*/
function AddEndConditionToList() {
    simulatorObjects[editExistingObject].endConditions.push({
        oldStage: stage,
        conditions: stageConditionSubSet
    });

    ResetEndConditionList()

    stageConditionSubSet = [];
    ResetEndConditionSubList()

}

/*	RemoveEndConditionFromList()
	- In prompt, remove end condition from list.
*/
function RemoveEndConditionFromList(btn_name) {
    console.log("Removing end condition : " + btn_name);

    var indexCount = 0;
    var simulatorObjectName = simulatorObjects[editExistingObject].name;
    let k = 0;
    for (k = 0; k < simulatorObjects.length; k++) {
        if (simulatorObjects[k].name == simulatorObjectName) {
            let i = 0;
            for (i = 0; i < simulatorObjects[k].endConditions.length; i++) {
                if (indexCount == btn_name) {
                    simulatorObjects[k].endConditions.splice(i, 1);
                }
                indexCount++;
            }
        }
    }

    ResetEndConditionList()

}

function ResetEndConditionList() {
    let panel = $('#modalEndConditionsPanel')
    panel.empty()
    let indexCount = 0, item, label, sentence, button, icon
    var simulatorObjectName = simulatorObjects[editExistingObject].name;
    let k = 0;
    for (k = 0; k < simulatorObjects.length; k++) {
        if (simulatorObjects[k].name == simulatorObjectName) {
            let i = 0;
            for (i = 0; i < simulatorObjects[k].endConditions.length; i++) {
                item = $('<div>').addClass('div-list-item')
                label = $('<div>').addClass('ui grey expanding label')
                sentence = "End system , ";
                let j = 0;
                for (j = 0; j < simulatorObjects[k].endConditions[i].conditions.length; j++) {
                    var tempVarName2 = simulatorObjects[k].endConditions[i].conditions[j].varName2;
                    if (tempVarName2 == "") {
                        sentence = sentence + "if [" + simulatorObjects[k].endConditions[i].conditions[j].varName
                            + "] [" + simulatorObjects[k].endConditions[i].conditions[j].condition
                            + "] [" + simulatorObjects[k].endConditions[i].conditions[j].value + "] ";
                    } else {
                        sentence = sentence + "if [" + simulatorObjects[k].endConditions[i].conditions[j].varName
                            + "] [" + simulatorObjects[k].endConditions[i].conditions[j].condition
                            + "] [" + simulatorObjects[k].endConditions[i].conditions[j].varName2 + "] ";
                    }
                    if (j < simulatorObjects[k].endConditions[i].conditions.length - 1) {
                        sentence = sentence + "AND ";
                    }
                }
                sentence = sentence + "then end simulation system.";
                label.append($('<label>').text(sentence).css('max-width', '95%'))

                button = $('<a>').addClass('ui opaque right floated')
                icon = $('<i>').addClass('inverted  delete icon').attr('name', indexCount).click(function () {
                    RemoveEndConditionFromList($(this).attr('name'));
                }
                )

                button.append(icon)
                label.append(button)
                item.append(label)
                panel.append(item)

                indexCount++;
            }
        }
    }
}