package main;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringReader;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
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
	private String simulator_name = "";
	private String simulator_ref = "";
	
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
		//public int stepRelation = 0;
		public int relativeOrder = 0;
		public int maxTimestep = 0;
		public boolean mandatory = true;
		
		// publishChannelData
		public boolean initial = false;
		public int historyDependent = 0;
		
		public int timestepDelta = 1;
		public int stage = 1;
		
		public ArrayList<FunctionChannel> functionChannels;
		
		public ArrayList<VarChannel> varChannels;
	}
	private ArrayList<Channel> subscribedChannels = new ArrayList<Channel>();
	private ArrayList<Channel> publishedChannels = new ArrayList<Channel>();
	
	private ArrayList<String> subscribed_channels = new ArrayList<String>();
	private ArrayList<String> one_time_channels = new ArrayList<String>();
	private ArrayList<String> published_channels = new ArrayList<String>();
	
	public class SimulateChannel{
		public String functionName;
		public int timestepDelta;
		public int stage;
	}
	private ArrayList<SimulateChannel> simulateChannels = new ArrayList<SimulateChannel>();
	private ArrayList<SimulateChannel> initializeChannels = new ArrayList<SimulateChannel>();
	
	private String initialize_function = "";
	//private String simulate_function = "";
	//private int simulate_time_delta = 1;
	
	public class StageChannel{
		public int stage;
		public int timestepDelta;
		public String timestepVarDelta;
		public float timestepMul;
		public int order;
		/*public boolean debugConsole;
		public boolean debugFile;
		public boolean dataOutFile;*/
	}
	private ArrayList<StageChannel> stageChannels = new ArrayList<StageChannel>();
	
	enum DataType{
		NONE,
		STRING,
		BOOL,
		NUMBER
	}
	public class EndCondition{
		public String varName;
		public String condition;
		public String varName2;
		
		public DataType valueType;
		public String valueString;
		public boolean valueBool;
		public double valueNum;
	}
	//private ArrayList<EndCondition> endConditions = new ArrayList<EndCondition>();
	private ArrayList<ArrayList<EndCondition>> endConditions = new ArrayList<ArrayList<EndCondition>>();
	
	public class StageCondition{
		public int oldStage;
		
		public String varName;
		public String condition;
		public String varName2;
		
		public DataType valueType;
		public String valueString;
		public boolean valueBool;
		public double valueNum;
		
		public int newStage;
	}
	private ArrayList<ArrayList<StageCondition>> stageConditions = new ArrayList<ArrayList<StageCondition>>();
	
	public class MessageDefinition{
		public String messageName = "";
		public ArrayList<String> elementNames;
		public ArrayList<String> elementTypes;
	}
	private ArrayList<MessageDefinition> messageDefinitionList = new ArrayList<MessageDefinition>();
	
	private RTILib lib;
	
	private int timestep = 0;
	private int stage = 0;
	private int localTimestep = 0;
	
	private int timestep_delta = 1;
	private String timestep_var_delta = "";
	private float timestep_mul = 1;
	
	private int next_timestep = 0;
	private int next_order = 0;
	private String finishContent = "";
	
	private boolean debugConsole = false;
	private boolean debugFile = false;
	private boolean dataOutFile = false;
	
	public void StartSRTI() {
		
		System.out.println("Starting SRTI Wrapper (v2_12_02) for Java. Starting SRTI clients with third-party simulations.");
		
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
		
		System.out.println("Successfully read input configuration files.");
		
		lib = new RTILib();
		
		try {
			simulationClass = Class.forName(simulator_ref);
			simulation = simulationClass.newInstance();
			simMethods = simulationClass.getMethods();
			simVars = simulationClass.getDeclaredFields();
			
			lib.setDebugOutput(debugConsole);
			lib.setDebugFileOutput(debugFile);
			lib.setSimName(simulator_name);
			lib.connect(host_name, port_number);
			
			System.out.println("Successfully started RTI Lib access and connection to RTI Server. Proceeding to run simulator...");
			
			int gstep = 0;
			int kTimeToWait = 50;
			
			for (Channel channel: subscribedChannels) {
				lib.subscribeToMessagePlusHistory(channel.channelName);
			}
			
			lib.printLine("[WRAPPER] Waiting for RTI_StartStep message (for timestep = 0)...");
			//System.out.println("[Wrapper] Waiting for RTI_StartStep message (for timestep = 0)...");
			//while(true) {
				//String message = lib.getNextMessage("RTI_StartStep", kTimeToWait);
			String message = lib.waitForNextMessage("RTI_StartStep");
			if (!message.isEmpty() && message.length() > 2) {
				timestep = Integer.parseInt(lib.getJsonString("timestep", lib.getMessageContent(message)));
				localTimestep = timestep;
					//break;
			}
			//}
			
			lib.printLine("[WRAPPER] Testing one-time channels.");
			//System.out.println("Testing one-time channels.");
			/*for (String channel: one_time_channels) {
				while(true) {
					message = lib.getNextMessage(channel, kTimeToWait);
					if (!message.isEmpty() || message.length() > 2) {
						if (channel.compareTo("RTI_") == 0) {
							HandleSubscribeMessageVarLocal(channel);
						} else {
							HandleSubscribeMessageVar(channel, message);
						}
						break;
					}
				}
			}*/
			for (Channel channel: subscribedChannels) {
				if (channel.oneTime == true) {
					if ((channel.stage == stage)) {
						while(true) {
							lib.printLine("[WRAPPER] Checking for subscribed message : " + channel.channelName);
							//System.out.println("Checking for subscribed message : " + channel.channelName);
							message = "";
							
							if (channel.channelName.compareTo("RTI_StartStep") == 0) {
								message = "";	//startStepMessage;
							} else if (channel.channelName.compareTo("RTI_") == 0) {
								HandleSubscribeMessageVarLocal(channel.channelName);
								break;
							} else {
								//message = lib.getNextMessage(channel.channelName, kTimeToWait);		//need to factor 'relativeOrder'
								message = lib.getNextMessage(channel.channelName, kTimeToWait, channel.relativeOrder, timestep + channel.maxTimestep);
							}
							
							if (!message.isEmpty() && message.length() > 2) {
								HandleSubscribeMessageVar(channel.channelName, message);
								break;
							}
							if (channel.mandatory == false) {
								break;
							}
						}
					}
				}
			}
			
			lib.printLine("[WRAPPER] Testing initialized channels.");
			//System.out.println("Testing initialized channels.");
			for (int i = 0; i < initializeChannels.size(); i++) {
				if (initializeChannels.get(i).stage == stage) {
					HandleInitializeComplex(initializeChannels.get(i).functionName);
				}
			}

			for (Channel channel: publishedChannels) {
				// if message is an initial type, then publish
				if (channel.initial && channel.stage == stage) {
					HandlePublishMessageVar(channel.channelName);
				}
			}
			
			// Somehow, we should try to allow for more "variable" timesteps here, rather than just ( + 1). 
			// This doesn't necessarily handle different events depending on the timestep (publishing different messages, running different simulate functions, etc.) 
			lib.setNewVTimestamp(timestep);
			for (int i = 0; i < stageChannels.size(); i++) {
				if (stageChannels.get(i).stage == stage) {
					timestep_mul = stageChannels.get(i).timestepMul;
					timestep_delta = stageChannels.get(i).timestepDelta;
					timestep_var_delta = stageChannels.get(i).timestepVarDelta;
					next_order = stageChannels.get(i).order;
					break;
				}
			}
			next_timestep = timestep;
			localTimestep = timestep;
			if (timestep_var_delta != "" && timestep_var_delta.length() > 0) {
				// get value from sim
				for (int i = 0; i < simVars.length; i++) {
					if (simVars[i].getName().compareTo(timestep_var_delta) == 0) {
						next_timestep = timestep + (int)(simVars[i].getInt(simulation) * timestep_mul);
						localTimestep = localTimestep + (int)(simVars[i].getInt(simulation) * timestep_mul);
						break;
					}
				}
				lib.printLine("(when calculating next timestep, using timestepDeltaVar, with variable = " + timestep_var_delta + " of name length " + timestep_var_delta.length());
			} else {
				next_timestep = timestep + (int)(timestep_delta * timestep_mul);
				localTimestep = localTimestep + (int)(timestep_delta * timestep_mul); 
			}
			lib.printLine("Updating next timestep to be: "+ next_timestep + ", based on the arguement " + timestep + " + (" + timestep_delta + " * " + timestep_mul + ")");
			finishContent = lib.setJsonObject("", "nextStep", next_timestep);
			finishContent = lib.setJsonObject(finishContent, "nextOrder", next_order);
			lib.publish("RTI_FinishStep", finishContent);
			
			// Print data out to file, for easier tracing afterward (ideally, simulators would do better job of this internally)
			if (dataOutFile == true) {
				PrintDataToFile(GenerateDataHeaderForFile());
				PrintDataToFile(GenerateDataForFile());
			}
			
			lib.printLine("[WRAPPER] Beginning loop.");
			//System.out.println("Beginning loop.");
			while (true) {
				lib.printLine("[WRAPPER] Waiting for RTI_StartStep message...");
				//System.out.println("Waiting for RTI_StartStep message...");
				int newStage = 0;
				String startStepMessage = "";
				//while(true) {
					//startStepMessage = lib.getNextMessage("RTI_StartStep", kTimeToWait);
				startStepMessage = lib.waitForNextMessage("RTI_StartStep");
					//lib.getNextNewestMessage
				if (!startStepMessage.isEmpty() && startStepMessage.length() > 2) {
					timestep = Integer.parseInt(lib.getJsonString("timestep", lib.getMessageContent(startStepMessage)));
					newStage = Integer.parseInt(lib.getJsonString("stage", lib.getMessageContent(startStepMessage)));
						//break;
				}
				//}
				
				if (newStage < 0) {
					// another sim must have told "end", so end the simulation system-wide.
					
					lib.printLine("[WRAPPER] Server says it's time to end now...");
					
					// if other sims are 'waiting' for previous ordered sims to finish, should send "RTI_FinishStep", even if ending immediately after.
					next_timestep = timestep;
					if (timestep_var_delta != "" && timestep_var_delta.length() > 0) {
						for (int i = 0; i < simVars.length; i++) {
							if (simVars[i].getName().compareTo(timestep_var_delta) == 0) {
								next_timestep = timestep + (int)(simVars[i].getInt(simulation) * timestep_mul);
								localTimestep = localTimestep + (int)(simVars[i].getInt(simulation) * timestep_mul); 
								break;
							}
						}
						lib.printLine("(when calculating next timestep, using timestepDeltaVar, with variable = " + timestep_var_delta+ " of name length " + timestep_var_delta.length());
					} else {
						next_timestep = timestep + (int)(timestep_delta * timestep_mul);
						localTimestep = localTimestep + (int)(timestep_delta * timestep_mul);
					}
					if (timestep_delta == -1 && timestep_var_delta == "") {
						next_timestep = -1;
					}
					lib.printLine("Updating next timestep to be: "+ next_timestep + ", based on the arguement " + timestep + " + (" + timestep_delta + " * " + timestep_mul + ")");
					finishContent = lib.setJsonObject("", "nextStep", next_timestep);
					finishContent = lib.setJsonObject(finishContent, "nextOrder", next_order);
					lib.publish("RTI_FinishStep", finishContent);
					
					// Print data out to file, for easier tracing afterward (ideally, simulators would do better job of this internally)
					if (dataOutFile == true) {
						PrintDataToFile(GenerateDataForFile());
					}
					
					break;
				}
				
				// what if data has to be "initialized" again upon new stage change?
				if (stage != newStage && newStage >= 0) {
					localTimestep = 0;
					
					lib.printLine("[WRAPPER] Stage has changed. Execute 'subscribe' messages (oneTime), 'initialize' functions for this stage and 'publish' messages that require 'initial' message.");
					//System.out.println("Stage has changed. Execute 'initialize' functions for this stage and 'publish' messages that require 'initial' message.");
					/*for (String channel: one_time_channels) {
						while(true) {
							String message = lib.getNextMessage(channel, kTimeToWait);
							if (!message.isEmpty() || message.length() > 2) {
								HandleSubscribeMessageVar(channel, message);
								break;
							}
						}
					}*/
					for (Channel channel: subscribedChannels) {
						if (channel.oneTime == true) {
							if ((channel.stage == stage)) {
								while(true) {
									lib.printLine("[WRAPPER] Checking for subscribed message : " + channel.channelName);
									//System.out.println("Checking for subscribed message : " + channel.channelName);
									message = "";
									
									if (channel.channelName.compareTo("RTI_StartStep") == 0) {
										message = startStepMessage;
									} else if (channel.channelName.compareTo("RTI_") == 0) {
										HandleSubscribeMessageVarLocal(channel.channelName);
										break;
									} else {
										//message = lib.getNextMessage(channel.channelName, kTimeToWait);		//need to factor 'relativeOrder'
										message = lib.getNextMessage(channel.channelName, kTimeToWait, channel.relativeOrder, timestep + channel.maxTimestep);
									}
									
									if (!message.isEmpty() && message.length() > 2) {
										HandleSubscribeMessageVar(channel.channelName, message);
										break;
									}
									if (channel.mandatory == false) {
										break;
									}
								}
							}
						}
					}
					
					for (int i = 0; i < initializeChannels.size(); i++) {
						if (initializeChannels.get(i).stage == newStage) {
							HandleInitializeComplex(initializeChannels.get(i).functionName);
						}
					}

					for (Channel channel: publishedChannels) {
						// if message is an initial type, then publish
						if (channel.initial && channel.stage == newStage) {
							HandlePublishMessageVar(channel.channelName);
						}
					}
					
					lib.setNewVTimestamp(timestep);
					timestep_mul = -1;
					timestep_delta = -1;
					timestep_var_delta = "";
					next_order = -1;
					for (int i = 0; i < stageChannels.size(); i++) {
						if (stageChannels.get(i).stage == stage) {
							timestep_mul = stageChannels.get(i).timestepMul;
							timestep_delta = stageChannels.get(i).timestepDelta;
							timestep_var_delta = stageChannels.get(i).timestepVarDelta;
							next_order = stageChannels.get(i).order;
							break;
						}
					}
					
					next_timestep = timestep;
					if (timestep_var_delta != "" && timestep_var_delta.length() > 0) {
						// get value from sim
						for (int i = 0; i < simVars.length; i++) {
							if (simVars[i].getName().compareTo(timestep_var_delta) == 0) {
								next_timestep = timestep + (int)(simVars[i].getInt(simulation) * timestep_mul);
								localTimestep = localTimestep + (int)(simVars[i].getInt(simulation) * timestep_mul); 
								break;
							}
						}
						lib.printLine("(when calculating next timestep, using timestepDeltaVar, with variable = " + timestep_var_delta+ " of name length " + timestep_var_delta.length());
					} else {
						next_timestep = timestep + (int)(timestep_delta * timestep_mul);
						localTimestep = localTimestep + (int)(timestep_delta * timestep_mul);
					}
					if (timestep_delta == -1 && timestep_var_delta == "") {
						next_timestep = -1;
					}
					lib.printLine("Updating next timestep to be: "+ next_timestep + ", based on the arguement " + timestep + " + (" + timestep_delta + " * " + timestep_mul + ")");
					finishContent = lib.setJsonObject("", "nextStep", next_timestep);
					finishContent = lib.setJsonObject(finishContent, "nextOrder", next_order);
					lib.publish("RTI_FinishStep", finishContent);
					
					stage = newStage;
					continue;
				}
				stage = newStage;
				
				lib.setNewVTimestamp(timestep);
				timestep_mul = -1;
				timestep_delta = -1;
				timestep_var_delta = "";
				next_order = -1;
				for (int i = 0; i < stageChannels.size(); i++) {
					if (stageChannels.get(i).stage == stage) {
						timestep_mul = stageChannels.get(i).timestepMul;
						timestep_delta = stageChannels.get(i).timestepDelta;
						timestep_var_delta = stageChannels.get(i).timestepVarDelta;
						next_order = stageChannels.get(i).order;
						break;
					}
				}
				
				/*for (String channel: subscribed_channels) {
					while (true) {
						System.out.println("Checking for subscribed message : " + channel);
						String message = "";
						message = lib.getNextMessage(channel, kTimeToWait);
						
						if (!message.isEmpty() && message.length() > 2) {
							HandleSubscribeMessageVar(channel, message);
							break;
						}
					}
				}*/
				for (Channel channel: subscribedChannels) {
					if (channel.oneTime == false) {
						if ((channel.stage == stage) && (channel.timestepDelta > 0) && (localTimestep % (channel.timestepDelta*timestep_mul) == 0)) {
							while(true) {
								lib.printLine("[WRAPPER] Checking for subscribed message : " + channel.channelName);
								//System.out.println("Checking for subscribed message : " + channel.channelName);
								message = "";
								
								if (channel.channelName.compareTo("RTI_StartStep") == 0) {
									message = startStepMessage;
								} else if (channel.channelName.compareTo("RTI_") == 0) {
									HandleSubscribeMessageVarLocal(channel.channelName);
									break;
								} else {
									//message = lib.getNextMessage(channel.channelName, kTimeToWait);		//need to factor 'relativeOrder'
									message = lib.getNextMessage(channel.channelName, kTimeToWait, channel.relativeOrder, timestep + channel.maxTimestep);
								}
								
								if (!message.isEmpty() && message.length() > 2) {
									HandleSubscribeMessageVar(channel.channelName, message);
									break;
								}
								if (channel.mandatory == false) {
									break;
								}
							}
						}
					}
				}
				
				int simulate_time_delta = 1;
				for (int i = 0; i < simulateChannels.size(); i++) {
					if (simulateChannels.get(i).stage == stage) {
						if ((simulateChannels.get(i).timestepDelta > 0) 
								&& (localTimestep % (simulateChannels.get(i).timestepDelta*timestep_mul) == 0)) {
							HandleSimulateComplex(simulateChannels.get(i).functionName);
						}
					}
				}
				
				
				//for (String channel: published_channels) {
				for (Channel channel: publishedChannels) {
					if ((channel.stage == stage) && (channel.timestepDelta > 0) && (localTimestep % (channel.timestepDelta*timestep_mul) == 0)) {
						lib.printLine("[WRAPPER] Handle publishing message : " + channel.channelName);
						//System.out.println("Handle publishing message : " + channel.channelName);
						HandlePublishMessageVar(channel.channelName);
					}
				}
				
				// check for "end conditions" or "stage change conditions"
				// UPDATE (2019-04-10): check EndConditionMet() only once, because variables being checked might be changed before second check.
				boolean endConditionMet = EndConditionMet();
				if (endConditionMet == true) {
					// send message to server, then end loop here.
					lib.publish("RTI_EndSystem", "");
					//break;
				} 
				int differentStage = StageConditionMet();
				if (differentStage != stage) {
					// send message to server, update "timestep_delta" / "timestep_mul" and other...
					finishContent = lib.setJsonObject("", "nextStage", differentStage);
					lib.publish("RTI_UpdateStage", finishContent);
					
					stage = differentStage;
					/*timestep_mul = -1;
					timestep_delta = -1;
					next_order = -1;
					for (int i = 0; i < stageChannels.size(); i++) {
						if (stageChannels.get(i).stage == stage) {
							timestep_mul = stageChannels.get(i).timestepMul;
							timestep_delta = stageChannels.get(i).timestepDelta;
							next_order = stageChannels.get(i).order;
							break;
						}
					}*/
				}
				
				// Somehow, we should try to allow for more "variable" timesteps here, rather than just ( + 1). 
				// This doesn't necessarily handle different events depending on the timestep (publishing different messages, running different simulate functions, etc.) 
				next_timestep = timestep;
				if (timestep_var_delta != "" && timestep_var_delta.length() > 0) {
					// get value from sim
					for (int i = 0; i < simVars.length; i++) {
						if (simVars[i].getName().compareTo(timestep_var_delta) == 0) {
							next_timestep = timestep + (int)(simVars[i].getInt(simulation) * timestep_mul);
							localTimestep = localTimestep + (int)(simVars[i].getInt(simulation) * timestep_mul); 
							break;
						}
					}
					lib.printLine("(when calculating next timestep, using timestepDeltaVar, with variable = " + timestep_var_delta+ " of name length " + timestep_var_delta.length());
				} else {
					next_timestep = timestep + (int)(timestep_delta * timestep_mul);
					localTimestep = localTimestep + (int)(timestep_delta * timestep_mul);
				}
				if (timestep_delta == -1 && timestep_var_delta == "") {
					next_timestep = -1;
				}
				
				lib.printLine("Updating next timestep to be: "+ next_timestep + ", based on the arguement " + timestep + " + (" + timestep_delta + " * " + timestep_mul + ")");
				finishContent = lib.setJsonObject("", "nextStep", next_timestep);
				finishContent = lib.setJsonObject(finishContent, "nextOrder", next_order);
				lib.publish("RTI_FinishStep", finishContent);
				
				// Print data out to file, for easier tracing afterward (ideally, simulators would do better job of this internally)
				if (dataOutFile == true) {
					PrintDataToFile(GenerateDataForFile());
				}
				
				++gstep;
				
				if (endConditionMet == true) {
					break;
				}
			}
		}catch (Exception e) {
			lib.printLine("[WRAPPER] Something is wrong during test, closing now...");
			//System.out.println("Something is wrong during test, closing now...");
			e.printStackTrace();
		} finally {
			// when finished, disconnect RTILib
			lib.disconnect();
		}
		
		lib.printLine("[WRAPPER] Ending SRTI clients with third-party simulations.");
		
		System.out.println("This Wrapper and simulator has disconnected from RTI Server, and has now ended.");
		
	}

	public void HandleSubscribeMessageVarLocal(String channel) {
		lib.printLine("[WRAPPER] Dealing with subscribed message: " + "(local variables inside Wrapper)");
		//System.out.println("Dealing with subscribed message: " + message);

		for (int i = 0; i < subscribedChannels.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).varChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).varChannels.size(); j++) {
						String valueName = subscribedChannels.get(i).varChannels.get(j).valueName;
						String varName = subscribedChannels.get(i).varChannels.get(j).varName;
						for (int k = 0; k < simVars.length; k++) {
							if (simVars[k].getName().compareTo(varName) == 0) {
								
								
								if (valueName.compareTo("vTimestep") == 0) {
									SetVar(simVars[k], timestep);
								} else if (valueName.compareTo("stage") == 0) {
									SetVar(simVars[k], stage);
								} else if (valueName.compareTo("stageVTimestepMul") == 0) {
									SetVar(simVars[k], localTimestep);
								} else if (valueName.compareTo("stageVTimestep") == 0) {
									SetVar(simVars[k], (int)(localTimestep / timestep_mul));
								}
							}
						}
					}
				}
			}
		}	
	}
	
	public void HandleSubscribeMessageVar(String channel, String message) {
		String content = lib.getMessageContent(message);
		String vTimestamp = lib.getMessageVTimestamp(message);
		lib.printLine("[WRAPPER] Dealing with subscribed message: " + message);
		//System.out.println("Dealing with subscribed message: " + message);

		for (int i = 0; i < subscribedChannels.size(); i++) {
			if (subscribedChannels.get(i).channelName.compareTo(channel) == 0) {
				if (subscribedChannels.get(i).varChannels.size() > 0) {
					for (int j = 0; j < subscribedChannels.get(i).varChannels.size(); j++) {
						String valueName = subscribedChannels.get(i).varChannels.get(j).valueName;
						String varName = subscribedChannels.get(i).varChannels.get(j).varName;
						for (int k = 0; k < simVars.length; k++) {
							if (simVars[k].getName().compareTo(varName) == 0) {
								
								
								if (valueName.compareTo("RTI_content") == 0) {
									SetVar(simVars[k], content);
								} else if (valueName.compareTo("RTI_vTimestamp") == 0) {
									SetVar(simVars[k], vTimestamp);
								} else {
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
									if (isOfArray) {
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
	}
						
	public void HandleInitializeSimple() {
		InvokeFunction("generateInitialMessage");
	}
	
	public void HandleInitializeComplex(String initialize_function) {
		InvokeFunction(initialize_function);
	}
	
	public void HandleSimulateSimple() {
		InvokeFunction("simulate");
	}
	
	public void HandleSimulateComplex(String simulate_function) {
		InvokeFunction(simulate_function);
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
			lib.printLine("[WRAPPER] Had trouble publishing message : " + channel);
			//System.out.println("Had trouble publishing message : " + channel);
			e.printStackTrace();
		}

	}
	
	public boolean EndConditionMet() {
		boolean returnValue = false;
		boolean returnAND = true;
		
		for (int i = 0; i < endConditions.size(); i++) {
			returnAND = true;
			for (int k = 0; k < endConditions.get(i).size(); k++) {
				for (int j = 0; j < simVars.length; j++) {
					if (endConditions.get(i).get(k).varName.compareTo("RTI_vTimestamp") == 0) {
						try {
							double compareValue = 0;
							if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
								if (simVars[j].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
									compareValue = simVars[j].getDouble(simulation);
								} else {
									continue;
								}
							} else {
								compareValue = endConditions.get(i).get(k).valueNum;
							}
							if (endConditions.get(i).get(k).condition.compareTo("=") == 0) {
								if (!(timestep == compareValue)) {
								//if (timestep == endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<") == 0) {
								if (!(timestep < compareValue)) {
								//if (timestep < endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">") == 0) {
								if (!(timestep > compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">=") == 0) {
								if (!(timestep >= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<=") == 0) {
								if (!(timestep <= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("!=") == 0){
								if (!(timestep != compareValue)) {
									//if (timestep > endConditions.get(i).get(k).valueNum) {
										//returnValue = true;
										returnAND = false;
								}
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						break;
					} else if (endConditions.get(i).get(k).varName.compareTo("RTI_stage") == 0) {
						try {
							double compareValue = 0;
							if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
								if (simVars[j].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
									compareValue = simVars[j].getDouble(simulation);
								} else {
									continue;
								}
							} else {
								compareValue = endConditions.get(i).get(k).valueNum;
							}
							if (endConditions.get(i).get(k).condition.compareTo("=") == 0) {
								if (!(stage == compareValue)) {
								//if (timestep == endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<") == 0) {
								if (!(stage < compareValue)) {
								//if (timestep < endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">") == 0) {
								if (!(stage > compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">=") == 0) {
								if (!(stage >= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<=") == 0) {
								if (!(stage <= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("!=") == 0){
								if (!(stage != compareValue)) {
									//if (timestep > endConditions.get(i).get(k).valueNum) {
										//returnValue = true;
										returnAND = false;
								}
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						break;
					} else if (endConditions.get(i).get(k).varName.compareTo("RTI_stageVTimestepMul") == 0) {
						try {
							double compareValue = 0;
							if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
								if (simVars[j].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
									compareValue = simVars[j].getDouble(simulation);
								} else {
									continue;
								}
							} else {
								compareValue = endConditions.get(i).get(k).valueNum;
							}
							if (endConditions.get(i).get(k).condition.compareTo("=") == 0) {
								if (!(localTimestep == compareValue)) {
								//if (timestep == endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<") == 0) {
								if (!(localTimestep < compareValue)) {
								//if (timestep < endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">") == 0) {
								if (!(localTimestep > compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">=") == 0) {
								if (!(localTimestep >= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<=") == 0) {
								if (!(localTimestep <= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("!=") == 0){
								if (!(localTimestep != compareValue)) {
									//if (timestep > endConditions.get(i).get(k).valueNum) {
										//returnValue = true;
										returnAND = false;
								}
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						break;
					} else if (endConditions.get(i).get(k).varName.compareTo("RTI_stageVTimestep") == 0) {
						try {
							double stageVTimestep = (int)(localTimestep / timestep_mul);
							double compareValue = 0;
							if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
								if (simVars[j].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
									compareValue = simVars[j].getDouble(simulation);
								} else {
									continue;
								}
							} else {
								compareValue = endConditions.get(i).get(k).valueNum;
							}
							if (endConditions.get(i).get(k).condition.compareTo("=") == 0) {
								if (!( stageVTimestep == compareValue)) {
								//if (timestep == endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<") == 0) {
								if (!( stageVTimestep < compareValue)) {
								//if (timestep < endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">") == 0) {
								if (!( stageVTimestep > compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo(">=") == 0) {
								if (!( stageVTimestep >= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("<=") == 0) {
								if (!( stageVTimestep <= compareValue)) {
								//if (timestep > endConditions.get(i).get(k).valueNum) {
									//returnValue = true;
									returnAND = false;
								}
							} else if (endConditions.get(i).get(k).condition.compareTo("!=") == 0){
								if (!( stageVTimestep != compareValue)) {
									//if (timestep > endConditions.get(i).get(k).valueNum) {
										//returnValue = true;
										returnAND = false;
								}
							}
						} catch (Exception e) {
							e.printStackTrace();
						}
						break;
					}
					else if (endConditions.get(i).get(k).varName.compareTo(simVars[j].getName()) == 0) {
						if (endConditions.get(i).get(k).valueType == DataType.NUMBER) {
							try {
								double compareValue = 0;
								if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
									String tempVarName2 = endConditions.get(i).get(k).varName2;
									lib.printLine("When testing endConditions, name of varName2 is : " + tempVarName2);
									for (int m = 0; m < simVars.length; m++) {
										if (simVars[m].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
											compareValue = simVars[m].getDouble(simulation);
										} else {
											continue;
										}
									}
								} else {
									compareValue = endConditions.get(i).get(k).valueNum;
								}
								if (endConditions.get(i).get(k).condition.compareTo("=") == 0) {
									if (!(simVars[j].getDouble(simulation) == compareValue)) {
									//if (simVars[j].getDouble(simulation) == endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								} 
								else if (endConditions.get(i).get(k).condition.compareTo("<") == 0) {
									if (!(simVars[j].getDouble(simulation) < compareValue)) {
									//if (simVars[j].getDouble(simulation) < endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								} 
								else if (endConditions.get(i).get(k).condition.compareTo(">") == 0) {
									if (!(simVars[j].getDouble(simulation) > compareValue)) {
									//if (simVars[j].getDouble(simulation) > endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								}
								else if (endConditions.get(i).get(k).condition.compareTo(">=") == 0) {
									if (!(simVars[j].getDouble(simulation) >= compareValue)) {
									//if (simVars[j].getDouble(simulation) > endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								}
								else if (endConditions.get(i).get(k).condition.compareTo("<=") == 0) {
									if (!(simVars[j].getDouble(simulation) <= compareValue)) {
									//if (simVars[j].getDouble(simulation) > endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								} 
								else if (endConditions.get(i).get(k).condition.compareTo("!=") == 0) {
									if (!(simVars[j].getDouble(simulation) != compareValue)) {
									//if (simVars[j].getDouble(simulation) > endConditions.get(i).get(k).valueNum) {
									//	returnValue = true;
										returnAND = false;
									}
								} 
							} catch (Exception e) {
								e.printStackTrace();
							}
						} else if (endConditions.get(i).get(k).valueType == DataType.BOOL) {
							try {
								boolean compareValue = false;
								if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
									for (int m = 0; m < simVars.length; m++) {
										if (simVars[m].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
											compareValue = simVars[m].getBoolean(simulation);
										} else {
											continue;
										}
									}
								} else {
									compareValue = endConditions.get(i).get(k).valueBool;
								}
								if (endConditions.get(i).get(k).condition == "=") {
									if (!(simVars[j].getBoolean(simulation) == compareValue)) {
									//if (simVars[j].getBoolean(simulation) == endConditions.get(i).get(k).valueBool) {
										//returnValue = true;
										returnAND = false;
									}
								} else if (endConditions.get(i).get(k).condition == "!=") {
									if (!(simVars[j].getBoolean(simulation) != compareValue)) {
									//if (simVars[j].getBoolean(simulation) == endConditions.get(i).get(k).valueBool) {
										//returnValue = true;
										returnAND = false;
									}
								} 
							} catch (Exception e) {
								e.printStackTrace();
							}
						} else if (endConditions.get(i).get(k).valueType == DataType.STRING) {
							try {
								String compareValue = "";
								if (endConditions.get(i).get(k).varName2 != "" && endConditions.get(i).get(k).varName2.length() > 0) {
									for (int m = 0; m < simVars.length; m++) {
										if (simVars[m].getName().compareTo(endConditions.get(i).get(k).varName2) == 0) {
											compareValue = (String)simVars[m].get(simulation);
										} else {
											continue;
										}
									}
								} else {
									compareValue = endConditions.get(i).get(k).valueString;
								}
								if (endConditions.get(i).get(k).condition == "=") {
									if (!(simVars[j].get(simulation) == compareValue)) {
									//if (simVars[j].get(simulation) == endConditions.get(i).get(k).valueString) {
									//	returnValue = true;
										returnAND = false;
									}
								} else if (endConditions.get(i).get(k).condition == "!=") {
									if (!(simVars[j].get(simulation) != compareValue)) {
									//if (simVars[j].get(simulation) == endConditions.get(i).get(k).valueString) {
									//	returnValue = true;
										returnAND = false;
									}
								} 
							} catch (Exception e) {
								e.printStackTrace();
							}
						}
						break;
					}
				}
			}
			if (returnAND == true) {
				returnValue = true;
			}
		}
		
		return returnValue;
	}
	
	public int StageConditionMet() {
		int returnValue = stage;
		boolean returnAND = true;
		
		lib.printLine("[WRAPPER] CHECKING STAGE CONDITIONS... number of conditions = " + stageConditions.size());
		
		for (int i = 0; i < stageConditions.size(); i++) {
			//stageConditions.get(0).
			
			returnAND = true;
			for (int k = 0; k < stageConditions.get(i).size(); k++) {
				lib.printLine("[WRAPPER] CHECKING STAGE CONDITIONS... varName = " + stageConditions.get(i).get(k).varName);
				
				
				if (stageConditions.get(i).get(k).oldStage == stage) {
					for (int j = 0; j < simVars.length; j++) {
						if (stageConditions.get(i).get(k).varName.compareTo("RTI_vTimestamp") == 0) {
							try {
								double compareValue = 0;
								if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
									if (simVars[j].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
										compareValue = simVars[j].getDouble(simulation);
									} else {
										continue;
									}
								} else {
									compareValue = stageConditions.get(i).get(k).valueNum;
								}
								if (stageConditions.get(i).get(k).condition.compareTo("=") == 0) {
									if (timestep == compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo("<") == 0) {
									if (timestep < compareValue) {
										returnValue =stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo(">") == 0) {
									if (timestep > compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
								else if (stageConditions.get(i).get(k).condition.compareTo(">=") == 0) {
									if (timestep >= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}else if (stageConditions.get(i).get(k).condition.compareTo("<=") == 0) {
									if (timestep <= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} else if (stageConditions.get(i).get(k).condition.compareTo("!=") == 0) {
									if (timestep != compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
							} catch (Exception e) {
								e.printStackTrace();
							}
							break;
						} else if (stageConditions.get(i).get(k).varName.compareTo("RTI_stage") == 0) {
							try {
								double compareValue = 0;
								if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
									if (simVars[j].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
										compareValue = simVars[j].getDouble(simulation);
									} else {
										continue;
									}
								} else {
									compareValue = stageConditions.get(i).get(k).valueNum;
								}
								if (stageConditions.get(i).get(k).condition.compareTo("=") == 0) {
									if (stage == compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo("<") == 0) {
									if (stage < compareValue) {
										returnValue =stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo(">") == 0) {
									if (stage > compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
								else if (stageConditions.get(i).get(k).condition.compareTo(">=") == 0) {
									if (stage >= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}else if (stageConditions.get(i).get(k).condition.compareTo("<=") == 0) {
									if (stage <= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} else if (stageConditions.get(i).get(k).condition.compareTo("!=") == 0) {
									if (stage != compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
							} catch (Exception e) {
								e.printStackTrace();
							}
							break;
						} else if (stageConditions.get(i).get(k).varName.compareTo("RTI_stageVTimestepMul") == 0) {
							try {
								double compareValue = 0;
								if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
									if (simVars[j].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
										compareValue = simVars[j].getDouble(simulation);
									} else {
										continue;
									}
								} else {
									compareValue = stageConditions.get(i).get(k).valueNum;
								}
								if (stageConditions.get(i).get(k).condition.compareTo("=") == 0) {
									if (localTimestep == compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo("<") == 0) {
									if (localTimestep < compareValue) {
										returnValue =stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo(">") == 0) {
									if (localTimestep > compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
								else if (stageConditions.get(i).get(k).condition.compareTo(">=") == 0) {
									if (localTimestep >= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}else if (stageConditions.get(i).get(k).condition.compareTo("<=") == 0) {
									if (localTimestep <= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} else if (stageConditions.get(i).get(k).condition.compareTo("!=") == 0) {
									if (localTimestep != compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
							} catch (Exception e) {
								e.printStackTrace();
							}
							break;
						} else if (stageConditions.get(i).get(k).varName.compareTo("RTI_stageVTimestep") == 0) {
							try {
								double stageVTimestep = (int)(localTimestep / timestep_mul);
								double compareValue = 0;
								if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
									if (simVars[j].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
										compareValue = simVars[j].getDouble(simulation);
									} else {
										continue;
									}
								} else {
									compareValue = stageConditions.get(i).get(k).valueNum;
								}
								if (stageConditions.get(i).get(k).condition.compareTo("=") == 0) {
									if (stageVTimestep == compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo("<") == 0) {
									if (stageVTimestep < compareValue) {
										returnValue =stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} 
								else if (stageConditions.get(i).get(k).condition.compareTo(">") == 0) {
									if (stageVTimestep > compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
								else if (stageConditions.get(i).get(k).condition.compareTo(">=") == 0) {
									if (stageVTimestep >= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}else if (stageConditions.get(i).get(k).condition.compareTo("<=") == 0) {
									if (stageVTimestep <= compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								} else if (stageConditions.get(i).get(k).condition.compareTo("!=") == 0) {
									if (stageVTimestep != compareValue) {
										returnValue = stageConditions.get(i).get(k).newStage;
									} else {
										returnAND = false;
									}
								}
							} catch (Exception e) {
								e.printStackTrace();
							}
							break;
						} else if (stageConditions.get(i).get(k).varName.compareTo(simVars[j].getName()) == 0) {
							
							if (stageConditions.get(i).get(k).valueType == DataType.NUMBER) {
								try {
									lib.printLine("[WRAPPER] CHECKING STAGE CONDITIONS... current value = " 
											+ simVars[j].getDouble(simulation));
									double compareValue = 0;
									if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
										for (int m = 0; m < simVars.length; m++) {
											if (simVars[m].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
												compareValue = simVars[m].getDouble(simulation);
											} else {
												continue;
											}
										}
									} else {
										compareValue = stageConditions.get(i).get(k).valueNum;
									}
									if (stageConditions.get(i).get(k).condition.compareTo("=") == 0) {
										if (simVars[j].getDouble(simulation) == compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} 
									else if (stageConditions.get(i).get(k).condition.compareTo("<") == 0) {
										if (simVars[j].getDouble(simulation) < compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									}
									else if (stageConditions.get(i).get(k).condition.compareTo(">") == 0) {
										if (simVars[j].getDouble(simulation) > compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} else if (stageConditions.get(i).get(k).condition.compareTo(">=") == 0) {
										if (simVars[j].getDouble(simulation) >= compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									}
									else if (stageConditions.get(i).get(k).condition.compareTo("<=") == 0) {
										if (simVars[j].getDouble(simulation) <= compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} else if (stageConditions.get(i).get(k).condition.compareTo("!=") == 0) {
										if (simVars[j].getDouble(simulation) != compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									}
								} catch (Exception e) {
									e.printStackTrace();
								}
							} else if (stageConditions.get(i).get(k).valueType == DataType.BOOL) {
								try {
									lib.printLine("[WRAPPER] CHECKING STAGE CONDITIONS... current value = " 
											+ simVars[j].getBoolean(simulation));
									boolean compareValue = false;
									if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
										for (int m = 0; m < simVars.length; m++) {
											if (simVars[m].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
												compareValue = simVars[m].getBoolean(simulation);
											} else {
												continue;
											}
										}
									} else {
										compareValue = stageConditions.get(i).get(k).valueBool;
									}
									if (stageConditions.get(i).get(k).condition.contains("=")) {
										if (simVars[j].getBoolean(simulation) == compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} else if (stageConditions.get(i).get(k).condition.contains("!=")) {
										if (simVars[j].getBoolean(simulation) != compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} 
								} catch (Exception e) {
									e.printStackTrace();
								}
							} else if (stageConditions.get(i).get(k).valueType == DataType.STRING) {
								try {
									lib.printLine("[WRAPPER] CHECKING STAGE CONDITIONS... current value = " 
											+ simVars[j].get(simulation));
									String compareValue = "";
									if (stageConditions.get(i).get(k).varName2 != "" && stageConditions.get(i).get(k).varName2.length() > 0) {
										for (int m = 0; m < simVars.length; m++) {
											if (simVars[m].getName().compareTo(stageConditions.get(i).get(k).varName2) == 0) {
												compareValue = (String) simVars[m].get(simulation);
											} else {
												continue;
											}
										}
									} else {
										compareValue = stageConditions.get(i).get(k).valueString;
									}
									if (stageConditions.get(i).get(k).condition.contains("=")) {
										if (simVars[j].get(simulation) == compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} else if (stageConditions.get(i).get(k).condition.contains("!=")) {
										if (simVars[j].get(simulation) != compareValue) {
											returnValue = stageConditions.get(i).get(k).newStage;
										} else {
											returnAND = false;
										}
									} 
								} catch (Exception e) {
									e.printStackTrace();
								}
							}
							
							break;
						}
					}
				}
			}
			if (returnAND == false) {
				returnValue = stage;
			}
		}
		
		return returnValue;
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
				lib.printLine("[WRAPPER] Something is wrong trying to call funciton " + functionName + "...");
				//System.out.println("Something is wrong trying to call funciton " + functionName + "...");
				e.printStackTrace();
			}
		} else {
			lib.printLine("[WRAPPER] Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
			//System.out.println("Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
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
				lib.printLine("[WRAPPER] Something is wrong trying to call function ' " + functionName + " ' ...");
				//System.out.println("Something is wrong trying to call function ' " + functionName + " ' ...");
				e.printStackTrace();
			}
		} else {
			lib.printLine("[WRAPPER] Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
			//System.out.println("Can't find function ' " + functionName + " ' from simulaiton, not calling it...");
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
			lib.printLine("[WRAPPER] Some serious error trying to convert the object.");
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
					//Array.set(returnObject, i, Integer.parseInt(jA.getString(i)));
					Array.set(returnObject, i, jA.getJsonNumber(i).intValue());
				} else if (classType.contains("long") || classType.contains("java.lang.Long")) {
					//Array.set(returnObject, i,  Long.parseLong(jA.getString(i)));
					Array.set(returnObject, i, jA.getJsonNumber(i).longValue());
				} else if (classType.contains("float") || classType.contains("java.lang.Float")) {
					//Array.set(returnObject, i, Float.parseFloat(jA.getString(i)));
					Array.set(returnObject, i, jA.getJsonNumber(i).doubleValue());
				} else if (classType.contains("double") || classType.contains("java.lang.Double")) {
					//Array.set(returnObject, i, Double.parseDouble(jA.getString(i)));
					Array.set(returnObject, i, jA.getJsonNumber(i).doubleValue());
				} else if (classType.contains("boolean") || classType.contains("java.lang.Boolean")) {
					//Array.set(returnObject, i, Boolean.parseBoolean(jA.getString(i)));
					Array.set(returnObject, i, jA.getBoolean(i));
				} else if (classType.contains("String") || classType.contains("java.lang.String")) {
					//Array.set(returnObject, i, GetStringNoQuotes("" + jA.getString(i)));
					Array.set(returnObject, i, jA.getString(i));
				} else {
					//Array.set(returnObject, i, jA.getString(i));
					Array.set(returnObject, i, jA.get(i));
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
				//jb.add("" + Array.get(o, i));
				if (Array.get(o,i).getClass() == Integer.class) {
					jb.add((int)Array.get(o, i));
				} else if (Array.get(o,i).getClass() == Long.class) {
					jb.add((long)Array.get(o, i));
				} else if (Array.get(o,i).getClass() == Float.class) {
					jb.add((double)Array.get(o, i));
				} else if (Array.get(o,i).getClass() == Double.class) {
					jb.add((double)Array.get(o, i));
				} else if (Array.get(o,i).getClass() == Boolean.class) {
					jb.add((boolean)Array.get(o, i));
				} else if (Array.get(o,i).getClass() == String.class) {
					jb.add((String)Array.get(o, i));
				} else {
					jb.add((JsonValue)Array.get(o, i));
				}
				//jb.add((double)Array.get(o, i));
			}
		}
		ja = jb.build();
		
		lib.printLine("[WRAPPER] Json Array made: " + ja.toString());
		
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
			
			if (json.containsKey("simulatorRef")) {
				simulator_ref = json.getString("simulatorRef", "").toString();
			} else {
				System.out.println("Missing 'simulatorRef' in simulation configuration file, don't know location of class.");
				bufferedReader.close();
				return -2;
			}
			if (json.containsKey("simulatorName")) {
				simulator_name = json.getString("simulatorName", "").toString();
			}else {
				simulator_name = simulator_ref;
			}
			
			if (json.containsKey("debugConsole")) {
				debugConsole = json.getBoolean("debugConsole", false);
			}
			if (json.containsKey("debugFile")) {
				debugFile = json.getBoolean("debugFile", false);
			} 
			if (json.containsKey("dataOutFile")) {
				dataOutFile = json.getBoolean("dataOutFile", false);
			}
			
			
			//System.out.println("Reading 'subscribedChannels' from file.");
			if (json.containsKey("subscribedChannels")) {
				JsonArray subChannelList = json.getJsonArray("subscribedChannels");
				
				for (int i = 0; i < subChannelList.size(); i++) {
					JsonObject subChannel = subChannelList.getJsonObject(i);
					String subChannelName = subChannel.getString("messageName", "");
					boolean oneTime = subChannel.getBoolean("oneTime", false);
					int timestepDelta = subChannel.getInt("timestepDelta", 1);
					int relativeOrder = subChannel.getInt("relativeOrder", 0);
					int maxTimestep = subChannel.getInt("maxTimestep", -1);
					boolean mandatory = subChannel.getBoolean("mandatory", true);
					int stage = subChannel.getInt("stage", 0);
					
					Channel newChannel = new Channel();
					newChannel.channelName = subChannelName;
					newChannel.subscribe = 1;
					newChannel.oneTime = oneTime;
					newChannel.timestepDelta = timestepDelta;
					newChannel.relativeOrder = relativeOrder;
					newChannel.maxTimestep = maxTimestep;
					newChannel.mandatory = mandatory;
					newChannel.stage = stage;
					
					if (subChannel.containsKey("functionChannel") == true) {
						JsonArray functionChannelArray = subChannel.getJsonArray("functionChannel");
						newChannel.functionChannels = new ArrayList<FunctionChannel>();
						for (int j = 0; j < functionChannelArray.size(); j++) {
							FunctionChannel functionChannel = new FunctionChannel();
							JsonObject functionChannelObject = functionChannelArray.getJsonObject(j);
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
						for (int j = 0; j < varChannelArray.size(); j++) {
							VarChannel varChannel = new VarChannel();
							JsonObject varChannelObject = varChannelArray.getJsonObject(j);
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
				JsonArray pubChannelList = json.getJsonArray("publishedChannels");
				
				for (int i = 0; i < pubChannelList.size(); i++) {
					JsonObject pubChannel = pubChannelList.getJsonObject(i);
					
					String pubChannelName = pubChannel.getString("messageName", "");
					boolean initial = pubChannel.getBoolean("initial");
					//int historyDependent = pubChannel.getInt("historyDependent");
					int timestepDelta = pubChannel.getInt("timestepDelta", 1); 
					int stage = pubChannel.getInt("stage", 0);
					
					Channel newChannel = new Channel();
					newChannel.channelName = pubChannelName;
					newChannel.subscribe = 2;
					newChannel.initial = initial;
					//newChannel.historyDependent = historyDependent;
					newChannel.timestepDelta = timestepDelta;
					newChannel.stage = stage;
					
					newChannel.functionChannels = new ArrayList<FunctionChannel>();
					if (pubChannel.containsKey("functionChannel") == true) {
						JsonArray functionChannelArray = pubChannel.getJsonArray("functionChannel");
						for (int j = 0; j < functionChannelArray.size(); j++) {
							FunctionChannel functionChannel = new FunctionChannel();
							JsonObject functionChannelObject = functionChannelArray.getJsonObject(j);
							functionChannel.functionName = functionChannelObject.getString("functionName", "");
							functionChannel.functionKeyName = functionChannelObject.getString("functionKeyName", "");
							newChannel.functionChannels.add(functionChannel);
						}
					}
					
					if (pubChannel.containsKey("varChannel") == true) {
						JsonArray varChannelArray = pubChannel.getJsonArray("varChannel");
						newChannel.varChannels = new ArrayList<VarChannel>();
						for (int j = 0; j < varChannelArray.size(); j++) {
							VarChannel varChannel = new VarChannel();
							JsonObject varChannelObject = varChannelArray.getJsonObject(j);
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
			
			/*if (json.containsKey("initializeFunction")) {
				initialize_function = json.getString("initializeFunction");
			} else {
				initialize_function = "generateInitialMessage";
			}*/
			if (json.containsKey("initializeChannels")) {
				JsonArray initChannelList = json.getJsonArray("initializeChannels");
				
				for (int i = 0; i < initChannelList.size(); i++) {
					JsonObject simChannel = initChannelList.getJsonObject(i);
					
					String functionName = simChannel.getString("functionName", "");
					//int timestepDelta = simChannel.getInt("timestepDelta", 1);
					int stage = simChannel.getInt("stage", 0); 
					
					SimulateChannel newChannel = new SimulateChannel();
					newChannel.functionName = functionName;
					//newChannel.timestepDelta = timestepDelta;
					newChannel.stage = stage;
					
					initializeChannels.add(newChannel);
				}
			}
			
			
			/*if (json.containsKey("simulateFunction")) {
				simulate_function = json.getString("simulateFunction");
			} else {
				simulate_function = "simulate";
			}*/
			if (json.containsKey("simulateChannels")) {
				JsonArray simChannelList = json.getJsonArray("simulateChannels");
				
				for (int i = 0; i < simChannelList.size(); i++) {
					JsonObject simChannel = simChannelList.getJsonObject(i);
					
					String functionName = simChannel.getString("functionName", "");
					int timestepDelta = simChannel.getInt("timestepDelta", 1);
					int stage = simChannel.getInt("stage", 0); 
					
					SimulateChannel newChannel = new SimulateChannel();
					newChannel.functionName = functionName;
					newChannel.timestepDelta = timestepDelta;
					newChannel.stage = stage;
					
					simulateChannels.add(newChannel);
				}
			}
			
			/*if (json.containsKey("simulateTimeDelta")) {
				simulate_time_delta = json.getInt("simulateTimeDelta");
			} else {
				simulate_time_delta = 1;
			}*/
			
			/*if (json.containsKey("timestepDelta")) {
				if (json.getString("timestepDelta", "") != "") {
					timestep_delta = json.getInt("timestepDelta");
					timestep_var_delta = "";
				} else {
					timestep_delta = 1;
					timestep_var_delta = json.getString("timestepDelta");
				}
			} else {
				timestep_delta = 1;
				timestep_var_delta = "";
			}
			
			if (json.containsKey("timestepMul")) {
				timestep_mul = json.getInt("timestepMul");
			} else {
				timestep_mul = 1;
			}
			
			if (json.containsKey("order")) {
				next_order = json.getInt("order");
			}*/
			
			if (json.containsKey("stageChannels")) {
				JsonArray stageChannelList = json.getJsonArray("stageChannels");
				
				for (int i = 0; i < stageChannelList.size(); i++) {
					JsonObject stageChannel = stageChannelList.getJsonObject(i);
					
					int stage = stageChannel.getInt("stage", 0);
					int order = stageChannel.getInt("order", 0);
					double timestepMul = stageChannel.getJsonNumber("timestepMul").doubleValue();
					int timestepDelta = 1;
					String timestepVarDelta = "";
					if (stageChannel.containsKey("timestepDelta")) {
						timestepDelta = stageChannel.getInt("timestepDelta");
					}
					if (stageChannel.containsKey("timestepVarDelta")) {
						timestepVarDelta = stageChannel.getString("timestepVarDelta");
					}
					/*if (stageChannel.containsKey("timestepDelta")) {
						//if (stageChannel.getInt("timestepDelta",-999) != -999) {
						if (stageChannel.getString("timestepDelta", "") == "") {
							timestepDelta = stageChannel.getInt("timestepDelta");
							timestepVarDelta = "";
						} else {
							timestepDelta = 1;
							timestepVarDelta = stageChannel.getString("timestepDelta");
						}
					} else {
						timestepDelta = 1;
						timestepVarDelta = "";
					}*/
					/*boolean debugConsole = stageChannel.getBoolean("debugConsole", true);
					boolean debugFile = stageChannel.getBoolean("debugFile", true);
					boolean dataOutFile = stageChannel.getBoolean("dataOutFile", true);*/
					
					StageChannel newChannel = new StageChannel();
					newChannel.stage = stage;
					newChannel.order = order;
					newChannel.timestepMul = (float)timestepMul;
					newChannel.timestepDelta = timestepDelta;
					newChannel.timestepVarDelta = timestepVarDelta;
					/*newChannel.debugConsole = debugConsole;
					newChannel.debugFile = debugFile;
					newChannel.dataOutFile = dataOutFile;
					
					if (stage == 0) {
						this.debugConsole = debugConsole;
						this.debugFile = debugFile;
						this.dataOutFile = dataOutFile;
					}*/
				
					stageChannels.add(newChannel);
				}
			}
			
			if (json.containsKey("endConditions")) {
				JsonArray endConditionsList = json.getJsonArray("endConditions");
				
				for (int i = 0; i < endConditionsList.size(); i++) {
					JsonArray endConditionsList2 = endConditionsList.getJsonArray(i);
					ArrayList<EndCondition> endConditionSublist = new ArrayList<EndCondition>();
					
					for (int j = 0; j < endConditionsList2.size(); j++) {
						JsonObject endCondition = endConditionsList2.getJsonObject(j);
						
						String varName = endCondition.getString("varName");
						String varName2 = endCondition.getString("varName2", "");
						String condition = endCondition.getString("condition");
						String valueString = "";
						double valueNum = -1;
						boolean valueBool = false;
						DataType valueType = DataType.NONE;
						if (endCondition.get("value").getValueType() == JsonValue.ValueType.NUMBER) {
							valueNum = endCondition.getJsonNumber("value").doubleValue();
							valueType = DataType.NUMBER;
						} else if (endCondition.get("value").getValueType() == JsonValue.ValueType.TRUE || endCondition.get("value").getValueType() == JsonValue.ValueType.FALSE) {
							valueBool = endCondition.getBoolean("value");
							valueType = DataType.BOOL;
						} else {
							valueString = endCondition.getString("value");
							valueType = DataType.STRING;
						}
						
						EndCondition newCondition = new EndCondition();
						newCondition.varName = varName;
						newCondition.varName2 = varName2;
						newCondition.condition = condition;
						newCondition.valueString = valueString;
						newCondition.valueNum = valueNum;
						newCondition.valueBool = valueBool;
						newCondition.valueType = valueType;
						
						endConditionSublist.add(newCondition);
					}
					
					endConditions.add(endConditionSublist);
				}
			}
			
			if (json.containsKey("stageConditions")) {
				JsonArray stageConditionsList = json.getJsonArray("stageConditions");
				
				for (int i = 0; i < stageConditionsList.size(); i++) {
					JsonArray stageConditionsList2 = stageConditionsList.getJsonArray(i);
					ArrayList<StageCondition> stageConditionSublist = new ArrayList<StageCondition>();
					
					for (int j = 0; j < stageConditionsList2.size(); j++) {
						JsonObject stageCondition = stageConditionsList2.getJsonObject(j);
						
						int oldStage = stageCondition.getInt("oldStage");
						int newStage = stageCondition.getInt("newStage");
						
						String varName = stageCondition.getString("varName");
						String varName2 = stageCondition.getString("varName2", "");
						String condition = stageCondition.getString("condition");
						String valueString = "";
						double valueNum = -1;
						boolean valueBool = false;
						DataType valueType = DataType.NONE;
						if (stageCondition.get("value").getValueType() == JsonValue.ValueType.NUMBER) {
							valueNum = stageCondition.getJsonNumber("value").doubleValue();
							valueType = DataType.NUMBER;
						} else if (stageCondition.get("value").getValueType() == JsonValue.ValueType.TRUE || stageCondition.get("value").getValueType() == JsonValue.ValueType.FALSE) {
							valueBool = stageCondition.getBoolean("value");
							valueType = DataType.BOOL;
						} else {
							valueString = stageCondition.getString("value");
							valueType = DataType.STRING;
						}
						
						StageCondition newCondition = new StageCondition();
						newCondition.oldStage = oldStage;
						newCondition.newStage = newStage;
						newCondition.varName = varName;
						newCondition.varName2 = varName2;
						newCondition.condition = condition;
						newCondition.valueString = valueString;
						newCondition.valueNum = valueNum;
						newCondition.valueBool = valueBool;
						newCondition.valueType = valueType;
					
						stageConditionSublist.add(newCondition);
					}
					stageConditions.add(stageConditionSublist);
					
				}
			}
			
			bufferedReader.close();
			System.out.println("Read simulation settings, finished.");
			
		} catch (Exception e) {
			e.printStackTrace();
			return -1;
		}
		
		return 0;
	}
	
	public String GenerateDataHeaderForFile() {
		String returnString = "";
		returnString += "RTI_Timestep" + "\t";
		for (int k = 0; k < simVars.length; k++) {
			try {
				if (simVars[k].getType().isArray() == true) {
					returnString += GenerateDataArrayHeaderForFile(simVars[k].get(simulation), simVars[k].getName());
				} else {
					returnString += simVars[k].getName() + "\t";
				}
			} catch (IllegalArgumentException e) {
				e.printStackTrace();
			} catch (IllegalAccessException e) {
				e.printStackTrace();
			}
		}
		//returnString += "\n";
		return returnString;
	}
	
	public String GenerateDataArrayHeaderForFile(Object o, String name) {
		String returnString = "";
		for (int i = 0; i < Array.getLength(o); i++) {
			if (o == null) {
				returnString = "";
			} else if (Array.get(o,i).getClass().isArray()) {
				returnString = returnString + GenerateDataArrayHeaderForFile(Array.get(o, i), name);
			} else {
				returnString = returnString + name + "[" + i + "]" + "\t";
			}
		}
		return returnString;
	}
	
	public String GenerateDataForFile() {
		String returnString = "";
		returnString += timestep + "\t";
		for (int k = 0; k < simVars.length; k++) {
			try {
				if (simVars[k].getType().isArray() == true) {
					returnString += GenerateDataArrayForFile(simVars[k].get(simulation));
				} else {
					returnString += simVars[k].get(simulation) + "\t";
				}
			} catch (IllegalArgumentException e) {
				e.printStackTrace();
			} catch (IllegalAccessException e) {
				e.printStackTrace();
			}
		}
		//returnString += "\n";
		return returnString;
	}
	
	public String GenerateDataArrayForFile(Object o) {
		String returnString = "";
		for (int i = 0; i < Array.getLength(o); i++) {
			if (o == null) {
				returnString = "";
			} else if (Array.get(o,i).getClass().isArray()) {
				returnString = returnString + GenerateDataArrayForFile(Array.get(o, i));
			} else {
				returnString = returnString + Array.get(o,i) + "\t";
			}
		}
		return returnString;
	}
	
	String textFileName = null;
	public void PrintDataToFile(String line) {
		try {
			if (textFileName != null && Files.exists(Paths.get(textFileName)) == false) {
				return;
			}

			if (textFileName == null || Files.size(Paths.get(textFileName)) > 100000000) {
				String actualDate = (new SimpleDateFormat("yyyyMMddHHmmssSSSS")).format(new Date(System.currentTimeMillis()));
				textFileName = "SRTI_Wrapper_data_" + simulator_name + "_" + actualDate + ".txt"; 
			}
		} catch (IOException e1) {
			e1.printStackTrace();
		}
		
		FileWriter exportFile;
		try {
			exportFile = new FileWriter(textFileName, true);
			exportFile.write(line + "\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	
}