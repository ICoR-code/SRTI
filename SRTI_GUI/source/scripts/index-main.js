// variable declarations, import/export and other important main functionalities

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
var serverPath = __dirname + '\\..\\..\\extraResources\\srti_server\\';
var serverFileName = 'SRTI_v2_22_02.jar';
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
var simulatorFunctions = new Map();

var configureItemType = 0;	//0 = sim from list, 1 = message from list, 2 = sim from canvas, 3 = message from canvas, 4 = RTI Server
var configureItemId = 0;	// reference to item being configured.


// Reference to "File Input" box, to get where Wrapper file path is for a new Simulator.
var wrapperFileFolder = document.getElementsByName("wrapperFileDir")[0];
var wrapperFileFolderText = document.getElementsByName("wrapperFileDirText")[0];

// Reference to "File Input" box, to get where to save current project.
var saveAsFolder = document.getElementsByName("saveAsFileDir")[0];
var saveAsFolderText = document.getElementsByName("saveAsFileDirText")[0];

// Reference to "File Input" box, to import existing objects (Simulator or Message).
var importType = 0;
var importFilePath = "";
var importObjectFolder = document.getElementsByName("importSimMessageDir")[0];
var importObjectText = document.getElementsByName("importSimMessageText")[0];

var newServerFile = document.getElementsByName("NewServer")[0];


// counting simulators and objects
var nSimulators = 0
var nMessages = 0

// simulation stages
var simStage = 0

var editExistingObject = -1;
var editExistingObject2 = -1;

var selectMessageId;
var selectSimId;

var stageConditionV1 = "";
var stageConditionV2 = "";
var stageConditionV3a = "";
var stageConditionV3b = "";
var stageConditionV3 = "";
var stageConditionSubSet = [];
var stageConditionSet = [];

var child_process;
var execServer;
//var execServer2;
var serverActive = false;


var hasStartedRunningSystem = false;
var guiFirstClient;
var guiDedicatedClient;

var receivedMessageBuffer = [];
var receivedMessageBufferLength = 6;
var execSims;


