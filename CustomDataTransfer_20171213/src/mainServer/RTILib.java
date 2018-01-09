package mainServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.net.Socket;
import java.net.UnknownHostException;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonReader;

public class RTILib {
	
	String tag = "RTILib";
	private RTISim thisSim;
	private Socket rtiSocket;
	private Socket dedicatedRtiSocket;
	private RTISimConnectThread readThread;
	private RTISimConnectThread writeThread;
	
	public RTILib(RTISim rtiSim) {
		thisSim = rtiSim;
	}
	
	public int connect() {
		
		return 0;
	}
	
	public int connect(String hostName, String portNumber) {
		
		printLine("trying to connect now...");
		try {
			rtiSocket = new Socket(hostName, Integer.parseInt(portNumber));
			
			BufferedReader in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			String dedicatedHost = in.readLine();
			String dedicatedPort = in.readLine();
			printLine("Now connecting to dedicated communication socket: " + dedicatedHost + " " + dedicatedPort);
			dedicatedRtiSocket = new Socket(dedicatedHost, Integer.parseInt(dedicatedPort));
			
			readThread = new RTISimConnectThread(this, dedicatedRtiSocket);
			readThread.start();
			
			JsonObject json = Json.createObjectBuilder()
					.add("simName", thisSim.getSimName())
					.build();
			publish("RTI_InitializeSim", json.toString());
			//need to also include publish/subscribe info above ^... would be set with "subscribeTo()" and "publishTo()" functions?
			
			// do I really need a thread just to write? I only write in the "publish()" function.
			//writeThread = new RTISimConnectThread()
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
	
	public int disconnect() {
		return 0;
	}
	
	public int subscribeTo(String messageName) {
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
		return 0;
	}
	
	public int publish(String name, String content) {
		// combine into json object when sending
		printLine("\t\t\t PUBLISH THIS: " + name);
		try {
			JsonObject json =  Json.createObjectBuilder()
					.add("name", name)
					.add("content", content)
					.add("timestamp", "" + System.currentTimeMillis())
					.add("fromSim", thisSim.getSimName())
					.build();
			PrintWriter out;
			out = new PrintWriter(dedicatedRtiSocket.getOutputStream(), true);
			out.println(json);
			out.flush();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			printLine("   IOExceoption error happened here...");
			e.printStackTrace();
		}

		
		return 0;
	}
	
	public int receivedMessage(String message) {
		String name = "";
		String content = "";
		String timestamp = "";
		String fromSim = "";
		
		JsonReader reader = Json.createReader(new StringReader(message));
		JsonObject json = reader.readObject();
		
		name = json.getString("name");
		content = json.getString("content");
		timestamp = json.getString("timestamp");
		fromSim = json.getString("fromSim");
		
		thisSim.receivedMessage(name, content, timestamp, fromSim);

		return 0;
	}
	
	public String getJsonValue(String name, String content) {
		String returnString = "";
		
		JsonReader reader = Json.createReader(new StringReader(content));
		JsonObject json = reader.readObject();
		
		if (json.containsKey(name)) {
			// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
			returnString = json.get(name).toString();
			/*int numOfQuotes = 0;
			for (int i = 0; i < returnString.length(); i++) {
				if (returnString.charAt(i) == '\"') {
					numOfQuotes++;
				}
			}
			if (numOfQuotes == 2) {
				returnString = json.getString(name);
			}*/
		}
		else {
			returnString = null;
		}
		
		printLine("asked to read jsonValue for " + name + " " + returnString);
		
		return returnString;
	}
	
	public String[] getJsonArray(String content) {
		String [] returnString;
		
		JsonReader reader = Json.createReader(new StringReader(content));
		JsonArray json = reader.readArray();
		
		returnString = new String[json.size()];
		for (int i = 0; i < returnString.length; i++) {
			returnString[i] = json.get(i).toString();
			
			/*int numOfQuotes = 0;
			for (int j = 0; j < returnString[i].length(); j++) {
				if (returnString[i].charAt(j) == '\"') {
					numOfQuotes++;
				}
			}
			if (numOfQuotes == 2) {
				returnString[i] = json.getString(i);
			}*/
		}
		return returnString;
	}
	
	public String getStringNoQuotes(String content) {
		String returnString = "";
		
		int numOfQuotes = 0;
		for (int j = 0; j < content.length(); j++) {
			if (content.charAt(j) == '\"') {
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
	
	
	
	public void printLine(String line) {
		System.out.println(String.format("%1$32s", "[" + tag + "]" + " --- ") + line);
	}

}
