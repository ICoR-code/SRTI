// clicking/drawing/removing objects on the canvas

/*	CanvasOnScroll()
	- When horizontal scroll for 'canvas-subpanel1' (where Sims are) occurs,
		match horizontal movement for 'canvas-subpanel2' (where Messages are).
*/
function CanvasOnScroll(div) {
    var canvas1 = document.getElementById("canvas-subpanel2");
    canvas1.scrollLeft = div.scrollLeft;
}

/*	UpdateCanvasGrid()
	- Redraw canvas grid (where Sims are) based on current size of 'gridSizeX' and 'gridSizeY'.
*/
function UpdateCanvasGrid() {
    console.log("UpdateCanvasGrid() called.");
    let panel = $('#canvas-subpanel1-grid')
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
        if (simObj.topPos / 100 + 2 + i > maxSizeY && simObj.stage == stage) {
            maxSizeY = simObj.topPos / 100 + 2 + i;
        }
        if (simObj.leftPos / 100 - 1 + 2 > maxSizeX && simObj.stage == stage) {
            maxSizeX = simObj.leftPos / 100 - 1 + 2;
        }
        //!!!!
        i += 1
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
    var clickedOnItem = null;
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
            clickedOnItem.order = clickedOnItem.offsetY / 100 + i;

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
    var clickedOnItem = null;

    let i = 0;
    for (let simObj of simulatorObjects) {
        if (e.target === simObj.objectRef) {
            clickedOnItem = simObj;
            break;
        }
        i += 1
    }
    if (simulatorObjects.has(clickedOnItem)) {
        clickedOnItem.objectRef.parentNode.removeChild(clickedOnItem.objectRef);
        simulatorObjects.delete(clickedOnItem);
        simulators.get(clickedOnItem.name).objects.delete(clickedOnItem)
        let arr = Array.from(simulatorObjects.values())
        // because all objects are relative, 
        //		deleting one object makes other objects (that were added after i) 
        //		move up one space. Need to reset everyone.
        MoveObjectsOnCanvasUpOne(i, arr);
        UpdateDrawArrowsAfterDelete(clickedOnItem.name, null);
        return;
    }

    clickedOnItem = $(e.target).data('ref')

    if (typeof clickedOnItem !== 'undefined' && 'objectRef' in clickedOnItem && !('variables' in clickedOnItem)) {
        clickedOnItem.objectRef.parentNode.removeChild(clickedOnItem.objectRef)
        messageObjects.delete(clickedOnItem.name)

        ResetMessagesOnCanvas();
        UpdateDrawArrowsAfterDelete(null, clickedOnItem.name);
        $('.div-canvas-server').height(Math.max(160, -8 + 42 * $('.div-canvas-message').length))
        return;
    }
    clickedOnItem = e.target;
    if (clickedOnItem.classList.contains('div-canvas-pub')) {
        clickedOnItem.nameParent.publishedMessages.delete(clickedOnItem.name);
        UpdateDrawArrowsAfterDelete(null, null);
        return;
    }

    if (clickedOnItem.classList.contains('div-canvas-sub')) {
        clickedOnItem.nameParent.subscribedMessages.delete(clickedOnItem.name);
        UpdateDrawArrowsAfterDelete(null, null);
        return;
    }
}


/*	DeleteItemFromCanvasById()
	- Delete simulator from canvas by ID (if we deleted it from list on the left, 
			we need to delete it everywhere else too.)
*/
function DeleteItemFromCanvasById(i, simObj) {
    simObj.objectRef.parentNode.removeChild(simObj.objectRef);
    simulatorObjects.delete(simObj)
    let arr = Array.from(simulatorObjects.values())
    simulators.get(simObj.name).objects.delete(simObj)
    // because all objects are relative, 
    //		deleting one object makes other objects (that were added after i) move up one space. 
    //		Need to reset everyone.
    MoveObjectsOnCanvasUpOne(i, arr);
}

/*	DeleteMessageFromCanvasById()
	- Delete message from canvas by ID (if we deleted it from list on the left,
			we need to delete it everywhere else too.)
*/
function DeleteMessageFromCanvasById(msgObj) {
    msgObj.objectRef.parentNode.removeChild(msgObj.objectRef)
    messageObjects.delete(msgObj.name)

    ResetMessagesOnCanvas();
}