function ImportProject() {
	var openProjectFolder = document.getElementsByName("openProjectFileDir")[0];
	var files = openProjectFolder.files;
	var filename = files[0].path.replace(/^.*[\\\/]/, '');
	filename = filename.replace(".project", '');
	var path = files[0].path.replace(filename + ".project", '');

	CloseOpenProject();
	OpenExistingProject(path, filename);
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
	serverPath = __dirname + '\\..\\extraResources\\srti_server\\';
	serverFileName = 'SRTI_v2_22_02.jar';
	hostName = "localhost";
	portNumber = "42012";
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
			fs.writeFileSync(savepath + listOfSimulators[i].name + "_def.simdef", JSON.stringify(simdef, MapToList, 4), 'utf-8');
		}
		for (i = 0; i < listOfMessages.length; i++) {
			var mesdef = {
				mesdef: listOfMessages[i]
			};
			fs.writeFileSync(savepath + listOfMessages[i].name + "_def.mesdef", JSON.stringify(mesdef, MapToList, 4), 'utf-8');
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
		numOfStages: numOfStages,
		serverPath: serverPath,
		serverFileName: serverFileName,
		hostName: hostName,
		portNumber: portNumber
	};
	content = JSON.stringify(obj, MapToList, 4);
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
	listOfSimulators = ConvertSimulators(obj.listOfSimulators);
	listOfMessages = obj.listOfMessages;
	simulatorObjects = obj.simulatorObjects;
	messageObjects = obj.messageObjects;
	numOfStages = obj.numOfStages;
	serverPath = obj.serverPath;
	serverFileName = obj.serverFileName;
	hostName = obj.hostName;
	portNumber = obj.portNumber;
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
	WriteServerConfigFile();

	var d = new Date();
	var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
	textConsoleLastAction.innerHTML = "Configuration files (Wrapper, Server) exported! " + d.getTime();
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
					if (simulatorObjects[j].initialize != "" && simulatorObjects[j].initialize != '""'
						&& simulatorObjects[j].initialize != "''") {
						initializeChannels.push(
							{
								functionName: simulatorObjects[j].initialize,
								stage: parseInt(simulatorObjects[j].stage)
							});
					}
					if (simulatorObjects[j].simulate != "" && simulatorObjects[j].simulate != '""'
						&& simulatorObjects[j].simulate != "''") {
						simulateChannels.push(
							{
								functionName: simulatorObjects[j].simulate,
								timestepDelta: parseInt(simulatorObjects[j].simulateTimeDelta),
								stage: parseInt(simulatorObjects[j].stage)
							});
					}
					errorLocation = 2;
					console.log("preparing for sim " + j + ", has name " + simulatorObjects[j].name);
					let k = 0;
					for (k = 0; k < simulatorObjects[j].subscribedMessages.length; k++) {
						var varChannel = [];
						let m = 0;
						for (m = 0; m < simulatorObjects[j].subscribedDetails[k].length; m++) {
							errorLocation = simulatorObjects[j].name + " s " + simulatorObjects[j].subscribedMessages[k] + " " + simulatorObjects[j].subscribedDetails[k][m][0] + " " + simulatorObjects[j].subscribedDetails[k][m][1];
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
							errorLocation = simulatorObjects[j].name + " p " + simulatorObjects[j].publishedMessages[k] + " " + simulatorObjects[j].publishedDetails[k][m][0] + " " + simulatorObjects[j].publishedDetails[k][m][1];
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
			content = JSON.stringify(obj, MapToList, 4);
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
		fsContent += "java -jar SRTI_v2_22_02.jar\n";
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

function WriteServerConfigFile() {
	//!!!!
	var content = "Hello world! \na simple test.";
	// 'fs' is for filesystem, comes with Electron (or, as included within it, Node.js)
	var fs = require('fs');
	try {
		content = fs.readFileSync(serverPath + "settings.txt", 'utf-8');
	} catch (e) {
		alert('failed to open project file!');
		return;
	}

	contentJSON = JSON.parse(content);
	contentJSON.portNumber = parseInt(portNumber);
	content = JSON.stringify(contentJSON, MapToList, 4);

	fs.writeFileSync(serverPath + "settings.txt", content, "utf-8");
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
		listOfSimulators: JSON.stringify(listOfSimulators, MapToList),
		listOfMessages: JSON.stringify(listOfMessages, MapToList),
		simulatorObjects: JSON.stringify(simulatorObjects, MapToList),
		messageObjects: JSON.stringify(messageObjects, MapToList),
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
			listOfSimulators: JSON.stringify(listOfSimulators, MapToList),
			listOfMessages: JSON.stringify(listOfMessages, MapToList),
			simulatorObjects: JSON.stringify(simulatorObjects, MapToList),
			messageObjects: JSON.stringify(messageObjects, MapToList),
			numOfStages: numOfStages
		});
		ClearProject();
		listOfSimulators = ConvertSimulators(JSON.parse(obj.listOfSimulators, MapToList));
		listOfMessages = JSON.parse(obj.listOfMessages, MapToList);
		simulatorObjects = JSON.parse(obj.simulatorObjects, MapToList);
		messageObjects = JSON.parse(obj.messageObjects, MapToList);
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
			listOfSimulators: JSON.stringify(listOfSimulators, MapToList),
			listOfMessages: JSON.stringify(listOfMessages, MapToList),
			simulatorObjects: JSON.stringify(simulatorObjects, MapToList),
			messageObjects: JSON.stringify(messageObjects, MapToList),
			numOfStages: numOfStages
		});
		ClearProject();
		listOfSimulators = ConvertSimulators(JSON.parse(obj.listOfSimulators));
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
	// TODO: eliminate this parsing 
	var rtiMessage = "{\"mesdef\":{\"name\":\"RTI_\","
		+ "\"variables\":[{\"name\":\"vTimestep\",\"valueType\":\"integer\"},"
		+ "{\"name\":\"stage\",\"valueType\":\"integer\"},"
		+ " {\"name\":\"stageVTimestepMul\",\"valueType\":\"integer\"},"
		+ "{\"name\":\"stageVTimestep\",\"valueType\":\"integer\"}]}}";
	var obj = JSON.parse(rtiMessage);
	listOfMessages.push(obj.mesdef);
	ResetObjectSubPanel2();
}

function NewFunction(name) {
	return { 'name': name }
}

function ConvertSimulators(oldSimulators) {
	for (let simulator of oldSimulators) {
		if (Array.isArray(simulator['functions'])) {
			let simulatorFunctions = new Map()
			for (let fn of simulator['functions']) {
				simulatorFunctions.set(fn['name'], fn)
			}
			simulator['functions'] = simulatorFunctions
		}
	}

	return oldSimulators
}


function MapToList(key, value) {
	const originalObject = this[key];
	if (originalObject instanceof Map) {
		return Array.from(originalObject.values())
	} else {
		return value;
	}
}