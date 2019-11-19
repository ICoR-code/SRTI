package mainServer;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.swing.SwingUtilities;

public class Version {
	/* Version = <1.00 = standard version, still prone to bugs
	 * 			= 1.00.00 = standard base version. 1.00.01 means bug update, should be applied to other versions too.
	 * 			= 2.00.00 = extended version with advanced "RTI Wrapper", not compatible with 1.00.00. 2.01.00 means feature update.
	 * */
	public static String version = "v2.22.02";
	
	public static String textFileName = null;
	public static boolean debugConsole = false;
	public static boolean debugFile = false;
	
	public static String textFileSimName = null;
	public static boolean debugSimConsole = false;
	public static boolean debugSimFile = false;
	public static boolean debugGUISimName = false;
	
	private static ExampleDebugGUI debugGUI = null;
	
	private static Version v = null;
	
	//private static List<String> debugOutBuffer = new ArrayList<String>();
	
	public static void printConsole(String outputLine) {
		if (debugConsole == false) {
			return;
		}
		
		double mem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
		mem = mem / 1000000f;
		System.out.println(System.currentTimeMillis() + " \t" + String.format("%.2f", mem) + "\tMB RAM\t"+ outputLine);
	}
	
	public static void printFile(String outputLine) {
		if (debugFile == false) {
			return;
		}
		
		if (v == null) {
			v = new Version();
		}
		synchronized(v) {
			v.printToFile(outputLine);
		}
		
	}
	
	private void printToFile(String outputLine) {
		try {
			// 2018-12-12: issue when calling from Matlab: exception claims "file does not exist."
			if (textFileName != null && Files.exists(Paths.get(textFileName)) == false) {
				return;
			}
			// 2018-11-24: triggers "OutOfMemoryError: Java heap space" if file gets too big... therefore, check file size and make new file when necessary.
			if (textFileName == null || Files.size(Paths.get(textFileName)) > 100000000) {
				String actualDate = (new SimpleDateFormat("yyyyMMddHHmmssSSSS")).format(new Date(System.currentTimeMillis()));
				textFileName = "SRTI_Debug_" + actualDate + ".txt"; 
			}
		} catch (IOException e1) {
			e1.printStackTrace();
		}
		
		FileWriter exportFile;
		try {
			exportFile = new FileWriter(textFileName, true);
			double mem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
			mem = mem / 1000000f;
			exportFile.write(System.currentTimeMillis() + " \t" + String.format("%.2f", mem) + "\tMB RAM\t" + outputLine + "\n");
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
		
		if (v == null) {
			v = new Version();
		}
		synchronized(v) {
			v.printToSimFile(outputLine);
		}
		

	}
	
	private void printToSimFile(String outputLine) {
		
		try {
			// 2018-12-12: issue when calling from Matlab: exception claims "file does not exist."
			if (textFileSimName != null && Files.exists(Paths.get(textFileSimName)) == false) {
				return;
			}
			// 2018-11-24: triggers "OutOfMemoryError: Java heap space" if file gets too big... therefore, check file size and make new file when necessary.
			if (textFileSimName == null || Files.size(Paths.get(textFileSimName)) > 100000000) {
				String actualDate = (new SimpleDateFormat("yyyyMMddHHmmssSSSS")).format(new Date(System.currentTimeMillis()));
				textFileSimName = "SRTI_Debug_Sim_" + actualDate + ".txt"; 
			}
		} catch (IOException e1) {
			e1.printStackTrace();
		}
		
		FileWriter exportFile;
		try {
			exportFile = new FileWriter(textFileSimName, true);
			double mem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
			mem = mem / 1000000f;
			exportFile.write(System.currentTimeMillis() + " \t" + String.format("%.2f", mem) + "\tMB RAM\t" + outputLine + "\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void printSimDebugGUI(String outputLine) {
		if (debugGUISimName == false || debugGUI == null) {
			return;
		}
		
		debugGUI.UpdateText(System.currentTimeMillis() + " \t" + outputLine + "\n");
		
	}
	
	public static void printDebugGUI(String outputLine) {
		if (debugGUISimName == false || debugGUI == null) {
			return;
		}
		
		debugGUI.UpdateText(System.currentTimeMillis() + " \t" + outputLine + "\n");
		
	}
	
	
	public static void setDebugGUI(boolean setGUI) {
		debugGUISimName = setGUI;
		
		if (debugGUISimName == true) {
			SwingUtilities.invokeLater(new Runnable() {
				@Override
				public void run() {
					debugGUI = new ExampleDebugGUI();
					debugGUI.setupPanel();
				}
			});
		}
	}
}
