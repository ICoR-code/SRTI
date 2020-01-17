// starting/dynamically displaying a simulation

function StartSimulationSystem() {
    console.log("Can we open RTI Server?");
    if (serverActive == false) {
        simStage = 0
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
            //var tempPath = __dirname + '\\..\\extraResources\\srti_server\\';
            //tempPath = __dirname + "\\extraResources\\srti_server\\";
            //alert(tempPath.substring(tempPath.length-64,tempPath.length-1));
            execServer = child_process.exec('cd /d ' + serverPath + ' && java -jar ' + serverFileName,
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

        // reset message buffer
        receivedMessageBuffer = [];
        let i = 0;
        for (i = 0; i < receivedMessageBufferLength; i++) {
            receivedMessageBuffer.push({ name: "N/A", message: "N/A" });
        }

        UpdateInspectorPanelMessageObjects(-1, -1)
    }
}

function PlaySimulationSystem() {
    // send message to "Start" system to Server.

    if (hasStartedRunningSystem == false) {
        hasStartedRunningSystem = true;
        let outputString = "{\"name\":\"RTI_StartSim\",\"content\":\"{}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
        document.getElementById("btn-play").disabled = true;
        document.getElementById("btn-pause").disabled = false;
        guiDedicatedClient.write(outputString);
    } else {
        let outputString = "{\"name\":\"RTI_ResumeSystem\",\"content\":\"{}\",\"timestamp\":\"1234567890123\",\"vTimestamp\":0,\"source\":\"RTI-v2-GUI\",\"tcp\":\"false\"}\n";
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
            let kill = require('tree-kill');
            kill(execServer.pid);
        } catch (e) {
            alert('Error when trying to end RTI Server. ' + e);
        }
        // need to try to close other simulators too.

    }

    let i = 0;
    for (i = 0; i < execSims.length; i++) {
        try {
            let kill = require('tree-kill');
            kill(execSims[i].pid);
            console.log('killed' + execSims[i].pid)
        } catch (e) {
            alert('Error when trying to end sim. ' + e);
        }
    }

    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-stop").disabled = true;
    document.getElementById("btn-pause").disabled = true;
    document.getElementById("btn-play").disabled = true;
    ResetSimExecutionColor();

    //guiClient.close();
    //guiServer.close();
    guiFirstClient.destroy();
    guiDedicatedClient.destroy();
}

function ConnectToRTIServer() {

    // var dedicatedServerPort = 4200;

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
            console.log(dataReceived)
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
                // TODO why we need to split
                let messages = data.toString().split('\n')
                for (const message of messages) {
                    HandleRTIInputData(message)
                }

            });

        });
    } catch (e) {
        var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
        textConsoleLastAction.innerHTML = "Error occurred when trying to connect GUI to RTI Server! :(";
    }

    // TODO: issue: I have to effectively recreate a major part of "RTILib" in JavaScript to properly subscribe/publish messages.
}

function HandleRTIInputData(data) {
    // How should we display system-wide messages to the user?

    // example test to get a specific part of the message:
    var obj
    try {
        obj = JSON.parse(data)
        var step = obj.vTimestamp;
        var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
        textConsoleLastAction.innerHTML = "Step = " + step + " . Full RTI Message: " + data;

        // reminder: 'stage' can be found in 'RTI_StartStep' -> 'content' -> 'stage'.
        if (obj.name == "RTI_StartStep") {
            var content = JSON.parse(obj.content);
            simStage = content.stage;
        }


        UpdateStepAndStage(step);

        UpdateInspectorPanelMessage(data, step);

        UpdateSimExecutionColor(data);
    } catch (err) {
        console.log(data)
    }


}

function UpdateStepAndStage(step, stage) {
    if (stage == -1) {
        // don't update global stage locally, don't change display for stage
        // only update 'div' for 'step'
    } else {
        // update 'div' for both 'step' and 'stage'
    }
}

