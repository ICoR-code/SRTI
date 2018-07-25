package main;

import java.io.StringReader;

import javax.json.Json;
import javax.json.JsonNumber;
import javax.json.JsonObject;
import javax.json.JsonReader;

public class difference_sim {

	private int value = 0;
	
	public static void main(String [] args) {
		difference_sim d = new difference_sim();
		d.generateInitialMessage();
	}
	
	public difference_sim() {
		
	}
	
	public String getMessage(String message_name) {
		String returnMessage = "";
		
		if (message_name.compareTo("Difference") == 0) {
			JsonObject json =  Json.createObjectBuilder()
				.add("value",value)
				.build();
			returnMessage = json.toString();
		}
		
		return returnMessage;
	}
	
	public void setMessage(String message_name, String message) {
		if (message_name.compareTo("Sum") == 0) {
			JsonReader reader = Json.createReader(new StringReader(message));
			JsonObject json = reader.readObject();
			
			Object jsonObj = json.get("value");
			if ((jsonObj instanceof Integer)) {
				value = (int)jsonObj;
			} else if (jsonObj instanceof JsonNumber) {
				value = ((JsonNumber) jsonObj).intValue();
			} else {
				value = Integer.parseInt((String)jsonObj);
			}
		}
	}
	
	public void simulate() {
		value = value - 1;
	}
	
	public void setMessageCustom(int newValue) {
		value = newValue;
	}
	
	public void setMessageCustom2(int newValue, int positive) {
		value = newValue * positive;
	}
	
	public void setMessageCustom3(int positive) {
		value = value * positive;
	}
	
	public int getMessageCustom() {
		return value;
	}
	
	public void simulateCustom() {
		value = value - 1;
	}
	
	public void generateInitialMessageCustom() {
		value = 10;
		updateHistory();
	}
	
	void updateHistory() {

	}
	
	public void generateInitialMessage() {
		value = 10;
		updateHistory();
	}
	
}
