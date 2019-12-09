// clicking/drawing/removing objects on the canvas

/*	CanvasOnScroll()
	- When horizontal scroll for 'canvassubpanel1' (where Sims are) occurs,
		match horizontal movement for 'canvassubpanel2' (where Messages are).
*/
function CanvasOnScroll(div) {
    var canvas1 = document.getElementById("canvassubpanel2");
    canvas1.scrollLeft = div.scrollLeft;
}

/*	UpdateCanvasGrid()
	- Redraw canvas grid (where Sims are) based on current size of 'gridSizeX' and 'gridSizeY'.
*/
function UpdateCanvasGrid() {
    console.log("UpdateCanvasGrid() called.");
    let panel = $('#canvassubpanel1grid')
    panel.empty()

    let i, j, cell;
    for (i = 0; i < gridSizeX; i++) {
        for (j = 0; j < gridSizeY; j++) {
            cell = $('<div>').addClass('cell')
            cell.css('left', `${(i + 1) * 100}px`)
            cell.css('top', `${j * 100}px`)
            panel.append(cell)
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
    for (let simObj of simulatorObjects) {
        //!!!!
        if (((simObj.topPos / 100) + 2 + i) > maxSizeY
            && simObj.stage == stage) {
            maxSizeY = (simObj.topPos / 100) + 2 + i;
        }
        if (((simObj.leftPos / 100) - 1 + 2) > maxSizeX
            && simObj.stage == stage) {
            maxSizeX = ((simObj.leftPos / 100) - 1 + 2);
        }
        //!!!!
    }

    gridSizeX = maxSizeX;
    gridSizeY = maxSizeY;

    // TODO: only need to redraw when there are changes

    UpdateCanvasGrid();
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
    for (let simObj of simulatorObjects) {
        if (e.target === simObj.objectRef) {
            clickedOnItem = simObj;
            break;
        }

        i += 1
    }


    if (i < simulatorObjects.size) {
        dragItem = clickedOnItem.objectRef;
        xOffset = clickedOnItem.offsetX;
        yOffset = clickedOnItem.offsetY;

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

            clickedOnItem.offsetX = xOffset;
            clickedOnItem.offsetY = yOffset;
            clickedOnItem.topPos = (getTranslate3d(dragItem.style.transform))[1];
            clickedOnItem.leftPos = (getTranslate3d(dragItem.style.transform))[0];
            clickedOnItem.order = ((clickedOnItem.offsetY / 100) + i);

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
        console.log(34 + (42 * $('.div-canvas-message').length))
        $('.div-canvas-server').height(Math.max(160, -8 + (42 * $('.div-canvas-message').length)))
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
function DeleteItemFromCanvasById(simObj) {
    let i = id;
    simulatorObjects[i].objectRef.parentNode.removeChild(simulatorObjects[i].objectRef);
    simulatorObjects.splice(i, 1);
    // because all objects are relative, 
    //		deleting one object makes other objects (that were added after i) move up one space. 
    //		Need to reset everyone.
    MoveObjectsOnCanvasUpOne(i);
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
                var htmlString = "<svg width='" + 22 + "' height='" + (gridSizeY * 100) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                htmlString += "<path d='M" + 12 + "," + topPos + "L" + 12 + "," + ((gridSizeY * 100)) + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
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
                var htmlString = "<svg width='" + 22 + "' height='" + (bottomPos + 10) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                // end point of arrow: starting position of Message object, - height of arrow + 3 
                htmlString += "<path d='M" + 12 + "," + topPos + "L" + 12 + "," + bottomPos + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
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
                var htmlString = "<svg width='" + 22 + "' height='" + (gridSizeY * 100) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                htmlString += "<path d='M" + 12 + "," + ((gridSizeY * 100)) + "L" + 12 + "," + topPos + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
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
                var htmlString = "<svg width='" + 22 + "' height='" + (bottomPos + 10) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                // end point of arrow: starting position of Message object, - height of arrow + 3 
                htmlString += "<path d='M" + 12 + "," + bottomPos + "L" + 12 + "," + topPos + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
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

/* 	SetItemsVisibleInStage()
	- Set what simulator items should be visible, based on current stage.	
*/
function SetItemsVisibleInStage() {
    // TODO: why set them invisible when you can just not render them?

    let i = 0;
    for (i = 0; i < simulatorObjects.length; i++) {
        // console.log("SetItemsVisibleInStage(), i = " + i
        // 	+ " simulatorObjects.name = " + simulatorObjects[i].name
        // 	+ " objectRef = " + simulatorObjects[i].objectRef
        // 	+ " objectRef.style = " + simulatorObjects[i].objectRef.style);
        if (simulatorObjects[i].stage == stage) {
            simulatorObjects[i].objectRef.style.y = 'visible';
        } else {
            simulatorObjects[i].objectRef.style.visibility = 'hidden';
        }
    }

}

/*	CreateNewSimulatorOnCanvas()
	- Add new simulator object on canvas in main screen.
*/
function CreateNewSimulatorOnCanvas(name) {
    console.log("User wants to add a simulator to the canvas");

    var panel = document.getElementById("canvassubpanel1");
    //!!!!
    //var addContentType = document.createElement("button");
    var addContentType = document.createElement("div");
    addContentType.className = "ui green button div-canvas-sim";
    addContentType.setAttribute("name", "");
    var addContent1 = document.createTextNode(name);
    addContentType.appendChild(addContent1);
    // addContentType.style = "position: relative; overflow-y:hidden;";
    panel.appendChild(addContentType);

    var listOfCurrentItems = document.getElementsByClassName("div-canvas-sim");
    // add offset... for some reason, default would add object below original position of existing objects.
    //!!!!
    var newOffsetY = (listOfCurrentItems.length - 1) * 100;
    var newOffsetX = 0;//(listOfCurrentItems.length - 1) * 100;
    simulatorObjects.push({
        name: name,
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

    simulators.get(name).objects.add(simulatorObjects[-1])
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
    addContentType.className = "ui green button div-canvas-sim";
    addContentType.setAttribute("name", "");
    var addContent1 = document.createTextNode(simulatorObjects[i].name);
    addContentType.appendChild(addContent1);
    // addContentType.style = "position: relative; overflow-y:hidden;";
    panel.appendChild(addContentType);
    setTranslate(newOffsetX, newOffsetY, addContentType);
    simulatorObjects[i].objectRef = addContentType;
}

/*	CreateNewMessageOnCanvas()
	- Create new message object on canvas in main screen.
*/
function CreateNewMessageOnCanvas(btn_id) {
    console.log("User wants to add a message to the canvas");

    var panel = document.getElementById("canvassubpanel2grid");
    var listOfCurrentItems = document.getElementsByClassName("div-canvas-message");
    var addContentType = document.createElement("div");
    addContentType.className = "ui blue button div-canvas-message";
    addContentType.setAttribute("name", listOfMessages[btn_id].name);
    var addContent1 = document.createTextNode(listOfMessages[btn_id].name);
    addContentType.appendChild(addContent1);
    addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" + (10 + (42 * listOfCurrentItems.length)) + "px;";
    $('.div-canvas-server').height(Math.max(160, 34 + (42 * listOfCurrentItems.length)))
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
    addContentType.className = "ui blue button div-canvas-message";
    addContentType.setAttribute("name", messageObjects[message_id].name);
    var addContent1 = document.createTextNode(messageObjects[message_id].name);
    addContentType.appendChild(addContent1);
    addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:"
        + (10 + (42 * listOfCurrentItems.length)) + "px;";
    $('.div-canvas-server').height(Math.max(160, 34 + (42 * listOfCurrentItems.length)))
    panel.appendChild(addContentType);
    messageObjects[i].objectRef = addContentType;
}