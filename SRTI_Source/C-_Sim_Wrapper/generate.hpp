#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <cctype>

using namespace std;

class CodeGenerator {
public:
    CodeGenerator(string name, string suffix):
        indent_num(0), file_name(name), file(name + suffix)
    {
        assert(file);
    }

    ~CodeGenerator()
    {
        file.close();
    }

    void indent()
    {
        ++indent_num;
    }

    void deindent()
    {
        --indent_num;
    }

    void setIndent(int n)
    {
        indent_num = n;
    }

    void printLine(string content)
    {
        printIndent();
        file << content << endl;
    }

    void printLine()
    {
        file << endl;
    }

    void printRawLine(string content)
    {
        file << content << endl;
    }

    void printRaw(string content)
    {
        file << content;
    }

    void printIndent()
    {
        for (int i = 0; i < indent_num; ++i) {
            file << "    ";
        }
    }

private:
    int indent_num;
    string file_name;
    ofstream file;
};
