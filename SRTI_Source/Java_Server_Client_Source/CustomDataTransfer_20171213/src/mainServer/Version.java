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
		
		System.out.println(outputLine);
	}
	
	public static void printFile(String outputLine) {
		if (debugFile == false) {
			return;
		}
		
		if (textFileName == null) {
			//textFileName = "SRTI_Debug_" + System.currentTimeMillis() + ".txt";
			String actualDate = (new SimpleDateFormat("yyyyMMddHHmmss")).format(new Date(System.currentTimeMillis()));
			textFileName = "SRTI_Debug_" + actualDate + ".txt";
		}
		
		try {
			FileWriter exportFile;
			exportFile = new FileWriter(textFileName, true);
			exportFile.write(outputLine + "\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
