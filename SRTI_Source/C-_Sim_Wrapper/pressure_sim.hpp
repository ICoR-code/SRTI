#pragma once

#include <string>
#include <vector>
#include <map>
#include <iterator>
#include "rapidjson/document.h"

using namespace std;

class PressureSim {
public:
    PressureSim();
    ~PressureSim();

    void simulate();

    rapidjson::Value & getMessage(string);
    void setMessage(string, rapidjson::Value &);

    void generateInitialMessage();

private:
    map<string, rapidjson::Value &> input;
    map<string, rapidjson::Value &> output;

    int history_size;

    vector<rapidjson::Value> history;

    void updateHistory();

};