/*	MoveObjectsOnCanvasUpOne()
	- Move simulator objects up 1 in Y position, to make up for middle object being removed.
		(While it doesn't seem like it, the canvas objects are positions relative to each other).
*/
function MoveObjectsOnCanvasUpOne(j, arr) {
    let i = 0;
    for (i = j; i < arr.length; i++) {
        dragItem = arr[i].objectRef;
        //!!!!
        arr[i].offsetY = arr[i].offsetY + 100;
        //arr[i].offsetX = arr[i].offsetX + 100;
        //!!!!
        setTranslate(arr[i].offsetX, arr[i].offsetY, dragItem);
    }
}

/*	ConnectSimAndMessage()
	- Draw arrow from Sim and Message, and set "subscribe/publish" data.
*/
function ConnectSimAndMessage(e) {
    console.log("asked to draw arrow on canvas");
    var clickedOnItem = $(e.target).data('ref');

    if (simulatorObjects.has(clickedOnItem)) {
        if (active == false) {
            // if active == false, then this is the first item clicked. Prepare Sim to Message connection.
            dragItem = clickedOnItem;
            dragItem.objectRef.style.backgroundColor = "#ffaa00";
            active = true;
            console.log("focused object during Connection");
        } else {
            // if active == true, and 'dragItem' is of type 'Message', then draw Message to Sim connection.
            // else, make active = false, undo state.
            // else, if active == true and 'dragItem' is of type' Sim, What to do? Undo previous selection and make new selection, without active = false.
            if (!simulatorObjects.has(dragItem)) {
                // must have originally clicked on Message object. Make connection from Message to Sim.
                //what is the 'id' of the message? find that here:
                NewSubscribeConnectionPrompt(dragItem, clickedOnItem);
                // clickedOnItem.subscribedMessages.set(dragItem.name, {});
                DrawAllArrowsOnCanvas();
                active = false;
                if (dragItem != null) {
                    dragItem.objectRef.style.backgroundColor = "";
                }
                dragItem = clickedOnItem;
                console.log("Connection, sim clicked, set active = false");
                AddToUndoBuffer("Create subscribe connection on canvas.");
            } else {
                dragItem.objectRef.style.backgroundColor = "";
                dragItem = clickedOnItem;
                dragItem.objectRef.style.backgroundColor = "#ffaa00";
                active = true;
                console.log("Connection, sim clicked, set active = true");
            }
        }
        return;
    }

    if (typeof clickedOnItem !== 'undefined' && 'objectRef' in clickedOnItem && !('variables' in clickedOnItem)) {
        if (active == false) {
            // if active == false, then this is the first item clicked. Prepare Sim to Message connection.
            dragItem = clickedOnItem;
            dragItem.objectRef.style.backgroundColor = "#ffaa00";
            active = true;
            console.log("focused message object during Connection");
        } else {
            // if active == true, and 'dragItem' is of type 'Message', then draw Message to Sim connection.
            // else, make active = false, undo state.
            // else, if active == true and 'dragItem' is of type' Sim, What to do? Undo previous selection and make new selection, without active = false.
            if (simulatorObjects.has(dragItem)) {
                NewPublishConnectionPrompt(clickedOnItem, dragItem);
                // must have originally clicked on Simulator object. Make connection from Sim to Message.
                // dragItem.publishedMessages.push(clickedOnItem);
				// ... to keep original functionality, could use the following. But it makes more sense to call function if actually saving the data.
				//let messageName = $('#modalPublishDetailsSegment .ui.blue.label').text();
				//dragItem.publishedMessages.set(messageName, null);
				DrawAllArrowsOnCanvas();
                active = false;
                if (dragItem != null) {
                    dragItem.objectRef.style.backgroundColor = "";
                }
                // TODO: why set dragItem to simulatorObjects
                // dragItem = simulatorObjects[i];
				/* Explaination: 'dragItem' is used to reference the item that should hold 'publishMessage' and 'subscribeMessage' Maps. 
				Previously, we redundently set it to be the simulator (even if it already was).
				Setting it to 'clickedOnItem' (presumed to be messageObject) would cause an error after trying to save 'publishMessage' data.
				*/
                // dragItem = clickedOnItem
				console.log("Connection, message clicked, set active = false");
                AddToUndoBuffer("Create publish connection on canvas.");
            } else {
                dragItem.objectRef.style.backgroundColor = "";
                dragItem = clickedOnItem;
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
    var panel = document.getElementById("canvas-subpanel1-arrows");
    while (panel.firstChild) {
        panel.removeChild(panel.firstChild);
    }
    panel = document.getElementById("canvas-subpanel2-arrows");
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
    var panel = document.getElementById("canvas-subpanel1-arrows");
    let i = 0;
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            console.log("simulatorObject.offsetY = " + simObj.offsetY + " , topPos = " + simObj.topPos);
            for (let j = 0; j < simObj.publishedMessages.size; j++) {
                //!!!!
                let leftPos = parseInt(simObj.leftPos, 10) + j * 5 + 2;
                let topPos = parseInt(simObj.offsetY, 10) + i * 100 + 100 + 2 + 14 * j;
                //var leftPos = parseInt(simObj.offsetX, 10) + (i * 100) + (j * 5) + 2;
                //var topPos = parseInt(simObj.topPos, 10) + 100 + 2 + (14 * j);
                //!!!!
                var htmlString = "<svg width='" + 22 + "' height='" + (gridSizeY * 100) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                htmlString += "<path d='M" + 12 + "," + topPos + "L" + 12 + "," + (gridSizeY * 100) + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
                htmlString += "</svg>";
                panel.insertAdjacentHTML("beforeend", htmlString);
            }
        }
        i += 1
    }

    panel = document.getElementById("canvas-subpanel2-arrows");
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            let j = 0;
            for (let [name, pub] of simObj.publishedMessages) {
                //!!!!
                let leftPos = parseInt(simObj.leftPos, 10) + j * 5 + 2;
                //var leftPos = parseInt(simObj.offsetX, 10) + (i * 100) + (j * 5) + 2;
                //!!!!
                let topPos = 0;
                let bottomPos = messageObjects.get(name).position - 10 + 3;
                let htmlString = "<svg width='" + 22 + "' height='" + (bottomPos + 10) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                // end point of arrow: starting position of Message object, - height of arrow + 3 
                htmlString += "<path d='M" + 12 + "," + topPos + "L" + 12 + "," + bottomPos + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
                htmlString += "</svg>";
                panel.insertAdjacentHTML("beforeend", htmlString);

                j += 1
            }
        }
    }
}

