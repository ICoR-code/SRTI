// variable declarations, import/export and other important main functionalities

// Reference to main canvas panel on page.
var canvasContainer = document.querySelector("#canvas-panel");
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
var simulators = new Map();
var messages = new Map();
// references to objects on canvas, plus their sub-components 
//		(custom versions that can't generally be specified in 'simulators' or 'messages').
var simulatorObjects = new Set()
var messageObjects = new Map()

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
var serverPath = __dirname + '\\..\\extraResources\\srti_server\\';
var serverFileName = 'SRTI_v2_22_02.jar';
// Total number of stages (different states in simulation system) in this project.
var numOfStages = 1;
// Current stage in canvas view (1st is at index 0).
var stage = 0;
// Current state of selection. References the buttons in the top-left corner: 
//		"Select," "Configure," "Connect," and "Delete".
var selectState = 0;

// Sub-objects for Message / Simulator (used interchangeably) definitions: 
//		'objects' = variables, 'functions' = functions in simulator.
//		Referenced here for when in popup for new Message / Simulator, and defining 
var variables = new Map();
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

var editExistingObject = null;
var editExistingObject2 = null;

var selectMessageId;
var selectSimId;

var stageConditionV1 = "";
var stageConditionV2 = "";
var stageConditionV3a = "";
var stageConditionV3b = "";
var stageConditionV3 = "";
var stageConditionSubSet = new Set();
var stageConditionSet = new Set(); // TODO: never used?

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

	for (let simObj of simulatorObjects) {
		simObj.objectRef.parentNode.removeChild(simObj.objectRef)
	}

	for (let [name, msgObj] of messageObjects) {
		console.log(msgObj)
		msgObj.objectRef.parentNode.removeChild(msgObj.objectRef)
	}

	ResetArrowOnCanvas()

	simulators = new Map();
	messages = new Map();
	simulatorObjects = new Set();
	messageObjects = new Map();
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
		for (let [name, simulator] of simulators) {
			var simdef = {
				simdef: simulator
			};
			fs.writeFileSync(savepath + name + "_def.simdef", JSON.stringify(simdef, StringifyHelper, 4), 'utf-8');
		}
		for (let [name, message] of messages) {
			var mesdef = {
				mesdef: message
			};
			fs.writeFileSync(savepath + name + "_def.mesdef", JSON.stringify(mesdef, StringifyHelper, 4), 'utf-8');
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
	//TODO: not outputting server info
	var obj = {
		simulators: simulators,
		messages: messages,
		simulatorObjects: simulatorObjects,
		messageObjects: messageObjects,
		numOfStages: numOfStages,
		serverPath: serverPath,
		serverFileName: serverFileName,
		hostName: hostName,
		portNumber: portNumber
	};
	content = JSON.stringify(obj, StringifyHelper, 4);
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
	console.log("Print out folders.");
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
	console.log("Resetting canvas with new project.");
	ClearProject();

	var obj = JSON.parse(projectText);
	console.log(obj)
	simulators = ConvertSimulators(typeof obj.simulators !== 'undefined' ? obj.simulators : obj.listOfSimulators);
	messages = ConvertMessages(typeof obj.messages !== 'undefined' ? obj.messages : obj.listOfMessages);
	simulatorObjects = ConvertSimulatorObjects(obj.simulatorObjects);
	messageObjects = ConvertMessageObjects(obj.messageObjects);
	LinkReferences(simulators, messages, simulatorObjects, messageObjects)
	numOfStages = obj.numOfStages;
	serverPath = obj.serverPath ? obj.serverPath : serverPath;
	serverFileName = obj.serverFileName ? obj.serverFileName : serverFileName;
	hostName = obj.hostName ? obj.hostName : hostName;
	portNumber = obj.portNumber ? obj.portNumber : portNumber;
	for (let simObj of simulatorObjects) {
		CreateExistingSimulatorOnCanvas(simObj);
	}
	for (let [name, msgObj] of messageObjects) {
		CreateExistingMessageOnCanvas(msgObj);
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
	WriteSSHConfigFiles();

	var d = new Date();
	var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
	textConsoleLastAction.innerHTML = "Configuration files (Wrapper, Server) exported! " + d.getTime();
}

function WriteWrapperConfigFiles() {
	// for each simulator, create SimName_Config.json, and a JSON object that makes up the content of that file.
	let i = 0;
	var errorLocation = 0;
	try {
		for (let [name, simulator] of simulators) {
			//errorLocation = 0;
			var savePathLocal = simulator.filePath + "\\";
			var saveNameLocal = name + "_config";
			var content = "";
			var stageChannels = [];
			var initializeChannels = [];
			var simulateChannels = [];
			var subscribedChannels = [];
			var publishedChannels = [];
			var endConditions = [];
			var stageConditions = [];

			//errorLocation = 1;
			//TODO: this part is really confusing

			let j = 0;
			for (let simObj of simulator.objects) {
				errorLocation = 0;

				errorLocation = 1;
				stageChannels.push(
					{
						stage: parseInt(simObj.stage),
						order: parseInt(simObj.order),
						timestepDelta: parseInt(simObj.timeDelta),
						timestepMul: parseInt(simObj.timeScale),
						timestepVarDelta: simObj.timeVarDelta
					});
				if (simObj.initialize != "" && simObj.initialize != '""' && simObj.initialize != "''") {
					initializeChannels.push(
						{
							functionName: simObj.initialize,
							stage: parseInt(simObj.stage)
						});
				}
				if (simObj.simulate != "" && simObj.simulate != '""' && simObj.simulate != "''") {
					simulateChannels.push(
						{
							functionName: simObj.simulate,
							timestepDelta: parseInt(simObj.simulateTimeDelta),
							stage: parseInt(simObj.stage)
						});
				}
				errorLocation = 2;
				console.log("preparing for sim " + j + ", has name " + simObj.name);
				let k = 0;
				for (let [name, sub] of simObj.subscribedMessages) {
					let varChannel = [];
					for (let [varName, detail] of sub.details) {
						errorLocation = simObj.name + " s " + sub + " " + varName + " " + detail.value;
						var varNameIndex = varName;
						var varNameIndex2 = detail.value;
						if (varNameIndex && varNameIndex2) {
							varChannel.push(
								{
									valueName: detail.value,//messages[simObj.subscribedMessages[k]].variables[simObj.subscribedDetails[k][m][1]].name,
									varName: varName
								});
						}
					}
					subscribedChannels.push(
						{
							messageName: name,//messages[simObj.subscribedMessages[k]].name,
							oneTime: sub.initial == "true",
							mandatory: true,
							relativeOrder: parseInt(sub.relative),
							maxTimestep: parseInt(sub.timestep),
							timestepDelta: parseInt(sub.timeDelta),
							stage: parseInt(simObj.stage),
							varChannel: varChannel
						});
				}
				errorLocation = 3;
				for (let [name, pub] of simObj.publishedMessages) {
					let varChannel = [];
					for (let [varName, detail] of pub.details) {
						errorLocation = simObj.name + " p " + pub + " " + varName + " " + detail.value;
						let varNameIndex = varName;
						let varNameIndex2 = detail.value;
						if (varNameIndex && varNameIndex2) {
							varChannel.push(
								{
									valueName: varName,//messages[simObj.publishedMessages[k]].variables[simObj.publishedDetails[k][m][0]].name,
									varName: detail.value
								});
						}
					}
					publishedChannels.push(
						{
							messageName: name,//messages[simObj.publishedMessages[k]].name,
							initial: pub.initial == "true",
							timestepDelta: parseInt(pub.timeDelta),//timestepDelta: parseInt(pub.timeDelta[k]),
							stage: parseInt(simObj.stage),
							varChannel: varChannel
						});
				}
				errorLocation = 4;

			}
			errorLocation = 100;
			for (let endConditionEntry of simulator.endConditions) {
				var newCondition = [];
				for (let endSubConditionEntry of endConditionEntry.conditions){
					var tempValue = endSubConditionEntry.value;
					if (isNaN(tempValue) == false){
						tempValue = parseFloat(tempValue);
					}
					newCondition.push(
						{
							varName: endSubConditionEntry.varName,
							condition: endSubConditionEntry.condition,
							value: tempValue,
							varName2: endSubConditionEntry.varName2
						});
				}
				endConditions.push(newCondition);
			}
			errorLocation = 110;
			for (let stageConditionEntry of simulator.stageConditions) {
				var newCondition = [];
				for (let stageSubConditionEntry of stageConditionEntry.conditions){
					var tempValue = stageSubConditionEntry.value;
					if (isNaN(tempValue) == false){
						tempValue = parseFloat(tempValue);
					}
					newCondition.push(
						{
							oldStage: parseInt(stageConditionEntry.oldStage),
							newStage: parseInt(stageConditionEntry.newStage),
							varName: stageSubConditionEntry.varName,
							condition: stageSubConditionEntry.condition,
							value: tempValue,
							varName2: stageSubConditionEntry.varName2
						});
				}
				stageConditions.push(newCondition);
			}
			errorLocation = 120;

			//errorLocation = 2;
			var obj = {
				hostName: hostName,
				portNumber: portNumber,
				simulatorName: name,
				simulatorRef: simulator.refName,
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
			content = JSON.stringify(obj, StringifyHelper, 4);
			try {
				var fs = require('fs');
				fs.writeFileSync(savePathLocal + saveNameLocal + ".json", content, 'utf-8');
				fs.writeFileSync(savePathLocal + "Global.json", "{}", 'utf-8');
				fs.writeFileSync(savePathLocal + "Settings.json", "{\"global\": \"Global.json\", \"configuration\": \"" + saveNameLocal + ".json\"}", 'utf-8');

			} catch (e) {
				alert('failed to save export file for ' + name + ' ... error = ' + e);
			}
		}
	} catch (e) {
		alert('failed to export config files... i = ' + i + ' errorLocation = ' + errorLocation + ' error = ' + e);
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
		for (let [name, simulator] of simulators) {
			fsContent += "cd " + simulator.filePath + "\n";
			fsContent += "" + simulator.executeCommand + "\n";
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
		alert('failed to export settings.txt to server path!  ' + serverPath);
		return;
	}

	let contentJSON = JSON.parse(content);
	contentJSON.portNumber = parseInt(portNumber);
	content = JSON.stringify(contentJSON, StringifyHelper, 4);

	fs.writeFileSync(serverPath + "settings.txt", content, "utf-8");
}

function WriteSSHConfigFiles(){
	try {
		for (let [name, simulator] of simulators) {
			if (simulator.sshType == "local"){
				continue;
			}

			var savePathLocal = simulator.filePath + "\\";
			var saveNameLocal = name + "_sshsim";
			var content = "";
			var sshHost = simulator.sshHost;
			var sshUser = simulator.sshUsername;
			var sshPassword = simulator.sshPassword;
			var sshWrapperConfigFileName = name + "_config.json";
			var sshRemoteWrapperDir = simulator.sshRemoteDir;
			var sshRemoteSimExec = simulator.executeCommand;
			var sshPort = simulator.sshPort;
			
			var obj = {
				host: sshHost,
				user: sshUser,
				password: sshPassword,
				wrapperConfigFileName: sshWrapperConfigFileName,
				localWrapperDir: savePathLocal,
				remoteWrapperDir: sshRemoteWrapperDir,
				remoteSimExec: sshRemoteSimExec,
				port: sshPort
			};

			content = JSON.stringify(obj, StringifyHelper, 4);
			try {
				var fs = require('fs');
				fs.writeFileSync(savePathLocal + saveNameLocal + ".json", content, 'utf-8');
			} catch (e) {
				alert('failed to save export file for ' + name + ' ... error = ' + e);
			}
		}
	} catch (e) {
		alert('failed to export config files... i = ' + i + ' errorLocation = ' + errorLocation + ' error = ' + e);
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
		simulators: JSON.stringify(simulators, StringifyHelper),
		messages: JSON.stringify(messages, StringifyHelper),
		simulatorObjects: JSON.stringify(simulatorObjects, StringifyHelper),
		messageObjects: JSON.stringify(messageObjects, StringifyHelper),
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
			simulators: JSON.stringify(simulators, StringifyHelper),
			messages: JSON.stringify(messages, StringifyHelper),
			simulatorObjects: JSON.stringify(simulatorObjects, StringifyHelper),
			messageObjects: JSON.stringify(messageObjects, StringifyHelper),
			numOfStages: numOfStages
		});
		ClearProject();
		simulators = ConvertSimulators(JSON.parse(obj.simulators, StringifyHelper));
		messages = ConvertMessages(JSON.parse(obj.messages, StringifyHelper));
		simulatorObjects = ConvertSimulatorObjects(JSON.parse(obj.simulatorObjects, StringifyHelper));
		messageObjects = ConvertMessageObjects(JSON.parse(obj.messageObjects, StringifyHelper));
		LinkReferences(simulators, messages, simulatorObjects, messageObjects)
		numOfStages = obj.numOfStages;
		for (let simObj of simulatorObjects) {
			CreateExistingSimulatorOnCanvas(simObj);
		}
		for (let [name, msgObj] of messageObjects) {
			CreateExistingMessageOnCanvas(msgObj);
		}
		UpdateCanvasGrid();
		DrawAllArrowsOnCanvas();
		ResetObjectSubPanel1();
		ResetObjectSubPanel2();
		UpdateSelectedStage(0);
		let textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "UNDO: " + obj.description + " (" + undoStack.length + " actions left)";
	}
}

function Redo() {
	// add 1 to Undo stack, remove 1 from Redo stack
	// occurs when clicking "Edit - > Redo"
	if (redoStack.length == 0) {
		let textConsoleLastAction = document.getElementById("TextConsoleLastAction");
		textConsoleLastAction.innerHTML = "(REDO FAILED: no more redo actions to do!)";
	} else {
		var obj = redoStack[redoStack.length - 1];
		redoStack.splice(redoStack.length - 1, 1);
		undoStack.push({
			description: obj.description,
			simulators: JSON.stringify(simulators, StringifyHelper),
			messages: JSON.stringify(messages, StringifyHelper),
			simulatorObjects: JSON.stringify(simulatorObjects, StringifyHelper),
			messageObjects: JSON.stringify(messageObjects, StringifyHelper),
			numOfStages: numOfStages
		});
		ClearProject();
		simulators = ConvertSimulators(JSON.parse(obj.simulators));
		messages = ConvertMessages(JSON.parse(obj.messages));
		simulatorObjects = ConvertSimulatorObjects(JSON.parse(obj.simulatorObjects));
		messageObjects = ConvertMessageObjects(JSON.parse(obj.messageObjects));
		LinkReferences(simulators, messages, simulatorObjects, messageObjects)
		numOfStages = obj.numOfStages;
		for (let simObj of simulatorObjects) {
			CreateExistingSimulatorOnCanvas(simObj);
		}
		for (let [name, msgObj] of messageObjects) {
			CreateExistingMessageOnCanvas(msgObj);
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
	let variables = new Map()
	variables.set('vTimestep', NewVariable('vTimestep', 'integer'))
	variables.set('stage', NewVariable('stage', 'integer'))
	variables.set('stageVTimestepMul', NewVariable('stageVTimestepMul', 'integer'))
	variables.set('stageVTimestep', NewVariable('stageVTimestep', 'integer'))
	messages.set("RTI_", NewMessage("RTI_", variables));
	ResetObjectSubPanel2();
}

function NewFunction(name) {
	return { 'name': name }
}

function NewVariable(name, type) {
	return { 'name': name, 'valueType': type }
}

function NewSimulator(newSimName, newRefName, newFilePath, newExecute,
	simulatorFunctions, variables) {
	return {
		name: newSimName,
		refName: newRefName,
		filePath: newFilePath, executeCommand: newExecute,
		functions: simulatorFunctions, 'variables': variables,
		objects: new Set(),
		stageConditions: new Set(),
		endConditions: new Set(),
		sshType: "local",
		sshHost: null,
		sshUsername: null,
		sshPassword: null,
		sshPort: 22,
		sshRemoteDir: null,
		sshRemoteExecuteCommand: null,
		sshLocalSSHInputFile: null,
		sshLocalExecuteApp: null,
		sshLocalExecuteCommand: null
	}
}

function NewSimulatorObject(name, stage, addContentType, newOffsetX, newOffsetY) {
	return {
		name: name,
		stage: parseInt(stage), objectRef: addContentType, order: 0,
		offsetX: newOffsetX, offsetY: newOffsetY, leftPos: 0, topPos: 0,
		subscribedMessages: new Map(), publishedMessages: new Map(),

		timeDelta: 1, timeVarDelta: "", timeScale: 1,
		initialize: "''", simulate: "''", simulateTimeDelta: 1,
	}
}

function NewMessage(name, variables) {
	return {
		name: name, variables: variables
	}
}

function NewMessageObject(name, position, objectRef) {
	return {
		name: name, position: position, objectRef: objectRef
	}
}

function NewSubscribe(name, initial, timeDelta, relative, timestep, details) {
	return {
		name: name, initial: initial,
		timeDelta: timeDelta, relative: relative,
		timestep: timestep, details: details
	}
}

function NewPublish(name, initial, timeDelta, details) {
	return {
		name: name, initial: initial,
		timeDelta: timeDelta, details: details
	}
}

function NewStageConditions(oldStage, newStage, conditions) {
	return {
		oldStage: oldStage,
		newStage: newStage,
		conditions: conditions
	}
}

function NewEndConditions(conditions) {
	return {
		conditions: conditions
	}
}

function NewCondition(varName, condition, value, varName2) {
	return {
		varName: varName,
		condition: condition,
		value: value,
		varName2: varName2
	}
}

function ConvertSimulator(simulator) {
	if (Array.isArray(simulator.functions)) {
		let simulatorFunctions = new Map()
		for (let fn of simulator.functions) {
			simulatorFunctions.set(fn.name, fn)
		}
		simulator.functions = simulatorFunctions
	}

	if (Array.isArray(simulator.variables)) {
		let variables = new Map()
		for (let variable of simulator.variables) {
			variables.set(variable.name, variable)
		}
		simulator.variables = variables
	}

	simulator.objects = new Set()
}

function ConvertSimulators(oldSimulators) {
	let newSimulators = new Map()
	for (let simulator of oldSimulators) {
		ConvertSimulator(simulator)
		newSimulators.set(simulator.name, simulator)

	}

	return newSimulators
}

function ConvertMessage(message) {
	if (Array.isArray(message.variables)) {
		let variables = new Map()
		for (let variable of message.variables) {
			variables.set(variable.name, variable)
		}
		message.variables = variables
	}
}

function ConvertMessages(oldMessages) {
	let newMessages = new Map()
	for (let message of oldMessages) {
		ConvertMessage(message)
		newMessages.set(message.name, message)
	}

	return newMessages
}

function ConvertSimulatorObjects(oldSimulatorObjects) {
	for (let simObj of oldSimulatorObjects) {
		delete simObj.original
	}
	return new Set(oldSimulatorObjects)
}

function ConvertMessageObjects(oldMessageObjects) {
	let newMessageObjects = new Map()
	for (let msgObj of oldMessageObjects) {
		delete msgObj.original

		newMessageObjects.set(msgObj.name, msgObj)
	}

	return newMessageObjects
}

function LinkReferences(simulators, messages, simulatorObjects, messageObjects) {
	for (let simObj of simulatorObjects) {
		simulators.get(simObj.name).objects.add(simObj)
	}

	// stageConditions, endConditions
	// TODO: ignore stage conditions when exporting a single simulator
	for (let [name, simulator] of simulators) {
		if ('stageConditions' in simulator) {
			for (let conditions of simulator.stageConditions) {
				conditions.conditions = new Set(conditions.conditions)
			}

			simulator.stageConditions = new Set(simulator.stageConditions)
		} else {
			simulator.stageConditions = new Set()
		}

		//aggregate sim objects
		for (let simObj of simulator.objects) {
			if ('stageConditions' in simObj) {
				for (let conditions of simObj.stageConditions) {
					conditions.conditions = new Set(conditions.conditions)
					simulator.stageConditions.add(conditions)
				}
			}


			delete simObj.stageConditions
		}

		if ('endConditions' in simulator) {
			for (let conditions of simulator.endConditions) {
				conditions.conditions = new Set(conditions.conditions)
			}

			simulator.endConditions = new Set(simulator.endConditions)
		} else {
			simulator.endConditions = new Set()
		}

		//aggregate sim objects
		for (let simObj of simulator.objects) {
			if ('endConditions' in simObj) {
				for (let conditions of simObj.endConditions) {
					conditions.conditions = new Set(conditions.conditions)

					delete conditions.oldStage
					simulator.endConditions.add(conditions)
				}
			}

			delete simObj.endConditions
		}

	}

	// subscribe and publish
	let arrMessages = Array.from(messages.values()), message
	for (let simObj of simulatorObjects) {
		if ('subscribedDetails' in simObj) {
			let subscribedMessages = new Map(), subMessage, messageVars
			for (let i = 0; i < simObj.subscribedMessages.length; i++) {
				message = arrMessages[simObj.subscribedMessages[i] + 1]
				messageVars = Array.from(message.variables.values())
				subMessage = NewSubscribe(
					message.name, simObj.subscribedInitial[i],
					simObj.subscribedTimeDelta[i], simObj.subscribedRelative[i],
					simObj.subscribedTimestep[i], null
				)

				subMessage.details = new Map()
				let j = 0, otherVar
				for (let [name, variable] of simulators.get(simObj.name).variables) {
					otherVar = simObj.subscribedDetails[i][j][1]
					if (otherVar === -1) {
						otherVar = null
					} else {
						otherVar = messageVars[otherVar].name
					}
					subMessage.details.set(name, { name: name, value: otherVar })
					j += 1
				}

				subscribedMessages.set(message.name, subMessage)
			}

			simObj.subscribedMessages = subscribedMessages
			delete simObj.subscribedDetails
			delete simObj.subscribedTimestep
			delete simObj.subscribedInitial
			delete simObj.subscribedTimeDelta
			delete simObj.subscribedRelative

		} else {
			let subscribedMessages = new Map()
			for (let message of simObj.subscribedMessages) {
				let newDetails = new Map()
				for (let detail of message.details) {
					newDetails.set(detail.name, detail)
				}
				message.details = newDetails
				subscribedMessages.set(message.name, message)
			}

			simObj.subscribedMessages = subscribedMessages
		}

		if ('publishedDetails' in simObj) {
			let publishedMessages = new Map(), pubMessage, simulatorVars
			for (let i = 0; i < simObj.publishedMessages.length; i++) {
				message = arrMessages[simObj.publishedMessages[i] + 1]
				simulatorVars = Array.from(simulators.get(simObj.name).variables.values())
				pubMessage = NewPublish(
					message.name, simObj.publishedInitial[i],
					simObj.publishedTimeDelta[i], null
				)

				pubMessage.details = new Map()
				let j = 0, otherVar
				for (let [name, variable] of message.variables) {
					console.log(simObj.publishedDetails, i, j)
					otherVar = simObj.publishedDetails[i][j][1]
					if (otherVar === -1) {
						otherVar = null
					} else {
						otherVar = simulatorVars[otherVar].name
					}
					pubMessage.details.set(name, { name: name, value: otherVar })
					j += 1
				}

				publishedMessages.set(message.name, pubMessage)
			}

			simObj.publishedMessages = publishedMessages
			delete simObj.publishedDetails
			delete simObj.publishedTimestep
			delete simObj.publishedInitial
			delete simObj.publishedTimeDelta
			delete simObj.publishedRelative

		} else {
			let publishedMessages = new Map()
			for (let message of simObj.publishedMessages) {
				let newDetails = new Map()
				for (let detail of message.details) {
					newDetails.set(detail.name, detail)
				}
				message.details = newDetails
				publishedMessages.set(message.name, message)
			}

			simObj.publishedMessages = publishedMessages
		}
	}
}

function StringifyHelper(key, value) {
	const originalObject = this[key];
	if (key == 'objects' || key == 'objectRef') {
		return undefined
	} else if (originalObject instanceof Map) {
		return Array.from(originalObject.values())
	} else if (originalObject instanceof Set) {
		return Array.from(originalObject.values())
	} else {
		return value
	}
}

function IsNull(value) {
	// value == null		-> Returns false for 'null', or undefined.
	// value === null		-> Explicit check for 'null'
	// (value)				-> Returns false for 'null', empty strings, undefined...
	// if (value){
	// 	return false;
	// } else {
	// 	return true;
	// }

	// The if statement above is totally unnecessary. We want to return the boolean value of "value", and that 
	// can be done simply by returning the value.
	// Remember that when you call this function, there is usually already an outside if.
	return !value
}