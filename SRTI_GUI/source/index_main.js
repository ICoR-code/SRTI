
// Reference to main canvas panel on page.
var canvascontainer = document.querySelector("#canvaspanel");
// Original grid size on start-up (should increase dynamically depending on project contents).
var minGridSizeX = 6;
var minGridSizeY = 6;
var gridSizeX = minGridSizeX;
var gridSizeY = minGridSizeY;



// Reference to current draggable "div" item on canvas, can represent either a simulator or message.
var dragItem = document.getElementsByClassName("div-canvas-sim")[0];

// Maintain data for current active 'dragItem,' 
//		to know if item was selected in previous mouse-click 
//		(to move, or to connect to another object).
var active = false;
var currentX;
var currentY;
var initialX;
var initialY;
var xOffset = 0;
var yOffset = 0;

// User's choice in menu when they say they want to 'make a new object' 
//		("Simulator", "MessageDefinition", "Import").
var newObjectSelection = "none";
// References to simulators and messages available in the project 
//		(as viewed on left side of screen; not just on the center canvas).
var listOfSimulators = [];
var listOfMessages = [];
// references to objects on canvas, plus their sub-components 
//		(custom versions that can't generally be specified in 'listOfSimulators' or 'listOfMessages').
var simulatorObjects = [];
var messageObjects = [];

// Array of entire project states to allow 'undo' and 'redo' 
//		(effectively, saves same data as the 'save file' would, up to 30 times, 
//		to allow undo up to 30 times in any given moment.)
var undoStack = [];
var redoStack = [];



// variables to save project
var savepath = "";
var savename = "";
// variables to launch RTI Server, and to connect sims to the Server.
var hostName = "localhost";
var portNumber = "42012";
// Total number of stages (different states in simulation system) in this project.
var numOfStages = 1;
// Current stage in canvas view (1st is at index 0).
var stage = 0;
// Current state of selection. References the buttons in the top-left corner: 
//		"Select," "Configure," "Connect," and "Delete".
var selectState = 0;



// Sub-objects for Message / Simulator (used interchangably) definitions: 
//		'objects' = variables, 'functions' = functions in simulator.
//		Referenced here for when in popup for new Message / Simulator, and defining 
var listOfMessageObjects = [];
var listOfMessageFunctions = [];

var configureItemType = 0;	//0 = sim from list, 1 = message from list, 2 = sim from canvas, 3 = message from canvas, 4 = RTI Server
var configureItemId = 0;	// reference to item being configured.


// Reference to "File Input" box, to get where Wrapper file path is for a new Simulator.
var wrapperFileFolder = document.getElementsByName("wrapperFileDir")[0];
var wrapperFileFolderText = document.getElementsByName("wrapperFileDirText")[0];
wrapperFileFolder.onchange = function () {
	var files = wrapperFileFolder.files, len = files.length;
	var totalText = "";
	totalText = totalText + files[0].path;
	wrapperFileFolderText.innerHTML = totalText;
}
// Reference to "File Input" box, to get where to save current project.
var saveAsFolder = document.getElementsByName("saveAsFileDir")[0];
var saveAsFolderText = document.getElementsByName("saveAsFileDirText")[0];
saveAsFolder.onchange = function () {
	var files = saveAsFolder.files, len = files.length;
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
// Reference to "File Input" box, to get where to open existing saved project.
var openProjectFolder = document.getElementsByName("openProjectFileDir")[0];
openProjectFolder.onchange = function () {
	var files = openProjectFolder.files;
	var filename = files[0].path.replace(/^.*[\\\/]/, '');
	filename = filename.replace(".project", '');
	var path = files[0].path.replace(filename + ".project", '');

	CloseOpenProject();
	OpenExistingProject(path, filename);
}
// Reference to "File Input" box, to import existing objects (Simulator or Message).
var importType = 0;
var importFilePath = "";
var importObjectFolder = document.getElementsByName("importSimMessageDir")[0];
var importObjectText = document.getElementsByName("importSimMessageText")[0];
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
		importObjectPath = "";
	}
}

// counting simulators and objects
var nSimulators = 0
var nMessages = 0


// Initialize certain buttons and objects.
document.getElementById("btn-start").disabled = false;
document.getElementById("btn-play").disabled = true;
document.getElementById("btn-stop").disabled = true;
document.getElementById("btn-pause").disabled = true;
canvascontainer.addEventListener("mousedown", dragStart, false);
canvascontainer.addEventListener("mouseup", dragEnd, false);
canvascontainer.addEventListener("mousemove", drag, false);
resizePanel(document.getElementById("separator"), "H");
resizePanel(document.getElementById("separator2"), "H");

UpdateCanvasGrid();
UpdateSelectedStateButtons(selectState);
AddProprietaryRTIMessage();




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
	console.log("" + element.getAttribute("id"));
	if (element.getAttribute("id") == "separator2") {
		first = document.getElementById("canvaspanel");
		second = document.getElementById("inspectorpanel");
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
	}

	console.log("A resizePanel ended");
	console.log("Name of second = " + second.getAttribute("id"));
}

/*	CanvasOnScroll()
	- When horizontal scroll for 'canvassubpanel1' (where Sims are) occurs,
		match horizontal movement for 'canvassubpanel2' (where Messages are).
*/
function CanvasOnScroll(div) {
	var canvas1 = document.getElementById("canvassubpanel2");
	canvas1.scrollLeft = div.scrollLeft;
}

/*	UpdateSelectedStateButtons()
	- Change image on each button based on what is selected.
		(Allows freedom to create .png files with darker/lighter backgrounds 
		to show what is selected).
*/
function UpdateSelectedStateButtons(selectId) {

	// var btn0 = document.getElementById("btn-pointer");
	// var btn1 = document.getElementById("btn-settings");
	// var btn2 = document.getElementById("btn-arrows");
	// var btn3 = document.getElementById("btn-delete");
	// btn0.style.backgroundImage = "url(./srti_modules/images/icon_pointer_02.png)";
	// btn0.style.backgroundColor = "#eee";
	// btn1.style.backgroundImage = "url(./srti_modules/images/icon_settings_02.png)";
	// btn1.style.backgroundColor = "#eee";
	// btn2.style.backgroundImage = "url(./srti_modules/images/icon_arrows_02.png)";
	// btn2.style.backgroundColor = "#eee";
	// btn3.style.backgroundImage = "url(./srti_modules/images/icon_delete_02.png)";
	// btn3.style.backgroundColor = "#eee";

	// if (selectId == 0){
	// 	btn0.style.backgroundImage = "url(./srti_modules/images/icon_pointer_03.png)";
	// 	btn0.style.backgroundColor = "#aaa";
	// } else if (selectId == 1){
	// 	btn1.style.backgroundImage = "url(./srti_modules/images/icon_settings_03.png)";
	// 	btn1.style.backgroundColor = "#aaa";
	// } else if (selectId == 2){
	// 	btn2.style.backgroundImage = "url(./srti_modules/images/icon_arrows_03.png)";
	// 	btn2.style.backgroundColor = "#aaa";
	// } else if (selectId == 3){
	// 	btn3.style.backgroundImage = "url(./srti_modules/images/icon_delete_03.png)";
	// 	btn3.style.backgroundColor = "#aaa";
	// }
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

/*	UpdateCanvasGrid()
	- Redraw canvas grid (where Sims are) based on current size of 'gridSizeX' and 'gridSizeY'.
*/
function UpdateCanvasGrid() {
	console.log("UpdateCanvasGrid() called.");

	var panel = document.getElementById("canvassubpanel1grid");

	while (panel.firstChild) {
		panel.removeChild(panel.firstChild);
	}

	let i = 0;
	for (i = 0; i < gridSizeX; i++) {
		let j = 0;
		for (j = 0; j < gridSizeY; j++) {
			var addContentType = document.createElement("div");
			addContentType.style
				= "border:1px solid black; width:100px; height:100px; position:absolute; left:0px; top:0px;";
			addContentType.style.left = '' + ((i + 1) * 100) + 'px';
			addContentType.style.top = '' + (j * 100) + 'px';
			panel.appendChild(addContentType);
		}
	}
}

/*	CheckRedrawCanvasGrid()
	- Are there simulator objects on the canvas that reach beyond the length of the current grid? 
			If so, recalculate the grid bounds and redraw.
	
*/
function CheckRedrawCanvasGrid() {
	var maxSizeX = minGridSizeX;
	var maxSizeY = minGridSizeY;

	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		//!!!!
		if (((simulatorObjects[i].topPos / 100) + 2 + i) > maxSizeY
			&& simulatorObjects[i].stage == stage) {
			maxSizeY = (simulatorObjects[i].topPos / 100) + 2 + i;
		}
		if (((simulatorObjects[i].leftPos / 100) - 1 + 2) > maxSizeX
			&& simulatorObjects[i].stage == stage) {
			maxSizeX = ((simulatorObjects[i].leftPos / 100) - 1 + 2);
		}
		/*if (((simulatorObjects[i].topPos / 100) + 2) > maxSizeY
			&& simulatorObjects[i].stage == stage) {
			maxSizeY = (simulatorObjects[i].topPos / 100) + 2;
		}
		if (((simulatorObjects[i].leftPos / 100) - 1 + i + 2) > maxSizeX
			&& simulatorObjects[i].stage == stage) {
			maxSizeX = ((simulatorObjects[i].leftPos / 100) - 1 + i + 2);
		}*/
		//!!!!
	}

	gridSizeX = maxSizeX;
	gridSizeY = maxSizeY;

	UpdateCanvasGrid();
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
			stage = parseInt(this.name)
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
	// var panel = document.getElementById("canvastabpanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// var addContentType = document.createElement("button");
	// addContentType.id = "btn-canvastab";
	// addContentType.onclick = function () {
	// 	AddNewStage();
	// };
	// var addContent = document.createTextNode("+");
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);
	// let i = 0;
	// for (i = 0; i < numOfStages; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.id = "btn-canvastab";
	// 	addContentType.name = i;
	// 	if (stage == i) {
	// 		addContentType.style.backgroundColor = "#aaa";
	// 		addContentType.style.color = "#fff";
	// 	} else {
	// 		addContentType.style.backgroundColor = "#eee";
	// 		addContentType.style.color = "#000";
	// 	}
	// 	addContentType.onclick = function () {
	// 		stage = i;
	// 		UpdateSelectedStage(this.name);
	// 	};
	// 	var addContent = document.createTextNode(i);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }

	CheckRedrawCanvasGrid();
	DrawAllArrowsOnCanvas();
	SetItemsVisibleInStage();
	DisableCertainObjectButtons();
}

/* 	SetItemsVisibleInStage()
	- Set what simulator items should be visible, based on current stage.	
*/
function SetItemsVisibleInStage() {

	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		console.log("SetItemsVisibleInStage(), i = " + i
			+ " simulatorObjects.name = " + simulatorObjects[i].name
			+ " objectRef = " + simulatorObjects[i].objectRef
			+ " objectRef.style = " + simulatorObjects[i].objectRef.style);
		if (simulatorObjects[i].stage == stage) {
			simulatorObjects[i].objectRef.style.visibility = 'visible';
		} else {
			simulatorObjects[i].objectRef.style.visibility = 'hidden';
		}
	}

}




/*	dragStart()
	- After clicking on draggable object, check current state to decide how to handle logic.
*/
function dragStart(e) {
	if (selectState == 0) {
		dragStartMove(e);
	} else if (selectState == 1) {
		ConfigureItemFromCanvas(e);
	} else if (selectState == 2) {
		ConnectSimAndMessage(e);
	} else if (selectState == 3) {
		DeleteItemFromCanvas(e);
		AddToUndoBuffer("Deleting object on canvas.");
	}
}

/*	dragStartMove()
	- if in "Select" state, allow moving object (if an object on the canvas)
*/
function dragStartMove(e) {
	var clickedOnItem = -1;
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (e.target === simulatorObjects[i].objectRef) {
			clickedOnItem = i;
			break;
		}
	}
	if (clickedOnItem > -1) {
		dragItem = simulatorObjects[i].objectRef;
		xOffset = simulatorObjects[i].offsetX;
		yOffset = simulatorObjects[i].offsetY;

		if (active === false) {
			if (e.type === "touchstart") {
				initialX = e.touches[0].clientX;
				initialY = e.touches[0].clientY;
			} else {
				initialX = e.clientX - xOffset;
				initialY = e.clientY - yOffset;
			}
			active = true;
			AddToUndoBuffer("Moving object on canvas.");
		} else {
			active = false;
			initialX = Math.round(currentX / 100) * 100;
			initialY = Math.round(currentY / 100) * 100;
			currentX = Math.round(currentX / 100) * 100;
			currentY = Math.round(currentY / 100) * 100;
			xOffset = currentX;
			yOffset = currentY;

			setTranslate(currentX, currentY, dragItem);

			simulatorObjects[i].offsetX = xOffset;
			simulatorObjects[i].offsetY = yOffset;
			simulatorObjects[i].topPos = (getTranslate3d(dragItem.style.transform))[1];
			simulatorObjects[i].leftPos = (getTranslate3d(dragItem.style.transform))[0];
			simulatorObjects[i].order = ((simulatorObjects[i].offsetY / 100) + i);

			CheckRedrawCanvasGrid();
			DrawAllArrowsOnCanvas();
		}
	} else {
		active = false;
	}
}

/*	dragEnd()
	- (called when finished dragging an object on the canvas; do nothing)
*/
function dragEnd(e) { }

/*	drag()
	- called when continuing to drag mouse along screen, to drag active object with it.
*/
function drag(e) {
	if (active == true && selectState == 0) {
		e.preventDefault();

		if (e.type === "touchmove") {
			currentX = e.touches[0].clientX - initialX;
			currentY = e.touches[0].clientY - initialY;
		} else {
			currentX = e.clientX - initialX;
			currentY = e.clientY - initialY;
		}
		xOffset = currentX;
		yOffset = currentY;

		setTranslate(currentX, currentY, dragItem);
	}
}

/*	setTranslate()
	- set position of div on canvas to specific x/y coordinates.
*/
function setTranslate(xPos, yPos, el) {
	el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
}

/*	getTranslate3d()
	- get position data for specific object. 
*/
function getTranslate3d(e1) {
	console.log("getTranslate3d of " + e1);
	var values = e1.replace(/translate3d\(|px|\)/g, "").replace(" ", "").split(',');
	return values;
}

