package mainServer;

/*
 * RTILib.java
 * 
 * - main access point for API functions for simulation to take part in SRTI system.
 * */

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.*;
import java.util.Map.*;
import java.util.concurrent.TimeUnit;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonReader;
import javax.json.JsonValue;
import javax.json.JsonWriter;

public class RTILib {
	
	// name of sim (used as identifier on RTI Server side)
	private String simName = "<<default sim name>>";
	
	// reference to simulation (if applicable)
	private RTISim thisSim;
	// socket connection to main RTI Server thread, and to dedicated socket to listen/receive direct messages
	private Socket rtiSocket;
	private Socket dedicatedRtiSocket;
	// thread for dedicated RTI Server communication
	private RTISimConnectThread readThread;
	
	// message queue to store messages until sim retrieves them (used for simulations not implementing "RTISim.java")
	public class Message implements Comparable{
		public String name = "";
		public String timestamp = "";
		public String vTimestamp = "";
		public String source = "";
		public String content = "";
		public String originalMessage = "";
		
		public int compareTo(Object anotherMessage) {
			if (!(anotherMessage instanceof Message))
				return 0;
			return vTimestamp.compareTo(((Message)anotherMessage).vTimestamp);
		}
		
		public String toString() {
			String returnString = "";
			if (name != null) {
				returnString += "name: " + name + " ";
			} else {
				returnString += "name: " + "NULL" + " ";
			}
			if (timestamp != null) {
				returnString += "timestamp: " + timestamp + " ";
			} else {
				returnString += "timestamp: " + "NULL" + " ";
			}
			if (vTimestamp != null) {
				returnString += "vTimestamp: " + vTimestamp + " ";
			} else {
				returnString += "vTimestamp: " + "NULL" + " ";
			}
			if (source != null) {
				returnString += "source: " + source + " ";
			} else {
				returnString += "source: " + "NULL" + " ";
			}
			if (content != null) {
				returnString += "content: " + content + " ";
			} else {
				returnString += "content: " + "NULL" + " ";
			}
			if (originalMessage != null) {
				returnString += "originalMessage: " + originalMessage + " ";
			} else {
				returnString += "originalMessage: " + "NULL" + " ";
			}
			return returnString;
		}
	}
	private ArrayList<Message> messageQueue = new ArrayList<Message>();
	
	// settings properties, as of v0.54 does not use an external file, but requires calling function to set property from simulation code
	private int settingsExists = -1;		// -1 => file doesn't exist, 0 = file doesn't exist but defaults are overwritten by RTIServer, 1 = file exists and defaults are overwritten
	private boolean tcpOn = false;
	// save last used hostname and portnumber, for instance that one needs to reconnect.
	private String lastHostName = "";
	private String lastPortNumber = "";
	// for reference, save the message names we are subscribing to (if we need to reconnect, we want to subscribe again)
	private ArrayList<String> subscribeHistory = new ArrayList<String>();
	// boolean to confirm if messages were received recently
	private boolean serverMessagesReceived = false;
	
	private int vTimestamp = 0;
	
	public RTILib(RTISim rtiSim) {
		thisSim = rtiSim;
		simName = thisSim.getSimName();
	}
	
	// constructor to allow original sim class to NOT extend from RTISim.java: allows more flexibility in implementation
	public RTILib() {
		thisSim = null;
	}
	
	public void setSimName(String newName) {
		simName = newName;
	}
	
	public void setTcpOn(boolean tcp) {
		settingsExists = 1;
		tcpOn = tcp;
		
		if (tcpOn == true) {
			new java.util.Timer().scheduleAtFixedRate(
				new java.util.TimerTask() {
					@Override
					public void run() {
						checkTcpMessages();
					}
				}, 5000, 5000);
		}
	}
	
	// set reconnect time limit (if "timeLimit" (milliseconds) passes without receiving any messages from RTI Server, assume disconnected and try to reconnect)
	public void setReconnectTimeLimit(long timeLimit) {
		if (timeLimit <= 0)
			return;
		
		new java.util.Timer().scheduleAtFixedRate(
				new java.util.TimerTask() {
					@Override
					public void run() {
						// if no message was received within this time, reconnect()
						if (serverMessagesReceived == false) {
							reconnect();
						}
						
						serverMessagesReceived = false;
					}
				}
			, timeLimit, timeLimit);
	}
	
	public void setNewVTimestamp(int newVT) {
		vTimestamp = newVT;
	}
	
	public int connect() {
		printLine("asked to connect without a hostName or portNumber... can't really do anything, then.");
		return 0;
	}
	
	public int connect(String hostName, String portNumber) {
		
		printLine("trying to connect now...");
		try {
			lastHostName = hostName;
			lastPortNumber = portNumber;
			rtiSocket = new Socket(lastHostName, Integer.parseInt(lastPortNumber));
			
			BufferedReader in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			in.readLine();
			String dedicatedHost = lastHostName;// in.readLine();
			String dedicatedPort = in.readLine();
			printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);
			dedicatedRtiSocket = new Socket(dedicatedHost, Integer.parseInt(dedicatedPort));
			
			serverMessagesReceived = true;
			
			readThread = new RTISimConnectThread(this, dedicatedRtiSocket);
			readThread.start();
			
			JsonObject json = Json.createObjectBuilder()
					.add("simName", simName)
					.build();
			publish("RTI_InitializeSim", json.toString());
			
			// do I really need a thread just to write? I only write in the "publish()" function.
			printLine("Connected successfully.");
		} catch (NumberFormatException e) {
			printLine("   NumberFormatException error occurred... ");
			e.printStackTrace();
		} catch (UnknownHostException e) {
			printLine("   UnknownHostException error occurred...");
			e.printStackTrace();
		} catch (IOException e) {
			printLine("   IOException error occurred...");
			e.printStackTrace();
		}

