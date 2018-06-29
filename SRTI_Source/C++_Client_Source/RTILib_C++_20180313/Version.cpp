#include "stdafx.h"
#include "Version.h"
#include <string>
#include <iostream>
#include <algorithm>
#include <chrono>
#include <fstream>

using namespace std;

static string version = "v0.61";

static string textFileSimName = "";
bool debugSimConsole;
bool debugSimFile;

Version::Version()
{

}

string Version::GetVersion() {
	string returnString = version;
	return returnString;
}

void Version::setDebugSimConsole(bool set) {
	debugSimConsole = set;
}

void Version::setDebugSimFile(bool set) {
	debugSimFile = set;
}

void Version::printSimConsole(string outputLine) {
	if (debugSimConsole == false) {
		return;
	}


	auto time = std::chrono::system_clock::now();
	auto since_epoch = time.time_since_epoch();
	auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(since_epoch);
	long long now = millis.count();

	cout << now << "   " << outputLine << endl;
}

void Version::printSimFile(string outputLine) {
	if (debugSimFile == false) {
		return;
	}

	if (textFileSimName.compare("") == 0) {
		auto time = std::chrono::system_clock::now();
		auto since_epoch = time.time_since_epoch();
		auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(since_epoch);
		long long now = millis.count();
		textFileSimName = "SRTI_Debug_" + now; 
		textFileSimName = textFileSimName + ".txt";
		// TODO: need to convert "now" to current time instead of "epoch" time, to make it easier to track files using relavent value
	}

	auto time = std::chrono::system_clock::now();
	auto since_epoch = time.time_since_epoch();
	auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(since_epoch);
	long long now = millis.count();

	ofstream file;
	file.open(textFileSimName, std::ios::out | std::ios::app);
	file << now << "   " << outputLine << endl;
	file.close();
}


Version::~Version()
{
}
