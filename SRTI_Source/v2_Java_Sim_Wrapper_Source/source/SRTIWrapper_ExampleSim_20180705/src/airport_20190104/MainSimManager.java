package airport_20190104;

public class MainSimManager {

	public static void main(String [] args) {
	
		int actStep = 0;
		int timestamp = 0;
		int stage = 0;
		
		A a = new A();
		B b = new B();
		C c = new C();
		D d = new D();
		
		//a.people = 450;
		//b.passengers = 0;
		//b.timeToFly = 30;
		//a.Initialize();
		b.Initialize();
		
		while ((a.people > 0)) {
			
			System.out.println("ActStep = " + actStep + "\t, Time = " + timestamp + "\t, Running stage = " + stage 
					+ ", A.people = " + a.people 
					+ ", B.passengers = " + b.passengers + ", C.milesToTravel = " + c.milesToTravel);
			
			
			if (stage == 0) {
				timestamp = timestamp + 1;
				
				//d.Simulate();
				
				a.changeInPeople = d.numberOfPeople;
				b.changeInPeople = d.numberOfPeople;
				c.timestamp = timestamp;
				d.timestamp = timestamp;
				d.Simulate();
				a.Simulate();
				b.Simulate();
				
				if (b.passengers >= 100 || b.timeToFly <= 0 || a.people <= 0) {
					stage = 1;
					
					c.Initialize();
				}
			} else if (stage == 1) {
				timestamp = timestamp + 30;
				
				//c.milesToTravel = c.milesToTravel - 30;
				c.Simulate();
				
				if (c.milesToTravel <= 0) {
					stage = 0;
					b.Initialize();
				}
			}
			
			actStep++;
		}
		
	}
	
	
	
}
