#pragma once
#include <string>


using namespace std;



class Version
{
public:
	Version();
	static string GetVersion();
	static void setDebugSimConsole(bool set);
	static void setDebugSimFile(bool set);
	static void printSimConsole(string line);
	static void printSimFile(string line);
	~Version();
};
//bool Version::debugSimConsole = false;
//bool Version::debugSimFile = false;
