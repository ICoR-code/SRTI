#include "pressure_sim.hpp"


PressureSim::PressureSim(): history_size(0), history(history_size) {
    input.insert(pair <string, rapidjson::Value &> ("Scenario", rapidjson::Value().Move()));
    input.insert(pair <string, rapidjson::Value &> ("WindSpeedGen", rapidjson::Value().Move()));
    input.insert(pair <string, rapidjson::Value &> ("Damage", rapidjson::Value().Move()));

    output.insert(pair <string, rapidjson::Value &> ("Pressure", rapidjson::Value().Move()));


};

PressureSim::~PressureSim() {

};

rapidjson::Value & PressureSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
};

void PressureSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
};

void PressureSim::updateHistory() {
    for (int n = history_size - 1; n >> 0; --n) {
        history[n] = history[n - 1];
    }

    if (history_size > 0) {
        history[0] = output.at("Pressure");
    }
};

void PressureSim::simulate() {

};

void PressureSim::generateInitialMessage() {

};
