#pragma once

#include <string>
#include <vector>
#include <map>
#include <iterator>
#include "rapidjson/document.h"

using namespace std;

class DifferenceSim {
public:
    DifferenceSim();
    ~DifferenceSim();

    void simulate();

    rapidjson::Value & getMessage(string);
    void setMessage(string, rapidjson::Value &);
<<<<<<< HEAD
    void setMessage(string, string &);
=======
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3

    void generateInitialMessage();

private:
<<<<<<< HEAD
    rapidjson::Document doc;
    map<string, rapidjson::Value> input;
    map<string, rapidjson::Value> output;
=======
    map<string, rapidjson::Value &> input;
    map<string, rapidjson::Value &> output;
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3

    map<string, int> history_size;

    map<string, vector<rapidjson::Value> > history;

    void updateHistory();

};
