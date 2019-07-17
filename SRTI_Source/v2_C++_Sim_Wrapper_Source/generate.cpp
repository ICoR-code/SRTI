#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <cctype>
#include <assert.h>

#include "rapidjson/filereadstream.h"
#include "rapidjson/document.h"

#include "generate.hpp"

using namespace std;
namespace rj = rapidjson;

void generateSimHeader(string name)
{
    CodeGenerator code(name, "_sim.hpp");

    stringstream class_name;
    class_name << char(toupper(name[0])) << name.substr(1) << "Sim";

    code.printLine("#pragma once");
    code.printLine();
    code.printLine("#include <string>");
    code.printLine("#include <vector>");
    code.printLine("#include <map>");
    code.printLine("#include <iterator>");
    code.printLine("#include <type_traits>");
    code.printLine("#include \"rapidjson/document.h\"");
    code.printLine();
    code.printLine("using namespace std;");
    code.printLine("namespace rj = rapidjson;");
    code.printLine();

    code.printLine("class " + class_name.str() + " {");
    code.indent();
    code.printRawLine("public:");
    code.printLine(class_name.str() + "();");
    code.printLine("~" + class_name.str() + "();");
    code.printLine();

    code.printLine("void simulate();");
    code.printLine();

    code.printLine("rj::Value & getMessage(string);");
    code.printLine("void setMessage(string, rj::Value &);");
    code.printLine("void setMessage(string, string &);");
    code.printLine();

    code.printLine("void generateInitialMessage();");
    code.printLine();

    code.printLine("static int get(const rj::Value &, const int);");
    code.printLine("static unsigned get(const rj::Value &, const unsigned);");
    code.printLine("static int64_t get(const rj::Value &, const int64_t);");
    code.printLine("static uint64_t get(const rj::Value &, const uint64_t);");
    code.printLine("static double get(const rj::Value &, const double);");
    code.printLine("static bool get(const rj::Value &, const bool);");
    code.printLine("static string get(const rj::Value &, const string);");
    code.printLine("static const char *get(const rj::Value &, const char *);");
    code.printLine();

    code.printLine("void pushBack(rj::Value &, const int);");
    code.printLine("void pushBack(rj::Value &, const unsigned);");
    code.printLine("void pushBack(rj::Value &, const int64_t);");
    code.printLine("void pushBack(rj::Value &, const uint64_t);");
    code.printLine("void pushBack(rj::Value &, const double);");
    code.printLine("void pushBack(rj::Value &, const bool);");
    code.printLine("void pushBack(rj::Value &, const string &);");
    code.printLine("void pushBack(rj::Value &, const char *);");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("static size_t get1DArray(const rj::Value &, T* &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("static void getArray(const rj::Value &, T* &, size_t* const &, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type* = 0);");
    code.printLine();
    code.printLine("template <typename T,");
    code.indent();
    code.printLine("typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0 >");
    code.deindent();
    code.printLine("static void getArray(const rj::Value &, T* &, size_t* const &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("static vector<T> get1DVector(const rj::Value &, const T);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("static void getVector(const rj::Value &, vector<T> &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("static void getVector(const rj::Value &, vector<vector<T> > &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("void set1DArray(rj::Value &, const T * const, const size_t);");
    code.printLine();
    code.printLine("template <typename T,");
    code.indent();
    code.printLine("typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0 >");
    code.deindent();
    code.printLine("void setArray(rj::Value &, const T * const, const size_t * const);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("void setArray(rj::Value &, const T * const, const size_t * const, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type* = 0);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("void set1DVector(rj::Value &, const vector<T> &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("void setVector(rj::Value &, const vector<T> &);");
    code.printLine();
    code.printLine("template <typename T>");
    code.printLine("void setVector(rj::Value &, const vector<vector<T> > &);");
    code.printLine();

    code.printRawLine("private:");
    code.printLine("rj::Document doc;");
    code.printLine("map<string, rj::Value> input;");
    code.printLine("map<string, rj::Value> output;");
    code.printLine();
    code.printLine("map<string, int> history_size;");
    code.printLine();
    code.printLine("map<string, vector<rj::Value> > history;");
    code.printLine();
    code.printLine("void updateHistory();");
    code.printLine();
    code.printRawLine("};");
}

string getDefaultValueByType(string type)
{
    if (type == "int") {
        return "0";
    }
    if (type == "unsigned") {
        return "0u";
    }
    if (type == "int64_t") {
        return "(int64_t) 0";
    }
    if (type == "uint64_t") {
        return "(uint64_t) 0";
    }
    if (type == "double") {
        return "0.0";
    }
    if (type == "bool") {
        return "false";
    }
    if (type[0] == '[') {
        return "rj::kArrayType";
    }

    return "";
}

void generateSimFile(string name)
{
    CodeGenerator code(name, "_sim.cpp");

    stringstream class_name;
    class_name << char(toupper(name[0])) << name.substr(1) << "Sim";

    ifstream ifs_global("Global.json");
    string content_global(
        (istreambuf_iterator<char> (ifs_global)),
        (istreambuf_iterator<char> ()) );

    rj::Document global_settings;
    global_settings.Parse(content_global.c_str());

    ifs_global.close();

    ifstream ifs_simulation(class_name.str().substr(0, name.size()) + ".json");
    string content_simulation(
        (istreambuf_iterator<char> (ifs_simulation)),
        (istreambuf_iterator<char> ()) );

    rj::Document simulation_settings;
    simulation_settings.Parse(content_simulation.c_str());

    ifs_simulation.close();

    code.printLine("#include <vector>");
    code.printLine("#include <iostream>");
    code.printLine("#include <type_traits>");

    code.printLine("#include \"" + name + "_sim.hpp\"");
    code.printLine();
    code.printLine("using namespace std;");
    code.printLine("namespace rj = rapidjson;");
    code.printLine();
    code.printLine(class_name.str() + "::" + class_name.str() + "() {");
    code.indent();

    if (simulation_settings.HasMember("subscribedChannels")) {
        for (auto &channel: simulation_settings["subscribedChannels"].GetObject()) {
            // code.printLine("input.insert(pair <string, rj::Value &> (\"" +
            //     channel.name.GetString() + "\", rj::Value().Move()));");

            code.printIndent();
            code.printRaw("input.insert(pair <string, rj::Value> (\"");
            code.printRaw(channel.name.GetString());
            code.printRaw("\", rj::Value()));\n");
        }
    }
    code.printLine();

    if (simulation_settings.HasMember("publishedChannels")) {
        for (auto &channel: simulation_settings["publishedChannels"].GetObject()) {
            // code.printLine("output.insert(pair <string, rj::Value &> (\"" +
            //     channel.name.GetString() + "\", rj::Value().Move()));");
            // code.printLine("history_size.insert(pair <string, int> (\"" +
            //     channel.name.GetString() + "\", ));");

            code.printIndent();
            code.printRaw("output.insert(pair <string, rj::Value> (\"");
            code.printRaw(channel.name.GetString());
            code.printRaw("\", rj::Value(rj::kObjectType)));\n");

            for (auto &member: global_settings[channel.name.GetString()].GetObject()) {
                code.printIndent();
                code.printRaw("output.at(\"");
                code.printRaw(channel.name.GetString());
                code.printRaw("\").AddMember(\"");
                code.printRaw(member.name.GetString());
                code.printRaw("\", rj::Value(");
                code.printRaw(getDefaultValueByType(member.value.GetString()));
                code.printRaw("), doc.GetAllocator());\n");
            }

            code.printIndent();
            code.printRaw("history_size.insert(pair <string, int> (\"");
            code.printRaw(channel.name.GetString());
            code.printRaw("\", ");
            code.printRaw(to_string(channel.value["historyDependent"].GetInt()));
            code.printRaw("));\n");

            code.printLine("history.insert(pair <string, vector<rj::Value> >");
            code.indent();
            code.printIndent();
            code.printRaw("(\"");
            code.printRaw(channel.name.GetString());
            code.printRaw("\", vector<rj::Value>(");
            code.printRaw(to_string(channel.value["historyDependent"].GetInt()));
            code.printRaw("))\n");
            code.deindent();
            code.printLine(");");
            code.printLine();
        }
    }

    code.deindent();
    code.printLine("}");

    code.printLine(class_name.str() + "::~" + class_name.str() + "() {");
    code.printLine();
    code.printLine("}");
    code.printLine();

    code.printLine("rj::Value & " + class_name.str() + "::" +
        "getMessage(string message_name) {"
    );
    code.indent();
    code.printLine("assert(!output.at(message_name).IsNull());");
    code.printLine("return output.at(message_name);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "setMessage(string message_name, rj::Value &value) {"
    );
    code.indent();
    code.printLine("input.at(message_name) = value;");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "setMessage(string message_name, string &message) {"
    );
    code.indent();
    code.printLine("doc.Parse(message.c_str());");
    code.printLine("input.at(message_name) = doc.GetObject();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "updateHistory() {"
    );
    code.indent();
    code.printLine("rj::Document::AllocatorType &a = doc.GetAllocator();");

    code.printLine("for (auto &value: history) {");
    code.indent();
    code.printLine("auto &messages = value.second;");
    code.printLine("if (messages.size() > 0) {");
    code.indent();
    code.printLine("for (int i = messages.size() - 1; i >= 1; --i) {");
    code.indent();
    code.printLine("messages[i] = messages[i - 1];");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine("// Deep Copy");
    code.printLine("messages[0].CopyFrom(output.at(value.first), a);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "simulate() {"
    );
    code.indent();
    code.printLine("updateHistory();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "generateInitialMessage() {"
    );
    code.indent();
    code.printLine("updateHistory();");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine();

    code.printLine("int " + class_name.str() + "::" +
        "get(const rj::Value &value, const int ref) {"
    );
    code.indent();
    code.printLine("return value.GetInt();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("unsigned " + class_name.str() + "::" +
        "get(const rj::Value &value, const unsigned ref) {"
    );
    code.indent();
    code.printLine("return value.GetUint();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("int64_t " + class_name.str() + "::" +
        "get(const rj::Value &value, const int64_t ref) {"
    );
    code.indent();
    code.printLine("return value.GetInt64();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("uint64_t " + class_name.str() + "::" +
        "get(const rj::Value &value, const uint64_t ref) {"
    );
    code.indent();
    code.printLine("return value.GetUint64();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("double " + class_name.str() + "::" +
        "get(const rj::Value &value, const double ref) {"
    );
    code.indent();
    code.printLine("return value.GetDouble();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("bool " + class_name.str() + "::" +
        "get(const rj::Value &value, const bool ref) {"
    );
    code.indent();
    code.printLine("return value.GetBool();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("string " + class_name.str() + "::" +
        "get(const rj::Value &value, const string ref) {"
    );
    code.indent();
    code.printLine("return value.GetString();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("const char *" + class_name.str() + "::" +
        "get(const rj::Value &value, const char *ref) {"
    );
    code.indent();
    code.printLine("return value.GetString();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const int value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const unsigned value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const int64_t value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const uint64_t value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const double value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const bool value) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const string &str) {"
    );
    code.indent();
    code.printLine("rj::Value value;");
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("value.SetString(str.c_str(), str.size(), a);");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("void " + class_name.str() + "::" +
        "pushBack(rj::Value &array, const char *str) {"
    );
    code.indent();
    code.printLine("rj::Value value;");
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine("value.SetString(str, strlen(str), a);");
    code.printLine("array.PushBack(value, a);");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("size_t " + class_name.str() + "::" +
        "get1DArray(const rj::Value &value, T* &array) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("array = new T[value.Size()];");
    code.printLine("T ref = T();");
    code.printLine("for (size_t i = 0; i < value.Size(); ++i) {");
    code.indent();
    code.printLine("array[i] = get(value[i], ref);");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine("return value.Size();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "getArray(const rj::Value &value, T* &array, size_t* const &size, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type*) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("array = new T[value.Size()];");
    code.printLine("T ref = T();");
    code.printLine("for (size_t i = 0; i < value.Size(); ++i) {");
    code.indent();
    code.printLine("array[i] = get(value[i], ref);");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine("*size = value.Size();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T,");
    code.indent();
    code.printLine("typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0>");
    code.deindent();
    code.printLine("void " + class_name.str() + "::" +
        "getArray(const rj::Value &value, T* &array, size_t* const &size) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("array = new T[value.Size()];");
    code.printLine("for (size_t i = 0; i < value.Size(); ++i) {");
    code.indent();
    code.printLine("getArray(value[i], array[i], size + 1);");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine("*size = value.Size();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("vector<T> " + class_name.str() + "::" +
        "get1DVector(const rj::Value &value, const T ref) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("vector<T> vec;");
    code.printLine("for (auto &v: value.GetArray()) {");
    code.indent();
    code.printLine("vec.push_back(get(v, ref));");
    code.deindent();
    code.printLine("}");
    code.printLine();
    code.printLine("return vec;");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "getVector(const rj::Value &value, vector<T> &vec) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("T ref = T();");
    code.printLine("for (auto &v: value.GetArray()) {");
    code.indent();
    code.printLine("vec.push_back(get(v, ref));");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "getVector(const rj::Value &value, vector<vector<T> > &vec) {"
    );
    code.indent();
    code.printLine("assert(value.IsArray());");
    code.printLine();
    code.printLine("for (auto &v: value.GetArray()) {");
    code.indent();
    code.printLine("vector<T> element;");
    code.printLine("getVector(v, element);");
    code.printLine("vec.push_back(element);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "set1DArray(rj::Value &value, const T * const array, const size_t size) {"
    );
    code.indent();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < size; ++i) {");
    code.indent();
    code.printLine("pushBack(value, array[i]);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "setArray(rj::Value &value, const T * const array, const size_t * const size, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type*) {"
    );
    code.indent();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < *size; ++i) {");
    code.indent();
    code.printLine("pushBack(value, array[i]);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T,");
    code.indent();
    code.printLine("typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0>");
    code.deindent();
    code.printLine("void " + class_name.str() + "::" +
        "setArray(rj::Value &value, const T * const array, const size_t * const size) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < *size; ++i) {");
    code.indent();
    code.printLine("rj::Value element(rj::kArrayType);");
    code.printLine("setArray(element, array[i], size + 1);");
    code.printLine("value.PushBack(element, a);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "set1DVector(rj::Value &value, const vector<T> &vec) {"
    );
    code.indent();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < vec.size(); ++i) {");
    code.indent();
    code.printLine("pushBack(value,vec[i]);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "setVector(rj::Value &value, const vector<T> &vec) {"
    );
    code.indent();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < vec.size(); ++i) {");
    code.indent();
    code.printLine("pushBack(value, vec[i]);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("template <typename T>");
    code.printLine("void " + class_name.str() + "::" +
        "setVector(rj::Value &value, const vector<vector<T> > &vec) {"
    );
    code.indent();
    code.printLine("auto &a = doc.GetAllocator();");
    code.printLine();
    code.printLine("value.SetArray();");
    code.printLine();
    code.printLine("for (size_t i = 0; i < vec.size(); ++i) {");
    code.indent();
    code.printLine("rj::Value element(rj::kArrayType);");
    code.printLine("setVector(element, vec[i]);");
    code.printLine("value.PushBack(element, a);");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();
}

void generateWrapper(string sim_name)
{
    CodeGenerator code("wrapper", ".cpp");

    stringstream class_name;
    class_name << char(toupper(sim_name[0])) << sim_name.substr(1) << "Sim";

    code.printLine("#include <iostream>");
    code.printLine("#include <fstream>");
    code.printLine("#include <string>");
    code.printLine("#include <ctime>");
    code.printLine();

    code.printLine("#include \"rapidjson/filereadstream.h\"");
    code.printLine("#include \"rapidjson/document.h\"");
    code.printLine();
    code.printLine("#include \"../C++_Client_Source/RTILib_C++_20180313/RTILib.h\"");
    code.printLine("#include \"" + sim_name + "_sim.hpp\"");
    code.printLine();
    code.printLine("using namespace std;");
    code.printLine("namespace rj = rapidjson;");
    code.printLine();

    code.printLine("int main() {");
    code.indent();
    code.printLine("// Parse setting files");
    code.printLine("ifstream ifs_global(\"Global.json\");");
    code.printLine("string content_global(");
    code.indent();
    code.printLine("(istreambuf_iterator<char> (ifs_global)),");
    code.printLine("(istreambuf_iterator<char> ()) );");
    code.deindent();
    code.printLine();
    code.printLine("rj::Document global_settings;");
    code.printLine("global_settings.Parse(content_global.c_str());");
    code.printLine("ifs_global.close();");
    code.printLine();

    code.printLine("ifstream ifs_simulation(\"" + class_name.str().substr(0, sim_name.size()) + ".json\");");
    code.printLine("string content_simulation(");
    code.indent();
    code.printLine("(istreambuf_iterator<char> (ifs_simulation)),");
    code.printLine("(istreambuf_iterator<char> ()) );");
    code.deindent();
    code.printLine();
    code.printLine("rj::Document simulation_settings;");
    code.printLine("simulation_settings.Parse(content_simulation.c_str());");
    code.printLine("ifs_simulation.close();");
    code.printLine();

    code.printLine("assert(simulation_settings.IsObject());");
    code.printLine("assert(simulation_settings.HasMember(\"simulatorName\"));");
    code.printLine("assert(simulation_settings.HasMember(\"hostName\"));");
    code.printLine("assert(simulation_settings.HasMember(\"portNumber\"));");
    code.printLine();

    code.printLine("string simulation_name = simulation_settings[\"simulatorName\"].GetString();");
    code.printLine("string host_name = simulation_settings[\"hostName\"].GetString();");
    code.printLine("string port_number = simulation_settings[\"portNumber\"].GetString();");
    code.printLine("vector<string> subscribed_channels;");
    code.printLine("vector<string> one_time_channels;");
    code.printLine("vector<string> published_channels;");
    code.printLine();

    code.printLine(class_name.str() + " simulation;");
    code.printLine();
    code.printLine("RTILib lib = RTILib();");
    code.printLine("lib.setDebugOutput(false);");
    code.printLine("lib.setSimName(simulation_name);");
    code.printLine("lib.connect(host_name, port_number);");
    code.printLine();

    code.printLine("if (simulation_settings.HasMember(\"subscribedChannels\")) {");
    code.indent();
    code.printLine("for (auto &channel: simulation_settings[\"subscribedChannels\"].GetObject()) {");
    code.indent();
    code.printLine("if (channel.value[\"oneTime\"].GetBool()) {");
    code.indent();
    code.printLine("one_time_channels.push_back(channel.name.GetString());");
    code.deindent();
    code.printLine("} else {");
    code.indent();
    code.printLine("subscribed_channels.push_back(channel.name.GetString());");
    code.deindent();
    code.printLine("}");
    code.printLine("lib.subscribeTo(channel.name.GetString());");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("if (simulation_settings.HasMember(\"publishedChannels\")) {");
    code.indent();
    code.printLine("for (auto &channel: simulation_settings[\"publishedChannels\"].GetObject()) {");
    code.indent();
    code.printLine("published_channels.push_back(channel.name.GetString());");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("int max_iteration = -1;");
    code.printLine("if (simulation_settings.HasMember(\"maxIteration\")) {");
    code.indent();
    code.printLine("assert(simulation_settings[\"maxIteration\"].IsUint());");
    code.printLine("max_iteration = simulation_settings[\"maxIteration\"].GetInt();");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("int gstep = 0;");
    code.printLine("const int kTimeToWait = 50;");
    code.printLine();

    code.printLine("// Waiting for one time messages");
    code.printLine("for (string channel: one_time_channels) {");
    code.indent();
    code.printLine("while (true) {");
    code.indent();
    code.printLine("string message = lib.getNextMessage(channel, kTimeToWait);");
    code.printLine("if (!message.empty()) {");
    code.indent();
    code.printLine("rj::Document document;");
    code.printLine("document.Parse(message.c_str());");
    code.printLine("string content = document[\"content\"].GetString();");
    code.printLine("simulation.setMessage(channel, content);");
    code.printLine("break;");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("// Generate initial messages");
    code.printLine("simulation.generateInitialMessage();");
    code.printLine("for (string channel: published_channels) {");
    code.indent();
    code.printLine("if (simulation_settings[\"publishedChannels\"][channel.c_str()][\"initial\"].GetBool())");
    code.indent();
    code.printLine("lib.publish(channel, simulation.getMessage(channel));");
    code.deindent();
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("while (true) {");
    code.indent();
    code.printLine("if (max_iteration >= 0 && max_iteration <= gstep) {");
    code.indent();
    code.printLine("break;");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("// Wait for every message to arrive");
    code.printLine("for (string channel: subscribed_channels) {");
    code.indent();
    code.printLine("while (true) {");
    code.indent();
    code.printLine("string message = lib.getNextMessage(channel, kTimeToWait);");
    code.printLine("if (!message.empty()) {");
    code.indent();
    code.printLine("rj::Document document;");
    code.printLine("document.Parse(message.c_str());");
    code.printLine("string content = document[\"content\"].GetString();");
    code.printLine("simulation.setMessage(channel, content);");
    code.printLine("break;");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("simulation.simulate();");
    code.printLine();
    code.printLine("for (string channel: published_channels) {");
    code.indent();
    code.printLine("lib.publish(channel, simulation.getMessage(channel));");
    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("++gstep;");
    code.printLine();

    code.deindent();
    code.printLine("}");
    code.printLine();

    code.printLine("return 0;");

    code.deindent();
    code.printLine("}");
}

bool exists(string file_name)
{
    ifstream file(file_name);
    return file.good();
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        cout << "Not enough argument." << endl;
    }

    string name = argv[1];

    if (!exists(name + "_sim.hpp"))
        generateSimHeader(name);
    if (!exists(name + "_sim.cpp"))
        generateSimFile(name);
    generateWrapper(name);

    return 0;
}
