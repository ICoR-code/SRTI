#include "stdafx.h"
#include "CustomJSONParser.h"

#include <string>

using namespace std;

CustomJSONParser::CustomJSONParser()
{
}


string GetValue(string name, string originalString) {
	string returnString = "";
	

	string findString = "\"" + name + "\"";
	size_t charPosition = originalString.find("\"" + name + "\"");
	bool startAdding = false;
	if (charPosition != string::npos) {
		for (int i = charPosition + findString.length(); i < originalString.length(); i++) {
			if (originalString[i] == '\"' && startAdding == false) {
				startAdding = true;
			}
			else if (originalString[i] == '\"' && startAdding == true) {
				startAdding = false;
				break;
			}

			if (startAdding == true) {

			}
		}
	}

	return returnString;
}

CustomJSONParser::~CustomJSONParser()
{
}
