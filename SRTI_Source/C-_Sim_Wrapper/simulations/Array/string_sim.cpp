#include <vector>
#include <iostream>
#include <type_traits>
#include "string_sim.hpp"

using namespace std;
namespace rj = rapidjson;

StringSim::StringSim() {
    input.insert(pair <string, rj::Value> ("Double", rj::Value()));

    output.insert(pair <string, rj::Value> ("String", rj::Value(rj::kObjectType)));
    output.at("String").AddMember("array", rj::Value(rj::kArrayType), doc.GetAllocator());
    history_size.insert(pair <string, int> ("String", 1));
    history.insert(pair <string, vector<rj::Value> >
        ("String", vector<rj::Value>(1))
    );

}
StringSim::~StringSim() {

}

rj::Value & StringSim::getMessage(string message_name) {
    assert(!output.at(message_name).IsNull());
    return output.at(message_name);
}

void StringSim::setMessage(string message_name, rj::Value &value) {
    input.at(message_name) = value;
}

void StringSim::setMessage(string message_name, string &message) {
    doc.Parse(message.c_str());
    input.at(message_name) = doc.GetObject();
}

void StringSim::updateHistory() {
    rj::Document::AllocatorType &a = doc.GetAllocator();
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

void StringSim::simulate() {
    // Using []
    // string ***alphabet;
    // size_t *size = new size_t[3]();
    //
    // getArray(history.at("String")[0]["array"], alphabet, size);
    //
    // double ***value;
    // getArray(input.at("Double")["array"], value, size);
    //
    // for (size_t i = 0; i < size[0]; ++i) {
    //     for (size_t j = 0; j < size[1]; ++j) {
    //         for (size_t k = 0; k < size[2]; ++k) {
    //             char ch = value[i][j][k];
    //             assert(ch == alphabet[i][j][k][0] + 1);
    //             ++alphabet[i][j][k][0];
    //         }
    //     }
    // }
    //
    // setArray(output.at("String")["array"], alphabet, size);
    //
    // for (size_t i = 0; i < size[0]; ++i) {
    //     for (size_t j = 0; j < size[1]; ++j) {
    //         delete[] alphabet[i][j];
    //         delete[] value[i][j];
    //     }
    //     delete[] alphabet[i];
    //     delete[] value[i];
    // }
    //
    // delete[] size;
    // delete[] alphabet;
    // delete[] value;

    // Using vector
    vector<vector<vector<string> > > alphabet;
    getVector(history.at("String")[0]["array"], alphabet);

    vector<vector<vector<double> > > value;
    getVector(input.at("Double")["array"], value);

    for (size_t i = 0; i < value.size(); ++i) {
        for (size_t j = 0; j < value[0].size(); ++j) {
            for (size_t k = 0; k < value[0][0].size(); ++k) {
                char ch = value[i][j][k];
                assert(ch == alphabet[i][j][k][0] + 1);
                ++alphabet[i][j][k][0];
            }
        }
    }

    setVector(output.at("String")["array"], alphabet);

    updateHistory();
}

void StringSim::generateInitialMessage() {
    // Using []
    // string alphabet[2][1][1] = {{{"A"}}, {{"a"}}};
    // size_t size[] = {2, 1, 1};
    // setArray(output.at("String")["array"], alphabet, size);

    // Using vector
    vector<vector<vector<string> > > alphabet {{{"A"}}, {{"a"}}};
    setVector(output.at("String")["array"], alphabet);

    updateHistory();
}


int StringSim::get(const rj::Value &value, const int ref) {
    return value.GetInt();
}

unsigned StringSim::get(const rj::Value &value, const unsigned ref) {
    return value.GetUint();
}

int64_t StringSim::get(const rj::Value &value, const int64_t ref) {
    return value.GetInt64();
}

uint64_t StringSim::get(const rj::Value &value, const uint64_t ref) {
    return value.GetUint64();
}

double StringSim::get(const rj::Value &value, const double ref) {
    return value.GetDouble();
}

bool StringSim::get(const rj::Value &value, const bool ref) {
    return value.GetBool();
}

string StringSim::get(const rj::Value &value, const string ref) {
    return value.GetString();
}

const char *StringSim::get(const rj::Value &value, const char *ref) {
    return value.GetString();
}

void StringSim::pushBack(rj::Value &array, const int value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const unsigned value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const int64_t value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const uint64_t value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const double value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const bool value) {
    auto &a = doc.GetAllocator();
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const string &str) {
    rj::Value value;
    auto &a = doc.GetAllocator();
    value.SetString(str.c_str(), str.size(), a);
    array.PushBack(value, a);
}

void StringSim::pushBack(rj::Value &array, const char *str) {
    rj::Value value;
    auto &a = doc.GetAllocator();
    value.SetString(str, strlen(str), a);
    array.PushBack(value, a);
}

template <typename T>
size_t StringSim::get1DArray(const rj::Value &value, T* &array) {
    assert(value.IsArray());

    array = new T[value.Size()];
    T ref = T();
    for (size_t i = 0; i < value.Size(); ++i) {
        array[i] = get(value[i], ref);
    }

    return value.Size();
}

template <typename T>
void StringSim::getArray(const rj::Value &value, T* &array, size_t* const &size, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type*) {
    assert(value.IsArray());

    array = new T[value.Size()];
    T ref = T();
    for (size_t i = 0; i < value.Size(); ++i) {
        array[i] = get(value[i], ref);
    }

    *size = value.Size();
}

template <typename T,
    typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0>
void StringSim::getArray(const rj::Value &value, T* &array, size_t* const &size) {
    assert(value.IsArray());

    array = new T[value.Size()];
    for (size_t i = 0; i < value.Size(); ++i) {
        getArray(value[i], array[i], size + 1);
    }

    *size = value.Size();
}

template <typename T>
vector<T> StringSim::get1DVector(const rj::Value &value, const T ref) {
    assert(value.IsArray());

    vector<T> vec;
    for (auto &v: value.GetArray()) {
        vec.push_back(get(v, ref));
    }

    return vec;
}

template <typename T>
void StringSim::getVector(const rj::Value &value, vector<T> &vec) {
    assert(value.IsArray());

    T ref = T();
    for (auto &v: value.GetArray()) {
        vec.push_back(get(v, ref));
    }
}

template <typename T>
void StringSim::getVector(const rj::Value &value, vector<vector<T> > &vec) {
    assert(value.IsArray());

    for (auto &v: value.GetArray()) {
        vector<T> element;
        getVector(v, element);
        vec.push_back(element);
    }
}

template <typename T>
void StringSim::set1DArray(rj::Value &value, const T * const array, const size_t size) {
    auto &a = doc.GetAllocator();

    value.SetArray();

    for (size_t i = 0; i < size; ++i) {
        pushBack(value, array[i]);
    }
}

template <typename T>
void StringSim::setArray(rj::Value &value, const T * const array, const size_t * const size, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type*) {
    value.SetArray();

    for (size_t i = 0; i < *size; ++i) {
        pushBack(value, array[i]);
    }
}

template <typename T,
    typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0>
void StringSim::setArray(rj::Value &value, const T * const array, const size_t * const size) {
    auto &a = doc.GetAllocator();

    value.SetArray();

    for (size_t i = 0; i < *size; ++i) {
        rj::Value element(rj::kArrayType);
        setArray(element, array[i], size + 1);
        value.PushBack(element, a);
    }
}

template <typename T>
void StringSim::set1DVector(rj::Value &value, const vector<T> &vec) {
    auto &a = doc.GetAllocator();

    value.SetArray();

    for (size_t i = 0; i < vec.size(); ++i) {
        pushBack(value,vec[i]);
    }
}

template <typename T>
void StringSim::setVector(rj::Value &value, const vector<T> &vec) {
    auto &a = doc.GetAllocator();

    value.SetArray();

    for (size_t i = 0; i < vec.size(); ++i) {
        pushBack(value, vec[i]);
    }
}

template <typename T>
void StringSim::setVector(rj::Value &value, const vector<vector<T> > &vec) {
    auto &a = doc.GetAllocator();

    value.SetArray();

    for (size_t i = 0; i < vec.size(); ++i) {
        rj::Value element(rj::kArrayType);
        setVector(element, vec[i]);
        value.PushBack(element, a);
    }
}