/*	DeleteItemFromCanvas()
	- Delete item from canvas, where 'e' is the selected object.
*/
function DeleteItemFromCanvas(e) {
	var clickedOnItem = -1;

	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (e.target === simulatorObjects[i].objectRef) {
			clickedOnItem = i;
			break;
		}
	}
	if (clickedOnItem > -1) {
		simulatorObjects[i].objectRef.parentNode.removeChild(simulatorObjects[i].objectRef);
		simulatorObjects.splice(i, 1);
		// because all objects are relative, 
		//		deleting one object makes other objects (that were added after i) 
		//		move up one space. Need to reset everyone.
		MoveObjectsOnCanvasUpOne(i);
		UpdateDrawArrowsAfterDelete(i, -1);
		return;
	}

	clickedOnItem = -1;
	var listOfMessageVars = document.getElementsByClassName("div-canvas-message");
	for (i = 0; i < listOfMessageVars.length; i++) {
		if (e.target === listOfMessageVars[i]) {
			clickedOnItem = i;
			break;
		}
	}
	if (clickedOnItem > -1) {
		listOfMessageVars[clickedOnItem].parentNode.removeChild(listOfMessageVars[clickedOnItem]);
		messageObjects.splice(clickedOnItem, 1);
		MoveMessagesOnCanvasUpOne(clickedOnItem);
		UpdateDrawArrowsAfterDelete(-1, clickedOnItem);
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
		simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedMessages.splice(listOfSimPub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedDetails.splice(listOfSimPub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedInitial.splice(listOfSimPub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedTimeDelta.splice(listOfSimPub[clickedOnItem].name, 1);
		UpdateDrawArrowsAfterDelete(-1, -1);
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
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedMessages.splice(listOfSimSub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedDetails.splice(listOfSimSub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedInitial.splice(listOfSimSub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedTimeDelta.splice(listOfSimSub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedRelative.splice(listOfSimSub[clickedOnItem].name, 1);
		simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedTimestep.splice(listOfSimSub[clickedOnItem].name, 1);
		UpdateDrawArrowsAfterDelete(-1, -1);
		return;
	}
}

/*	DeleteItemFromCanvasById()
	- Delete simulator from canvas by ID (if we deleted it from list on the left, 
			we need to delete it everywhere else too.)
*/
function DeleteItemFromCanvasById(id) {
	let i = id;
	simulatorObjects[i].objectRef.parentNode.removeChild(simulatorObjects[i].objectRef);
	simulatorObjects.splice(i, 1);
	// because all objects are relative, 
	//		deleting one object makes other objects (that were added after i) move up one space. 
	//		Need to reset everyone.
	MoveObjectsOnCanvasUpOne(i);
}

/*	DeleteMessageFromCanvasById()
	- Delete message from canvas by ID (if we deleted it from list on the left,
			we need to delete it everywhere else too.)
*/
function DeleteMessageFromCanvasById(id) {
	var listOfMessageVars = document.getElementsByClassName("div-canvas-message");
	listOfMessageVars[id].parentNode.removeChild(listOfMessageVars[id]);
	messageObjects.splice(id, 1);
	MoveMessagesOnCanvasUpOne(id);
}

/*	MoveObjectsOnCanvasUpOne()
	- Move simulator objects up 1 in Y position, to make up for middle object being removed.
		(While it doesn't seem like it, the canvas objects are positions relative to each other).
*/
function MoveObjectsOnCanvasUpOne(j) {
	let i = 0;
	for (i = j; i < simulatorObjects.length; i++) {
		dragItem = simulatorObjects[i].objectRef;
		//!!!!
		simulatorObjects[i].offsetY = simulatorObjects[i].offsetY + 100;
		//simulatorObjects[i].offsetX = simulatorObjects[i].offsetX + 100;
		//!!!!
		setTranslate(simulatorObjects[i].offsetX, simulatorObjects[i].offsetY, dragItem);
	}
}

/*	MoveMessageOnCanvasUpOne()
	- Move message objects up 1 in Y position, to make up for middle object being removed.
		(While it doesn't seem like it, the canvas objects are positions relative to each other).
*/
function MoveMessagesOnCanvasUpOne(j) {
	var listOfMessageVars = document.getElementsByClassName("div-canvas-message");
	let i = 0;
	for (i = j; i < listOfMessageVars.length; i++) {
		dragItem = listOfMessageVars[i];
		dragItem.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" + (10 + (42 * i)) + "px;";
	}
}

/*	ConnectSimAndMessage()
	- Draw arrow from Sim and Message, and set "subscribe/publish" data.
*/
function ConnectSimAndMessage(e) {
	console.log("asked to draw arrow on canvas");
	var clickedOnItem = -1;
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (e.target === simulatorObjects[i].objectRef) {
			clickedOnItem = i;
			break;
		}
	}

	if (clickedOnItem > -1) {
		if (active == false) {
			// if active == false, then this is the first item clicked. Prepare Sim to Message connection.
			dragItem = simulatorObjects[clickedOnItem];
			dragItem.objectRef.style.backgroundColor = "#ffaa00";
			active = true;
			console.log("focused object during Connection");
		} else {
			// if active == true, and 'dragItem' is of type 'Message', then draw Message to Sim connection.
			// else, make active = false, undo state.
			// else, if active == true and 'dragItem' is of type' Sim, What to do? Undo previous selection and make new selection, without active = false.
			var dragItemIsSim = false;
			let i = 0;
			for (i = 0; i < simulatorObjects.length; i++) {
				if (simulatorObjects[i] == dragItem) {
					dragItemIsSim = true;
				}
			}
			if (dragItemIsSim == false) {
				// must have originally clicked on Message object. Make connection from Message to Sim.
				//what is the 'id' of the message? find that here:
				var dragItemId = 0;
				let i = 0;
				for (i = 0; i < messageObjects.length; i++) {
					if (messageObjects[i] == dragItem) {
						dragItemId = i;
						break;
					}
				}
				NewSubscribeConnectionPrompt(i, clickedOnItem);
				simulatorObjects[clickedOnItem].subscribedMessages.push(dragItemId);
				DrawAllArrowsOnCanvas();
				active = false;
				if (dragItem != null) {
					dragItem.objectRef.style.backgroundColor = "";
				}
				dragItem = simulatorObjects[clickedOnItem];
				console.log("Connection, sim clicked, set active = false");
				AddToUndoBuffer("Create subscribe connection on canvas.");
			} else {
				dragItem.objectRef.style.backgroundColor = "";
				dragItem = simulatorObjects[clickedOnItem];
				dragItem.objectRef.style.backgroundColor = "#ffaa00";
				active = true;
				console.log("Connection, sim clicked, set active = true");
			}
		}
		return;
	}

	clickedOnItem = -1;
	for (i = 0; i < messageObjects.length; i++) {
		if (e.target === messageObjects[i].objectRef) {
			clickedOnItem = i;
			break;
		}
	}
	if (clickedOnItem > -1) {
		if (active == false) {
			// if active == false, then this is the first item clicked. Prepare Sim to Message connection.
			dragItem = messageObjects[clickedOnItem];
			dragItem.objectRef.style.backgroundColor = "#ffaa00";
			active = true;
			console.log("focused message object during Connection");
		} else {
			// if active == true, and 'dragItem' is of type 'Message', then draw Message to Sim connection.
			// else, make active = false, undo state.
			// else, if active == true and 'dragItem' is of type' Sim, What to do? Undo previous selection and make new selection, without active = false.
			var dragItemIsSim = false;
			let i = 0;
			for (i = 0; i < simulatorObjects.length; i++) {
				if (simulatorObjects[i] == dragItem) {
					dragItemIsSim = true;
					break;
				}
			}
			if (dragItemIsSim == true) {
				NewPublishConnectionPrompt(clickedOnItem, i);
				// must have originally clicked on Simulator object. Make connection from Sim to Message.
				dragItem.publishedMessages.push(clickedOnItem);
				DrawAllArrowsOnCanvas();
				active = false;
				if (dragItem != null) {
					dragItem.objectRef.style.backgroundColor = "";
				}
				dragItem = simulatorObjects[i];
				console.log("Connection, message clicked, set active = false");
				AddToUndoBuffer("Create publish connection on canvas.");
			} else {
				dragItem.objectRef.style.backgroundColor = "";
				dragItem = messageObjects[clickedOnItem];
				dragItem.objectRef.style.backgroundColor = "#ffaa00";
				active = true;
				console.log("Connection, message clicked, set active = true");
			}
		}
		return;
	}

	active = false;
	if (dragItem != null) {
		dragItem.objectRef.style.backgroundColor = "";
	}
	dragItem = null;
	console.log("Connection, nothing clicked, set active = false.");
}

/*	DrawAllArrowsOnCanvas()
	- Remove arrows, redraw them all, to represent publish/subscribe 
		(occurs across 2 canvas panels).
*/
function DrawAllArrowsOnCanvas() {
	ResetArrowOnCanvas();

	DrawArrowOnCanvas1();
	DrawArrowOnCanvas2();

	DrawArrowObjectOnCanvas1();
	DrawArrowObjectOnCanvas2();
}

/*	ResetArrowOnCanvas()
	- Called to remove arrows, after moving a simulator across a canvas.
*/
function ResetArrowOnCanvas() {
	var panel = document.getElementById("canvassubpanel1arrows");
	while (panel.firstChild) {
		panel.removeChild(panel.firstChild);
	}
	panel = document.getElementById("canvassubpanel2arrows");
	while (panel.firstChild) {
		panel.removeChild(panel.firstChild);
	}
}

/*	DrawArrowOnCanvas1()
	- Draw arrows on top canvas (where simulators are), going down to bottom panel.
*/
function DrawArrowOnCanvas1() {
	// first, clear panel with arrows
	// second, redraw all arrows
	var panel = document.getElementById("canvassubpanel1arrows");
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			console.log("simulatorObjects.offsetY = " + simulatorObjects[i].offsetY + " , topPos = " + simulatorObjects[i].topPos);
			for (j = 0; j < simulatorObjects[i].publishedMessages.length; j++) {
				//!!!!
				var leftPos = parseInt(simulatorObjects[i].leftPos, 10) + (j * 5) + 2;
				var topPos = parseInt(simulatorObjects[i].offsetY, 10) + (i * 100) + 100 + 2 + (14 * j);
				//var leftPos = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + (j * 5) + 2;
				//var topPos = parseInt(simulatorObjects[i].topPos, 10) + 100 + 2 + (14 * j);
				//!!!!
				var htmlString = "<svg width='" + (leftPos + 10) + "' height='" + (gridSizeY * 100) + "' style='position: absolute;'>";
				htmlString += "<defs>";
				htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
				htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
				htmlString += "	</marker>";
				htmlString += "</defs>";
				htmlString += "<path d='M" + leftPos + "," + topPos + "L" + leftPos + "," + ((gridSizeY * 100)) + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
				htmlString += "</svg>";
				panel.insertAdjacentHTML("beforeend", htmlString);
			}
		}
	}

	panel = document.getElementById("canvassubpanel2arrows");
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			let j = 0;
			for (j = 0; j < simulatorObjects[i].publishedMessages.length; j++) {
				//!!!!
				var leftPos = parseInt(simulatorObjects[i].leftPos, 10) + (j * 5) + 2;
				//var leftPos = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + (j * 5) + 2;
				//!!!!
				var topPos = 0;
				var bottomPos = (10 + (42 * simulatorObjects[i].publishedMessages[j]) - 10 + 3);
				var htmlString = "<svg width='" + (leftPos + 10) + "' height='" + (bottomPos + 10) + "' style='position: absolute;'>";
				htmlString += "<defs>";
				htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
				htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
				htmlString += "	</marker>";
				htmlString += "</defs>";
				// end point of arrow: starting position of Message object, - height of arrow + 3 
				htmlString += "<path d='M" + leftPos + "," + topPos + "L" + leftPos + "," + bottomPos + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
				htmlString += "</svg>";
				panel.insertAdjacentHTML("beforeend", htmlString);
			}
		}
	}
}

/*	DrawArrowObjectOnCanvas1()
	- Draw small boxes underneath simulators to connect the arrows to.
*/
function DrawArrowObjectOnCanvas1() {
	var panel = document.getElementById("canvassubpanel1arrows");

	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			let j = 0;
			for (j = 0; j < simulatorObjects[i].publishedMessages.length; j++) {
				var addContentType = document.createElement("svg");
				//!!!!
				var leftOffset = parseInt(simulatorObjects[i].leftPos, 10) + 1;
				var topOffset = parseInt(simulatorObjects[i].offsetY, 10) + (i * 100) + 100 + 2 + (14 * j);
				//var leftOffset = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + 1;
				//var topOffset = parseInt(simulatorObjects[i].topPos, 10) + 100 + 2 + (14 * j);
				//!!!!
				addContentType.className = "div-canvas-pub";
				addContentType.name = j;
				addContentType.nameParent = i;
				addContentType.setAttribute("name", j);
				addContentType.style = "position: absolute; left: " + leftOffset + "px; top: " + topOffset + "px;";
				panel.appendChild(addContentType);
			}
		}
	}
}

/*	DrawArrowOnCanvas2()
	- Draw arrows on bottom canvas (where messages are) up to the top canvas panel. 
*/
function DrawArrowOnCanvas2() {
	var panel = document.getElementById("canvassubpanel1arrows");
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			console.log("simulatorObjects.offsetY = " + simulatorObjects[i].offsetY + " , topPos = " + simulatorObjects[i].topPos);
			let j = 0;
			for (j = 0; j < simulatorObjects[i].subscribedMessages.length; j++) {
				//!!!!
				var leftPos = parseInt(simulatorObjects[i].leftPos, 10) + 100 - (j * 5) - 2;
				var topPos = parseInt(simulatorObjects[i].offsetY, 10) + (i * 100) + 100 + (14 * j) + 10 + 10;
				//var leftPos = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + 100 - (j * 5) - 2;
				//var topPos = parseInt(simulatorObjects[i].topPos, 10) + 100 + (14 * j) + 10 + 10;
				//!!!!
				var htmlString = "<svg width='" + (leftPos + 10) + "' height='" + (gridSizeY * 100) + "' style='position: absolute;'>";
				htmlString += "<defs>";
				htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
				htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
				htmlString += "	</marker>";
				htmlString += "</defs>";
				htmlString += "<path d='M" + leftPos + "," + ((gridSizeY * 100)) + "L" + leftPos + "," + topPos + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
				htmlString += "</svg>";
				panel.insertAdjacentHTML("beforeend", htmlString);
			}
		}
	}

	panel = document.getElementById("canvassubpanel2arrows");
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			let j = 0;
			for (j = 0; j < simulatorObjects[i].subscribedMessages.length; j++) {
				//!!!!
				var leftPos = parseInt(simulatorObjects[i].leftPos, 10) + 100 - (j * 5) - 2;
				//var leftPos = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + 100 - (j * 5) - 2;
				//!!!!
				var topPos = 0;
				var bottomPos = (10 + (42 * parseInt(simulatorObjects[i].subscribedMessages[j])));
				var htmlString = "<svg width='" + (leftPos + 10) + "' height='" + (bottomPos + 10) + "' style='position: absolute;'>";
				htmlString += "<defs>";
				htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
				htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
				htmlString += "	</marker>";
				htmlString += "</defs>";
				// end point of arrow: starting position of Message object, - height of arrow + 3 
				htmlString += "<path d='M" + leftPos + "," + bottomPos + "L" + leftPos + "," + topPos + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
				htmlString += "</svg>";
				panel.insertAdjacentHTML("beforeend", htmlString);
			}
		}
	}
}

/*	DrawArrowObjectOnCanvas2()
	- 
*/
function DrawArrowObjectOnCanvas2() {
	var panel = document.getElementById("canvassubpanel1arrows");
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		if (simulatorObjects[i].stage == stage) {
			let j = 0;
			for (j = 0; j < simulatorObjects[i].subscribedMessages.length; j++) {
				var addContentType = document.createElement("svg");
				//!!!!
				var leftOffset = parseInt(simulatorObjects[i].leftPos, 10) + 100 - 48 - 1;
				var topOffset = parseInt(simulatorObjects[i].offsetY, 10) + (i * 100) + 100 + 2 + (14 * j);
				//var leftOffset = parseInt(simulatorObjects[i].offsetX, 10) + (i * 100) + 100 - 48 - 1;
				//var topOffset = parseInt(simulatorObjects[i].topPos, 10) + 100 + 2 + (14 * j);
				//!!!!
				addContentType.className = "div-canvas-sub";
				addContentType.name = j;
				addContentType.nameParent = i;
				addContentType.setAttribute("name", j);
				addContentType.style = "position: absolute; left: " + leftOffset + "px; top: " + topOffset + "px;";
				panel.appendChild(addContentType);
			}
		}
	}
}

/*	UpdateDrawArrowsAfterDelete()
	- Redraw arrows after an item was deleted (required repositioning of some items underneath a sim).
*/
function UpdateDrawArrowsAfterDelete(simDelete, messageDelete) {
	if (simDelete != -1) {
		// don't need to do anything, arrow-data is stored with sim, so if it is deleted, just need to redraw.
	}
	if (messageDelete != -1) {
		let i = 0;
		for (i = 0; i < simulatorObjects.length; i++) {
			let j = 0;
			for (j = simulatorObjects[i].publishedMessages.length - 1; j >= 0; j--) {
				if (simulatorObjects[i].publishedMessages[j] == messageDelete) {
					simulatorObjects[i].publishedMessages.splice(j, 1);
					simulatorObjects[i].publishedDetails.splice(j, 1);
					simulatorObjects[i].publishedInitial.splice(j, 1);
					simulatorObjects[i].publishedTimeDelta.splice(j, 1);
				} else if (simulatorObjects[i].publishedMessages[j] > messageDelete) {
					simulatorObjects[i].publishedMessages[j]--;
				}
			}
			for (j = simulatorObjects[i].subscribedMessages.length - 1; j >= 0; j--) {
				if (simulatorObjects[i].subscribedMessages[j] == messageDelete) {
					simulatorObjects[i].subscribedMessages.splice(j, 1);
					simulatorObjects[i].subscribedDetails.splice(j, 1);
					simulatorObjects[i].subscribedInitial.splice(j, 1);
					simulatorObjects[i].subscribedTimeDelta.splice(j, 1);
					simulatorObjects[i].subscribedRelative.splice(j, 1);
					simulatorObjects[i].subscribedTimestep.splice(j, 1);
				} else if (simulatorObjects[i].subscribedMessages[j] > messageDelete) {
					simulatorObjects[i].subscribedMessages[j]--;
				}
			}
		}
	}
	DrawAllArrowsOnCanvas();
}

/*	DisplayOrClosePrompt()
	- General function to display a 'div' with grey overlay, to save code lines elsewhere.
*/
function DisplayOrClosePrompt(promptName, displayType) {
	document.getElementById("greyoverlay").style.display = displayType;
	document.getElementById(promptName).style.display = displayType;
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
var editExistingObject = -1;
var editExistingObject2 = -1;
function NewSimulatorObjectPrompt() {
	DisplayOrClosePrompt("modalNewSim", "block");
	if (editExistingObject == -1) {
		document.getElementsByName("NewSimName")[0].value = "";
		document.getElementsByName("NewSimRef")[0].value = "";
		document.getElementsByName("wrapperFileDirText")[0].innerHTML = "";
		document.getElementsByName("NewSimExecute")[0].value = "";
	} else {
		document.getElementsByName("NewSimName")[0].value = listOfSimulators[editExistingObject].name;
		document.getElementsByName("NewSimRef")[0].value = listOfSimulators[editExistingObject].refName;
		document.getElementsByName("wrapperFileDirText")[0].innerHTML = listOfSimulators[editExistingObject].filePath;
		document.getElementsByName("NewSimExecute")[0].value = listOfSimulators[editExistingObject].executeCommand;
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
		listOfMessageFunctions = listOfSimulators[editExistingObject].functions;
		listOfMessageObjects = listOfSimulators[editExistingObject].variables;
		UpdateObjectToSimulatorDef();
		UpdateFunctionToSimulatorDef();
	}
}

/*	CloseNewSimulatorObjectPrompt2()
	- Close second "new simulator" prompt.
*/
function CloseNewSimulatorObjectPrompt2() {
	DisplayOrClosePrompt("modalNewSim2", "none");

	listOfMessageObjects = [];
	listOfMessageFunctions = [];
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
		listOfMessageObjects = listOfMessages[editExistingObject].variables;
		document.getElementsByName("NewMessageName")[0].value = listOfMessages[editExistingObject].name;
		UpdateObjectToMessageDef();
	}
}

