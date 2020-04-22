
<h1 align="center">SRTI</h1>

<h3 align="center">"Simple Run Time Infrastructure" (name inspired by similar data-transfer systems)</h3>

<br>
<br>

<img src="https://github.com/ICoR-code/SRTI/raw/master/SRTI_GUI/source/extraResources/docs/html/images/srtiv2gui_doc_home_img_01.png">

<br>
<br>

<table align="center">
   <tr>
     <th>DOWNLOAD</th>
   </tr>
   <tr>
     <td><b>SRTI v1.00.00</b></td>
     <td><b>SRTI v2.00.00</b></td>
     <td><b>All Downloads</b></td>
  </tr>
  <tr>
    <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v1.00.02-Java">RTI Server + RTI Lib API (Java, .jar)</a></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2.22.02-JavaServer">RTI Server (Java, .jar)</a></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases">Releases Page</a></td>
  </tr>
  <tr>
    <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v1.00.01-C%2B%2B">RTI Lib API (C++, .dll)</a></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2.22.02-Java">RTI Wrapper (Java)</a></td>
    <td><a href="https://github.com/ICoR-code/SRTI/wiki">Wiki</a></td>
  </tr>
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2.22.02-Matlab">RTI Wrapper (Matlab)</a></td>
  </tr>
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2.22.02-NetLogo">RTI Wrapper (NetLogo)</a></td>
  </tr>
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2.22.02-Python">RTI Wrapper (Python)</a></td>
  </tr>  
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2GUI-1.00.01-Win">RTI v2 GUI (WINDOWS) (optional)</a></td>
  </tr>  
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2GUI-1.00.01-Mac">RTI v2 GUI (MAC) (optional)</a></td>
  </tr> 
  <tr>
     <td></td>
     <td><a href="https://github.com/ICoR-code/SRTI/releases/tag/v2GUI-1.00.01-Linux">RTI v2 GUI (LINUX) (optional)</a></td>
  </tr>    
</table>

<br> 

#### What is it?

A simple, open-source, portable software solution to allow data-transfer between applications, either running on the same machine or separate machines. Can be used for virtual simulations of shared systems, IoT systems, and other applications.

Unlike similar solutions, is not built for efficiency at the expense of usability: data messages are sent and received as "string" representations of JSON format, to allow flexible data representation without re-compilation. This software library includes API to help format strings properly, but to extract data requires documentation between users to understand the expected content of messages. 

<br>
<br>

#### How does it work?

###### RTI Server 

First, must run "RTI" as the central server that simulations must connect to. This can be run on any machine. The original Java implementation does not need to be rewritten for applications in other languages.

This can be started by running the included pre-compiled .jar file.

###### RTI Lib API

Second, must use "RTILib" library in your application to connect to the RTI. RTILib will utilize socket connections to connect to the RTI, the user must specifiy the "hostname" and "portnumber" (output when running the RTI), otherwise the details of the connection are not required to be understood by the user.

The "RTILib" must continue to be used to create and send/receive messages from the RTI. The application must "subscribe" to a message by name in order to receive updated messages of that type.

The "RTILib" must be re-written in other languages if exported versions in this repository are not supported.

The "RTILib" and its API functions are included in the pre-compiled .jar file.

###### ExampleServerGUI.java

An example GUI interface, treated as a application that uses "RTILib" to connect to the "RTI." Shows the "hostname" and "portnumber," and a list of applications connected, and a history of messages received by the RTI. 

Currently, the included compiled .jar file will automatically start "ExampleServerGUI" as well as the RTI upon startup.

<br>
<br>

#### v1.00.00 VS v2.00.00

The above information refers to SRTI v1.00.00. It's best suited for programmers that need a flexible and simple solution to pass data between different programs.

SRTI v2.00.00 is a separate version that builds off of v1.00.00's foundation. It's meant to be able to support language-specific simulators without modifying their underlying source-code, and handles additional simulation-system-management at the Server-level.

In addition to the above elements, v2.00.00 includes the following required components:

###### RTI Wrapper

A Wrapper-component that includes and uses the RTI Lib API to connect to the RTI Server, and can access public functions and variables inside a pre-compiled simulator.

To be able to access a simulator, the simulator must follow minor design guidelines to be accessible.
The Wrapper must be written in the same language as the simulator, and must be able to access a version of the RTI Lib API.
Since both the Wrapper and simulator are pre-compiled, the user doesn't need to compile anything, but must write a configuration file that describes to the Wrapper the use of the simulator to the rest of the project.
A custom-ad-hoc version of a Wrapper can be written to allow other simulators to be supported, in the same way v1.00.00 allows.

###### RTI Server Manager

Automatically included in the RTI Server, this Manager listens for specific messages automatically sent from the Wrapper from each simulator.

This primarily consists of time synchronization at each timestep.

###### RTI v2.00.00 GUI

A new GUI to help design a project, with output consisting of configuration files for each Wrapper to use when running.

