function SRTI_Wrapper()
clc
%% note about 'int8,' 'int16,' etc.:
%%  int8 max number is 127
%%  int16 max number is 32,767
%%      By default, 'int' in Java is 4 bytes, max number > 2,000,000.
%% To match limitations of Java version of Wrapper, we'll use 'int32' here. 

%% some variables
timestep = 0;
localTimestep = 0;
stage = 0;
timestep_mul = 0;
timestep_delta = 0;
next_order = int32(0);
next_timestep = 0;
timestep_var_delta = "";


%% read input configuration files

fprintf('Starting SRTI Wrapper (v2_20_02) for Matlab. Reading settings files... \n');

settingsName = 'Settings.json';
settingsVal = jsondecode(fileread(settingsName));
globalName = settingsVal.global;
globalVal = jsondecode(fileread(globalName));
configName = settingsVal.configuration;
configVal = jsondecode(fileread(configName));

%obj = TestSim_01;
eval("obj = " + configVal.simulatorRef + ";");

%fprintf('length of subscribedMessages = %d \n', length(configVal.subscribedChannels));
fprintf('Successfully read input settings files. \n');




%% connect to SRTI Server with RTILib API

fprintf('Starting RTILib, connecting to server. \n');

javaaddpath SRTI_v2_20_02.jar;
import mainServer.*;
rtiLib = RTILib();
rtiLib.setDebugOutput(configVal.debugConsole);
rtiLib.setDebugFileOutput(configVal.debugFile);
rtiLib.setSimName(configVal.simulatorName);
rtiLib.connect(configVal.hostName, configVal.portNumber);

fprintf('RTILib successfully connected to server. Proceeding to run simulator...\n');

gstep = 0;
kTimeToWait = 50;

%subChannelNames = fieldnames(configVal.subscribedChannels(1));
%pubChannelNames = fieldnames(configVal.publishedChannels(1));
subChannels = configVal.subscribedChannels;
pubChannels = configVal.publishedChannels;
stageChannels = configVal.stageChannels;
simulateChannels = configVal.simulateChannels;
endConditions = configVal.endConditions;
stageConditions = configVal.stageConditions;
initializeChannels = configVal.initializeChannels;

%% subscribe to messages
for i = 1:length(subChannels)
    rtiLib.subscribeToMessagePlusHistory(subChannels(i).messageName);
end

rtiLib.printLine("[WRAPPER] Waiting for RTI_StartStep message (for timestep = 0)...");

message = rtiLib.waitForNextMessage("RTI_StartStep");
messageJson = jsondecode(char(message));
messageContent = jsondecode(char(messageJson.content));
timestep = int32(str2double(messageContent.timestep));
localTimestep = timestep;

rtiLib.printLine("[WRAPPER] Testing one-time subscribed channels.");
%% receive one-time messages, required before starting anything
for i = 1:length(subChannels)   
   %% subChannel = getfield(configVal.subscribedChannels(1), char(subChannelNames(i)));
   if subChannels(i).oneTime == true && subChannels(i).stage == stage
				while true
                   if (strcmp(subChannels(i).messageName, "RTI_") == 1)
                       for j = 1:length(subChannels(i).varChannel)                 
                           subChannelOb = subChannels(i).varChannel(j);
                           subChannelObValue = subChannelOb.valueName;
                           subChannelObVar = subChannelOb.varName;
                           setValue = 0;
                           if (strcmp(subChannelObValue, "vTimestep") == 1)
                               setValue = timestep;
                           elseif (strcmp(subChannelObValue, "stage") == 1)
                               setValue = stage;
                           elseif (strcmp(subChannelObValue, "stageVTimestepMul") == 1)
                               setValue = localTimestep;
                           elseif (strcmp(subChannelObValue, "stageVTimestep") == 1)
                               setValue = int32(localTimestep / timestep_mul);
                           end
                           if (isempty(str2num(setValue)))
                               eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                           else
                               eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                           end
                       end
                       break;
                   else
                       message = "";
                       if (strcmp(subChannels(i).messageName, "RTI_StartStep") == 1)
                           message = "";	%% WE CAN'T SUBSCRIBE TO THIS... IT DOESN'T EXIST YET!
                       else
                           message = rtiLib.getNextMessage(subChannels(i).messageName, kTimeToWait, subChannels(i).relativeOrder, timestep + subChannels(i).maxTimestep);
                       end

                       if ~isempty(message) && strlength(char(message)) > 2
                           for j = 1:length(subChannels(i).varChannel)                 
                                 subChannelOb = subChannels(i).varChannel(j);
                                 subChannelObValue = subChannelOb.valueName;
                                 subChannelObVar = subChannelOb.varName;
                                 setValueJson = jsondecode(char(message));
                                 setValueContentJson = jsondecode(setValueJson.content);
                                 eval ("setValue = " + "setValueContentJson." + subChannelObValue + ";");
                                 if (isempty(str2num(setValue)))
                                     eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                                 else
                                     eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                                 end
                            end
                           break;
                       end
                       if (subChannels(i).mandatory == false)
                           break; 
                       end
                   end
               end
   end