/*	CloseNewMessageObjectPrompt()
	- Close "new message" prompt.
*/
function CloseNewMessageObjectPrompt() {
	DisplayOrClosePrompt("modalNewMessage", "none");
	listOfMessageObjects = [];
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
	message.append($('<label>').addClass('ui color-message label').text(messageName))

	let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
	simulator.append($('<label>').addClass('ui color-simulator label').text(simulatorName))

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


	for (j = 0; j < simulatorObjects[simulator_id].original.variables.length; j++) {
		item = $('<div>', {
			class: 'item',
			'data-value': j,
			text: simulatorObjects[simulator_id].original.variables[j].name + " ("
				+ simulatorObjects[simulator_id].original.variables[j].valueType + ")",
			originalObjectId: simulator_id,
		})

		menu.append(item)
	}

	dropdown.append($('<input>', { type: 'hidden' }))
	dropdown.append($('<i>', { class: 'dropdown icon' }))
	dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
	dropdown.append(menu)

	for (i = 0; i < messageObjects[message_id].original.variables.length; i++) {
		console.log("add variable to list here... " + i);
		messageVar = $('<div>').addClass('nine wide middle aligned continued column')
		label = $('<label>').text(messageObjects[message_id].original.variables[i].name + " ("
			+ messageObjects[message_id].original.variables[i].valueType + ")")

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

	// let i = 0;
	// var addContentType = document.createElement("button");
	// addContentType.style = "width:100%;height:42px;";
	// addContentType.id = i;
	// addContentType.disabled = true;
	// addContentType.originalObjectId = simulator_id;
	// addContentType.variableObjectId = -1;
	// addContentType.onclick = function () {
	// 	var getSelectSimId = this.variableObjectId;
	// 	PublishConnectionPromptSelectSimVar(getSelectSimId);
	// };
	// var addContent = document.createTextNode("(DEFAULT)");
	// addContentType.appendChild(addContent);
	// simulatorVariableDiv.appendChild(addContentType);
	// for (i = 0; i < simulatorObjects[simulator_id].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.style = "width:100%;height:42px;";
	// 	addContentType.id = i;
	// 	addContentType.disabled = true;
	// 	addContentType.originalObjectId = simulator_id;
	// 	addContentType.variableObjectId = i;
	// 	addContentType.onclick = function () {
	// 		var getSelectSimId = this.variableObjectId;
	// 		PublishConnectionPromptSelectSimVar(getSelectSimId);
	// 	};
	// 	addContent = document.createTextNode(simulatorObjects[simulator_id].original.variables[i].name + " ("
	// 		+ simulatorObjects[simulator_id].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	simulatorVariableDiv.appendChild(addContentType);
	// }

	// var messageVariableDiv = document.getElementById("modalPublishDetailsMessageList");
	// while (messageVariableDiv.firstChild) {
	// 	messageVariableDiv.removeChild(messageVariableDiv.firstChild);
	// }
	// for (i = 0; i < messageObjects[message_id].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.id = i;
	// 	addContentType.style = "width:50%;height:42px;position:relative;verticalAlign:top;";
	// 	addContentType.disabled = false;
	// 	addContentType.originalObjectId = message_id;
	// 	addContentType.messageObjectId = i;
	// 	addContentType.variableObjectId = -1;
	// 	addContentType.onclick = function () {
	// 		var getSelectMessageVarId = this.messageObjectId;
	// 		var getSelectMessageId = this.originalObjectId;
	// 		PublishConnectionPromptSelectMessageVar(getSelectMessageId, getSelectMessageVarId);
	// 	};
	// 	addContent = document.createTextNode(messageObjects[message_id].original.variables[i].name + " ("
	// 		+ messageObjects[message_id].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	var addContentType2 = document.createElement("button");
	// 	addContentType2.id = i;
	// 	addContentType2.varId = -1;
	// 	addContentType2.style = "width:50%;height:42px;position:relative;verticalAlign:top;";
	// 	addContentType2.disabled = true;
	// 	addContentType2.onclick = function () {
	// 	};
	// 	var addContent = document.createTextNode("(DEFAULT)");
	// 	addContentType2.appendChild(addContent);
	// 	addContentType.varRef = addContentType2;
	// 	messageVariableDiv.appendChild(addContentType);
	// 	messageVariableDiv.appendChild(addContentType2);
	// }
}

/*	EditPublishConnectionPrompt()
	- Open prompt to edit existing details to a publish connection ("
*/
function EditPublishConnectionPrompt() {
	DisplayOrClosePrompt("modalPublishDetails", "block");

	let originalMessageId = simulatorObjects[editExistingObject].publishedMessages[editExistingObject2];
	let messageName = messageObjects[simulatorObjects[editExistingObject].publishedMessages[editExistingObject2]].name;
	let simulatorName = simulatorObjects[editExistingObject].name;
	let publishedDetail = simulatorObjects[editExistingObject].publishedDetails[editExistingObject2];

	let segment = $('#modalPublishDetailsSegment')
	segment.empty()

	let message = $('<div>').addClass('nine wide middle aligned column').text('Message Name:')
	message.append($('<label>').addClass('ui color-message label').text(messageName))

	let simulator = $('<div>').addClass('six wide middle aligned column').text('Simulator Name:')
	simulator.append($('<label>').addClass('ui color-simulator label').text(simulatorName))

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


	for (j = 0; j < simulatorObjects[editExistingObject].original.variables.length; j++) {
		item = $('<div>', {
			class: 'item',
			'data-value': j,
			text: simulatorObjects[editExistingObject].original.variables[j].name + " ("
				+ simulatorObjects[editExistingObject].original.variables[j].valueType + ")",
			originalObjectId: editExistingObject,
		})

		menu.append(item)
	}

	dropdown.append($('<input>', { type: 'hidden' }))
	dropdown.append($('<i>', { class: 'dropdown icon' }))
	dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
	dropdown.append(menu)

	for (i = 0; i < messageObjects[originalMessageId].original.variables.length; i++) {
		console.log("add variable to list here... " + i);
		messageVar = $('<div>').addClass('nine wide middle aligned continued column')
		label = $('<label>').text(messageObjects[originalMessageId].original.variables[i].name + " ("
			+ messageObjects[originalMessageId].original.variables[i].valueType + ")")

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
	// var initial = "false";
	// var timeDelta = 1;
	// initial = simulatorObjects[editExistingObject].publishedInitial[editExistingObject2];
	// timeDelta = simulatorObjects[editExistingObject].publishedTimeDelta[editExistingObject2];
	// var radioList = document.getElementsByName("radioPublishInitial");
	// for (i = 0; i < radioList.length; i++) {
	// 	if (radioList[i].value == initial) {
	// 		radioList[i].checked = true;
	// 		break;
	// 	}
	// }



	// assumed this function is only called when editing existing 
	// var div01 = document.getElementById("modalPublishDetailsTitle01");
	// var div02 = document.getElementById("modalPublishDetailsTitle02");
	// div01.innerHTML = "Message Name: " + messageName + " <br>Message Variables:";
	// div02.innerHTML = "Simulator Name: " + simulatorName + " <br>Simulator Variables:";
	// var simulatorVariableDiv = document.getElementById("modalPublishDetailsSimList");
	// while (simulatorVariableDiv.firstChild) {
	// 	simulatorVariableDiv.removeChild(simulatorVariableDiv.firstChild);
	// }

	// let i = 0;
	// var addContentType = document.createElement("button");
	// addContentType.style = "width:100%;height:42px;";
	// addContentType.id = i;
	// addContentType.disabled = true;
	// addContentType.originalObjectId = editExistingObject;
	// addContentType.variableObjectId = -1;
	// addContentType.onclick = function () {
	// 	var getSelectSimId = this.variableObjectId;
	// 	PublishConnectionPromptSelectSimVar(getSelectSimId);
	// };
	// var addContent = document.createTextNode("(DEFAULT)");
	// addContentType.appendChild(addContent);
	// simulatorVariableDiv.appendChild(addContentType);
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.style = "width:100%; height:42px;";
	// 	addContentType.id = i;
	// 	addContentType.disabled = true;
	// 	addContentType.originalObjectId = editExistingObject;
	// 	addContentType.variableObjectId = i;
	// 	addContentType.onclick = function () {
	// 		var getSelectSimId = this.variableObjectId;
	// 		PublishConnectionPromptSelectSimVar(getSelectSimId);
	// 	};
	// 	addContent = document.createTextNode(simulatorObjects[editExistingObject].original.variables[i].name + " ("
	// 		+ simulatorObjects[editExistingObject].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	simulatorVariableDiv.appendChild(addContentType);
	// }

	// var messageVariableDiv = document.getElementById("modalPublishDetailsMessageList");
	// while (messageVariableDiv.firstChild) {
	// 	messageVariableDiv.removeChild(messageVariableDiv.firstChild);
	// }
	// for (i = 0; i < messageObjects[originalMessageId].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.id = i;
	// 	addContentType.style = "width:50%;height:42px;position:relative;verticalAlign:top;";
	// 	addContentType.disabled = false;
	// 	//addContentType.originalObjectId = editExistingObject2;
	// 	addContentType.originalObjectId = originalMessageId;
	// 	addContentType.messageObjectId = i;
	// 	addContentType.variableObjectId = -1;
	// 	addContentType.onclick = function () {
	// 		var getSelectMessageVarId = this.messageObjectId;
	// 		var getSelectMessageId = this.originalObjectId;
	// 		PublishConnectionPromptSelectMessageVar(getSelectMessageId, getSelectMessageVarId);
	// 	};
	// 	addContent = document.createTextNode(messageObjects[originalMessageId].original.variables[i].name + " ("
	// 		+ messageObjects[originalMessageId].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	var addContentType2 = document.createElement("button");
	// 	addContentType2.id = i;
	// 	addContentType2.varId = -1;
	// 	addContentType2.style = "width:50%; height:42px; position:relative; verticalAlign:top;";
	// 	addContentType2.disabled = true;
	// 	addContentType2.onclick = function () {

	// 	};
	// 	var addContentText = "(DEFAULT)";
	// 	let j = 0;
	// 	for (j = 0; j < publishedDetail.length; j++) {
	// 		if (publishedDetail[j][0] == i && publishedDetail[j][1] != -1) {
	// 			// then "publishedDetail[j][1]" is the index of the simulator's variable that corresponds to it
	// 			addContentText = simulatorObjects[editExistingObject].original.variables[publishedDetail[j][1]].name + " ("
	// 				+ simulatorObjects[editExistingObject].original.variables[publishedDetail[j][1]].valueType + ")";
	// 			addContentType2.varId = publishedDetail[j][1];
	// 		}
	// 	}
	// 	var addContent = document.createTextNode(addContentText);
	// 	addContentType2.appendChild(addContent);
	// 	addContentType.varRef = addContentType2;
	// 	messageVariableDiv.appendChild(addContentType);
	// 	messageVariableDiv.appendChild(addContentType2);
	// }

	// var initial = "false";
	// var timeDelta = 1;
	// initial = simulatorObjects[editExistingObject].publishedInitial[editExistingObject2];
	// timeDelta = simulatorObjects[editExistingObject].publishedTimeDelta[editExistingObject2];
	// var radioList = document.getElementsByName("radioPublishInitial");
	// for (i = 0; i < radioList.length; i++) {
	// 	if (radioList[i].value == initial) {
	// 		radioList[i].checked = true;
	// 		break;
	// 	}
	// }
	// document.getElementsByName("textPublishDelta")[0].value = timeDelta;
}

/*	PublishConnectionPromptSelectMessageVar()
	- What happens in "new publish connection" prompt when you click on a message variable?
*/
var selectMessageId;
function PublishConnectionPromptSelectMessageVar(original_id, message_id) {
	selectMessageId = message_id;
	var messageList = document.getElementById("modalPublishDetailsMessageList").children;
	let i = 0;
	for (i = 0; i < messageList.length; i++) {
		if (messageList[i].messageObjectId == message_id) {
			messageList[i].style.backgroundColor = "#fff";
		} else {
			messageList[i].style.backgroundColor = "";
		}
	}
	var variableList = document.getElementById("modalPublishDetailsSimList").children;
	for (i = 0; i < variableList.length; i++) {
		if (variableList[i].variableObjectId == -1) {
			variableList[i].disabled = false;
		} else if (simulatorObjects[variableList[i].originalObjectId].original.variables[variableList[i].variableObjectId].valueType
			== messageObjects[original_id].original.variables[message_id].valueType) {
			variableList[i].disabled = false;
		} else {
			variableList[i].disabled = true;
		}
	}
}

/*	PublishConnectionPromptSelectSimVar()
	- What happens in "new publish connection" prompt when you click on a simulator variable?
*/
function PublishConnectionPromptSelectSimVar(sim_id) {
	var variableList = document.getElementById("modalPublishDetailsSimList").children;
	console.log("sim_id = " + sim_id);
	console.log("variableList[sim_id].originalObjectId = " + variableList[sim_id + 1].originalObjectId);
	console.log("variableList[sim_id].variableObjectId = " + variableList[sim_id + 1].variableObjectId);
	var newVarName = "";
	if (sim_id == -1) {
		newVarName = "(DEFAULT)";
	} else {
		newVarName = simulatorObjects[variableList[sim_id + 1].originalObjectId].original.variables[variableList[sim_id + 1].variableObjectId].name
			+ " (" + simulatorObjects[variableList[sim_id + 1].originalObjectId].original.variables[variableList[sim_id + 1].variableObjectId].valueType + ")";
	}
	console.log("new name is = " + newVarName);
	var messageList = document.getElementById("modalPublishDetailsMessageList").children;
	let i = 0;
	for (i = 0; i < messageList.length; i++) {
		if (messageList[i].messageObjectId == selectMessageId) {
			messageList[i].varRef.innerText = newVarName;
			messageList[i].varRef.varId = sim_id;
		}
	}
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


	// for (i = 0; i < messageList.length; i++) {
	// 	if (typeof (messageList[i].varRef) !== 'undefined') {
	// 		console.log("MessageList[i] = " + messageList[i].id);
	// 		console.log("VarRef = " + messageList[i].varRef);
	// 		newDetails.push([messageList[i].id, messageList[i].varRef.varId]);
	// 		console.log("I added the following details : " + messageList[i].id + " " + messageList[i].varRef.varId);
	// 	}
	// }

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
	simulator.append($('<label>').addClass('ui color-simulator label').text(simulatorName))

	let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
	message.append($('<label>').addClass('ui color-message label').text(messageName))

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


	for (j = 0; j < messageObjects[message_id].original.variables.length; j++) {
		item = $('<div>', {
			class: 'item',
			'data-value': j,
			text: messageObjects[message_id].original.variables[j].name + " ("
				+ messageObjects[message_id].original.variables[j].valueType + ")",
			originalObjectId: message_id,
		})

		menu.append(item)
	}

	dropdown.append($('<input>', { type: 'hidden' }))
	dropdown.append($('<i>', { class: 'dropdown icon' }))
	dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
	dropdown.append(menu)

	for (i = 0; i < simulatorObjects[simulator_id].original.variables.length; i++) {
		console.log("add variable to list here... " + i);
		simVar = $('<div>').addClass('nine wide middle aligned continued column')
		label = $('<label>').text(simulatorObjects[simulator_id].original.variables[i].name + " ("
			+ simulatorObjects[simulator_id].original.variables[i].valueType + ")")

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

	// var messageName = messageObjects[message_id].name;
	// var simulatorName = simulatorObjects[simulator_id].name;
	// var div01 = document.getElementById("modalSubscribeDetailsTitle01");
	// var div02 = document.getElementById("modalSubscribeDetailsTitle02");
	// div01.innerHTML = "Message Name: " + messageName + " <br>Message Variables:";
	// div02.innerHTML = "Simulator Name: " + simulatorName + " <br>Simulator Variables:";

	// var messageVariableDiv = document.getElementById("modalSubscribeDetailsMessageList");
	// while (messageVariableDiv.firstChild) {
	// 	messageVariableDiv.removeChild(messageVariableDiv.firstChild);
	// }
	// let i = 0;
	// var addContentType = document.createElement("button");
	// addContentType.style = "width:100%;height:42px;";
	// addContentType.id = i;
	// addContentType.disabled = true;
	// addContentType.originalObjectId = message_id;
	// addContentType.variableObjectId = -1;
	// addContentType.onclick = function () {
	// 	var getSelectSimId = this.variableObjectId;
	// 	SubscribeConnectionPromptSelectMessageVar(getSelectSimId);
	// };
	// var addContent = document.createTextNode("(DEFAULT)");
	// addContentType.appendChild(addContent);
	// messageVariableDiv.appendChild(addContentType);
	// for (i = 0; i < messageObjects[message_id].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.style = "width:100%;height:42px;";
	// 	addContentType.id = i;
	// 	addContentType.disabled = true;
	// 	addContentType.originalObjectId = message_id;
	// 	addContentType.variableObjectId = i;
	// 	addContentType.onclick = function () {
	// 		var getSelectSimId = this.variableObjectId;
	// 		SubscribeConnectionPromptSelectMessageVar(getSelectSimId);
	// 	};
	// 	addContent = document.createTextNode(messageObjects[message_id].original.variables[i].name + " ("
	// 		+ messageObjects[message_id].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	messageVariableDiv.appendChild(addContentType);
	// }

	// var simulatorVariableDiv = document.getElementById("modalSubscribeDetailsSimList");
	// while (simulatorVariableDiv.firstChild) {
	// 	simulatorVariableDiv.removeChild(simulatorVariableDiv.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[simulator_id].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.id = i;
	// 	addContentType.style = "width:50%; height:42px; position:relative; verticalAlign:top;";
	// 	addContentType.disabled = false;
	// 	addContentType.originalObjectId = simulator_id;
	// 	addContentType.messageObjectId = i;
	// 	addContentType.variableObjectId = -1;
	// 	addContentType.onclick = function () {
	// 		var getSelectMessageVarId = this.messageObjectId;
	// 		var getSelectMessageId = this.originalObjectId;
	// 		SubscribeConnectionPromptSelectSimVar(getSelectMessageId, getSelectMessageVarId);
	// 	};
	// 	addContent = document.createTextNode(simulatorObjects[simulator_id].original.variables[i].name + " ("
	// 		+ simulatorObjects[simulator_id].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	var addContentType2 = document.createElement("button");
	// 	addContentType2.id = i;
	// 	addContentType2.varId = -1;
	// 	addContentType2.style = "width:50%; height:42px; position:relative; verticalAlign;:top;";
	// 	addContentType2.disabled = true;
	// 	addContentType2.onclick = function () {

	// 	};
	// 	var addContent = document.createTextNode("(DEFAULT)");
	// 	addContentType2.appendChild(addContent);
	// 	addContentType.varRef = addContentType2;
	// 	simulatorVariableDiv.appendChild(addContentType2);
	// 	simulatorVariableDiv.appendChild(addContentType);
	// }
}

/*	EditSubscribeConnectionPrompt()
	- Open prompt to edit "subscribe" connection (message -> sim)
*/
function EditSubscribeConnectionPrompt() {
	DisplayOrClosePrompt("modalSubscribeDetails", "block");

	let originalMessageId = simulatorObjects[editExistingObject].subscribedMessages[editExistingObject2];
	let messageName = messageObjects[originalMessageId].name;
	let simulatorName = simulatorObjects[editExistingObject].name;
	let subscribedDetail = simulatorObjects[editExistingObject].subscribedDetails[editExistingObject2];

	let segment = $('#modalSubscribeDetailsSegment')
	segment.empty()

	let simulator = $('<div>').addClass('nine wide middle aligned column').text('Simulator Name:')
	simulator.append($('<label>').addClass('ui color-simulator label').text(simulatorName))

	let message = $('<div>').addClass('six wide middle aligned column').text('Message Name:')
	message.append($('<label>').addClass('ui color-message label').text(messageName))

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


	for (j = 0; j < messageObjects[originalMessageId].original.variables.length; j++) {
		item = $('<div>', {
			class: 'item',
			'data-value': j,
			text: messageObjects[originalMessageId].original.variables[j].name + " ("
				+ messageObjects[originalMessageId].original.variables[j].valueType + ")",
			originalObjectId: originalMessageId,
		})

		menu.append(item)
	}

	dropdown.append($('<input>', { type: 'hidden' }))
	dropdown.append($('<i>', { class: 'dropdown icon' }))
	dropdown.append($('<div>', { class: 'default text', text: '(DEFAULT)' }))
	dropdown.append(menu)

	for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
		console.log("add variable to list here... " + i);
		simVar = $('<div>').addClass('nine wide middle aligned continued column')
		label = $('<label>').text(simulatorObjects[editExistingObject].original.variables[i].name + " ("
			+ simulatorObjects[editExistingObject].original.variables[i].valueType + ")")

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


	// console.log("edit subscribe connection prompt ... editExistingObject = "
	// 	+ editExistingObject + ", editExistingObject2 = " + editExistingObject2 + " id of Message = "
	// 	+ simulatorObjects[editExistingObject].subscribedMessages[editExistingObject2]);
	// var originalMessageId = simulatorObjects[editExistingObject].subscribedMessages[editExistingObject2];
	// var messageName = messageObjects[originalMessageId].name;
	// var simulatorName = simulatorObjects[editExistingObject].name;
	// var subscribedDetail = simulatorObjects[editExistingObject].subscribedDetails[editExistingObject2];
	// var div01 = document.getElementById("modalSubscribeDetailsTitle01");
	// var div02 = document.getElementById("modalSubscribeDetailsTitle02");
	// div01.innerHTML = "Message Name: " + messageName + " <br>Message Variables:";
	// div02.innerHTML = "Simulator Name: " + simulatorName + " <br>Simulator Variables:";
	// var messageVariableDiv = document.getElementById("modalSubscribeDetailsMessageList");
	// while (messageVariableDiv.firstChild) {
	// 	messageVariableDiv.removeChild(messageVariableDiv.firstChild);
	// }

	// let i = 0;
	// var addContentType = document.createElement("button");
	// addContentType.style = "width: 100%; height:42px;";
	// addContentType.id = i;
	// addContentType.disabled = true;
	// //addContentType.originalObjectId = editExistingObject2;
	// addContentType.originalObjectId = originalMessageId;
	// addContentType.variableObjectId = -1;
	// addContentType.onclick = function () {
	// 	var getSelectSimId = this.variableObjectId;
	// 	SubscribeConnectionPromptSelectMessageVar(getSelectSimId);
	// };
	// var addContent = document.createTextNode("(DEFAULT)");
	// addContentType.appendChild(addContent);
	// messageVariableDiv.appendChild(addContentType);
	// for (i = 0; i < messageObjects[originalMessageId].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.style = "width:100%; height:42px;";
	// 	addContentType.id = i;
	// 	addContentType.disabled = true;
	// 	//addContentType.originalObjectId = editExistingObject2;
	// 	addContentType.originalObjectId = originalMessageId;
	// 	addContentType.variableObjectId = i;
	// 	addContentType.onclick = function () {
	// 		var getSelectSimId = this.variableObjectId;
	// 		SubscribeConnectionPromptSelectMessageVar(getSelectSimId);
	// 	};
	// 	addContent = document.createTextNode(messageObjects[originalMessageId].original.variables[i].name + " ("
	// 		+ messageObjects[originalMessageId].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	messageVariableDiv.appendChild(addContentType);
	// }

	// var simulatorVariableDiv = document.getElementById("modalSubscribeDetailsSimList");
	// while (simulatorVariableDiv.firstChild) {
	// 	simulatorVariableDiv.removeChild(simulatorVariableDiv.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	console.log("add variable to list here... " + i);
	// 	addContentType = document.createElement("button");
	// 	addContentType.id = i;
	// 	addContentType.style = "width:50%; height:42px; position:relative; verticalAlign:top;"
	// 	addContentType.disabled = false;
	// 	addContentType.originalObjectId = editExistingObject;
	// 	addContentType.messageObjectId = i;
	// 	addContentType.variableObjectId = -1;
	// 	addContentType.onclick = function () {
	// 		var getSelectMessageVarId = this.messageObjectId;
	// 		var getSelectMessageId = this.originalObjectId;
	// 		SubscribeConnectionPromptSelectSimVar(getSelectMessageId, getSelectMessageVarId);
	// 	};
	// 	addContent = document.createTextNode(simulatorObjects[editExistingObject].original.variables[i].name + " ("
	// 		+ simulatorObjects[editExistingObject].original.variables[i].valueType + ")");
	// 	addContentType.appendChild(addContent);
	// 	var addContentType2 = document.createElement("button");
	// 	addContentType2.id = i;
	// 	addContentType2.varId = -1;
	// 	addContentType2.style = "width:50%; height:42px; position:relative; verticalAlign:top;";
	// 	addContentType2.disabled = true;
	// 	addContentType2.onclick = function () {

	// 	};
	// 	var addContentText = "(DEFAULT)";
	// 	let j = 0;
	// 	for (j = 0; j < subscribedDetail.length; j++) {
	// 		if (subscribedDetail[j][0] == i && subscribedDetail[j][1] != -1) {
	// 			// then "publishedDetail[j][1]" is the index of the simulator's variable that corresponds to it
	// 			addContentText = messageObjects[originalMessageId].original.variables[subscribedDetail[j][1]].name + " ("
	// 				+ messageObjects[originalMessageId].original.variables[subscribedDetail[j][1]].valueType + ")";
	// 			addContentType2.varId = subscribedDetail[j][1];
	// 		}
	// 	}
	// 	var addContent = document.createTextNode(addContentText);
	// 	addContentType2.appendChild(addContent);

	// 	addContentType.varRef = addContentType2;
	// 	simulatorVariableDiv.appendChild(addContentType2);
	// 	simulatorVariableDiv.appendChild(addContentType);
	// }

	// var initial = "false";
	// var timeDelta = 1;
	// var relative = 0;
	// var timestep = 0;
	// initial = simulatorObjects[editExistingObject].subscribedInitial[editExistingObject2];
	// timeDelta = simulatorObjects[editExistingObject].subscribedTimeDelta[editExistingObject2];
	// relative = simulatorObjects[editExistingObject].subscribedRelative[editExistingObject2];
	// timestep = simulatorObjects[editExistingObject].subscribedTimestep[editExistingObject2];
	// var radioList = document.getElementsByName("radioSubscribeInitial");
	// for (i = 0; i < radioList.length; i++) {
	// 	if (radioList[i].value == initial) {
	// 		radioList[i].checked = true;
	// 		break;
	// 	}
	// }
	// document.getElementsByName("textSubscribeDelta")[0].value = timeDelta;
	// document.getElementsByName("textSubscribeRelative")[0].value = relative;
	// document.getElementsByName("textSubscribeTimestep")[0].value = timestep;
}

/*	SubscribeConnectionPromptSelectSimVar()
	- What happens in "subscribe prompt" when we select sim variable?
*/
var selectSimId;
function SubscribeConnectionPromptSelectSimVar(original_id, sim_id) {
	selectSimId = sim_id;
	var simList = document.getElementById("modalSubscribeDetailsSimList").children;
	let i = 0;
	for (i = 0; i < simList.length; i++) {
		if (simList[i].simObjectId == sim_id) {
			simList[i].style.backgroundColor = "#fff";
		} else {
			simList[i].style.backgroundColor = "";
		}
	}
	var variableList = document.getElementById("modalSubscribeDetailsMessageList").children;
	for (i = 0; i < variableList.length; i++) {
		var abc1 = simulatorObjects[original_id];
		var abc2 = messageObjects[variableList[i].originalObjectId];
		if (variableList[i].variableObjectId == -1) {
			variableList[i].disabled = false;
		} else if (abc1.original.variables[sim_id].valueType
			== abc2.original.variables[variableList[i].variableObjectId].valueType) {
			variableList[i].disabled = false;
		} else {
			variableList[i].disabled = true;
		}
	}
}

/*	SubscribeConnectionPromptSelectMessageVar()
	- What happens in "subscribe prompt" when we select message variable?
*/
function SubscribeConnectionPromptSelectMessageVar(message_id) {
	var variableList = document.getElementById("modalSubscribeDetailsMessageList").children;
	var newVarName = "";
	if (message_id == -1) {
		newVarName = "(DEFAULT)";
	} else {
		newVarName = messageObjects[variableList[message_id + 1].originalObjectId].original.variables[variableList[message_id + 1].variableObjectId].name
			+ " (" + messageObjects[variableList[message_id + 1].originalObjectId].original.variables[variableList[message_id + 1].variableObjectId].valueType + ")";
	}
	var simList = document.getElementById("modalSubscribeDetailsSimList").children;
	let i = 0;
	for (i = 0; i < simList.length; i++) {
		if (simList[i].messageObjectId == selectSimId) {
			simList[i].varRef.varId = message_id;
			simList[i].varRef.innerText = newVarName;
		}
	}
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


	// for (i = 0; i < messageList.length; i++) {
	// 	if (typeof (messageList[i].varRef) !== 'undefined') {
	// 		console.log("MessageList[i] = " + messageList[i].id);
	// 		console.log("VarRef = " + messageList[i].varRef);
	// 		newDetails.push([messageList[i].id, messageList[i].varRef.varId]);
	// 		console.log("I added the following details : " + messageList[i].id + " " + messageList[i].varRef.varId);
	// 	}
	// }

	let initial = $('input[name=radioSubscribeInitial]:checked').val()
	let timeDelta = parseInt($('input[name=textSubscribeDelta]').val())
	let relative = parseInt($('input[name=textSubscribeRelative]').val())
	let timestep = parseInt($('input[name=textSubscribeTimestep]').val())
	// var newDetails = [];
	// // list of pairs: [index of message variable, index of simulator variable or -1 for default]
	// var simList = document.getElementById("modalSubscribeDetailsSimList").children;
	// let i = 0;
	// for (i = 0; i < simList.length; i++) {
	// 	if (typeof (simList[i].varRef) !== 'undefined') {
	// 		console.log("SimList[i] = " + simList[i].id);
	// 		console.log("VarRef = " + simList[i].varRef);
	// 		newDetails.push([simList[i].id, simList[i].varRef.varId]);
	// 		console.log("I added the following details : " + simList[i].id + " " + simList[i].varRef.varId);
	// 	}
	// }

	// var initial = "false";
	// var timeDelta = 1;
	// var relative = 0;
	// var timestep = 0;
	// var radioList = document.getElementsByName("radioSubscribeInitial");
	// for (i = 0; i < radioList.length; i++) {
	// 	if (radioList[i].checked) {
	// 		initial = radioList[i].value;
	// 		break;
	// 	}
	// }
	// if (document.getElementsByName("textSubscribeDelta")[0].value != "") {
	// 	timeDelta = document.getElementsByName("textSubscribeDelta")[0].value;
	// }
	// if (document.getElementsByName("textSubscribeRelative")[0].value != "") {
	// 	relative = document.getElementsByName("textSubscribeRelative")[0].value;
	// }
	// if (document.getElementsByName("textSubscribeTimestep")[0].value != "") {
	// 	timestep = document.getElementsByName("textSubscribeTimestep")[0].value;
	// }
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
		listOfSimulators.push(obj.simdef);
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
	// var panel = document.getElementById("objectsubpanel1");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	var newSimName = document.getElementsByName("NewSimName")[0].value;
	var newRefName = document.getElementsByName("NewSimRef")[0].value;
	var newFilePath = document.getElementsByName("wrapperFileDirText")[0].innerHTML;
	var newExecute = document.getElementsByName("NewSimExecute")[0].value;
	if (editExistingObject == -1) {
		listOfSimulators.push({
			name: newSimName,
			refName: newRefName, filePath: newFilePath, executeCommand: newExecute,
			functions: listOfMessageFunctions, variables: listOfMessageObjects
		});
	} else {
		var originalName = listOfSimulators[editExistingObject].name;
		listOfSimulators[editExistingObject].name = newSimName;
		listOfSimulators[editExistingObject].refName = newRefName;
		listOfSimulators[editExistingObject].filePath = newFilePath;
		listOfSimulators[editExistingObject].executeCommand = newExecute;
		listOfSimulators[editExistingObject].functions = listOfMessageFunctions;
		listOfSimulators[editExistingObject].variables = listOfMessageObjects;
		let i = 0;
		for (i = 0; i < simulatorObjects.length; i++) {
			if (simulatorObjects[i].name == originalName) {
				simulatorObjects[i].name = newSimName;
				simulatorObjects[i].original = listOfSimulators[editExistingObject];
				simulatorObjects[i].objectRef.innerHTML = newSimName;
			}
		}

	}
	// let i = 0;
	// for (i = 0; i < listOfSimulators.length; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.className = "btn-list-item";
	// 	addContentType.id = i;
	// 	addContentType.style.backgroundColor = "#fed";
	// 	addContentType.onclick = function () {
	// 		console.log("onclick at index = " + this.id);
	// 		if (selectState == 0) {
	// 			CreateNewSimulatorOnCanvas(this.id);
	// 		} else if (selectState == 1) {
	// 			ConfigureSimulatorFromList(this.id);
	// 		} else if (selectState == 2) {

	// 		} else if (selectState == 3) {
	// 			DeleteSimulatorFromList(this.id);
	// 		}
	// 	};
	// 	var addContent = document.createTextNode(listOfSimulators[i].name);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }
	ResetObjectSubPanel1()
	if (selectState == 0) {
		DisableCertainObjectButtons();
	}
	CloseNewSimulatorObjectPrompt2();
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
	button = $('<button>').addClass('ui color-simulator button btn-list-item').text(listOfSimulators[index].name)
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
	button = $('<button>').addClass('ui color-message button btn-list-item').text(listOfMessages[index].name)
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
	// var panel = document.getElementById("objectsubpanel2");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < listOfMessages.length; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.className = "btn-list-item";
	// 	addContentType.id = i;
	// 	addContentType.style.backgroundColor = "#def";
	// 	addContentType.onclick = function () {
	// 		console.log("onclick at index = " + this.id);
	// 		if (selectState == 0) {
	// 			CreateNewMessageOnCanvas(this.id);
	// 		} else if (selectState == 1) {
	// 			ConfigureMessageFromList(this.id);
	// 		} else if (selectState == 2) {

	// 		} else if (selectState == 3) {
	// 			DeleteMessageFromList(this.id);
	// 		}
	// 	};
	// 	var addContent = document.createTextNode(listOfMessages[i].name);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }
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
		listOfMessages.push({ name: newMessageName, variables: listOfMessageObjects });
	} else {
		var originalName = listOfMessages[editExistingObject].name;
		listOfMessages[editExistingObject].name = newMessageName;
		listOfMessages[editExistingObject].variables = listOfMessageObjects;
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
	// let i = 0;
	// for (i = 0; i < listOfMessages.length; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.className = "btn-list-item";
	// 	addContentType.id = i;
	// 	addContentType.style.backgroundColor = "#def";
	// 	addContentType.onclick = function () {
	// 		console.log("onclick at index = " + this.id);
	// 		if (selectState == 0) {
	// 			CreateNewMessageOnCanvas(this.id);
	// 		} else if (selectState == 1) {
	// 			ConfigureMessageFromList(this.id);
	// 		} else if (selectState == 2) {

	// 		} else if (selectState == 3) {
	// 			DeleteMessageFromList(this.id);
	// 		}
	// 	};
	// 	var addContent = document.createTextNode(listOfMessages[i].name);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }
	if (selectState == 0) {
		DisableCertainObjectButtons();
	}
	CloseNewMessageObjectPrompt();
}

/*	AddObjectToMessageDef()
	- Add variable object to message (during defining a new message for the project).
*/
function AddObjectToMessageDef() {
	var newMessageObjectName = document.getElementsByName("NewMessageObjectName")[0].value;
	document.getElementsByName("NewMessageObjectName")[0].value = "";
	let newMessageObjectType = $('.checked').find('input[name="NewMessageObject"]').attr('value')
	listOfMessageObjects.push({ name: newMessageObjectName, valueType: newMessageObjectType });
	let panel = $('#modalNewMessagePanel1')
	if (listOfMessageObjects.length === 1) {
		panel.show()
	}

	let child = $('<div>').addClass('div-list-item ui compact segment')
	child.append($('<label>').text(`${newMessageObjectName} (${newMessageObjectType})`).attr('style', 'vertical-align:sub;'))
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

	CheckEnableObjectToMessageDef();
	CheckEnableSubmitObject();
	// UpdateObjectToMessageDef();
}

/*	AddObjectToSimulatorDef()
	- Add variable object to message (during defining a new simulator for the project).
*/
function AddObjectToSimulatorDef() {
	var newMessageObjectName = document.getElementsByName("NewSimulatorObjectName")[0].value;
	document.getElementsByName("NewSimulatorObjectName")[0].value = "";
	let newMessageObjectType = $('.checked').find('input[name="NewSimulatorObject"]').attr('value')
	listOfMessageObjects.push({ name: newMessageObjectName, valueType: newMessageObjectType });
	let panel = $('#modalNewSimulatorPanel1')
	if (listOfMessageObjects.length === 1) {
		panel.show()
	}

	let child = $('<div>').addClass('div-list-item ui compact segment')
	child.append($('<label>').text(`${newMessageObjectName} (${newMessageObjectType})`).attr('style', 'vertical-align:sub;'))
	var button = $('<button>', {
		class: "ui compact icon button right floated", name: newMessageObjectName
	}).data('pointer', child).click(
		function () {
			RemoveObjectToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
		}
	)
	button.append($('<i>').addClass('times icon'))
	child.append(button)
	panel.append(child)

	CheckEnableObjectToSimulatorDef();
}

/*	UpdateObjectToSimulatorDef()
	- Update view of variable objects in simulator def (during defining a new simulator).
*/
function UpdateObjectToSimulatorDef() {
	let panel = $('#modalNewSimulatorPanel1')
	let i = 0, name;
	for (i = 0; i < listOfMessageObjects.length; i++) {
		var child = $('<div>').addClass('div-list-item ui compact segment')
		name = listOfMessageObjects[i].name
		child.append($('<label>').text(`${listOfMessageObjects[i].name} (${listOfMessageObjects[i].valueType})`).attr('style', 'vertical-align:sub;'))
		var button = $('<button>').addClass('ui compact icon button right floated').attr('name', name).data('pointer', child).click(
			function () {
				RemoveObjectToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
			}
		)
		button.append($('<i>').addClass('times icon'))
		child.append(button)
		panel.append(child)
	}

	if (listOfMessageObjects.length > 0) {
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
	let i = 0;
	for (i = 0; i < listOfMessageObjects.length; i++) {
		var child = $('<div>').addClass('div-list-item ui compact segment')
		child.append($('<label>').text(`${listOfMessageObjects[i].name} (${listOfMessageObjects[i].valueType})`).attr('style', 'vertical-align:sub;'))
		var button = $('<button>').addClass('ui compact icon button right floated').attr('name',
			listOfMessageObjects[i].name).data('pointer', child).click(
				function () {
					RemoveObjectToMessageDef($(this).data('pointer'), $(this).attr('name'))
				}
			)
		button.append($('<i>').addClass('times icon'))
		child.append(button)
		panel.append(child)
	}

	if (listOfMessageObjects.length > 0) {
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
	let i
	for (i = 0; i < listOfMessageObjects.length; ++i) {
		if (listOfMessageObjects[i].name == btn_id) {
			listOfMessageObjects.splice(i, 1);
		}
	}

	child.remove()

	if (listOfMessageObjects.length === 0) {
		$('#modalNewMessagePanel1').hide()
	}

	// UpdateObjectToMessageDef();
}
/*	RemoveObjectToSimulatorDef()
	- Remove variable object from simulator (when defining simulator for project).
*/
function RemoveObjectToSimulatorDef(child, btn_id) {

	console.log("Removing object from list.");
	let i
	for (i = 0; i < listOfMessageObjects.length; ++i) {
		if (listOfMessageObjects[i].name == btn_id) {
			listOfMessageObjects.splice(i, 1);
		}
	}

	child.remove()

	if (listOfMessageObjects.length === 0) {
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
	var newMessageFunctionName = document.getElementsByName("NewSimulatorFunctionName")[0].value;
	document.getElementsByName("NewSimulatorFunctionName")[0].value = "";
	listOfMessageFunctions.push({ name: newMessageFunctionName });

	let panel = $('#modalNewSimulatorPanel2')
	if (listOfMessageFunctions.length === 1) {
		panel.show()
	}

	let child = $('<div>').addClass('div-list-item ui compact segment')
	child.append($('<label>').text(newMessageFunctionName).attr('style', 'vertical-align:sub;'))
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

	CheckEnableObjectToSimulatorDef();

	// var newMessageFunctionName = document.getElementsByName("NewSimulatorFunctionName")[0].value;
	// document.getElementsByName("NewSimulatorFunctionName")[0].value = "";
	// listOfMessageFunctions.push({ name: newMessageFunctionName });
	// UpdateFunctionToSimulatorDef();
}

/*	UpdateFunctionToSimulatorDef()
	- Update view of function list in simulator-definition prompt.
*/
function UpdateFunctionToSimulatorDef() {
	let panel = $('#modalNewSimulatorPanel2')
	let i = 0;
	for (i = 0; i < listOfMessageFunctions.length; i++) {
		var child = $('<div>').addClass('div-list-item ui compact segment')
		child.append($('<label>').text(listOfMessageFunctions[i].name).attr('style', 'vertical-align:sub;'))
		var button = $('<button>').addClass('ui compact icon button right floated').attr('name',
			listOfMessageFunctions[i].name).data('pointer', child).click(
				function () {
					console.log("onclick at index = " + this.name);
					RemoveFunctionToSimulatorDef($(this).data('pointer'), $(this).attr('name'))
				}
			)
		button.append($('<i>').addClass('times icon'))
		child.append(button)
		panel.append(child)
	}

	if (listOfMessageFunctions.length > 0) {
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

	console.log("Removing object from list.");
	console.log(btn_id);
	let i
	for (i = 0; i < listOfMessageFunctions.length; ++i) {
		if (listOfMessageFunctions[i].name == btn_id) {
			listOfMessageFunctions.splice(i, 1);
		}
	}

	child.remove()

	if (listOfMessageFunctions.length === 0) {
		$('#modalNewSimulatorPanel2').hide()
	}
}

/*	AddNewObjectImport()
	- ...
*/
function AddNewObjectImport() {

}

/*	CreateNewSimulatorOnCanvas()
	- Add new simulator object on canvas in main screen.
*/
function CreateNewSimulatorOnCanvas(btn_id) {
	console.log("User wants to add a simulator to the canvas");

	var panel = document.getElementById("canvassubpanel1");
	//!!!!
	//var addContentType = document.createElement("button");
	var addContentType = document.createElement("div");
	addContentType.className = "div-canvas-sim";
	addContentType.setAttribute("name", "");
	var addContent1 = document.createTextNode(listOfSimulators[btn_id].name);
	addContentType.appendChild(addContent1);
	addContentType.style = "position: relative; overflow-y:hidden;";
	panel.appendChild(addContentType);

	var listOfCurrentItems = document.getElementsByClassName("div-canvas-sim");
	// add offset... for some reason, default would add object below original position of existing objects.
	//!!!!
	var newOffsetY = (listOfCurrentItems.length - 1) * 100;
	var newOffsetX = 0;//(listOfCurrentItems.length - 1) * 100;
	simulatorObjects.push({
		name: listOfSimulators[btn_id].name, original: listOfSimulators[btn_id],
		stage: parseInt(stage), objectRef: addContentType, order: 0,
		offsetX: newOffsetX, offsetY: -newOffsetY, leftPos: 0, topPos: 0,
		subscribedMessages: [], publishedMessages: [],
		subscribedDetails: [], publishedDetails: [],
		timeDelta: 1, timeVarDelta: "", timeScale: 1,
		subscribedInitial: [], publishedInitial: [],
		subscribedTimeDelta: [], publishedTimeDelta: [],
		subscribedRelative: [], subscribedTimestep: [],
		initialize: "", simulate: "", simulateTimeDelta: 1,
		stageConditions: [], endConditions: []
	});
	setTranslate(0, -newOffsetY, addContentType);
	//setTranslate(-newOffsetX, 0, addContentType);
	//!!!!

	DisableCertainObjectButtons();
}

/*	CreateExistingSimulatorOnCanvas()
	- Edit saved configuration for existing simulator on the canvas in main screen.
*/
function CreateExistingSimulatorOnCanvas(sim_id) {
	var panel = document.getElementById("canvassubpanel1");

	let i = sim_id;
	var newOffsetY = simulatorObjects[i].offsetY;
	var newOffsetX = simulatorObjects[i].offsetX;
	var addContentType = document.createElement("div");
	addContentType.className = "div-canvas-sim";
	addContentType.setAttribute("name", "");
	var addContent1 = document.createTextNode(simulatorObjects[i].name);
	addContentType.appendChild(addContent1);
	addContentType.style = "position: relative; overflow-y:hidden;";
	panel.appendChild(addContentType);
	setTranslate(newOffsetX, newOffsetY, addContentType);
	simulatorObjects[i].objectRef = addContentType;
}

/*	DeleteSimulatorFromList()
	- Delete simulator from project, from list on the left and from the canvas.
*/
function DeleteSimulatorFromList(btn_id) {

	// var panel = document.getElementById("objectsubpanel1");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	var deleteSimName = listOfSimulators[btn_id].name;
	listOfSimulators.splice(btn_id, 1);
	ResetObjectSubPanel1()
	// let i = 0;
	// for (i = 0; i < listOfSimulators.length; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.className = "btn-list-item";
	// 	addContentType.id = i;
	// 	addContentType.style.backgroundColor = "#fed";
	// 	addContentType.onclick = function () {
	// 		console.log("onclick at index = " + this.id);
	// 		if (selectState == 0) {
	// 			CreateNewSimulatorOnCanvas(this.id);
	// 		} else if (selectState == 1) {

	// 		} else if (selectState == 2) {

	// 		} else if (selectState == 3) {
	// 			DeleteSimulatorFromList(this.id);
	// 		}
	// 	};
	// 	var addContent = document.createTextNode(listOfSimulators[i].name);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }
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

/*	CreateNewMessageOnCanvas()
	- Create new message object on canvas in main screen.
*/
function CreateNewMessageOnCanvas(btn_id) {
	console.log("User wants to add a message to the canvas");

	var panel = document.getElementById("canvassubpanel2grid");
	var listOfCurrentItems = document.getElementsByClassName("div-canvas-message");
	var addContentType = document.createElement("div");
	addContentType.className = "div-canvas-message";
	addContentType.setAttribute("name", listOfMessages[btn_id].name);
	var addContent1 = document.createTextNode(listOfMessages[btn_id].name);
	addContentType.appendChild(addContent1);
	addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" + (10 + (42 * listOfCurrentItems.length)) + "px;";
	panel.appendChild(addContentType);
	messageObjects.push({ name: listOfMessages[btn_id].name, original: listOfMessages[btn_id], objectRef: addContentType });
	DisableCertainObjectButtons();
}

/*	CreateExistingMessageOnCanvas()
	- Modify configuration of message already on canvas in main screen.
*/
function CreateExistingMessageOnCanvas(message_id) {
	var panel = document.getElementById("canvassubpanel2grid");

	let i = message_id;
	var listOfCurrentItems = document.getElementsByClassName("div-canvas-message");
	var addContentType = document.createElement("div");
	addContentType.className = "div-canvas-message";
	addContentType.setAttribute("name", messageObjects[message_id].name);
	var addContent1 = document.createTextNode(messageObjects[message_id].name);
	addContentType.appendChild(addContent1);
	addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:"
		+ (10 + (42 * listOfCurrentItems.length)) + "px;";
	panel.appendChild(addContentType);
	messageObjects[i].objectRef = addContentType;
}

/*	DeleteMessageFromList()
	- Delete message from project on left list and canvas in main screen.
*/
function DeleteMessageFromList(btn_id) {
	// var panel = document.getElementById("objectsubpanel2");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	var deleteMessageName = listOfMessages[btn_id].name;
	listOfMessages.splice(btn_id, 1);
	ResetObjectSubPanel2()
	// let i = 0;
	// for (i = 0; i < listOfMessages.length; i++) {
	// 	var addContentType = document.createElement("button");
	// 	addContentType.className = "btn-list-item";
	// 	addContentType.id = i;
	// 	addContentType.style.backgroundColor = "#def";
	// 	addContentType.onclick = function () {
	// 		console.log("onclick at index = " + this.id);
	// 		if (selectState == 0) {
	// 			CreateNewMessageOnCanvas(this.id);
	// 		} else if (selectState == 1) {

	// 		} else if (selectState == 2) {

	// 		} else if (selectState == 3) {
	// 			DeleteMessageFromList(this.id);
	// 		}
	// 	};
	// 	var addContent = document.createTextNode(listOfMessages[i].name);
	// 	addContentType.appendChild(addContent);
	// 	panel.appendChild(addContentType);
	// }
	for (i = messageObjects.length - 1; i >= 0; i--) {
		console.log("... " + i + " of " + (messageObjects.length - 1) + " " + messageObjects[i].name);
		if (messageObjects[i].name == deleteMessageName) {
			console.log(" found one to remove!");
			DeleteMessageFromCanvasById(i);
			UpdateDrawArrowsAfterDelete(-1, i);
		}
	}
}

/*	EditSimLocalTime()
	- Edit configuration element (show prompt) for simulator on canvas ('local time' relative to system time).
*/
function EditSimLocalTime() {
	DisplayOrClosePrompt("modalLocalTime", "block");


	// var divNumber = document.getElementsByName("divTimeDelta")[0];
	// divNumber.innerHTML = "Current Time Delta: " + simulatorObjects[editExistingObject].timeDelta;
	// divNumber = document.getElementsByName("divTimeScale")[0];
	// divNumber.innerHTML = "Current Time Multiplier: " + simulatorObjects[editExistingObject].timeScale;
	// divNumber = document.getElementsByName("divTimeVarScale")[0];
	// divNumber.innerHTML = "Current Time Variable Multiplier: " + simulatorObjects[editExistingObject].timeVarDelta;

	$('input[name="newTimeDelta"]').val(simulatorObjects[editExistingObject].timeDelta)
	$('input[name="newTimeScale"]').val(simulatorObjects[editExistingObject].timeScale)

	let dropdown = $('#dropdownVar .menu')
	dropdown.empty()

	let item
	let i
	for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
		item = $('<div>').addClass('item').text(
			`${simulatorObjects[editExistingObject].original.variables[i].name} (${simulatorObjects[editExistingObject].original.variables[i].valueType})`
		)
		item.attr('data-value', simulatorObjects[editExistingObject].original.variables[i].name)
		dropdown.append(item)
	}

	item = $('<div>').addClass('item').text("''")
	item.attr('data-value', "''")

	dropdown.append(item)
	$('#dropdownVar').dropdown('set selected', simulatorObjects[editExistingObject].timeVarDelta)

	// var addContentType = document.createElement("a");
	// addContentType.href = "#";
	// addContentType.innerHTML = "''";
	// addContentType.onclick = function () {
	// 	console.log("Clicked that: " + this.innerHTML);
	// 	//stageConditionV1 = this.name;
	// 	document.getElementsByName("divTimeVarScale")[0].innerHTML
	// 		= "Current Time Variable Multiplier: ''";
	// 	simulatorObjects[editExistingObject].timeVarDelta = "";
	// };
	// dropdown.appendChild(addContentType);
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	addContentType = document.createElement("a");
	// 	addContentType.name = i;
	// 	addContentType.href = "#";
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.variables[i].name
	// 		+ " (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")";
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);
	// 		UpdateTimeVarDelta(this.name);
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }


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
}

/*	EditSimulateFunctions()
	- Edit configuration (functions) for simulator on canvas (open prompt).
*/
function EditSimulateFunctions() {
	DisplayOrClosePrompt("modalSimulateFunctions", "block");

	let dropdown = $('#dropdownInitializeFunction .menu')
	dropdown.empty()

	let item
	let i
	for (i = 0; i < simulatorObjects[editExistingObject].original.functions.length; i++) {
		item = $('<div>').addClass('item').text(simulatorObjects[editExistingObject].original.functions[i].name)
		item.attr('data-value', simulatorObjects[editExistingObject].original.functions[i].name)
		dropdown.append(item)
	}

	item = $('<div>').addClass('item').text("''")
	item.attr('data-value', "''")

	dropdown.append(item)
	$('#dropdownSimulateFunction').dropdown('set selected', simulatorObjects[editExistingObject].initialize)



	// var addContentType = document.createElement("a");
	// addContentType.href = "#";
	// addContentType.innerHTML = "''";
	// addContentType.onclick = function () {
	// 	document.getElementsByName("divInitializeFunction")[0].innerHTML
	// 		= "Initialize Function: " + "";
	// 	simulatorObjects[editExistingObject].initialize = "";
	// };
	// dropdown.appendChild(addContentType);
	// i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].original.functions.length; i++) {
	// 	addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.name = i;
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.functions[i].name;
	// 	addContentType.onclick = function () {
	// 		UpdateInitializeFunction(this.name);
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }
	dropdown = $('#dropdownSimulateFunction .menu')
	dropdown.empty()
	for (i = 0; i < simulatorObjects[editExistingObject].original.functions.length; i++) {
		item = $('<div>').addClass('item').text(simulatorObjects[editExistingObject].original.functions[i].name)
		item.attr('data-value', simulatorObjects[editExistingObject].original.functions[i].name)
		dropdown.append(item)
	}

	item = $('<div>').addClass('item').text("''")
	item.attr('data-value', "''")
	dropdown.append(item)

	$('#dropdownSimulateFunction').dropdown('set selected', simulatorObjects[editExistingObject].simulate)

	$('input[name="SimulateFunctionTimestepDelta"]').val(simulatorObjects[editExistingObject].simulateTimeDelta)

	// addContentType = document.createElement("a");
	// addContentType.href = "#";
	// addContentType.innerHTML = "''";
	// addContentType.onclick = function () {
	// 	document.getElementsByName("divSimulateFunction")[0].innerHTML
	// 		= "Simulate Function: " + "";
	// 	simulatorObjects[editExistingObject].simulate = "";
	// };
	// dropdown.appendChild(addContentType);
	// for (i = 0; i < simulatorObjects[editExistingObject].original.functions.length; i++) {
	// 	addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.name = i;
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.functions[i].name;
	// 	addContentType.onclick = function () {
	// 		UpdateSimulateFunction(this.name);
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// var newTimeDelta = simulatorObjects[editExistingObject].simulateTimeDelta;
	// var div = document.getElementsByName("divSimulateFunctionTimestepDelta")[0];
	// div.innerHTML = "Simulate Function timestep delta: " + newTimeDelta;
	// var newInitialize = simulatorObjects[editExistingObject].initialize;
	// div = document.getElementsByName("divInitializeFunction")[0];
	// div.innerHTML = "Initialize Function: " + newInitialize;
	// var newSimulate = simulatorObjects[editExistingObject].simulate;
	// div = document.getElementsByName("divSimulateFunction")[0];
	// div.innerHTML = "Simulate Function: " + newSimulate;
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
var stageConditionV1 = "";
var stageConditionV2 = "";
var stageConditionV3a = "";
var stageConditionV3b = "";
var stageConditionV3 = "";
var stageConditionSubSet = [];
var stageConditionSet = [];
function EditStageConditions() {
	DisplayOrClosePrompt("modalStageConditions", "block");

	$('#dropdownStageConditionPickVar1 .menu, #dropdownStageConditionPickVar2 .menu').each(function (index) {
		let dropdown = $(this)
		dropdown.empty()

		let item
		let i
		for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
			item = $('<div>').addClass('item').text(simulatorObjects[editExistingObject].original.variables[i].name +
				" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")")
			item.attr('data-value', simulatorObjects[editExistingObject].original.variables[i].name)
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

	$('#dropdownStageConditionPickRTIVar1 .menu, #dropdownStageConditionPickRTIVar2 .menu').each(function (index) {
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

	let dropdown = $('#dropdownStageConditionCondition1 .menu')
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

	// var dropdown = document.getElementById("dropdownStageConditionPickVar1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.variables[i].name +
	// 		" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")";
	// 	addContentType.name = simulatorObjects[editExistingObject].original.variables[i].name;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);
	// 		stageConditionV1 = this.name;

	// 		document.getElementById("divStageConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownStageConditionPickRTIVar1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 4; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "RTI_vTimestep";
	// 	}
	// 	else if (i == 1) {
	// 		addContentType.innerHTML = "RTI_stage";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "RTI_stageVTimestepMul";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = "RTI_stageVTimestep";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked this: " + this.innerHTML);

	// 		stageConditionV1 = this.name;
	// 		document.getElementById("divStageConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownStageConditionCondition1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 6; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "=";
	// 	} else if (i == 1) {
	// 		addContentType.innerHTML = ">";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "<";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = ">=";
	// 	} else if (i == 4) {
	// 		addContentType.innerHTML = "<=";
	// 	} else if (i == 5) {
	// 		addContentType.innerHTML = "!=";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + unescape(this.innerHTML));

	// 		if (this.name == "&gt;") {
	// 			stageConditionV2 = ">";
	// 		} else if (this.name == "&lt;") {
	// 			stageConditionV2 = "<";
	// 		} else if (this.name == "&gt;=") {
	// 			stageConditionV2 = ">=";
	// 		} else if (this.name == "&lt;=") {
	// 			stageConditionV2 = "<=";
	// 		} else {
	// 			stageConditionV2 = unescape(this.name);
	// 		}
	// 		console.log("(stageCondition is = )" + stageConditionV2);
	// 		//stageConditionV2 = this.innerHTML;
	// 		document.getElementById("divStageConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownStageConditionPickVar2");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.variables[i].name +
	// 		" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")";
	// 	addContentType.name = simulatorObjects[editExistingObject].original.variables[i].name;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);

	// 		stageConditionV3 = this.name;
	// 		stageConditionV3b = this.name;
	// 		stageConditionV3a = "";

	// 		document.getElementById("divStageConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownStageConditionPickRTIVar2");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 4; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "RTI_vTimestep";
	// 	} else if (i == 1) {
	// 		addContentType.innerHTML = "RTI_stage";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "RTI_stageVTimestepMul";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = "RTI_stageVTimestep";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);

	// 		stageConditionV3 = this.name;
	// 		stageConditionV3b = this.name;
	// 		stageConditionV3a = "";

	// 		document.getElementById("divStageConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }


	// var panel = document.getElementById("modalStageConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[editExistingObject].stageConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].stageConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "go to stage = " + simulatorObjects[editExistingObject].stageConditions[i].newStage;
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		//RemoveStageConditionFromSubList(this.name);
	// 		RemoveStageConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }

	// stageConditionSubSet = [];

	// var subpanel = document.getElementById("modalStageConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] && ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] && ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	subpanel.appendChild(addContentType);
	// }
	stageConditionV1 = "";
	stageConditionV2 = "";
	stageConditionV3 = "";
	stageConditionV3a = "";
	stageConditionV3b = "";
	$('#stageCondition1, #stageCondition2, #stageCondition3').text('')
	// document.getElementsByName("TextStageConditionsPickValue2")[0].value = "";
	// document.getElementById("divStageConditionStatement").innerHTML
	// 	= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
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
		for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
			item = $('<div>').addClass('item').text(simulatorObjects[editExistingObject].original.variables[i].name +
				" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")")
			item.attr('data-value', simulatorObjects[editExistingObject].original.variables[i].name)
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

	// var dropdown = document.getElementById("dropdownEndConditionPickVar1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.variables[i].name +
	// 		" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")";
	// 	addContentType.name = simulatorObjects[editExistingObject].original.variables[i].name;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);
	// 		stageConditionV1 = this.name;

	// 		document.getElementById("divEndConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownEndConditionPickRTIVar1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 4; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "RTI_vTimestep";
	// 	} else if (i == 1) {
	// 		addContentType.innerHTML = "RTI_stage";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "RTI_stageVTimestepMul";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = "RTI_stageVTimestep";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked this: " + this.innerHTML);
	// 		stageConditionV1 = this.name;
	// 		document.getElementById("divEndConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownEndConditionCondition1");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 6; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "=";
	// 	} else if (i == 1) {
	// 		addContentType.innerHTML = ">";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "<";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = ">=";
	// 	} else if (i == 4) {
	// 		addContentType.innerHTML = "<=";
	// 	} else if (i == 5) {
	// 		addContentType.innerHTML = "!=";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + unescape(this.innerHTML));
	// 		if (this.name == "&gt;") {
	// 			stageConditionV2 = ">";
	// 		} else if (this.name == "&lt;") {
	// 			stageConditionV2 = "<";
	// 		} else if (this.name == "&gt;=") {
	// 			stageConditionV2 = ">=";
	// 		} else if (this.name == "&lt;=") {
	// 			stageConditionV2 = "<=";
	// 		} else {
	// 			stageConditionV2 = unescape(this.name);
	// 		}
	// 		//stageConditionV2 = this.innerHTML;
	// 		document.getElementById("divEndConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownEndConditionPickVar2");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[editExistingObject].original.variables.length; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	addContentType.innerHTML = simulatorObjects[editExistingObject].original.variables[i].name +
	// 		" (" + simulatorObjects[editExistingObject].original.variables[i].valueType + ")";
	// 	addContentType.name = simulatorObjects[editExistingObject].original.variables[i].name;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);
	// 		stageConditionV3 = this.name;
	// 		stageConditionV3b = this.name;
	// 		stageConditionV3a = "";
	// 		document.getElementById("divEndConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// dropdown = document.getElementById("dropdownEndConditionPickRTIVar2");
	// while (dropdown.firstChild) {
	// 	dropdown.removeChild(dropdown.firstChild);
	// }
	// for (i = 0; i < 4; i++) {
	// 	var addContentType = document.createElement("a");
	// 	addContentType.href = "#";
	// 	if (i == 0) {
	// 		addContentType.innerHTML = "RTI_vTimestep";
	// 	} else if (i == 1) {
	// 		addContentType.innerHTML = "RTI_stage";
	// 	} else if (i == 2) {
	// 		addContentType.innerHTML = "RTI_stageVTimestepMul";
	// 	} else if (i == 3) {
	// 		addContentType.innerHTML = "RTI_stageVTimestep";
	// 	}
	// 	addContentType.name = addContentType.innerHTML;
	// 	addContentType.onclick = function () {
	// 		console.log("Clicked that: " + this.innerHTML);
	// 		stageConditionV3 = this.name;
	// 		stageConditionV3b = this.name;
	// 		stageConditionV3a = "";
	// 		document.getElementById("divEndConditionStatement").innerHTML
	// 			= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
	// 	};
	// 	dropdown.appendChild(addContentType);
	// }

	// var panel = document.getElementById("modalEndConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// for (i = 0; i < simulatorObjects[editExistingObject].endConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].endConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].endConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].endConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "then end simulation system.";
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		//RemoveEndConditionFromSubList(this.name);
	// 		RemoveEndConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }

	// stageConditionSubSet = [];

	// var subpanel = document.getElementById("modalEndConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] && ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] && ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	subpanel.appendChild(addContentType);
	// }
	stageConditionV1 = "";
	stageConditionV2 = "";
	stageConditionV3 = "";
	stageConditionV3a = "";
	stageConditionV3b = "";
	$('#endCondition1, #endCondition2, #endCondition3').text('')
	// document.getElementsByName("TextEndConditionsPickValue2")[0].value = "";
	// document.getElementById("divEndConditionStatement").innerHTML
	// 	= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
}

/*	CloseEndConditions()
	- Close prompt to configure end conditions for simulator on canvas.
*/
function CloseEndConditions() {
	DisplayOrClosePrompt("modalEndConditions", "none");
}

/*	DisableCertainObjectButtons()
	- Disable certain buttons on the canvas, based on what simulators/messages are on the canvas.
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

/*	UpdateHostName()
	- Change host name (from prompt).
*/
function UpdateHostName() {
	var hostNameObjects = document.getElementsByName("HostNameObject");
	let i = 0;
	for (i = 0; i < hostNameObjects.length; i++) {
		if (hostNameObjects[i].checked) {
			if (hostNameObjects[i].value == "localhost") {
				hostName = "localhost";
			} else {
				//... is there a real way to get local host's IP address? Otherwise, need other way to display IP for user to connect other simulators.
				hostName = "123.456.78.9";
			}
			break;
		}
	}
	var divNumber = document.getElementsByName("divHostName")[0];
	divNumber.innerHTML = "Host Name: " + hostName;
}

/*	UpdatePortNumber()
	- Change port number (from prompt).
*/
function UpdatePortNumber() {
	var newNumber = document.getElementsByName("PortNumberObject")[0].value;
	var divNumber = document.getElementsByName("divPortNumber")[0];
	divNumber.innerHTML = "Port Number: " + newNumber;
	portNumber = newNumber;
}

function SaveSimLocalTime() {
	simulatorObjects[editExistingObject].timeDelta = parseInt($('input[name="newTimeDelta"]').val())
	simulatorObjects[editExistingObject].timeScale = parseInt($('input[name="newTimeScale"]').val())
	simulatorObjects[editExistingObject].timeVarDelta = $('#dropdownVar').dropdown('get value')

	CloseEditSimLocalTime()
}

/*	UpdateTimeDelta()
	- Change time delta (from prompt).
*/
// function UpdateTimeDelta() {
// 	var newNumber = document.getElementsByName("NewTimeDelta")[0].value;
// 	var divNumber = document.getElementsByName("divTimeDelta")[0];
// 	divNumber.innerHTML = "Current Time Delta: " + newNumber;
// 	simulatorObjects[editExistingObject].timeDelta = parseInt(newNumber);
// }

/*	UpdateTimeScale()
	- Change time scale (from prompt).
*/
// function UpdateTimeScale() {
// 	var newNumber = document.getElementsByName("NewTimeScale")[0].value;
// 	var divNumber = document.getElementsByName("divTimeScale")[0];
// 	divNumber.innerHTML = "Current Time Multiplier: " + newNumber;
// 	simulatorObjects[editExistingObject].timeScale = parseInt(newNumber);
// }

/*	UpdateTimeVarDelta()
	- Change time delta variable reference from simulator (from prompt).
*/
// function UpdateTimeVarDelta(index) {
// 	document.getElementsByName("divTimeVarScale")[0].innerHTML
// 		= "Current Time Variable Multiplier: "
// 		+ simulatorObjects[editExistingObject].original.variables[index].name
// 		+ " (" + simulatorObjects[editExistingObject].original.variables[index].valueType + ")";
// 	simulatorObjects[editExistingObject].timeVarDelta
// 		= simulatorObjects[editExistingObject].original.variables[index].name;
// }

/*	UpdateInitializeFunction()
	- Change 'initialize' function to call for sim in specific stage (from prompt).
*/
function UpdateInitializeFunction(index) {
	document.getElementsByName("divInitializeFunction")[0].innerHTML
		= "Initialize Function: " + simulatorObjects[editExistingObject].original.functions[index].name;
	simulatorObjects[editExistingObject].initialize
		= simulatorObjects[editExistingObject].original.functions[index].name;
}

/*	UpdateSimulateFunction()
	- Change 'simulate' function to call for sim in specific stage (from prompt).
*/
function UpdateSimulateFunction(index) {
	document.getElementsByName("divSimulateFunction")[0].innerHTML
		= "Simulate Function: " + simulatorObjects[editExistingObject].original.functions[index].name;
	simulatorObjects[editExistingObject].simulate
		= simulatorObjects[editExistingObject].original.functions[index].name;
}



/*	DropdownFunction()
	- For dropdown menu in certain prompt windows.
*/
function DropdownFunction() {
	document.getElementById("dropdownVar").classList.toggle("show");
}

function DropdownInitializeFunction() {
	document.getElementById("dropdownInitializeFunction").classList.toggle("show");
}

function DropdownSimulateFunction() {
	document.getElementById("dropdownSimulateFunction").classList.toggle("show");
}

/*	DropdownStageConditionPickVar1()
	- Disable other dropdown menus when another one is selected (otherwise, can have several open at once).
*/
function DropdownStageConditionPickVar1() {
	document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show");
	//document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownStageConditionPickRTIVar1() {
	document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show");
	document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownStageConditionCondition1() {
	document.getElementById("dropdownStageConditionCondition1").classList.toggle("show");
	document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownStageConditionPickVar2() {
	document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show");
	document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownStageConditionPickRTIVar2() {
	document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show");
	document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

/*	UpdateStageConditionCompareValue()
	- In configuration prompt for stage condition, update after selection for compare value.
*/
function UpdateStageConditionCompareValue() {
	console.log("clicked update");
	var newValue = document.getElementsByName("TextStageConditionsPickValue2")[0].value;
	console.log("new value = " + newValue);
	stageConditionV3 = newValue;
	stageConditionV3a = newValue;
	stageConditionV3b = "";
	document.getElementById("divStageConditionStatement").innerHTML
		= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
}

function DropdownEndConditionPickVar1() {
	document.getElementById("dropdownEndConditionPickVar1").classList.toggle("show");
	//document.getElementById("dropdownStageConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownEndConditionPickRTIVar1() {
	document.getElementById("dropdownEndConditionPickRTIVar1").classList.toggle("show");
	document.getElementById("dropdownEndConditionPickVar1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownEndConditionCondition1() {
	document.getElementById("dropdownEndConditionCondition1").classList.toggle("show");
	document.getElementById("dropdownEndConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownEndConditionPickVar2() {
	document.getElementById("dropdownEndConditionPickVar2").classList.toggle("show");
	document.getElementById("dropdownEndConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionCondition1").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickVar2").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar2").classList.toggle("show", false);
}

function DropdownEndConditionPickRTIVar2() {
	document.getElementById("dropdownEndConditionPickRTIVar2").classList.toggle("show");
	document.getElementById("dropdownEndConditionPickVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickRTIVar1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionCondition1").classList.toggle("show", false);
	document.getElementById("dropdownEndConditionPickVar2").classList.toggle("show", false);
	//document.getElementById("dropdownStageConditionPickRTIVar2").classList.toggle("show", false);
}

function UpdateEndConditionCompareValue() {
	console.log("clicked update");
	var newValue = document.getElementsByName("TextEndConditionsPickValue2")[0].value;
	console.log("new value = " + newValue);
	stageConditionV3 = newValue;
	stageConditionV3a = newValue;
	stageConditionV3b = "";
	document.getElementById("divEndConditionStatement").innerHTML
		= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
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

	// var subpanel = document.getElementById("modalStageConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] AND ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] AND ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	subpanel.appendChild(addContentType);
	// }

	ResetStageConditionSubList()

	// stageConditionV1 = "";
	// stageConditionV2 = "";
	// stageConditionV3 = "";
	// stageConditionV3a = "";
	// stageConditionV3b = "";
	// document.getElementsByName("TextStageConditionsPickValue2")[0].value = "";
	// document.getElementById("divStageConditionStatement").innerHTML
	// 	= "If [" + stageConditionV1 + "] [" + stageConditionV2 + "] [" + stageConditionV3 + "] AND ...";
}

/*	RemoveStageConditionFromSubList()
	- In prompt, remove stage condition to list (where multiple AND conditions can be added before final submission).
*/
function RemoveStageConditionFromSubList(btn_id) {
	stageConditionSubSet.splice(btn_id, 1);

	ResetStageConditionSubList()

	// var subpanel = document.getElementById("modalStageConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] AND ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] AND ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);
	// 	subpanel.appendChild(addContentType);
	// }
}

function ResetStageConditionSubList() {

	let subpanel = $("#modalStageConditionsSubPanel");
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
		icon = $('<i>').addClass('inverted  delete icon').click(function () {
			RemoveStageConditionFromSubList(this.name);
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


	// var panel = document.getElementById("modalStageConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].stageConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].stageConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "go to stage = " + simulatorObjects[editExistingObject].stageConditions[i].newStage;
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }

	stageConditionSubSet = [];
	ResetStageConditionSubList()

	// var subpanel = document.getElementById("modalStageConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].value + "] && ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] [" + stageConditionSubSet[i].varName2 + "] && ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);
	// 	subpanel.appendChild(addContentType);
	// }
}

/*	RemoveStageConditionToList()
	- In prompt, remove stage condition set from final list.
*/
function RemoveStageConditionFromList(btn_name) {
	simulatorObjects[editExistingObject].stageConditions.splice(btn_name, 1);

	ResetStageConditionList()

	// var panel = document.getElementById("modalStageConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].stageConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].stageConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "go to stage = " + simulatorObjects[editExistingObject].stageConditions[i].newStage;
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	//addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveStageConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }
}

function ResetStageConditionList() {

	let panel = $('#modalStageConditionsPanel')
	panel.empty()
	let i = 0, item, label, sentence, button, icon
	for (i = 0; i < simulatorObjects[editExistingObject].stageConditions.length; i++) {
		item = $('<div>').addClass('div-list-item')
		label = $('<div>').addClass('ui grey expanding label')
		sentence = "in stage " + simulatorObjects[editExistingObject].stageConditions[i].oldStage + ", ";
		let j = 0;
		for (j = 0; j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length; j++) {
			var tempVarName2 = simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2;
			if (tempVarName2 == "") {
				sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
					+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
					+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].value + "] ";
			} else {
				sentence = sentence + "if [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName
					+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].condition
					+ "] [" + simulatorObjects[editExistingObject].stageConditions[i].conditions[j].varName2 + "] ";
			}
			if (j < simulatorObjects[editExistingObject].stageConditions[i].conditions.length - 1) {
				sentence = sentence + "AND ";
			}
		}
		sentence = sentence + "go to stage " + simulatorObjects[editExistingObject].stageConditions[i].newStage;
		label.append($('<label>').text(sentence).css('max-width', '95%'))

		button = $('<a>').addClass('ui opaque right floated')
		icon = $('<i>').addClass('inverted  delete icon').click(function () {
			RemoveStageConditionFromList(this.name);
		}
		)

		button.append(icon)
		label.append(button)
		item.append(label)
		panel.append(item)
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

	// var subpanel = document.getElementById("modalEndConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] ["
	// 			+ stageConditionSubSet[i].value + "] AND ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] ["
	// 			+ stageConditionSubSet[i].varName2 + "] AND ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	subpanel.appendChild(addContentType);
	// }

	// stageConditionV1 = "";
	// stageConditionV2 = "";
	// stageConditionV3 = "";
	// stageConditionV3a = "";
	// stageConditionV3b = "";
	// document.getElementsByName("TextEndConditionsPickValue2")[0].value = "";
	// document.getElementById("divEndConditionStatement").innerHTML
	// 	= "If [" + stageConditionV1 + "] [" + stageConditionV2
	// 	+ "] [" + stageConditionV3 + "] AND ...";

}

/*	RemoveEndConditionFromSubList()
	- In prompt, remove end condition from sublist (where AND conditions are collected).
*/
function RemoveEndConditionFromSubList(btn_id) {
	stageConditionSubSet.splice(btn_id, 1);

	ResetEndConditionSubList()

	// var subpanel = document.getElementById("modalEndConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] ["
	// 			+ stageConditionSubSet[i].value + "] AND ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition
	// 			+ "] [" + stageConditionSubSet[i].varName2 + "] AND ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	subpanel.appendChild(addContentType);
	// }
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
		icon = $('<i>').addClass('inverted  delete icon').click(function () {
			RemoveStageConditionFromSubList(this.name);
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

	// var panel = document.getElementById("modalEndConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].endConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].endConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].endConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].endConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "then end simulation system.";
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }

	stageConditionSubSet = [];
	ResetEndConditionSubList()

	// var subpanel = document.getElementById("modalEndConditionsSubPanel");
	// while (subpanel.firstChild) {
	// 	subpanel.removeChild(subpanel.firstChild);
	// }
	// for (i = 0; i < stageConditionSubSet.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var tempVarName2 = stageConditionSubSet[i].varName2;
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:70%;float:left;";
	// 	if (tempVarName2 == "") {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] ["
	// 			+ stageConditionSubSet[i].value + "] && ...";
	// 	} else {
	// 		addContent1.innerHTML = "if [" + stageConditionSubSet[i].varName + "] ["
	// 			+ stageConditionSubSet[i].condition + "] ["
	// 			+ stageConditionSubSet[i].varName2 + "] && ...";
	// 	}
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromSubList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);
	// 	subpanel.appendChild(addContentType);
	// }
}

/*	RemoveEndConditionFromList()
	- In prompt, remove end condition from list.
*/
function RemoveEndConditionFromList(btn_name) {
	simulatorObjects[editExistingObject].endConditions.splice(btn_name, 1);

	ResetEndConditionList()

	// var panel = document.getElementById("modalEndConditionsPanel");
	// while (panel.firstChild) {
	// 	panel.removeChild(panel.firstChild);
	// }
	// let i = 0;
	// for (i = 0; i < simulatorObjects[editExistingObject].endConditions.length; i++) {
	// 	var addContentType = document.createElement("div");
	// 	addContentType.className = "div-list-item";
	// 	var addContent1 = document.createElement("div");
	// 	addContent1.style = "width:80%;float:left;";
	// 	var sentence = "in stage = " + simulatorObjects[editExistingObject].endConditions[i].oldStage + ", ";
	// 	let j = 0;
	// 	for (j = 0; j < simulatorObjects[editExistingObject].endConditions[i].conditions.length; j++) {
	// 		var tempVarName2 = simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2;
	// 		if (tempVarName2 == "") {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].value + "] ";
	// 		} else {
	// 			sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
	// 				+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2 + "] ";
	// 		}
	// 		if (j < simulatorObjects[editExistingObject].endConditions[i].conditions.length - 1) {
	// 			sentence = sentence + "AND ";
	// 		}
	// 	}
	// 	sentence = sentence + "then end simulation system.";
	// 	addContent1.innerHTML = sentence;
	// 	addContentType.appendChild(addContent1);
	// 	var addContent2 = document.createElement("button");
	// 	addContent2.name = i;
	// 	addContent2.onclick = function () {
	// 		RemoveEndConditionFromList(this.name);
	// 	};
	// 	addContent2.style = "float:right;";
	// 	var addContent3 = document.createTextNode("X");
	// 	addContent2.appendChild(addContent3);
	// 	addContentType.appendChild(addContent2);

	// 	panel.appendChild(addContentType);
	// }
}

function ResetEndConditionList() {
	let panel = $('#modalEndConditionsPanel')
	panel.empty()
	let i = 0, item, label, sentence, button, icon
	for (i = 0; i < simulatorObjects[editExistingObject].endConditions.length; i++) {
		item = $('<div>').addClass('div-list-item')
		label = $('<div>').addClass('ui grey expanding label')
		sentence = "in stage " + simulatorObjects[editExistingObject].endConditions[i].oldStage + ", ";
		let j = 0;
		for (j = 0; j < simulatorObjects[editExistingObject].endConditions[i].conditions.length; j++) {
			var tempVarName2 = simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2;
			if (tempVarName2 == "") {
				sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
					+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
					+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].value + "] ";
			} else {
				sentence = sentence + "if [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName
					+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].condition
					+ "] [" + simulatorObjects[editExistingObject].endConditions[i].conditions[j].varName2 + "] ";
			}
			if (j < simulatorObjects[editExistingObject].endConditions[i].conditions.length - 1) {
				sentence = sentence + "AND ";
			}
		}
		sentence = sentence + "go to stage " + simulatorObjects[editExistingObject].endConditions[i].newStage;
		label.append($('<label>').text(sentence).css('max-width', '95%'))

		button = $('<a>').addClass('ui opaque right floated')
		icon = $('<i>').addClass('inverted  delete icon').click(function () {
			RemoveStageConditionFromList(this.name);
		}
		)

		button.append(icon)
		label.append(button)
		item.append(label)
		panel.append(item)
	}
}

/*	ConfigureItemFromCanvas()
	- Click on item on canvas to configure (show options in inspector window on right).
*/
function ConfigureItemFromCanvas(e) {
	// include simulators, messages, AND the RTI Server itself

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
		let label = $('<label>').addClass('ui color-simulator large label').text(simulatorObjects[i].name)
		header.append($('<h3>').text('Simulator in Project'))
		header.append(label)

		let content = $('<div>').addClass('ui compact segment')
		let buttons = $('<div>').addClass('ui vertical buttons')

		let button0 = $('<button>').addClass('ui color-simulator basic button').text('Change Local Time')
		button0.click(() => {
			editExistingObject = clickedOnItem;
			EditSimLocalTime();
		})
		let button1 = $('<button>').addClass('ui color-simulator basic button').text('Set Initialize and Simulate Functions')
		button1.click(() => {
			editExistingObject = clickedOnItem;
			EditSimulateFunctions();
		})
		let button2 = $('<button>').addClass('ui color-simulator basic button').text('Change Stage Transition Conditions')
		button2.click(() => {
			editExistingObject = clickedOnItem;
			EditStageConditions();
		})
		let button3 = $('<button>').addClass('ui color-simulator basic button').text('Change End System Conditions')
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

		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "<b>Simulator on Canvas:</b>";
		// panel.appendChild(addContentType);

		// addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
		// var addContent = document.createTextNode("Name : " + simulatorObjects[i].name);
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);

		// (use for-loop to create 4 similar buttons)
		// for (i = 0; i < 4; i++) {
		// 	addContentType = document.createElement("button");
		// 	addContentType.style = "width: 100%; height: 40px;";
		// 	var addContent;
		// 	if (i == 0) {
		// 		addContentType.onclick = function () {
		// 			editExistingObject = clickedOnItem;
		// 			EditSimLocalTime();
		// 		};
		// 		addContent = document.createTextNode("Change Local Time");
		// 	} else if (i == 1) {
		// 		addContentType.onclick = function () {
		// 			editExistingObject = clickedOnItem;
		// 			EditSimulateFunctions();
		// 		};
		// 		addContent = document.createTextNode("Set Initialize and Simulate Functions");
		// 	} else if (i == 2) {
		// 		addContentType.onclick = function () {
		// 			editExistingObject = clickedOnItem;
		// 			EditStageConditions();
		// 		};
		// 		addContent = document.createTextNode("Change Stage Transition Conditions");
		// 	} else if (i == 3) {
		// 		addContentType.onclick = function () {
		// 			editExistingObject = clickedOnItem;
		// 			EditEndConditions();
		// 		};
		// 		addContent = document.createTextNode("Change End System Conditions");
		// 	}
		// 	addContentType.appendChild(addContent);
		// 	panel.appendChild(addContentType);
		// }
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
		let message = $('<label>').addClass('ui color-message large label').text(messageName)
		header.append($('<h3>').text('Message on Canvas'))
		header.append(message)


		panel.append(header)

		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "<b>Message on Canvas:</b>";
		// panel.appendChild(addContentType);
		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
		// var addContent = document.createTextNode("Name : " + messageObjects[clickedOnItem].name);
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
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
		let sim = $('<label>').addClass('ui color-simulator large label').text(simName)
		let arrow = $('<i>').addClass('arrow right icon')
		let message = $('<label>').addClass('ui color-message large label').text(messageName)
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

		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "<b>Publish-Definition on Canvas:</b>";
		// panel.appendChild(addContentType);
		// var simName = simulatorObjects[listOfSimPub[clickedOnItem].nameParent].name;
		// var messageName = messageObjects[simulatorObjects[listOfSimPub[clickedOnItem].nameParent].publishedMessages[listOfSimPub[clickedOnItem].name]].name;
		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
		// var addContent = document.createTextNode("Source -> Dest. : " + simName + " -> " + messageName);
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("button");
		// addContentType.style = "width: 100%; height: 40px;";
		// addContentType.onclick = function () {
		// 	editExistingObject = listOfSimPub[clickedOnItem].nameParent;		//index in 'simulatorObjects' of sim
		// 	editExistingObject2 = listOfSimPub[clickedOnItem].name;				//index in 'simulatorObjects[i].publishedMessages'
		// 	EditPublishConnectionPrompt();
		// };
		// var addContent = document.createTextNode("Change Publish Parameters");
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
		// console.log("clicked on Publish item, name = " + listOfSimPub[clickedOnItem].name
		// 	+ " , nameParent = " + listOfSimPub[clickedOnItem].nameParent);
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
		let message = $('<label>').addClass('ui color-message large label').text(messageName)
		let arrow = $('<i>').addClass('arrow right icon')
		let sim = $('<label>').addClass('ui color-simulator large label').text(simName)
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

		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "<b>Subscribe-Definition on Canvas:</b>";
		// panel.appendChild(addContentType);
		// var simName = simulatorObjects[listOfSimSub[clickedOnItem].nameParent].name;
		// var messageName = messageObjects[simulatorObjects[listOfSimSub[clickedOnItem].nameParent].subscribedMessages[listOfSimSub[clickedOnItem].name]].name;
		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
		// var addContent = document.createTextNode("Source -> Dest. : " + messageName + " -> " + simName);
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("button");
		// addContentType.style = "width: 100%; height: 40px;";
		// addContentType.onclick = function () {
		// 	editExistingObject = listOfSimSub[clickedOnItem].nameParent;
		// 	editExistingObject2 = listOfSimSub[clickedOnItem].name;
		// 	EditSubscribeConnectionPrompt();
		// };
		// var addContent = document.createTextNode("Change Subscribe Parameters");
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
		// console.log("clicked on Subscribe item, name = " + listOfSimSub[clickedOnItem].name
		// 	+ " , nameParent = " + listOfSimSub[clickedOnItem].nameParent);
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
		let button = $('<button>').addClass('ui color-message basic button').text('Change Launch Parameters')
		button.click(() => {
			EditServer();
		})
		content.append($('<p>').text("Host Name: " + hostName))
		content.append($('<p>').text("Port Number: " + portNumber))
		content.append(button)

		panel.append(header)
		panel.append(content)

		// var addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "<b>RTI Server:</b>";
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("hr");
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "Host Name: " + hostName;
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("div");
		// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		// addContentType.innerHTML = "Port Number: " + portNumber;
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("hr");
		// panel.appendChild(addContentType);
		// addContentType = document.createElement("button");
		// addContentType.style = "width: 100%; height: 40px;";
		// addContentType.onclick = function () {
		// 	EditServer();
		// };
		// var addContent = document.createTextNode("Change Launch Parameters");
		// addContentType.appendChild(addContent);
		// panel.appendChild(addContentType);
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
	let label = $('<label>').addClass('ui color-simulator large label').text(selectedObject.name)
	header.append($('<h3>').text('Simulator in Project'))
	header.append(label)

	let content = $('<div>').addClass('ui compact segment')
	let warning = $('<div>').addClass('ui warning').text('WARNING: Editing properties of this Simulator after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Simulator on the canvas after any updates.')
	let divider = $('<div>').addClass('ui hidden divider')
	let button = $('<button>').addClass('ui color-simulator basic button').text('Change Properties')
	button.click(() => {
		editExistingObject = btn_id;
		NewSimulatorObjectPrompt();
	})
	content.append(warning)
	content.append(divider)
	content.append(button)

	panel.append(header)
	panel.append(content)

	// var panel = document.getElementById("inspectorpanel");
	// var selectedObject = listOfSimulators[btn_id];
	// var addContentType = document.createElement("div");
	// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
	// addContentType.innerHTML = "<b>Simulator in Project:</b>";
	// panel.appendChild(addContentType);

	// addContentType = document.createElement("div");
	// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
	// var addContent = document.createTextNode("Name : " + selectedObject.name);
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);

	// addContentType = document.createElement("hr");
	// panel.appendChild(addContentType);
	// addContentType = document.createElement("div");
	// addContentType.style = "margin-bottom: 32px; padding: 8px;";
	// var addContent = document.createTextNode("WARNING: Editing properties of this Simulator after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Simulator on the canvas after any updates.");
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);
	// /*
	// 	Inspector should allow changing:
	// 		- name, variables, function names 
	// 			- changing should delete all sub/pub connections?
	// */

	// addContentType = document.createElement("button");
	// addContentType.style = "width: 100%; height: 40px;";
	// addContentType.onclick = function () {
	// 	editExistingObject = btn_id;
	// 	NewSimulatorObjectPrompt();
	// };
	// var addContent = document.createTextNode("Change Properties");
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);
}

/*	ConfigureMessageFromList()
	- Show options in inspector (on right) to configure a selected message (in project, not canvas).
*/
function ConfigureMessageFromList(btn_id) {
	ConfigureClearInspectorPanel();

	let panel = $('#inspectorpanel')
	let selectedObject = listOfMessages[btn_id]
	let header = $('<div>').addClass('ui compact segment')
	let label = $('<label>').addClass('ui color-message large label').text(selectedObject.name)
	header.append($('<h3>').text('Message in Project'))
	header.append(label)

	let content = $('<div>').addClass('ui compact segment')
	let warning = $('<div>').addClass('ui warning').text('WARNING: Editing properties of this Message after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Message on the canvas after any updates.')
	let divider = $('<div>').addClass('ui hidden divider')
	let button = $('<button>').addClass('ui color-message basic button').text('Change Properties')
	button.click(() => {
		editExistingObject = btn_id;
		NewMessageObjectPrompt();
	})
	content.append(warning)
	content.append(divider)
	content.append(button)

	panel.append(header)
	panel.append(content)

	// var panel = document.getElementById("inspectorpanel");
	// var selectedObject = listOfMessages[btn_id];
	// var addContentType = document.createElement("div");
	// addContentType.style = "width: 100%; height: 40px; padding: 8px;";
	// addContentType.innerHTML = "<b>Message in Project:</b>";
	// panel.appendChild(addContentType);

	// addContentType = document.createElement("div");
	// addContentType.style = "width: 100%; height: 42px; padding: 8px;";
	// var addContent = document.createTextNode("Name : " + selectedObject.name);
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);

	// addContentType = document.createElement("hr");
	// panel.appendChild(addContentType);
	// addContentType = document.createElement("div");
	// addContentType.style = "margin-bottom: 32px; padding: 8px;";
	// var addContent = document.createTextNode("WARNING: Editing properties of this Message after it has been added to the project canvas may cause unforeseen effects. Please check the properties of this Message on the canvas after any updates.");
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);
	/*
		Inspector should allow changing:
			- variables 
				- changing should delete all sub/pub connections?
	*/

	// addContentType = document.createElement("button");
	// addContentType.style = "width: 100%; height: 40px;";
	// addContentType.onclick = function () {
	// 	editExistingObject = btn_id;
	// 	NewMessageObjectPrompt();
	// };
	// var addContent = document.createTextNode("Change Properties");
	// addContentType.appendChild(addContent);
	// panel.appendChild(addContentType);
}

/*	ConfigureClearInspectorPanel()
	- Clear items in inspector panel.
*/
function ConfigureClearInspectorPanel() {
	// var inspectorPanel = document.getElementById("inspectorpanel");
	// while (inspectorPanel.firstChild) {
	// 	inspectorPanel.removeChild(inspectorPanel.firstChild);
	// }

	let inspectorPanel = $('#inspectorpanel')
	inspectorPanel.empty()
}

/*	NewProject()
	- Create new project (and clear previous project).
*/
function NewProject() {
	savepath = "";
	savename = "";
	ClearProject();
	AddProprietaryRTIMessage();
}

/*	ClearProject()
	- Clear memory of current project, and delete objects on canvas.
*/
function ClearProject() {
	let i = 0;
	var iLength = simulatorObjects.length;
	for (i = iLength - 1; i >= 0; i--) {
		simulatorObjects[i].objectRef.parentNode.removeChild(simulatorObjects[i].objectRef);
		simulatorObjects.splice(i, 1);
		// because all objects are relative, deleting one object makes other objects (that were added after i) move up one space. Need to reset everyone.
		MoveObjectsOnCanvasUpOne(i);
		UpdateDrawArrowsAfterDelete(i, -1);
	}
	var listOfMessageVars = document.getElementsByClassName("div-canvas-message");
	iLength = listOfMessageVars.length;
	for (i = iLength - 1; i >= 0; i--) {
		listOfMessageVars[i].parentNode.removeChild(listOfMessageVars[i]);
		messageObjects.splice(i, 1);
	}

	listOfSimulators = [];
	listOfMessages = [];
	simulatorObjects = [];
	messageObjects = [];
	numOfStages = 1;
	stage = 1;

	UpdateCanvasGrid();
	DrawAllArrowsOnCanvas();
	ClearObjectSubPanel1();
	ResetObjectSubPanel2();
	UpdateSelectedStage(0);
}

/*	SaveProject()
	- Save current project to a file to reopen later.
*/
function SaveProject() {
	var content = "Hello world! \na simple test.";
	// 'fs' is for filesystem, comes with Electron (or, as included within it, Node.js)
	var fs = require('fs');

	// need to let user choose the path of the project's save file.
	if (savepath == "") {
		// need to first have user define where they want to save this project.
		OpenSaveAsProject();
		return;
	}
	try {
		content = CreateProjectText();
		fs.writeFileSync(savepath + savename + ".project", content, 'utf-8');
		// also save representation for each individual simulator, to make it easy to import to new projects later.
		let i = 0;
		for (i = 0; i < listOfSimulators.length; i++) {
			var simdef = {
				simdef: listOfSimulators[i]
			};
			fs.writeFileSync(savepath + listOfSimulators[i].name + "_def.simdef", JSON.stringify(simdef, null, 4), 'utf-8');
		}
		for (i = 0; i < listOfMessages.length; i++) {
			var mesdef = {
				mesdef: listOfMessages[i]
			};
			fs.writeFileSync(savepath + listOfMessages[i].name + "_def.mesdef", JSON.stringify(mesdef, null, 4), 'utf-8');
		}
	} catch (e) {
		console.log("failed to save file: " + e);
		alert('failed to save file!');

	}
}

/*	CreateProjectText()
	- Create the string content that represents the project, to write to a save file.
*/
function CreateProjectText() {
	var content = "";
	// JavaScript supports "JavaScript Object Notation" by default.
	var obj = {
		listOfSimulators: listOfSimulators,
		listOfMessages: listOfMessages,
		simulatorObjects: simulatorObjects,
		messageObjects: messageObjects,
		numOfStages: numOfStages
	};
	content = JSON.stringify(obj, null, 4);
	return content;
}

/*	OpenSaveAsProject()
	- Prompt that asks to set save location and name of current project. 
*/
function OpenSaveAsProject() {
	DisplayOrClosePrompt("modalSaveAs", "block");
}

/*	CloseSaveAsProject()
	- Close prompt to "save as".
*/
function CloseSaveAsProject() {
	DisplayOrClosePrompt("modalSaveAs", "none");
}

/*	OpenOpenProject()
	- Prompt that asks to open project.
*/
function OpenOpenProject() {
	DisplayOrClosePrompt("modalOpenProject", "block");
}

/*	CloseOpenProject()
	 - Close prompt to "open project."
*/
function CloseOpenProject() {
	DisplayOrClosePrompt("modalOpenProject", "none");
}

/*	SaveSaveAsProject()
	- Save project to new location.
*/
function SaveSaveAsProject() {
	var newSavePath = "";
	var saveAsFolder = document.getElementsByName("saveAsFileDir")[0];
	console.log("Printint out folders.");
	let i = 0;
	for (i = 0; i < saveAsFolder.files.length; i++) {
		//!!!!
		console.log("Folder: " + saveAsFolder.files[i].path);
	}
	newSavePath = saveAsFolder.files[0].path + "\\";
	savepath = newSavePath;
	savename = document.getElementsByName("TextSaveAsFileName")[0].value;
	CloseSaveAsProject();
	SaveProject();
}

/*	OpenProjectFile()
	 - Prompt file input to open existing file.
*/
function OpenProjectFile() {
	console.log("Open project");
	document.getElementsByName("openProjectFileDir")[0].click();
	console.log("Open project file select.");
}

/*	OpenExistingProject()
	- Open and load existing project from file.
*/
function OpenExistingProject(filepath, filename) {
	console.log("Need to update project now with new open file.");

	var content = "Hello world! \na simple test.";
	// 'fs' is for filesystem, comes with Electron (or, as included within it, Node.js)
	var fs = require('fs');
	try {
		content = fs.readFileSync(filepath + filename + ".project", 'utf-8');
	} catch (e) {
		alert('failed to open project file!');
		return;
	}
	savepath = filepath;
	savename = filename;
	ResetCanvasWithNewProject(content);
}

/*	ResetCanvasWithNewProject()
	- Clear existing project, load new project data.
*/
function ResetCanvasWithNewProject(projectText) {
	console.log("Reseting canvas with new project.");
	ClearProject();

	var obj = JSON.parse(projectText);
	listOfSimulators = obj.listOfSimulators;
	listOfMessages = obj.listOfMessages;
	simulatorObjects = obj.simulatorObjects;
	messageObjects = obj.messageObjects;
	numOfStages = obj.numOfStages;
	let i = 0;
	for (i = 0; i < simulatorObjects.length; i++) {
		CreateExistingSimulatorOnCanvas(i);
	}
	for (i = 0; i < messageObjects.length; i++) {
		CreateExistingMessageOnCanvas(i);
	}

	UpdateCanvasGrid();
	DrawAllArrowsOnCanvas();
	ResetObjectSubPanel1();
	ResetObjectSubPanel2();
	UpdateSelectedStage(0);
}

/*	ExportExecuteFiles()
	- Export practical files to use in real SRTI outside of this GUI system.
*/
function ExportExecuteFiles() {
	WriteWrapperConfigFiles();
	WriteCommandsToFile();
}

function WriteWrapperConfigFiles() {
	// for each simulator, create SimName_Config.json, and a JSON object that makes up the content of that file.
	let i = 0;
	var errorLocation = 0;
	try {
		for (i = 0; i < listOfSimulators.length; i++) {
			//errorLocation = 0;
			var savePathLocal = listOfSimulators[i].filePath + "\\";
			var saveNameLocal = listOfSimulators[i].name + "_config";
			var content = "";
			var stageChannels = [];
			var initializeChannels = [];
			var simulateChannels = [];
			var subscribedChannels = [];
			var publishedChannels = [];
			var endConditions = [];
			var stageConditions = [];

			//errorLocation = 1;

			let j = 0;
			for (j = 0; j < simulatorObjects.length; j++) {
				errorLocation = 0;
				if (simulatorObjects[j].name == listOfSimulators[i].name) {
					errorLocation = 1;
					stageChannels.push(
						{
							stage: parseInt(simulatorObjects[j].stage),
							order: parseInt(simulatorObjects[j].order),
							timestepDelta: parseInt(simulatorObjects[j].timeDelta),
							timestepMul: parseInt(simulatorObjects[j].timeScale),
							timestepVarDelta: simulatorObjects[j].timeVarDelta
						});
					initializeChannels.push(
						{
							functionName: simulatorObjects[j].initialize,
							stage: parseInt(simulatorObjects[j].stage)
						});
					simulateChannels.push(
						{
							functionName: simulatorObjects[j].simulate,
							timestepDelta: parseInt(simulatorObjects[j].simulateTimeDelta),
							stage: parseInt(simulatorObjects[j].stage)
						});
					errorLocation = 2;
					console.log("preparing for sim " + j + ", has name " + simulatorObjects[j].name);
					let k = 0;
					for (k = 0; k < simulatorObjects[j].subscribedMessages.length; k++) {
						var varChannel = [];
						let m = 0;
						for (m = 0; m < simulatorObjects[j].subscribedDetails[k].length; m++) {
							errorLocation = "s " + simulatorObjects[j].subscribedMessages[k] + " " + simulatorObjects[j].subscribedDetails[k][m][0] + " " + simulatorObjects[j].subscribedDetails[k][m][1];
							var varNameIndex = simulatorObjects[j].subscribedDetails[k][m][0];
							var varNameIndex2 = simulatorObjects[j].subscribedDetails[k][m][1];
							if (varNameIndex != -1 && varNameIndex2 != -1) {
								varChannel.push(
									{
										valueName: messageObjects[simulatorObjects[j].subscribedMessages[k]].original.variables[simulatorObjects[j].subscribedDetails[k][m][1]].name,//listOfMessages[simulatorObjects[j].subscribedMessages[k]].variables[simulatorObjects[j].subscribedDetails[k][m][1]].name,
										varName: listOfSimulators[i].variables[simulatorObjects[j].subscribedDetails[k][m][0]].name
									});
							}
						}
						subscribedChannels.push(
							{
								messageName: messageObjects[simulatorObjects[j].subscribedMessages[k]].original.name,//listOfMessages[simulatorObjects[j].subscribedMessages[k]].name,
								oneTime: (simulatorObjects[j].subscribedInitial[k] == "true"),
								mandatory: true,
								relativeOrder: parseInt(simulatorObjects[j].subscribedRelative[k]),
								maxTimestep: parseInt(simulatorObjects[j].subscribedTimestep[k]),
								timestepDelta: parseInt(simulatorObjects[j].subscribedTimeDelta[k]),
								stage: parseInt(simulatorObjects[j].stage),
								varChannel: varChannel
							});
					}
					errorLocation = 3;
					for (k = 0; k < simulatorObjects[j].publishedMessages.length; k++) {
						var varChannel = [];
						let m = 0;
						for (m = 0; m < simulatorObjects[j].publishedDetails[k].length; m++) {
							errorLocation = "p " + simulatorObjects[j].publishedMessages[k] + " " + simulatorObjects[j].publishedDetails[k][m][0] + " " + simulatorObjects[j].publishedDetails[k][m][1];
							var varNameIndex = simulatorObjects[j].publishedDetails[k][m][0];
							var varNameIndex2 = simulatorObjects[j].publishedDetails[k][m][1];
							if (varNameIndex != -1 && varNameIndex2 != -1) {
								varChannel.push(
									{
										valueName: messageObjects[simulatorObjects[j].publishedMessages[k]].original.variables[simulatorObjects[j].publishedDetails[k][m][0]].name,//listOfMessages[simulatorObjects[j].publishedMessages[k]].variables[simulatorObjects[j].publishedDetails[k][m][0]].name,
										varName: listOfSimulators[i].variables[simulatorObjects[j].publishedDetails[k][m][1]].name
									});
							}
						}
						publishedChannels.push(
							{
								messageName: messageObjects[simulatorObjects[j].publishedMessages[k]].original.name,//listOfMessages[simulatorObjects[j].publishedMessages[k]].name,
								initial: (simulatorObjects[j].publishedInitial[k] == "true"),
								timestepDelta: parseInt(simulatorObjects[j].publishedTimeDelta[k]),
								stage: parseInt(simulatorObjects[j].stage),
								varChannel: varChannel
							});
					}
					errorLocation = 4;
					for (k = 0; k < simulatorObjects[j].endConditions.length; k++) {
						var newCondition = [];
						let m = 0;
						for (m = 0; m < simulatorObjects[j].endConditions[k].conditions.length; m++) {
							// (extra parse to a number instead of a string necessary for Wrapper to properly check if condition is met)
							var tempValue = simulatorObjects[j].endConditions[k].conditions[m].value;
							if (isNaN(tempValue) == false) {
								tempValue = parseFloat(tempValue);
							}
							newCondition.push(
								{
									varName: simulatorObjects[j].endConditions[k].conditions[m].varName,
									condition: simulatorObjects[j].endConditions[k].conditions[m].condition,
									value: tempValue,
									varName2: simulatorObjects[j].endConditions[k].conditions[m].varName2
								});
						}
						endConditions.push(newCondition);
					}
					errorLocation = 5;
					for (k = 0; k < simulatorObjects[j].stageConditions.length; k++) {
						var newCondition = [];
						let m = 0;
						for (m = 0; m < simulatorObjects[j].stageConditions[k].conditions.length; m++) {
							var tempValue = simulatorObjects[j].stageConditions[k].conditions[m].value;
							if (isNaN(tempValue) == false) {
								tempValue = parseFloat(tempValue);
							}
							newCondition.push(
								{
									oldStage: parseInt(simulatorObjects[j].stageConditions[k].oldStage),
									newStage: parseInt(simulatorObjects[j].stageConditions[k].newStage),
									varName: simulatorObjects[j].stageConditions[k].conditions[m].varName,
									condition: simulatorObjects[j].stageConditions[k].conditions[m].condition,
									value: tempValue,
									varName2: simulatorObjects[j].stageConditions[k].conditions[m].varName2
								});
						}
						stageConditions.push(newCondition);
					}
				}
			}

			//errorLocation = 2;
			var obj = {
				hostName: hostName,
				portNumber: portNumber,
				simulatorName: listOfSimulators[i].name,
				simulatorRef: listOfSimulators[i].refName,
				debugConsole: false,
				debugFile: false,
				dataOutFile: false,
				stageChannels: stageChannels,
				initializeChannels: initializeChannels,
				simulateChannels: simulateChannels,
				subscribedChannels: subscribedChannels,
				publishedChannels: publishedChannels,
				endConditions: endConditions,
				stageConditions: stageConditions
			};

			//errorLocation = 3;
			content = JSON.stringify(obj, null, 4);
			try {
				var fs = require('fs');
				fs.writeFileSync(savePathLocal + saveNameLocal + ".json", content, 'utf-8');
				fs.writeFileSync(savePathLocal + "Global.json", "{}", 'utf-8');
				fs.writeFileSync(savePathLocal + "Settings.json", "{\"global\": \"Global.json\", \"configuration\": \"" + saveNameLocal + ".json\"}", 'utf-8');

			} catch (e) {
				alert('failed to save export file for ' + listOfSimulators[i].name + ' ... error = ' + e);
			}
		}
	} catch (e) {
		alert('failed to export config files... i = ' + i
			+ ' errorLocation = ' + errorLocation + ' error = ' + e);
	}
}

function WriteCommandsToFile() {
	try {
		var fs = require('fs');
		var fsContent = "";
		fsContent += "\\\\ lines that start with \\\\ will not run.\n";
		fsContent += "\\\\ This is the Windows version of the commands that need to execute to run this project. \n";
		fsContent += "cd (RTIServerLocation)\n";
		fsContent += "java -jar SRTI_v2_16_02.jar\n";
		let i = 0;
		for (i = 0; i < listOfSimulators.length; i++) {
			fsContent += "cd " + listOfSimulators[i].filePath + "\n";
			fsContent += "" + listOfSimulators[i].executeCommand + "\n";
		}
		fs.writeFileSync(savepath + "executeCommands" + ".txt", fsContent, 'utf-8');
	} catch (e) {
		alert('failed to save export file of execution commands ' + ' ... error = ' + e);
	}
}

/*	Below functions handle managing "undo" and "redo" functionality.
	
*/
function ClearUndoRedoBuffer() {
	// clear Undo and Redo stack.
	// ... should occur... when?
}

function AddToUndoBuffer(description) {
	// add 1 to Undo stack, clear Redo stack
	// occurs when an action occurs to add to "Undo" stack
	undoStack.push({
		description: description,
		listOfSimulators: JSON.stringify(listOfSimulators),
		listOfMessages: JSON.stringify(listOfMessages),
		simulatorObjects: JSON.stringify(simulatorObjects),
		messageObjects: JSON.stringify(messageObjects),
		numOfStages: numOfStages
	});
	let i = 0;
	var offsetYText = "";
	for (i = 0; i < undoStack.length; i++) {
		offsetYText = offsetYText + " " + JSON.parse(undoStack[i].simulatorObjects)[0].offsetY;
	}
	if (undoStack.length > 30) {
		undoStack.splice(0, 1);
	}
	redoStack = [];
}

function Undo() {
	// remove 1 from Undo stack, add 1 to Redo stack
	// occurs when clicking "Edit -> Undo"
	if (undoStack.length == 0) {
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "(UNDO FAILED: no more undo actions to do!)";
	} else {
		var obj = undoStack[undoStack.length - 1];
		undoStack.splice(undoStack.length - 1, 1);
		redoStack.push({
			description: obj.description,
			listOfSimulators: JSON.stringify(listOfSimulators),
			listOfMessages: JSON.stringify(listOfMessages),
			simulatorObjects: JSON.stringify(simulatorObjects),
			messageObjects: JSON.stringify(messageObjects),
			numOfStages: numOfStages
		});
		ClearProject();
		listOfSimulators = JSON.parse(obj.listOfSimulators);
		listOfMessages = JSON.parse(obj.listOfMessages);
		simulatorObjects = JSON.parse(obj.simulatorObjects);
		messageObjects = JSON.parse(obj.messageObjects);
		numOfStages = obj.numOfStages;
		let i = 0;
		for (i = 0; i < simulatorObjects.length; i++) {
			CreateExistingSimulatorOnCanvas(i);
		}
		for (i = 0; i < messageObjects.length; i++) {
			CreateExistingMessageOnCanvas(i);
		}
		UpdateCanvasGrid();
		DrawAllArrowsOnCanvas();
		ResetObjectSubPanel1();
		ResetObjectSubPanel2();
		UpdateSelectedStage(0);
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "UNDO: " + obj.description + " (" + undoStack.length + " actions left)";
	}
}

function Redo() {
	// add 1 to Undo stack, remove 1 from Redo stack
	// occurs when clicking "Edit - > Redo"
	if (redoStack.length == 0) {
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "(REDO FAILED: no more redo actions to do!)";
	} else {
		var obj = redoStack[redoStack.length - 1];
		redoStack.splice(redoStack.length - 1, 1);
		undoStack.push({
			description: obj.description,
			listOfSimulators: JSON.stringify(listOfSimulators),
			listOfMessages: JSON.stringify(listOfMessages),
			simulatorObjects: JSON.stringify(simulatorObjects),
			messageObjects: JSON.stringify(messageObjects),
			numOfStages: numOfStages
		});
		ClearProject();
		listOfSimulators = JSON.parse(obj.listOfSimulators);
		listOfMessages = JSON.parse(obj.listOfMessages);
		simulatorObjects = JSON.parse(obj.simulatorObjects);
		messageObjects = JSON.parse(obj.messageObjects);
		numOfStages = obj.numOfStages;
		let i = 0;
		for (i = 0; i < simulatorObjects.length; i++) {
			CreateExistingSimulatorOnCanvas(i);
		}
		for (i = 0; i < messageObjects.length; i++) {
			CreateExistingMessageOnCanvas(i);
		}
		UpdateCanvasGrid();
		DrawAllArrowsOnCanvas();
		ResetObjectSubPanel1();
		ResetObjectSubPanel2();
		UpdateSelectedStage(0);
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "REDO: " + obj.description + " (" + redoStack.length + " actions left)";
	}
}

/*	AddProprietaryRTIMessage()
	- Add the default "RTI_" message to subscribe to onto the canvas, for all new messages.
*/
function AddProprietaryRTIMessage() {
	var rtiMessage = "{\"mesdef\":{\"name\":\"RTI_\","
		+ "\"variables\":[{\"name\":\"vTimestep\",\"valueType\":\"integer\"},"
		+ "{\"name\":\"stage\",\"valueType\":\"integer\"},"
		+ " {\"name\":\"stageVTimestepMul\",\"valueType\":\"integer\"},"
		+ "{\"name\":\"stageVTimestep\",\"valueType\":\"integer\"}]}}";
	var obj = JSON.parse(rtiMessage);
	listOfMessages.push(obj.mesdef);
	ResetObjectSubPanel2();
}

var child_process;
var execServer;
//var execServer2;
var serverActive = false;
function StartSimulationSystem() {
	console.log("Can we open RTI Server?");
	if (serverActive == false) {
		hasStartedRunningSystem = false;
		serverActive = true;
		document.getElementById("btn-start").disabled = true;
		document.getElementById("btn-stop").disabled = false;
		document.getElementById("btn-pause").disabled = true;
		try {
			child_process = require('child_process');
			// if running command directly (without opening separate cmd), then we can close it successfully using standard process.
			// otherwise, we need to figure out new way to close it.
			//execServer = child_process.exec('cd /d D:\\Work\\Acer\\DSK\\UMich\\ICoR\\Reading-Materials\\201908\\srti_gui_test\\server && java -jar SRTI_v2_12_02.jar\',
			// ... conclusion: no easy way to do this. Strongly recommend users prepare simulators with basic GUI.
			//execServer = child_process.exec('start cmd /k \"cd /d D:\\Work\\Acer\\DSK\\UMich\\ICoR\\Reading-Materials\\201908\\srti_gui_test\\server && java -jar SRTI_v2_12_02.jar\"',
			//execServer = child_process.exec('cd /d D:\\Work\\Acer\\DSK\\UMich\\ICoR\\Reading-Materials\\201908\\srti_gui_test\\server && java -jar SRTI_v2_16_02.jar',

			// 'var tempPath' is correct for compiled versions of the app, but not for 'npm start .' for debugging purposes...
			var tempPath = __dirname + '\\..\\extraResources\\srti_server\\';
			//tempPath = __dirname + "\\extraResources\\srti_server\\";
			//alert(tempPath.substring(tempPath.length-64,tempPath.length-1));
			execServer = child_process.exec('cd /d ' + tempPath + ' && java -jar SRTI_v2_20_02.jar',
				(error, stdout, stderror) => {
					if (error) {
						alert("error when running command: " + error);
					} else {
						alert("command worked!");
					}
				});

			// start all other simulators (all that exist anywhere on the canvas).
		} catch (e) {
			alert('Error when trying to open RTI Server. ' + e);
			return;
		}
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "Try to open Server: " + execServer.pid + " and enable 'play' button in 10 seconds.";


		// try to create a socket to connect to RTI Server.
		setTimeout(function () {
			var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
			textConsoleLastAction.innerHTML = "Trying to connect this GUI to the RTI Server...";
			ConnectToRTIServer();
			LaunchSimulators();
		}, 5000);

		// if socket successfully connects, enable 'Play' button
		setTimeout(function () {
			if (serverActive == true) {
				document.getElementById("btn-play").disabled = false;
				var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
				textConsoleLastAction.innerHTML = "Ready to begin sim system!";
			}
		}, 10000);
	}
}

var hasStartedRunningSystem = false;
function PlaySimulationSystem() {
	// send message to "Start" system to Server.

	if (hasStartedRunningSystem == false) {
		hasStartedRunningSystem = true;
		var outputString = "{\"name\":\"RTI_StartSim\",\"content\":\"{}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
		document.getElementById("btn-play").disabled = true;
		document.getElementById("btn-pause").disabled = false;
		guiDedicatedClient.write(outputString);
	} else {
		var outputString = "{\"name\":\"RTI_ResumeSystem\",\"content\":\"{}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
		document.getElementById("btn-play").disabled = true;
		document.getElementById("btn-pause").disabled = false;
		guiDedicatedClient.write(outputString);

	}
}

function PauseSimulationSystem() {
	console.log("Can we send message to RTI Server to pause system?");
	// send message to "Pause" system to Server.

	var outputString = "{\"name\":\"RTI_PauseSystem\",\"content\":\"{}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
	document.getElementById("btn-play").disabled = false;
	document.getElementById("btn-pause").disabled = true;

	guiDedicatedClient.write(outputString);
}

function StopSimulationSystem() {
	console.log("Can we close RTI Server?");
	if (serverActive == true) {
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "Try to close Server. " + execServer.pid;
		serverActive = false;
		try {
			var kill = require('tree-kill');
			kill(execServer.pid);
		} catch (e) {
			alert('Error when trying to end RTI Server. ' + e);
		}
		// need to try to close other simulators too.

	}

	let i = 0;
	for (i = 0; i < execSims.length; i++) {
		try {
			var kill = require('tree-kill');
			kill(execSims[i].pid);
		} catch (e) {
			alert('Error when trying to end sim. ' + e);
		}
	}

	document.getElementById("btn-start").disabled = false;
	document.getElementById("btn-stop").disabled = true;
	document.getElementById("btn-pause").disabled = true;
	document.getElementById("btn-play").disabled = true;

	//guiClient.close();
	//guiServer.close();
	guiFirstClient.destroy();
	guiDedicatedClient.destroy();
}

var guiFirstClient;
//var guiServer;
var guiDedicatedClient;
function ConnectToRTIServer() {

	var dedicatedServerPort = 4200;

	var net = require('net');
	guiFirstClient = new net.Socket();
	try {
		guiFirstClient.connect(portNumber, hostName, function () {
			console.log("Successfully connected GUI to RTI Server!");
			var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
			textConsoleLastAction.innerHTML = "First step complete to connect GUI to RTI Server...";

			/*var rl = require('readline');
			var readInterface = rl.createInterface(
			
			guiServer = net.createServer(function(socket){
				dedicatedServerPort = socket;
			});
			guiServer.listen(0, 'localhost');*/

		});
		guiFirstClient.on('data', function (data) {
			var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
			textConsoleLastAction.innerHTML = "Data received by RTI Server: " + data.toString();

			var dataReceived = data.toString().split("\n");
			textConsoleLastAction.innerHTML = "Separated data received by RTI Server: (" + dataReceived[1] + ")";
			var dedicatedClientPort = parseInt(dataReceived[1]);
			var dedicatedServerPort = 0;

			guiDedicatedClient = new net.Socket();
			guiDedicatedClient.connect(dedicatedClientPort, function () {
				var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
				textConsoleLastAction.innerHTML = "Finished successfully connecting to RTI Server!";

				var outputString = "{\"name\":\"RTI_InitializeSim\",\"content\":\"{\\\"simName\\\":\\\"RTI-v2-GUI\\\"}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
				guiDedicatedClient.write(outputString);

				outputString = "{\"name\":\"RTI_SubscribeToAllPlusHistory\",\"content\":\"\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
				guiDedicatedClient.write(outputString);
			});

			guiDedicatedClient.on('data', function (data) {
				HandleRTIInputData(data);
			});

		});
	} catch (e) {
		var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "Error occurred when trying to connect GUI to RTI Server! :(";
	}

	// issue: I have to effectively recreate a major part of "RTILib" in JavaScript to properly subscribe/publish messages.
}

function HandleRTIInputData(data) {
	// How should we display system-wide messages to the user?

	// example test to get a specific part of the message:
	var obj = JSON.parse(data);
	var step = obj.vTimestamp;
	var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
	textConsoleLastAction.innerHTML = "Step = " + step + " . Full RTI Message: " + data;

	// reminder: 'stage' can be found in 'RTI_StartStep' -> 'content' -> 'stage'.
	var stage = -1;
	if (obj.name == "RTI_StartStep") {
		var content = JSON.parse(obj.content);
		stage = content.stage;
	}


	UpdateStepAndStage(step, stage);

	UpdateInspectorPanelMessage(data);

}

function UpdateStepAndStage(step, stage) {
	if (stage == -1) {
		// don't update global stage locally, don't change display for stage
		// only update 'div' for 'step'
	} else {
		// update 'div' for both 'step' and 'stage'
	}
}

var receivedMessageBuffer = [];
var receivedMessageBufferLength = 6;
function UpdateInspectorPanelMessage(data) {
	// keep track of most recent 6 messages received

	if (receivedMessageBuffer.length < receivedMessageBufferLength) {
		receivedMessageBuffer = [];
		let i = 0;
		for (i = 0; i < receivedMessageBufferLength; i++) {
			receivedMessageBuffer.push({ name: "N/A", message: "N/A" });
		}
	}

	receivedMessageBuffer.splice(0, 1);

	var obj = JSON.parse(data);
	var objName = obj.name;

	receivedMessageBuffer.push({ name: objName, message: data });

	UpdateInspectorPanelMessageObjects("(message content here)");
}

function UpdateInspectorPanelMessageObjects(message) {
	var inspectorPanel = document.getElementById("inspectorpanel");
	while (inspectorPanel.firstChild) {
		inspectorPanel.removeChild(inspectorPanel.firstChild);
	}

	var inspectorPanelString = "";
	for (i = 0; i < receivedMessageBufferLength; i++) {
		inspectorPanelString = inspectorPanelString + receivedMessageBuffer[i].name + ", " + "<br>";

		var addContentType = document.createElement("button");
		addContentType.style = "width: 100%; height: 40px; padding: 8px;";
		addContentType.innerHTML = receivedMessageBuffer[i].name;
		addContentType.name = receivedMessageBuffer[i].message;
		addContentType.onclick = function () {
			UpdateInspectorPanelMessageContent(this.name);
		};
		inspectorPanel.appendChild(addContentType);
	}
	var addContentType = document.createElement("div");
	// unable to give 'div' a name? Makes it much harder to reference/update later...
	addContentType.style = "width: 100%; height: 40px; padding: 4px;";
	addContentType.innerHTML = message;
	inspectorPanel.appendChild(addContentType);
}

function UpdateInspectorPanelMessageContent(message) {
	var message2 = JSON.stringify(JSON.parse(message), null, 4);
	var message3 = message2;//message2.replace(/\n/g, "<br>");
	UpdateInspectorPanelMessageObjects(message3);
}

var execSims;
function LaunchSimulators() {
	try {
		execSims = [];
		child_process = require('child_process');
		/*execServer = child_process.exec('cd /d D:\\Work\\Acer\\DSK\\UMich\\ICoR\\Reading-Materials\\201908\\srti_gui_test\\server && java -jar SRTI_v2_12_02.jar',
			(error, stdout, stderror) => {
				if (error){
					alert("error when running command: " + error);
				} else {
					alert("command worked!");
				}
		});*/

		// FIRST, must export Wrapper config files (automatically save when running, or else prompt user before running)

		// start all other simulators (all that exist anywhere on the canvas).
		let i = 0;
		for (i = 0; i < listOfSimulators.length; i++) {
			var execCommand = "cd /d " + listOfSimulators[i].filePath
				+ " && " + listOfSimulators[i].executeCommand;
			var execSim = child_process.exec(execCommand,
				(error, stdout, stderror) => {
					if (error) {
						alert("error when running command to open sim: " + error);
					} else {
						alert("executing sim was successful!");
					}
				});
			execSims.push(execSim);
		}

	} catch (e) {
		alert('Error when trying to open RTI Server. ' + e);
		return;
	}
	var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
	textConsoleLastAction.innerHTML = "Try to open sims: " + execSims.pid + "...";

}