function UpdateInspectorPanelMessage(data, step) {
    // keep track of most recent 6 messages received

    receivedMessageBuffer.splice(0, 1);

    var obj = JSON.parse(data);
    var objName = obj.name;

    receivedMessageBuffer.push({ name: objName, message: data });


    AppendMessageObjectToInspectorPanel(receivedMessageBuffer[receivedMessageBufferLength - 1], step, simStage);
}

function AppendMessageObjectToInspectorPanel(message, step, simStage) {
    $('#simStep').text(step)
    $('#simStage').text(simStage)

    let accordion = $('#feed-accordion')
    accordion.find('.break-word.title').first().remove()
    accordion.find('.content').first().remove()

    let title, messageContent, contentAccordion, subtitle, subcontent

    title = $('<div>').addClass('break-word title').text(message.name)
    messageContent = $('<div>').addClass('content')
    if (message.message == 'N/A') {
        messageContent.append($('<p>').addClass('break-word').text('N/A'))
    } else {
        let parsedMessage = JSON.parse(message.message)
        console.log(parsedMessage)
        contentAccordion = $('<div>').addClass('accordion')
        for (let entry in parsedMessage) {
            if (parsedMessage.hasOwnProperty(entry)) {
                subtitle = $('<div>').addClass('break-word title').text(entry)
                subtitle.prepend($('<i>').addClass('dropdown icon'))
                subcontent = $('<div>').addClass('content')
                subcontent.append($('<p>').addClass('break-word').text(parsedMessage[entry]))

                contentAccordion.append(subtitle)
                contentAccordion.append(subcontent)
            }
        }

        messageContent.append(contentAccordion)

    }

    accordion.append(title)
    accordion.append(messageContent)

    // TODO: RTI messages seem repetitive

}

function UpdateInspectorPanelMessageObjects(step, stage) {

    let panel = $('#inspector-panel')
    panel.empty()

    let header = $('<div>').addClass('ui compact segment')
    header.append($('<h3>').text('Simulation in Execution'))

    let div = $('<div>').addClass('ui tiny horizontal statistics')
    let statistic = $('<div>').addClass('ui horizontal statistic')
    statistic.append($('<div>').addClass('label').html('Stage&nbsp;&nbsp;'))
    statistic.append($('<div>').addClass('value').attr('id', 'simStage').text(stage))

    div.append(statistic)

    statistic = $('<div>').addClass('ui horizontal statistic')
    statistic.append($('<div>').addClass('label').html('Step&nbsp;&nbsp;'))
    statistic.append($('<div>').addClass('value').attr('id', 'simStep').text(step))
    div.append(statistic)

    header.append(div)


    let content = $('<div>').addClass('ui compact segment')

    let menu = $('<div>').addClass('ui two item top attached menu')
    let item = $('<a>').addClass('active item').text('Feed').attr('data-tab', 'feed')
    // item.prepend($('<i>').addClass('calendar alternative outline icon'))
    menu.append(item)
    item = $('<a>').addClass('item').text('History').attr('data-tab', 'history')
    // item.prepend($('<i>').addClass('archive icon'))
    menu.append(item)



    let treebox = $('<div>').addClass('ui active tab bottom attached treemenu boxed').attr('data-tab', 'feed')
    let accordion = $('<div>').addClass('ui styled fluid accordion').attr('id', 'feed-accordion')


    var inspectorPanelString = ""; //TODO: what is this for
    let i = 0, title, messageContent, contentAccordion, subtitle, subcontent
    for (; i < receivedMessageBufferLength; i++) {
        inspectorPanelString = inspectorPanelString + receivedMessageBuffer[i].name + ", " + "<br>";

        title = $('<div>').addClass('break-word title').text(receivedMessageBuffer[i].name)
        messageContent = $('<div>').addClass('content')
        //TODO: parsing errors
        if (receivedMessageBuffer[i].message == 'N/A') {
            messageContent.append($('<p>').addClass('break-word').text('N/A'))
        } else {
            let parsedMessage = JSON.parse(receivedMessageBuffer[i].message)
            console.log(parsedMessage)
            contentAccordion = $('<div>').addClass('accordion')
            for (let entry in parsedMessage) {
                if (parsedMessage.hasOwnProperty(entry)) {
                    subtitle = $('<div>').addClass('break-word title').text(entry)
                    subtitle.prepend($('<i>').addClass('dropdown icon'))
                    subcontent = $('<div>').addClass('content')
                    subcontent.append($('<p>').addClass('break-word').text(parsedMessage[entry]))

                    contentAccordion.append(subtitle)
                    contentAccordion.append(subcontent)
                }
            }

            messageContent.append(contentAccordion)

        }

        accordion.append(title)
        accordion.append(messageContent)


    }

    treebox.append(accordion)

    let history = $('<div>').addClass('ui tab bottom attached segment').attr('data-tab', 'history')
    let placeholder = $('<div>').addClass('ui placeholder')
    let imageHeader = $('<div>').addClass('image header')
    imageHeader.append($('<div>').addClass('line'))
    imageHeader.append($('<div>').addClass('line'))
    let paragraph = $('<div>').addClass('paragraph')
    paragraph.append($('<div>').addClass('medium line'))
    paragraph.append($('<div>').addClass('short line'))
    placeholder.append(imageHeader)
    placeholder.append(paragraph)
    history.append(placeholder)

    content.append(menu)
    content.append(treebox)
    content.append(history)


    panel.append(header)
    panel.append(content)

    accordion.accordion({ exclusive: false })
    menu.find('.item').tab()
}

