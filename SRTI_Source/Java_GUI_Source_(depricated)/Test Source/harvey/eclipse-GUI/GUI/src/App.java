// package edu.umich.engin.icor.gui_example;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Scanner;

import javafx.application.Application;
import javafx.beans.value.ObservableValue;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;
import javafx.application.Application;


public class App extends Application {

    @Override
    public void start(Stage primaryStage) {
       primaryStage.setTitle("JavaFX WebView Example");

       WebView webView = new WebView();
       WebEngine webEngine = webView.getEngine();
       String content = "";
       
       InputStream is = App.class.getClassLoader().getResourceAsStream("index.html");
	   Scanner s = new Scanner(is).useDelimiter("\\A");
	   content = s.hasNext() ? s.next() : "";
//    	   content = new String(Files.readAllBytes(Paths.get("./paper.html")));
       
//       System.out.println(content);
       
       webView.getEngine().loadContent(content, "text/html");
       JSObject window = (JSObject) webEngine.executeScript("window");
       window.setMember("backend", new Backend());

       VBox vBox = new VBox(webView);
       Scene scene = new Scene(vBox, 960, 600);

       primaryStage.setScene(scene);
       primaryStage.show();

   }

    public static void main(String[] args) {
        launch();
    }

}