end

rtiLib.printLine("[WRAPPER] Testing initialized channels.");
%% run initialize function to prepare data from simulator side
for i = 1:length(initializeChannels)
    if (initializeChannels(i).stage == stage)
        eval("obj." + initializeChannels(i).functionName + "();");
    end
end

rtiLib.printLine("[WRAPPER] Publishing 'initial' messages.");
%% send first one-time messages, if required for other simulators to proceed
for i = 1:length(pubChannels)
   %%pubChannel = getfield(configVal.publishedChannels(1), char(pubChannelNames(i)));
   if pubChannels(i).initial == true && pubChannels(i).stage == stage
       %% setValueTotalString = "";
       setValueTotal = [];
       for j = 1:length(pubChannels(i).varChannel)
           pubChannelOb = pubChannels(i).varChannel(j);
           pubChannelObValue = pubChannelOb.valueName;
           pubChannelObVar = pubChannelOb.varName;

           %% eval ("setValue = " + "obj." + pubChannelObVar + ";");
           
           %% setValueTotalString = setValueTotalString + '''' + pubChannelObValue + '''' + ", " + jsonencode(setValue);
           %% if j ~= length(pubChannels(i).varChannel)
           %%    setValueTotalString = setValueTotalString + ", "; 
           %%end
           eval("setValue = obj." + pubChannelObVar + ";");
           if (numel(setValue) > 1)
               eval("setValueTotal." + pubChannelObValue + " = jsonencode(setValue);");
           else
               eval("setValueTotal." + pubChannelObValue + " = mat2str(setValue);");
           end
       end
       %% eval ("setValueTotal = struct(" + char(setValueTotalString) + ");");
       setValueJson = jsonencode(setValueTotal);
       rtiLib.publish(pubChannels(i).messageName, setValueJson);
   end
end

rtiLib.setNewVTimestamp(timestep);
for i = 1:length(stageChannels)
   if stageChannels(i).stage == stage
       timestep_mul = stageChannels(i).timestepMul;
       timestep_delta = stageChannels(i).timestepDelta;
       timestep_var_delta = stageChannels(i).timestepVarDelta;
       next_order = int32(stageChannels(i).order);
   end
end

next_timestep = timestep;
localTimestep = timestep;
if (timestep_var_delta ~= "")
    eval("next_timestep = timestep + round(obj." + timestep_var_delta + " * timestep_mul);");
    eval("localTimestep = localTimestep + round(obj." + timestep_var_delta + " * timestep_mul);");
else
   next_timestep = timestep + round(timestep_delta * timestep_mul);
   localTimestep = localTimestep + round(timestep_delta * timestep_mul);
end

finishContent = rtiLib.setJsonObject("", "nextStep", int32(next_timestep));
finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int32(next_order));
rtiLib.publish("RTI_FinishStep", finishContent);

if configVal.dataOutFile == true
    fprintf("WARNING: You set 'dataOutFile' to be true, but this hasn't been implemented in Matlab yet.\n");
end


%% 


rtiLib.printLine("[WRAPPER] Beginning loop.\n");

