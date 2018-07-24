#include "c_sim.hpp"


CSim::CSim() {
    input.insert(pair <string, rapidjson::Value> ("TimeStamp", rapidjson::Value()));
    input.insert(pair <string, rapidjson::Value> ("B", rapidjson::Value()));

    output.insert(pair <string, rapidjson::Value> ("C", rapidjson::Value(rapidjson::kObjectType)));
    output.at("C").AddMember("value", rapidjson::Value(0), doc.GetAllocator());
    history_size.insert(pair <string, int> ("C", 0));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("C", vector<rapidjson::Value>(0))
    );

}
CSim::~CSim() {

}

rapidjson::Value & CSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void CSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void CSim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void CSim::updateHistory() {
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

void CSim::simulate() {
    int ts = input.at("TimeStamp")["ts"].GetInt();
    int b_value = input.at("B")["value"].GetInt();
    assert(ts * 2 == b_value);
    output.at("C")["value"] = b_value >> 1;
    updateHistory();
}

void CSim::generateInitialMessage() {
    updateHistory();
}
