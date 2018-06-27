package mainServer;

/* ExampleServer.java
 * 
 * - main class for "RTI Server" module of SRTI.
 * 
 * */

import java.io.BufferedReader;
import java.io.File;
import java.io.FileFilter;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.StringReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonReader;

public class ExampleServer {

	// When opening executable .jar file, this function is called, controls starting RTIServer.
	public static void main(String args[]) {
		ExampleServer server = new ExampleServer();		

		// Handle reading "settings.txt" file (same folder location as .jar file) for optional parameters.
		server.loadSettingsFile();
		
		server.startRTI();

		// If "guiOn" is true, also open instance of GUI class (treated as its own RTI Simulation). If "guiOn" is false, any feedback would be through console window (command prompt).
		if (server.guiOn == true) {
			ExampleServerGUI serverGUI = new ExampleServerGUI(server.getHostName(), server.getPortNumber());
			serverGUI.rtiLib.setDebugOutput(true);
		}
	}
	
	
	String tag = "ExampleServer";
	
	
	// settings from "settings.txt" file
	// (public hostname for sims to connect to RTI Server. Cannot be set, is based on computer and internet modem connection.)
	private String hostName = "localhost";
	// portNumber, if > 0, will try to open this port (if available), allows some flexibility in how to find the RTI Server.
	public int portNumber = -1;
	// set whether gui for RTI Server should be on.
	public boolean guiOn = true;
	// set whether "debug" console gui for RTI Server should be on (IMPLEMENTED AS OF 2018-06-27)
	public boolean debugGuiOn = false;
	// set whether all messages from RTI Server to a simulation requires a confirmation that it was received.
	public boolean tcpOn = false;
	// set whether messages from RTI Server are compressed before sending (NOT IMPLEMENTED AS OF 2018-06-01)
	public boolean compressOn = false;
	// set whether server will attempt to reconnect to sim if disconnected (NOT IMPLEMENTED AS OF 2018-06-01, NEEDS TO BE IMPLEMENTED ON CLIENT SIDE)
	public boolean retryConnection = false;
	// set message limit for active memory, if pass this limit, messages are cleared
	public int oldMessageLimit = -1;
	// set message limit for active memory, if pass limit, messages are stored in .txt file before clearing
	public boolean oldMessageArchive = false;
	// print debug lines to console while system is running
	public boolean debugConsole = false;
	// print debug lines to file while system is running
	public boolean debugFile = false;
	
	// individual threads, each dedicated to input/output to a specific connected simulation 
	// (this class handles main public port to allow sims to connect for first time)
	ArrayList<RTIConnectThread> threadList = new ArrayList<RTIConnectThread>();
	
	// a list that maintains all messages received, so the RTI Server can send older messages if necessary. 
	ArrayList<String> messageHistoryList = new ArrayList<String>();
	// messageHistoryList size in characters, provides more consistent archive performance
	int messageHistoryListSize = 0;
	
