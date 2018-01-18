package mainServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

public class RTISimConnectThread extends Thread{
	
	static int threadIndexTotal = 0;
	int threadIndex = 0;
	String tag = "RTISimConnectThread";
	String hostName = "localHost";
	int portNumber = 42;
	Socket rtiSocket;
	RTILib rtiLib;
	
	public RTISimConnectThread(RTILib rtiLib, Socket rtiSocket) {
		
		threadIndex = threadIndexTotal;
		threadIndexTotal++;
		
		this.rtiSocket = rtiSocket;
		this.rtiLib = rtiLib;
		
		Runtime.getRuntime().addShutdownHook(new Thread() {
			public void run() {
				try {
					printLine("you didn't call 'disconnect()' properly, but we sense that the JVM has closed, so we will force the connection closed.");
					isConnected = false;
					//rtiSocket.close();
				} catch (Exception e) {
					printLine("tried to force close the socket upon program ending, but something when wrong..." + e.toString());
				}
			}
		});
	}
	
	boolean isConnected = true;
	public void run() {
		try {
			//printLine("trying to connect now...");
			printLine("Connected to dedicated socket! Now running thread to receive new messages!");
			
			//PrintWriter out = new PrintWriter(rtiSocket.getOutputStream(), true);
			BufferedReader in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			//BufferedReader stdIn = new BufferedReader(new InputStreamReader(System.in));
			//out.println(tag);
			//out.flush();
			//printLine("I sent message with : " + tag);
			String userInput = "";
			while (isConnected == true && (userInput = in.readLine()) != null) {
				printLine("I READ FROM RTI : " + userInput);
				rtiLib.receivedMessage(userInput);
			}
		} catch (Exception e) {
			printLine("Exception (connection closed) >> " + e.toString());
		}
	}
	
	public void closeConnection() {
		try {
			printLine("closing connection to RTI.");
			isConnected = false;
			rtiSocket.close();
		} catch (IOException e) {
			printLine("Error occurred when trying to close conenction to the RTI:" + e.toString());
		}
	}
	
	private boolean debugOut = false;
	public void setDebugOutput(boolean setDebugOut) {
		debugOut = setDebugOut;
	}
	
	public void printLine(String line) {
		if (debugOut == false)
			return;
		
		System.out.println(String.format("%1$32s", "[" + tag + "]" + " --- ") + line);
	}
}
