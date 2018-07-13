package main;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.StringReader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonReader;

import mainServer.RTILib;

/*
 * File format:
 * 
 * Configuration.txt {
 * HostName
 * 127.0.1.1
 * PortNum
 * 43959
 * 
 * SimulatorName
 * PressureSim_srti
 * ChannelsToBeSubscribed
 * Scenario
 * WindSpeed
 * Damage
 * StepRelationship
 * 0 1 0		???
 * ChannelsToBePublished
 * Pressure
 * 
 *} 
 * 
 *MsgDefinition.txt {
 *msg_Scenario
 *string
 *gstep
 *string
 *nbuildings
 *string
 *location
 *string
 *buildinginfo
 *
 *... XXX
 *
 *}
 * 
 * XXXXXXXXXXXXXXXXXXX
 * 
 * Connection.txt
 * {
 * HostName
 * 127.0.1.1
 * PortNum
 * 43959
 * }
 * 
 * Configuration.txt
 * {
 * 
 * SimulatorName
 * PressureSim_srti
 * ChannelsToBeSubscribed
 * Scenario
 * ScenarioFunction0
 * WindSpeed
 * WindFunction0
 * Damage
 * DamageFunction0
 * ChannelsToBePublished
 * Pressure
 * PressureFunction0_gstep
 * PressureFunction0_pres
 * 
 * SimulatorName
 * WindSpeed_srti
 * ChannelsToBeSubscribed
 * Scenario
 * ScnarioFunction1
 * Pressure
 * PressureFunction1
 * ChannelsToBePublished
 * WindSpeed
 * WindSpeedFunction1_gstep
 * WindSpeedFunction1_pres
 * 
 * ...
 * 
 * }
 * 
 * MsgDefinition.txt{
 * 
 * Name
 * Scenario
 * Values
 * long
 * gstep
 * int
 * value
 * int[]
 * history
 * 
 * Name
 * WindSpeed
 * Values
 * ...
 * 
 * 
 * }
 * 
 *
 * 
 * */

public class Wrapper {

	public static void main (String [] args) {
		Wrapper mainTestSRTI = new Wrapper();
		
		mainTestSRTI.StartSRTI();
	}
	
	private String settings_file_name = "Settings.json";
	private String configuration_file_name = "Pressure.json";
	private String msg_definition_file_name = "Global.json";
	
	private String host_name = "";
	private String port_number = "";
	private String simulation_name = "";
	
	private Class simulationClass;
	private Object simulation;
	private Method[] simMethods;
	
	public class Channel{
		public String channelName = "";
		public int subscribe = 1;	// 1 = "subscribe", 2 = "publish", 3 = "other" (allow other definitions later in development)
		
		// subscribeChannelData
		public boolean oneTime = false;
		public int stepRelation = 0;
		
		// publishChannelData
		public boolean initial = false;
		public int historyDependent = 0;
	}
	private ArrayList<Channel> subscribedChannels = new ArrayList<Channel>();
	private ArrayList<Channel> publishedChannels = new ArrayList<Channel>();
	
	private ArrayList<String> subscribed_channels = new ArrayList<String>();
	private ArrayList<String> one_time_channels = new ArrayList<String>();
	private ArrayList<String> published_channels = new ArrayList<String>();
	
