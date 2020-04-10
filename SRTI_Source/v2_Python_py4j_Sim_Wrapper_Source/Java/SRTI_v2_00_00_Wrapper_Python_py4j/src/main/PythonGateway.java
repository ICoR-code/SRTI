package main;

import py4j.GatewayServer;
import mainServer.RTILib;

public class PythonGateway {
	
	private RTILib rtiLib;

	public PythonGateway() {
		rtiLib = new RTILib();
		
	}
	
	public RTILib getRTILib() {
		return rtiLib;
	}
	
	public static void main(String [] args) {
		System.out.println("Java - Starting SRTI v2.00.00 Wrapper (Python - py4j).");
		System.out.println("Java - This indicates that the Java portion is starting... but the Python code will need to start to connect to it!");
		GatewayServer gatewayServer = new GatewayServer(new PythonGateway());
		gatewayServer.start();
		System.out.println("Java - Gateway Server Started.");
	}
}
