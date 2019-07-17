#include "b_sim.hpp"


BSim::BSim() {
    input.insert(pair <string, rapidjson::Value> ("TimeStamp", rapidjson::Value()));

    output.insert(pair <string, rapidjson::Value> ("B", rapidjson::Value(rapidjson::kObjectType)));
    output.at("B").AddMember("value", rapidjson::Value(0), doc.GetAllocator());
    history_size.insert(pair <string, int> ("B", 0));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("B", vector<rapidjson::Value>(0))
    );

}
BSim::~BSim() {

}

rapidjson::Value & BSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void BSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void BSim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void BSim::updateHistory() {
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

void BSim::simulate() {
    int ts = input.at("TimeStamp")["ts"].GetInt();
    int b_value = ts << 1;
    output.at("B")["value"] = b_value;
    updateHistory();
}

void BSim::generateInitialMessage() {
    updateHistory();
}
