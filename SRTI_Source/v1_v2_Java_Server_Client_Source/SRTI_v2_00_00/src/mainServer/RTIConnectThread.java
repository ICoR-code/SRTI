package mainServer;

/* RTIConnectThread.java
 * - separate thread for specific connection with simulation, allows multi-threaded application and live interaction with multiple sims at once
 * */

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;

import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.stream.JsonParser;

public class RTIConnectThread extends Thread {
	
	// keep track of thread id to make easier for ExampleServer.java to track which thread made callback
	static int numOfActiveThreads = 0;
	int currentThreadID = 0;
	
	// reference to socket connections (main socket for new sims to connect to, and dedicated socket for specific sim)
	private Socket thisMainSocket = null;
	private Socket thisSimSocket = null;
	private ExampleServer.RTIStartThread thisServer = null;
	
	// specific properties related to this sim
	private String simName = "";
	private int numOfSameName = 0;
	private ArrayList<String> publishName = new ArrayList<String>();
	private ArrayList<String> subscribeName = new ArrayList<String>();
	private boolean subscribeToAll = false;
	private boolean tcpOn = false;
	private boolean concurrentProcessing = true;
	
	private int nextTimestep = -1;
	private int nextOrder = 0;
	private boolean expectingFinish = false;
	private boolean shouldHaveFinished = false;
	
	// two options for constructor below, depending on property settings available
	public RTIConnectThread(Socket mainSocket, ExampleServer.RTIStartThread mainServer) {
		thisMainSocket = mainSocket;
		thisServer = mainServer;
		
		numOfActiveThreads++;
		currentThreadID = numOfActiveThreads;
	}

	public RTIConnectThread(Socket mainSocket, ExampleServer.RTIStartThread mainServer, boolean tcpIsOn, boolean concurrentProcess) {
		
		thisMainSocket = mainSocket;
		thisServer = mainServer;
		
		tcpOn = tcpIsOn;
		concurrentProcessing = concurrentProcess;
		
		numOfActiveThreads++;
		currentThreadID = numOfActiveThreads;
		
		if (tcpOn == true) {
			new java.util.Timer().scheduleAtFixedRate(
					new java.util.TimerTask() {
						@Override
						public void run() {
							checkTcpMessages();
						}
					}
					, 5000, 5000);
		}
	}
	
	// main logic of the thread, creates a new dedicated socket and continues to listen for new messages
	public void run() {
		try {
			ServerSocket simServerSocket = new ServerSocket(0);
			PrintWriter outMainSocket = new PrintWriter(thisMainSocket.getOutputStream(), true);
			outMainSocket.println(InetAddress.getLocalHost().getHostAddress());
			outMainSocket.println(simServerSocket.getLocalPort());
			outMainSocket.flush();
			printLine("\t Not done connecting yet! Waiting for app to connect to dedicated port = " + InetAddress.getLocalHost().getHostAddress() + " " + simServerSocket.getLocalPort());
			thisSimSocket = simServerSocket.accept();
			printLine("\t Really connected! Let's get to work!");
			
			BufferedReader in = new BufferedReader(new InputStreamReader(thisSimSocket.getInputStream()));
			String userInput = "";
			printLine(currentThreadID + ": waiting for input... ");
			while ((userInput = in.readLine()) != null) {
				printLine("I RECEIVED INPUT! It was : " + userInput);
				//printLine("(now, just wait until 'handleRecievedMessage' function is ready to use...)");
				// Use "synchronized" to ensure other threads cannot call this function while it is in use.
				// Is this necessary? Testing shows function CAN be called by multiple threads at same time... but may sometimes cause a thread to break for unknown reasons.
				// 		Using "synchonized" is safer... although it should be noticeably slower from "server" side, and gets worse for larger systems.
				//		Issue originally found when approximately 1,200 x 6 messages are saved in server history, each up to 7,000 characters long, 1 byte per character => 50.4 MB?
				if (concurrentProcessing == true) {
					thisServer.handleReceivedMessage(currentThreadID, userInput);
				} else {
					synchronized(thisServer) {
						thisServer.handleReceivedMessage(currentThreadID, userInput);
					}
				}
			}
		} catch (Exception e) {
			printLine("Exception during thread run >> " + e.toString());
			for (int i = 0; i < e.getStackTrace().length; i++) {
				printLine("Exception trace: " + i + " ___ " 
						+ e.getStackTrace()[i].getClassName() + " " + e.getStackTrace()[i].getLineNumber());
			}
		}
		printLine("done running thread.");
		thisServer.disconnectThread(currentThreadID);
	}
	
	int send(String name, String content) {
		return send(name, content, "" + System.currentTimeMillis(), "RTI");
	}
	
	int send(String name, String content, String timestamp) {
		return send(name, content, timestamp, "RTI");
	}
	
	// prepare and send message using dedicated socket
	int send(String name, String content, String timestamp, String source) {
		return send(name, content, timestamp, source, "0");
	}
	
