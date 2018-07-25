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
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.SortedSet;
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
	
	//!!!!
	public class FunctionChannel{
		public String functionName = "";
		public Map<Integer, String> functionParameters;
		public String functionKeyName = "";
	}
	//!!!!
	
	public class Channel{
		public String channelName = "";
		public int subscribe = 1;	// 1 = "subscribe", 2 = "publish", 3 = "other" (allow other definitions later in development)
		
		// subscribeChannelData
		public boolean oneTime = false;
		public int stepRelation = 0;
		
		// publishChannelData
		public boolean initial = false;
		public int historyDependent = 0;
		
		//!!!! EXTRA (Java, 2018-07-18)
		public ArrayList<FunctionChannel> functionChannels;
		//!!!!
	}
	private ArrayList<Channel> subscribedChannels = new ArrayList<Channel>();
	private ArrayList<Channel> publishedChannels = new ArrayList<Channel>();
	
	private ArrayList<String> subscribed_channels = new ArrayList<String>();
	private ArrayList<String> one_time_channels = new ArrayList<String>();
	private ArrayList<String> published_channels = new ArrayList<String>();
	
	private String initializeFunction = "";
	private String simulateFunction = "";
	
	public class MessageDefinition{
		public String messageName = "";
		public ArrayList<String> elementNames;
		public ArrayList<String> elementTypes;
	}
	private ArrayList<MessageDefinition> messageDefinitionList = new ArrayList<MessageDefinition>();
	
	public class FunctionCall{
		public String messageName;
		public Object[] parameters;
	}
	private ArrayList<FunctionCall> functionBuffer = new ArrayList<FunctionCall>();
	
	private RTILib lib;
	
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
		
		lib = new RTILib();
		
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
			
			System.out.println("Testing one-time channels.");
			for (String channel: one_time_channels) {
				while(true) {
					String message = lib.getNextMessage(channel, kTimeToWait);
					if (!message.isEmpty() || message.length() > 2) {
						HandleSubscribeMessageComplex(channel, message);
						//HandleSubscribeMessageSimple(channel, message);
						break;
					}
				}
			}
			
			System.out.println("Testing initialized channels.");
			//HandleInitializeSimple();
			HandleInitializeComplex();
			for (Channel channel: publishedChannels) {
				// if message is an initial type, then publish
				if (channel.initial) {
					HandlePublishMessageSimple(channel.channelName);
				}
			}
			
			System.out.println("Beginning loop.");
			while (true) {
				for (String channel: subscribed_channels) {
					while (true) {
						System.out.println("Receiving subscribed message : " + channel);
						String message = lib.getNextMessage(channel, kTimeToWait);
						if (!message.isEmpty() && message.length() > 2) {
							// same as parse message to "setMessage()" above.
							HandleSubscribeMessageComplex(channel, message);
							//HandleSubscribeMessageSimple(channel, message);
							break;
						}
					}
				}
				System.out.println("Received all expected messages for a timestep.");
				HandleSubscribeMessageComplexSend();
				
				//HandleSimulateSimple();
				System.out.println("Simulate!");
				HandleSimulateComplex();
				
				for (String channel: published_channels) {
					System.out.println("Handle publishing message : " + channel);
					//HandlePublishMessageSimple(channel);
					HandlePublishMessageComplex(channel);
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
	
	
	public void HandleSubscribeMessageSimple(String channel, String message) {
		String content = lib.getMessageContent(message);
		Object[] params = {channel, content};
		InvokeFunction("setMessage", params);
	}
	
	public void HandleSubscribeMessageComplex(String channel, String message) {
		/* As of 2018-07-12,
		 * C++ version of wrapper relies on passing json object directly.
		 * We will test passing string instead here in Java.
		 * */
		String content = lib.getMessageContent(message);

		ArrayList<String> messageNameList = new ArrayList<String>();
		ArrayList<Object[]> parameterList = new ArrayList<Object[]>();
		ArrayList<Integer> parameterMaxSize = new ArrayList<Integer>();
		
		// set max size of array of parameters
		for (int i = 0; i < subscribedChannels.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).functionChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).functionChannels.size(); j++) {
						String functionName = subscribedChannels.get(i).functionChannels.get(j).functionName;
						if (messageNameList.contains(functionName)) {
							int index = messageNameList.indexOf(functionName);
							Set<Integer> parameterIndexes = subscribedChannels.get(i).functionChannels.get(j).functionParameters.keySet();
							for (Integer pIndex : parameterIndexes) {
								if (parameterMaxSize.get(index) < pIndex) {
									parameterMaxSize.set(index, pIndex);
								}
							}
						} else {
							messageNameList.add(functionName);
							parameterMaxSize.add(0);
							int index = messageNameList.indexOf(functionName);
							Set<Integer> parameterIndexes = subscribedChannels.get(i).functionChannels.get(j).functionParameters.keySet();
							for (Integer pIndex : parameterIndexes) {
								if (parameterMaxSize.get(index) < pIndex) {
									parameterMaxSize.set(index, pIndex);
								}
							}
						}
					}
				}
			}
		}
		
		for (int i = 0; i < messageNameList.size(); i++) {
			parameterList.add(new Object[parameterMaxSize.get(i) + 1]);
		}
		
		// set values into parameters array
		for (int i = 0; i < messageNameList.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).functionChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).functionChannels.size(); j++) {
						String functionName = subscribedChannels.get(i).functionChannels.get(j).functionName;
						int index = messageNameList.indexOf(functionName);
						Set<Integer> parameterIndexes = subscribedChannels.get(i).functionChannels.get(j).functionParameters.keySet();
						for (Integer pIndex : parameterIndexes) {
							//if (parameterMaxSize.get(index) < pIndex) {
							//	parameterMaxSize.set(index, pIndex);
							//}
							//System.out.println("i = " + i + " j = " + j + " pIndex = " + pIndex + " parameterList.size() = " + parameterList.size() 
							//	+ " subscribedChannels.size() = " + subscribedChannels.size() + " functionChannels.size() = " + subscribedChannels.get(i).functionChannels.size()
							//	+ " functionParameters.size() = " + subscribedChannels.get(i).functionChannels.get(j).functionParameters.size());
							// need to get the expected type from the message, and cast it here so it can be passed successfully to the function later.
							String pType = "default";
							String pName = subscribedChannels.get(i).functionChannels.get(j).functionParameters.get(pIndex);
							for (int k = 0; k < messageDefinitionList.size(); k++) {
								if (messageDefinitionList.get(k).messageName.compareTo(channel) == 0) {
									//pType
									pType = messageDefinitionList.get(k).elementTypes.get(messageDefinitionList.get(k).elementNames.indexOf(pName));
								}
							}
							parameterList.get(i)[pIndex] = convertFromString(lib.getJsonObject(pName, content), pType);
						}
					}
				}
			}
		}
		
		// add (or modify if already exists) to global list
		for (int i = 0; i < messageNameList.size(); i++) {
			boolean alreadyInBuffer = false;
			for (int j = 0; j < functionBuffer.size(); j++) {
				if (functionBuffer.get(j).messageName.compareTo(messageNameList.get(i)) == 0) {
					alreadyInBuffer = true;
					for (int k = 0; k < parameterList.get(i).length; k++) {
						if (parameterList.get(i)[k] != null) {
							functionBuffer.get(j).parameters[k] = parameterList.get(i)[k];
						}
					}
					break;
				}
			}
			if (alreadyInBuffer == false) {
				FunctionCall f = new FunctionCall();
				f.messageName = messageNameList.get(i);
				f.parameters = parameterList.get(i);
				functionBuffer.add(f);
			}
		}
		
		
		/*
		for (int i = 0; i < subscribedChannels.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).functionChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).functionChannels.size(); j++) {
						String functionName = subscribedChannels.get(i).functionChannels.get(j).functionName;
						ArrayList<Object> contentParameters = new ArrayList<Object>();
						int parameterIndex = 0;
						String parameterName = subscribedChannels.get(i).functionChannels.get(j).functionParameters.get("" + parameterIndex);
						while (parameterName.length() > 0) {
							String parameter = lib.getJsonObject(parameterName, content);
							MessageDefinition messageDef = null;
							for (MessageDefinition md: messageDefinitionList) {
								if (md.messageName.compareTo(channel) == 0) {
									messageDef = md;
									break;
								}
							}
							contentParameters.add(convertFromString(parameter, messageDef.elementTypes.get(messageDef.elementNames.indexOf(parameterName))));
							parameterIndex++;
							parameterName = subscribedChannels.get(i).functionChannels.get(j).functionParameters.get("" + parameterIndex);
						}
						Object[] params = contentParameters.toArray();
						InvokeFunction(functionName, params);
					}
				} else {
					Object[] params = {channel, content};
					InvokeFunction("setMessage", params);
				}
			}
		}
		*/
		
	}

	public void HandleSubscribeMessageComplexSend() {
		/* Future development:
		 * - if using "HandleSubscribeMessageComplex()" instead of "HandleSubscribeMessageSimple()",
		 * 		individual parameters can be defined to attribute to specific functions in a specific order.
		 * 		But what if a single function in the simulation is meant to accept input from 2 or more messages simultaneously?
		 * 		We would have to store function names and their parameters in a buffer in "HandleSubscribeMessageComplex()",
		 * 		and then use this function to call them after all expected messages are received.
		 * */
		System.out.println("HandleSubscribeMessageComplexSend() called.");
		if (functionBuffer.isEmpty() == false) {
			for (FunctionCall f: functionBuffer) {
				System.out.println("Calling function = " + f.messageName);
				InvokeFunction(f.messageName, f.parameters);
			}
			functionBuffer.clear();
		}
	}
	
	public void HandleInitializeSimple() {
		InvokeFunction("generateInitialMessage");
	}
	
	public void HandleInitializeComplex() {
		InvokeFunction(initializeFunction);
	}
	
	public void HandleSimulateSimple() {
		InvokeFunction("simulate");
	}
	
	public void HandleSimulateComplex() {
		InvokeFunction(simulateFunction);
	}
	
	public void HandlePublishMessageSimple(String channel) {
		Object[] params = {channel};
		String getMessage = (String)InvokeFunction("getMessage", params);
		System.out.println("Publish simple message = " + getMessage);
		lib.publish(channel, getMessage);
	}
	
	public void HandlePublishMessageComplex(String channel) {
		/* For the complex version, multiple functions might contribute to a message to be published.
		 * - map<String, Object> = <"name": "value">
		 * - value = function();
		 * 		- assume no parameters in sim functions that provide values
		 * 
		 * - in Difference.json,
		 * 		- under "publishedChannels", add "functionChannel" array with "functionName" and "key"
		 * - can "publish" after each "publishedChannel" is read, doesn't need to wait for others. 
		 * 		- just get every required value, put into message, publish.
		 * 		- with Subscribe, had to receive multiple messages from server that are split between functions in simulation. Publish has more instant access.
		 * */
		
		// check publishedChannels, 
		//		channel = publishedChannels.get(i).channelName
		// 		String message = "";
		boolean sentMessage = false;
		String message = "";
		for (int i = 0; i < publishedChannels.size(); i++) {
			if (publishedChannels.get(i).channelName.compareTo(channel) == 0) {
				for (int j = 0; j < publishedChannels.get(i).functionChannels.size(); j++) {
					message = lib.setJsonObject
							(message, 
							publishedChannels.get(i).functionChannels.get(j).functionKeyName, 
							(Integer)(InvokeFunction(publishedChannels.get(i).functionChannels.get(i).functionName)));
				}
				//WARNING: C++ wrapper seems to assume non-string values where appropriate in messages.
				// This is fine if simulations make message directly, but contradicts original "setJsonObject" function in RTILib, causing an assertion error.
				// C++ should be updated to support both.
				lib.publish(channel, message);
				sentMessage = true;
				break;
			}
		}
		
		if (sentMessage == false) {
			HandlePublishMessageSimple(channel);
		}
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

	public Object convertFromString(Object originalObject, Class newObjectType) {
		Object returnObject = null;
		
		String classType = newObjectType.getTypeName();
		try {
			if (newObjectType.isArray() == false) {
				if (classType.contains("int")|| classType.contains("java.lang.Integer")) {
					returnObject = Integer.parseInt("" + originalObject);
				} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
					returnObject = Long.parseLong("" + originalObject);
				} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
					returnObject = Float.parseFloat("" + originalObject);
				} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
					returnObject = Double.parseDouble("" + originalObject);
				} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
					returnObject = Boolean.parseBoolean("" + originalObject);
				} else if (classType.contains("String") || classType.contains("java.lang.String")) {
					returnObject = "" + originalObject;
				} else {
					returnObject = newObjectType.cast(originalObject);
				}
			} 
		} catch (Exception e) {
			System.out.println("Some serious error trying to convert the object.");
			e.printStackTrace();
		}
		
		return returnObject;
	}
	
	public Object convertFromString(Object originalObject, String newObjectType) {
		Object returnObject = null;
		
		String classType = newObjectType;
		try {
				if (classType.contains("int")|| classType.contains("java.lang.Integer")) {
					returnObject = Integer.parseInt("" + originalObject);
				} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
					returnObject = Long.parseLong("" + originalObject);
				} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
					returnObject = Float.parseFloat("" + originalObject);
				} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
					returnObject = Double.parseDouble("" + originalObject);
				} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
					returnObject = Boolean.parseBoolean("" + originalObject);
				} else if (classType.contains("String") || classType.contains("java.lang.String")) {
					returnObject = "" + originalObject;
				} else {
					returnObject = "" + originalObject;
				}
		} catch (Exception e) {
			System.out.println("Some serious error trying to convert the object.");
			e.printStackTrace();
		}
		
		return returnObject;
	}
	
	public Object[] convertFromString(Object[] originalObject, Class newObjectType) {
		Object [] returnObject = null;
		returnObject = new Object[originalObject.length];
		
		String classType = newObjectType.getTypeName();
		try {
			if (newObjectType.isArray() == true) {
				for (int i = 0; i < originalObject.length; i++) {
					if (classType.contains("int")|| classType.contains("java.lang.Integer")) {
						returnObject[i] = Integer.parseInt("" + originalObject[i]);
					} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
						returnObject[i] = Long.parseLong("" + originalObject[i]);
					} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
						returnObject[i] = Float.parseFloat("" + originalObject[i]);
					} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
						returnObject[i] = Double.parseDouble("" + originalObject[i]);
					} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
						returnObject[i] = Boolean.parseBoolean("" + originalObject[i]);
					} else if (classType.contains("String") || classType.contains("java.lang.String")) {
						returnObject[i] = "" + originalObject[i];
					} else {
						returnObject[i] = newObjectType.cast(originalObject[i]);
					}
				}
			} 
		} catch (Exception e) {
			System.out.println("Some serious error trying to convert the object.");
			e.printStackTrace();
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
				messageDefinition.messageName = messageName;
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
					
					if (subChannel.containsKey("functionChannel") == true) {
						JsonArray functionChannelArray = subChannel.getJsonArray("functionChannel");
						newChannel.functionChannels = new ArrayList<FunctionChannel>();
						for (int i = 0; i < functionChannelArray.size(); i++) {
							FunctionChannel functionChannel = new FunctionChannel();
							JsonObject functionChannelObject = functionChannelArray.getJsonObject(i);
							functionChannel.functionName = functionChannelObject.getString("functionName", "");
							Iterator<String> keys = (Iterator<String>) functionChannelObject.keySet().iterator();
							functionChannel.functionParameters = new HashMap<Integer, String>();
							while (keys.hasNext()) {
								String key = (String)keys.next();
								String value = functionChannelObject.getString(key);
								if (key.compareTo("functionName") != 0) {
									functionChannel.functionParameters.put(Integer.parseInt(key), value);
								}
							}
							newChannel.functionChannels.add(functionChannel);
						}
					}
					
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
					
					newChannel.functionChannels = new ArrayList<FunctionChannel>();
					if (pubChannel.containsKey("functionChannel") == true) {
						JsonArray functionChannelArray = pubChannel.getJsonArray("functionChannel");
						for (int i = 0; i < functionChannelArray.size(); i++) {
							FunctionChannel functionChannel = new FunctionChannel();
							JsonObject functionChannelObject = functionChannelArray.getJsonObject(i);
							functionChannel.functionName = functionChannelObject.getString("functionName", "");
							functionChannel.functionKeyName = functionChannelObject.getString("functionKeyName", "");
							newChannel.functionChannels.add(functionChannel);
						}
					}
					
					publishedChannels.add(newChannel);
					
					published_channels.add(pubChannelName);
				}
			}
			
			if (json.containsKey("initializeFunction")) {
				initializeFunction = json.getString("initializeFunction");
			} else {
				initializeFunction = "generateInitialMessage";
			}
			
			if (json.containsKey("simulateFunction")) {
				simulateFunction = json.getString("simulateFunction");
			} else {
				simulateFunction = "simulate";
			}
			
			//System.out.println("Read simulation settings, finished.");
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}
	
	


	

}
