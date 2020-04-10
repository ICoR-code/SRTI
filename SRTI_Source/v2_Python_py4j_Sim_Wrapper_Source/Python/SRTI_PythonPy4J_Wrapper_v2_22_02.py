


timestep = 0;
localTimestep = 0;
stage = 0;
timestep_mul = 0;
timestep_delta = 0;
next_order = 0;
next_timestep = 0;
timestep_var_delta = "";

print("Starting SRTI Wrapper (v2_22_02) for Python (py4j). Reading settings files...");

#TODO: read settings configuration files here.
import json
settingsName = 'Settings.json';
settingsFile = open(settingsName,"r");
settingsFileContent = settingsFile.read();
settingsFile.close();
settingsVal = json.loads(settingsFileContent);
#print(settingsFileContent);
#print(settingsVal);
#print(type(settingsVal));
#print(dir(settingsVal));
globalName = settingsVal["globalFile"];
globalFile = open(globalName,"r");
globalFileContent = globalFile.read();
globalFile.close();
globalVal = json.loads(globalFileContent);
configName = settingsVal["configuration"];
configFile = open(configName,"r");
configFileContent = configFile.read();
configFile.close();
configVal = json.loads(configFileContent);

from pydoc import locate;
obj = locate(configVal["simulatorRef"])();

print("Successfully read input settings files.");





print("Starting RTILib (via py4j, and active Java version of RTILib), connecting to server.");

# This is custom code that requires 'py4j' (v0.10.9, circa March 20, 2020, was used). 
# corresponding Java program MUST be running first, else this connection will fail.
from py4j.java_gateway import JavaGateway
gateway = JavaGateway();
rtiLib = gateway.entry_point.getRTILib();

rtiLib.setDebugOutput(configVal["debugConsole"]);
rtiLib.setDebugFileOutput(configVal["debugFile"]);
rtiLib.setSimName(configVal["simulatorName"]);
rtiLib.connect(configVal["hostName"],configVal["portNumber"]);

print("RTILib successfully connected to server. Proceeding to run simulator...\n");
print("(Output logs will occur for Java-side Wrapper, not directly in this Python Wrapper)");


# ------------------


gstep = 0;
kTimeToWait = 50;

subChannels = configVal["subscribedChannels"];
pubChannels = configVal["publishedChannels"];
stageChannels = configVal["stageChannels"];
simulateChannels = configVal["simulateChannels"];
endConditions = configVal["endConditions"];
stageConditions = configVal["stageConditions"];
initializeChannels = configVal["initializeChannels"];
startStepMessage = "";

#print(subChannels);
#print(subChannels[0]);
for i in range(0,len(subChannels)):
    rtiLib.subscribeToMessagePlusHistory(subChannels[i]["messageName"]);

rtiLib.printLine("[WRAPPER] Waiting for RTI_StartStep message (for timestep = 0)...");

message = rtiLib.waitForNextMessage("RTI_StartStep");
messageJson = json.loads(message);
messageContent = json.loads(messageJson["content"]);
timestep = int(messageContent["timestep"]);
localTimestep = timestep;

rtiLib.printLine("[WRAPPER] Testing one-time subscribed channels.");
def runSubOneTimeChannels():
    for i in range(0,len(subChannels)):
        if (subChannels[i]["oneTime"] == True and subChannels[i]["stage"] == stage):
            while True:
                if (subChannels[i]["messageName"] == "RTI_"):
                    for j in range(0,len(subChannels[i]["varChannel"])):
                        subChannelOb = subChannels[i]["varChannel"][j];
                        subChannelObValue = subChannelOb["valueName"];
                        subChnnaelObVar = subChannelOb["varName"];
                        setValue = 0;
                        if (subChannelObValue == "vTimestep"):
                            setValue = timestep;
                        elif (subChannelObValue == "stage"):
                            setValue = stage;
                        elif (subChannelObValue == "stageVTimestepMul"):
                            setValue = localTimestep;
                        elif (subChannelObValue == "stageVTimestep"):
                            setValue = int(locaTimestep/timestep_mul);
                        # is it an array?    
                        if ((type(setValue) is str) and (setValue[0] == '[')):
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], json.loads(setValue));
                        # is it a string that can be converted to a number?
                        elif ((type(setValue) is str) and (setValue.isdigit() == True)):
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], float(setValue));
                        # is it a string that cannot be converted to a number?
                        else:
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], setValue);
                    break;
                else:
                    message = "";
                    if (subChannels[i]["messageName"] == "RTI_StartStep"):
                        message = startStepMessage;
                    else:
                        message = rtiLib.getNextMessage(subChannels[i]["messageName"], kTimeToWait, subChannels[i]["relativeOrder"], timestep + subChannels[i]["maxTimestep"]);
                     
                    if (message != None and len(message) > 2):
                        for j in range(0, len(subChannels[i]["varChannel"])):
                            subChannelOb = subChannels[i]["varChannel"][j];
                            subChannelObValue = subChannelOb["valueName"];
                            subChannelObVar = subChannelOb["varName"];
                            setValueJson = json.loads(message);
                            setValueContentJson = json.loads(setValueJson["content"]);
                            setValue = setValueContentJson[subChannelObValue];
                            # is it an array?    
                            if ((type(setValue) is str) and (setValue[0] == '[')):
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], json.loads(setValue));
                            # is it a string that can be converted to a number?
                            elif ((type(setValue) is str) and (setValue.isdigit() == True)):
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], float(setValue));
                            # is it a string that cannot be converted to a number?
                            else:
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], setValue);
                        break;
                    if (subChannels[i]["mandatory"] == False):
                        break;
    return;
