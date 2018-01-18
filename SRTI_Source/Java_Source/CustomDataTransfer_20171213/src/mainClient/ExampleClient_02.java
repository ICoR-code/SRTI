package mainClient;

import java.util.concurrent.TimeUnit;

import mainServer.RTILib;
import mainServer.RTISim;

public class ExampleClient_02 implements RTISim{

	public static void main(String [] args) {
		ExampleClient_02 thisSim = new ExampleClient_02();
	}

	
	
	RTILib rtiLib;
	int numOfCustomers = 0;
	
	public ExampleClient_02() {
		printLine("This is an example Java client to show how to use RTILib");
		
		String hostName = "35.3.104.242";
		String portNum = "60535";
		rtiLib = new RTILib(this);
		rtiLib.connect(hostName, portNum);
		rtiLib.subscribeTo("StoreStatus");
		
		for (int i = 0; i < 20; i++) {
			try {
				TimeUnit.SECONDS.sleep(4);
				//numOfCustomers++;
				String sendMessage = rtiLib.setJsonObject("", "NumOfCustomers", "" + numOfCustomers);
				printLine("the message to send is: " + sendMessage);
				
				rtiLib.publish("StoreCustomers",sendMessage);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
		
		rtiLib.disconnect();
		
		printLine("This example client is finished.");
	}
	
	@Override
	public String getSimName() {
		return "ExampleClient_02";
	}

	@Override
	public void receivedMessage(String name, String content, String timestamp, String fromSim) {
		printLine("Received message = " + name);
		if (name.compareTo("StoreStatus") == 0) {
			printLine("value = " + rtiLib.getJsonObject("NumOfFood", content));
			int numOfFood = Integer.parseInt(rtiLib.getStringNoQuotes(rtiLib.getJsonObject("NumOfFood", content)));
			if (numOfFood % 4 == 0) {
				numOfCustomers++;
			}
		}
	}
	
	private static String tag = "ExampleClient_02";
	public static void printLine(String output) {
		System.out.println(tag + " --- " + output);
	}
}
