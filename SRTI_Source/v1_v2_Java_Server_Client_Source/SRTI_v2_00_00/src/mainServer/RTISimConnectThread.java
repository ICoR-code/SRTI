package mainServer;

/*
 * RTISimConnectThread.java
 * 
 * - equivalent to "RTIConnectThread.java", but for RTILib and simulation side to handle dedicated thread for listening to new messages.
 * */

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
				} catch (Exception e) {
					printLine("tried to force close the socket upon program ending, but something when wrong..." + e.toString());
				}
			}
		});
	}
	
	boolean isConnected = true;
	public void run() {
		printLine("Connected to dedicated socket! Now running thread to receive new messages!");
		BufferedReader in;
		try {
			in = new BufferedReader(new InputStreamReader(rtiSocket.getInputStream()));
			continuousInput(in);
		} catch (IOException e) {
			printLine(System.currentTimeMillis() + " Exception (some error trying to open the bufferedreader from the RTI...) >> " + e.toString());
		}
		
	}
	
	private long crashTimeInMillis = 0;
	private int numOfRTICrash = 0;
	private void continuousInput(BufferedReader in) {
		try {
			printLine("Connected to dedicated socket! Now running thread to receive new messages!");
			String userInput = in.readLine();
			String userInputOut = "(" + userInput.length() + ") " + userInput;
			if (userInput.length() > 1000) {
				userInputOut = userInput.substring(0,500) 
						+ " ... " + userInput.substring(userInput.length() - 500,userInput.length());
			}
			printLine("had read first line, received input = " + userInputOut);
			while (isConnected == true && userInput.length() > 0) {
				rtiLib.receivedMessage(userInput);
				printLine("ready to read...");
				userInput = in.readLine();
				userInputOut = "(" + userInput.length() + ") " + userInput;
				if (userInput.length() > 1000) {
					userInputOut = "(" + userInput.length() + ") " + userInput.substring(0,500) 
							+ " ... " + userInput.substring(userInput.length() - 500,userInput.length());
				}
				printLine("had read, received input = " + userInputOut);
			}
		} catch (Exception e) {
			disconnectedErr = System.currentTimeMillis() + " Exception (connection closed) >> " + e.toString();
			printLine(disconnectedErr);
			e.printStackTrace();
		}
		
		// if thread reading from RTI broke multiple times within 10 seconds, then there is some problem, maybe best to close the thread...
		if (System.currentTimeMillis() - crashTimeInMillis < 10000) {
			numOfRTICrash++;
		} else {
			numOfRTICrash = 0;
			numOfRTICrash++;
		}
		crashTimeInMillis = System.currentTimeMillis();
		
		if (isConnected == true) {
			if (numOfRTICrash >= 3) {
				printLine("Something serious is wrong with the connection to the RTI. Shut down the thread.");
				System.out.println("Something serious is wrong with the connection to the RTI. Shut down the thread.");
				rtiLib.reconnect();
			} else {
				continuousInput(in);
				return;
			}
		}
		
		try {
			in.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	private String disconnectedErr = "";
	public String getDisconnectedErr() {
		String returnString = null;
		if (disconnectedErr.length() > 0) {
			returnString = disconnectedErr;
			disconnectedErr = "";
		}
		return returnString;
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
	
	public void printLine(String line) {
		String formatLine = String.format("%1$32s", "[" + tag + "]" + " --- ") + line;
		Version.printSimConsole(formatLine);
		Version.printSimFile(formatLine);
		Version.printSimDebugGUI(formatLine);
	}
}