/*	DrawArrowObjectOnCanvas1()
	- Draw small boxes underneath simulators to connect the arrows to.
*/
function DrawArrowObjectOnCanvas1() {
    var panel = document.getElementById("canvas-subpanel1-arrows");

    let i = 0;
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            let j = 0;
            for (let [name, pub] of simObj.publishedMessages) {
                var addContentType = document.createElement("svg");
                //!!!!
                var leftOffset = parseInt(simObj.leftPos, 10) + 1;
                var topOffset = parseInt(simObj.offsetY, 10) + i * 100 + 100 + 2 + 14 * j;
                //var leftOffset = parseInt(simObj.offsetX, 10) + (i * 100) + 1;
                //var topOffset = parseInt(simObj.topPos, 10) + 100 + 2 + (14 * j);
                //!!!!
                addContentType.className = "div-canvas-pub";
                addContentType.name = name;
                addContentType.nameParent = simObj;
                addContentType.setAttribute("name", name);
                addContentType.style = "position: absolute; left: " + leftOffset + "px; top: " + topOffset + "px;";
                panel.appendChild(addContentType);
                j += 1
            }
        }
        i += 1
    }
}

/*	DrawArrowOnCanvas2()
	- Draw arrows on bottom canvas (where messages are) up to the top canvas panel. 
*/
function DrawArrowOnCanvas2() {
    var panel = document.getElementById("canvas-subpanel1-arrows");
    let i = 0;
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            console.log("simulatorObject.offsetY = " + simObj.offsetY + " , topPos = " + simObj.topPos);
            let j = 0;
            for (j = 0; j < simObj.subscribedMessages.size; j++) {
                //!!!!
                let leftPos = parseInt(simObj.leftPos, 10) + 100 - j * 5 - 2;
                let topPos = parseInt(simObj.offsetY, 10) + i * 100 + 100 + 14 * j + 10 + 10;
                //var leftPos = parseInt(simObj.offsetX, 10) + (i * 100) + 100 - (j * 5) - 2;
                //var topPos = parseInt(simObj.topPos, 10) + 100 + (14 * j) + 10 + 10;
                //!!!!
                let htmlString = "<svg width='" + 22 + "' height='" + (gridSizeY * 100) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='13' markerHeight='13' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                htmlString += "<path d='M" + 12 + "," + (gridSizeY * 100) + "L" + 12 + "," + topPos + "' style='stroke:#DB2828; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
                htmlString += "</svg>";
                panel.insertAdjacentHTML("beforeend", htmlString);
            }
        }
        i += 1
    }

    panel = document.getElementById("canvas-subpanel2-arrows");
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            let j = 0;
            for (let [name, sub] of simObj.subscribedMessages) {
                //!!!!
                let leftPos = parseInt(simObj.leftPos, 10) + 100 - j * 5 - 2;
                //var leftPos = parseInt(simObj.offsetX, 10) + (i * 100) + 100 - (j * 5) - 2;
                //!!!!
                let topPos = 0;


                let bottomPos = messageObjects.get(name).position
                let htmlString = "<svg width='" + 22 + "' height='" + (bottomPos + 10) + "' style='position: absolute; left:" + (leftPos - 12) + "px'>";
                htmlString += "<defs>";
                htmlString += "	<marker id='arrow' markerWidth='10' markerHeight='10' refx='2' refy='6' orient='auto'>";
                htmlString += "		<path d='M2,2 L2,11 L10,6 L2,2' style='fill:red;' />";
                htmlString += "	</marker>";
                htmlString += "</defs>";
                // end point of arrow: starting position of Message object, - height of arrow + 3 
                htmlString += "<path d='M" + 12 + "," + bottomPos + "L" + 12 + "," + topPos + "' style='stroke:red; stroke-width: 1.25px; fill: none; marker-end: url(#arrow);'/>"
                htmlString += "</svg>";
                panel.insertAdjacentHTML("beforeend", htmlString);

                j += 1
            }
        }
    }
}

