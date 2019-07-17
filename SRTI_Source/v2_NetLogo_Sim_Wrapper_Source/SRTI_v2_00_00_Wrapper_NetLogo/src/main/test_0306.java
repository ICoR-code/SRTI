package main;

import org.nlogo.app.App;
import mainServer.RTILib;


public class test_0306 {
    public static void main(String[] argv) {
        int tick = 0;
		
		System.out.println("Starting program...");
		
        RTILib rtiLib = new RTILib();
        rtiLib.setSimName("NetLogo_Sim");
        rtiLib.connect("localhost", "42010");
        rtiLib.subscribeTo("Sim1");
		
		System.out.println("Connected to Server. Now trying to start NetLogo app...");
		
        App.main(argv);
        try {
            // open NetLogo and setup
            java.awt.EventQueue.invokeAndWait(new Runnable() {
                public void run() {
                    try {
                        App.app().open("D:\\Work\\Acer\\DSK\\UMich\\ICoR\\Workspace-Java\\SRTI_v2_00_00_Wrapper_NetLogo\\NetLogo_SRTI\\NetLogo\\crime_0305.nlogo",true);
						System.out.println("NetLogo app opened...");
                    } catch (Exception ex) {
                        ex.printStackTrace();
						System.out.println("    ERROR when opening NetLogo app...");
                    }
                }
            });

			System.out.println("running command 1...");
            App.app().command("random-seed 0");
            App.app().command("setup");
			System.out.println("running command 2...");

            // subscribe message
            String testMat = "[0,0,0,0]";
            while (tick < 30) {
                String message = rtiLib.getNextMessage("Sim1");
                if (message != null && message !="" ) {
                    String content = rtiLib.getMessageContent(message);
                    String step = rtiLib.getJsonObject("Step", content);
                    String type1Err = rtiLib.getJsonObject("Type1Error", content);
                    testMat = rtiLib.getJsonObject("2DArray", content);
//                    testMat.deleteCharAt(0);
//                    testMat.deleteCharAt(testMat.length()-1);
                    System.out.println("2DArray " + testMat);
                    testMat = testMat.replace("[","\"").replace("]","\"").replace(" ", ",").replace(";","\\n");
//                    String testMat = "\"3,4,5,6\\n7,8,9,10\"";
                    System.out.println("2DArrayConversion " + testMat);

                    // if the step matches
                    if (tick == Integer.parseInt(step)) {
                        // update tick in java
                        tick = tick + 1;
                        System.out.println("update type1 error = " + type1Err + " for tick " + tick);
                        // update NetLogo variables and run one step
                        App.app().command("");

//                        App.app().command("let a array:from-list n-values 5 [0]");
//                        App.app().command("print a");

                        App.app().command("set review-type1-error " + type1Err);
                        App.app().command("set csvString " + testMat);
//                        System.out.println("set csvString " + "\"3, 4, 5\\n6,7,8\"");
                        App.app().command("go");

                        // get the results from NetLogo
                        Object ticks = App.app().report("ticks"); // update tick from NetLogo
                        Object jst_benefit = App.app().report("justified-benefits");
                        Object pct_fraud = App.app().report("100 * fraud-benefits / (fraud-benefits + justified-benefits)");
                        Object w_list = App.app().report("w_list_csv");
                        String w_list_string = w_list.toString();
                        w_list_string = "[" + w_list_string + "]";
                        w_list_string = w_list_string.replace(","," ").replace("\n",";");

                        System.out.println("At tick " + ticks);
                        System.out.println("justified-benefits: " + jst_benefit);
                        System.out.println("% of fraud benefits: " + pct_fraud);
                        System.out.println("w_list_csv_string" + w_list_string);

                        // publish message
                        String msg = rtiLib.setJsonObject("", "Tick", ""+ticks);
                        msg = rtiLib.setJsonObject(msg, "Jst_benefit", ""+jst_benefit);
                        msg = rtiLib.setJsonObject(msg, "Pct_fraud", ""+pct_fraud);
                        msg = rtiLib.setJsonObject(msg, "w_list",""+w_list_string);
                        rtiLib.publish("NetLogo", msg);
                        System.out.println("msg: "+ msg);
                    }
                }
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}