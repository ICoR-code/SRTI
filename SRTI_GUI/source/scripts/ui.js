// dealing with ui actions in general (except the canvas)

/* resizePanel()
	- Taken from online example, allows resizing horizonal panels to different widths.
*/
function resizePanel(element, direction, handler) {
    console.log("A resizePanel called");
    // Two variables for tracking positions of the cursor
    const drag = { x: 0, y: 0 };
    const delta = { x: 0, y: 0 };

    var first = document.getElementById("objectpanel");
    var second = document.getElementById("canvaspanel");
    let flag = true
    console.log("" + element.getAttribute("id"));
    if (element.getAttribute("id") == "separator2") {
        first = document.getElementById("canvaspanel");
        second = document.getElementById("inspectorpanel");
        flag = false
    }

	/* if present, the handler is where you move the DIV from
	   otherwise, move the DIV from anywhere inside the DIV */
    handler ? (handler.onmousedown = dragMouseDown) : (element.onmousedown = dragMouseDown);
    // function that will be called whenever the down event of the mouse is raised
    function dragMouseDown(e) {
        drag.x = e.clientX;
        drag.y = e.clientY;
        document.onmousemove = onMouseMove;
        document.onmouseup = () => { document.onmousemove = document.onmouseup = null; }
    }
    // function that will be called whenever the up event of the mouse is raised
    function onMouseMove(e) {
        const currentX = e.clientX;
        const currentY = e.clientY;

        delta.x = currentX - drag.x;
        delta.y = currentY - drag.y;

        const offsetLeft = element.offsetLeft;
        const offsetTop = element.offsetTop;


        let firstWidth = first.offsetWidth;
        let secondWidth = second.offsetWidth;
        if (direction === "H") // Horizontal
        {
            element.style.left = offsetLeft + delta.x + "px";
            firstWidth += delta.x;
            secondWidth -= delta.x;
        }
        drag.x = currentX;
        drag.y = currentY;
        first.style.width = firstWidth + "px";
        second.style.width = secondWidth + "px";
        if (flag) {
            $('#buttons-simulation').css('left', Math.max(firstWidth + 15, 176.86))
        }
    }

    console.log("A resizePanel ended");
    console.log("Name of second = " + second.getAttribute("id"));
}

/*	UpdateSelectedStateButtons()
	- Change image on each button based on what is selected.
*/
function UpdateSelectedStateButtons(selectId) {
    $('button[name="select-state-buttons"]').each(function (index) {
        if (index == selectId) {
            $(this).addClass('grey')
        } else {
            $(this).removeClass('grey')
        }
    })

    selectState = selectId;

    DisableCertainObjectButtons();
    ConfigureClearInspectorPanel();
}

/*	AddNewStage()
	- When '+' button is clicked, add a new stage.
*/
function AddNewStage() {
    numOfStages++;
    UpdateSelectedStage(stage);
}

/*	UpdateSelectedStage()
	- After clicking on one of the 'stage' numbers, 
		disable all simulator objects from previous stage and enable objects for new stage.
*/
function UpdateSelectedStage(btn_id) {
    stage = btn_id;

    // redraw buttons on top bar.
    let panel = $('#canvastabpanel')
    panel.empty()


    let i = 0, button
    for (i = 0; i < numOfStages; i++) {
        button = $('<a>').addClass('ui item').attr('name', i).text(i)
        button.click(function () {
            //TODO: check all this.attr
            // console.log(this)
            stage = parseInt(this.name)
            // console.log('stage' + stage)
            UpdateSelectedStage(stage)
        })

        if (stage == i) {
            button.addClass('active')
        } else {
            button.removeClass('active')
        }

        panel.append(button)
    }

    let menu = $('<div>').addClass('right menu')

    button = $('<a>').addClass('ui item').click(AddNewStage)
    button.append($('<i>').addClass('plus icon'))

    menu.append(button)
    panel.append(menu)

    CheckRedrawCanvasGrid();
    DrawAllArrowsOnCanvas();
    SetItemsVisibleInStage();
    DisableCertainObjectButtons();
}

/*	ClearObjectSubPanel1()
	- Clear sub-panel (canvas) on the main screen.
*/
function ClearObjectSubPanel1() {
    $('#objectsubpanel1').empty()
}

