package mainClient;

import java.util.concurrent.TimeUnit;

//import SRTI_20180109.jar;
import mainServer.RTILib;

public class ExampleClient_01 {

	
	
	public static void main(String [] args) {
		printLine("This is an example Java client to show how to use RTILib");
		
		String hostName = "35.3.104.242";
		String portNum = "60535";
		RTILib rtiLib = new RTILib();
		rtiLib.setSimName("betterdefaultname");
		rtiLib.connect(hostName, portNum);
		rtiLib.subscribeTo("StoreCustomers");
		
		int numOfFood = 0;
		
		for (int i = 0; i < 20; i++) {
			try {
				TimeUnit.SECONDS.sleep(4);
				numOfFood++;
				String sendMessage = rtiLib.setJsonObject("", "NumOfFood", "" + numOfFood);
				printLine("the message to send is: " + sendMessage);
				
				String receivedMessage = rtiLib.getNextMessage();
				while (receivedMessage != null) {
					printLine("the message received is: " + receivedMessage);
					String messageName = rtiLib.getStringNoQuotes(rtiLib.getMessageName(receivedMessage));
					printLine("messageName is " + messageName);
					printLine("content is " + rtiLib.getMessageContent(receivedMessage));
					String messageContent = rtiLib.getMessageContent(receivedMessage);//rtiLib.getStringNoQuotes(rtiLib.getMessageContent(receivedMessage));
					printLine("mod content is " + messageContent);
					
					String messageContent2 = rtiLib.getJsonString("content", receivedMessage);
					printLine("message content COULD have been: " + messageContent2);
					if (messageName.compareTo("StoreCustomers") == 0) {
						printLine("message is of 'StoreCustomers'");
						String messageValue2 = rtiLib.getJsonString("NumOfCustomers", messageContent2);
						printLine("message value COULD have been: " + messageValue2);
						int numOfCustomers = Integer.parseInt(rtiLib.getStringNoQuotes
								(rtiLib.getJsonValue("NumOfCustomers", messageContent)));
						printLine("message has numOfCustomers = " + numOfCustomers);
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
