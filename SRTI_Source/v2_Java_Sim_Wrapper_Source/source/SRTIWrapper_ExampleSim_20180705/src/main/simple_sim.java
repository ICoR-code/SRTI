package main;

public class simple_sim {

	public static void main(String [] args) {
		
	}
	
	
	public int a = 0;
	public int b = 0;
	public int c = 0;
	
	public int x = 0;
	public int y = 0;
	public int z = 0;
	
	
	public void InitializeExample1() {
		a = 1;
		b = 0;
		c = 0;
		
		x = 0;
		y = 0;
		z = 0;
	}
	
	public void InitializeExample2() {
		a = 0;
		b = 1;
		c = 2;
		
		x = 0;
		y = 0;
		z = 0;
	}
	
	public void SimulateNextStep() {
		x = x + a + (b * c);
		
		y = y + b;
		
		z = c;
	}
}