	public class MessageDefinition{
		public String messageName = "";
		public ArrayList<String> elementNames;
		public ArrayList<String> elementTypes;
	}
	private ArrayList<MessageDefinition> messageDefinitionList = new ArrayList<MessageDefinition>();
	
	
	public void StartSRTI() {
		
		System.out.println("Starting SRTI clients with third-party simulations.");
		
		if (ReadInitialSettingsFile() < 0) {
			System.out.println("ERROR: Settings file not readable. Closing application.");
			return;
		}
		if (ReadMsgDefinitionFile() < 0) {
			System.out.println("ERROR: Global file not readable. Closing application.");
			return;
		}
		if (ReadConfigurationFile() < 0) {
			System.out.println("ERROR: Configruation file not readable. Closing application.");
			return;
		}
		
		RTILib lib = new RTILib();
		
		try {
			simulationClass = Class.forName(simulation_name);
			simulation = simulationClass.newInstance();
			simMethods = simulationClass.getMethods();
			
			lib.setDebugOutput(true);
			lib.setSimName(simulation_name);
			lib.connect(host_name, port_number);
			
			int gstep = 0;
			int kTimeToWait = 50;
			
			for (Channel channel: subscribedChannels) {
				lib.subscribeTo(channel.channelName);
			}
			
			for (String channel: one_time_channels) {
				while(true) {
					String message = lib.getNextMessage(channel, kTimeToWait);
					if (!message.isEmpty() || message.length() > 2) {
						/* As of 2018-07-12,
						 * C++ version of wrapper relies on passing json object directly.
						 * We will test passing string instead here in Java.
						 * */
						
						// create json object of message, pass "content" as string to simulation through "setMessage()"
						String content = lib.getMessageContent(message);
						Object[] params = {channel, content};
						InvokeFunction("setMessage", params);
						break;
					}
				}
			}
			
			InvokeFunction("generateInitialMessage");
			for (Channel channel: publishedChannels) {
				// if message is an initial type, then publish
				if (channel.initial) {
					Object[] params = {channel.channelName};
					String getMessage = (String)InvokeFunction("getMessage", params);
					lib.publish(channel.channelName, getMessage);
				}
			}
			
			while (true) {
				for (String channel: subscribed_channels) {
					while (true) {
						String message = lib.getNextMessage(channel, kTimeToWait);
						if (!message.isEmpty() && message.length() > 2) {
							// same as parse message to "setMessage()" above.
							String content = lib.getMessageContent(message);
							Object[] params = {channel, content};
							InvokeFunction("setMessage", params);
							break;
						}
					}
				}
				
				InvokeFunction("simulate");
				
				for (String channel: published_channels) {
					Object[] params = {channel};
					String getMessage = (String)InvokeFunction("getMessage", params);
					lib.publish(channel, getMessage);
				}
				
				++gstep;
			}
		}catch (Exception e) {
			System.out.println("Something is wrong during test, closing now...");
			e.printStackTrace();
		} finally {
			// when finished, disconnect RTILib
			lib.disconnect();
		}
		
		System.out.println("Ending SRTI clients with third-party simulations.");
		
	}
	
	
	public Object InvokeFunction(String functionName) {
		Object returnObject = null;
		
		Method getMethod = null;
		for (Method m: simMethods) {
			if (m.getName().compareTo(functionName) == 0) {
				getMethod = m;
			}
		}
		if (getMethod != null) {
			try {
				returnObject = getMethod.invoke(simulation);
			} catch (Exception e) {
				System.out.println("Something is wrong trying to call funciton " + functionName + ", closing now...");
				e.printStackTrace();
			}
		} else {
			System.out.println("Something is wrong trying to invoke 'getMessage' from simulaiton...");
		}
		
		return returnObject;
	}

	public Object InvokeFunction(String functionName, Object[] params) {
		Object returnObject = null;
		
		Method getMethod = null;
		for (Method m: simMethods) {
			if (m.getName().compareTo(functionName) == 0) {
				getMethod = m;
			}
		}
		if (getMethod != null) {
			try {
				returnObject = getMethod.invoke(simulation, params);
			} catch (Exception e) {
				System.out.println("Something is wrong trying to call funciton " + functionName + ", closing now...");
				e.printStackTrace();
			}
		} else {
			System.out.println("Something is wrong trying to invoke 'getMessage' from simulaiton...");
		}
		
		return returnObject;
	}