def runSubChannels():
    for i in range(0,len(subChannels)):
        if (subChannels[i]["oneTime"] == False and subChannels[i]["stage"] == stage and subChannels[i]["timestepDelta"] > 0 and localTimestep % (subChannels[i]["timestepDelta"]*timestep_mul)==0):
            while True:
                rtiLib.printLine("[WRAPPER] Checking for subscribed message : " + subChannels[i]["messageName"]);
                if (subChannels[i]["messageName"] == "RTI_"):
                    for j in range(0,len(subChannels[i]["varChannel"])):
                        subChannelOb = subChannels[i]["varChannel"][j];
                        subChannelObValue = subChannelOb["valueName"];
                        subChnnaelObVar = subChannelOb["varName"];
                        setValue = 0;
                        if (subChannelObValue == "vTimestep"):
                            setValue = timestep;
                        elif (subChannelObValue == "stage"):
                            setValue = stage;
                        elif (subChannelObValue == "stageVTimestepMul"):
                            setValue = localTimestep;
                        elif (subChannelObValue == "stageVTimestep"):
                            setValue = int(locaTimestep/timestep_mul);
                        # is it an array?    
                        if ((type(setValue) is str) and (setValue[0] == '[')):
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], json.loads(setValue));
                        # is it a string that can be converted to a number?
                        elif ((type(setValue) is str) and (setValue.isdigit() == True)):
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], float(setValue));
                        # is it a string that cannot be converted to a number?
                        else:
                            for k in range(0, len(dir(obj))):
                                if (dir(obj)[k] == subChannelObVar):
                                    setattr(obj,dir(obj)[k], setValue);
                    break;
                else:
                    message = "";
                    if (subChannels[i]["messageName"] == "RTI_StartStep"):
                        message = startStepMessage;
                    else:
                        message = rtiLib.getNextMessage(subChannels[i]["messageName"], kTimeToWait, subChannels[i]["relativeOrder"], timestep + subChannels[i]["maxTimestep"]);
                     
                    if (message != None and len(message) > 2):
                        for j in range(0,len(subChannels[i]["varChannel"])):
                            subChannelOb = subChannels[i]["varChannel"][j];
                            subChannelObValue = subChannelOb["valueName"];
                            subChannelObVar = subChannelOb["varName"];
                            setValueJson = json.loads(message);
                            setValueContentJson = json.loads(setValueJson["content"]);
                            setValue = setValueContentJson[subChannelObValue];
                            # is it an array?    
                            if ((type(setValue) is str) and (setValue[0] == '[')):
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], json.loads(setValue));
                            # is it a string that can be converted to a number?
                            elif ((type(setValue) is str) and (setValue.isdigit() == True)):
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], float(setValue));
                            # is it a string that cannot be converted to a number?
                            else:
                                for k in range(0, len(dir(obj))):
                                    if (dir(obj)[k] == subChannelObVar):
                                        setattr(obj,dir(obj)[k], setValue);
                        break;
                    if (subChannels[i]["mandatory"] == False):
                        break;
    return;
runSubOneTimeChannels();
                        
