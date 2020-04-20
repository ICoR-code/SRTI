
class RTISimConnectThread:

    threadIndexTotal = 0;
    threadIndex = 0;
    tag = "RTISimConnectThread";
    hostName = "localHost";
    portNumber = 42;
    rtiSocket = None;
    rtiLib = None;

    def __init__(self, rtiLib, rtiSocket):
        self.threadIndex = RTISimConnectThread.threadIndexTotal;
        RTISimConnectThread.threadIndexTotal = RTISimConnectThread.threadIndexTotal + 1;

        self.rtiLib = rtiLib;
        self.rtiSocket = rtiSocket;
    
    isConnected = True;
    def run(self):
        self.printLine("Connected to dedicated socket! Now running thread to receive new messages!");
        try:
            inReader = self.rtiSocket.makefile('r');
            self.continuousInput(inReader);
        except Exception as e:
            self.printLine(" Exception (some error trying to open the bufferedreader from the RTI...)");
            self.printLine(str(e));
            
    crashTimeInMillis = 0;
    numOfRTICrash = 0;
    def continuousInput(self, inp):
        try:
            self.printLine("Connected to dedicated socket! Now running thread to receive new messages!");
            from time import sleep;
            #sleep(1);

            userInput = inp.readline();
            #userInput = str(userInput);
            #self.printLine(userInput);
            #print("RECEIVED MESSAGE: ");
            #print(userInput);
            #print("THAT WAS RECEIVED MESSAGE.");
            #self.printLine(type(userInput).__name__);
            #print(type(userInput));
            #print(len(userInput));
            userInputOut = "(" + str(len(userInput)) + ") " + userInput;
            if (len(userInput) > 1000):
                userInputOut = "(" + str(len(userInput)) + ") " + userInput[:1000];
            self.printLine("had read first line, received input = " + userInputOut);
            while (self.isConnected == True and len(userInput) > 0):
                self.rtiLib.receivedMessage(userInput);
                self.printLine("ready to read...");
                userInput = inp.readline();
                userInput = str(userInput);
                userInputOut = "{" + str(len(userInput)) + ") " + userInput;
                if (len(userInput) > 1000):
                    userInputOut = "(" + str(len(userInput)) + ") " + userInput[:1000];
                self.printLine("had read, received input = " + userInputOut);
        except Exception as e:
            self.disconnectedErr = "... some error.";
            self.printLine(str(e));
            
        # normally assume crash if it occurs frequently within few seconds, but for simplicity, time limit is ignored in Python version.
        self.numofRTICrash = self.numOfRTICrash + 1;
        if (self.isConnected == True):
            if (self.numOfRTICrash >= 3):
                self.printLine("Something serious is wrong with the connection to the RTI. Shut down the thread.");
                self.rtiLib.reconnect();
            else:
                self.continuousInput(inp);
                return 0;

        try:
            inp.close();
        except Exception as e:
            self.printLine("Some last-minute error when trying to close the socket to the RTI Server.");
            self.printLine(str(e));
            
    disconnectedErr = "";
    def getDisconnectedErr(self):
        returnString = "";
        if (len(self.disconnectedErr) > 0):
            returnString = self.disconnectedErr;
            self.disconnectedErr = "";
        return returnString;
    
        
    def closeConnection(self):
        try:
            self.printLine("closing connection to RTI.");
            self.isConnected = False;
            self.rtiSocket.close();
        except:
            self.printLine("Error occurred when trying to close connection to the RTI.");
        return 0;



    def printLine(self, line):
        print("[RTISimConnectThread] " + line);
        return 0;
