import java.io.IOException;

public class Backend {
	public static String execCmd(String cmd) throws java.io.IOException {
        java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec(cmd).getInputStream()).useDelimiter("\\A");
        return s.hasNext() ? s.next() : "";
    }
	
	public String getTime() {
		String result;
		try {
			result = execCmd("date");
		} catch (IOException e) {
			result = "";
		}
		return result;
	}
}
