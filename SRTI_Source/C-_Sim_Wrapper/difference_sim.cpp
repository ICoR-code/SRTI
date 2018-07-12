#include "difference_sim.hpp"


DifferenceSim::DifferenceSim() {
    input.insert(pair <string, rapidjson::Value> ("Sum", rapidjson::Value()));

    output.insert(pair <string, rapidjson::Value> ("Difference", rapidjson::Value(rapidjson::kObjectType)));
    output.at("Difference").AddMember("value", rapidjson::Value(0), doc.GetAllocator());    history_size.insert(pair <string, int> ("Difference", 0));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("Difference", vector<rapidjson::Value>(0))
    );

}
DifferenceSim::~DifferenceSim() {

}

rapidjson::Value & DifferenceSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void DifferenceSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void DifferenceSim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void DifferenceSim::updateHistory() {
    rapidjson::Document::AllocatorType &a = doc.GetAllocator();
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

void DifferenceSim::simulate() {
    rapidjson::Value &s_value = input.at("Sum");
    int sum = s_value["value"].GetInt();

    output.at("Difference")["value"] = sum - 1;

    updateHistory();
}

void DifferenceSim::generateInitialMessage() {
    output.at("Difference")["value"] = 10;
    updateHistory();
}
