function SRTI_Wrapper()

%% read input configuration files

fprintf('Starting SRTI Wrapper for Matlab. Reading settings files... \n');

settingsName = 'Settings.json';
settingsVal = jsondecode(fileread(settingsName));
globalName = settingsVal.global;
globalVal = jsondecode(fileread(globalName));
configName = settingsVal.configuration;
configVal = jsondecode(fileread(configName));

%obj = TestSim_01;
eval("obj = " + configVal.simulatorName + ";");

fprintf('length of subscribedMessages = %d \n', length(configVal.subscribedChannels));
fprintf('Successfully read input settings files. \n');




%% connect to SRTI Server with RTILib API

fprintf('Starting RTILib, connecting to server. \n');

javaaddpath SRTI_v062.jar;
import mainServer.*;
rtiLib = RTILib();
rtiLib.setDebugOutput(true);
rtiLib.setSimName(configVal.simulatorName);
rtiLib.connect(configVal.hostName, configVal.portNumber);

fprintf('RTILib successfully connected to server.\n');



subChannelNames = fieldnames(configVal.subscribedChannels(1));
pubChannelNames = fieldnames(configVal.publishedChannels(1));

%% subscribe to messages
for i = 1:length(subChannelNames)
    rtiLib.subscribeToMessagePlusHistory(subChannelNames(i));
end

%% receive one-time messages, required before starting anything
for i = 1:length(subChannelNames)   
   subChannel = getfield(configVal.subscribedChannels(1), char(subChannelNames(i)));
   if subChannel.oneTime == true
        nextMessage = rtiLib.waitForNextMessage(subChannelNames(i));
        if ~isempty(nextMessage)
            %% get message data, set simulator variables
            for j = 1:length(subChannel.varChannel)                 
                 subChannelOb = subChannel.varChannel(j);
                 subChannelObValue = subChannelOb.valueName;
                 subChannelObVar = subChannelOb.varName;
                 setValueJson = jsondecode(char(nextMessage));
                 setValueContentJson = jsondecode(setValueJson.content);
                 eval ("setValue = " + "setValueContentJson." + subChannelObValue + ";");
                 eval("obj." + subChannelObVar + " = " + setValue + ";");
            end
        end
   end
end

%% run initialize function to prepare data from simulator side
eval("obj." + configVal.initializeFunction + "();");

%% send first one-time messages, if required for other simulators to proceed
for i = 1:length(pubChannelNames)
   pubChannel = getfield(configVal.publishedChannels(1), char(pubChannelNames(i)));
   if pubChannel.initial == true
       setValueTotalString = "";
       for j = 1:length(pubChannel.varChannel)
           pubChannelOb = pubChannel.varChannel(j);
           pubChannelObValue = pubChannelOb.valueName;
           pubChannelObVar = pubChannelOb.varName;

           eval ("setValue = " + "obj." + pubChannelObVar + ";");
           
           setValueTotalString = setValueTotalString + '''' + pubChannelObValue + '''' + ", " + setValue;
           if j ~= length(pubChannel.varChannel)
              setValueTotalString = setValueTotalString + ", "; 
           end
       end
       eval ("setValueTotal = struct(" + setValueTotalString + ");");
       setValueJson = jsonencode(setValueTotal);
       rtiLib.publish(pubChannelNames(i), setValueJson);
   end
end



fprintf("Now running listener loop... \n");

while true
    %% received subscribed messages
    for i = 1:length(subChannelNames)
        subChannel = getfield(configVal.subscribedChannels(1), char(subChannelNames(i)));
        %% don't receive one-time messages again (these are meant to be for initialize-content)
        if subChannel.oneTime == false
            nextMessage = rtiLib.waitForNextMessage(subChannelNames(i));
            if ~isempty(nextMessage)
                for j = 1:length(subChannel.varChannel)
                     subChannelOb = subChannel.varChannel(j);
                     subChannelObValue = subChannelOb.valueName;
                     subChannelObVar = subChannelOb.varName;
                     setValueJson = jsondecode(char(nextMessage));
                     setValueContentJson = jsondecode(setValueJson.content);
                     eval ("setValue = " + "setValueContentJson." + subChannelObValue + ";");
                     eval("obj." + subChannelObVar + " = " + setValue + ";");
                end
            end
        end
    end
    
    %% simulate one time step on simulator
    eval("obj." + configVal.simulateFunction + "();");
    
    %% publish messages to SRTI Server
    for i = 1:length(pubChannelNames)
       pubChannel = getfield(configVal.publishedChannels(1), char(pubChannelNames(i)));
       setValueTotalString = "";
       for j = 1:length(pubChannel.varChannel)
           pubChannelOb = pubChannel.varChannel(j);
           pubChannelObValue = pubChannelOb.valueName;
           pubChannelObVar = pubChannelOb.varName;

           eval ("setValue = " + "obj." + pubChannelObVar + ";");
           
           setValueTotalString = setValueTotalString + '''' + pubChannelObValue + '''' + ", " + setValue;
           if j ~= length(pubChannel.varChannel)
              setValueTotalString = setValueTotalString + ", "; 
           end
       end
       eval ("setValueTotal = struct(" + setValueTotalString + ");");
       setValueJson = jsonencode(setValueTotal);
       rtiLib.publish(pubChannelNames(i), setValueJson);
    end
end

rtiLib.disconnect();

end