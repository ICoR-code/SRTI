#include <iostream>
#include <fstream>
#include <string>
#include <ctime>

#include "rapidjson/filereadstream.h"
#include "rapidjson/document.h"

#include "../C++_Client_Source/RTILib_C++_20180313/RTILib.h"

using namespace std;

int main() {

    ifstream ifs_global("Global.json");
    string content_global(
        (istreambuf_iterator<char> (ifs_global)),
        (istreambuf_iterator<char> ()) );

    rapidjson::Document global_settings;
    global_settings.Parse(content_global.c_str());

    ifs_global.close();

    ifstream ifs_simulation("Pressure.json");
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

    RTILib lib = RTILib();

    lib.setDebugOutput(true);

    lib.setSimName(simulation_name);
    lib.connect(host_name, port_number);

    if (simulation_settings.HasMember("subscribedChannels")) {
        for (auto &channel: simulation_settings["subscribedChannels"].GetObject()) {
            lib.subscribeTo(channel.name.GetString());
        }
    }

    return 0;
}
