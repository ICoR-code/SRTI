package mainServer;

import java.io.BufferedReader;
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
	}
	
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
			while ((userInput = in.readLine()) != null) {
				printLine("I READ FROM RTI : " + userInput);
				rtiLib.receivedMessage(userInput);
			}
		} catch (Exception e) {
			printLine("Exception (connection closed) >> " + e.toString());
		}
	}
	
	
	
	public void printLine(String line) {
		System.out.println(String.format("%1$32s", "[" + tag + "]" + " --- ") + line);
	}
}
