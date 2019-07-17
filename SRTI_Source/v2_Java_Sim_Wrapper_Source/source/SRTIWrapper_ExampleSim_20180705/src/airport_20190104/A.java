package airport_20190104;

public class A {

	
	public int people = 450;
	public int changeInPeople = 0;
	
	public void Initialize() {
		people = 450;
	}
	
	public void Simulate() {
		people = people - changeInPeople;
	}
}