	int send(String name, String content, String timestamp, String source, String vTimestamp) {
		try {
			JsonObject json = null;
			synchronized(thisSimSocket){
				json =  Json.createObjectBuilder()
						.add("name", name)
						.add("content", content)
						.add("timestamp", timestamp)
						.add("source", source)
						.add("tcp", "" + tcpOn)
						.add("vTimestamp", vTimestamp)
						.build();
				PrintWriter out;
				out = new PrintWriter(thisSimSocket.getOutputStream(), true);
				out.println(json);
				out.flush();
			}
			printLine("Sent message " + name + " to " + simName);// + " with content " + content);
			
			if (name.compareTo("RTI_ReceivedMessage") != 0) {
				handleTcpResponse(name, content, timestamp, source, json.toString());
			}
		} catch (Exception e) {
			printLine("   IOExceoption error happened here...");
			e.printStackTrace();
		}
		return 0;
	}
	
	int send(String name, String content, String timestamp, String source, String vTimestamp, String destination) {
		try {
			JsonObject json = null;
			synchronized(thisSimSocket){
				json =  Json.createObjectBuilder()
						.add("name", name)
						.add("content", content)
						.add("timestamp", timestamp)
						.add("source", source)
						.add("tcp", "" + tcpOn)
						.add("vTimestamp", vTimestamp)
						.add("destination", destination)
						.build();
				PrintWriter out;
				out = new PrintWriter(thisSimSocket.getOutputStream(), true);
				out.println(json);
				out.flush();
			}
			printLine("Sent message " + name + " to " + simName);// + " with content " + content);
			
			if (name.compareTo("RTI_ReceivedMessage") != 0) {
				handleTcpResponse(name, content, timestamp, source, json.toString());
			}
		} catch (Exception e) {
			printLine("   IOExceoption error happened here...");
			e.printStackTrace();
		}
		return 0;
	}
	
	// same as regular send, but without adding to tcp buffer if trying to resend
	int sendWithoutAddingToTcp(String name, String content, String timestamp, String source) {
		try {
			JsonObject json =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", timestamp)
					.add("source", source)
					.add("tcp", "" + tcpOn)
					.build();
			PrintWriter out;
			out = new PrintWriter(thisSimSocket.getOutputStream(), true);
			out.println(json);
			out.flush();
			printLine("Sent message " + name + " to " + simName);// + " with content " + content);
		} catch (Exception e) {
			printLine("   sendWithoutAddingToTcp - IOExceoption error happened here...");
			e.printStackTrace();
		}
		return 0;
	}

	// extra logic to handle TCP (check if confirmed that message was received, resend if necessary)
	public class MessageReceived{
		int sendAttempts = 0;
		boolean messageReceived = false;
		String name = "";
		String content = "";
		String timestamp = "";
		String source = "";
		String message = "";
		long originalTimeSent = 0;
	}
	ArrayList<MessageReceived> tcpMessageBuffer = new ArrayList<MessageReceived>();
	
	public void setTcpResponse(boolean setResponse, String message) {
		Iterator<MessageReceived> i = tcpMessageBuffer.iterator();
		while (i.hasNext()) {
			MessageReceived mr = i.next();
			if (mr.message.compareTo(message) == 0) {
				// we could just set the variable to "true" and handle removing elsewhere, 
				// or in best case scenario, we can remove here and never have to worry about checking to resend (list would be empty).
				i.remove();
			}
		}
	}
	
	private int handleTcpResponse(String name, String content, String timestamp, String source, String message) {
		if (tcpOn == false)
			return 0;
		
		MessageReceived newMessage = new MessageReceived();
		newMessage.sendAttempts = 1;
		newMessage.messageReceived = false;
		newMessage.name = name;
		newMessage.content = content;
		newMessage.timestamp = timestamp;
		newMessage.source = source;
		newMessage.message = message;
		newMessage.originalTimeSent = System.currentTimeMillis();
		tcpMessageBuffer.add(newMessage);
		
		return 0;
	}
	
