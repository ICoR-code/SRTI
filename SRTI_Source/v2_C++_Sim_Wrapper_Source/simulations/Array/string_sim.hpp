#pragma once

#include <string>
#include <vector>
#include <map>
#include <iterator>
#include <type_traits>
#include "rapidjson/document.h"

using namespace std;
namespace rj = rapidjson;

class StringSim {
public:
    StringSim();
    ~StringSim();

    void simulate();

    rj::Value & getMessage(string);
    void setMessage(string, rj::Value &);
    void setMessage(string, string &);

    void generateInitialMessage();

    static int get(const rj::Value &, const int);
    static unsigned get(const rj::Value &, const unsigned);
    static int64_t get(const rj::Value &, const int64_t);
    static uint64_t get(const rj::Value &, const uint64_t);
    static double get(const rj::Value &, const double);
    static bool get(const rj::Value &, const bool);
    static string get(const rj::Value &, const string);
    static const char *get(const rj::Value &, const char *);

    void pushBack(rj::Value &, const int);
    void pushBack(rj::Value &, const unsigned);
    void pushBack(rj::Value &, const int64_t);
    void pushBack(rj::Value &, const uint64_t);
    void pushBack(rj::Value &, const double);
    void pushBack(rj::Value &, const bool);
    void pushBack(rj::Value &, const string &);
    void pushBack(rj::Value &, const char *);

    template <typename T>
    static size_t get1DArray(const rj::Value &, T* &);

    template <typename T>
    static void getArray(const rj::Value &, T* &, size_t* const &, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type* = 0);

    template <typename T,
        typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0 >
    static void getArray(const rj::Value &, T* &, size_t* const &);

    template <typename T>
    static vector<T> get1DVector(const rj::Value &, const T);

    template <typename T>
    static void getVector(const rj::Value &, vector<T> &);

    template <typename T>
    static void getVector(const rj::Value &, vector<vector<T> > &);

    template <typename T>
    void set1DArray(rj::Value &, const T * const, const size_t);

    template <typename T,
        typename enable_if<(is_pointer<T>::value || is_array<T>::value), int>::type = 0 >
    void setArray(rj::Value &, const T * const, const size_t * const);

    template <typename T>
    void setArray(rj::Value &, const T * const, const size_t * const, typename enable_if<!is_pointer<T>::value && !is_array<T>::value>::type* = 0);

    template <typename T>
    void set1DVector(rj::Value &, const vector<T> &);

    template <typename T>
    void setVector(rj::Value &, const vector<T> &);

    template <typename T>
    void setVector(rj::Value &, const vector<vector<T> > &);

private:
    rj::Document doc;
    map<string, rj::Value> input;
    map<string, rj::Value> output;

    map<string, int> history_size;

    map<string, vector<rj::Value> > history;

    void updateHistory();

};