/*	DrawArrowObjectOnCanvas2()
	- 
*/
function DrawArrowObjectOnCanvas2() {
    var panel = document.getElementById("canvas-subpanel1-arrows");
    let i = 0;
    for (let simObj of simulatorObjects) {
        if (simObj.stage == stage) {
            let j = 0;
            for (let [name, sub] of simObj.subscribedMessages) {
                var addContentType = document.createElement("svg");
                //!!!!
                var leftOffset = parseInt(simObj.leftPos, 10) + 100 - 48 - 1;
                var topOffset = parseInt(simObj.offsetY, 10) + i * 100 + 100 + 2 + 14 * j;
                //var leftOffset = parseInt(simObj.offsetX, 10) + (i * 100) + 100 - 48 - 1;
                //var topOffset = parseInt(simObj.topPos, 10) + 100 + 2 + (14 * j);
                //!!!!
                addContentType.className = "div-canvas-sub";
                addContentType.name = name;
                addContentType.nameParent = simObj;
                addContentType.setAttribute("name", name);
                addContentType.style = "position: absolute; left: " + leftOffset + "px; top: " + topOffset + "px;";
                panel.appendChild(addContentType);
                j += 1
            }
        }
        i += 1
    }
}

/*	UpdateDrawArrowsAfterDelete()
	- Redraw arrows after an item was deleted (required repositioning of some items underneath a sim).
*/
function UpdateDrawArrowsAfterDelete(simDelete, messageDelete) {
    // No need to compare a boolean value to true or false. That is exactly what if statements are for.
    if (!IsNull(simDelete)) {
        // don't need to do anything, arrow-data is stored with sim, so if it is deleted, just need to redraw.
    }
    if (!IsNull(messageDelete)) {
        for (let simObj of simulatorObjects) {
            // for (j = simObj.publishedMessages.length - 1; j >= 0; j--) {
            //     if (simObj.publishedMessages[j] == messageDelete) {
            //         simObj.publishedMessages.splice(j, 1);
            //         simObj.publishedDetails.splice(j, 1);
            //         simObj.publishedInitial.splice(j, 1);
            //         simObj.publishedTimeDelta.splice(j, 1);
            //     } else if (simObj.publishedMessages[j] > messageDelete) {
            //         simObj.publishedMessages[j]--;
            //     }
            // }
            simObj.publishedMessages.delete(messageDelete)
            simObj.subscribedMessages.delete(messageDelete)
            // for (j = simObj.subscribedMessages.length - 1; j >= 0; j--) {
            //     if (simObj.subscribedMessages[j] == messageDelete) {
            //         simObj.subscribedMessages.splice(j, 1);
            //         simObj.subscribedDetails.splice(j, 1);
            //         simObj.subscribedInitial.splice(j, 1);
            //         simObj.subscribedTimeDelta.splice(j, 1);
            //         simObj.subscribedRelative.splice(j, 1);
            //         simObj.subscribedTimestep.splice(j, 1);
            //     } else if (simObj.subscribedMessages[j] > messageDelete) {
            //         simObj.subscribedMessages[j]--;
            //     }
            // }
        }
    }
    DrawAllArrowsOnCanvas();
}