		return 0;
	}
	
	public int reconnect() {
		// create new thread to replace previous thread, then send message "reconnect" to copy info on server side
		// ... but thread is destroyed on server side when replaced here, so that info is gone
		//			- this library has to remember what it is subscribed to, and resend information from scratch, rather than reconnecting (special logic) on Server side
		// ... but messages attempted to be sent to this sim might not be sent again with new connection
		// 			- its possible this sim hasn't tried to send a message for several minutes, so ALL subscribed messages would have to be resent
		// ... but what if sim doesn't try to send a message, because still "waiting" for new message?
		printLine("trying to reconnect now...");
		try {
			rtiSocket.close();
			rtiSocket = new Socket(lastHostName, Integer.parseInt(lastPortNumber));
			
			BufferedReader in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			in.readLine();
			String dedicatedHost = lastHostName; //in.readLine();
			String dedicatedPort = in.readLine();
			printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);
			dedicatedRtiSocket.close();
			dedicatedRtiSocket = new Socket(dedicatedHost, Integer.parseInt(dedicatedPort));
			
			readThread = new RTISimConnectThread(this, dedicatedRtiSocket);
			readThread.start();
			
			JsonObject json = Json.createObjectBuilder()
					.add("simName", simName)
					.build();
			publish("RTI_InitializeSim", json.toString());
			
			// do I really need a thread just to write? I only write in the "publish()" function.
			printLine("Connected successfully.");
			
			// ALSO, because we had to reconnect, we need to resubscribe to most recent version of latest messages.
			// - We are assuming this simulation needs the most recent message of each, and does not need others.
			// - We are assuming the simulation can determine for themselves how to handle older or unwanted messages.
			for (int i = 0; i < subscribeHistory.size(); i++) {
				JsonObject jsonSubscribe = Json.createObjectBuilder()
						.add("subscribeTo", subscribeHistory.get(i))
						.build();
				publish("RTI_SubscribeToMessagePlusLatest", jsonSubscribe.toString());
			}
			
		} catch (NumberFormatException e) {
			printLine("   NumberFormatException error occurred... ");
			e.printStackTrace();
			return -1;
		} catch (UnknownHostException e) {
			printLine("   UnknownHostException error occurred...");
			e.printStackTrace();
			return -2;
		} catch (IOException e) {
			printLine("   IOException error occurred...");
			e.printStackTrace();
			return -3;
		}

		return 0;
	}
	
	public int reconnect(String lastMessageName, String lastMessageContent) {
		// create new thread to replace previous thread, then send message "reconnect" to copy info on server side
		// ... but thread is destroyed on server side when replaced here, so that info is gone
		//			- this library has to remember what it is subscribed to, and resend information from scratch, rather than reconnecting (special logic) on Server side
		// ... but messages attempted to be sent to this sim might not be sent again with new connection
		// 			- its possible this sim hasn't tried to send a message for several minutes, so ALL subscribed messages would have to be resent
		// ... but what if sim doesn't try to send a message, because still "waiting" for new message?
		printLine("trying to reconnect (with lastMessage to resend) now...");
		try {
			rtiSocket.close();
			rtiSocket = new Socket(lastHostName, Integer.parseInt(lastPortNumber));
			
			BufferedReader in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			in.readLine();
			String dedicatedHost = lastHostName;	//in.readLine();
			String dedicatedPort = in.readLine();
			printLine("RTI reached. Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);
			dedicatedRtiSocket.close();
			dedicatedRtiSocket = new Socket(dedicatedHost, Integer.parseInt(dedicatedPort));
			
			readThread = new RTISimConnectThread(this, dedicatedRtiSocket);
			readThread.start();
			
			JsonObject json = Json.createObjectBuilder()
					.add("simName", simName)
					.build();
			publish("RTI_InitializeSim", json.toString());
			
			// do I really need a thread just to write? I only write in the "publish()" function.
			printLine("Connected successfully.");
			
			// ALSO, because we had to reconnect, we need to resubscribe to most recent version of latest messages.
			// - We are assuming this simulation needs the most recent message of each, and does not need others.
			// - We are assuming the simulation can determine for themselves how to handle older or unwanted messages.
			for (int i = 0; i < subscribeHistory.size(); i++) {
				JsonObject jsonSubscribe = Json.createObjectBuilder()
						.add("subscribeTo", subscribeHistory.get(i))
						.build();
				publish("RTI_SubscribeToMessagePlusLatest", jsonSubscribe.toString());
			}
			
			// ALSO, resend the last message
			publish(lastMessageName, lastMessageContent);

		} catch (NumberFormatException e) {
			printLine("   NumberFormatException error occurred... ");
			e.printStackTrace();
		} catch (UnknownHostException e) {
			printLine("   UnknownHostException error occurred...");
			e.printStackTrace();
		} catch (IOException e) {
			printLine("   IOException error occurred...");
			e.printStackTrace();
		}

		return 0;
	}
	
	public int disconnect() {
		readThread.closeConnection();
		return 0;
	}
	
	public int subscribeTo(String messageName) {
		JsonObject json = Json.createObjectBuilder()
				.add("subscribeTo", messageName)
				.build();
		publish("RTI_SubscribeTo",json.toString());
		
		subscribeHistory.add(messageName);
		return 0;
	}
	
	public int subscribeToMessagePlusHistory(String messageName) {
		JsonObject json = Json.createObjectBuilder()
				.add("subscribeTo", messageName)
				.build();
		publish("RTI_SubscribeToMessagePlusHistory",json.toString());
		
		subscribeHistory.add(messageName);
		return 0;
	}
	
	public int subscribeToMessagePlusLatest(String messageName) {
		JsonObject jsonSubscribe = Json.createObjectBuilder()
				.add("subscribeTo", messageName)
				.build();
		publish("RTI_SubscribeToMessagePlusLatest", jsonSubscribe.toString());
		
		subscribeHistory.add(messageName);
		return 0;
	}
	
	public int subscribeToAll() {
		publish("RTI_SubscribeToAll", "");
		return 0;
	}
	
	public int subscribeToAllPlusHistory() {
		publish("RTI_SubscribeToAllPlusHistory","");
		return 0;
	}
	
	public int publishTo(String messageName) {
		JsonObject json = Json.createObjectBuilder()
				.add("publishTo", messageName)
				.build();
		publish("RTI_PublishTo",json.toString());
		return 0;
	}
	
	public int publish(String name, String content) {
		// combine into json object when sending
		printLine("\t\t\t PUBLISH THIS: " + name);
		try {
			long timestamp = System.currentTimeMillis();
			JsonObject json =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", "" + timestamp)
					.add("vTimestamp", vTimestamp)
					.add("source", simName)
					.add("tcp", "" + tcpOn)
					.build();
			PrintWriter out;
			out = new PrintWriter(dedicatedRtiSocket.getOutputStream(), true);
			out.println(json);
			out.flush();
			
			if (name.compareTo("RTI_ReceivedMessage") != 0) {
				handleTcpResponse(name, content, "" + timestamp, "0", simName, json.toString());
			}
		} catch (IOException e) {
			printLine("   When trying to send message: IOExceoption error happened here...");
			e.printStackTrace();
		} catch (Exception e) {
			printLine("   When trying to send message: Exceoption error happened here... " + e.getMessage());
			e.printStackTrace();
		}

		
		return 0;
	}
	
	public int sendWithoutAddingToTcp(String name, String content, String timestamp, String vTimestamp, String source) {
		printLine("\t\t\t PUBLISH THIS: " + name);
		try {
			JsonObject json =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", "" + timestamp)
					.add("vTimestamp", vTimestamp)
					.add("source", source)
					.add("tcp", "" + tcpOn)
					.build();
			PrintWriter out;
			out = new PrintWriter(dedicatedRtiSocket.getOutputStream(), true);
			out.println(json);
			out.flush();
		} catch (IOException e) {
			printLine("   When trying to resend message: IOExceoption error happened here...");
			e.printStackTrace();
		} catch (Exception e) {
			printLine("   When trying to resend message: Exceoption error happened here... " + e.getMessage());
			e.printStackTrace();
		}
		
		return 0;
	}
	
	public int receivedMessage(String message) {
		String name = "";
		String content = "";
		String timestamp = "";
		String vTimestamp = "";
		String source = "";
		// handle tcp if server expects a response
		String tcp = "";
		
		serverMessagesReceived = true;
		
		JsonReader reader = Json.createReader(new StringReader(message));
		JsonObject json = reader.readObject();
		
		name = json.getString("name", "");
		content = json.getString("content", "");
		timestamp = json.getString("timestamp", "");
		vTimestamp = json.getString("vTimestamp", "");
		source = json.getString("source", "");
		tcp = json.getString("tcp", "");
		
		if (name.compareTo("RTI_ReceivedMessage")==0) {
			// Tell sim it received the message, it can stop waiting for response now.
			setTcpResponse(true, content);
			return 0;
		}
		
		if (settingsExists == -1) {
			if (Boolean.parseBoolean(tcp) == true) {
				tcpOn = true;
				settingsExists = 0;
				publish("RTI_ReceivedMessage", message);
				// below code needs to be repeated in place where "settings" file would be (locally with RTILib)
					new java.util.Timer().scheduleAtFixedRate(
							new java.util.TimerTask() {
								@Override
								public void run() {
									checkTcpMessages();
								}
							}
							, 5000, 5000);
			}
		} else {
			if (Boolean.parseBoolean(tcp) == true) {
				publish("RTI_ReceivedMessage", message);
			}
		}
		
		//if thisSim is available, call upon api directly, else add message to an ordered queue (ordered based on timestamp)
		if (thisSim != null) {
			thisSim.receivedMessage(name, content, timestamp, vTimestamp, source);
		} else {
			Message newMessage = new Message();
			newMessage.name = name;
			newMessage.content = content;
			newMessage.timestamp = timestamp;
			newMessage.vTimestamp = vTimestamp;
			newMessage.source = source;
			newMessage.originalMessage = message;
			messageQueue.add(newMessage);
			/* (no point to sort list any more, we just iterate through whole array list anyway...)
			try {
				Collections.sort(messageQueue);
			} catch (Exception e) {
				printLine("For some reason, unable to sort the list due to Collections.sort(messageQueue) giving an error of NoSuchElementException... " + e.getMessage());
			}*/
			printLine("Received new message, messageQueue now has this many: " + messageQueue.size());
		}

		return 0;
	}
	
	public class MessageReceived{
		int sendAttempts = 0;
		boolean messageReceived = false;
		String name = "";
		String content = "";
		String timestamp = "";
		String vTimestamp = "";
		String source = "";
		String message = "";
		long originalTimeSent = 0;
	}
	ArrayList<MessageReceived> tcpMessageBuffer = new ArrayList<MessageReceived>();
	boolean tcpMessageBufferAvailable = true;
	public int setTcpResponse(boolean setResponse, String message) {
		try {
			while (tcpMessageBufferAvailable == false) {
				TimeUnit.MILLISECONDS.sleep(100);
			}
			
			tcpMessageBufferAvailable = false;
			Iterator<MessageReceived> i = tcpMessageBuffer.iterator();
			while (i.hasNext()) {
				MessageReceived mr = i.next();
				if (mr.message.compareTo(message) == 0) {
					// we could just set the variable to "true" and handle removing elsewhere, 
					// or in best case scenario, we can remove here and never have to worry about checking to resend (list would be empty).
					i.remove();
				}
			}
			tcpMessageBufferAvailable = true;
		} catch (Exception e) {
			
		}
		
		return 0;
	}
	
	private int handleTcpResponse(String name, String content, String timestamp, String vTimestamp, String source, String message) {
		if (tcpOn == false)
			return 0;
		
		MessageReceived newMessage = new MessageReceived();
		newMessage.sendAttempts = 1;
		newMessage.messageReceived = false;
		newMessage.name = name;
		newMessage.content = content;
		newMessage.timestamp = timestamp;
		newMessage.vTimestamp = vTimestamp;
		newMessage.source = source;
		newMessage.message = message;
		newMessage.originalTimeSent = System.currentTimeMillis();
		
		while (tcpMessageBufferAvailable == false) {
			try {
				TimeUnit.MILLISECONDS.sleep(100);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		
		tcpMessageBufferAvailable = false;
		tcpMessageBuffer.add(newMessage);
		tcpMessageBufferAvailable = true;
		
		return 0;
	}
	
	public int checkTcpMessages() {
		if (tcpMessageBuffer.isEmpty())
			return 0;
		
		while (tcpMessageBufferAvailable == false) {
			try {
				TimeUnit.MILLISECONDS.sleep(100);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		
		tcpMessageBufferAvailable = false;
		
		Iterator<MessageReceived> it = tcpMessageBuffer.iterator();
		while (it.hasNext()) {
			MessageReceived mr = it.next();
			if (mr.sendAttempts >= 3) {
				reconnect(mr.name, mr.content);
				it.remove();
			}
		}
		
		for (int i = 0; i < tcpMessageBuffer.size(); i++) {
			if (System.currentTimeMillis() - tcpMessageBuffer.get(i).originalTimeSent > 3000) {
				tcpMessageBuffer.get(i).sendAttempts++;
				sendWithoutAddingToTcp(tcpMessageBuffer.get(i).name, tcpMessageBuffer.get(i).content, 
						tcpMessageBuffer.get(i).timestamp, tcpMessageBuffer.get(i).vTimestamp, tcpMessageBuffer.get(i).source);
			}
		}
		
		tcpMessageBufferAvailable = true;
		
		return 0;
	}
	
	public String getNextMessage() {
		String returnString = "";
		printLine("getNextMessage() called...");
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage is null.");
		} else {
			String debugLine = "";
			for (int i = 0; i < messageQueue.size(); i++) {
				try {
					debugLine += messageQueue.get(i).name + "\t";
				} catch (Exception e) {
					debugLine += "(exception when trying to access)" + "\t";
				}
			}
			printLine("queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
			
			try {
				if (messageQueue.get(0) != null && messageQueue.get(0).originalMessage != null) {
					printLine("getNextMessage was NOT null.");
					returnString = messageQueue.get(0).originalMessage;
					messageQueue.remove(0);
				} else {
					printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
					if (messageQueue.get(0) == null) {
						printLine("somehow, messageQueue(0) is NULL, even though messageQueue.isEmpty() is false?");
					} else {
						printLine("message at index 0 : " + messageQueue.get(0).toString());
					}
				}
			} catch (Exception e) {
				printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " +0 + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
			}
			
		}
		return returnString;
	}
	
	public String getNextMessage(int millisToWait) {
		String returnString = "";
		printLine("getNextMessage() called...");
		for (int i = 0; i < millisToWait; i+=10) {
			if (messageQueue.isEmpty() == false) {
				break;
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
		}
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage(millisToWait) is null.");
		} else {
			String debugLine = "";
			for (int i = 0; i < messageQueue.size(); i++) {
				try {
					debugLine += messageQueue.get(i).name + "\t";
				} catch (Exception e) {
					debugLine += "(exception when trying to access)" + "\t";
				}
			}
			printLine("queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
			
			try {
				if (messageQueue.get(0) != null && messageQueue.get(0).originalMessage != null) {
					printLine("getNextMessage(millisToWait) was NOT null.");
					returnString = messageQueue.get(0).originalMessage;
					messageQueue.remove(0);
				} else {
					printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
					if (messageQueue.get(0) == null) {
						printLine("somehow, messageQueue(0) is NULL, even though messageQueue.isEmpty() is false?");
					} else {
						printLine("message at index 0 : " + messageQueue.get(0).toString());
					}
				}
			} catch (Exception e) {
				printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + 0 + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
			}
		}
		return returnString;
	}
	
	public String getNextMessage(Integer millisToWait) {
		String returnString = "";
		printLine("getNextMessage() called...");
		for (int i = 0; i < millisToWait; i+=10) {
			if (messageQueue.isEmpty() == false) {
				break;
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
		}
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage(millisToWait) is null.");
		} else {			
			try {
				String debugLine = "";
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						debugLine += messageQueue.get(i).name + "\t";
					} catch (Exception e) {
						debugLine += "(exception when trying to access)" + "\t";
					}
				}
				printLine("queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
				
				if (messageQueue.get(0) != null && messageQueue.get(0).originalMessage != null) {
					printLine("getNextMessage(millisToWait) was NOT null.");
					returnString = messageQueue.get(0).originalMessage;
					messageQueue.remove(0);
				} else {
					printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
					if (messageQueue.get(0) == null) {
						printLine("somehow, messageQueue(0) is NULL, even though messageQueue.isEmpty() is false?");
					} else {
						printLine("message at index 0 : " + messageQueue.get(0).toString());
					}
				}
			} catch (Exception e) {
				printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + 0 + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
			}
			
		}
		return returnString;
	}
	
	public String getNextMessage(String messageName) {
		String returnString = "";
		printLine("getNextMessage() called...");
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage is null.");
		} else {
			String debugLine = "";
			for (int i = 0; i < messageQueue.size(); i++) {
				try {
					debugLine += messageQueue.get(i).name + "\t";
				} catch (Exception e) {
					debugLine += "(exception when trying to access)" + "\t";
				}
			}
			printLine("queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
			
			for (int i = 0; i < messageQueue.size(); i++) {
				try {
					//if (messageQueue.get(i) != null) {
					//	if (messageQueue.get(i).name != null ) {
							if (messageQueue.get(i).name.compareTo(messageName)==0) {
								if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
									printLine("getNextMessage was NOT null.");
									returnString = messageQueue.get(i).originalMessage;
									messageQueue.remove(i);
									break;
								} else {
									printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
									if (messageQueue.get(i) == null) {
										printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i + ", length = " + messageQueue.size());
									} else {
										printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
									}
								}
							}
						//}
					//}
				} catch (Exception e) {
					printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
				}
			}
			
			
		}
		return returnString;
	}
	
	public String getNextMessage(String messageName, int millisToWait) {
		String returnString = "";
		String debugErr = readThread.getDisconnectedErr();
		if (debugErr != null) {
			printLine("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
			System.out.println("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
		}
		
		String debugLine = "";
		//for debugging, print out queue before and after 
		for (int i = 0; i < messageQueue.size(); i++) {
			try {
				debugLine += messageQueue.get(i).name + "\t";
			} catch (Exception e) {
				debugLine += "(exception when trying to access)" + "\t";
			}
		}
		printLine("getting oldest message... queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
		for (int j = 0; j < millisToWait; j+=10) {
			if (messageQueue.isEmpty() == false) {
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
				
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
			if (returnString.compareTo("") != 0) {
				break;
			}
		}
		return returnString;
	}
	
	public String getNextMessage(String messageName, int millisToWait, int code, int maxTimestep) {
		String returnString = "";
		
		if (code == 0) {
			// 0 = get oldest message of 'messageName' from queue
			returnString = getNextMessage(messageName, millisToWait);
		} else if (code == 1) {
			// 1 = get newest message of 'messageName' from queue, remove all others
			returnString = getNextNewestMessage(messageName, millisToWait);
		} else if (code == 2) {
			// 2 = get newest message where vTimestamp < maxTimestep, remove all previous less than maxTimestep
			returnString = getNextNewestMessageLessThan(messageName, millisToWait, maxTimestep);
		} else if (code == 3) {
			// 3 = get newest message where vTimestamp > maxTimestep, remove all previous
			returnString = getNextNewestMessageGreaterThan(messageName, millisToWait, maxTimestep);
		} else if (code == 4) {
			// 4 = get newest message where vTimestamp == maxTimestep, remove all previous less than maxTimestep
			returnString = getNextNewestMessageGreaterThan(messageName, millisToWait, maxTimestep);
		} else if (code == 5) {
			// 5 = pass all exiting messages to simulator (not viable with current design of 'Wrapper')
		}
		
		return returnString;
	}
	
	public String getNextNewestMessage(String messageName) {
		String returnString = "";
		printLine("getNextNewestMessage() called...");
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage is null.");
		} else {
			// remove all older messages of 'messageName,' return the most recent found.
			for (int i = 0; i < messageQueue.size(); i++) {
				try {
					if (messageQueue.get(i).name.compareTo(messageName)==0) {
						if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
							returnString = messageQueue.get(i).originalMessage;
							messageQueue.remove(i);
							i = i - 1;
							//break;
						} else {
							printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
							if (messageQueue.get(i) == null) {
								printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
							} else {
								printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
							}
						}
					}
				} catch (Exception e) {
					printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
				}
			}
			/*for (int i = messageQueue.size() - 1; i >= 0; i--) {
				if (messageQueue.get(i) != null) {
					if (messageQueue.get(i).name != null ) {
						if (messageQueue.get(i).name.compareTo(messageName)==0) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								printLine("getNextMessage was NOT null.");
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i + ", length = " + messageQueue.size());
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					}
				}
			}*/
			
		}
		return returnString;
	}
	
	public String getNextNewestMessage(String messageName, int millisToWait) {
		String returnString = "";
		String debugErr = readThread.getDisconnectedErr();
		if (debugErr != null) {
			printLine("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
			System.out.println("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
		}
		
		String debugLine = "";
		//for debugging, print out queue before and after 
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		printLine("getting newest message... queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
		for (int j = 0; j < millisToWait; j+=10) {
			if (messageQueue.isEmpty() == false) {
				// remove all older messages of 'messageName,' return the most recent found.
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								i = i - 1;
								//break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
				/*for (int i = messageQueue.size() - 1; i >= 0; i--) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}*/
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
			if (returnString.compareTo("") != 0) {
				break;
			}
		}
		//for debugging, print out queue before and after 
		debugLine = "";
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		return returnString;
	}
	
	public String getNextNewestMessageLessThan(String messageName, int millisToWait, int virtualT) {
		String returnString = "";

		String debugErr = readThread.getDisconnectedErr();
		if (debugErr != null) {
			printLine("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
			System.out.println("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
		}
		
		String debugLine = "";
		//for debugging, print out queue before and after 
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		printLine("getting newest message less than... queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
		for (int j = 0; j < millisToWait; j+=10) {
			if (messageQueue.isEmpty() == false) {
				// remove all older messages of 'messageName,' return the most recent found.
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0 && Integer.parseInt(messageQueue.get(i).vTimestamp) < virtualT) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								i = i - 1;
								//break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
			if (returnString.compareTo("") != 0) {
				break;
			}
		}
		//for debugging, print out queue before and after 
		debugLine = "";
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		return returnString;
	}
	
	public String getNextNewestMessageGreaterThan(String messageName, int millisToWait, int virtualT) {
		String returnString = "";

		String debugErr = readThread.getDisconnectedErr();
		if (debugErr != null) {
			printLine("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
			System.out.println("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
		}
		
		String debugLine = "";
		//for debugging, print out queue before and after 
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		printLine("get next newest message greater than... queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
		for (int j = 0; j < millisToWait; j+=10) {
			if (messageQueue.isEmpty() == false) {
				// remove all older messages of 'messageName,' return the most recent found.
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0 && Integer.parseInt(messageQueue.get(i).vTimestamp) > virtualT) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								i = i - 1;
								//break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						} else if (messageQueue.get(i).name.compareTo(messageName) == 0) {
							messageQueue.remove(i);
							i = i - 1;
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
			if (returnString.compareTo("") != 0) {
				break;
			}
		}
		//for debugging, print out queue before and after 
		debugLine = "";
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		return returnString;
	}
	
	public String getNextNewestMessageEqualTo(String messageName, int millisToWait, int virtualT) {
		String returnString = "";

		String debugErr = readThread.getDisconnectedErr();
		if (debugErr != null) {
			printLine("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
			System.out.println("WARNING: did you know there might be a disconnect with the RTI? " + debugErr);
		}
		
		String debugLine = "";
		//for debugging, print out queue before and after 
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		printLine("queue before checking message: size = " + messageQueue.size() + " ... " + debugLine);
		for (int j = 0; j < millisToWait; j+=10) {
			if (messageQueue.isEmpty() == false) {
				// remove all older messages of 'messageName,' return the most recent found.
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0 && Integer.parseInt(messageQueue.get(i).vTimestamp) == virtualT) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								i = i - 1;
								//break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						} else if (messageQueue.get(i).name.compareTo(messageName) == 0 && Integer.parseInt(messageQueue.get(i).vTimestamp) < virtualT) {
							messageQueue.remove(i);
							i = i - 1;
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				printLine("while trying to get next message, some error happened: " + e.getMessage());
			}
			if (returnString.compareTo("") != 0) {
				break;
			}
		}
		//for debugging, print out queue before and after 
		debugLine = "";
		for (int i = 0; i < messageQueue.size(); i++) {
			debugLine += messageQueue.get(i).name + "\t";
		}
		return returnString;
	}
	
	/*public String getNextNewestMessageLessThanOrEqualTo(String messageName, int virtualT) {
		String returnString = "";
		// get most recent message that is less than or equal to virtualT
		printLine("getNextNewestMessage() called...");
		if (messageQueue.isEmpty()) {
			returnString = "";
			printLine("getNextMessage is null.");
		} else {
			for (int i = messageQueue.size() - 1; i >= 0; i--) {
				try {
					if (messageQueue.get(i) != null) {
						if (messageQueue.get(i).name != null ) {
							if (messageQueue.get(i).name.compareTo(messageName)==0 && Integer.parseInt(messageQueue.get(i).vTimestamp) <= virtualT) {
								if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
									printLine("getNextMessage was NOT null.");
									returnString = messageQueue.get(i).originalMessage;
									messageQueue.remove(i);
									break;
								} else {
									printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
									if (messageQueue.get(i) == null) {
										printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i + ", length = " + messageQueue.size());
									} else {
										printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
									}
								}
							}
						}
					}
				} catch (Exception e) {
					printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
				}
			}
			
		}
		
		return returnString;
	}*/
	
	public String getNextMessageHistory(String messageName) {
		String returnString = "";
		
		printLine("... not implemented. How would you expect to pass multiple versions of a single message?");
		
		return returnString;
	}
	
	public String waitForNextMessage() {
		String returnString = "";
		printLine("will immediately return message if there is one in the message buffer, else will wait until the queue gets a value.");
		while (messageQueue.isEmpty()) {
			
		}
		if (messageQueue.get(0) != null && messageQueue.get(0).originalMessage != null) {
			returnString = messageQueue.get(0).originalMessage;
			messageQueue.remove(0);
		} else {
			printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
			if (messageQueue.get(0) == null) {
				printLine("somehow, messageQueue(0) is NULL, even though messageQueue.isEmpty() is false?");
			} else {
				printLine("message at index 0 : " + messageQueue.get(0).toString());
			}
		}
		
		return returnString;
	}
	
	public String waitForNextMessage(String messageName) {
		String returnString = "";
		printLine("will immediately return message if there is specific message in the buffer, else will wait until the queue gets a value.");
		while (returnString =="") {
			if (messageQueue.isEmpty() == false) {
				for (int i = 0; i < messageQueue.size(); i++) {
					try {
						if (messageQueue.get(i).name.compareTo(messageName)==0) {
							if (messageQueue.get(i) != null && messageQueue.get(i).originalMessage != null) {
								returnString = messageQueue.get(i).originalMessage;
								messageQueue.remove(i);
								break;
							} else {
								printLine("getNextMessage was either null, or originalMessage was null. This is a strange occurance...");
								if (messageQueue.get(i) == null) {
									printLine("somehow, messageQueue(i) is NULL, even though messageQueue.isEmpty() is false? i = " + i);
								} else {
									printLine("message at index i (" + i + ") : " + messageQueue.get(i).toString());
								}
							}
						}
					} catch (Exception e) {
						printLine("some strange issue occurred when trying to getNextMessage (name == null, message == null, etc.) at list index " + i + " out of " +messageQueue.size() + "... return nothing and continue without breaking sim.");
					}
				}
			}
			try {
				TimeUnit.MILLISECONDS.sleep(10);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}

		return returnString;
	
	}
	
	public boolean isJsonArray(String name, String content) {
		boolean returnValue = false;
		
		if (content.compareTo("")==0 || content == null) {
			returnValue = false;
			return returnValue;
		}
		
		try {
			JsonReader reader = Json.createReader(new StringReader(content));
			JsonObject json = reader.readObject();
			JsonValue jValue = json.get(name);
			
			// what if the JSONNArray is surrounded by quotes?
			if (jValue instanceof JsonArray) {
				returnValue = true;
			}

		}
		catch (Exception e) {
			printLine("something went wrong when trying to get Json object. Returning null.");
			returnValue = false;
			return returnValue;
		}
		
		return returnValue;
	}
	
	public String getJsonObject(String name, String content) {
		String returnString = "";
		
		//printLine("asked to read jsonValue from content (" + content + ")");
		if (content.length() < 1000) {
			printLine("asked to read jsonValue from content (" + content + ")");
		} else {
			printLine("asked to read jsonValue from content (" + content.substring(0, 500) 
				+ " ... " + content.substring(content.length() - 500, content.length()) + ")");
		}
		
		if (content.compareTo("")==0 || content == null) {
			returnString = null;
			return returnString;
		}
		
		try {
			JsonReader reader = Json.createReader(new StringReader(content));
			JsonObject json = reader.readObject();
			
			if (json.containsKey(name)) {
				// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
				JsonValue jvalue = json.get(name);
				if (jvalue.getValueType() == JsonValue.ValueType.STRING) {
					returnString = json.getString(name, "").toString();
				} else {
					returnString = json.get(name).toString();
				}
			}
			else {
				returnString = null;
			}
			
			printLine("asked to read jsonValue for " + name + " " + returnString);
		}
		catch (Exception e) {
			printLine("something went wrong when trying to get Json object. Returning null.");
			returnString = null;
			return returnString;
		}
		return returnString;
	}
	
	/* String getJsonObjectFast(String, String)
	 * - An alternative to "getJsonObject" that does not properly parse out element as a JSON object, but using basic string API in Java.
	 * - This approach is significantly faster, but not guaranteed to properly parse out duplicate or subobjects in certain cases. 
	 * - Best for simple messages/objects.
	 *  */
	public String getJsonObjectFast(String name, String content) {
		String returnString = "";
		//printLine("asked to read jsonValue from content (" + content + ")");
		if (content.length() < 1000) {
			printLine("asked to read jsonValue from content (" + content + ")");
		} else {
			printLine("asked to read jsonValue from content (" + content.substring(0, 500) 
				+ " ... " + content.substring(content.length() - 500, content.length()) + ")");
		}
		
		if (content.compareTo("")==0 || content == null) {
			returnString = null;
			return returnString;
		}
		
		try {
			int positionName = content.indexOf(name);
			if (positionName == -1) {
				returnString = null;
			} else {
				int positionObject = positionName + 2;	// ":
				String subString = content.substring(positionObject, content.length());
				int endIndex = 0;
				if (subString.charAt(0) == '[') {
					endIndex = subString.indexOf("],");
					if (endIndex == -1) {
						endIndex = subString.indexOf("]}");
					}
				} else if (subString.charAt(0) == '\"') {
					endIndex = subString.indexOf("\",");
					if (endIndex == -1) {
						endIndex = subString.indexOf("\"}");
					}
				}
				if (endIndex == -1) {
					returnString = null;
				} else {
					returnString = subString.substring(0,endIndex+1);
					returnString = getStringNoQuotes(returnString);
					printLine("asked to read jsonValue for " + name + " " + returnString);
				}
			}
		}
		catch (Exception e) {
			printLine("something went wrong when trying to get Json object. Returning null.");
			returnString = null;
			return returnString;
		}
		return returnString;
	}
	
	public String getJsonString(String name, String content) {
		String returnString = "";
		
		if (content == "" || content == null) {
			returnString = null;
			return returnString;
		}
		
		JsonReader reader = Json.createReader(new StringReader(content));
		JsonObject json = reader.readObject();
		
		if (json.containsKey(name)) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.getString(name, "").toString();
		}
		else {
			returnString = null;
		}
		return returnString;
	}
	
	public String getJsonStringFast(String name, String content) {
		String returnString = "";
		
		if (content == "" || content == null) {
			returnString = null;
			return returnString;
		}
		
		int positionName = content.indexOf(name);
		if (positionName == -1) {
			returnString = null;
		} else {
			int positionObject = positionName + 2;	// ":
			String subString = content.substring(positionObject, content.length());
			int endIndex = 0;
			if (subString.charAt(0) == '[') {
				endIndex = subString.indexOf("],");
				if (endIndex == -1) {
					endIndex = subString.indexOf("]}");
				}
			} else if (subString.charAt(0) == '\"') {
				endIndex = subString.indexOf("\",");
				if (endIndex == -1) {
					endIndex = subString.indexOf("\"}");
				}
			}
			if (endIndex == -1) {
				returnString = null;
			} else {
				returnString = subString.substring(0,endIndex+1);
				returnString = getStringNoQuotes(returnString);
				printLine("asked to read jsonValue for " + name + " " + returnString);
			}
		}
		
		return returnString;
	}
	
	public String[] getJsonArray(String content) {
		String [] returnString;
		
		if (content == "" || content == null) {
			returnString = new String[0];
			return returnString;
		}
		
		JsonReader reader = Json.createReader(new StringReader(content));
		JsonArray json = reader.readArray();
		
		returnString = new String[json.size()];
		for (int i = 0; i < returnString.length; i++) {
			returnString[i] = json.get(i).toString();
		}
		return returnString;
	}
	
	public String getStringNoQuotes(String content) {
		String returnString = "";
		
		int numOfQuotes = 0;
		for (int i = 0; i < content.length(); i++) {
			if (content.charAt(i) == '\"') {
				numOfQuotes++;
			}
		}
		if (numOfQuotes >= 2) {
			returnString = content.substring(1,content.length()-1);
		} else {
			returnString = content;
		}
		
		return returnString;
	}
	
	public String getMessageName(String originalMessage) {
		String returnString = "";
		JsonReader reader = Json.createReader(new StringReader(originalMessage));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("name")) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.get("name").toString();
		}
		else {
			returnString = "";
		}
		return returnString;
	}
	
	public String getMessageTimestamp(String originalMessage) {
		String returnString = "";
		JsonReader reader = Json.createReader(new StringReader(originalMessage));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("timestamp")) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.get("timestamp").toString();
		}
		else {
			returnString = "";
		}
		return returnString;
	}
	
	public String getMessageVTimestamp(String originalMessage) {
		String returnString = "";
		JsonReader reader = Json.createReader(new StringReader(originalMessage));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("vTimestamp")) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.get("vTimestamp").toString();
		}
		else {
			returnString = "";
		}
		return returnString;
	}
	
	public String getMessageSource(String originalMessage) {
		String returnString = "";
		JsonReader reader = Json.createReader(new StringReader(originalMessage));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("source")) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.get("source").toString();
		}
		else {
			returnString = "";
		}
		return returnString;
	}
	
	public String getMessageContent(String originalMessage) {
		String returnString = "";
		JsonReader reader = Json.createReader(new StringReader(originalMessage));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("content")) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.getString("content", "").toString();
		}
		else {
			returnString = "";
		}
		return returnString;
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, int contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, float contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, long contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, double contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, char contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, boolean contentNewObject) {
		return setJsonObject(originalJson, nameNewObject, "" + contentNewObject);
	}
	
	public String setJsonObject(String originalJson, String nameNewObject, String contentNewObject) {
		String returnString =  "";
		
		JsonObject newJson;
		JsonObjectBuilder newJsonBuilder = Json.createObjectBuilder();
		if (originalJson != null && originalJson.compareTo("") != 0) {
			try {
				JsonReader reader = Json.createReader(new StringReader(originalJson));
				JsonObject json = reader.readObject();
				
				for (java.util.Map.Entry<String, JsonValue> entry: json.entrySet()) {
					newJsonBuilder.add(entry.getKey(), entry.getValue());
				}
			} catch (Exception e) {
				printLine("There was something wrong with the original JSON object, ignoring it and making a new object.");
			}
		}
		newJsonBuilder.add(nameNewObject, contentNewObject);
		newJson =  newJsonBuilder.build();
		returnString = newJson.toString();
		
		return returnString;
	}
	
	public String setJsonArray(String originalJson, String nameNewObject, String[] contentNewArray) {
		String returnString = "";
		
		JsonObject newJson;
		JsonArray newJsonArray;
		JsonObjectBuilder newJsonBuilder = Json.createObjectBuilder();
		JsonArrayBuilder newArrayBuilder = Json.createArrayBuilder();
		if (originalJson != null && originalJson != "") {
			try {
				JsonReader reader = Json.createReader(new StringReader(originalJson));
				JsonObject json = reader.readObject();
				for (java.util.Map.Entry<String, JsonValue> entry: json.entrySet()) {
					newJsonBuilder.add(entry.getKey(), entry.getValue());
				}
			} catch (Exception e) {
				printLine("There was something wrong with the original JSON object, ignoring it and making a new object.");
			}
		}
		for (int i = 0; i < contentNewArray.length; i++) {
			newArrayBuilder.add(contentNewArray[i]);
		}
		newJsonArray = newArrayBuilder.build();
		newJsonBuilder.add(nameNewObject, newJsonArray);
		newJson =  newJsonBuilder.build();
		returnString = newJson.toString();
		
		return returnString;
	}

	public void printVersion() {
		printLine("SRTI Version - " + Version.version);
	}
	
	public void setDebugOutput(boolean setDebugOut) {
		Version.debugSimConsole = setDebugOut;
	}
	
	public void setDebugFileOutput(boolean setFileDebugOut) {
		Version.debugSimFile = setFileDebugOut;
	}
	
	public void setDebugGUI(boolean setGUIOut) {
		Version.setDebugGUI(setGUIOut);
	}
	
	private String tag = "RTILib";
	public void printLine(String line) {
		String formatLine = String.format("%1$32s", "[" + tag + "]" + " --- ") + line;
		Version.printSimConsole(formatLine);
		Version.printSimFile(formatLine);
		Version.printSimDebugGUI(formatLine);
	}

}
