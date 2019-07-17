package airport_20190104;

public class B {

	public int passengers = 0;
	public int timeToFly = 30;
	public int changeInPeople = 0;
	
	public void Initialize() {
		passengers = 0;
		timeToFly = 30;
	}
	
	public void Simulate() {
		passengers = passengers + changeInPeople;
		timeToFly = timeToFly - 1;
	}
	
}