/*	AppendObjectToSubPanel1()
	- Append object to sub-panel (canvas) on the main screen.
*/
function AppendObjectToSubPanel1(index = listOfSimulators.length - 1) {
    console.log(index)
    let panel = $('#objectsubpanel1')
    button = $('<button>').addClass('ui green button btn-list-item').text(listOfSimulators[index].name)
    button.attr('id', index)
    button.click(function () {
        console.log("onclick at index = " + this.id);
        if (selectState == 0) {
            CreateNewSimulatorOnCanvas(this.id);
        } else if (selectState == 1) {
            ConfigureSimulatorFromList(this.id);
        } else if (selectState == 2) {

        } else if (selectState == 3) {
            DeleteSimulatorFromList(this.id);
        }
    })
    panel.append(button)

}

/*	ResetObjectSubPanel1()
	- Reset sub-panel (canvas) on the main screen, that normally holds simulators.
*/
function ResetObjectSubPanel1() {
    let panel = $('#objectsubpanel1')
    panel.empty()
    let i = 0;
    for (i = 0; i < listOfSimulators.length; i++) {
        AppendObjectToSubPanel1(i)
    }
}

/*	AppendObjectToSubPanel2()
	- Append object to sub-panel (canvas) on the main screen.
*/
function AppendObjectToSubPanel2(index = listOfMessages.length - 1) {
    console.log(index)
    let panel = $('#objectsubpanel2')
    button = $('<button>').addClass('ui blue button btn-list-item').text(listOfMessages[index].name)
    button.attr('id', index)
    button.click(function () {
        console.log("onclick at index = " + this.id);
        if (selectState == 0) {
            CreateNewMessageOnCanvas(this.id);
        } else if (selectState == 1) {
            ConfigureMessageFromList(this.id);
        } else if (selectState == 2) {

        } else if (selectState == 3) {
            DeleteMessageFromList(this.id);
        }
    })
    panel.append(button)

}

/*	ResetObjectSubPanel2()
	- Reset sub-panel (canvas) on the main screen, that normally holds messages.
*/
function ResetObjectSubPanel2() {
    $('#objectsubpanel2').empty()
    let i = 0;
    for (i = 0; i < listOfMessages.length; i++) {
        AppendObjectToSubPanel2(i)
    }
}

/*	DeleteSimulatorFromList()
	- Delete simulator from project, from list on the left and from the canvas.
*/
function DeleteSimulatorFromList(btn_id) {
    var deleteSimName = listOfSimulators[btn_id].name;
    listOfSimulators.splice(btn_id, 1);
    ResetObjectSubPanel1()

    console.log("Deleting sim from project, check if it's on the canvas = " + deleteSimName);
    for (i = simulatorObjects.length - 1; i >= 0; i--) {
        console.log("... " + simulatorObjects[i].name);
        if (simulatorObjects[i].name == deleteSimName) {
            console.log(" found one to remove!");
            DeleteItemFromCanvasById(i);
        }
    }
    UpdateDrawArrowsAfterDelete(-1, -1);
}


/*	DeleteMessageFromList()
	- Delete message from project on left list and canvas in main screen.
*/
function DeleteMessageFromList(btn_id) {
    var deleteMessageName = listOfMessages[btn_id].name;
    listOfMessages.splice(btn_id, 1);
    ResetObjectSubPanel2()
    for (i = messageObjects.length - 1; i >= 0; i--) {
        console.log("... " + i + " of " + (messageObjects.length - 1) + " " + messageObjects[i].name);
        if (messageObjects[i].name == deleteMessageName) {
            console.log(" found one to remove!");
            DeleteMessageFromCanvasById(i);
            UpdateDrawArrowsAfterDelete(-1, i);
        }
    }
}

/*	DisableCertainObjectButtons()
	- Disable certain buttons on the object panel, based on what simulators/messages are on the canvas.
*/
function DisableCertainObjectButtons() {
    var subpanel1btns = document.getElementById("objectsubpanel1").children;
    var subpanel2btns = document.getElementById("objectsubpanel2").children;

    let i = 0;
    let j = 0;
    for (j = 0; j < subpanel1btns.length; j++) {
        subpanel1btns[j].disabled = false;
    }
    for (j = 0; j < subpanel2btns.length; j++) {
        subpanel2btns[j].disabled = false;
    }
    //check simulator buttons to disable
    for (i = 0; i < simulatorObjects.length; i++) {
        if (simulatorObjects[i].stage == stage && selectState == 0) {
            console.log("disable this button = " + simulatorObjects[i].name);
            for (j = 0; j < subpanel1btns.length; j++) {
                if (subpanel1btns[j].innerText == simulatorObjects[i].name) {
                    subpanel1btns[j].disabled = true;
                }
            }
        }
    }
    //check message buttons to disable
    for (i = 0; i < messageObjects.length; i++) {
        if (selectState == 0) {
            console.log("disable this button message = " + messageObjects[i].name);
            for (j = 0; j < subpanel2btns.length; j++) {
                if (subpanel2btns[j].innerText == messageObjects[i].name) {
                    subpanel2btns[j].disabled = true;
                }
            }
        }
    }

}