while true
    rtiLib.printLine("[WRAPPER] Waiting for RTI_StartStep message...");
    
    endConditionMet = false;
    newStage = 0;
    startStepMessage = "";
    startStepMessage = rtiLib.waitForNextMessage("RTI_StartStep");
    messageJson = jsondecode(char(startStepMessage));
    messageContent = jsondecode(char(messageJson.content));
    timestep = int32(str2double(messageContent.timestep));
    newStage = int32(str2double(messageContent.stage));
    %timestep = jsondecode(char(startStepMessage)).content.timestep;
    %newStage = jsondecode(char(startStepMessage)).content.stage;
    
    if (newStage < 0)
        %% another sim must have told "end", so end the simulation system-wide.
        rtiLib.printLine("[WRAPPER] Server says it's time to end now...");
        fprintf("Server says it's time to end now... \n");
        
        %% if other sims are 'waiting' for previous ordered sims to finish, should send "RTI_FinishStep", even if ending immediately after.
        next_timestep = timestep;
        if (timestep_var_delta ~= "")
            eval("next_timestep = timestep + round(obj." + timestep_var_delta + " * timestep_mul);");
            eval("localTimestep = localTimestep + round(obj." + timestep_var_delta + " * timestep_mul);");
        else
           next_timestep = timestep + round(timestep_delta * timestep_mul);
           localTimestep = localTimestep + round(timestep_delta * timestep_mul);
        end
        if (timestep_delta == -1 && timestep_var_delta == "")
            next_timestep = -1;
        end
        finishContent = rtiLib.setJsonObject("", "nextStep", int32(next_timestep));
        finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int32(next_order));
        rtiLib.publish("RTI_FinishStep", finishContent);
        
        if (configVal.dataOutFile == true)
           %% ADD function to print data out to a file
           %% ... how to do this is not getting list of "public" variables from the Matlab script? 
        end
        
        break;
    end
    
    if (stage ~= newStage && newStage >= 0)
       localTimestep = 0;
       rtiLib.printLine("[WRAPPER] Stage has changed. Execute 'subscribe' messages (oneTime), 'initialize' functions for this stage and 'publish' messages that require 'initial' message.");
       fprintf("Stage has changed. Execute 'subscribe' messages (oneTime), 'initialize' functions for this stage and 'publish' messages that require 'initial' message. \n");
       
       for i = 1:length(subChannels)   
           %% subChannel = getfield(configVal.subscribedChannels(1), char(subChannelNames(i)));
		   
           if subChannels(i).oneTime == true && subChannels(i).stage == newStage
		   		while true
                   if (strcmp(subChannels(i).messageName, "RTI_") == 1)
                       for j = 1:length(subChannels(i).varChannel)                 
                           subChannelOb = subChannels(i).varChannel(j);
                           subChannelObValue = subChannelOb.valueName;
                           subChannelObVar = subChannelOb.varName;
                           setValue = 0;
                           if (strcmp(subChannelObValue, "vTimestep") == 1)
                               setValue = timestep;
                           elseif (strcmp(subChannelObValue, "stage") == 1)
                               setValue = stage;
                           elseif (strcmp(subChannelObValue, "stageVTimestepMul") == 1)
                               setValue = localTimestep;
                           elseif (strcmp(subChannelObValue, "stageVTimestep") == 1)
                               setValue = int32(localTimestep / timestep_mul);
                           end
                           if (isempty(str2num(setValue)))
                               eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                           else
                               eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                           end
                       end
                       break;
                   else
                       message = "";
                       if (strcmp(subChannels(i).messageName, "RTI_StartStep") == 1)
                           message = startStepMessage;	%% WE CAN'T SUBSCRIBE TO THIS... IT DOESN'T EXIST YET!
                       else
                           message = rtiLib.getNextMessage(subChannels(i).messageName, kTimeToWait, subChannels(i).relativeOrder, timestep + subChannels(i).maxTimestep);
                       end

                       if ~isempty(message) && strlength(char(message)) > 2
                           for j = 1:length(subChannels(i).varChannel)                 
                                 subChannelOb = subChannels(i).varChannel(j);
                                 subChannelObValue = subChannelOb.valueName;
                                 subChannelObVar = subChannelOb.varName;
                                 setValueJson = jsondecode(char(message));
                                 setValueContentJson = jsondecode(setValueJson.content);
                                 eval ("setValue = " + "setValueContentJson." + subChannelObValue + ";");
                                 if (isempty(str2num(setValue)))
                                     eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                                 else
                                     eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                                 end
                            end
                           break;
                       end
                       if (subChannels(i).mandatory == false)
                           break; 
                       end
                   end
               end
           end
        end
       
       for i = 1:length(initializeChannels)
           if (initializeChannels(i).stage == newStage)
               eval("obj." + initializeChannels(i).functionName + "();");
           end
       end
          
       for i = 1:length(pubChannels)
           %%pubChannel = getfield(configVal.publishedChannels(1), char(pubChannelNames(i)));
           if pubChannels(i).initial == true && pubChannels(i).stage == newStage
               %% setValueTotalString = "";
               setValueTotal = [];
               for j = 1:length(pubChannels(i).varChannel)
                   pubChannelOb = pubChannels(i).varChannel(j);
                   pubChannelObValue = pubChannelOb.valueName;
                   pubChannelObVar = pubChannelOb.varName;

                   %% eval ("setValue = " + "obj." + pubChannelObVar + ";");

                   %% setValueTotalString = setValueTotalString + '''' + pubChannelObValue + '''' + ", " + jsonencode(setValue);
                   %% if j ~= length(pubChannels(i).varChannel)
                   %%    setValueTotalString = setValueTotalString + ", "; 
                   %%end
                   eval("setValue = obj." + pubChannelObVar + ";");
                   if (numel(setValue) > 1)
                        eval("setValueTotal." + pubChannelObValue + " = jsonencode(setValue);");
                   else
                        eval("setValueTotal." + pubChannelObValue + " = mat2str(setValue);");
                   end
               end
               %% eval ("setValueTotal = struct(" + char(setValueTotalString) + ");");
               setValueJson = jsonencode(setValueTotal);
               rtiLib.publish(pubChannels(i).messageName, setValueJson);
           end
       end
       
       %% do EVERYTHING normally done for 'step 0'... 
        rtiLib.setNewVTimestamp(timestep);
        timestep_mul = -1;
        timestep_delta = -1;
        timestep_var_delta = "";
        next_order = int32(-1);
        for i = 1:length(stageChannels)
           if stageChannels(i).stage == newStage
               timestep_mul = stageChannels(i).timestepMul;
               timestep_delta = stageChannels(i).timestepDelta;
               timestep_var_delta = stageChannels(i).timestepVarDelta;
               next_order = int32(stageChannels(i).order);
           end
        end

        next_timestep = timestep;
        %%localTimestep = timestep;
        if (timestep_var_delta ~= "")
            eval("next_timestep = timestep + round(obj." + timestep_var_delta + " * timestep_mul);");
            eval("localTimestep = localTimestep + round(obj." + timestep_var_delta + " * timestep_mul);");
        else
           next_timestep = timestep + round(timestep_delta * timestep_mul);
           localTimestep = localTimestep + round(timestep_delta * timestep_mul);
        end
		if (timestep_delta == -1 && timestep_var_delta == "")
           next_timestep = -1;
        end

        finishContent = rtiLib.setJsonObject("", "nextStep", int32(next_timestep));
        finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int32(next_order));
        rtiLib.publish("RTI_FinishStep", finishContent);
        %% POTENTIAL ISSUE: if local step == 1 at first step of 'simulate,' then "mod()" logic for timestep_delta 
        %%     would require that step is not calculated until NEXT interval, not at very first step. Is this ok? Probably.
		stage = newStage;
        continue;
    end
	
    stage = newStage;
    
    rtiLib.setNewVTimestamp(timestep);
    timestep_mul = -1;
    timestep_delta = -1;
    timestep_var_delta = "";
    next_order = int32(-1);
    for i = 1:length(stageChannels)
       if stageChannels(i).stage == stage
           timestep_mul = stageChannels(i).timestepMul;
           timestep_delta = stageChannels(i).timestepDelta;
           timestep_var_delta = stageChannels(i).timestepVarDelta;
           next_order = int32(stageChannels(i).order);
       end
    end
    
    
    %% received subscribed messages
    for i = 1:length(subChannels)   
       %% subChannel = getfield(configVal.subscribedChannels(1), char(subChannelNames(i)));
       if subChannels(i).oneTime == false
           if (subChannels(i).stage == stage && subChannels(i).timestepDelta > 0 && mod(localTimestep,subChannels(i).timestepDelta*timestep_mul)==0)
               while true
                   rtiLib.printLine("[WRAPPER] Checking for subscribed message : " + subChannels(i).messageName);

                   if (strcmp(subChannels(i).messageName, "RTI_") == 1)
                       for j = 1:length(subChannels(i).varChannel)                 
                           subChannelOb = subChannels(i).varChannel(j);
                           subChannelObValue = subChannelOb.valueName;
                           subChannelObVar = subChannelOb.varName;
                           setValue = 0;
                           if (strcmp(subChannelObValue, "vTimestep") == 1)
                               setValue = timestep;
                           elseif (strcmp(subChannelObValue, "stage") == 1)
                               setValue = stage;
                           elseif (strcmp(subChannelObValue, "stageVTimestepMul") == 1)
                               setValue = localTimestep;
                           elseif (strcmp(subChannelObValue, "stageVTimestep") == 1)
                               setValue = int32(localTimestep / timestep_mul);
                           end
                           if (isempty(str2num(setValue)))
                               eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                           else
                               eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                           end
                       end
                       break;
                   else
                       message = "";
                       if (strcmp(subChannels(i).messageName, "RTI_StartStep") == 1)
                           message = startStepMessage;
                       else
                           message = rtiLib.getNextMessage(subChannels(i).messageName, kTimeToWait, subChannels(i).relativeOrder, timestep + subChannels(i).maxTimestep);
                       end

                       if ~isempty(message) && strlength(char(message)) > 2
                           for j = 1:length(subChannels(i).varChannel)                 
                                 subChannelOb = subChannels(i).varChannel(j);
                                 subChannelObValue = subChannelOb.valueName;
                                 subChannelObVar = subChannelOb.varName;
                                 setValueJson = jsondecode(char(message));
                                 setValueContentJson = jsondecode(setValueJson.content);
                                 eval ("setValue = " + "setValueContentJson." + subChannelObValue + ";");
                                 if (isempty(str2num(setValue)))
                                     eval("obj." + subChannelObVar + " = " + "setValue" + ";");
                                 else
                                     eval("obj." + subChannelObVar + " = " + "str2num(setValue)" + ";");
                                 end
                            end
                           break;
                       end
                       if (subChannels(i).mandatory == false)
                           break; 
                       end
                   end
               end
           end
       end
    end
    
    simulate_time_delta = 1;
    %% simulate one time step on simulator
    for i = 1:length(simulateChannels)
        if (simulateChannels(i).stage == stage)
            if (simulateChannels(i).timestepDelta > 0 && mod(localTimestep,simulateChannels(i).timestepDelta*timestep_mul)==0)
                eval("obj." + simulateChannels(i).functionName + "();");
            end
        end
    end

    %% publish messages to SRTI Server
    for i = 1:length(pubChannels)
       %%pubChannel = getfield(configVal.publishedChannels(1), char(pubChannelNames(i)));
       if pubChannels(i).stage == stage && pubChannels(i).timestepDelta > 0 && mod(localTimestep,pubChannels(i).timestepDelta*timestep_mul)==0
           rtiLib.printLine("[WRAPPER] Handle publishing message : " + pubChannels(i).messageName);
           %% setValueTotalString = "";
           setValueTotal = [];
           for j = 1:length(pubChannels(i).varChannel)
               pubChannelOb = pubChannels(i).varChannel(j);
               pubChannelObValue = pubChannelOb.valueName;
               pubChannelObVar = pubChannelOb.varName;

               %% eval ("setValue = " + "obj." + pubChannelObVar + ";");

               %% setValueTotalString = setValueTotalString + '''' + pubChannelObValue + '''' + ", " + jsonencode(setValue);
               %% if j ~= length(pubChannels(i).varChannel)
               %%    setValueTotalString = setValueTotalString + ", "; 
               %%end
               eval("setValue = obj." + pubChannelObVar + ";");
               if (numel(setValue) > 1)
                    eval("setValueTotal." + pubChannelObValue + " = jsonencode(setValue);");
               else
                    eval("setValueTotal." + pubChannelObValue + " = mat2str(setValue);");
               end
           end
           %% eval ("setValueTotal = struct(" + char(setValueTotalString) + ");");
           setValueJson = jsonencode(setValueTotal);
           setValueJson = jsonencode(setValueTotal);
           rtiLib.publish(pubChannels(i).messageName, setValueJson);
       end
    end
    
    %% CHECK IF END-CONDITION IS MET
    %% Matlab issue: End-Condition is an "array" of "arrays", but if only one element, will be treated as a single "array" by default...
    %%      Therefore, need to check first if "iscell" == 0, then single-element array of structs. Else, 2D array (cell array of struct arrays).
    if (iscell(endConditions) == 1)
        endConditionReturnValue = false;
        endConditionReturnAND = false;
        for i = 1:length(endConditions)
            endConditionReturnAND = true;
            for k = 1:length(endConditions{i})
                if (strcmp(endConditions{i}(k).varName2, "") == true)
                    compareValue = endConditions{i}(k).value; 
                else
                    eval("compareValue = obj." + endConditions{i}(k).varName2 + ";");
                end
                if (strcmp(endConditions{i}(k).varName, "RTI_vTimestamp") == true)
              
                    if (strcmp(endConditions{i}(k).condition, "=") == true)
                        if (~(timestep == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions{i}(k).condition, "!=") == true)
                        if (~(timestep ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(timestep " + endConditions{i}(k).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                elseif (strcmp(endConditions{i}(k).varName, "RTI_stage") == true)
                    if (strcmp(endConditions{i}(k).condition, "=") == true)
                        if (~(stage == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions{i}(k).condition, "!=") == true)
                        if (~(stage ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(stage " + endConditions{i}(k).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                elseif (strcmp(endConditions{i}(k).varName, "RTI_stageVTimestepMul") == true)
                    if (strcmp(endConditions{i}(k).condition, "=") == true)
                        if (~(localTimestep == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions{i}(k).condition, "!=") == true)
                        if (~(localTimestep ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(localTimestep " + endConditions{i}(k).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                elseif (strcmp(endConditions{i}(k).varName, "RTI_stageVTimestep") == true)
                    compareVar = int32(localTimestep / timestep_mul);
                    if (strcmp(endConditions{i}(k).condition, "=") == true)
                        if (~(compareVar == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions{i}(k).condition, "!=") == true)
                        if (~(compareVar ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(compareVar " + endConditions{i}(k).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                else
                    if (strcmp(endConditions{i}(k).condition, "=") == true)
                        eval("if ~(obj." + endConditions{i}(k).varName + " == " + compareValue + "); endConditionReturnAND = false; end;");
                    elseif (strcmp(endConditions{i}(k).condition, "!=") == true)
                        eval("if ~(obj." + endConditions{i}(k).varName + " ~= " + compareValue + "); endConditionReturnAND = false; end;");
                    else
                        eval("if ~(obj." + endConditions{i}(k).varName + " " + endConditions{i}(k).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                end
            end 
            if (endConditionReturnAND == true)
                endConditionReturnValue = true; 
            end
        end
        if (endConditionReturnValue == true)
            endConditionMet = true;
            rtiLib.printLine("End condition successfully met. Should prepare to close this sim.");
            fprintf("End condition successfully met. Should prepare to close this sim. \n");
            rtiLib.publish("RTI_EndSystem", "");
        end
    else
        endConditionReturnValue = false;
        endConditionReturnAND = true;
        if (length(endConditions) == 0)
            endConditionReturnAND = false; 
        end
        for i = 1:length(endConditions)
                if (strcmp(endConditions(i).varName2, "") == true)
                    compareValue = endConditions(i).value; 
                else
                    eval("compareValue = obj." + endConditions(i).varName2 + ";");
                end
                if (strcmp(endConditions(i).varName, "RTI_vTimestamp") == true)
                    if (strcmp(endConditions(i).condition, "=") == true)
                        if (~(timestep == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions(i).condition, "!=") == true)
                        if (~(timestep ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(timestep " + endConditions(i).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                elseif (strcmp(endConditions(i).varName, "RTI_stage") == true)
                    if (strcmp(endConditions(i).condition, "=") == true)
                        if (~(stage == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions(i).condition, "!=") == true)
                        if (~(stage ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(stage " + endConditions(i).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end   
                elseif (strcmp(endConditions(i).varName, "RTI_stageVTimestepMul") == true)
                    if (strcmp(endConditions(i).condition, "=") == true)
                        if (~(localTimestep == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions(i).condition, "!=") == true)
                        if (~(localTimestep ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(localTimestep " + endConditions(i).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end     
                elseif (strcmp(endConditions(i).varName, "RTI_stageVTimestep") == true)
                    compareVar = int32(localTimestep / timestep_mul);
                    if (strcmp(endConditions(i).condition, "=") == true)
                        if (~(compareVar == compareValue))
                            endConditionReturnAND = false;
                        end
                    elseif (strcmp(endConditions(i).condition, "!=") == true)
                        if (~(compareVar ~= compareValue))
                            endConditionReturnAND = false;
                        end
                    else
                        eval("if ~(compareVar " + endConditions(i).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end   
                else
                    if (strcmp(endConditions(i).condition, "=") == true)
                        eval("if ~(obj." + endConditions(i).varName + " == " + compareValue + "); endConditionReturnAND = false; end;");
                    elseif (strcmp(endConditions(i).condition, "!=") == true)
                        eval("if ~(obj." + endConditions(i).varName + " ~= " + compareValue + "); endConditionReturnAND = false; end;");
                    else
                        eval("if ~(obj." + endConditions(i).varName + " " + endConditions(i).condition + " " + compareValue + "); endConditionReturnAND = false; end;");
                    end
                end
        end
        if (endConditionReturnAND == true)
            endConditionReturnValue = true; 
        end
        if (endConditionReturnValue == true)
            endConditionMet = true;
            rtiLib.printLine("End condition successfully met. Should prepare to close this sim.");
            fprintf("End condition successfully met. Should prepare to close this sim. \n");
            rtiLib.publish("RTI_EndSystem", "");
        end
    end

    
    %% CHECK IF STAGE-CONDITION IS MET
    differentStage = stage;
    if (iscell(stageConditions) == 1)
        stageConditionReturnAND = true;
        for i = 1:length(stageConditions)
            stageConditionReturnAND = true;
            for k = 1:length(stageConditions{i})
                if (strcmp(stageConditions{i}(k).varName2, "") == true)
                    compareValue = stageConditions{i}(k).value; 
                else
                    eval("compareValue = obj." + stageConditions{i}(k).varName2 + ";");
                end
                if (stageConditions{i}(k).oldStage == stage)
                    if (strcmp(stageConditions{i}(k).varName, "RTI_vTimestamp") == true)
                        if (strcmp(stageConditions{i}(k).condition, "=") == true)
                            if (timestep == compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions{i}(k).condition, "!=") == true)
                            if (timestep ~= compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (timestep " + stageConditions{i}(k).condition + " " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        end
                    elseif (strcmp(stageConditions{i}(k).varName, "RTI_stage") == true)
                        if (strcmp(stageConditions{i}(k).condition, "=") == true)
                            if (stage == compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions{i}(k).condition, "!=") == true)
                            if (stage ~= compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (stage " + stageConditions{i}(k).condition + " " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        end   
                    elseif (strcmp(stageConditions{i}(k).varName, "RTI_stageVTimestepMul") == true)
                        if (strcmp(stageConditions{i}(k).condition, "=") == true)
                            if (localTimestep == compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions{i}(k).condition, "!=") == true)
                            if (localTimestep ~= compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (localTimestep " + stageConditions{i}(k).condition + " " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        end    
                    elseif (strcmp(stageConditions{i}(k).varName, "RTI_stageVTimestep") == true)
                        compareVar = int32(localTimestep / timestep_mul);
                        if (strcmp(stageConditions{i}(k).condition, "=") == true)
                            if (compareVar == compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions{i}(k).condition, "!=") == true)
                            if (compareVar ~= compareValue)
                                differentStage = stageConditions{i}(k).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (compareVar " + stageConditions{i}(k).condition + " " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        end    
                    else
                        if (strcmp(stageConditions{i}(k).condition, "=") == true)
                            eval("if (obj." + stageConditions{i}(k).varName + " == " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        elseif (strcmp(stageConditions{i}(k).condition, "!=") == true)
                            eval("if (obj." + stageConditions{i}(k).varName + " ~= " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        else
                            eval("if (obj." + stageConditions{i}(k).varName + " " + stageConditions{i}(k).condition + " " + compareValue + "); differentStage = " + stageConditions{i}(k).newStage + "; else; stageConditionReturnAND = false; end;");
                        end
                    end
                end
            end 
            if (stageConditionReturnAND == false)
                differentStage = stage; 
            end
        end
    else
        stageConditionReturnAND = true;
        for i = 1:length(stageConditions)
            if (strcmp(stageConditions(i).varName2, "") == true)
                compareValue = stageConditions(i).value; 
            else
                eval("compareValue = obj." + stageConditions(i).varName2 + ";");
            end
            stageConditionReturnAND = true;
                if (stageConditions(i).oldStage == stage)
                    if (strcmp(stageConditions(i).varName, "RTI_vTimestamp") == true)
                        if (strcmp(stageConditions(i).condition, "=") == true)
                            if (timestep == compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions(i).condition, "!=") == true)
                            if (timestep ~= compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (timestep " + stageConditions(i).condition + " " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        end
                    elseif (strcmp(stageConditions(i).varName, "RTI_stage") == true)
                        if (strcmp(stageConditions(i).condition, "=") == true)
                            if (stage == compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions(i).condition, "!=") == true)
                            if (stage ~= compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (stage " + stageConditions(i).condition + " " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        end
                    elseif (strcmp(stageConditions(i).varName, "RTI_stageVTimestepMul") == true)
                        if (strcmp(stageConditions(i).condition, "=") == true)
                            if (localTimestep == compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions(i).condition, "!=") == true)
                            if (localTimestep ~= compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (localTimestep " + stageConditions(i).condition + " " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        end   
                    elseif (strcmp(stageConditions(i).varName, "RTI_stageVTimestep") == true)
                        compareVar = int32(localTimestep / timestep_mul);
                        if (strcmp(stageConditions(i).condition, "=") == true)
                            if (compareVar == compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        elseif (strcmp(stageConditions(i).condition, "!=") == true)
                            if (compareVar ~= compareValue)
                                differentStage = stageConditions(i).newStage;
                            else
                                stageConditionReturnAND = false;
                            end
                        else
                            eval("if (compareVar " + stageConditions(i).condition + " " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        end    
                    else
                        if (strcmp(stageConditions(i).condition, "=") == true)
                            eval("if (obj." + stageConditions(i).varName + " == " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        elseif (strcmp(stageConditions(i).condition, "!=") == true)
                            eval("if (obj." + stageConditions(i).varName + " ~= " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        else
                            eval("if (obj." + stageConditions(i).varName + " " + stageConditions(i).condition + " " + compareValue + "); differentStage = " + stageConditions(i).newStage + "; else; stageConditionReturnAND = false; end;");
                        end
                    end
                end
            if (stageConditionReturnAND == false)
                differentStage = stage; 
            end
        end
    end
    if (differentStage ~= stage)
        finishContent = rtiLib.setJsonObject("", "nextStage", int32(differentStage));
        rtiLib.printLine("[WRAPPER] Stage condition successfully met. Transition will occur from Server at next step.");
        fprintf("Stage condition successfully met. Transition will occur from Server at next step. \n");
        rtiLib.publish("RTI_UpdateStage", finishContent);
        %%stage = differentStage;
    end

    
    %% Calculate next timestep
    next_timestep = timestep;
    %%localTimestep = timestep;
    if (timestep_var_delta ~= "")
        eval("next_timestep = timestep + round(obj." + timestep_var_delta + " * timestep_mul);");
        eval("localTimestep = localTimestep + round(obj." + timestep_var_delta + " * timestep_mul);");
    else
       next_timestep = timestep + round(timestep_delta * timestep_mul);
       localTimestep = localTimestep + round(timestep_delta * timestep_mul);
    end
    if (timestep_delta == -1 && timestep_var_delta == "")
       next_timestep = -1;
    end
    % Send "FinishStep" notification to RTI Server
    finishContent = rtiLib.setJsonObject("", "nextStep", int32(next_timestep));
    finishContent = rtiLib.setJsonObject(finishContent, "nextOrder", int32(next_order));
    rtiLib.publish("RTI_FinishStep", finishContent);
    
    if (configVal.dataOutFile == true)
       %% TODO 
    end
    
    gstep = gstep + 1;
    
    %% CHECK IF END-CONDITION WAS MET AGAIN, TO FORCE BREAK HERE
    if (endConditionMet == true)
        break;
    end
    
end

rtiLib.disconnect();

rtiLib.printLine("[WRAPPER] Ending SRTI clients with third-party simulations.");
fprintf("This Wrapper and simulator has disconnected from RTI Server safely, and has now ended.");

end