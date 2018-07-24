#include "a_sim.hpp"


ASim::ASim() {
    input.insert(pair <string, rapidjson::Value> ("C", rapidjson::Value()));

    output.insert(pair <string, rapidjson::Value> ("TimeStamp", rapidjson::Value(rapidjson::kObjectType)));
    output.at("TimeStamp").AddMember("ts", rapidjson::Value(0), doc.GetAllocator());
    history_size.insert(pair <string, int> ("TimeStamp", 1));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("TimeStamp", vector<rapidjson::Value>(1))
    );

}
ASim::~ASim() {

}

rapidjson::Value & ASim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void ASim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void ASim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void ASim::updateHistory() {
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

void ASim::simulate() {
    int previous_ts = history.at("TimeStamp")[0]["ts"].GetInt();
    int c_value = input.at("C")["value"].GetInt();
    assert(previous_ts == c_value);
    int ts = previous_ts + 1;
    output.at("TimeStamp")["ts"] = ts;

    updateHistory();
}

void ASim::generateInitialMessage() {
    output.at("TimeStamp")["ts"] = 0;
    updateHistory();
}
