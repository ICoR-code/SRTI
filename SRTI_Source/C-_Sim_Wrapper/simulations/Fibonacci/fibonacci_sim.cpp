#include "fibonacci_sim.hpp"


FibonacciSim::FibonacciSim() {

    output.insert(pair <string, rapidjson::Value> ("Fibonacci", rapidjson::Value(rapidjson::kObjectType)));
    output.at("Fibonacci").AddMember("value", rapidjson::Value(0), doc.GetAllocator());
    history_size.insert(pair <string, int> ("Fibonacci", 2));
    history.insert(pair <string, vector<rapidjson::Value> >
        ("Fibonacci", vector<rapidjson::Value>(2))
    );

}
FibonacciSim::~FibonacciSim() {

}

rapidjson::Value & FibonacciSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void FibonacciSim::setMessage(string message_name, rapidjson::Value& value) {
    input.at(message_name) = value;
}

void FibonacciSim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void FibonacciSim::updateHistory() {
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

void FibonacciSim::simulate() {
    int f0 = history.at("Fibonacci")[0]["value"].GetInt();
    if (!f0) {
        output.at("Fibonacci")["value"] = 1;
    } else {
        int f1 = history.at("Fibonacci")[1]["value"].GetInt();
        output.at("Fibonacci")["value"] = f0 + f1;
    }
    updateHistory();
}

void FibonacciSim::generateInitialMessage() {
    output.at("Fibonacci")["value"] = 0;
    updateHistory();
}
