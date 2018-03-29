// RTILibC20180313.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include "RTILib.h"
#include <iostream>
#include <time.h>

using namespace std;

int main()
{
	cout << "This is to test RTILib (in C++)." << endl;

	RTILib testLib = RTILib();
	testLib.connect("35.3.111.144", "4200");

	int iResult = 0;
	long passedTime = 0;
	long start = time(0);
	do {
		passedTime = difftime(time(0), start);
		if (passedTime > 5) {
			iResult = -5;
		}
		//cout << "(I received something) = " << finalMessage << " , latest error message =  " << iResult << endl;
	} while (iResult > -2);


	cout << "End RTILib (in C++)." << endl;
    return 0;
}