function UpdateInspectorPanelMessageContent(message) {
    var message2 = JSON.stringify(JSON.parse(message), null, 4);
    var message3 = message2;//message2.replace(/\n/g, "<br>");
    UpdateInspectorPanelMessageObjects(message3);
}

function UpdateSimExecutionColor(message) {
    var obj = JSON.parse(message);
    if (obj.name == "RTI_StartStep") {
        // obj.destination = an JSON array of sim names requested to start
        // obj.content.stage = current stage, as string
        if (obj.hasOwnProperty('destination')) {
            var destination = JSON.parse(obj.destination);
            var content = JSON.parse(obj.content);
            for (let simObj of simulatorObjects) {
                if (destination.includes(simObj.name)) {
                    if (simObj.stage == parseInt(content.stage)) {
                        simObj.objectRef.style.backgroundColor = "red";
                    }
                }
            }
        }
    } else if (obj.name == "RTI_FinishStep") {
        // obj.source = name of sim
        for (let simObj of simulatorObjects) {
            if (obj.source == simObj.name) {
                simObj.objectRef.style.backgroundColor = "blue";
            }
        }
    }
}

function ResetSimExecutionColor() {
    for (let simObj of simulatorObjects) {
        simObj.objectRef.style.backgroundColor = "green";
    }
}

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
        for (let [name, simulator] of simulators) {
			if (simulator.sshType == "local"){
				var execCommand = "cd /d " + simulator.filePath + " && " + simulator.executeCommand;
				var execSim = child_process.exec(execCommand,
					(error, stdout, stderror) => {
						if (error) {
							alert("error when running command to open sim: " + error);
						} else {
							alert("executing sim was successful!");
						}
					});
				execSims.push(execSim);
			} else if (simulator.sshType == "sshRemote"){
				execServer = child_process.exec('cd /d ' + __dirname + '\\..\\extraResources\\srti_sshapp\\' 
					+ ' && java -jar JavaSSHApp.jar ' + simulator.filePath + '\\' + name + '_sshsim.json',
					(error, stdout, stderror) => {
						if (error) {
							alert("error when running ssh command: " + error);
						} else {
							alert("command worked!");
						}
					});
				execSims.push(execSim);
			} else {
				alert('sshType invalid: ' + simulator.sshType);
			}
        }

    } catch (e) {
        alert('Error when trying to open RTI Server. ' + e);
        return;
    }
    var textConsoleLastAction = document.getElementById("TextConsoleLastAction");
    textConsoleLastAction.innerHTML = "Try to open sims: " + execSims.pid + "...";

}