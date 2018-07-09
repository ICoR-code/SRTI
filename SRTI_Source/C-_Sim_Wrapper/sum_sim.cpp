#include "sum_sim.hpp"


SumSim::SumSim() {
    input.insert(pair <string, rapidjson::Value &> ("Difference", rapidjson::Value().Move()));

    output.insert(pair <string, rapidjson::Value &> ("Sum", rapidjson::Value().Move()));
    history_size.insert(pair <string, int> ("Sum", 0));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("Sum", vector<rapidjson::Value>(0))
    );

}
SumSim::~SumSim() {

}

rapidjson::Value & SumSim::getMessage(string message_name) {
    assert(!output.at("Sum").IsNull());
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void SumSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void SumSim::updateHistory() {
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

void SumSim::simulate() {
    rapidjson::Value &d_value = input.at("Difference");
    int difference = d_value["value"].GetInt();

    int sum = difference + 1;

    rapidjson::Document doc;
    rapidjson::Value s_value(rapidjson::kObjectType);

    s_value.AddMember("value", sum, doc.GetAllocator());
    output.at("Sum") = s_value;

    updateHistory();
}

void SumSim::generateInitialMessage() {
    int sum = 0;

    rapidjson::Document doc;
    rapidjson::Value s_value(rapidjson::kObjectType);

    s_value.AddMember("value", sum, doc.GetAllocator());
    output.at("Sum") = s_value;
    assert(!output.at("Sum").IsNull());

    updateHistory();
}