rtiLib.printLine("[WRAPPER] Testing initialized channels.");
# run initialize function to prepare data from simulator side
def runInitializeChannels():
    for i in range(0,len(initializeChannels)):
        if (initializeChannels[i]["stage"] == stage):
            for k in range(0, len(dir(obj))):
                if (dir(obj)[k] == initializeChannels[i]["functionName"]):
                    getattr(obj,dir(obj)[k])();
    return;
runInitializeChannels();
rtiLib.printLine("[WRAPPER] Publishing 'initiali' messages.");

def runPubInitialChannels():
    for i in range(0,len(pubChannels)):
        if (pubChannels[i]["initial"] == True and pubChannels[i]["stage"] == stage):
            setValueTotal = {};
            for j in range(0,len(pubChannels[i]["varChannel"])):
                pubChannelOb = pubChannels[i]["varChannel"][j];
                pubChannelObValue = pubChannelOb["valueName"];
                pubChannelObVar = pubChannelOb["varName"];

                for k in range(0, len(dir(obj))):
                    if (dir(obj)[k] == pubChannelObVar):
                        setValue = getattr(obj,dir(obj)[k]);
                        break;
                # is it an array?
                if (isinstance(setValue,list) == True):
                    setValueTotal[pubChannelObValue] = json.dumps(setValue); 
                # is it not an array?
                else:
                    setValueTotal[pubChannelObValue] = str(setValue);
            setValueJson = json.dumps(setValueTotal);
            rtiLib.publish(pubChannels[i]["messageName"], setValueJson);
    return;
def runPubChannels():
    for i in range(0,len(pubChannels)):
        if (pubChannels[i]["stage"] == stage and pubChannels[i]["timestepDelta"] > 0 and localTimestep % (pubChannels[i]["timestepDelta"]*timestep_mul) == 0):
            rtiLib.printLine("[WRAPPER] Handle publishing message : " + pubChannels[i]["messageName"]);
            setValueTotal = {};
            for j in range(0,len(pubChannels[i]["varChannel"])):
                pubChannelOb = pubChannels[i]["varChannel"][j];
                pubChannelObValue = pubChannelOb["valueName"];
                pubChannelObVar = pubChannelOb["varName"];

                for k in range(0, len(dir(obj))):
                    if (dir(obj)[k] == pubChannelObVar):
                        setValue = getattr(obj,dir(obj)[k]);
                        break;
                # is it an array?
                if (isinstance(setValue,list) == True):
                    setValueTotal[pubChannelObValue] = json.dumps(setValue); 
                # is it not an array?
                else:
                    setValueTotal[pubChannelObValue] = str(setValue);
            setValueJson = json.dumps(setValueTotal);
            rtiLib.publish(pubChannels[i]["messageName"], setValueJson);
    return;
runPubInitialChannels();

rtiLib.setNewVTimestamp(timestep);
for i in range(0,len(stageChannels)):
    if (stageChannels[i]["stage"] == stage):
        timestep_mul = stageChannels[i]["timestepMul"];
        timestep_delta = stageChannels[i]["timestepDelta"];
        timestep_var_delta = stageChannels[i]["timestepVarDelta"];
        next_order = stageChannels[i]["order"];

next_timestep = timestep;
localTimestep = timestep;
if (timestep_var_delta != ""):
    setValue = 1;
    for k in range(0, len(dir(obj))):
        if (dir(obj)[k] == timestep_var_delta):
            setValue = getattr(obj,dir(obj)[k]);
            break;
    next_timestep = timestep + round(setValue * timestep_mul);
    localTimestep = locaTimestep + round(setValue * timestep_mul);
else:
    next_timestep = timestep + round(timestep_delta * timestep_mul);
    localTimestep = localTimestep + round(timestep_delta * timestep_mul);


finishContent = rtiLib.setJsonObject("", "nextStep", next_timestep);
finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", next_order);
rtiLib.publish("RTI_FinishStep", finishContent);

if (configVal["dataOutFile"] == True):
    print("WARNING: You set 'dataOutFile' to be true, but this hasn't been implemented in Python yet.\n");


# ------------------

rtiLib.printLine("[WRAPPER] Beginning loop.\n");                        