/*	ConfigureItemFromCanvas()
	- Click on item on canvas to configure (show options in inspector window on right).
*/
function ConfigureItemFromCanvas(e) {
    // include simulators, messages, AND the RTI Server itself
    // TODO: separate creation logic to different functions for reuse purposes

    ConfigureClearInspectorPanel();

    let panel = $('#inspectorpanel')
    let clickedOnItem = -1;
    let i = 0;
    for (i = 0; i < simulatorObjects.length; i++) {
        if (e.target === simulatorObjects[i].objectRef) {
            clickedOnItem = i;
            break;
        }
    }

    if (clickedOnItem > -1) {
        let header = $('<div>').addClass('ui compact segment')
        let label = $('<label>').addClass('ui green large label').text(simulatorObjects[i].name)
        header.append($('<h3>').text('Simulator in Project'))
        header.append(label)

        let content = $('<div>').addClass('ui compact segment')
        let buttons = $('<div>').addClass('ui vertical buttons')

        let button0 = $('<button>').addClass('ui green basic button').text('Change Local Time')
        button0.click(() => {
            editExistingObject = clickedOnItem;
            EditSimLocalTime();
        })
        let button1 = $('<button>').addClass('ui green basic button').text('Set Initialize and Simulate Functions')
        button1.click(() => {
            editExistingObject = clickedOnItem;
            EditSimulateFunctions();
        })
        let button2 = $('<button>').addClass('ui green basic button').text('Change Stage Transition Conditions')
        button2.click(() => {
            editExistingObject = clickedOnItem;
            EditStageConditions();
        })
        let button3 = $('<button>').addClass('ui green basic button').text('Change End System Conditions')
        button3.click(() => {
            editExistingObject = clickedOnItem;
            EditEndConditions();
        })

        buttons.append(button0)
        buttons.append(button1)
        buttons.append(button2)
        buttons.append(button3)

        content.append(buttons)

        panel.append(header)
        panel.append(content)

        return;
    }

    panel = document.getElementById("inspectorpanel")

    clickedOnItem = -1;
    var listOfMessageVars = document.getElementsByClassName("div-canvas-message");
    for (i = 0; i < listOfMessageVars.length; i++) {
        if (e.target === listOfMessageVars[i]) {
            clickedOnItem = i;
            break;
        }
    }
    if (clickedOnItem > -1) {

        let messageName = messageObjects[clickedOnItem].name

        let panel = $('#inspectorpanel')
        let header = $('<div>').addClass('ui compact segment')
        let message = $('<label>').addClass('ui blue large label').text(messageName)
        header.append($('<h3>').text('Message on Canvas'))
        header.append(message)


        panel.append(header)

        return;
    }

    clickedOnItem = -1;
    var listOfSimPub = document.getElementsByClassName("div-canvas-pub");
    for (i = 0; i < listOfSimPub.length; i++) {
        if (e.target === listOfSimPub[i]) {
            clickedOnItem = i;
            break;
        }
    }
    if (clickedOnItem > -1) {
        ConfigureClearInspectorPanel();
        let simName = simulatorObjects[listOfSimPub[clickedOnItem].nameParent].name;
        let messageName = messageObjects[simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedMessages[listOfSimPub[clickedOnItem].name]].name;

        let panel = $('#inspectorpanel')
        let header = $('<div>').addClass('ui compact segment')
        let sim = $('<label>').addClass('ui green large label').text(simName)
        let arrow = $('<i>').addClass('arrow right icon')
        let message = $('<label>').addClass('ui blue large label').text(messageName)
        header.append($('<h3>').text('Publish-Definition on Canvas'))
        header.append(sim)
        header.append(arrow)
        header.append(message)

        let content = $('<div>').addClass('ui compact segment')
        let button = $('<button>').addClass('ui red basic button').text('Change Publish Parameters')
        button.click(() => {
            editExistingObject = listOfSimPub[clickedOnItem].nameParent;		//index in 'simulatorObjects' of sim
            editExistingObject2 = listOfSimPub[clickedOnItem].name;				//index in 'simulatorObjects[i].publishedMessages'
            EditPublishConnectionPrompt();
        })
        content.append(button)

        panel.append(header)
        panel.append(content)

        return;
    }

    clickedOnItem = -1;
    var listOfSimSub = document.getElementsByClassName("div-canvas-sub");
    for (i = 0; i < listOfSimSub.length; i++) {
        if (e.target === listOfSimSub[i]) {
            clickedOnItem = i;
            break;
        }
    }
    if (clickedOnItem > -1) {
        ConfigureClearInspectorPanel();
        let simName = simulatorObjects[listOfSimSub[clickedOnItem].nameParent].name;
        let messageName = messageObjects[simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedMessages[listOfSimSub[clickedOnItem].name]].name;
        let panel = $('#inspectorpanel')
        let header = $('<div>').addClass('ui compact segment')
        let message = $('<label>').addClass('ui blue large label').text(messageName)
        let arrow = $('<i>').addClass('arrow right icon')
        let sim = $('<label>').addClass('ui green large label').text(simName)
        header.append($('<h3>').text('Subscribe-Definition on Canvas'))
        header.append(message)
        header.append(arrow)
        header.append(sim)

        let content = $('<div>').addClass('ui compact segment')
        let button = $('<button>').addClass('ui red basic button').text('Change Subscribe Parameters')
        button.click(() => {
            editExistingObject = listOfSimSub[clickedOnItem].nameParent;
            editExistingObject2 = listOfSimSub[clickedOnItem].name;
            EditSubscribeConnectionPrompt();
        })
        content.append(button)

        panel.append(header)
        panel.append(content)

        return;
    }

    clickedOnItem = -1;
    var serverGUI = document.getElementsByClassName("div-canvas-server");
    if (e.target === serverGUI[0]) {
        clickedOnItem = 0;
    }
    if (clickedOnItem > -1) {
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

        return;
    }
}

