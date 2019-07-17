package org.im.oor;

import java.io.File;
import javafx.application.Application;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;

/**
 *
 * @author maher
 */
public class main extends Application {

    @Override
    public void start(Stage primaryStage) {
        Button btn = new Button();
        btn.setText("fire JS");
        btn.setOnAction(new EventHandler<ActionEvent>() {
            @Override
            public void handle(ActionEvent event) {
                if (webengine != null)
                {
                    webengine.executeScript("test()");
                }
            }
        });

        publishServices();
        StackPane root = new StackPane();
//        root.getChildren().add(btn);
        HBox hh = new HBox();
        hh.getChildren().add(btn);
        hh.getChildren().add(webview);


        root.getChildren().add(hh);

        Scene scene = new Scene(root, 300, 250);

        primaryStage.setTitle("Hello World!");
        primaryStage.setScene(scene);
        primaryStage.show();
    }
    private WebEngine webengine;
    private static WebView webview;

    private void publishServices() {



        try {
            webview = new WebView();
            webview.setVisible(true);
            webengine = webview.getEngine();
            webengine.setJavaScriptEnabled(true);
            File file = new File("C:\\Users\\licha\\Google Drive\\PapersOfLichao\\ICoR\\guiDevelopment\\HelloFX\\hello.html");
            System.out.println(file.exists() + " file exitence");
            webengine.load(file.toURI().toURL().toString());
        } catch (Exception ex) {
            System.err.print("error " + ex.getMessage());
            ex.printStackTrace();
        }




    }


    /**
     * The main() method is ignored in correctly deployed JavaFX application.
     * main() serves only as fallback in case the application can not be
     * launched through deployment artifacts, e.g., in IDEs with limited FX
     * support. NetBeans ignores main().
     *
     * @param args the command line arguments
     */
    public static void main(String[] args) {
        launch(args);
    }
}