package mainServer;

public interface RTISim {
	
	public void receivedMessage(String messageName, String content, String timestamp, String source);
	
	public String getSimName();
}
