
class RTILib:

    # name of sim (used as identifier on RTI Server side)
    simName = "<<default sim name>>";

    # socket connection to main RTI Server thread, and to dedicated socket to listen/receive direct messages
    import socket;
    rtiSocket = 0;
    dedicatedRtiSocket = 0;
    # thread for dedicated RTI Server communication
    import threading;
    readThread = 0;
    import json;
    import time;
    from time import sleep;

    class Message:
        name = "";
        timestamp = "";
        vTimestamp = "";
        source = "";
        content = "";
        originalMessage = "";

        #def __lt__(self, other):
        #    return self.vTimestamp < other.vTimestamp;

        #def __gt__(self, other):
        #    return self.vTimestamp > other.vTimestamp;

        #def __eq__(self, other):
        #    if (self == None and other == None):
        #        return True;
        #    if (self == None and other != None):
        #        return False;
        #    if (self != None and other == None):
        #        return False;
        #    return self.vTimestamp == other.vTimestamp;
    messageQueue = [];

    # settings properties, requires calling function to set property from simulator code
    settingsExists = -1;    # -1 = file doesn't exist, 0 = file doesn't exist but defaults are overwritten by RTIServer, 1 = file exists and defaults are overwritten 
    tcpOn = False;
    lastHostName = "";
    lastPortNumber = "";
    # for reference, save the message names we are subscribing to (if we need to reconnect, we want to subscribe again)
    subscribeHistory = [];
    # boolean to confirm if messages were received recently
    serverMessagesReceived = False;

    vTimestamp = 0;

    def __init__(self):
        self.thisSim = None;

    def setSimName(self, newName):
        self.simName = newName;

    def setTcpOn(self, tcp):
        self.settingsExists = 1;
        self.tcpOn = tcp;
        # TODO: need to initialize a thread-timer, to check if messages were received every 5 seconds.

    def setReconnectTimeLimit(self, timeLimit):
        if (timeLimit <= 0):
            return 0;
        # TODO: need to initialize a thread-timer, to check if messages were received every 'timeLimit' seconds.

    def setNewVTimestamp(self, newVT):
        self.vTimestamp = newVT;

    def connect(self):
        self.printLine("asked to connect without a hostName or portNumber... can't really do anything, then.");

    def connect(self, hostName, portNumber):
        self.printLine("trying to connect now...");

        try:
            self.lastHostName = hostName;
            self.lastPortNumber = portNumber;
            self.rtiSocket = self.socket.socket(self.socket.AF_INET, self.socket.SOCK_STREAM);
            self.rtiSocket.connect((self.lastHostName, int(self.lastPortNumber)));

            inReader = self.rtiSocket.makefile('r');
            dedicatedHost = inReader.readline();
            dedicatedHost = self.lastHostName;
            dedicatedPort = inReader.readline();
            self.printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);

            self.dedicatedRtiSocket = self.socket.socket(self.socket.AF_INET, self.socket.SOCK_STREAM);
            self.dedicatedRtiSocket.connect((dedicatedHost, int(dedicatedPort)));

            self.serverMessagesReceived = True;

            # syntax: readThread = threading.Thread(target=RTISimConnectThread.function1, args=(k,))
            # see: https://www.w3schools.in/python-tutorial/multithreaded-programming/
            from pydoc import locate;
            # self.readThread = RTISimConnectThread(this, self.dedicatedRtiSocket);
            # self.readThread = locate("RTISimConnectThread.RTISimConnectThread")(self, self.dedicatedRtiSocket);
            rtiSimConnectThread = locate("RTISimConnectThread.RTISimConnectThread")(self, self.dedicatedRtiSocket);
            self.readThread = self.threading.Thread(target=rtiSimConnectThread.run, args=());
            self.readThread.start();

            jsonObj = {"simName": self.simName};
            jsonOb = self.json.dumps(jsonObj);
            # jsonOb = self.json.dumps("simName", self.simName);
            self.publish("RTI_InitializeSim", jsonOb);

            inReader.close();

            self.printLine("Connected successfully.");
        except Exception as e:
            self.printLine("Error occurred when trying to connect. " + str(e));
        return 0;

    def reconnect(self):

        self.printLine("Trying to reconnect now.");
        try:
            self.rtiSocket.close();
            self.rtiSocket = self.socket.socket(self.socket.AF_INET, self.socket.SOCK_STREAM);
            self.rtiSocket.connect((self.lastHostName, int(self.lastPortNumber)));

            inReader = self.rtiSocket.makefile('r');
            dedicatedHost = inReader.readline();
            dedicatedHost = self.lastHostName;
            dedicatedPort = inReader.readline();
            self.printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);

            self.dedicatedRtiSocket = self.socket.socket(self.socket.AF_INET, self.socket.SOCK_STREAM);
            self.dedicatedRtiSocket.connect((self.dedicatedHost, int(self.dedicatedPort)));

            self.serverMessagesReceived = True;

            # syntax: readThread = threading.Thread(target=RTISimConnectThread.function1, args=(k,))
            # see: https://www.w3schools.in/python-tutorial/multithreaded-programming/
            from pydoc import locate;
            # self.readThread = RTISimConnectThread(this, self.dedicatedRtiSocket);
            rtiSimConnectThread = locate("RTISimConnectThread.RTISimConnectThread")(self, self.dedicatedRtiSocket);
            self.readThread = self.threading.Thread(target=rtiSimConnectThread.run, args=());
            self.readThread.start();

            jsonObj = {"simName": self.simName};
            jsonOb = self.json.dumps(jsonObj);
            #jsonOb = self.json.dumps("simName", self.simName);
            self.publish("RTI_InitializeSim", jsonOb);

            inReader.close();

            self.printLine("Connected successfully.");

            for i in range(0, len(self.subscribeHistory)):
                jsonObj = {"subscribeTo": self.subscribeHistory[i]};
                jsonOb = self.json.dumps(jsonObj);
                # jsonOb = self.json.dumps("subscribeTo", self.subscribeHistory[i]);
                self.publish("RTI_SubscribeToMessagePlusLatest", jsonOb);

        except Exception as e:
            self.printLine("Error occurred when trying to reconnect. " + str(e));
        
        return 0;

    def reconnect(self, lastMessageName, lastMessageContent):
        # TODO: this function is used if 'tcpOn == True', to reconnect if message wasn't sent properly.
        # But for now, this feature is not implemented in Python RTILib.
        return 0;

    def disconnect(self):
        self.readThread.closeConnection();
        return 0;

    def subscribeTo(self, messageName):
        jsonObj = {"subscribeTo": messageName};
        jsonOb = self.json.dumps(jsonObj);
        self.publish("RTI_SubscribeTo", jsonOb);
        
        self.subscribeHistory.append(messageName);
        return 0;

    def subscribeToMessagePlusHistory(self, messageName):
        jsonObj = {"subscribeTo": messageName};
        jsonOb = self.json.dumps(jsonObj);
        self.publish("RTI_SubscribeToMessagePlusHistory", jsonOb);
        
        self.subscribeHistory.append(messageName);
        return 0;

    def subscribeToMessagePlusLatest(self, messageName):
        jsonObj = {"subscribeTo": messageName};
        jsonOb = self.json.dumps(jsonObj);
        self.publish("RTI_SubscribeToMessagePlusLatest", jsonOb);
        
        self.subscribeHistory.append(messageName);
        return 0;
        
    def subscribeToAll(self):
        self.publish("RTI_SubscribeToAll", "");
        return 0;

    def subscribeToAllPlusHistory(self):
        self.publish("RTI_SubscribeToAllPlusHistory", "");
        return 0;

    def publishTo(self, messageName):
        jsonObj = {"publishTo": messageName};
        jsonOb = self.json.dumps(jsonObj);
        #jsonOb = self.json.dumps("publishTo", messageName);
        self.publish("RTI_PublishTo", jsonOb);
        return 0;

    def publish(self, name, content):
        self.printLine("\t\t\t PUBLISH THIS: " + name);
        try:
            timestamp = int(round(self.time.time() * 1000));
            json_data = {
                "name": name,
                "content": content,
                "timestamp": str(timestamp),
                "vTimestamp": str(self.vTimestamp),
                "source": self.simName,
                "tcp": str(self.tcpOn)
                };
            jsonOb = self.json.dumps(json_data);
            sendOb = jsonOb + "\n";
            self.dedicatedRtiSocket.send(sendOb.encode());
        except Exception as e:
            self.printLine("    When trying to send message, exception error happened here. " + str(e));
            
        return 0;

    def receivedMessage(self, message):
        name = "";
        content = "";
        timestamp = "";
        vTimestamp = "";
        source = "";
        tcp = "";

        self.severMessagesReceived = True;

        jsonOb = self.json.loads(message);
        name = jsonOb["name"];
        content = jsonOb["content"];
        timestamp = jsonOb["timestamp"];
        vTimestamp = jsonOb["vTimestamp"];
        source = jsonOb["source"];
        tcp = jsonOb["tcp"];

        if (name == "RTI_ReceivedMessage"):
            # TODO: setTcpResponse(true, content)   (tcp feature not currently added in Python RTILib)
            return 0;

        if (self.settingsExists == -1):
            if (tcp == "True"):
                self.tcpOn = True;
                self.settingsExist = 0;
                self.publish("RTI_ReceivedMessage", message);

                # TODO: start thread to check in 5 seconds that message was received.
        else:
            if (tcp == "True"):
                self.publish("RTI_ReceivedMessage", message);


        newMessage = self.Message();
        newMessage.name = name;
        newMessage.content = content;
        newMessage.timestamp = timestamp;
        newMessage.vTimestamp = vTimestamp;
        newMessage.source = source;
        newMessage.originalMessage = message;
        self.messageQueue.append(newMessage);
        self.printLine("Received new message, messageQueue now has this many: " + str(len(self.messageQueue)));
        
        return 0;


    def getNextMessage(self):
        returnString = "";
        self.printLine("getNextMessage() called...");
        if (len(self.messageQueue) == 0):
            returnString = "";
            self.printLine("getNextMessage is null.");
        else:
            debugLine = "";
            # for i in range(0,len(messageQueue)):
            #     try:

            #     except:
            self.printLine("queue before checking message: size = " + str(len(self.messageQueue)));

            try:
                if (self.messageQueue[0] != None and self.messageQueue[0].originalMessage != None):
                    self.printLine("getNextMessage was NOT null.");
                    returnString = self.messageQueue[0].originalMessage;
                    self.messageQueue.pop(0);
                else:
                    self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
            except Exception as e:
                self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");
                self.printLine(str(e));
        
        return returnString;

    def getNextMessageWait(self, millisToWait):
        returnString = "";
        self.printLine("getNextMessage() called...");

        for i in range(0, int(round(millisToWait * 0.10))):
            if (len(self.messageQueue) > 0):
                break;
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("while trying to get next message, some error happened. " + str(e));
        
        if (len(self.messageQueue) == 0):
            returnString = "";
            self.printLine("getNextMessage(millisToWait) is null.");
        else:
            debugLine = "";
            # for i in range(0,len(messageQueue)):
            #     try:

            #     except:
            self.printLine("queue before checking message: size = " + str(len(self.messageQueue)));

            try:
                if (self.messageQueue[0] != None and self.messageQueue[0].originalMessage != None):
                    self.printLine("getNextMessage was NOT null.");
                    returnString = self.messageQueue[0].originalMessage;
                    self.messageQueue.pop(0);
                else:
                    self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
            except Exception as e:
                self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");        

        
        return returnString;


    def getNextMessage(self, messageName):
        returnString = "";
        self.printLine("getNextMessage() called...");
        if (len(self.messageQueue) == 0):
            returnString = "";
            self.printLine("getNextMessage is null.");
        else:
            debugLine = "";
            # for i in range(0,len(messageQueue)):
            #     try:

            #     except:
            self.printLine("queue before checking message: size = " + str(len(self.messageQueue)));

            for i in range(0, len(self.messageQueue)):
                try:
                    if (self.messageQueue[i].name == messageName):
                        if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                            self.printLine("getNextMessage was NOT null.");
                            returnString = self.messageQueue[i].originalMessage;
                            self.messageQueue.pop(i);
                            break;
                        else:
                            self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
                except Exception as e:
                    self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");        
                    self.printLine(str(e));
                    
        return returnString;

    def getNextMessageWait(self, messageName, millisToWait):
        returnString = "";
        self.printLine("getNextMessage() called...");

        for j in range(0, int(round(millisToWait * 0.10))):
            if (len(self.messageQueue) > 0):
                for i in range(0, len(self.messageQueue)):
                    try:
                        if (self.messageQueue[i].name == messageName):
                            if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                                self.printLine("getNextMessage was NOT null.");
                                returnString = self.messageQueue[i].originalMessage;
                                self.messageQueue.pop(i);
                                break;
                            else:
                                self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
 
                    except Exception as e:
                        self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");  
                        self.printLine(str(e));
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("while trying to get next message, some error happened.");
                self.printLine(str(e));

            if (returnString != ""):
                break;
        
        return returnString;

    def getNextMessage(self, messageName, millisToWait, code, maxTimestep):
        returnString = "";

        if (code == 0):
            # 0 = get oldest message of 'messageName' from queue
            returnString = self.getNextMessageWait(messageName, millisToWait);
        elif (code == 1):
            # 1 = get newest message of 'messageName' from queue, remove all others
            returnString = self.getNextNewestMessage(messageName, millisToWait);
        elif (code == 2):
            # 2 = get newest message where vTimestamp < maxTimestep, remove all previous less than maxTimestep
            returnString = self.getNextNewestMessageLessThan(messageName, millisToWait, maxTimestep);
        elif (code == 3):
            # 3 = get newest message where vTimestamp > maxTimestep, remove all previous
            returnString = self.getNextNewestMessageGreaterThan(messageName, millisToWait, maxTimestep);
        elif (code == 4):
            # 4 = get newest message where vTimestamp == maxTimestep, remove all previous less than maxTimestep
            returnString = self.getNextNewestMessageGreaterThan(messageName, millisToWait, maxTimestep);
        elif (code == 5):
            # 5 = pass al exiting messages to simulator (not viable with current design of 'Wrapper')
            returnString = "";
            
        return returnString;

    def getNextNewestMessage(self, messageName, millisToWait): 
        returnString = "";
        self.printLine("getNextMessage() called...");

        for j in range(0, int(round(millisToWait * 0.10))):
            if (len(self.messageQueue) > 0):
                for i in range(0, len(self.messageQueue)):
                    try:
                        if (self.messageQueue[i].name == messageName):
                            if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                                self.printLine("getNextMessage was NOT null.");
                                returnString = self.messageQueue[i].originalMessage;
                                self.messageQueue.pop(i);
                                i = i - 1;
                                # break;
                            else:
                                self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
 
                    except Exception as e:
                        self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");  
                        self.printLine(str(e));
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("while trying to get next message, some error happened.");
                self.printLine(str(e));

            if (returnString != ""):
                break;
        
        return returnString;

    def getNextNewestMessageLessThan(self, messageName, millisToWait, virtualT):
        returnString = "";
        self.printLine("getNextMessage() called...");

        for j in range(0, int(round(millisToWait * 0.10))):
            if (len(self.messageQueue) > 0):
                for i in range(0, len(self.messageQueue)):
                    try:
                        if (self.messageQueue[i].name == messageName and int(self.messageQueue[i].vTimestamp) < virtualT):
                            if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                                self.printLine("getNextMessage was NOT null.");
                                returnString = self.messageQueue[i].originalMessage;
                                self.messageQueue.pop(i);
                                i = i - 1;
                                # break;
                            else:
                                self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
 
                    except Exception as e:
                        self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");  
                        self.printLine(str(e));
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("while trying to get next message, some error happened.");
                self.printLine(str(e));

            if (returnString != ""):
                break;
        
        return returnString;

    def getNextNewestMessageGreaterThan(self, messageName, millisToWait, virtualT):
        returnString = "";
        self.printLine("getNextMessage() called...");

        for j in range(0, int(round(millisToWait * 0.10))):
            if (len(self.messageQueue) > 0):
                for i in range(0, len(self.messageQueue)):
                    try:
                        if (self.messageQueue[i].name == messageName and int(self.messageQueue[i].vTimestamp) > virtualT):
                            if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                                self.printLine("getNextMessage was NOT null.");
                                returnString = self.messageQueue[i].originalMessage;
                                self.messageQueue.pop(i);
                                i = i - 1;
                                # break;
                            else:
                                self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
                        elif (self.messageQueue[i].name == messageName):
                            self.messageQueue.pop(i);
                            i = i - 1;
                    except Exception as e:
                        self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(messageQueue)) +"... return nothing and continue without breaking sim.");  
                        self.printLine(str(e));
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("while trying to get next message, some error happened.");
                self.printLine(str(e));

            if (returnString != ""):
                break;
        
        return returnString;

    def waitForNextMessage(self):
        returnString = "";
        self.printLine("will immediately return message if there is one in the message buffer, else will wait until the queue gets a value.");
                            
        while (len(self.messageQueue) <= 0):
            returnString = "";                    

        if (self.messageQueue[0] != None and self.messageQueue[0].originalMessage != None):
            returnString = self.messageQueue[0].originalMessage;
            self.messageQueue.pop(0);
        else:
            self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
                        
                            
        return returnString;

    def waitForNextMessage(self, messageName):
        returnString = "";

        self.printLine("will immediately return message if there is one in the message buffer, else will wait until the queue gets a value.");
        while (returnString == ""):
            if (len(self.messageQueue) > 0):
                for i in range(0, len(self.messageQueue)):
                    try:
                        if (self.messageQueue[i].name == messageName):
                            if (self.messageQueue[i] != None and self.messageQueue[i].originalMessage != None):
                                returnString = self.messageQueue[i].originalMessage;
                                self.messageQueue.pop(i);
                                break;
                            else:
                                self.printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
                    except Exception as e:
                        self.printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index 0 out of "+ str(len(self.messageQueue)) +"... return nothing and continue without breaking sim.");
                        self.printLine(str(e));
            try:
                self.sleep(0.01);
            except Exception as e:
                self.printLine("some exception occurred during waitForNextMessage(messageName)");
                self.printLine(str(e));

        return returnString;


    def getMessageName(self, originalMessage):
        returnString = "";
        jsonOb = self.json.loads(originalMessage);
        returnString = jsonOb["name"];
        return returnString;

    def getMessageTimestamp(self, originalMessage):
        returnString = "";
        jsonOb = self.json.loads(originalMessage);
        returnString = jsonOb["timestamp"];
        return returnString;

    def getMessageVTimestamp(self, originalMessage):
        returnString = "";
        jsonOb = self.json.loads(originalMessage);
        returnString = jsonOb["vTimestamp"];
        return returnString;

    def getMessageSource(self, originalMessage):
        returnString = "";
        jsonOb = self.json.loads(originalMessage);
        returnString = jsonOb["source"];
        return returnString;

    def getMessageContent(self, originalMessage):
        returnString = "";
        jsonOb = self.json.loads(originalMessage);
        returnString = jsonOb["content"];
        return returnString;

    def setJsonObject(self, originalJson, nameNewObject, contentNewObject):
        returnString = "";

        if (isinstance(contentNewObject,str) == False):
            contentNewObject = str(contentNewObject);

        if (originalJson == ""):
            newJson = {};
        else:
            newJson = self.json.loads(originalJson);
        newJson[nameNewObject] = contentNewObject;
        returnString = self.json.dumps(newJson);

        return returnString;

    def setDebugOutput(self, setDebugOut):
        return 0;

    def setDebugFileOutput(self, setFileDebugOut):
        return 0;

    def setDebugGUI(self, setGUIOut):
        return 0;

    def printLine(self, line):
        print("[RTILib] " + line);
        return 0;





                            
