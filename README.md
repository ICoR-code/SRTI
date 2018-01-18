# SRTI

## "Simple Real Time Interface," temporary name inspired by other data-transfer systems.

#### What is it?

A simple software solution to allow data-transfer between applications, either running on the same machine or separate machines. Can be used for virtual simulations of shared systems, IoT systems, and other applications.

Unlike similar solutions, is not built for efficiency at the expense of usability: data messages are sent and received as "string" representations of JSON format, to allow flexible data representation without re-compilation. This software library includes API to help format strings properly, but to extract data requires documentation between users to understand the expected content of messages. 

#### How does it work?

###### RTI

First, must run "RTI" as the central server that simulations must connect to. This can be run on any machine. The original Java implementation does not need to be rewritten for applications in other languages.

This can be started by running the included pre-compiled .jar file.

###### RTILib

Second, must use "RTILib" library in your application to connect to the RTI. RTILib will utilize socket connections to connect to the RTI, the user must specifiy the "hostname" and "portnumber" (output when running the RTI), otherwise the details of the connection are not required to be understood by the user.

The "RTILib" must continue to be used to create and send/receive messages from the RTI. The application must "subscribe" to a message by name in order to receive updated messages of that type.

The "RTILib" must be re-written in other languages if exported versions in this repository are not supported.

The "RTILib" and its API functions are included in the pre-compiled .jar file.

###### ExampleServerGUI.java

An example GUI interface, treated as a application that uses "RTILib" to connect to the "RTI." Shows the "hostname" and "portnumber," and a list of applications connected, and a history of messages received by the RTI. 

Currently, the included compiled .jar file will automatically start "ExampleServerGUI" as well as the RTI upon startup.

