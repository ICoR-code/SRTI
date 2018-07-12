#include <iostream>
#include <fstream>
#include <string>
#include <ctime>

#include "rapidjson/filereadstream.h"
#include "rapidjson/document.h"

#include "../C++_Client_Source/RTILib_C++_20180313/RTILib.h"
<<<<<<< HEAD
#include "difference_sim.hpp"
=======
#include "sum_sim.hpp"
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3

using namespace std;

int main() {
    // Parse setting files
    ifstream ifs_global("Global.json");
    string content_global(
        (istreambuf_iterator<char> (ifs_global)),
        (istreambuf_iterator<char> ()) );

    rapidjson::Document global_settings;
    global_settings.Parse(content_global.c_str());
    ifs_global.close();

<<<<<<< HEAD
    ifstream ifs_simulation("Difference.json");
=======
    ifstream ifs_simulation("Sum.json");
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3
    string content_simulation(
        (istreambuf_iterator<char> (ifs_simulation)),
        (istreambuf_iterator<char> ()) );

    rapidjson::Document simulation_settings;
    simulation_settings.Parse(content_simulation.c_str());
    ifs_simulation.close();

    assert(simulation_settings.IsObject());
    assert(simulation_settings.HasMember("simulatorName"));
    assert(simulation_settings.HasMember("hostName"));
    assert(simulation_settings.HasMember("portNumber"));

    string simulation_name = simulation_settings["simulatorName"].GetString();
    string host_name = simulation_settings["hostName"].GetString();
    string port_number = simulation_settings["portNumber"].GetString();
    vector<string> subscribed_channels;
    vector<string> one_time_channels;
    vector<string> published_channels;

<<<<<<< HEAD
    DifferenceSim simulation;
=======
    SumSim simulation;
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3

    RTILib lib = RTILib();
    lib.setDebugOutput(true);
    lib.setSimName(simulation_name);
    lib.connect(host_name, port_number);

    if (simulation_settings.HasMember("subscribedChannels")) {
        for (auto &channel: simulation_settings["subscribedChannels"].GetObject()) {
            if (channel.value["oneTime"].GetBool()) {
                one_time_channels.push_back(channel.name.GetString());
            } else {
                subscribed_channels.push_back(channel.name.GetString());
            }
            lib.subscribeTo(channel.name.GetString());
        }
    }

    if (simulation_settings.HasMember("publishedChannels")) {
        for (auto &channel: simulation_settings["publishedChannels"].GetObject()) {
            published_channels.push_back(channel.name.GetString());
        }
    }

    int gstep = 0;
    const int kTimeToWait = 50;

    // Waiting for one time messages
    for (string channel: one_time_channels) {
        while (true) {
            string message = lib.getNextMessage(channel, kTimeToWait);
            if (!message.empty()) {
                rapidjson::Document document;
                document.Parse(message.c_str());
                string content = document["content"].GetString();
<<<<<<< HEAD
                simulation.setMessage(channel, content);
=======
                document.Parse(content.c_str());
                simulation.setMessage(channel, document);
>>>>>>> 1f10e294ebf165ee7b1fa777a93e84c04cd4eab3
                break;
            }
        }
    }

    // Generate initial messages
    simulation.generateInitialMessage();
    for (string channel: published_channels) {
        if (simulation_settings["publishedChannels"][channel.c_str()]["initial"].GetBool())
            lib.publish(channel, simulation.getMessage(channel));
    }

    while (true) {
        // Wait for every message to arrive
        for (string channel: subscribed_channels) {
            while (true) {
                string message = lib.getNextMessage(channel, kTimeToWait);
                if (!message.empty()) {
                    rapidjson::Document document;
                    document.Parse(message.c_str());
                    string content = document["content"].GetString();
                    document.Parse(content.c_str());
                    simulation.setMessage(channel, document);
                    break;
                }
            }
        }

        simulation.simulate();

        for (string channel: published_channels) {
            lib.publish(channel, simulation.getMessage(channel));
        }

        ++gstep;

    }

    return 0;
}