while True:
    rtiLib.printLine("[WRAPPER] Waiting for RTI_StartStep message...");

    endConditionMet = False;
    newStage = 0;
    startStepMessage = "";
    startStepMessage = rtiLib.waitForNextMessage("RTI_StartStep");
    messageJson = json.loads(startStepMessage);
    messageContent = json.loads(messageJson["content"]);
    timestep = int(messageContent["timestep"]);
    newStage = int(messageContent["stage"]);

    if (newStage < 0):
        # another sim must have told "end", so end the simulation system-wide.
        rtiLib.printLine("[WRAPPER] Server says it's time to end now...");
        print("Server says it's time to end now... \n");

        # if other sims are 'waiting' for previous ordered sims to finish, should send "RTI_FinishStep", even if ending immediately after.
        next_timestep = timestep;
        if (timestep_var_delta != ""):
            setValue = 1;
            for k in range(0, len(dir(obj))):
                if (dir(obj)[k] == timestep_var_delta):
                    setValue = getattr(obj,dir(obj)[k]);
                    break;
            next_timestep = timestep + round(setValue * timestep_mul);
            localTimestep = locaTimestep + round(setValue * timestep_mul);
        else:
            next_timestep = timestep + round(timestep_delta * timestep_mul);
            localTimestep = localTimestep + round(timestep_delta * timestep_mul);
        if (timestep_delta == -1 and timestep_var_delta == ""):
            next_timestep = -1;
        finishContent = rtiLib.setJsonObject("", "nextStep", int(next_timestep));
        finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int(next_order));
        rtiLib.publish("RTI_FinishStep", finishContent);

        #if (configVal.dataOutFile == True):
            # ADD function to print data out to a file
            # ... accomplish by getting list of all public var attributes in Python class, and printing a row of their values.

        break;

    if (stage != newStage and newStage >= 0):
        localTimestep = 0;
        rtiLib.printLine("[WRAPPER] Stage has changed. Execute 'subscribe' messages (oneTime), 'initialize' functions for this stage and 'publish' messages that require 'initial' message.");
        print("[WRAPPER] Stage has changed. Execute 'subscribe' messages (oneTime), 'initialize' functions for this stage and 'publish' messages that require 'initial' message.\n");

        runSubOneTimeChannels();
            
        runInitializeChannels();

        runPubInitialChannels();
            
        # do EVERYTHING normally done for 'step 0'...
        rtiLib.setNewVTimestamp(timestep);
        timestep_mul = -1;
        timestep_delta = -1;
        timestep_var_delta = "";
        next_order = -1;
        for i in range(0,len(stageChannels)):
            if (stageChannels[i]["stage"] == newStage):
                timestep_mul = stageChannels[i]["timestepMul"];
                timestep_delta = stageChannels[i]["timestepDelta"];
                timestep_var_delta = stageChannels[i]["timestepVarDelta"];
                next_order = stageChannels[i]["order"];

        next_timestep = timestep;
        if (timestep_var_delta != ""):
            setValue = 1;
            for k in range(0, len(dir(obj))):
                if (dir(obj)[k] == timestep_var_delta):
                    setValue = getattr(obj,dir(obj)[k]);
                    break;
            next_timestep = timestep + round(setValue * timestep_mul);
            localTimestep = locaTimestep + round(setValue * timestep_mul);
        else:
            next_timestep = timestep + round(timestep_delta * timestep_mul);
            localTimestep = localTimestep + round(timestep_delta * timestep_mul);
        if (timestep_delta == -1 and timestep_var_delta == ""):
            next_timestep = -1;
        finishContent = rtiLib.setJsonObject("", "nextStep", int(next_timestep));
        finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int(next_order));
        rtiLib.publish("RTI_FinishStep", finishContent);
        stage = newStage;
        continue;
    # ------------------
    
    stage = newStage;

    rtiLib.setNewVTimestamp(timestep);
    timestep_mul = -1;
    timestep_delta = -1;
    timestep_var_delta = "";
    next_order = -1;
    for i in range(0,len(stageChannels)):
        if (stageChannels[i]["stage"] == newStage):
            timestep_mul = stageChannels[i]["timestepMul"];
            timestep_delta = stageChannels[i]["timestepDelta"];
            timestep_var_delta = stageChannels[i]["timestepVarDelta"];
            next_order = stageChannels[i]["order"];

    runSubChannels();

    simulate_time_delta = 1;
    # simulate one time step on simulator
    for i in range(0,len(simulateChannels)):
        if (simulateChannels[i]["stage"] == stage and simulateChannels[i]["timestepDelta"] > 0 and localTimestep % (simulateChannels[i]["timestepDelta"]*timestep_mul)==0):
            for k in range(0, len(dir(obj))):
                if (dir(obj)[k] == simulateChannels[i]["functionName"]):
                    getattr(obj,dir(obj)[k])();

    runPubChannels();

    # CHECK IF END-CONDITION IS MET
    endConditionReturnValue = False;
    endCodnitionReturnAND = False;
    for i in range(0,len(endConditions)):
        endConditionReturnAND = True;
        for k in range(0,len(endConditions[i])):
            if (endConditions[i][k]["varName2"] == ""):
                compareValue = endConditions[i][k]["value"];
            else:
                for j in range(0, len(dir(obj))):
                    if (dir(obj)[j] == endConditions[i][k]["varName2"]):
                        compareValue = getattr(obj,dir(obj)[j])();
            if (endConditions[i][k]["varName"] == "RTI_vTimestamp"):
                if (endConditions[i][k]["condition"] == "="):
                    if (not(timestep == compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "!="):
                    if (not(timestep != compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == ">"):
                    if (not(timestep > compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<"):
                    if (not(timestep < compareValue)):
                        endConditionReturnAND = False;  
                elif (endConditions[i][k]["condition"] == ">="):
                    if (not(timestep >= compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<="):
                    if (not(timestep <= compareValue)):
                        endConditionReturnAND = False;
            elif (endConditions[i][k]["varName"] == "RTI_stage"):
                if (endConditions[i][k]["condition"] == "="):
                    if (not(stage == compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "!="):
                    if (not(stage != compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == ">"):
                    if (not(stage > compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<"):
                    if (not(stage < compareValue)):
                        endConditionReturnAND = False;  
                elif (endConditions[i][k]["condition"] == ">="):
                    if (not(stage >= compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<="):
                    if (not(stage <= compareValue)):
                        endConditionReturnAND = False;
            elif (endConditions[i][k]["varName"] == "RTI_stageVTimestepMul"):
                if (endConditions[i][k]["condition"] == "="):
                    if (not(localTimestep == compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "!="):
                    if (not(localTimestep != compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == ">"):
                    if (not(localTimestep > compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<"):
                    if (not(localTimestep < compareValue)):
                        endConditionReturnAND = False;  
                elif (endConditions[i][k]["condition"] == ">="):
                    if (not(localTimestep >= compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<="):
                    if (not(localTimestep <= compareValue)):
                        endConditionReturnAND = False;
            elif (endConditions[i][k]["varName"] == "RTI_stageVTimestep"):
                compareVar = int(localTimstep/timestep_mul);
                if (endConditions[i][k]["condition"] == "="):
                    if (not(compareVar == compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "!="):
                    if (not(compareVar != compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == ">"):
                    if (not(compareVar > compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<"):
                    if (not(compareVar < compareValue)):
                        endConditionReturnAND = False;  
                elif (endConditions[i][k]["condition"] == ">="):
                    if (not(compareVar >= compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<="):
                    if (not(compareVar <= compareValue)):
                        endConditionReturnAND = False;
            else:
                compareVar = 0;
                for j in range(0, len(dir(obj))):
                    if (dir(obj)[j] == endConditions[i][k]["varName"]):
                        compareVar = getattr(obj,dir(obj)[j])();
                if (endConditions[i][k]["condition"] == "="):
                    if (not(compareVar == compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "!="):
                    if (not(compareVar != compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == ">"):
                    if (not(compareVar > compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<"):
                    if (not(compareVar < compareValue)):
                        endConditionReturnAND = False;  
                elif (endConditions[i][k]["condition"] == ">="):
                    if (not(compareVar >= compareValue)):
                        endConditionReturnAND = False;
                elif (endConditions[i][k]["condition"] == "<="):
                    if (not(compareVar <= compareValue)):
                        endConditionReturnAND = False;
        if (endConditionReturnAND == True):
            endConditionReturnValue = True;
    if (endConditionReturnValue == True):
        endConditionMet = True;
        rtiLib.printLine("End condition successfully met. Should prepare to close this sim.");
        print("End condition successfully met. Should prepare to close this sim. \n");
        rtiLib.publish("RTI_EndSystem","");

    # CHECK IF STAGE-CONDITION IS MET
    differentStage = stage;
    stageConditionReturnAND = True;
    for i in range(0,len(stageConditions)):
        stageConditionReturnAND = True;
        for k in range(0,len(stageConditions[i])):
            if (stageConditions[i][k]["varName2"] == ""):
                compareValue = stageConditions[i][k]["value"];
            else:
                for j in range(0, len(dir(obj))):
                    if (dir(obj)[j] == stageConditions[i][k]["varName2"]):
                        compareValue = getattr(obj,dir(obj)[j])();
            if (stageConditions[i][k]["oldStage"] == stage):
                if (stageConditions[i][k]["varName"] == "RTI_vTimestamp"):
                    if (stageConditions[i][k]["condition"] == "="):
                        if (not(timestep == compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "!="):
                        if (not(timestep != compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">"):
                        if (not(timestep > compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<"):
                        if (not(timestep < compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"]; 
                    elif (stageConditions[i][k]["condition"] == ">="):
                        if (not(timestep >= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<="):
                        if (not(timestep <= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                elif (stageConditions[i][k]["varName"] == "RTI_stage"):
                    if (stageConditions[i][k]["condition"] == "="):
                        if (not(stage == compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "!="):
                        if (not(stage != compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">"):
                        if (not(stage > compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<"):
                        if (not(stage < compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"]; 
                    elif (stageConditions[i][k]["condition"] == ">="):
                        if (not(stage >= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<="):
                        if (not(stage <= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                elif (stageConditions[i][k]["varName"] == "RTI_stageVTimestepMul"):
                    if (stageConditions[i][k]["condition"] == "="):
                        if (not(localTimestep == compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "!="):
                        if (not(localTimestep != compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">"):
                        if (not(localTimestep > compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<"):
                        if (not(localTimestep < compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];  
                    elif (stageConditions[i][k]["condition"] == ">="):
                        if (not(localTimestep >= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<="):
                        if (not(localTimestep <= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                elif (stageConditions[i][k]["varName"] == "RTI_stageVTimestep"):
                    compareVar = int(localTimstep/timestep_mul);
                    if (stageConditions[i][k]["condition"] == "="):
                        if (not(compareVar == compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "!="):
                        if (not(compareVar != compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">"):
                        if (not(compareVar > compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<"):
                        if (not(compareVar < compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">="):
                        if (not(compareVar >= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<="):
                        if (not(compareVar <= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                else:
                    compareVar = 0;
                    for j in range(0, len(dir(obj))):
                        if (dir(obj)[j] == stageConditions[i][k]["varName"]):
                            compareVar = getattr(obj,dir(obj)[j])();
                    if (stageConditions[i][k]["condition"] == "="):
                        if (not(compareVar == compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "!="):
                        if (not(compareVar != compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">"):
                        if (not(compareVar > compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<"):
                        if (not(compareVar < compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == ">="):
                        if (not(compareVar >= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                    elif (stageConditions[i][k]["condition"] == "<="):
                        if (not(compareVar <= compareValue)):
                            stageConditionReturnAND = False;
                        else:
                            differentStage = stageConditions[i][k]["newStage"];
                        
        if (stageConditionReturnAND == False):
            differentStage = stage;
    if (differentStage != stage):
        finishContent = rtiLib.setJsonObject("", "nextStage", differentStage);
        rtiLib.printLine("[WRAPPER] Stage condition successfully met. Transition will occur from Server at next step.");
        print("[WRAPPER] Stage condition successfully met. Transition will occur from Server at next step.\n");
        rtiLib.publish("RTI_UpdateStage", finishContent);
        
    next_timestep = timestep;
    next_timestep = timestep;
    if (timestep_var_delta != ""):
        setValue = 1;
        for k in range(0, len(dir(obj))):
            if (dir(obj)[k] == timestep_var_delta):
                setValue = getattr(obj,dir(obj)[k]);
                break;
        next_timestep = timestep + round(setValue * timestep_mul);
        localTimestep = locaTimestep + round(setValue * timestep_mul);
    else:
        next_timestep = timestep + round(timestep_delta * timestep_mul);
        localTimestep = localTimestep + round(timestep_delta * timestep_mul);
    if (timestep_delta == -1 and timestep_var_delta == ""):
        next_timestep = -1;
    finishContent = rtiLib.setJsonObject("", "nextStep", int(next_timestep));
    finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int(next_order));
    rtiLib.publish("RTI_FinishStep", finishContent);

    #if (configVal.dataOutFile == True):
        # ADD function to print data out to a file
        # ... accomplish by getting list of all public var attributes in Python class, and printing a row of their values.

    gstep = gstep + 1;

    if (endConditionMet == True):
        break;

rtiLib.disconnect();
rtiLib.printLine("[WRAPPER] Ending SRTI clients with third-party simulations.");
print("This Wrapper and simulator has disconnected from RTI Server safely, and has now ended.");







    

    

