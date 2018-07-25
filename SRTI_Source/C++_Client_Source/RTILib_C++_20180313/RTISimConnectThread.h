#pragma once

#include "stdafx.h"
#include "RTISimConnectThread.h"
#include "RTILib.h"

// #ifdef _WIN32
// #include <winsock2.h>
// #include <ws2tcpip.h>
// #pragma comment(lib, "Ws2_32.lib")
// #else
// #include <sys/socket.h>
// #endif


#ifdef _WIN64
  //define something for Windows (64-bit)
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #pragma comment(lib, "Ws2_32.lib")
#elif _WIN32
  //define something for Windows (32-bit)
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #pragma comment(lib, "Ws2_32.lib")
#elif __APPLE__
  #include "TargetConditionals.h"
  #if TARGET_OS_IPHONE && TARGET_IPHONE_SIMULATOR
      // define something for simulator   
  #elif TARGET_OS_IPHONE
      // define something for iphone  
  #else
      #define TARGET_OS_OSX 1
      // define something for OSX
  #endif
#elif __linux
  // linux
  #include <sys/types.h>
  #include <sys/socket.h> 
  #include <unistd.h>
#elif __unix // all unices not caught above
    // Unix
#elif __posix
    // POSIX
#endif

class RTISimConnectThread
{

private:
	string tag = "RTISimConnectThread";

public:
	RTISimConnectThread();
	// RTISimConnectThread(RTILib rtiSim, SOCKET dedicatedSocket);
  RTISimConnectThread(RTILib rtiSim, int dedicatedSocket);
	void start();
	void closeConnection();
	void setDebugOutput(bool setDebugOut);
	void printLine(string line);
	~RTISimConnectThread();
};

