package mainServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;

import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.stream.JsonParser;

public class RTIConnectThread extends Thread {
	
	static int numOfActiveThreads = 0;
	int currentThreadID = 0;
	
	private Socket thisMainSocket = null;
	private Socket thisSimSocket = null;
	private ExampleServer.RTIStartThread thisServer = null;
	
	private String simName = "";
	private int numOfSameName = 0;
	private ArrayList<String> publishName = new ArrayList<String>();
	private ArrayList<String> subscribeName = new ArrayList<String>();
	private boolean subscribeToAll = false;
	

	public RTIConnectThread(Socket mainSocket, ExampleServer.RTIStartThread mainServer) {
		
		thisMainSocket = mainSocket;
		thisServer = mainServer;
		
		numOfActiveThreads++;
		currentThreadID = numOfActiveThreads;
	}
	
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
				thisServer.handleReceivedMessage(currentThreadID, userInput);
			}
		} catch (Exception e) {
			printLine("Exception >> " + e.toString());
		}
		printLine("done running thread.");
		thisServer.disconnectThread(currentThreadID);
		//numOfActiveThreads--;
	}
	
	int send(String name, String content) {
		return send(name, content, "" + System.currentTimeMillis(), "RTI");
	}
	
	int send(String name, String content, String timestamp) {
		return send(name, content, timestamp, "RTI");
	}
	
	int send(String name, String content, String timestamp, String fromSim) {
		try {
			JsonObject json =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", timestamp)
					.add("fromSim", fromSim)
					.build();
			PrintWriter out;
			out = new PrintWriter(thisSimSocket.getOutputStream(), true);
			out.println(json);
			out.flush();
			printLine("Sent message " + name + " to " + simName + " with content " + content);
			//printLine("Confirm that socket is still connected = " + thisSimSocket.);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			printLine("   IOExceoption error happened here...");
			e.printStackTrace();
		}
		return 0;
	}
	
	public void update(String message) {
		printLine("\t\t\tUPDATE: " + message);
		String name = Json.createReader(new StringReader(message)).readObject().getString("name");
		String content = Json.createReader(new StringReader(message)).readObject().getString("content");
		String timestamp = Json.createReader(new StringReader(message)).readObject().getString("timestamp");
		String fromSim =  Json.createReader(new StringReader(message)).readObject().getString("fromSim");
		
		send(name, content, timestamp, fromSim);
	}
	
	public void update(String name, String content) {
			send(name, content);
	}
	
	public void updateSimName(String newSimName) {
		simName = newSimName;
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
		//if (numOfSameName == 0)
			return simName;
		//else 
		//	return simName + "_" + String.format("%03d", numOfSameName);
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
	
	public int getNumOfSameName () {
		return numOfSameName;
	}
	
	String tag = "RTIConnectThread";
	public void printLine(String line) {
		System.out.println(String.format("%1$32s", "[" + tag + "]" + " --- ") + line);
	}
}