/*	ResetMessagesOnCanvas()
	- Reset message object positions, to make up for middle object being removed.
		(While it doesn't seem like it, the canvas objects are positions relative to each other).
*/
function ResetMessagesOnCanvas() {
    let i = 0;
    for (let [name, msgObj] of messageObjects) {
        msgObj.objectRef.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" + (10 + 42 * i) + "px;";
        msgObj.position = 10 + 42 * i

        i += 1
    }
}

/* 	SetItemsVisibleInStage()
	- Set what simulator items should be visible, based on current stage.	
*/
function SetItemsVisibleInStage() {

    for (let simObj of simulatorObjects) {
        // console.log("SetItemsVisibleInStage(), i = " + i
        // 	+ " simulatorObjects.name = " + simObj.name
        // 	+ " objectRef = " + simObj.objectRef
        // 	+ " objectRef.style = " + simObj.objectRef.style);
        if (simObj.stage == stage) {
            simObj.objectRef.style.visibility = 'visible';
        } else {
            simObj.objectRef.style.visibility = 'hidden';
        }
    }

}

/*	CreateNewSimulatorOnCanvas()
	- Add new simulator object on canvas in main screen.
*/
function CreateNewSimulatorOnCanvas(name) {
    console.log("User wants to add a simulator to the canvas");

    var panel = document.getElementById("canvas-subpanel1");
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
    let simObj = NewSimulatorObject(name, stage, addContentType, newOffsetX, -newOffsetY)

    $(addContentType).data('ref', simObj)
    simulatorObjects.add(simObj);

    simulators.get(name).objects.add(simObj)
    setTranslate(0, -newOffsetY, addContentType);
    //setTranslate(-newOffsetX, 0, addContentType);
    //!!!!

    DisableCertainObjectButtons();
}

/*	CreateExistingSimulatorOnCanvas()
	- Edit saved configuration for existing simulator on the canvas in main screen.
*/
function CreateExistingSimulatorOnCanvas(simObj) {
    var panel = document.getElementById("canvas-subpanel1");

    var newOffsetY = simObj.offsetY;
    var newOffsetX = simObj.offsetX;
    var addContentType = document.createElement("div");
    addContentType.className = "ui green button div-canvas-sim";
    addContentType.setAttribute("name", simObj.name);
    var addContent1 = document.createTextNode(simObj.name);
    addContentType.appendChild(addContent1);
    // addContentType.style = "position: relative; overflow-y:hidden;";
    panel.appendChild(addContentType);
    $(addContentType).data('ref', simObj)
    setTranslate(newOffsetX, newOffsetY, addContentType);
    simObj.objectRef = addContentType;
}

/*	CreateNewMessageOnCanvas()
	- Create new message object on canvas in main screen.
*/
function CreateNewMessageOnCanvas(name) {
    console.log("User wants to add a message to the canvas");

    var panel = document.getElementById("canvas-subpanel2-grid");
    var listOfCurrentItems = document.getElementsByClassName("div-canvas-message");
    var addContentType = document.createElement("div");
    addContentType.className = "ui blue button div-canvas-message";
    addContentType.setAttribute("name", name);
    var addContent1 = document.createTextNode(name);
    addContentType.appendChild(addContent1);
    addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" + (10 + 42 * listOfCurrentItems.length) + "px;";
    $('.div-canvas-server').height(Math.max(160, 34 + 42 * listOfCurrentItems.length))


    let msgObj = NewMessageObject(name, 10 + 42 * listOfCurrentItems.length, addContentType)
    panel.appendChild(addContentType);
    $(addContentType).data('ref', msgObj)
    messageObjects.set(name, msgObj)
    DisableCertainObjectButtons();
}

/*	CreateExistingMessageOnCanvas()
	- Modify configuration of message already on canvas in main screen.
*/
function CreateExistingMessageOnCanvas(msgObj) {
    var panel = document.getElementById("canvas-subpanel2-grid");

    var listOfCurrentItems = document.getElementsByClassName("div-canvas-message");
    var addContentType = document.createElement("div");
    addContentType.className = "ui blue button div-canvas-message";
    addContentType.setAttribute("name", msgObj.name);
    var addContent1 = document.createTextNode(msgObj.name);
    addContentType.appendChild(addContent1);
    addContentType.style = "position: absolute; overflow-y:hidden;" + "left:100px; top:" +
        (10 + 42 * listOfCurrentItems.length) + "px;";
    $('.div-canvas-server').height(Math.max(160, 34 + 42 * listOfCurrentItems.length))
    msgObj.position = 10 + 42 * listOfCurrentItems.length
    $(addContentType).data('ref', msgObj)
    panel.appendChild(addContentType);
    msgObj.objectRef = addContentType;
}