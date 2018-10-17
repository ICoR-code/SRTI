package main;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.StringReader;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.JsonValue;

import mainServer.RTILib;


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
	private Field[] simVars;

	public class FunctionChannel{
		public String functionName = "";
		public Map<Integer, String> functionParameters;
		public String functionKeyName = "";
	}
	
	public class VarChannel{
		public String varName = "";
		public String valueName = "";
	}
	
	public class Channel{
		public String channelName = "";
		public int subscribe = 1;	// 1 = "subscribe", 2 = "publish", 3 = "other" (allow other definitions later in development)
		
		// subscribeChannelData
		public boolean oneTime = false;
		public int stepRelation = 0;
		
		// publishChannelData
		public boolean initial = false;
		public int historyDependent = 0;
		
		public ArrayList<FunctionChannel> functionChannels;
		
		public ArrayList<VarChannel> varChannels;
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
			simVars = simulationClass.getDeclaredFields();
			
			lib.setDebugOutput(true);
			lib.setSimName(simulation_name);
			lib.connect(host_name, port_number);
			
			int gstep = 0;
			int kTimeToWait = 50;
			
			for (Channel channel: subscribedChannels) {
				lib.subscribeToMessagePlusHistory(channel.channelName);
			}
			
			System.out.println("Testing one-time channels.");
			for (String channel: one_time_channels) {
				while(true) {
					String message = lib.getNextMessage(channel, kTimeToWait);
					if (!message.isEmpty() || message.length() > 2) {
						HandleSubscribeMessageVar(channel, message);
						break;
					}
				}
			}
			
			System.out.println("Testing initialized channels.");
			HandleInitializeComplex();

			for (Channel channel: publishedChannels) {
				// if message is an initial type, then publish
				if (channel.initial) {
					HandlePublishMessageVar(channel.channelName);
				}
			}
			
			System.out.println("Beginning loop.");
			while (true) {
				for (String channel: subscribed_channels) {
					while (true) {
						System.out.println("Checking for subscribed message : " + channel);
						String message = lib.getNextMessage(channel, kTimeToWait);
						if (!message.isEmpty() && message.length() > 2) {
							HandleSubscribeMessageVar(channel, message);
							break;
						}
					}
				}
				
				HandleSimulateComplex();
				
				for (String channel: published_channels) {
					System.out.println("Handle publishing message : " + channel);
					HandlePublishMessageVar(channel);
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

	public void HandleSubscribeMessageVar(String channel, String message) {
		String content = lib.getMessageContent(message);

		for (int i = 0; i < subscribedChannels.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).varChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).varChannels.size(); j++) {
						String valueName = subscribedChannels.get(i).varChannels.get(j).valueName;
						String varName = subscribedChannels.get(i).varChannels.get(j).varName;
						for (int k = 0; k < simVars.length; k++) {
							if (simVars[k].getName().compareTo(varName) == 0) {
								String obString = lib.getJsonObject(valueName, content);
								String obStringNoQ = GetStringNoQuotes(obString);
								JsonReader reader = Json.createReader(new StringReader(obStringNoQ));

								boolean isOfArray = false;
								try {
									JsonValue jValue = reader.read();
									isOfArray = jValue instanceof JsonArray;
								} catch (Exception e) {
									isOfArray = false;
								}
								
								if (valueName.compareTo("") == 0) {
									SetVar(simVars[k], content);
								} else if (isOfArray) {
									JsonReader reader2 = Json.createReader(new StringReader(obStringNoQ));
									JsonArray jsonA = reader2.readArray();
									Object obArray = SetVarArray(simVars[k], jsonA, 1);
									try {
										simVars[k].set(simulation, obArray);
									} catch (Exception e) {
										e.printStackTrace();
									}
								} else {
									SetVar(simVars[k], lib.getJsonObject(valueName, content));
								}
							}
						}
					}
				}
			}
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
	
	public void HandlePublishMessageVar(String channel) {
		String message = "";
		try {
			for (int i = 0; i < publishedChannels.size(); i++) {
				if (publishedChannels.get(i).channelName.compareTo(channel) == 0) {
					for (int j = 0; j < publishedChannels.get(i).varChannels.size(); j++) {
						for (int k = 0; k < simVars.length; k++) {
							if (publishedChannels.get(i).varChannels.get(j).varName.compareTo(simVars[k].getName()) == 0) {
								if (simVars[k].getType().isArray() == true) {
									message = lib.setJsonObject(message,
										publishedChannels.get(i).varChannels.get(j).valueName, 
										"" + MakeJsonArray(simVars[k].get(simulation)).toString());
								} else {
									message = lib.setJsonObject(message, 
										publishedChannels.get(i).varChannels.get(j).valueName, "" + simVars[k].get(simulation));
								}
								break;
							}
						}
					}
					//WARNING: C++ wrapper seems to assume non-string values where appropriate in messages.
					// This is fine if simulations make message directly, but contradicts original "setJsonObject" function in RTILib, causing an assertion error.
					// C++ should be updated to support both.
					lib.publish(channel, message);
					break;
				}
			}
		} catch (Exception e) {
			System.out.println("Had trouble publishing message : " + channel);
			e.printStackTrace();
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
				System.out.println("Something is wrong trying to call funciton " + functionName + "...");
				e.printStackTrace();
			}
		} else {
			System.out.println("Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
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
				System.out.println("Something is wrong trying to call function ' " + functionName + " ' ...");
				e.printStackTrace();
			}
		} else {
			System.out.println("Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
		}
		
		return returnObject;
	}

	public String GetStringNoQuotes(String originalString) {
		
		if (originalString.charAt(0) == '\"' && originalString.charAt(originalString.length() - 1) == '\"') {
			originalString = originalString.substring(1, originalString.length() - 1);
		}
		
		return originalString;
	}

	public void SetVar(Field setVar, Object originalObject) {
		String classType = setVar.getType().getTypeName();
		
		try {
			if (setVar.getType().isArray() == false) {
				if (classType.contains("int")|| classType.contains("java.lang.Integer")) {
					setVar.setInt(simulation, Integer.parseInt(GetStringNoQuotes("" + originalObject)));
				} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
					setVar.setLong(simulation, Long.parseLong(GetStringNoQuotes("" + originalObject)));
				} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
					setVar.setFloat(simulation, Float.parseFloat(GetStringNoQuotes("" + originalObject)));
				} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
					setVar.setDouble(simulation, Double.parseDouble(GetStringNoQuotes("" + originalObject)));
				} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
					setVar.setBoolean(simulation, Boolean.parseBoolean(GetStringNoQuotes("" + originalObject)));
				} else if (classType.contains("String") || classType.contains("java.lang.String")) {
					setVar.set(simulation, GetStringNoQuotes("" + originalObject));
				} else {
					setVar.set(simulation, setVar.getType().cast(originalObject));
				}
			} else {
				//SetVarArray(setVar, originalObject);//setVar.set(simulation, originalObject);
				//Object obArray = Array.newInstance(setVar.getType().getComponentType(), originalObject.)
			}
		} catch (Exception e) {
			System.out.println("Some serious error trying to convert the object.");
			e.printStackTrace();
		}
		
	}
	
	public Object SetVarArray(Field setVar, JsonArray jA, int depth) {
		
		Class cType = setVar.getType();
		for (int i = 0; i < depth; i++) {
			cType = cType.getComponentType();
		}
		
		Object returnObject = Array.newInstance(cType, jA.size());
		
		for (int i = 0; i < jA.size(); i++) {

			JsonValue jV = jA.get(i);
			if (jV instanceof JsonArray) {
				Array.set(returnObject, i, SetVarArray(setVar, jA.getJsonArray(i), depth + 1));
			} else {
				String classType = cType.getName();
				if (classType.contains("int")|| classType.contains("java.lang.Integer")) {
					Array.set(returnObject, i, Integer.parseInt(jA.getString(i)));
				} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
					Array.set(returnObject, i,  Long.parseLong(jA.getString(i)));
				} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
					Array.set(returnObject, i, Float.parseFloat(jA.getString(i)));
				} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
					Array.set(returnObject, i, Double.parseDouble(jA.getString(i)));
				} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
					Array.set(returnObject, i, Boolean.parseBoolean(jA.getString(i)));
				} else if (classType.contains("String") || classType.contains("java.lang.String")) {
					Array.set(returnObject, i, GetStringNoQuotes("" + jA.getString(i)));
				} else {
					Array.set(returnObject, i, jA.getString(i));
				}
			}
		}
		
		return returnObject;
		
	}
	
	public JsonArray MakeJsonArray(Object o) {
		JsonArray ja;
		
		// should first check "o.getClass.isArray()" before calling "makeJsonArray(o)
		
		JsonArrayBuilder jb = Json.createArrayBuilder();
		for (int i = 0; i < Array.getLength(o); i++) {
			if (o == null) {
				jb.add("");
			} else if (Array.get(o,i).getClass().isArray()) {
				jb.add((JsonValue) MakeJsonArray(Array.get(o, i)));
			} else {
				/* Why do I convert this value to a string?
				 *   "JsonArrayBuilder.add(ob)" requires that ob is a primitive type, or a JsonValue.
				 *   By default, Java seems to save Object as the java version.
				 *   	For example, after int i = 5; Object o = i;, the type of o is "java.lang.Integer".
				 *   JsonArrayBuilder does not natively accept this as input, but it does accept String.
				 *   
				 *   An alternative would be to add "if" statements in "makeJsonArray" 
				 *   and store temporary variable for all possible types (int, float, double, long, bool, etc.)
				 *   and directly add this variable to JavaArrayBuilder.
				 * 
				 * */
				jb.add("" + Array.get(o, i));
			}
		}
		ja = jb.build();
		
		System.out.println("Json Array made: " + ja.toString());
		
		return ja;
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
				bufferedReader.close();
				return -2;
			}
			
			if (json.containsKey("global")) {
				// extra formatting to remove quotes: "json.get(string)" returns different format from "json.getString(string)"
				msg_definition_file_name = json.getString("global", "").toString();
			}
			else {
				System.out.println("Missing 'global' in settings file.");
				bufferedReader.close();
				return -2;
			}
			bufferedReader.close();
			
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
			
			bufferedReader.close();
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
				bufferedReader.close();
				return -2;
			}
			
			if (json.containsKey("portNumber")) {
				port_number = json.getString("portNumber", "").toString();
			}else {
				System.out.println("Missing 'portNumber' in simulation configuration file.");
				bufferedReader.close();
				return -2;
			}
			
			if (json.containsKey("simulatorName")) {
				simulation_name = json.getString("simulatorName", "").toString();
			}else {
				System.out.println("Missing 'simulatorName' in simulation configuration file.");
				bufferedReader.close();
				return -2;
			}
			
			//System.out.println("Reading 'subscribedChannels' from file.");
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
					
					if (subChannel.containsKey("varChannel") == true) {
						JsonArray varChannelArray = subChannel.getJsonArray("varChannel");
						newChannel.varChannels = new ArrayList<VarChannel>();
						for (int i = 0; i < varChannelArray.size(); i++) {
							VarChannel varChannel = new VarChannel();
							JsonObject varChannelObject = varChannelArray.getJsonObject(i);
							varChannel.valueName = varChannelObject.getString("valueName");
							varChannel.varName = varChannelObject.getString("varName");
							newChannel.varChannels.add(varChannel);
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
			
			//System.out.println("Reading 'publishedChannels' from file.");
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
					
					if (pubChannel.containsKey("varChannel") == true) {
						JsonArray varChannelArray = pubChannel.getJsonArray("varChannel");
						newChannel.varChannels = new ArrayList<VarChannel>();
						for (int i = 0; i < varChannelArray.size(); i++) {
							VarChannel varChannel = new VarChannel();
							JsonObject varChannelObject = varChannelArray.getJsonObject(i);
							varChannel.valueName = varChannelObject.getString("valueName");
							varChannel.varName = varChannelObject.getString("varName");
							newChannel.varChannels.add(varChannel);
						}
					}
					
					publishedChannels.add(newChannel);
					//System.out.println("");
					
					published_channels.add(pubChannelName);
				}
			}
			
			//System.out.println("Finished reading settings from file."); 
			
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
			
			bufferedReader.close();
			System.out.println("Read simulation settings, finished.");
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}
	
	


	

}