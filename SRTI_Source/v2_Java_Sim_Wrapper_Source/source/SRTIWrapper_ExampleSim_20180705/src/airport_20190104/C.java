package airport_20190104;

public class C {

	public int milesToTravel = 200;
	public int timestamp = 0;
	
	public void Initialize() {
		milesToTravel = ((timestamp % 4) + 1) * 50;
	}
	
	public void Simulate() {
		milesToTravel = milesToTravel - 30;
	}
}