	private void checkTcpMessages() {
		/* Issue:
		 * 		- we could have an infinite loop wait for response, but because this class is 1 thread, a loop
		 * 			in one part of it would prevent other part of the thread (waiting for input) to receive message.
		 * 		- we could have socket bufferedreader read line within "handleTcpResponse" but then it would 
		 * 			wait indefinitely, we have no control to send again or move on.
		 * 		- we could "schedule" a function call, but if it checks a single variable, that variable might have
		 * 			been changed several times over since then, which could be a timing issue.
		 * 
		 * 		- solution: we need to store a list <id, originaltimesent, originalmessage, confirmedreceived(true,false), sendattempts> 
		 * 			of message for "scheduled" function to then call "resendMessages()", which will then check
		 * 			the list to resend any messages (or remove those that are too old).
		 * 		- the issue with this is if 1 message is not received but another message is, the first message
		 * 			would be resent in a different order (after the second message). Is this acceptable? 
		 * 		- alternative: keep track of list of old messages, don't remove until they are confirmed to have been
		 * 			received. When "send()" is called, first check the list and resend all messages in the list.
		 * 			This way, maintaining order is possible, but it is up to simulation to decide how to handle potential
		 * 			duplicate messages (if 2nd message is asked to be sent before 1st confirmation is received). This also
		 * 			means that if a simulation won't send a new expected message until the missing message is received by
		 * 			the first simulation, then a halt could occur. Universal time management could help control this.
		 * */
		if (tcpMessageBuffer.isEmpty())
			return;
		
		Iterator<MessageReceived> it = tcpMessageBuffer.iterator();
		while (it.hasNext()) {
			MessageReceived mr = it.next();
			if (mr.sendAttempts >= 3) {
				it.remove();
			}
		}
		
		for (int i = 0; i < tcpMessageBuffer.size(); i++) {
			if (System.currentTimeMillis() - tcpMessageBuffer.get(i).originalTimeSent > 3000) {
				tcpMessageBuffer.get(i).sendAttempts++;
				sendWithoutAddingToTcp(tcpMessageBuffer.get(i).name, tcpMessageBuffer.get(i).content, tcpMessageBuffer.get(i).timestamp, tcpMessageBuffer.get(i).source);
			}
		}
	}
	
	public void update(String message) {
		//printLine("\t\t\tUPDATE: " + message);
		String name = Json.createReader(new StringReader(message)).readObject().getString("name");
		String content = Json.createReader(new StringReader(message)).readObject().getString("content");
		String timestamp = Json.createReader(new StringReader(message)).readObject().getString("timestamp");
		String source =  Json.createReader(new StringReader(message)).readObject().getString("source");
		String vTimestamp = Json.createReader(new StringReader(message)).readObject().getString("vTimestamp");
		String destination = Json.createReader(new StringReader(message)).readObject().getString("destination", "");
		
		if (destination.compareTo("") == 0) {
			send(name, content, timestamp, source, vTimestamp);
		} else {
			send(name, content, timestamp, source, vTimestamp, destination);
		}
	}
	
	public void update(String name, String content) {
			send(name, content);
	}
	
	public void updateSimName(String newSimName) {
		simName = newSimName;
		tag = originalTag + "_" + newSimName;
	}
	
	public void updatePublishTo(String newPublishName) {
		publishName.add(newPublishName);
	}
	
	public void updateSubscribeTo(String newSubscribeName) {
		subscribeName.add(newSubscribeName);
	}
	
	public int getNumberOfThreads () {
		return numOfActiveThreads;
	}
	
	public int getIndex() {
		return currentThreadID;
	}
	
	public String getSimName() {
		return simName;
	}
	
	public String[] getPublishArray() {
		String[] returnArray = new String[publishName.size()];
		publishName.toArray(returnArray);
		return returnArray;
	}
	
	public String[] getSubscribeArray() {
		String[] returnArray = new String[subscribeName.size()];
		subscribeName.toArray(returnArray);
		return returnArray;
	}
	
	public boolean isSubscribedTo(String messageName) {
		if (subscribeToAll == true)
			return true;
		
		if (subscribeName.contains(messageName))
			return true;
		
		return false;
	}
	
	public boolean isSubscribedToAll() {
		return subscribeToAll;
	}
	
	public void setSubscribeAll() {
		subscribeToAll = true;
	}
	
	public void setSubscribeSpecificOnly() {
		subscribeToAll = false;
	}
	
	public void setSubsribeNone() {
		subscribeToAll = false;
		subscribeName.clear();
	}
	
	public void setNumOfSameName (int newNumOfSameName) {
		numOfSameName = newNumOfSameName;
	}
	
	public void setNextTimestep(int newTimestep) {
		nextTimestep = newTimestep;
	}
	
	public int getNextTimestep() {
		return nextTimestep;
	}
	
	public void setNextOrder(int newOrder) {
		nextOrder = newOrder;
	}
	
	public int getNextOrder() {
		return nextOrder;
	}
	
	public void setExpectingFinish(boolean needsToFinish) {
		expectingFinish = needsToFinish;
	}
	
	public boolean getExpectingFinish() {
		return expectingFinish;
	}
	
	public void setShouldHaveFinished(boolean done) {
		shouldHaveFinished = done;
	}
	
	public boolean getShouldHaveFinished() {
		return shouldHaveFinished;
	}
	
	public int getNumOfSameName () {
		return numOfSameName;
	}
	
	String originalTag = "RTIConnectThread";
	String tag = "RTIConnectThread";
	public void printLine(String line) {
		String formatLine = String.format("%1$32s", "[" + tag + "]" + " --- ") + line;
		Version.printConsole(formatLine);
		Version.printFile(formatLine);
		Version.printDebugGUI(formatLine);
	}
}
