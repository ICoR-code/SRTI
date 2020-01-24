package main;


import com.jcraft.jsch.*;
import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.json.JsonValue;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.util.Scanner;
import java.util.concurrent.TimeUnit;


public class MainTest {
	
	public static void main(String [] args) {
		System.out.println("Testing SSH thing.");
		
		
		MainTest sshExecute = new MainTest();
		
		if (args.length > 0) {
			sshExecute.inputFile = args[0];
		} else {
			sshExecute.inputFile = "sshsim.txt";
		}
		
		Runtime.getRuntime().addShutdownHook(new Thread() {
			public void run() {
				System.out.println("Shutdown HOOK.");
				sshExecute.OnShutdown();
				System.out.println("Shutdown HOOK finished.");
			}
		});
		
		sshExecute.SSHExecute();
		
		System.out.println("Done.");
	}
	
	
	String inputFile = null;
	Session session = null;
	Channel channel = null;
	public void SSHExecute() {
		/* 1. Read in config file for credentials (default: "sshsim.txt")
		 * 		... if multiple files/sims, input file name might be different for each sim.
		 * 		Pass in parameter to (String [] args) for input file name.
		 * 		If no name is provided, assume default name.
		 * */
		String user = "username";
		String password = "password";
		String host = "hostname";
		String wrapperConfigFileName = "testconfig.json";
		String localWrapperDir = "localpath";
		//during testing, confirmed "remoteWrapperDir" must be full system path; if not defined, will be 'home' location by default
		String remoteWrapperDir = "fullremotepath";
		String remoteSimExec = "pwd";
		int port = 22;
		
		String totalContent = "";
		File file = new File(inputFile);
		System.out.println(file.getAbsolutePath());
		FileReader fileReader;
		try {
			fileReader = new FileReader(file);
			
			
			BufferedReader bufferedReader = new BufferedReader(fileReader);
			String line;
			while (((line = bufferedReader.readLine()) != null)) {
				totalContent += line;
			}
			bufferedReader.close();
			fileReader.close();
		}
		catch (Exception e) {
			System.out.println("ERROR when reading input file.");
			e.printStackTrace();
		}
		
		//System.out.println("Contents: "+ totalContent);
		JsonReader reader = Json.createReader(new StringReader(totalContent));
		JsonObject json = reader.readObject();
		
		if (json.containsKey("user")) {
			user = json.getString("user", "").toString();
		}
		if (json.containsKey("password")) {
			password = json.getString("password", "").toString();
		}
		if (json.containsKey("host")) {
			host = json.getString("host", "").toString();
		}
		if (json.containsKey("wrapperConfigFileName")) {
			wrapperConfigFileName = json.getString("wrapperConfigFileName", "").toString();
		}
		if (json.containsKey("localWrapperDir")) {
			localWrapperDir = json.getString("localWrapperDir", "").toString();
		}
		if (json.containsKey("remoteWrapperDir")) {
			remoteWrapperDir = json.getString("remoteWrapperDir", "").toString();
		}
		if (json.containsKey("remoteSimExec")) {
			remoteSimExec = json.getString("remoteSimExec", "").toString();
		}
		
		reader.close();
		
		
		try {
			/* 2. Start SSH connection with login credentials.
			 * 		... what if it's unsuccessful?
			 * 		No easy way to recognize unless JavaScript app forces console to open
			 * 		for Java out.println.
			 * 		Also presume disconnect won't occur unless user clicks "STOP"
			 * 		in JavaScript app.
			 * */
			JSch jsch = new JSch();

			System.out.println("Starting connection to following ip... " + host);
			session = jsch.getSession(user, host, port);
			session.setPassword(password);
			session.setConfig("StrictHostKeyChecking", "no");
			session.connect();
			System.out.println("Connection made!");
			
			
			/* 3. Send Wrapper config file to SSH.
			 * 		... OS might not matter if using SFTP or similar to transfer file.
			 * */
			System.out.println("Trying to copy Wrapper config file to remote location...");
			ChannelSftp sftpChannel = (ChannelSftp) session.openChannel("sftp");
			sftpChannel.connect();
			sftpChannel.put(localWrapperDir + wrapperConfigFileName, remoteWrapperDir + wrapperConfigFileName);
			sftpChannel.disconnect();
			System.out.println("Wrapper config remote copy successful!");
			
			
			/* 4. Run remote simulator.
			 * 		
			 * */
			System.out.println("Trying to execute remote sim...");
			channel = session.openChannel("exec");
			((ChannelExec)channel).setCommand(remoteSimExec);
			//channel.setInputStream(null);
			channel.setOutputStream(System.out);
			((ChannelExec)channel).setErrStream(System.err);
			channel.connect();
			System.out.println("Executing remote sim begun!");
			/*while(true) {
				if (channel.isClosed()) {
					System.out.println("exit-status: " + channel.getExitStatus());
					break;
				}
			}*/
			channel.setOutputStream(null);
			channel.disconnect();
			System.out.println("Executing remote sim finished.");
			
			/*InputStream in = channel.getInputStream();
			channel.connect();
			byte[] tmp = new byte[1024];
			while(true) {
				while(in.available()>0) {
					int i = in.read(tmp, 0, 1024);
					if(i < 0) {
						break;
					}
					System.out.print(new String(tmp, 0, i));
				}
				if (channel.isClosed()) {
					System.out.print("exit-status: " + channel.getExitStatus());
					break;
				}
				try{
					Thread.sleep(1000);
				} catch (Exception e) {
					
				}
			}*/
			
			
			session.disconnect();

			System.out.println("Successfully disconnected.");
		} catch (Exception e) {
			System.out.println("ERROR!");
			e.printStackTrace();
			
			if (channel != null) {
				channel.disconnect();
			}
			if (session != null) {
				session.disconnect();
			}
		} 
		

		
		/* 5. Finish.
		 * 		
		 * */
	}
	
	public void OnShutdown() {
		
	
	}
	
}