	public int ReadInitialSettingsFile() {
		try {
			String totalContent = "";
			
			File file = new File(settings_file_name);
			FileReader fileReader;
			fileReader = new FileReader(file);
			BufferedReader bufferedReader = new BufferedReader(fileReader);
			String line;
			while (((line = bufferedReader.readLine()) != null)) {
				totalContent += line;
			}
			
			JsonReader reader = Json.createReader(new StringReader(totalContent));
			JsonObject json = reader.readObject();
			
			if (json.containsKey("configuration")) {
				// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
				configuration_file_name = json.getString("configuration", "").toString();
			}
			else {
				System.out.println("Missing 'configuration' in settings file.");
				return -2;
			}
			
			if (json.containsKey("global")) {
				// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
				msg_definition_file_name = json.getString("global", "").toString();
			}
			else {
				System.out.println("Missing 'global' in settings file.");
				return -2;
			}
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}

	public int ReadMsgDefinitionFile() {
		
		try {
			String totalContent = "";
			
			File file = new File(msg_definition_file_name);
			FileReader fileReader;
			fileReader = new FileReader(file);
			BufferedReader bufferedReader = new BufferedReader(fileReader);
			String line;
			while (((line = bufferedReader.readLine()) != null)) {
				totalContent += line;
			}

			JsonReader reader = Json.createReader(new StringReader(totalContent));
			JsonObject json = reader.readObject();
			
			Iterator<String> it = json.keySet().iterator();
			while(it.hasNext()) {
				String messageName = it.next();
				JsonObject messageDef = json.getJsonObject(messageName);
		
				MessageDefinition messageDefinition = new MessageDefinition();
				messageDefinition.elementNames = new ArrayList<String>();
				messageDefinition.elementTypes = new ArrayList<String>();
				
				Iterator<String> it2 = messageDef.keySet().iterator();
				while (it2.hasNext()) {
					String elementName = it2.next();
					messageDefinition.elementNames.add(elementName);
					
					String elementType = "";
					if (messageDef.get(elementName) instanceof JsonArray) {
						JsonArray elementTypeArray = (JsonArray) messageDef.get(elementName);
						elementType = "[" + elementTypeArray.getString(0) + "]";
					} else {
						elementType = messageDef.getString(elementName);
					}

					messageDefinition.elementTypes.add(elementType);
				}
				
				messageDefinitionList.add(messageDefinition);
			}
			
			System.out.println("Read message definitions, finished.");
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}

	public int ReadConfigurationFile() {
		
		try {
			String totalContent = "";
			
			File file = new File(configuration_file_name);
			FileReader fileReader;
			fileReader = new FileReader(file);
			BufferedReader bufferedReader = new BufferedReader(fileReader);
			String line;
			while (((line = bufferedReader.readLine()) != null)) {
				totalContent += line;
			}
			
			JsonReader reader = Json.createReader(new StringReader(totalContent));
			JsonObject json = reader.readObject();
			
			if (json.containsKey("hostName")) {
				// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
				host_name = json.getString("hostName", "").toString();
			}
			else {
				System.out.println("Missing 'hostName' in simulation configuration file.");
				return -2;
			}
			
			if (json.containsKey("portNumber")) {
				port_number = json.getString("portNumber", "").toString();
			}else {
				System.out.println("Missing 'portNumber' in simulation configuration file.");
				return -2;
			}
			
			if (json.containsKey("simulatorName")) {
				simulation_name = json.getString("simulatorName", "").toString();
			}else {
				System.out.println("Missing 'simulatorName' in simulation configuration file.");
				return -2;
			}
			
			if (json.containsKey("subscribedChannels")) {
				JsonObject subChannelList = json.getJsonObject("subscribedChannels");
				Iterator<String> it = subChannelList.keySet().iterator();
				while(it.hasNext()) {
					String subChannelName = it.next();
					JsonObject subChannel = subChannelList.getJsonObject(subChannelName);
					boolean oneTime = subChannel.getBoolean("oneTime");
					int stepRelation = subChannel.getInt("stepRelation");
					
					Channel newChannel = new Channel();
					newChannel.channelName = subChannelName;
					newChannel.subscribe = 1;
					newChannel.oneTime = oneTime;
					newChannel.stepRelation = stepRelation;
					subscribedChannels.add(newChannel);
					
					if (oneTime == true) {
						one_time_channels.add(subChannelName);
					} else {
						subscribed_channels.add(subChannelName);
					}
				}
			}
			
			if (json.containsKey("publishedChannels")) {
				JsonObject pubChannelList = json.getJsonObject("publishedChannels");
				Iterator<String> it = pubChannelList.keySet().iterator();
				while(it.hasNext()) {
					String pubChannelName = it.next();
					JsonObject pubChannel = pubChannelList.getJsonObject(pubChannelName);
					boolean initial = pubChannel.getBoolean("initial");
					int historyDependent = pubChannel.getInt("historyDependent");
					
					Channel newChannel = new Channel();
					newChannel.channelName = pubChannelName;
					newChannel.subscribe = 2;
					newChannel.initial = initial;
					newChannel.historyDependent = historyDependent;
					publishedChannels.add(newChannel);
					
					published_channels.add(pubChannelName);
				}
			}
			
			System.out.println("Read simulation settings, finished.");
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}
	
	


	

}
