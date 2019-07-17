// package edu.umich.engin.icor.gui_example;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import javafx.application.Application;


public class HelloFX extends Application {

    @Override
    public void start(Stage primaryStage) {
       primaryStage.setTitle("JavaFX WebView Example");

       WebView webView = new WebView();

       webView.getEngine().load("http://google.com");

       VBox vBox = new VBox(webView);
       Scene scene = new Scene(vBox, 960, 600);

       primaryStage.setScene(scene);
       primaryStage.show();

   }

    public static void main(String[] args) {
        launch();
    }

}
