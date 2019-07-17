package mainServer;

/*
 * RTISim.java
 * 
 * - if you want a connected sim to receive callback function calls to immediately handle received messages,
 * 		the simulation must extend from this class and implement these two functions.
 * */

public interface RTISim {
	
	public void receivedMessage(String messageName, String content, String timestamp, String source);
	
	public String getSimName();
}