	// Load "settings.txt" to set certain options
	private int loadSettingsFile() {
		printLine("Trying to read settings file.");
		
		// "settings.txt" is expected to be in JSON format. If not, error may occur trying to open the file.
		JsonObject json;
		try {
			FileReader configStream = new FileReader("settings.txt");
			BufferedReader configBuffer = new BufferedReader(configStream);
			String jsonString = "";
			String line = "";
			while ((line = configBuffer.readLine()) != null) {
				jsonString += line;
			}
			jsonString = stringToJson(jsonString);
			JsonReader reader = Json.createReader(new StringReader(jsonString));
			json = reader.readObject();
			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
			printLine("Error trying to open settings.txt file (maybe doesn't exist or has bad format?), will proceed with default values.");
			return -1;
		}
		
		// Parse out individual values.
		// What if a value doesn't exist, or is in the wrong format? That's why we run a loop, so we try to read every value instead of allowing one to break the process.
		for (int i = 0; i < 11; i++) {
			try {				
				if (i == 0)
					portNumber = json.getJsonNumber("portNumber").intValue();
				else if (i == 1)
					guiOn = json.getBoolean("guiOn");
				else if (i == 2)
					tcpOn = json.getBoolean("tcpOn");
				else if (i == 3)
					compressOn = json.getBoolean("compressOn");
				else if (i == 4)
					retryConnection = json.getBoolean("retryConnection");
				else if (i == 5)
					oldMessageLimit = json.getJsonNumber("oldMessageLimit").intValue();
				else if (i == 6)
					debugConsole = json.getBoolean("debugConsole");
				else if (i == 7)
					debugFile = json.getBoolean("debugFile");
				else if (i == 8) 
					debugGuiOn = json.getBoolean("debugGuiOn");
				else if (i == 9)
					oldMessageArchive = json.getBoolean("oldMessageArchive");
			} catch (Exception e) {
				e.printStackTrace();
				printLine("Error trying to open value " + i + " from settings.txt file, will proceed with default value. Refer to source code to determine which variable caused issue.");
			}
		}
		Version.debugConsole = debugConsole;
		Version.debugFile = debugFile;
		Version.setDebugGUI(debugGuiOn);
		
		printLine("Finished reading settings file.");
		
		return 0;
	}
	
	
	// Convert string to json (all this does is remove '\n' characters from reading multi-line string from a file)
	private String stringToJson(String string) {
		String returnString = "";
		for (int i = 0; i < string.length(); i++) {
			if (string.charAt(i) != '\n') {
				returnString += string.charAt(i);
			}
		}
		return returnString;
	}
	
	
	// Start up the RTI Server.
	public int startRTI() {
				
		// for "oldMessageLimit," when starting the program, there might be old files storing message history.
		// REMOVE them to avoid confusion with new instance of the server (these are meant to be for backup while running, not for debugging archive).
		// (if multiple instances of RTI Server are being run at the same time, this logic might break ability to recall older messages)
		File currentDirectory = new File(".");
		File[] listOfFiles = currentDirectory.listFiles(new FilenameFilter() {
			public boolean accept(File directory, String fileName) {
				boolean startsWith = fileName.startsWith("messageHistoryList_");
				boolean endsWith = fileName.endsWith(".txt");
				return startsWith && endsWith;
			}
		});
		printLine("Found this many files starting with 'messagehistorylist_***.txt' : " + listOfFiles.length);
		for (int i = 0; i < listOfFiles.length; i++) {
			listOfFiles[i].delete();
		}
		
		// Open server socket.
		try {
			hostName = InetAddress.getLocalHost().getHostAddress();		//example format: "35.3.63.93"
			// if using "ipconfig" command on command prompt, can check your system's IPv4 Address = "35.3.63.93"
		} catch (Exception e) {
			printLine("... error here => " + e);
			return -1;
		}
		ServerSocket serverSocket;
		try {
			printLine("Try to create socket on this port: " + portNumber);
			if (portNumber == -1)
				serverSocket = new ServerSocket(0);
			else
				serverSocket = new ServerSocket(portNumber);
			portNumber = serverSocket.getLocalPort();
		} catch (IOException e1) {
			e1.printStackTrace();
			return -2;
		}
		
		printLine("This is an example GUI to show a RTI ('Really Thankful Interface'), which is similar to an RTI ('Real Time Interface') as described in an HLA system.");
		printLine("To connect a simulation to this RTI, please use the following credentials:\n"
				+ "\t hostname = " + hostName + "\n" 
				+ "\t\t (or you can use 'localhost' if running simulation on same computer as RTI)" + "\n" 
				+ "\t portnumber = " + portNumber);
		printLine("Opening socket connection.");
		
		// Open the thread to listen for new connection requests by simulations.
		RTIStartThread mainThread = new RTIStartThread(serverSocket);
		mainThread.start();
		
		return 0;
	}
	
	
	// Inner class to control active thread listening for new connections requests by simulations.
	public class RTIStartThread extends Thread{
		
		ServerSocket serverSocket;
		Socket rtiSocket;
		
		public RTIStartThread(ServerSocket serverSock) {
			serverSocket = serverSock;
		}
		
		public void run() {
			while (true) {
				try {
					printLine("Waiting for simulations to connect to me...");

					rtiSocket = serverSocket.accept();
					printLine("\t Connected!");
					
					RTIConnectThread connectThread = new RTIConnectThread(rtiSocket, this, tcpOn);
					connectThread.start();
					threadList.add(connectThread);
					
					printLine("\t Added thread to the list! Now sim size is: " + threadList.size());
				} catch (Exception e) {
					printLine("... error here when waiting for connections to server => " + e);
					try {
						serverSocket.close();
					} catch (IOException e1) {
						printLine("... error here when trying to force close the server socket => " + e1);
					}
				}
			}
		}
		
		
		// Shared function to handle received messages, and to send them out to other relevant connected simulations.
		public void handleReceivedMessage(int threadIndex, String message) {
			printLine("received message from index " + threadIndex + ": " + message);
			
			JsonReader reader = Json.createReader(new StringReader(message));
			JsonObject json = reader.readObject();
			
			String name = json.getString("name", "");
			String content = json.getString("content", "");
			boolean tcp = Boolean.parseBoolean(json.getString("tcp", "false"));
			
			if (tcp == true) {
				if (name.compareTo("RTI_ReceivedMessage") != 0) {
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {	
							threadList.get(i).update("RTI_ReceivedMessage", message);
						}
					}
				}
			}
			
