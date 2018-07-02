# Instructions

1. Run `make generate sim=<sim_name>`. This will compile the files into a `generate.exe` executable, and use it to generate the template files `wrapper.cpp`, `<sim_name>_sim.hpp` and `<sim_name>_sim.cpp`.
2. Fill in `simulate` and `generateInitialMessage` in the template file `<sim_name>_sim.cpp`.
3. Run `make sim=<sim_name>` to generate the executable.