/*	ConfigureSimulatorFromList()
	- Show options in inspector (on right) to configure a selected simulator (in project, not canvas).
*/
function ConfigureSimulatorFromList(btn_id) {
    ConfigureClearInspectorPanel();

    let panel = $('#inspectorpanel')
    let selectedObject = listOfSimulators[btn_id]
    let header = $('<div>').addClass('ui compact segment')
    let label = $('<label>').addClass('ui green large label').text(selectedObject.name)
    header.append($('<h3>').text('Simulator in Project'))
    header.append(label)

    let content = $('<div>').addClass('ui compact segment')
    let warning = $('<div>').addClass('ui warning').text('WARNING: Editing properties of this Simulator after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Simulator on the canvas after any updates.')
    let divider = $('<div>').addClass('ui hidden divider')
    let button = $('<button>').addClass('ui green basic button').text('Change Properties')
    button.click(() => {
        editExistingObject = btn_id;
        NewSimulatorObjectPrompt();
    })
    content.append(warning)
    content.append(divider)
    content.append(button)

    panel.append(header)
    panel.append(content)


}

/*	ConfigureMessageFromList()
	- Show options in inspector (on right) to configure a selected message (in project, not canvas).
*/
function ConfigureMessageFromList(btn_id) {
    ConfigureClearInspectorPanel();

    let panel = $('#inspectorpanel')
    let selectedObject = listOfMessages[btn_id]
    let header = $('<div>').addClass('ui compact segment')
    let label = $('<label>').addClass('ui blue large label').text(selectedObject.name)
    header.append($('<h3>').text('Message in Project'))
    header.append(label)

    let content = $('<div>').addClass('ui compact segment')
    let warning = $('<div>').addClass('ui warning').text('WARNING: Editing properties of this Message after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Message on the canvas after any updates.')
    let divider = $('<div>').addClass('ui hidden divider')
    let button = $('<button>').addClass('ui blue basic button').text('Change Properties')
    button.click(() => {
        editExistingObject = btn_id;
        NewMessageObjectPrompt();
    })
    content.append(warning)
    content.append(divider)
    content.append(button)

    panel.append(header)
    panel.append(content)
}

/*	ConfigureClearInspectorPanel()
	- Clear items in inspector panel.
*/
function ConfigureClearInspectorPanel() {

    let inspectorPanel = $('#inspectorpanel')
    inspectorPanel.empty()
}