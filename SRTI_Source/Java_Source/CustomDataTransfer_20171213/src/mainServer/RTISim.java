package mainServer;

public interface RTISim {
	
	public void receivedMessage(String messageName, String content, String timestamp, String fromSim);
	
	public String getSimName();
}