			String rtiUpdateSimString = "";
			
			switch (name){
				case "RTI_ReceivedMessage":
					// Tell sim it received the message, it can stop waiting for response now.
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {	
							threadList.get(i).setTcpResponse(true, content);
						}
					}
					return;
				case "RTI_InitializeSim":
					printLine("received message, use info to intialize sim name...");
					
					String newSimName = Json.createReader(new StringReader(content)).readObject().getString("simName", "");
					int numOfDuplicates = 0;
					// WAIT! First check to see if there is already another sim with the same name, if so, then need to change the name
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getSimName().compareTo(newSimName) == 0) {
							numOfDuplicates++;
						}
					}
								
					// Update sim name to the appropriate thread
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {	
							threadList.get(i).updateSimName(newSimName);
							threadList.get(i).setNumOfSameName(numOfDuplicates);
						}
					}
					
					// by default, send out update of current thread list to everyone
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_PublishTo":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newPublishName = Json.createReader(new StringReader(content)).readObject().getString("publishTo", "");
							threadList.get(i).updatePublishTo(newPublishName);
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_SubscribeTo":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newSubscribeName = Json.createReader(new StringReader(content)).readObject().getString("subscribeTo", "");
							threadList.get(i).updateSubscribeTo(newSubscribeName);
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_SubscribeToAll":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							threadList.get(i).setSubscribeAll();
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_SubscribeToAllPlusHistory":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							threadList.get(i).setSubscribeAll();
							//additionally, must send all past messages to this one
							//start with files, then current memory
							File currentDirectory = new File(".");
							File[] listOfFiles = currentDirectory.listFiles(new FilenameFilter() {
								public boolean accept(File directory, String fileName) {
									boolean startsWith = fileName.startsWith("messageHistoryList_");
									boolean endsWith = fileName.endsWith(".txt");
									return startsWith && endsWith;
								}
							});
							for (int j = 0; j < listOfFiles.length; j++) {
								try {
									BufferedReader fileReader = new BufferedReader(new FileReader(listOfFiles[j].getName()));
									String readLine = "";
									readLine = fileReader.readLine();
									while (readLine != null){
										threadList.get(i).update(readLine);
										readLine = fileReader.readLine();
									}
									fileReader.close();
								} catch (Exception e) {
									e.printStackTrace();
									printLine("Some error when trying to read files to get old messages.");
								}
							}
							for (int j = 0; j < messageHistoryList.size(); j++) {
								threadList.get(i).update(messageHistoryList.get(j));
							}
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_SubscribeToMessagePlusHistory":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newSubscribeName = Json.createReader(new StringReader(content)).readObject().getString("subscribeTo", "");
							threadList.get(i).updateSubscribeTo(newSubscribeName);
							File currentDirectory = new File(".");
							File[] listOfFiles = currentDirectory.listFiles(new FilenameFilter() {
								public boolean accept(File directory, String fileName) {
									boolean startsWith = fileName.startsWith("messageHistoryList_");
									boolean endsWith = fileName.endsWith(".txt");
									return startsWith && endsWith;
								}
							});
							for (int j = 0; j < listOfFiles.length; j++) {
								try {
									BufferedReader fileReader = new BufferedReader(new FileReader(listOfFiles[j].getName()));
									String readLine = "";
									readLine = fileReader.readLine();
									while (readLine != null){										
										String name2 = Json.createReader(new StringReader(readLine)).readObject().getString("name", "");
										if (name2.compareTo(newSubscribeName) == 0) {
											threadList.get(i).update(readLine);
										}
										readLine = fileReader.readLine();
									}
									fileReader.close();
								} catch (Exception e) {
									e.printStackTrace();
									printLine("Some error when trying to read files to get old messages.");
								}
							}
							for (int j = 0; j < messageHistoryList.size(); j++) {
								String name2 = Json.createReader(new StringReader(messageHistoryList.get(j))).readObject().getString("name", "");
								if (name2.compareTo(newSubscribeName) == 0) {
									threadList.get(i).update(messageHistoryList.get(j));
								}
							}
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				case "RTI_SubscribeToMessagePlusLatest":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newSubscribeName = Json.createReader(new StringReader(content)).readObject().getString("subscribeTo", "");
							threadList.get(i).updateSubscribeTo(newSubscribeName);
							File currentDirectory = new File(".");
							File[] listOfFiles = currentDirectory.listFiles(new FilenameFilter() {
								public boolean accept(File directory, String fileName) {
									boolean startsWith = fileName.startsWith("messageHistoryList_");
									boolean endsWith = fileName.endsWith(".txt");
									return startsWith && endsWith;
								}
							});
							String messageHistoryLatest = "";
							String messageHistoryLatestTimestamp = "";
							for (int j = 0; j < listOfFiles.length; j++) {
								try {
									BufferedReader fileReader = new BufferedReader(new FileReader(listOfFiles[j].getName()));
									String readLine = "";
									readLine = fileReader.readLine();
									while (readLine != null){										
										JsonObject tempJsonObject = Json.createReader(new StringReader(readLine)).readObject();
										String name2 = tempJsonObject.getString("name", "");
										if (name2.compareTo(newSubscribeName) == 0) {
											if (messageHistoryLatest.length() <= 1) {
												messageHistoryLatest = readLine;
												messageHistoryLatestTimestamp = tempJsonObject.getString("timestamp");
											} else if (Long.parseLong(tempJsonObject.getString("timestamp")) > Long.parseLong(messageHistoryLatestTimestamp)) {
												messageHistoryLatest = readLine;
												messageHistoryLatestTimestamp = tempJsonObject.getString("timestamp");
											}
										}
										readLine = fileReader.readLine();
									}
									fileReader.close();
								} catch (Exception e) {
									e.printStackTrace();
									printLine("Some error when trying to read files to get old messages.");
								}
							}
							for (int j = 0; j < messageHistoryList.size(); j++) {
								JsonObject tempJsonObject = Json.createReader(new StringReader(messageHistoryList.get(j))).readObject();
								String name2 = tempJsonObject.getString("name", "");
								if (name2.compareTo(newSubscribeName) == 0) {
									if (messageHistoryLatest.length() <= 1) {
										messageHistoryLatest = messageHistoryList.get(j);
										messageHistoryLatestTimestamp = tempJsonObject.getString("timestamp");
									} else if (Long.parseLong(tempJsonObject.getString("timestamp")) > Long.parseLong(messageHistoryLatestTimestamp)) {
										messageHistoryLatest = messageHistoryList.get(j);
										messageHistoryLatestTimestamp = tempJsonObject.getString("timestamp");
									}
								}
							}
							if (messageHistoryLatest.length() > 1) {
								threadList.get(i).update(messageHistoryLatest);
							}
						}
					}
					rtiUpdateSimString = buildRTIUpdateSim();
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiUpdateSimString);
					}
					messageHistoryList.add(rtiUpdateSimString);
					messageHistoryListSize += rtiUpdateSimString.length();
					break;
				default:
					printLine("received message, but don't know what to do with it... " + message);
					// if not a special RTI message, then search for sim thread that subscribed to it, and send out to them using "send(,)".
					break;
			}
			
			// HERE, change "source" name if there were more than one, before sending the message back out again. This helps handle if running several instances of same simulation.
			String source = json.getString("source", "");
			String timestamp = json.getString("timestamp", "");
			for (int i = 0; i < threadList.size(); i++) {
				if (threadList.get(i).getIndex() == threadIndex) {	
					int numOfDuplicates = threadList.get(i).getNumOfSameName();
					if (numOfDuplicates > 0) {
						source = threadList.get(i).getSimName() + "_" + String.format("%03d", numOfDuplicates);
					}
				}
			}
			
			
			// Add message to history list.
			String newJsonMessage =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", timestamp)
					.add("source", source)
					.build().toString();
			messageHistoryList.add(newJsonMessage);
			messageHistoryListSize += rtiUpdateSimString.length();
			// what if messageHistoryList is too large? Write to a file to save it for later.
			// example: 1 message of 100 characters = 100 bytes, so 100 messages = 10 KB, 1,000 messages = 100 KB (estimate)
			if (oldMessageLimit > 0 && messageHistoryListSize > oldMessageLimit) {
				try {
					if (oldMessageArchive == true) {
						FileWriter exportFile = new FileWriter("messageHistoryList_" + System.currentTimeMillis() + ".txt");
						String outputString = "";
						for (int i = 0; i < messageHistoryList.size(); i++) {
							outputString += messageHistoryList.get(i) + "\n";
						}
						exportFile.write(outputString);
						exportFile.flush();
						exportFile.close();
					}
					messageHistoryList.clear();
					messageHistoryListSize = 0;
				} catch (Exception e) {
					e.printStackTrace();
					printLine("Error trying to save older messages to file. Will keep in memory.");
				}
			}
			
			
			//Send message back out to all sims that are subscribed to it
			int subscribedToTotal = 0;
			for (int i = 0; i < threadList.size(); i++) {
				if (threadList.get(i).isSubscribedTo(name)) {
					subscribedToTotal ++;
					threadList.get(i).update(newJsonMessage);
				}
			}
			printLine("There should be " + subscribedToTotal + " subscribed to message " + name);
		}
		
		
		public void disconnectThread(int threadIndex) {
			for (int i = 0; i < threadList.size(); i++) {
				if (threadList.get(i).getIndex() == threadIndex) {	
					threadList.remove(i);
					break;
				}
			}
			
			// by default, send out update of current thread list to everyone
			String rtiUpdateSimString = buildRTIUpdateSim();
			for (int i = 0; i < threadList.size(); i++) {
				threadList.get(i).update(rtiUpdateSimString);
			}
			messageHistoryList.add(rtiUpdateSimString);
		}
	}
	

	// Prepare message that summarizes current state of the RTI Server, and connected sims.
	private String buildRTIUpdateSim() {
		String returnString = "";
		JsonObjectBuilder jsonMessageBuilder = Json.createObjectBuilder();
		JsonArrayBuilder jsonSimBuilder = Json.createArrayBuilder();
		JsonArray jsonSimArray;
		JsonObject jsonMessageObject;
		for (int i = 0; i < threadList.size(); i++) {
			JsonObjectBuilder jsonSimObject = Json.createObjectBuilder();
			JsonArrayBuilder jsonPublishArray = Json.createArrayBuilder();

			for (int j = 0; j < threadList.get(i).getPublishArray().length; j++) {
				jsonPublishArray.add(threadList.get(i).getPublishArray()[j]);
			}
			
			JsonArrayBuilder jsonSubscribeArray = Json.createArrayBuilder();
			if (threadList.get(i).isSubscribedToAll()) {
				jsonSubscribeArray.add("<<ALL>>");
			} else {
				for (int j = 0; j < threadList.get(i).getSubscribeArray().length; j++) {
					jsonSubscribeArray.add(threadList.get(i).getSubscribeArray()[j]);
				}
			}
			
			int numOfDuplicates = threadList.get(i).getNumOfSameName();
			if (numOfDuplicates == 0) {
				jsonSimObject.add("name", threadList.get(i).getSimName());
			} else {
				jsonSimObject.add("name", threadList.get(i).getSimName() + "_" + String.format("%03d", numOfDuplicates));
			}
			
			jsonSimObject.add("publishTo", jsonPublishArray.build());
			jsonSimObject.add("subscribeTo", jsonSubscribeArray.build());
			jsonSimBuilder.add(jsonSimObject.build());
		}
		jsonSimArray = jsonSimBuilder.build();
		
		jsonMessageBuilder.add("content", jsonSimArray.toString());
		jsonMessageBuilder.add("name", "RTI_UpdateSim");
		jsonMessageBuilder.add("source", "RTI");
		jsonMessageBuilder.add("timestamp", "" + System.currentTimeMillis());
		jsonMessageBuilder.add("tcp", tcpOn);
		jsonMessageObject = jsonMessageBuilder.build();
		
		returnString = jsonMessageObject.toString();
		return returnString;
	}

	public String getHostName() {
		return hostName;
	}
	
	public String getPortNumber() {
		return "" + portNumber;
	}
	
	public void printLine(String line) {
		String formatLine = String.format("%1$32s", "[" + tag + "]" + " --- ") + line;
		Version.printConsole(formatLine);
		Version.printFile(formatLine);
		Version.printDebugGUI(formatLine);
	}
}
