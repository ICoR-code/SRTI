package mainClient;

import java.util.concurrent.TimeUnit;

//import SRTI_20180109.jar;
import mainServer.RTILib;

public class ExampleClient_01 {

	
	
	public static void main(String [] args) {
		printLine("This is an example Java client to show how to use RTILib");
		
		String hostName = "35.3.101.84";
		String portNum = "4200";
		RTILib rtiLib = new RTILib();
		rtiLib.setSimName("betterdefaultname");
		rtiLib.connect(hostName, portNum);
		rtiLib.subscribeTo("StoreCustomers");
		//rtiLib.setDebugOutput(true);
		
		
		int numOfFood = 0;
		int numOfMessages = 0;
		
		for (int i = 0; i < 20000; i++) {
			try {
				TimeUnit.SECONDS.sleep(1);
				numOfFood++;
				String sendMessage = rtiLib.setJsonObject("", "NumOfFood", "" + numOfFood);
				printLine("the message to send is: " + sendMessage);
				
				String receivedMessage = rtiLib.getNextMessage();
				while (receivedMessage != null) {
					numOfMessages++;
					printLine(numOfMessages + "... the message received is: " + receivedMessage);
					String messageName = rtiLib.getStringNoQuotes(rtiLib.getMessageName(receivedMessage));
					String messageContent = rtiLib.getMessageContent(receivedMessage);//rtiLib.getStringNoQuotes(rtiLib.getMessageContent(receivedMessage));
					
					String messageContent2 = rtiLib.getJsonString("content", receivedMessage);
					if (messageName.compareTo("StoreCustomers") == 0) {
						String messageValue2 = rtiLib.getJsonString("NumOfCustomers", messageContent2);
						int numOfCustomers = Integer.parseInt(rtiLib.getStringNoQuotes
								(rtiLib.getJsonObject("NumOfCustomers", messageContent)));
						numOfFood = numOfFood - numOfCustomers;
					}
					
					receivedMessage = rtiLib.getNextMessage();
				}
				
				rtiLib.publish("StoreStatus",sendMessage);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		
		rtiLib.disconnect();
		
		printLine("This example client is finished.");
	}
	
	
	
	private static String tag = "ExampleClient_01";
	public static void printLine(String output) {
		System.out.println(tag + " --- " + output);
	}
}
