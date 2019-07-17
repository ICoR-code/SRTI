package airport_20190104;

public class D {

	public int timestamp = 0;
	public int numberOfPeople = 1;
	
	public void Initialize() {
		
	}
	
	public void Simulate() {
		if (timestamp % 50 > 25)
			numberOfPeople = timestamp % 9;
		else 
			numberOfPeople = timestamp % 5;
	}
}
