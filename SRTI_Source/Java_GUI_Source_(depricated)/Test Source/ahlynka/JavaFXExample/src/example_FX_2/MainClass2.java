package example_FX_2;

import java.io.FileWriter;
import java.io.IOException;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class MainClass2 extends Application {

    @Override
    public void start(Stage stage) {

        String javaVersion = System.getProperty("java.version");
        String javafxVersion = System.getProperty("javafx.version");
        Label l = new Label("Hello, JavaFX " + javafxVersion + ", running on Java " + javaVersion + ".");
        
        Scene scene = new Scene(new StackPane(l), 640, 480);
        stage.setScene(scene);
        stage.show();
        
        try {
			FileWriter exportFile = new FileWriter("ExampleOutFile.txt", true);
			exportFile.write("This is test output.\n");
			exportFile.write("Hello world!\n");
			exportFile.flush();
			exportFile.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
    }

    public static void main(String[] args) {
    	System.out.println("This is MainClass2 running...");
        launch();
    }

}
