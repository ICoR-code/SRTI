package mainServer;

import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Version {
	public static String version = "v0.58";
	
	public static String textFileName = null;
	public static boolean debugConsole = false;
	public static boolean debugFile = false;
	
	public static String textFileSimName = null;
	public static boolean debugSimConsole = false;
	public static boolean debugSimFile = false;
	
	//private static List<String> debugOutBuffer = new ArrayList<String>();
	
	public static void printConsole(String outputLine) {
		if (debugConsole == false) {
			return;
		}
		
		System.out.println(System.currentTimeMillis() + " \t" + outputLine);
	}
	
	public static void printFile(String outputLine) {
		if (debugFile == false) {
			return;
		}
		
		if (textFileName == null) {
			String actualDate = (new SimpleDateFormat("yyyyMMddHHmmss")).format(new Date(System.currentTimeMillis()));
			textFileName = "SRTI_Debug_" + actualDate + ".txt";
		}
		
		try {
			FileWriter exportFile;
			exportFile = new FileWriter(textFileName, true);
			exportFile.write(System.currentTimeMillis() + " \t" + outputLine + "\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public static void printSimConsole(String outputLine) {
		if (debugSimConsole == false) {
			return;
		}
		
		System.out.println(System.currentTimeMillis() + " \t" + outputLine);
	}
	
	public static void printSimFile(String outputLine) {
		if (debugSimFile == false) {
			return;
		}
		
		if (textFileSimName == null) {
			String actualDate = (new SimpleDateFormat("yyyyMMddHHmmss")).format(new Date(System.currentTimeMillis()));
			textFileSimName = "SRTI_Debug_Sim_" + actualDate + ".txt";
		}
		
		try {
			/* Code to hold debug messages in a buffer, write to file in chunks.
			 * Debug messages are relatively small, so this method is noticeably fast in comparison to opening file every time. 
			 * But risk that last several lines won't be written.
			 * 
			 * debugOutBuffer.add(System.currentTimeMillis() + " \t" + outputLine + "\n");
			
			if (debugOutBuffer.size() > 100000) {
				FileWriter exportFile;
				exportFile = new FileWriter(textFileSimName, true);
				for (int i = 0; i < debugOutBuffer.size(); i++) {
					if (debugOutBuffer.get(i) != null)
						exportFile.write(debugOutBuffer.get(i));
					else 
						exportFile.write("something weird happened, we couldn't print out the debug buffer at output : " + i + ", size = " + debugOutBuffer.size());
				}
				exportFile.flush();
				exportFile.close();
				debugOutBuffer.clear();
			}*/
			
			FileWriter exportFile;
			exportFile = new FileWriter(textFileSimName, true);
			exportFile.write(System.currentTimeMillis() + " \t" + outputLine + "\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
