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
import java.net.BindException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;

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
		
		server.printLine("SRTI Version : " + Version.version);
		
		server.startRTI();

		// To help ensure RTI Server process is ready when GUI tries to connect, wait a moment for RTI Server to load.
		try {
			TimeUnit.MILLISECONDS.sleep(250);
		} catch (InterruptedException e) {
			server.printLine(e.getMessage());
			e.printStackTrace();
		}
		
		// If "guiOn" is true, also open instance of GUI class (treated as its own RTI Simulation). If "guiOn" is false, any feedback would be through console window (command prompt).
		if (server.guiOn == true) {
			ExampleServerGUI serverGUI = new ExampleServerGUI(server.getHostName(), server.getPortNumber());
			serverGUI.rtiLib.setDebugOutput(true);
			serverGUI.messageLimit = oldMessageGUILimit;
		}
	}
	
	
	String tag = "ExampleServer";
	
	
	// settings from "settings.txt" file
	// (public hostname for sims to connect to RTI Server. Cannot be set, is based on computer and internet modem connection.)
	private static String hostName = "localhost";
	// portNumber, if > 0, will try to open this port (if available), allows some flexibility in how to find the RTI Server.
	public static int portNumber = -1;
	// set whether gui for RTI Server should be on.
	public static boolean guiOn = true;
	// set whether "debug" console gui for RTI Server should be on (IMPLEMENTED AS OF 2018-06-27)
	public static boolean debugGuiOn = false;
	// set whether all messages from RTI Server to a simulation requires a confirmation that it was received.
	public static boolean tcpOn = false;
	// set whether messages from RTI Server are compressed before sending (NOT IMPLEMENTED AS OF 2018-06-01)
	public static boolean compressOn = false;
	// set whether server will attempt to reconnect to sim if disconnected (NOT IMPLEMENTED AS OF 2018-06-01, NEEDS TO BE IMPLEMENTED ON CLIENT SIDE)
	public static boolean retryConnection = false;
	// set message limit for active memory, if pass this limit, messages are cleared
	public static int oldMessageLimit = -1;
	// set message limit for active memory, if pass limit, messages are stored in .txt file before clearing
	public static boolean oldMessageArchive = false;
	// print debug lines to console while system is running
	public static boolean debugConsole = false;
	// print debug lines to file while system is running
	public static boolean debugFile = false;
	// to prevent potential issues with concurrent access, allow user to set to false at expense of speed
	public static boolean concurrentProcessing = true;
	// variable for Server to prevent RAM overuse... but what about message list saved in GUI?
	public static int oldMessageGUILimit = -1;
	
	// individual threads, each dedicated to input/output to a specific connected simulation 
	// (this class handles main public port to allow sims to connect for first time)
	private ArrayList<RTIConnectThread> threadList = new ArrayList<RTIConnectThread>();
	
	// a list that maintains all messages received, so the RTI Server can send older messages if necessary. 
	private ArrayList<String> messageHistoryList = new ArrayList<String>();
	// messageHistoryList size in characters, provides more consistent archive performance
	private int messageHistoryListSize = 0;
	
	// variable to sync timestep across sim system
	private int globalTimestep = 0;
	
	// variable to sync global stage across sim system
	private int globalStage = 0;
	private int nextGlobalStage = 0;
	private boolean systemIsPaused = false;
	
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
			configBuffer.close();
			configStream.close();
		} catch (Exception e) {
			e.printStackTrace();
			printLine("Error trying to open settings.txt file (maybe doesn't exist or has bad format?), will proceed with default values.");
			return -1;
		}
		
		// Parse out individual values.
		// What if a value doesn't exist, or is in the wrong format? That's why we run a loop, so we try to read every value instead of allowing one to break the process.
		for (int i = 0; i < 15; i++) {
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
				else if (i == 10)
					concurrentProcessing = json.getBoolean("concurrentProcessing");
				else if (i == 11)
					oldMessageGUILimit = json.getJsonNumber("oldMessageGUILimit").intValue();
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
			{
				try {
					serverSocket = new ServerSocket(portNumber);
				} catch (BindException e2) {
					printLine("Port not available for use, will open on some other port.");
					serverSocket = new ServerSocket(0);
				}
			}
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
					printLine("Open for business! Waiting for simulations to connect to me...");

					rtiSocket = serverSocket.accept();
					printLine("\t Connected!");
					
					RTIConnectThread connectThread = new RTIConnectThread(rtiSocket, this, tcpOn, concurrentProcessing);
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
			printLine("received message from index " + threadIndex);// + ": " + message);
			
			JsonReader reader = Json.createReader(new StringReader(message));
			JsonObject json = reader.readObject();
			reader.close();
			JsonArrayBuilder destinationArray = Json.createArrayBuilder();
			
			String name = json.getString("name", "");
			String content = json.getString("content", "");
			boolean tcp = Boolean.parseBoolean(json.getString("tcp", "false"));
			
			boolean sendUpdate = false;
			boolean sendStart = false;
			
			if (tcp == true) {
				if (name.compareTo("RTI_ReceivedMessage") != 0) {
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {	
							threadList.get(i).update("RTI_ReceivedMessage", message);
						}
					}
				}
			}
			
			//String rtiUpdateSimString = "";
			
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
					//printLine("received message, use info to intialize sim name...");
					
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
					sendUpdate = true;
					break;
				case "RTI_PublishTo":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newPublishName = Json.createReader(new StringReader(content)).readObject().getString("publishTo", "");
							threadList.get(i).updatePublishTo(newPublishName);
						}
					}
					sendUpdate = true;
					break;
				case "RTI_SubscribeTo":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							String newSubscribeName = Json.createReader(new StringReader(content)).readObject().getString("subscribeTo", "");
							threadList.get(i).updateSubscribeTo(newSubscribeName);
						}
					}
					sendUpdate = true;
					break;
				case "RTI_SubscribeToAll":
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							threadList.get(i).setSubscribeAll();
						}
					}
					sendUpdate = true;
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
					sendUpdate = true;
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
					sendUpdate = true;
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
					sendUpdate = true;
					break;
				case "RTI_StartSim":
					// send initial "RTI_BeginStep" to all sims	
					globalTimestep = 0;
					for (int i = 0; i < threadList.size(); i++) {
						destinationArray.add(threadList.get(i).getSimName());
					}
					String rtiStartStepString = buildRTIStartStep(destinationArray.build().toString());
					for (int i = 0; i < threadList.size(); i++) {
						threadList.get(i).update(rtiStartStepString);
						threadList.get(i).setExpectingFinish(true);
					}
					messageHistoryList.add(rtiStartStepString);
					messageHistoryListSize += rtiStartStepString.length();
					break;
				case "RTI_FinishStep":
					JsonReader finishStepContent = Json.createReader(new StringReader(content));
					JsonObject finishStepObject = finishStepContent.readObject();
					finishStepContent.close();
					int nextStep = Integer.parseInt(finishStepObject.getString("nextStep"));
					int nextOrder = Integer.parseInt(finishStepObject.getString("nextOrder"));
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {	
							threadList.get(i).setNextTimestep(nextStep);
							threadList.get(i).setNextOrder(nextOrder);
							threadList.get(i).setExpectingFinish(false);
						}
					}
					
					// SPECIAL CASE: We want the GUI to receive "RTI_FinishStep" FIRST, before any instance of "RTI_StartStep"
					// 		In this case, destination doesn't matter (only "RTI_" and "GUI" would be receiving this message)
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).isSubscribedTo(name)) {
							threadList.get(i).update(message);
						}
					}
					
					// check all sims we told to proceed, to confirm that they have finished
					/*int minNextStep = -2;
					for (int i = 0; i < threadList.size(); i++) {
						if ((threadList.get(i).getNextTimestep() < minNextStep || minNextStep == -2) && threadList.get(i).getExpectingFinish() == true) {		// also check that threadList.get(i).getExpectingFinish() == true
							minNextStep = threadList.get(i).getNextTimestep();
						}
					}
					if (minNextStep >= 0) {
						globalTimestep = minNextStep;
						rtiStartStepString = buildRTIStartStep();
						for (int i = 0; i < threadList.size(); i++) {
							if (threadList.get(i).getNextTimestep() == minNextStep) {
								threadList.get(i).setNextTimestep(-1);
								threadList.get(i).update(rtiStartStepString);
							}
						}
						messageHistoryList.add(rtiStartStepString);
						messageHistoryListSize += rtiStartStepString.length();
					} else {
						// there still exists a sim that we're waiting to finish, we must have received -1 as the min.
					}*/
					
					if (systemIsPaused == false) {
						synchronized(threadList) {
							boolean finished = true;
							for (int i = 0; i < threadList.size(); i++) {
								if (threadList.get(i).getExpectingFinish() == true 
										&& threadList.get(i).getSimName().contains("ExampleServerGUI") == false
										&& threadList.get(i).getSimName().contains("RTI-v2-GUI") == false
										&& threadList.get(i).getShouldHaveFinished() == false) {
									//... then we have a running thread that isn't finished yet, better wait.
									printLine("We're still waiting for this thread to confirm it's finished this step: " 
											+ threadList.get(i).getIndex() + " " + threadList.get(i).getSimName());
									finished = false;
									break;
								} 
							}
							
							if (finished == true) {
								// All threads have getExpectingFinish() == false. find minimum nextTimestep / nextOrder, and run those.
								printLine("All threads have finished current step/order. Now preparing to send RTI_StartStep.");
								int minNextStep = -2;
								int minNextOrder = -1;
								boolean allShouldHaveFinished = true;
								for (int i = 0; i < threadList.size(); i++) {
									if (threadList.get(i).getShouldHaveFinished() == false) {
										allShouldHaveFinished = false;
									}
									if (minNextStep == -2 && threadList.get(i).getNextTimestep() != -1) {
										minNextStep = threadList.get(i).getNextTimestep();
										minNextOrder = threadList.get(i).getNextOrder();
									} else if (threadList.get(i).getNextTimestep() != -1) {
										if (threadList.get(i).getNextTimestep() < minNextStep) {
											minNextStep = threadList.get(i).getNextTimestep();
											minNextOrder = threadList.get(i).getNextOrder();
										} else if (threadList.get(i).getNextTimestep() == minNextStep) {
											if (threadList.get(i).getNextOrder() < minNextOrder) {
												minNextOrder = threadList.get(i).getNextOrder();
											}
										}
									}
								}
								if (allShouldHaveFinished == true) {
									printLine("The RTI Server recognizes that all simulators should have received the order to stop, and therefore, no further responses should be received.");
									break;
								}
								
								if (globalTimestep != minNextStep) {
									globalStage = nextGlobalStage;
								}
								globalTimestep = minNextStep;
								for (int i = 0; i < threadList.size(); i++) {
									if (threadList.get(i).getNextTimestep() == minNextStep && threadList.get(i).getNextOrder() == minNextOrder) {
										destinationArray.add(threadList.get(i).getSimName());
									} else if (threadList.get(i).getNextTimestep() == -1) {
										destinationArray.add(threadList.get(i).getSimName());
									}
								}
								rtiStartStepString = buildRTIStartStep(destinationArray.build().toString());
								for (int i = 0; i < threadList.size(); i++) {
									if (threadList.get(i).getNextTimestep() == minNextStep && threadList.get(i).getNextOrder() == minNextOrder) {
										threadList.get(i).setNextTimestep(-1);
										threadList.get(i).setNextOrder(0);
										threadList.get(i).setExpectingFinish(true);
										threadList.get(i).update(rtiStartStepString);
										if (globalStage == -1) {
											threadList.get(i).setShouldHaveFinished(true);
										}
									} else if (threadList.get(i).getNextTimestep() == -1) {
										// ... is this only for "GUI," or for other sims that naturally function at every step?
										threadList.get(i).setNextTimestep(-1);
										threadList.get(i).setNextOrder(-1);
										threadList.get(i).setExpectingFinish(true);
										threadList.get(i).update(rtiStartStepString);
										if (globalStage == -1) {
											threadList.get(i).setShouldHaveFinished(true);
										}
									}
								}
								messageHistoryList.add(rtiStartStepString);
								messageHistoryListSize += rtiStartStepString.length();
							}
						}
					}
					break;
					
				case "RTI_EndSystem":
					nextGlobalStage = -1;
					// assume the thread that sent this message will immediately end, therefore, should not be checking for it to send "RTI_FinishStep"
					for (int i = 0; i < threadList.size(); i++) {
						if (threadList.get(i).getIndex() == threadIndex) {
							threadList.get(i).setShouldHaveFinished(true);
						}
					}
					break;
				case "RTI_PauseSystem":
					systemIsPaused = true;
					printLine("RTI_PauseSystem message was received. Will not ask sims to proceed to next step, but won't close them either.");
					break;
				case "RTI_ResumeSystem":
					systemIsPaused = false;
					printLine("RTI_ResumeSystem message was received. Check to resume sims again...");
					
					synchronized(threadList) {
						boolean finished = true;
						for (int i = 0; i < threadList.size(); i++) {
							if (threadList.get(i).getExpectingFinish() == true 
									&& threadList.get(i).getSimName().contains("ExampleServerGUI") == false
									&& threadList.get(i).getSimName().contains("RTI-v2-GUI") == false
									&& threadList.get(i).getShouldHaveFinished() == false) {
								//... then we have a running thread that isn't finished yet, better wait.
								printLine("We're still waiting for this thread to confirm it's finished this step: " 
										+ threadList.get(i).getIndex() + " " + threadList.get(i).getSimName());
								finished = false;
								break;
							} 
						}
						
						if (finished == true) {
							// All threads have getExpectingFinish() == false. find minimum nextTimestep / nextOrder, and run those.
							printLine("All threads have finished current step/order. Now preparing to send RTI_StartStep.");
							int minNextStep = -2;
							int minNextOrder = -1;
							boolean allShouldHaveFinished = true;
							for (int i = 0; i < threadList.size(); i++) {
								if (threadList.get(i).getShouldHaveFinished() == false) {
									allShouldHaveFinished = false;
								}
								if (minNextStep == -2 && threadList.get(i).getNextTimestep() != -1) {
									minNextStep = threadList.get(i).getNextTimestep();
									minNextOrder = threadList.get(i).getNextOrder();
								} else if (threadList.get(i).getNextTimestep() != -1) {
									if (threadList.get(i).getNextTimestep() < minNextStep) {
										minNextStep = threadList.get(i).getNextTimestep();
										minNextOrder = threadList.get(i).getNextOrder();
									} else if (threadList.get(i).getNextTimestep() == minNextStep) {
										if (threadList.get(i).getNextOrder() < minNextOrder) {
											minNextOrder = threadList.get(i).getNextOrder();
										}
									}
								}
							}
							if (allShouldHaveFinished == true) {
								printLine("The RTI Server recognizes that all simulators should have received the order to stop, and therefore, no further responses should be received.");
								break;
							}
							
							if (globalTimestep != minNextStep) {
								globalStage = nextGlobalStage;
							}
							globalTimestep = minNextStep;
							for (int i = 0; i < threadList.size(); i++) {
								if (threadList.get(i).getNextTimestep() == minNextStep && threadList.get(i).getNextOrder() == minNextOrder) {
									destinationArray.add(threadList.get(i).getSimName());
								} else if (threadList.get(i).getNextTimestep() == -1) {
									destinationArray.add(threadList.get(i).getSimName());
								}
							}
							rtiStartStepString = buildRTIStartStep(destinationArray.build().toString());
							for (int i = 0; i < threadList.size(); i++) {
								if (threadList.get(i).getNextTimestep() == minNextStep && threadList.get(i).getNextOrder() == minNextOrder) {
									threadList.get(i).setNextTimestep(-1);
									threadList.get(i).setNextOrder(0);
									threadList.get(i).setExpectingFinish(true);
									threadList.get(i).update(rtiStartStepString);
									if (globalStage == -1) {
										threadList.get(i).setShouldHaveFinished(true);
									}
								} else if (threadList.get(i).getNextTimestep() == -1) {
									threadList.get(i).setNextTimestep(-1);
									threadList.get(i).setNextOrder(-1);
									threadList.get(i).setExpectingFinish(true);
									threadList.get(i).update(rtiStartStepString);
									if (globalStage == -1) {
										threadList.get(i).setShouldHaveFinished(true);
									}
								}
							}
							messageHistoryList.add(rtiStartStepString);
							messageHistoryListSize += rtiStartStepString.length();
						}
					}
					break;
				case "RTI_UpdateStage":
					JsonReader updateStageContent = Json.createReader(new StringReader(content));
					nextGlobalStage = Integer.parseInt(updateStageContent.readObject().getString("nextStage"));
					break;
				default:
					//printLine("received message, but not SRTI proprietary message, so up to sims to understand it... " + message);
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
			
			if (sendUpdate == true) {
				String rtiUpdateSimString = buildRTIUpdateSim();
				for (int i = 0; i < threadList.size(); i++) {
					threadList.get(i).update(rtiUpdateSimString);
				}
				messageHistoryList.add(rtiUpdateSimString);
				messageHistoryListSize += rtiUpdateSimString.length();
			}
			if (sendStart == true) {
				String rtiStartStepString = buildRTIStartStep();
				for (int i = 0; i < threadList.size(); i++) {
					threadList.get(i).update(rtiStartStepString);
				}
				messageHistoryList.add(rtiStartStepString);
				messageHistoryListSize += rtiStartStepString.length();
			}
			
			
			// Add message to history list.
			/*String newJsonMessage =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", timestamp)
					.add("source", source)
					.add("tcp", "" + tcp)
					.add("vTimestamp", "" + globalTimestep)
					.build().toString();*/
			// Below code adds list of 'destination' sims to the message, for reference by SRTI GUI.
			if (name.compareTo("RTI_StartStep") != 0 && name.compareTo("RTI_FinishStep") != 0) {
				JsonObjectBuilder obBuilder = Json.createObjectBuilder()
						.add("name", name)
						.add("content", content)
						.add("timestamp", timestamp)
						.add("source", source)
						.add("tcp", "" + tcp)
						.add("vTimestamp", "" + globalTimestep);
				for (int i = 0; i < threadList.size(); i++) {
					if (threadList.get(i).isSubscribedTo(name)) {
						destinationArray.add(threadList.get(i).getSimName());
					}
				}
				obBuilder.add("destination", destinationArray.build().toString());
				String newJsonMessage = obBuilder.build().toString();
				messageHistoryList.add(newJsonMessage);
				messageHistoryListSize += newJsonMessage.length();
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
		JsonObjectBuilder jsonSimArrayObject = Json.createObjectBuilder();
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
		// converting 'content' JSON array to object, to allow better universal handling in RTILib and GUI. 
		jsonSimArray = jsonSimBuilder.build();
		jsonSimArrayObject.add("subcontent", jsonSimArray.toString());
		jsonMessageBuilder.add("content", jsonSimArrayObject.build().toString());
		jsonMessageBuilder.add("name", "RTI_UpdateSim");
		jsonMessageBuilder.add("source", "RTI");
		jsonMessageBuilder.add("timestamp", "" + System.currentTimeMillis());
		jsonMessageBuilder.add("vTimestamp", "" + globalTimestep);
		jsonMessageBuilder.add("tcp", "" + tcpOn);
		jsonMessageObject = jsonMessageBuilder.build();
		
		returnString = jsonMessageObject.toString();
		return returnString;
	}

	private String buildRTIStartStep() {
		String returnString = "";
		String content = "";
		// content should include what "timestep" to start (whether or not this is fully necessary on "Wrapper" or "Sim" side is unknown.
		JsonObjectBuilder jsonContent = 
				Json.createObjectBuilder().add("timestep", "" + globalTimestep).add("stage", "" + globalStage);
		content = jsonContent.build().toString();
		JsonObjectBuilder jsonMessageBuilder = Json.createObjectBuilder()
				.add("name", "RTI_StartStep")
				.add("content", content)
				.add("source", "RTI")
				.add("timestamp", "" + System.currentTimeMillis())
				.add("vTimestamp", "" + globalTimestep)
				.add("tcp", "" + tcpOn);
		returnString = jsonMessageBuilder.build().toString();
		return returnString;
	}
	
	private String buildRTIStartStep(String destinationArray) {
		String returnString = "";
		String content = "";
		// content should include what "timestep" to start (whether or not this is fully necessary on "Wrapper" or "Sim" side is unknown.
		JsonObjectBuilder jsonContent = 
				Json.createObjectBuilder().add("timestep", "" + globalTimestep).add("stage", "" + globalStage);
		content = jsonContent.build().toString();
		JsonObjectBuilder jsonMessageBuilder = Json.createObjectBuilder()
				.add("name", "RTI_StartStep")
				.add("content", content)
				.add("source", "RTI")
				.add("timestamp", "" + System.currentTimeMillis())
				.add("vTimestamp", "" + globalTimestep)
				.add("tcp", "" + tcpOn)
				.add("destination", destinationArray);
		returnString = jsonMessageBuilder.build().toString();
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
