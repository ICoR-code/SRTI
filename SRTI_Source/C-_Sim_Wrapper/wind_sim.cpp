#include "wind_sim.hpp"


WindSim::WindSim() {
    input.insert(pair <string, rapidjson::Value &> ("Scenario", rapidjson::Value().Move()));
    input.insert(pair <string, rapidjson::Value &> ("WindSpeedGen", rapidjson::Value().Move()));
    input.insert(pair <string, rapidjson::Value &> ("Damage", rapidjson::Value().Move()));

    output.insert(pair <string, rapidjson::Value &> ("Pressure", rapidjson::Value().Move()));
    history_size.insert(pair <string, int> ("Pressure", 0));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("Pressure", vector<rapidjson::Value>(0))
    );

}
WindSim::~WindSim() {

}

rapidjson::Value & WindSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void WindSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void WindSim::updateHistory() {
    rapidjson::Document d;
    rapidjson::Document::AllocatorType &a = d.GetAllocator();
    for (auto &value: history) {
        auto &messages = value.second;
        if (messages.size() > 0) {
            for (int i = messages.size() - 1; i >= 1; --i) {
                messages[i] = messages[i - 1];
            }

            // Deep Copy
            messages[0].CopyFrom(output.at(value.first), a);
        }
    }
}

void WindSim::simulate() {
    updateHistory();
}

void WindSim::generateInitialMessage() {
    updateHistory();
}
