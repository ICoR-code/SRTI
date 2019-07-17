package example_FX_3;

import java.io.FileWriter;
import java.io.IOException;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class MainClass3 extends Application {

    @Override
    public void start(Stage stage) {

        String javaVersion = System.getProperty("java.version");
        String javafxVersion = System.getProperty("javafx.version");
        Label l = new Label("Hello, JavaFX " + javafxVersion + ", running on Java " + javaVersion + ".");
        
        Scene scene = new Scene(new StackPane(l), 640, 480);
        stage.setScene(scene);
        stage.show();
        
        try {
			System.out.println("Trying to run command line instruction... ");
			Runtime rt = Runtime.getRuntime();
			Process pr = rt.exec("java -jar C:\\Users\\hlynk\\Desktop\\SRTI_v_1_00_01_2.jar");
			System.out.println("Finished instruction.");
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
    }

    public static void main(String[] args) {
    	System.out.println("This is MainClass2 running...");
        launch();
    }

}
