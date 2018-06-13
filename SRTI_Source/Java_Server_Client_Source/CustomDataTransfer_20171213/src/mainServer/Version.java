package mainServer;

import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class Version {
	public static String version = "v0.56";
	public static String textFileName = null;
	
	public static boolean debugConsole = false;
	public static boolean debugFile = false;
	
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
}
